import { db } from "./firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

// ── CONSTANTS ──────────────────────────────────────────────

export const EMPTY_FORM = {
  romanized: "",
  english: "",
  partOfSpeech: "",
  example: "",
  categories: [],
};

export const ALL_CATEGORIES = [
  "Greetings", "Emotions", "Relationships", "Family", "Food", "Daily Life",
  "Time", "Nature", "Travel", "Body", "Work", "School", "Objects", "Places",
  "Animals", "Weather", "Religion", "Money", "Health", "Clothing", "Colors",
  "Numbers", "Movement", "Speech", "Violence", "News & Media", "Government & Politics", "Insults",
];

export const CATEGORY_PALETTE = [
  "#b07d3a", "#4a9e5c", "#c4627a", "#4a7ab0", "#9e4a7a", "#7a9e4a",
  "#4a8a9e", "#9e7a4a", "#7a4a9e", "#9e4a4a", "#4a9e8a", "#b04a4a",
  "#4ab0a0", "#8a7ab0", "#b0934a", "#4a6ab0", "#9e6a4a", "#4ab06a",
  "#b04a8a", "#6ab04a", "#4a4ab0", "#b09e4a", "#4ab0b0", "#8a4ab0",
  "#b06a4a", "#4a9eb0", "#6a9e4a",
];

// ── CATEGORY COLOR ───────────────────────────────────────────

export function getCategoryColor(category) {
  const idx = ALL_CATEGORIES.indexOf(category);
  return CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length] || "#999";
}

// ── DERIVE USED CATEGORIES ────────────────────────────────────

export function deriveCategories(words) {
  const s = new Set();
  words.forEach((w) => (w.categories || []).forEach((c) => s.add(c)));
  return Array.from(s).sort();
}

// ── FILTER WORDS ─────────────────────────────────────────────

export function filterWords(words, search, filterCategory) {
  const q = search.toLowerCase();
  return words.filter((w) => {
    const matchSearch =
      !q ||
      w.romanized.toLowerCase().includes(q) ||
      w.english.toLowerCase().includes(q) ||
      (w.categories || []).some((c) => c.toLowerCase().includes(q));
    const matchCategory =
      filterCategory === "All" ||
      (w.categories || []).includes(filterCategory);
    return matchSearch && matchCategory;
  });
}

// ── GROUP BY CATEGORY ─────────────────────────────────────────

export function groupByCategory(words) {
  const g = {};
  words.forEach((w) => {
    const cats = w.categories && w.categories.length ? w.categories : ["Uncategorized"];
    cats.forEach((c) => {
      if (!g[c]) g[c] = [];
      g[c].push(w);
    });
  });
  return g;
}

// ── FIRESTORE FUNCTIONS ───────────────────────────────────────

export function subscribeToWords(callback) {
  return onSnapshot(collection(db, "words"), (snapshot) => {
    const words = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    callback(words);
  });
}

export async function addWord(form, user) {
  await addDoc(collection(db, "words"), {
    ...form,
    addedBy: user.uid,
    addedByName: user.displayName || "Anonymous",
    createdAt: serverTimestamp(),
  });
}

export async function deleteWord(id) {
  await deleteDoc(doc(db, "words", id));
}

export async function updateWord(id, form) {
  const { updateDoc } = await import("firebase/firestore");
  await updateDoc(doc(db, "words", id), { ...form });
}

// ── AI ENRICH ─────────────────────────────────────────────────

export async function aiEnrich(romanized, english) {
  const categoryList = ALL_CATEGORIES.join(", ");
  const prompt = [
    "You are a Bengali linguistics expert. Analyze this Bangla word written in Roman script.",
    "Word: \"" + romanized + "\"",
    "English meaning: \"" + english + "\"",
    "",
    "Determine the part of speech based on how the Bangla word itself functions, not the English translation.",
    "Rules:",
    "- Words describing a state, condition, or quality → adjective",
    "- Words that are root action words → verb",
    "- Words naming a person, place, thing, or idea → noun",
    "- Words modifying verbs or adjectives → adverb",
    "- Words replacing nouns → pronoun",
    "- Fixed social phrases → expression",
    "",
    "1. Detect its part of speech. Choose exactly one: noun, verb, adjective, adverb, pronoun, expression, phrase.",
    "2. Assign 1-3 categories. Only use from this list: " + categoryList,
    "",
    "Respond ONLY with valid JSON, no markdown:",
    "{\"partOfSpeech\": \"...\", \"categories\": [\"...\"]}"
  ].join("\n");

  const res = await fetch("/api/groq", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      max_tokens: 200,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err.error && err.error.message) || ("HTTP " + res.status));
  }

  const data = await res.json();
  const text = data.choices[0].message.content || "";
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);

  const validCategories = (Array.isArray(parsed.categories) ? parsed.categories : [])
    .filter((c) => ALL_CATEGORIES.includes(c));

  return {
    partOfSpeech: parsed.partOfSpeech || "",
    categories: validCategories,
  };
}