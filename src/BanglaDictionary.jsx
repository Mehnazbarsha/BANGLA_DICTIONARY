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
import { auth } from "./firebase.js";
import {
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

const ADMIN_EMAIL = "barshamehnaz@gmail.com";

// ── CATEGORY TAGS ──────────────────────────────────────────────

function CategoryTags({ categories }) {
  if (!categories || categories.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
      {categories.map((c) => {
        const tc = getCategoryColor(c);
        return (
          <span key={c} className="category-tag"
            style={{ background: tc + "18", color: tc, border: `1px solid ${tc}40` }}>
            {c}
          </span>
        );
      })}
    </div>
  );
}

// ── WORD CARD ──────────────────────────────────────────────────

function WordCard({ word, expanded, onExpand, onEdit, onDelete, canDelete }) {
  const firstColor = word.categories && word.categories.length
    ? getCategoryColor(word.categories[0])
    : "#ccc";

  return (
    <div className="word-card" onClick={onExpand}>
      <div className="card-accent-bar" style={{ background: firstColor }} />
      <div className="card-top">
        <div className="card-romanized">{word.romanized}</div>
      </div>
      <div className="card-english">{word.english}</div>
      {word.partOfSpeech && <div className="card-pos">{word.partOfSpeech}</div>}
      <div style={{ marginTop: "0.5rem" }}>
        <CategoryTags categories={word.categories} />
      </div>

      {expanded && (
        <div className="card-expanded" onClick={(e) => e.stopPropagation()}>
          {word.example && <div className="card-example">"{word.example}"</div>}
          <div className="card-actions">
            <button className="btn-small" onClick={onEdit}>edit</button>
            {canDelete && (
              <button className="btn-danger" onClick={onDelete}>delete</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── CATEGORY PICKER ────────────────────────────────────────────

function CategoryPicker({ selected, onChange }) {
  return (
    <div>
      <label className="form-label">Categories (select all that apply)</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.3rem" }}>
        {ALL_CATEGORIES.map((c) => {
          const active = selected.includes(c);
          const tc = getCategoryColor(c);
          return (
            <button key={c} type="button"
              onClick={() => onChange(active ? selected.filter((x) => x !== c) : [...selected, c])}
              style={{
                background: active ? tc + "22" : "transparent",
                color: active ? tc : "var(--text-muted)",
                border: active ? `1px solid ${tc}60` : "1px solid var(--border)",
                borderRadius: "3px", padding: "0.22rem 0.6rem",
                fontSize: "0.68rem", letterSpacing: "0.06em",
                cursor: "pointer", fontFamily: "var(--mono)",
                transition: "all 0.12s",
              }}>
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
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [view, setView] = useState("grid");
  const [expandedId, setExpandedId] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("bd_apikey") || "");
  const [showApiKey, setShowApiKey] = useState(false);
  const [tempKey, setTempKey] = useState("");
  const debounceRef = useRef(null);

  // ── AUTH ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setIsAdmin(u.email === ADMIN_EMAIL);
      }
    });
    return unsub;
  }, []);

  // ── FIRESTORE LISTENER ──
  useEffect(() => {
    const unsub = subscribeToWords((w) => setWords(w));
    return unsub;
  }, []);

  const allCategories = useMemo(() => deriveCategories(words), [words]);
  const filtered = useMemo(() => filterWords(words, search, filterCategory), [words, search, filterCategory]);
  const grouped = useMemo(() => groupByCategory(filtered), [filtered]);

  // ── AI AUTO-ENRICH ──
  useEffect(() => {
    if (!form.romanized.trim() || !form.english.trim() || !apiKey) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setAiLoading(true);
      setAiStatus("loading");
      try {
        const result = await aiEnrich(form.romanized, form.english, apiKey);
        setForm((f) => ({
          ...f,
          partOfSpeech: result.partOfSpeech || f.partOfSpeech,
          categories: result.categories.length ? result.categories : f.categories,
        }));
        setAiStatus("ok");
      } catch (e) {
        console.error(e);
        setAiStatus("err");
      }
      setAiLoading(false);
      setTimeout(() => setAiStatus(""), 3000);
    }, 900);
    return () => clearTimeout(debounceRef.current);
  }, [form.romanized, form.english, apiKey]);

  function openForm() { setForm(EMPTY_FORM); setEditId(null); setAiStatus(""); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditId(null); setForm(EMPTY_FORM); setAiStatus(""); }

  async function handleSubmit() {
    if (!form.romanized.trim() || !form.english.trim()) return;
    if (editId !== null) {
      await updateWord(editId, form);
    } else {
      await addWord(form, user);
    }
    closeForm();
  }

  function handleEdit(word) {
    setForm({ ...word, categories: word.categories || [] });
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

  function saveApiKey() {
    setApiKey(tempKey.trim());
    localStorage.setItem("bd_apikey", tempKey.trim());
    setShowApiKey(false); setTempKey("");
  }

  function field(key, label, placeholder) {
    return (
      <div>
        <label className="form-label">{label}</label>
        <input className="form-input" value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder} />
      </div>
    );
  }

  return (
    <div>
      <header className="header">
        <div className="header-inner">
          <div>
            <div className="header-title">Mati</div>
            <div className="header-sub">
              Bangla Dictionary · {words.length} {words.length === 1 ? "entry" : "entries"}
              {isAdmin && <span style={{ color: "var(--accent-warm)", marginLeft: "0.5rem" }}>· admin</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            {!apiKey && (
              <button className="btn-ghost" onClick={() => setShowApiKey((v) => !v)}>api key</button>
            )}
            {showForm
              ? <button className="btn-ghost" onClick={closeForm}>✕ cancel</button>
              : <button className="btn-primary" onClick={openForm}>+ new word</button>
            }
            <div style={{ position: "relative" }}>
              <div
                onClick={() => setShowUserMenu((v) => !v)}
                style={{
                  width: "32px", height: "32px", borderRadius: "50%",
                  background: "var(--accent)", color: "var(--bg)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.72rem", fontFamily: "var(--mono)",
                  cursor: "pointer", letterSpacing: "0.05em",
                  border: "1px solid var(--border)",
                }}>
                {user?.email?.[0].toUpperCase() || "?"}
              </div>
              {showUserMenu && (
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 8px)",
                  background: "var(--bg)", border: "1px solid var(--border)",
                  borderRadius: "4px", minWidth: "160px", zIndex: 200,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                }}>
                  <div style={{ padding: "0.6rem 0.85rem", fontSize: "0.68rem", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                    {user?.email}
                  </div>
                  <div
                    onClick={handleSignOut}
                    style={{ padding: "0.6rem 0.85rem", fontSize: "0.68rem", color: "var(--text-mid)", cursor: "pointer" }}
                    onMouseEnter={(e) => e.target.style.color = "var(--danger)"}
                    onMouseLeave={(e) => e.target.style.color = "var(--text-mid)"}
                  >
                    Sign out
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showApiKey && !apiKey && (
          <div className="header-inner" style={{ marginTop: "0.85rem" }}>
            <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flex: 1 }}>
              <label className="form-label" style={{ marginBottom: 0, whiteSpace: "nowrap" }}>Groq API Key</label>
              <input className="form-input" type="password" value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveApiKey()}
                placeholder="gsk_..." style={{ flex: 1 }} />
              <button className="btn-primary" onClick={saveApiKey}>save</button>
            </div>
          </div>
        )}
      </header>

      <main className="main">
        {showForm && (
          <div className="form-panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div className="form-section-label" style={{ marginBottom: 0 }}>
                {editId ? "— edit entry" : "— new entry"}
              </div>
              {aiLoading && <span className="ai-status loading">generating...</span>}
              {aiStatus === "ok" && <span className="ai-status ok">✓ filled by AI</span>}
              {aiStatus === "err" && <span className="ai-status err">⚠ AI failed</span>}
            </div>

            <div className="form-grid-2" style={{ marginBottom: "1rem" }}>
              {field("romanized", "Romanized Bangla *", "e.g. bhalobasha")}
              {field("english", "English Meaning *", "e.g. love")}
              {field("partOfSpeech", "Part of Speech", "—")}
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label className="form-label">Example sentence</label>
              <input className="form-input" value={form.example}
                onChange={(e) => setForm((f) => ({ ...f, example: e.target.value }))}
                placeholder="Write your own example..." />
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <CategoryPicker
                selected={form.categories || []}
                onChange={(cats) => setForm((f) => ({ ...f, categories: cats }))}
              />
            </div>

            <div className="form-actions">
              <button className="btn-primary" onClick={handleSubmit}>
                {editId ? "save changes" : "add to dictionary"}
              </button>
              <button className="btn-ghost" onClick={closeForm}>cancel</button>
            </div>
          </div>
        )}

        {words.length > 0 && (
          <div className="controls">
            <input className="search-input" value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search romanized or english..." />
            <select className="filter-select" value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}>
              <option>All</option>
              {allCategories.map((c) => <option key={c}>{c}</option>)}
            </select>
            <div className="view-toggle">
              {["grid", "list", "categories"].map((v) => (
                <button key={v} className={`view-btn${view === v ? " active" : ""}`}
                  onClick={() => setView(v)}>{v}</button>
              ))}
            </div>
            <span className="word-count">{filtered.length} words</span>
          </div>
        )}

        {view === "grid" && (
          <div className="grid-view">
            {filtered.map((w) => (
              <WordCard key={w.id} word={w}
                expanded={expandedId === w.id}
                onExpand={() => setExpandedId(expandedId === w.id ? null : w.id)}
                onEdit={() => handleEdit(w)}
                onDelete={() => handleDelete(w.id)}
                canDelete={canDelete(w)} />
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
                <div className={`list-row${expandedId === w.id ? " expanded" : ""}`}
                  onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}>
                  <span className="list-romanized">{w.romanized}</span>
                  <span className="list-english">{w.english}</span>
                  <span><CategoryTags categories={w.categories} /></span>
                  <span className="list-pos">{w.partOfSpeech || "—"}</span>
                  <div style={{ display: "flex", gap: "0.4rem" }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn-small" onClick={() => handleEdit(w)}>edit</button>
                    {canDelete(w) && (
                      <button className="btn-danger" onClick={() => handleDelete(w.id)}>del</button>
                    )}
                  </div>
                </div>
                {expandedId === w.id && w.example && (
                  <div className="list-expanded">
                    <span className="list-example">"{w.example}"</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {view === "categories" && (
          <div className="themes-view">
            {Object.entries(grouped).sort().map(([category, cw]) => {
              const tc = getCategoryColor(category);
              return (
                <div key={category}>
                  <div className="theme-section-header">
                    <div className="theme-dot" style={{ background: tc }} />
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
                        canDelete={canDelete(w)} />
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
        {words.length > 0 && filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">∅</div>
            <div className="empty-text">No entries match your search</div>
          </div>
        )}
      </main>
    </div>
  );
}