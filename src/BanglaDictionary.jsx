import { useState, useMemo, useEffect, useRef } from "react";
import "./dictionary.css";
import {
  EMPTY_FORM,
  ALL_CATEGORIES,
  getCategoryColor,
  deriveCategories,
  filterWords,
  groupByCategory,
  aiEnrich,
  subscribeToWords,
  addWord,
  deleteWord,
  updateWord,
} from "./dictionary.js";
import { auth, db } from "./firebase.js";
import { signOut, onAuthStateChanged } from "firebase/auth";
import {
  doc, setDoc, deleteDoc, collection, onSnapshot,
} from "firebase/firestore";

const ADMIN_EMAIL = "barshamehnaz@gmail.com";

const DEFAULT_FORM_CC = { bg: "#f5f0eb", border: "#cfc7c1", text: "#211d1c", tag: "#e5dfdb" };

// ── CATEGORY TAGS ──────────────────────────────────────────────

function CategoryTags({ categories }) {
  if (!categories || categories.length === 0) return null;
  return (
    <div className="category-tags">
      {categories.map((c) => {
        const cc = getCategoryColor(c);
        return (
          <span key={c} className="category-tag-colored" style={{
            background: cc.bg,
            color: cc.text,
            borderColor: cc.border,
          }}>
            {c}
          </span>
        );
      })}
    </div>
  );
}

// ── WORD CARD ──────────────────────────────────────────────────

