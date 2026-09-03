import { db } from "./firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  setDoc,
} from "firebase/firestore";

// ============================================================
// CONSTANTS
// ============================================================

export const EMPTY_FORM = {
  romanized: "",
  english: "",
  partOfSpeech: "",
  example: "",
  categories: [],
};

export const ALL_CATEGORIES = [
  "Greetings",
  "Emotions",
  "Relationships",
  "Family",
  "Food",
  "Daily Life",
  "Time",
  "Nature",
  "Travel",
  "Body",
  "Work",
  "School",
  "Objects",
  "Places",
  "Animals",
  "Weather",
  "Religion",
  "Money",
  "Health",
  "Clothing",
  "Colors",
  "Numbers",
  "Movement",
  "Speech",
  "Violence",
  "News & Media",
  "Government & Politics",
  "Insults",
];

// ============================================================
// CATEGORY COLORS
// ============================================================

export const CATEGORY_COLORS = {
  "Greetings":             { bg: "#fbefd7", border: "#e8d4a0", text: "#3a2e10", tag: "#e8d4a0" },
  "Emotions":              { bg: "#f7dfbd", border: "#e0c090", text: "#3a2808", tag: "#e0c090" },
  "Relationships":         { bg: "#f7df99", border: "#d8c060", text: "#3a3008", tag: "#d8c060" },
  "Family":                { bg: "#f0b2a3", border: "#d08070", text: "#3a1810", tag: "#d08070" },
  "Food":                  { bg: "#f4cdd3", border: "#d8a0a8", text: "#3a1820", tag: "#d8a0a8" },
  "Daily Life":            { bg: "#eba3af", border: "#d07080", text: "#3a1020", tag: "#d07080" },
  "Time":                  { bg: "#d3c6e2", border: "#a898c8", text: "#281848", tag: "#a898c8" },
  "Nature":                { bg: "#b6c4eb", border: "#8098d0", text: "#101848", tag: "#8098d0" },
  "Travel":                { bg: "#c5dfe0", border: "#88b8c0", text: "#103840", tag: "#88b8c0" },
  "Body":                  { bg: "#bfd7bf", border: "#88b888", text: "#103010", tag: "#88b888" },
  "Work":                  { bg: "#c2d792", border: "#90b860", text: "#203010", tag: "#90b860" },
  "School":                { bg: "#d1d98f", border: "#a8b860", text: "#283010", tag: "#a8b860" },
  "Objects":               { bg: "#f7da74", border: "#d8b840", text: "#3a2808", tag: "#d8b840" },
  "Places":                { bg: "#efab69", border: "#d08040", text: "#3a2008", tag: "#d08040" },
  "Animals":               { bg: "#aac9e0", border: "#7098c0", text: "#102038", tag: "#7098c0" },
  "Weather":               { bg: "#8eced0", border: "#60a8b0", text: "#103038", tag: "#60a8b0" },
  "Religion":              { bg: "#eb8492", border: "#d05868", text: "#3a1020", tag: "#d05868" },
  "Money":                 { bg: "#d7abdc", border: "#b078c0", text: "#301840", tag: "#b078c0" },
  "Health":                { bg: "#c089ca", border: "#9858b0", text: "#280f38", tag: "#9858b0" },
  "Clothing":              { bg: "#8fe5d8", border: "#58c0b0", text: "#103830", tag: "#58c0b0" },
  "Colors":                { bg: "#7da7d9", border: "#5080c0", text: "#102038", tag: "#5080c0" },
  "Numbers":               { bg: "#d881b6", border: "#b85090", text: "#301028", tag: "#b85090" },
  "Movement":              { bg: "#abd589", border: "#78b850", text: "#203010", tag: "#78b850" },
  "Speech":                { bg: "#dbedc1", border: "#a8d080", text: "#283010", tag: "#a8d080" },
  "Violence":              { bg: "#aedfe4", border: "#78c0c8", text: "#103038", tag: "#78c0c8" },
  "News & Media":          { bg: "#ffa7c4", border: "#e07098", text: "#3a1028", tag: "#e07098" },
  "Government & Politics": { bg: "#d790b0", border: "#b06090", text: "#301028", tag: "#b06090" },
  "Insults":               { bg: "#c5ebfd", border: "#88c8f0", text: "#102840", tag: "#88c8f0" },
};

// ============================================================
// GET CATEGORY COLOR
// ============================================================

