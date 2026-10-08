// Calls the backend directly (CORS is enabled on the server).
// Override with VITE_API_URL in frontend/.env if your backend runs elsewhere.
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function askBackend(question, history = []) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export async function getFaqs() {
  const res = await fetch(`${API_BASE}/api/faqs`);
  if (!res.ok) throw new Error("Could not load FAQs.");
  return res.json();
}