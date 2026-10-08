# 🎓 AI Student Support Assistant

An AI-powered web app that answers university student questions about **admissions, scholarships, attendance, examinations, and policies**, using only the information in a provided FAQ dataset.

Instead of letting an AI guess, the app **retrieves the most relevant FAQ entries first**, then asks **Google Gemini** to write a clear answer grounded in those entries. If the dataset doesn't contain the answer, the assistant says so clearly and points the student to the right office.

<!-- Add a screenshot: save it as docs/screenshot.png and uncomment the next line -->
<!-- ![App screenshot](docs/screenshot.png) -->

**Live demo:** `<add your deployed frontend URL here>`

---

## ✨ Features

| Requirement | How it's done |
|---|---|
| Chat interface in natural language | React chat UI with message history and follow-up context |
| Answers grounded in the dataset | Gemini receives **only** the retrieved FAQ entries and is told not to invent anything |
| Retrieval before generation | Custom BM25-style search over `student_faq.csv` with stemming and synonyms |
| Clear fallback | If relevance is too low, or the model finds no answer, the app shows a polite "not in the FAQ" message |
| Clean, simple UI | Animated 3D glass interface, responsive, respects reduced-motion settings |
| Testing with different questions | Built-in **Test panel** with preset pass/fail checks and a custom question box |

**Extra touches**
- Every answer shows its **sources** (matched FAQ entries and match percentage).
- **Automatic model fallback:** if one Gemini model is busy or slow, backup models are tried.
- If Gemini is unreachable, the app still returns the closest FAQ answer instead of failing.
- Reload the CSV without restarting the server (`POST /api/reload`).

---

## 🧠 How it works

```
Student question
      │
      ▼
┌──────────────────────┐
│ 1. Retrieval         │  Tokenize → stem → synonyms → BM25 score
│    (retrieval.js)    │  over student_faq.csv, top 3 matches
└──────────┬───────────┘
           │ relevance score
           ▼
     ┌─────────────┐   too low
     │ relevant?   │──────────────► Fallback message (Gemini is NOT called)
     └──────┬──────┘
            │ yes
            ▼
┌──────────────────────┐
│ 2. Generation        │  Gemini answers using ONLY the matched entries
│    (gemini.js)       │  Replies NOT_FOUND if they don't cover the topic
└──────────┬───────────┘
           ▼
  Answer + sources  ──►  React chat UI
```

**Relevance score:** the share of the question's informative words (weighted by rarity) that appear in a FAQ entry. Words not found anywhere in the dataset (like "hostel") lower the score, which is what triggers the fallback for out-of-scope questions.

---

## 🛠 Tech stack

- **Frontend:** React 18, Vite, CSS 3D transforms, Canvas
- **Backend:** Node.js (18+), Express, `csv-parse`, `dotenv`, `cors`
- **AI:** Google Gemini API (REST)
- **Data:** CSV file (`student_faq.csv`)

---

## 📁 Project structure

```
.
├── backend/
│   ├── server.js          # Express app and API routes
│   ├── retrieval.js       # CSV loading + BM25 retrieval
│   ├── gemini.js          # Gemini calls with model fallback
│   ├── student_faq.csv    # The FAQ dataset
│   ├── .env.example       # Environment variable template
│   └── package.json
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx            # Chat UI
│       ├── TestPanel.jsx      # Test runner
│       ├── Background3D.jsx   # Animated 3D background
│       ├── Cube.jsx           # CSS 3D cube
│       ├── Tilt.jsx           # Pointer-tilt effect
│       ├── api.js             # Backend calls
│       └── styles.css
├── .gitignore
└── README.md
```

---

## 🚀 Run locally

