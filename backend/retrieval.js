const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const STOPWORDS = new Set([
  "a", "an", "the", "i", "me", "my", "mine", "we", "our", "you", "your",
  "is", "are", "was", "were", "be", "been", "am", "do", "does", "did",
  "can", "could", "should", "would", "will", "shall", "may", "might",
  "how", "what", "when", "where", "which", "who", "why", "whom",
  "to", "of", "in", "on", "at", "for", "from", "by", "with", "about",
  "and", "or", "but", "if", "so", "it", "its", "this", "that", "these", "those",
  "please", "tell", "know", "want", "need", "get", "let", "any", "some",
  "there", "have", "has", "had", "us", "am", "just", "also",
]);

// Small synonym map so students' wording still matches the dataset.
const SYNONYMS = {
  grant: "scholarship",
  bursary: "scholarship",
  stipend: "scholarship",
  "financial": "scholarship",
  aid: "scholarship",
  present: "attendance",
  absent: "attendance",
  absence: "attendance",
  attend: "attendance",
  exam: "exams",
  examination: "exams",
  examinations: "exams",
  test: "exams",
  paper: "exams",
  papers: "exams",
  enroll: "register",
  enrol: "register",
  enrollment: "register",
  registration: "register",
  transcripts: "transcript",
  marksheet: "transcript",
  admission: "admissions",
  admit: "admissions",
};

function stem(word) {
  if (word.length > 4 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.length > 3 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .map((w) => stem(SYNONYMS[w] || w))
    .map((w) => stem(SYNONYMS[w] || w));
}

class FaqRetriever {
  constructor(csvPath) {
    this.csvPath = path.resolve(csvPath);
    this.faqs = [];
    this.docs = [];
    this.idf = new Map();
    this.avgLen = 0;
    this.maxIdf = 1;
    this.load();
  }

  load() {
    const raw = fs.readFileSync(this.csvPath, "utf8");
    const rows = parse(raw, {
      columns: (header) => header.map((h) => h.trim().toLowerCase()),
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
    });

    this.faqs = rows
      .filter((r) => r.question && r.answer)
      .map((r, i) => ({
        id: i + 1,
        question: r.question,
        answer: r.answer,
        category: r.category || "General",
      }));

    // Question and category are weighted more than the answer text.
    this.docs = this.faqs.map((f) => {
      const tokens = [
        ...tokenize(f.question),
        ...tokenize(f.question),
        ...tokenize(f.category),
        ...tokenize(f.answer),
      ];
      const tf = new Map();
      tokens.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
      return { tf, len: tokens.length, terms: new Set(tokens) };
    });

    const N = this.docs.length || 1;
    const df = new Map();
    this.docs.forEach((d) => d.terms.forEach((t) => df.set(t, (df.get(t) || 0) + 1)));
    df.forEach((count, term) => {
      this.idf.set(term, Math.log(1 + (N - count + 0.5) / (count + 0.5)));
    });
    this.maxIdf = Math.log(1 + (N + 0.5) / 0.5);
    this.avgLen = this.docs.reduce((s, d) => s + d.len, 0) / N || 1;
  }

  idfOf(term) {
    // Unknown terms are treated as maximally informative so that
    // off-topic words (e.g. "hostel") lower the relevance score.
    return this.idf.has(term) ? this.idf.get(term) : this.maxIdf;
  }

  /**
   * Returns the top-k FAQs with:
   *  - score: BM25 score (for ranking)
   *  - relevance: 0..1 share of the question's informative words found in the FAQ
   */
  search(query, topK = 3) {
    const qTokens = [...new Set(tokenize(query))];
    if (qTokens.length === 0) return [];

    const k1 = 1.5;
    const b = 0.75;
    const totalIdf = qTokens.reduce((s, t) => s + this.idfOf(t), 0) || 1;

    const results = this.docs.map((doc, i) => {
      let score = 0;
      let matchedIdf = 0;
      for (const t of qTokens) {
        const f = doc.tf.get(t);
        if (!f) continue;
        const idf = this.idfOf(t);
        matchedIdf += idf;
        score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * doc.len) / this.avgLen)));
      }
      return { ...this.faqs[i], score, relevance: matchedIdf / totalIdf };
    });

    return results
      .filter((r) => r.score > 0)
      .sort((a, b) => b.relevance - a.relevance || b.score - a.score)
      .slice(0, topK)
      .map((r) => ({
        ...r,
        score: Number(r.score.toFixed(3)),
        relevance: Number(r.relevance.toFixed(3)),
      }));
  }
}

module.exports = { FaqRetriever, tokenize };
