import { useState } from "react";
import { askBackend } from "./api.js";

// expectFallback: true  -> the dataset has no answer, the app should refuse politely
// expectFallback: false -> the dataset has the answer, the app should answer it
const TESTS = [
  { q: "How do I get my marksheet?", expectFallback: false },
  { q: "I want to see my attendance", expectFallback: false },
  { q: "When are exam registrations?", expectFallback: false },
  { q: "How to apply for financial aid?", expectFallback: false },
  { q: "Where is the hostel?", expectFallback: true },
  { q: "What is the weather today?", expectFallback: true },
  { q: "Who is the vice chancellor?", expectFallback: true },
];

export default function TestPanel() {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);
  const [custom, setCustom] = useState("");

  async function runOne(t) {
    setResults((r) => ({ ...r, [t.q]: { status: "running" } }));
    try {
      const data = await askBackend(t.q);
      const pass = data.fallback === t.expectFallback;
      setResults((r) => ({ ...r, [t.q]: { status: pass ? "pass" : "fail", data } }));
    } catch (err) {
      setResults((r) => ({ ...r, [t.q]: { status: "fail", data: { answer: err.message } } }));
    }
  }

  async function runAll() {
    setRunning(true);
    for (const t of TESTS) await runOne(t);
    setRunning(false);
  }

  async function runCustom() {
    const q = custom.trim();
    if (!q) return;
    await runOne({ q, expectFallback: null });
    setCustom("");
  }

  const customEntries = Object.keys(results).filter((q) => !TESTS.some((t) => t.q === q));
  const passed = TESTS.filter((t) => results[t.q]?.status === "pass").length;

  return (
    <aside className="panel">
      <div className="panel-head">
        <h2>Test panel</h2>
        <button onClick={runAll} disabled={running}>
          {running ? "Running..." : "Run all tests"}
        </button>
      </div>
      <p className="muted">
        Passed: {passed}/{TESTS.length}
      </p>

      <ul className="tests">
        {TESTS.map((t) => (
          <TestRow key={t.q} test={t} result={results[t.q]} onRun={() => runOne(t)} />
        ))}
        {customEntries.map((q) => (
          <TestRow
            key={q}
            test={{ q, expectFallback: null }}
            result={results[q]}
            onRun={() => runOne({ q, expectFallback: null })}
          />
        ))}
      </ul>

      <div className="custom">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runCustom()}
          placeholder="Try your own question..."
        />
        <button onClick={runCustom}>Test</button>
      </div>
    </aside>
  );
}

function TestRow({ test, result, onRun }) {
  const expected =
    test.expectFallback === null
      ? "custom"
      : test.expectFallback
      ? "expects fallback"
      : "expects answer";
  return (
    <li className={`test ${result?.status || ""}`}>
      <div className="test-top">
        <strong>{test.q}</strong>
        <button className="ghost small" onClick={onRun}>
          Run
        </button>
      </div>
      <small className="muted">{expected}</small>
      {result?.status === "running" && <p className="muted">Running...</p>}
      {result?.data && (
        <div className="test-result">
          <span className={`badge ${result.status}`}>
            {result.data.fallback ? "fallback" : result.data.source || "answer"}
            {result.status === "pass" ? " ✓" : result.status === "fail" ? " ✗" : ""}
          </span>
          <p>{result.data.answer}</p>
          {result.data.sources?.[0] && (
            <small className="muted">
              Top match: {result.data.sources[0].question} (
              {Math.round(result.data.sources[0].relevance * 100)}%)
            </small>
          )}
        </div>
      )}
    </li>
  );
}