**Requirements:** Node.js 18 or newer and a free [Gemini API key](https://aistudio.google.com/apikey).

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env
```

Open `backend/.env` and set your key:

```env
GEMINI_API_KEY=your_key_here
```

Start it:

```bash
npm start
```

Check `http://localhost:5000/api/health`. You should see `"status": "ok"`.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env        # Windows: copy .env.example .env
npm run dev
```

Open **http://localhost:5173**.

---

## ⚙️ Environment variables (backend)

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | none (required) | Your Gemini API key |
| `GEMINI_MODEL` | `gemini-flash-lite-latest` | Main model |
| `GEMINI_FALLBACK_MODELS` | `gemini-3.5-flash-lite,gemini-3.1-flash-lite` | Comma-separated backups tried when the main model is busy or slow |
| `PORT` | `5000` | Server port |
| `CLIENT_ORIGIN` | `*` | Allowed frontend origin for CORS (set to your frontend URL in production) |
| `FAQ_CSV_PATH` | `./student_faq.csv` | Path to the dataset |
| `MIN_RELEVANCE` | `0.45` | Minimum relevance (0 to 1) before the AI may answer. Raise it for stricter fallbacks, lower it for more lenient matching |
| `TOP_K` | `3` | Number of FAQ entries sent to Gemini |

**Frontend:** `VITE_API_URL` is the backend URL (default `http://localhost:5000`).

---

## 🔌 API

### `POST /api/chat`
```json
// request
{ "question": "How do I get my marksheet?", "history": [] }

// response
{
  "answer": "You can request your transcript by submitting a request to the student office.",
  "fallback": false,
  "source": "gemini",
  "sources": [
    { "id": 4, "question": "How do I request a transcript?", "category": "Administration", "relevance": 1 }
  ]
}
```
`source` is `gemini` (AI answer), `dataset` (AI unavailable, closest FAQ answer shown) or `fallback` (not in the dataset).

### Other routes
| Route | Description |
|---|---|
| `GET /api/health` | Server status, FAQ count, and whether a key is configured |
| `GET /api/faqs` | All FAQ entries |
| `POST /api/reload` | Re-read the CSV without restarting |

---

## 🧪 Testing the app

Click **Test panel** in the app, then **Run all tests**. Each preset question checks that the app answers when the dataset covers the topic, and falls back when it doesn't.

| Question | Expected |
|---|---|
| How do I get my marksheet? | Answer (transcript) |
| I want to see my attendance | Answer (attendance) |
| When are exam registrations? | Answer (exams) |
| How to apply for financial aid? | Answer (scholarship) |
| Where is the hostel? | Fallback |
| What is the weather today? | Fallback |
| Who is the vice chancellor? | Fallback |

You can also type any question into the test box.

### Using a different dataset
Replace `backend/student_faq.csv` with a file that has the columns `Question,Answer,Category`, then restart the backend (or call `POST /api/reload`).

---

## ☁️ Deployment

The backend and frontend deploy separately.

### Backend on Render
1. New **Web Service** → connect this GitHub repo.
2. **Root Directory:** `backend`
3. **Build Command:** `npm install`  ·  **Start Command:** `npm start`
4. Add environment variables: `GEMINI_API_KEY`, `GEMINI_MODEL`, and `CLIENT_ORIGIN` (your frontend URL, added after step below).
5. Deploy, then check `https://<your-service>.onrender.com/api/health`.

> Free Render services sleep when idle, so the first request after a pause can take 30 to 60 seconds.

### Frontend on Vercel (or Netlify)
1. New project → import this repo.
2. **Root Directory:** `frontend`  ·  Framework: **Vite**
3. **Build Command:** `npm run build`  ·  **Output Directory:** `dist`
4. Add environment variable `VITE_API_URL` = your Render backend URL (no trailing slash).
5. Deploy, then copy the frontend URL back into the backend's `CLIENT_ORIGIN` on Render and redeploy it.

---

## 🔒 Security notes

- Never commit `.env`. It is listed in `.gitignore`; only `.env.example` files belong in the repo.
- The API key stays on the server and is never sent to the browser.
- The prompt tells the model to ignore instructions embedded in student messages, and input length is limited.

---

## 🩺 Troubleshooting

| Problem | Fix |
|---|---|
| Chat shows "Server offline" | Backend isn't running, or `VITE_API_URL` is wrong |
| "AI service is unavailable" note | Gemini was slow, busy, or the key or model is wrong. Check the backend terminal for the exact error |
| Gemini 404 error | The model name isn't available to your key. List models with the Gemini API and update `GEMINI_MODEL` |
| Gemini 503 error | Model is overloaded. The app retries backup models automatically |
| Too many fallbacks | Lower `MIN_RELEVANCE` (for example `0.35`) |
| CORS error in browser | Set `CLIENT_ORIGIN` to the exact frontend URL, including `https://` |

---

## 📄 License

MIT. Free to use for learning and demos.
