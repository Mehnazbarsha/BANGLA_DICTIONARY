# Bangla Dictionary 📖

A personal Bangla lexicon built with React + Vite. Add words in romanized Bangla, and AI automatically detects the part of speech and suggests categories.

---

## Features

- Add words with romanized Bangla + English meaning
- AI auto-detects part of speech and assigns categories
- Multi-category tagging per word
- Write your own example sentences
- Search and filter by category
- Grid, list, and category views
- All words saved locally in your browser

---

## Getting Started (Local)

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/BANGLA_DICT.git
cd BANGLA_DICT
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the dev server

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### 4. Get a free Groq API key

The AI features require a free Groq API key.

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up and go to **API Keys**
3. Click **Create API Key** and copy it
4. In the app, click **🔑 api key** in the top right and paste it in

Your key is stored only in your browser — it is never sent anywhere except directly to Groq.

---

## Tech Stack

- React + Vite
- Groq API (LLaMA 3.1) for AI
- localStorage for persistence
- No backend, no database

---

## Project Structure

```
src/
├── BanglaDictionary.jsx   # Main React component
├── dictionary.js          # Logic, helpers, AI call
└── dictionary.css         # All styles
```


