import { db } from "./firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
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
  "Food",
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
//
// Every category intentionally has a different hue.
// The colors are muted/pastel so the cards stay soft and
// readable instead of looking neon or overly saturated.
//
// bg     = card background
// border = card border
// text   = primary text
// tag    = category pill
// ============================================================

export const CATEGORY_PALETTE = {
  Greetings: {
    bg: "#FCE7EF",
    border: "#D98DAA",
    text: "#7A3F55",
    tag: "#F5D0DD",
  },

  Emotions: {
    bg: "#EEE5FA",
    border: "#AE91D1",
    text: "#614B7C",
    tag: "#DFD1F0",
  },

  Relationships: {
    bg: "#F8E1EC",
    border: "#D48EAE",
    text: "#743B56",
    tag: "#F0CBDC",
  },

  Family: {
    bg: "#FFF0DC",
    border: "#D8A36A",
    text: "#80572F",
    tag: "#F5DDBF",
  },

  "Daily Life": {
    bg: "#E8F3E8",
    border: "#91B88F",
    text: "#49684A",
    tag: "#D1E6D0",
  },

  Time: {
    bg: "#FFF3CC",
    border: "#D5B75F",
    text: "#756127",
    tag: "#F2E4A9",
  },

  Nature: {
    bg: "#E1F1E7",
    border: "#7EAE91",
    text: "#3F654B",
    tag: "#CBE3D2",
  },

  Travel: {
    bg: "#E2F0FA",
    border: "#86B5D2",
    text: "#41677F",
    tag: "#CCE3F0",
  },

  Body: {
    bg: "#FBE3E8",
    border: "#D9909E",
    text: "#783F4B",
    tag: "#F2CCD4",
  },

  Work: {
    bg: "#EDE9F4",
    border: "#A69CB9",
    text: "#5B536B",
    tag: "#DDD7E7",
  },

  School: {
    bg: "#E4EEFA",
    border: "#87A9D0",
    text: "#405C7B",
    tag: "#CFDDED",
  },

  Objects: {
    bg: "#F4EAF3",
    border: "#C09ABB",
    text: "#694F67",
    tag: "#E7D7E5",
  },

  Places: {
    bg: "#E4F4F3",
    border: "#7EB9B4",
    text: "#3E6965",
    tag: "#CBE6E3",
  },

  // NEW: soft lavender-blue instead of beige/brown
  Animals: {
    bg: "#E9E7F8",
    border: "#9C96C8",
    text: "#514B78",
    tag: "#DAD7EF",
  },

  Weather: {
    bg: "#E5F3FA",
    border: "#82B7CC",
    text: "#416776",
    tag: "#CCE6EF",
  },

  // NEW: soft rose/lilac instead of brown/gold
  Religion: {
    bg: "#F2E6F4",
    border: "#B88DBE",
    text: "#684A6D",
    tag: "#E3D0E6",
  },

  Money: {
    bg: "#E5F2E4",
    border: "#8EB58A",
    text: "#496347",
    tag: "#CEE2CC",
  },

  Food: {
    bg: "#FDE8DF",
    border: "#D99A83",
    text: "#784A3C",
    tag: "#F3D2C6",
  },

  Health: {
    bg: "#E1F3EE",
    border: "#7EB6A7",
    text: "#41675D",
    tag: "#CBE5DE",
  },

  Clothing: {
    bg: "#F4E3ED",
    border: "#C693AE",
    text: "#704B61",
    tag: "#E7D0DD",
  },

  Colors: {
    bg: "#EEE6F8",
    border: "#AD91CA",
    text: "#5F4A75",
    tag: "#DED2ED",
  },

  Numbers: {
    bg: "#FFF0D9",
    border: "#D4A86B",
    text: "#77562F",
    tag: "#F0DDBD",
  },

  Movement: {
    bg: "#E1F2F2",
    border: "#80B5B5",
    text: "#416565",
    tag: "#CBE4E4",
  },

  Speech: {
    bg: "#E9E5F6",
    border: "#9B91C1",
    text: "#51496F",
    tag: "#D9D4EA",
  },

  Violence: {
    bg: "#F6E1E3",
    border: "#CC8F96",
    text: "#733F45",
    tag: "#EBCDD1",
  },

  "News & Media": {
    bg: "#E6EDF5",
    border: "#8FA8C0",
    text: "#475C70",
    tag: "#D0DCE8",
  },

  "Government & Politics": {
    bg: "#EAE7F1",
    border: "#A59CB9",
    text: "#554D65",
    tag: "#D9D5E4",
  },

  Insults: {
    bg: "#F5E1EA",
    border: "#C88DA5",
    text: "#713F55",
    tag: "#E8CBD8",
  },
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

  if (!category) {
    return fallback;
  }

  if (CATEGORY_PALETTE[category]) {
    return CATEGORY_PALETTE[category];
  }

  const normalized = String(category).trim().toLowerCase();

  const matchingCategory = ALL_CATEGORIES.find(
    (item) => item.toLowerCase() === normalized
  );

  if (matchingCategory && CATEGORY_PALETTE[matchingCategory]) {
    return CATEGORY_PALETTE[matchingCategory];
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
      if (!grouped[category]) {
        grouped[category] = [];
      }

      grouped[category].push(word);
    });
  });

  return grouped;
}

// ============================================================
// FIRESTORE
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
  await updateDoc(doc(db, "words", id), {
    ...form,
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
    "Choose exactly one:",
    "noun, verb, adjective, adverb, pronoun, expression, phrase.",
    "",
    "2. Assign 1-3 categories.",
    `Only use categories from this list: ${categoryList}`,
    "",
    "IMPORTANT:",
    "Category names must match the provided list EXACTLY, including capitalization.",
    "",
    "Respond ONLY with valid JSON.",
    'Example: {"partOfSpeech":"noun","categories":["Food"]}',
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
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));

    throw new Error(
      (err.error && err.error.message) ||
        `HTTP ${res.status}`
    );
  }

  const data = await res.json();

  const text =
    data?.choices?.[0]?.message?.content || "";

  const clean = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  let parsed;

  try {
    parsed = JSON.parse(clean);
  } catch (error) {
    console.error("AI returned invalid JSON:", text);
    throw new Error("AI returned invalid JSON.");
  }

  const validCategories = (
    Array.isArray(parsed.categories)
      ? parsed.categories
      : []
  )
    .map((category) => {
      const normalized = String(category)
        .trim()
        .toLowerCase();

      return ALL_CATEGORIES.find(
        (validCategory) =>
          validCategory.toLowerCase() === normalized
      );
    })
    .filter(Boolean);

  return {
    partOfSpeech: parsed.partOfSpeech || "",
    categories: [...new Set(validCategories)],
  };
}