export function getCategoryColor(category) {
  const fallback = {
    bg: "#F3F0EC",
    border: "#C8C1B8",
    text: "#5D574F",
    tag: "#E2DDD5",
  };

  if (!category) return fallback;

  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];

  const normalized = String(category).trim().toLowerCase();
  const matchingCategory = ALL_CATEGORIES.find(
    (item) => item.toLowerCase() === normalized
  );

  if (matchingCategory && CATEGORY_COLORS[matchingCategory]) {
    return CATEGORY_COLORS[matchingCategory];
  }

  return fallback;
}

// ============================================================
// DERIVE USED CATEGORIES
// ============================================================

export function deriveCategories(words) {
  const categories = new Set();
  words.forEach((word) => {
    (word.categories || []).forEach((category) => {
      categories.add(category);
    });
  });
  return Array.from(categories).sort();
}

// ============================================================
// FILTER WORDS
// ============================================================

export function filterWords(words, search, filterCategory) {
  const q = (search || "").toLowerCase();
  return words.filter((word) => {
    const matchSearch =
      !q ||
      (word.romanized || "").toLowerCase().includes(q) ||
      (word.english || "").toLowerCase().includes(q) ||
      (word.categories || []).some((category) =>
        category.toLowerCase().includes(q)
      );
    const matchCategory =
      filterCategory === "All" ||
      (word.categories || []).includes(filterCategory);
    return matchSearch && matchCategory;
  });
}

// ============================================================
// GROUP BY CATEGORY
// ============================================================

export function groupByCategory(words) {
  const grouped = {};
  words.forEach((word) => {
    const categories =
      word.categories && word.categories.length
        ? word.categories
        : ["Uncategorized"];
    categories.forEach((category) => {
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(word);
    });
  });
  return grouped;
}

// ============================================================
// FIRESTORE — WORDS
// ============================================================

export function subscribeToWords(callback) {
  return onSnapshot(collection(db, "words"), (snapshot) => {
    const words = snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    }));
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
  await updateDoc(doc(db, "words", id), { ...form });
}

// ============================================================
// FIRESTORE — USER PROFILE
// ============================================================

export async function saveUserProfile(uid, data) {
  await setDoc(doc(db, "users", uid, "profile", "data"), data, { merge: true });
}

export function subscribeToProfile(uid, callback) {
  return onSnapshot(doc(db, "users", uid, "profile", "data"), (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

// ============================================================
// AI ENRICH
// ============================================================

export async function aiEnrich(romanized, english) {
  const categoryList = ALL_CATEGORIES.join(", ");

  const prompt = [
    "You are a Bengali linguistics expert.",
    "Analyze this Bangla word written in Roman script.",
    "",
    `Word: "${romanized}"`,
    `English meaning: "${english}"`,
    "",
    "Determine the part of speech based on how the Bangla word itself functions, not the English translation.",
    "",
    "Rules:",
    "- Words describing a state, condition, or quality → adjective",
    "- Words that are root action words → verb",
    "- Words naming a person, place, thing, or idea → noun",
    "- Words modifying verbs or adjectives → adverb",
    "- Words replacing nouns → pronoun",
    "- Fixed social phrases → expression",
    "",
    "1. Detect its part of speech.",
    "Choose exactly one: noun, verb, adjective, adverb, pronoun, expression, phrase.",
    "",
    "2. Assign 1-3 categories.",
    `Only use categories from this list: ${categoryList}`,
    "",
    "IMPORTANT: Category names must match the provided list EXACTLY, including capitalization.",
    "",
    "Respond ONLY with valid JSON.",
    'Example: {"partOfSpeech":"noun","categories":["Food"]}',
  ].join("\n");

  const res = await fetch("/api/groq", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
    model: "openai/gpt-oss-20b",
    max_completion_tokens: 300,
    temperature: 0.2,
    messages: [{ role: "user", content: prompt }],
  }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err.error && err.error.message) || `HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || "";
  const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch (error) {
    console.error("AI returned invalid JSON:", text);
    throw new Error("AI returned invalid JSON.");
  }

  const validCategories = (Array.isArray(parsed.categories) ? parsed.categories : [])
    .map((category) => {
      const normalized = String(category).trim().toLowerCase();
      return ALL_CATEGORIES.find(
        (validCategory) => validCategory.toLowerCase() === normalized
      );
    })
    .filter(Boolean);

  return {
    partOfSpeech: parsed.partOfSpeech || "",
    categories: [...new Set(validCategories)],
  };
}