import { useEffect, useRef, useState } from "react";
import TestPanel from "./TestPanel.jsx";
import Background3D from "./Background3D.jsx";
import Cube from "./Cube.jsx";
import Tilt from "./Tilt.jsx";
import { askBackend, getFaqs } from "./api.js";

const WELCOME = {
  role: "assistant",
  text: "Hi! I'm your Student Support Assistant. Ask me about scholarships, attendance, exams, or transcripts.",
  welcome: true,
};

export default function App() {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [faqs, setFaqs] = useState([]);
  const [showTests, setShowTests] = useState(false);
  const [online, setOnline] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    getFaqs()
      .then((d) => {
        setFaqs(d.faqs || []);
        setOnline(true);
      })
      .catch(() => setOnline(false));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text) {
    const question = (text ?? input).trim();
    if (!question || loading) return;

    const history = messages
      .filter((m) => !m.welcome && !m.error)
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const data = await askBackend(question, history);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: data.answer,
          fallback: data.fallback,
          source: data.source,
          note: data.note,
          sources: data.sources,
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "I couldn't reach the server. Please make sure the backend is running and try again.",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const suggestions = faqs.slice(0, 4).map((f) => f.question);

  return (
    <>
      <Background3D />

      <div className="app">
        <header className="header">
          <div className="brand">
            <Cube size={46} glyphs={["🎓", "?", "✦", "💬"]} className="logo-cube" />
            <div>
              <h1>Student Support Assistant</h1>
              <p className="status">
                <span className={`dot ${online === false ? "off" : "on"}`} />
                {online === false ? "Server offline" : "Answers based on the university FAQ"}
              </p>
            </div>
          </div>
          <div className="header-actions">
            <button className="ghost" onClick={() => setMessages([WELCOME])}>
              Clear chat
            </button>
            <button className="ghost" onClick={() => setShowTests((s) => !s)}>
              {showTests ? "Hide tests" : "Test panel"}
            </button>
          </div>
        </header>

        <main className={`layout ${showTests ? "with-panel" : ""}`}>
          <Tilt>
            <section className="chat">
              <div className="messages">
                {messages.map((m, i) => (
                  <div key={i} className={`row ${m.role}`}>
                    {m.role === "assistant" && <span className="avatar">🎓</span>}
                    <div
                      className={`bubble ${m.role} ${m.fallback ? "fallback" : ""} ${
                        m.error ? "error" : ""
                      }`}
                    >
                      <p>{m.text}</p>
                      {m.note && <small className="note">{m.note}</small>}
                      {m.sources?.length > 0 && (
                        <details className="sources">
                          <summary>Sources ({m.sources.length})</summary>
                          <ul>
                            {m.sources.map((s) => (
                              <li key={s.id}>
                                <span className="tag">{s.category}</span> {s.question}
                                <em> · {Math.round(s.relevance * 100)}% match</em>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="row assistant">
                    <span className="avatar">🎓</span>
                    <div className="bubble assistant typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {messages.length <= 1 && suggestions.length > 0 && (
                <div className="chips">
                  {suggestions.map((q, i) => (
                    <button key={q} className="chip" style={{ "--i": i }} onClick={() => send(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <div className="composer">
                <textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Type your question..."
                  maxLength={500}
                />
                <button onClick={() => send()} disabled={loading || !input.trim()}>
                  Send
                </button>
              </div>
            </section>
          </Tilt>

          {showTests && <TestPanel />}
        </main>
      </div>
    </>
  );
}
