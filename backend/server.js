require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { FaqRetriever } = require("./retrieval");
const { generateAnswer } = require("./gemini");

const PORT = process.env.PORT || 5000;
const CSV_PATH = process.env.FAQ_CSV_PATH || "./student_faq.csv";
const MIN_RELEVANCE = parseFloat(process.env.MIN_RELEVANCE || "0.45");
const TOP_K = parseInt(process.env.TOP_K || "3", 10);

const FALLBACK_MESSAGE =
  "Sorry, I couldn't find this information in the university FAQ. " +
  "Please contact the student office or the relevant department for help.";

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*" }));
app.use(express.json({ limit: "10kb" }));

let retriever;
try {
  retriever = new FaqRetriever(CSV_PATH);
  console.log(`Loaded ${retriever.faqs.length} FAQ entries from ${CSV_PATH}`);
} catch (err) {
  console.error(`Could not load FAQ CSV at ${CSV_PATH}: ${err.message}`);
  process.exit(1);
}

// ---------- Routes ----------

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    faqCount: retriever.faqs.length,
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  });
});

// All FAQ entries (useful for the frontend test panel / sample questions)
app.get("/api/faqs", (req, res) => {
  res.json({ faqs: retriever.faqs });
});

// Reload the CSV without restarting the server
app.post("/api/reload", (req, res) => {
  try {
    retriever.load();
    res.json({ status: "reloaded", faqCount: retriever.faqs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Main chat endpoint
app.post("/api/chat", async (req, res) => {
  const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
  const history = Array.isArray(req.body?.history) ? req.body.history : [];

  if (!question) {
    return res.status(400).json({ error: "Please provide a question." });
  }
  if (question.length > 500) {
    return res.status(400).json({ error: "Question is too long (max 500 characters)." });
  }

  // 1) Retrieve relevant FAQ entries first
  const matches = retriever.search(question, TOP_K);
  const best = matches[0];

  const sources = matches.map((m) => ({
    id: m.id,
    question: m.question,
    category: m.category,
    relevance: m.relevance,
  }));

  // 2) Fallback when nothing relevant exists in the dataset (LLM is not called)
  if (!best || best.relevance < MIN_RELEVANCE) {
    return res.json({
      answer: FALLBACK_MESSAGE,
      fallback: true,
      source: "fallback",
      sources,
    });
  }

  // 3) Generate a grounded answer with Gemini using only retrieved entries
  const usable = matches.filter((m) => m.relevance >= MIN_RELEVANCE * 0.6);

  try {
    const { answer, notFound } = await generateAnswer({
      question,
      faqs: usable,
      history,
    });

    if (notFound) {
      return res.json({
        answer: FALLBACK_MESSAGE,
        fallback: true,
        source: "fallback",
        sources,
      });
    }

    return res.json({ answer, fallback: false, source: "gemini", sources });
  } catch (err) {
    console.error("Gemini error:", err.message);
    // Graceful degradation: return the best matching FAQ answer directly
    return res.json({
      answer: best.answer,
      fallback: false,
      source: "dataset",
      note: "AI service is unavailable right now, showing the closest FAQ answer.",
      sources,
    });
  }
});

app.use((req, res) => res.status(404).json({ error: "Not found" }));

app.listen(PORT, () => {
  console.log(`Student Support API running on http://localhost:${PORT}`);
});