function WordCard({ word, expanded, onExpand, onEdit, onDelete, canDelete, isBookmarked, onBookmark }) {
  const cc = word.categories && word.categories.length
    ? getCategoryColor(word.categories[0])
    : { bg: "#f0f0f0", border: "#d0d0d0", text: "#404040", tag: "#d0d0d0" };

  return (
    <div
      className="word-card"
      onClick={onExpand}
      style={{ background: cc.bg, borderColor: cc.border }}
    >
      <div className="word-card-top">
        {word.partOfSpeech && (
          <span className="part-of-speech" style={{ background: cc.tag, color: cc.text }}>
            {word.partOfSpeech}
          </span>
        )}
        <button
          className="bookmark-button"
          onClick={(e) => { e.stopPropagation(); onBookmark(); }}
          style={{ color: cc.text, opacity: isBookmarked ? 1 : 0.4 }}
        >
          <i className={isBookmarked ? "ti ti-bookmark-filled" : "ti ti-bookmark"} />
        </button>
      </div>

      <div className="word-romanized" style={{ color: cc.text }}>{word.romanized}</div>
      <div className="word-english" style={{ color: cc.text }}>{word.english}</div>
      <CategoryTags categories={word.categories} />

      {expanded && (
        <div
          className="word-expanded"
          style={{ borderColor: cc.border }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="word-actions">
            <button className="btn-small" onClick={onEdit}>edit</button>
            {canDelete && <button className="btn-danger" onClick={onDelete}>delete</button>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── CATEGORY PICKER ────────────────────────────────────────────

function CategoryPicker({ selected, onChange }) {
  return (
    <div className="category-picker-wrapper">
      <label className="form-label">Categories (select all that apply)</label>
      <div className="category-picker">
        {ALL_CATEGORIES.map((c) => {
          const active = selected.includes(c);
          const cc = getCategoryColor(c);
          return (
            <button
              key={c}
              type="button"
              className={`category-picker-button${active ? " selected" : ""}`}
              onClick={() => onChange(active ? selected.filter((x) => x !== c) : [...selected, c])}
              style={active ? { background: cc.bg, color: cc.text, borderColor: cc.border } : {}}
            >
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── MAIN APP ───────────────────────────────────────────────────

export default function BanglaDictionary() {
  const [words, setWords] = useState([]);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [bookmarks, setBookmarks] = useState(new Set());
  const [profile, setProfile] = useState(null);
  const [heroCollapsed, setHeroCollapsed] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [view, setView] = useState("grid");
  const [expandedId, setExpandedId] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  const debounceRef = useRef(null);

  const formCc = form.categories && form.categories[0]
    ? getCategoryColor(form.categories[0])
    : DEFAULT_FORM_CC;

  // ── SCROLL HERO ──
  useEffect(() => {
    const handleScroll = () => setHeroCollapsed(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── AUTH ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) { setUser(u); setIsAdmin(u.email === ADMIN_EMAIL); }
    });
    return unsub;
  }, []);

  // ── WORDS ──
  useEffect(() => {
    const unsub = subscribeToWords((w) => setWords(w));
    return unsub;
  }, []);

  // ── BOOKMARKS ──
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, "users", user.uid, "bookmarks"), (snap) => {
      setBookmarks(new Set(snap.docs.map((d) => d.id)));
    });
    return unsub;
  }, [user]);

  // ── PROFILE ──
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid, "profile", "data"), (snap) => {
      setProfile(snap.exists() ? snap.data() : null);
    });
    return unsub;
  }, [user]);

  async function toggleBookmark(wordId) {
    if (!user) return;
    const ref = doc(db, "users", user.uid, "bookmarks", wordId);
    if (bookmarks.has(wordId)) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, { savedAt: new Date() });
    }
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement("canvas");
          const MAX = 120;
          const ratio = Math.min(MAX / img.width, MAX / img.height);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL("image/jpeg", 0.7);
          await setDoc(doc(db, "users", user.uid, "profile", "data"), { avatar: compressed }, { merge: true });
          setShowUserMenu(false);
        } catch (err) {
          console.error("Avatar upload failed:", err);
        }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  const allCategories = useMemo(() => deriveCategories(words), [words]);
  const filtered = useMemo(() => {
    const base = view === "saved" ? words.filter((w) => bookmarks.has(w.id)) : words;
    return filterWords(base, search, filterCategory);
  }, [words, search, filterCategory, view, bookmarks]);
  const grouped = useMemo(() => groupByCategory(filtered), [filtered]);

  // ── AI ──
  useEffect(() => {
    if (!form.romanized.trim() || !form.english.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setAiLoading(true); setAiStatus("loading");
      try {
        const result = await aiEnrich(form.romanized, form.english);
        setForm((f) => ({
          ...f,
          partOfSpeech: result.partOfSpeech || f.partOfSpeech,
          categories: result.categories.length ? result.categories : f.categories,
        }));
        setAiStatus("ok");
      } catch (e) {
        console.error(e); setAiStatus("err");
      }
      setAiLoading(false);
      setTimeout(() => setAiStatus(""), 3000);
    }, 900);
    return () => clearTimeout(debounceRef.current);
  }, [form.romanized, form.english]);

  function openForm() { setForm(EMPTY_FORM); setEditId(null); setAiStatus(""); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditId(null); setForm(EMPTY_FORM); setAiStatus(""); }

  async function handleSubmit() {
    if (!form.romanized.trim() || !form.english.trim()) return;
    if (editId !== null) { await updateWord(editId, form); }
    else { await addWord(form, user); }
    closeForm();
  }

  function handleEdit(word) {
    const { example, ...rest } = word;
    setForm({ ...rest, categories: word.categories || [] });
    setEditId(word.id); setAiStatus(""); setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    await deleteWord(id);
    if (expandedId === id) setExpandedId(null);
  }

  function canDelete(word) {
    if (!user) return false;
    return isAdmin || word.addedBy === user.uid;
  }

  async function handleSignOut() {
    await signOut(auth);
    setIsAdmin(false);
    setShowUserMenu(false);
  }

  return (
    <div>
      <header className="header">
        <div className="header-inner">
          <div>
            <div className="header-title">Mati</div>
            <div className="header-sub">
              Bangla Dictionary · {words.length} {words.length === 1 ? "entry" : "entries"}
              {isAdmin && <span className="admin-label">· admin</span>}
            </div>
          </div>
          <div className="header-actions">
            {showForm
              ? <button className="btn-ghost" onClick={closeForm}>✕ cancel</button>
              : <button className="btn-primary" onClick={openForm}>+ new word</button>
            }
            <div className="user-menu-wrapper">
              <div
                className="user-avatar"
                onClick={() => setShowUserMenu((v) => !v)}
                style={{
                  backgroundImage: profile?.avatar ? `url(${profile.avatar})` : "none",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {!profile?.avatar && (user?.email?.[0].toUpperCase() || "?")}
              </div>
              {showUserMenu && (
                <div className="user-menu">
                  <div className="user-email">{user?.email}</div>
                  {isAdmin && <div className="user-admin">admin</div>}
                  <label style={{
                    display: "block",
                    padding: "0.7rem 0.8rem",
                    fontSize: "0.65rem",
                    color: "var(--text-mid)",
                    cursor: "pointer",
                    borderBottom: "1px solid var(--border)",
                  }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#fcf8f8"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    upload photo
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleAvatarUpload}
                    />
                  </label>
                  <button className="sign-out-button" onClick={handleSignOut}>sign out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className={`hero${heroCollapsed ? " collapsed" : ""}`}>
        <h1 className="hero-heading">
          Grow your<br /><em>Vocabulary</em>
        </h1>
        <p className="hero-sub">
          Explore Bangla words, their meanings, and categories
        </p>
      </div>

      <main className="main">
        {showForm && (
          <div>
            <div className="form-eyebrow">
              <span>{editId ? "Editing entry" : "New entry"}</span>
              <span className={`ai-status${aiLoading ? " loading" : aiStatus === "ok" ? " ok" : aiStatus === "err" ? " err" : " idle"}`}>
                {aiLoading ? "generating..." : aiStatus === "ok" ? "✓ filled by AI" : aiStatus === "err" ? "⚠ AI failed" : "—"}
              </span>
            </div>

            <div className="form-panel" style={{ background: formCc.bg, borderColor: formCc.border }}>
              <div className="form-card-top">
                <span
                  className="part-of-speech"
                  style={{
                    background: formCc.tag,
                    color: formCc.text,
                    visibility: form.partOfSpeech ? "visible" : "hidden",
                  }}
                >
                  {form.partOfSpeech || "—"}
                </span>
              </div>

              <div className="form-fields-row">
                <input
                  className="form-card-input form-card-romanized"
                  style={{ color: formCc.text, borderColor: formCc.border }}
                  value={form.romanized}
                  onChange={(e) => setForm((f) => ({ ...f, romanized: e.target.value }))}
                  placeholder="Romanized Bangla *"
                />
                <input
                  className="form-card-input form-card-english"
                  style={{ color: formCc.text, borderColor: formCc.border }}
                  value={form.english}
                  onChange={(e) => setForm((f) => ({ ...f, english: e.target.value }))}
                  placeholder="English meaning *"
                />
                <input
                  className="form-card-input form-card-pos"
                  style={{ color: formCc.text, borderColor: formCc.border }}
                  value={form.partOfSpeech}
                  onChange={(e) => setForm((f) => ({ ...f, partOfSpeech: e.target.value }))}
                  placeholder="Part of speech"
                />
              </div>

              <CategoryPicker
                selected={form.categories || []}
                onChange={(cats) => setForm((f) => ({ ...f, categories: cats }))}
              />

              <div className="form-actions">
                <button className="btn-primary" onClick={handleSubmit}>
                  {editId ? "save changes" : "add to dictionary"}
                </button>
                <button className="btn-ghost" onClick={closeForm}>cancel</button>
              </div>
            </div>
          </div>
        )}

        {words.length > 0 && (
          <div className="controls">
            <input
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search romanized or english words"
            />
            <select
              className="filter-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option>All</option>
              {allCategories.map((c) => <option key={c}>{c}</option>)}
            </select>
            <div className="view-toggle">
              {["grid", "list", "categories", "saved"].map((v) => (
                <button
                  key={v}
                  className={`view-btn${view === v ? " active" : ""}`}
                  onClick={() => setView(v)}
                >{v}</button>
              ))}
            </div>
            <span className="word-count">{filtered.length} words</span>
          </div>
        )}

        {(view === "grid" || view === "saved") && (
          <div className="grid-view">
            {filtered.map((w) => (
              <WordCard key={w.id} word={w}
                expanded={expandedId === w.id}
                onExpand={() => setExpandedId(expandedId === w.id ? null : w.id)}
                onEdit={() => handleEdit(w)}
                onDelete={() => handleDelete(w.id)}
                canDelete={canDelete(w)}
                isBookmarked={bookmarks.has(w.id)}
                onBookmark={() => toggleBookmark(w.id)} />
            ))}
          </div>
        )}

        {view === "list" && (
          <div>
            <div className="list-header">
              <span>Romanized</span><span>English</span>
              <span>Categories</span><span>Part of Speech</span><span></span>
            </div>
            {filtered.map((w) => (
              <div key={w.id}>
                <div
                  className={`list-row${expandedId === w.id ? " expanded" : ""}`}
                  onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
                >
                  <span className="list-romanized">{w.romanized}</span>
                  <span className="list-english">{w.english}</span>
                  <span><CategoryTags categories={w.categories} /></span>
                  <span className="list-pos">{w.partOfSpeech || "—"}</span>
                  <div className="list-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="btn-small" onClick={() => handleEdit(w)}>edit</button>
                    {canDelete(w) && (
                      <button className="btn-danger" onClick={() => handleDelete(w.id)}>del</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === "categories" && (
          <div className="themes-view">
            {Object.entries(grouped).sort().map(([category, cw]) => {
              const cc = getCategoryColor(category);
              return (
                <div key={category}>
                  <div className="theme-section-header">
                    <div className="theme-dot" style={{ background: cc.border }} />
                    <span className="theme-section-name">{category}</span>
                    <div className="theme-divider" />
                    <span className="theme-count">{cw.length}</span>
                  </div>
                  <div className="grid-view">
                    {cw.map((w) => (
                      <WordCard key={w.id} word={w}
                        expanded={expandedId === w.id}
                        onExpand={() => setExpandedId(expandedId === w.id ? null : w.id)}
                        onEdit={() => handleEdit(w)}
                        onDelete={() => handleDelete(w.id)}
                        canDelete={canDelete(w)}
                        isBookmarked={bookmarks.has(w.id)}
                        onBookmark={() => toggleBookmark(w.id)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {words.length === 0 && !showForm && (
          <div className="empty-state">
            <div className="empty-icon">∅</div>
            <div className="empty-text">No entries yet — add your first word</div>
          </div>
        )}
        {words.length > 0 && filtered.length === 0 && view !== "saved" && (
          <div className="empty-state">
            <div className="empty-icon">∅</div>
            <div className="empty-text">No entries match your search</div>
          </div>
        )}
        {view === "saved" && filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔖</div>
            <div className="empty-text">No saved words yet</div>
          </div>
        )}
      </main>
    </div>
  );
}