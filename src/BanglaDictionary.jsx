import {
  useState,
  useMemo,
  useEffect,
  useRef,
} from "react";

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

import {
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
} from "firebase/firestore";

const ADMIN_EMAIL = "barshamehnaz@gmail.com";

// ============================================================
// CATEGORY TAGS
// ============================================================

function CategoryTags({ categories }) {
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <div className="category-tags">
      {categories.map((category) => {
        const color = getCategoryColor(category);

        return (
          <span
            key={category}
            className="category-tag-colored"
            style={{
              backgroundColor: color.tag,
              color: color.text,
              borderColor: color.border,
            }}
          >
            {category}
          </span>
        );
      })}
    </div>
  );
}

// ============================================================
// WORD CARD
// ============================================================

function WordCard({
  word,
  expanded,
  onExpand,
  onEdit,
  onDelete,
  canDelete,
  isBookmarked,
  onBookmark,
}) {
  const category =
    word.categories && word.categories.length > 0
      ? word.categories[0]
      : null;

  const color = getCategoryColor(category);

  return (
    <div
      className="word-card"
      onClick={onExpand}
      style={{
        backgroundColor: color.bg,
        borderColor: color.border,
      }}
    >
      <div className="word-card-top">
        {word.partOfSpeech && (
          <span
            className="part-of-speech"
            style={{
              backgroundColor: color.tag,
              color: color.text,
            }}
          >
            {word.partOfSpeech}
          </span>
        )}

        <button
          className="bookmark-button"
          onClick={(event) => {
            event.stopPropagation();
            onBookmark();
          }}
          style={{
            color: color.border,
          }}
          aria-label="Bookmark word"
        >
          <i
            className={
              isBookmarked
                ? "ti ti-bookmark-filled"
                : "ti ti-bookmark"
            }
          />
        </button>
      </div>

      <div
        className="word-romanized"
        style={{
          color: color.text,
        }}
      >
        {word.romanized}
      </div>

      <div
        className="word-english"
        style={{
          color: color.text,
        }}
      >
        {word.english}
      </div>

      <CategoryTags categories={word.categories} />

      {expanded && (
        <div
          className="word-expanded"
          onClick={(event) => event.stopPropagation()}
          style={{
            borderTopColor: color.border,
          }}
        >
          {word.example && (
            <div
              className="word-example"
              style={{
                color: color.text,
              }}
            >
              "{word.example}"
            </div>
          )}

          <div className="word-actions">
            <button
              className="btn-small"
              onClick={onEdit}
            >
              edit
            </button>

            {canDelete && (
              <button
                className="btn-danger"
                onClick={onDelete}
              >
                delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// CATEGORY PICKER
// ============================================================

function CategoryPicker({ selected, onChange }) {
  return (
    <div className="category-picker-wrapper">
      <label className="form-label">
        Categories · select all that apply
      </label>

      <div className="category-picker">
        {ALL_CATEGORIES.map((category) => {
          const active = selected.includes(category);
          const color = getCategoryColor(category);

          return (
            <button
              key={category}
              type="button"
              className={`category-picker-button ${
                active ? "selected" : ""
              }`}
              onClick={() => {
                if (active) {
                  onChange(
                    selected.filter(
                      (item) => item !== category
                    )
                  );
                } else {
                  onChange([
                    ...selected,
                    category,
                  ]);
                }
              }}
              style={
                active
                  ? {
                      backgroundColor: color.bg,
                      color: color.text,
                      borderColor: color.border,
                    }
                  : undefined
              }
            >
              {category}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================

export default function BanglaDictionary() {
  const [words, setWords] = useState([]);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [bookmarks, setBookmarks] = useState(new Set());

  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] =
    useState("All");

  const [view, setView] = useState("grid");
  const [expandedId, setExpandedId] = useState(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState("");

  const debounceRef = useRef(null);

  // ==========================================================
  // AUTH
  // ==========================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);

        if (currentUser) {
          setIsAdmin(
            currentUser.email === ADMIN_EMAIL
          );
        } else {
          setIsAdmin(false);
        }
      }
    );

    return unsubscribe;
  }, []);

  // ==========================================================
  // FIRESTORE WORDS
  // ==========================================================

  useEffect(() => {
    const unsubscribe = subscribeToWords(
      (newWords) => {
        setWords(newWords);
      }
    );

    return unsubscribe;
  }, []);

  // ==========================================================
  // BOOKMARKS
  // ==========================================================

  useEffect(() => {
    if (!user) {
      setBookmarks(new Set());
      return undefined;
    }

    const unsubscribe = onSnapshot(
      collection(
        db,
        "users",
        user.uid,
        "bookmarks"
      ),
      (snapshot) => {
        setBookmarks(
          new Set(
            snapshot.docs.map(
              (document) => document.id
            )
          )
        );
      }
    );

    return unsubscribe;
  }, [user]);

  async function toggleBookmark(wordId) {
    if (!user) return;

    const reference = doc(
      db,
      "users",
      user.uid,
      "bookmarks",
      wordId
    );

    if (bookmarks.has(wordId)) {
      await deleteDoc(reference);
    } else {
      await setDoc(reference, {
        savedAt: new Date(),
      });
    }
  }

  // ==========================================================
  // FILTERING
  // ==========================================================

  const allCategories = useMemo(
    () => deriveCategories(words),
    [words]
  );

  const filtered = useMemo(() => {
    const source =
      view === "saved"
        ? words.filter((word) =>
            bookmarks.has(word.id)
          )
        : words;

    return filterWords(
      source,
      search,
      filterCategory
    );
  }, [
    words,
    search,
    filterCategory,
    view,
    bookmarks,
  ]);

  const grouped = useMemo(
    () => groupByCategory(filtered),
    [filtered]
  );

  // ==========================================================
  // AI AUTO ENRICH
  // ==========================================================

  useEffect(() => {
    if (
      !form.romanized.trim() ||
      !form.english.trim()
    ) {
      return undefined;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(
      async () => {
        setAiLoading(true);
        setAiStatus("loading");

        try {
          const result = await aiEnrich(
            form.romanized,
            form.english
          );

          setForm((current) => ({
            ...current,

            partOfSpeech:
              result.partOfSpeech ||
              current.partOfSpeech,

            categories:
              result.categories &&
              result.categories.length
                ? result.categories
                : current.categories,
          }));

          setAiStatus("ok");
        } catch (error) {
          console.error(
            "AI enrichment failed:",
            error
          );

          setAiStatus("err");
        }

        setAiLoading(false);

        setTimeout(() => {
          setAiStatus("");
        }, 3000);
      },
      900
    );

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [
    form.romanized,
    form.english,
  ]);

  // ==========================================================
  // FORM
  // ==========================================================

  function openForm() {
    setForm({
      ...EMPTY_FORM,
      categories: [],
    });

    setEditId(null);
    setAiStatus("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);

    setForm({
      ...EMPTY_FORM,
      categories: [],
    });

    setAiStatus("");
  }

  async function handleSubmit() {
    if (
      !form.romanized.trim() ||
      !form.english.trim()
    ) {
      return;
    }

    try {
      if (editId !== null) {
        await updateWord(editId, form);
      } else {
        await addWord(form, user);
      }

      closeForm();
    } catch (error) {
      console.error(
        "Could not save word:",
        error
      );
    }
  }

  function handleEdit(word) {
    setForm({
      ...word,
      categories: word.categories || [],
    });

    setEditId(word.id);
    setAiStatus("");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleDelete(id) {
    try {
      await deleteWord(id);

      if (expandedId === id) {
        setExpandedId(null);
      }
    } catch (error) {
      console.error(
        "Could not delete word:",
        error
      );
    }
  }

  function canDelete(word) {
    if (!user) return false;

    return (
      isAdmin ||
      word.addedBy === user.uid
    );
  }

  async function handleSignOut() {
    await signOut(auth);

    setUser(null);
    setIsAdmin(false);
    setShowUserMenu(false);
  }

  function field(
    key,
    label,
    placeholder
  ) {
    return (
      <div className="form-field">
        <label className="form-label">
          {label}
        </label>

        <input
          className="form-input"
          value={form[key] || ""}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              [key]: event.target.value,
            }))
          }
          placeholder={placeholder}
        />
      </div>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div>
            <div className="header-title">
              Mati
            </div>

            <div className="header-sub">
              Bangla Dictionary ·{" "}
              {words.length}{" "}
              {words.length === 1
                ? "entry"
                : "entries"}

              {isAdmin && (
                <span className="admin-label">
                  · admin
                </span>
              )}
            </div>
          </div>

          <div className="header-actions">
            {showForm ? (
              <button
                className="btn-ghost"
                onClick={closeForm}
              >
                ✕ cancel
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={openForm}
              >
                + new word
              </button>
            )}

            <div className="user-menu-wrapper">
              <button
                className="user-avatar"
                onClick={() =>
                  setShowUserMenu(
                    (value) => !value
                  )
                }
              >
                {user?.email?.[0]
                  ? user.email[0].toUpperCase()
                  : "?"}
              </button>

              {showUserMenu && (
                <div className="user-menu">
                  <div className="user-email">
                    {user?.email ||
                      "Not signed in"}
                  </div>

                  {isAdmin && (
                    <div className="user-admin">
                      admin
                    </div>
                  )}

                  <button
                    className="sign-out-button"
                    onClick={handleSignOut}
                  >
                    sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        {showForm && (
          <div className="form-panel">
            <div className="form-header">
              <div className="form-section-label">
                {editId
                  ? "edit entry"
                  : "new entry"}
              </div>

              <div>
                {aiLoading && (
                  <span className="ai-status loading">
                    generating...
                  </span>
                )}

                {aiStatus === "ok" && (
                  <span className="ai-status ok">
                    ✓ filled by AI
                  </span>
                )}

                {aiStatus === "err" && (
                  <span className="ai-status err">
                    ⚠ AI failed
                  </span>
                )}
              </div>
            </div>

            <div className="form-grid">
              {field(
                "romanized",
                "Romanized Bangla *",
                "e.g. bhalobasha"
              )}

              {field(
                "english",
                "English Meaning *",
                "e.g. love"
              )}

              {field(
                "partOfSpeech",
                "Part of Speech",
                "e.g. noun"
              )}
            </div>

            <div className="form-field">
              <label className="form-label">
                Example sentence
              </label>

              <input
                className="form-input"
                value={form.example || ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    example:
                      event.target.value,
                  }))
                }
                placeholder="Write your own example..."
              />
            </div>

            <CategoryPicker
              selected={
                form.categories || []
              }
              onChange={(categories) =>
                setForm((current) => ({
                  ...current,
                  categories,
                }))
              }
            />

            <div className="form-actions">
              <button
                className="btn-primary"
                onClick={handleSubmit}
              >
                {editId
                  ? "save changes"
                  : "add to dictionary"}
              </button>

              <button
                className="btn-ghost"
                onClick={closeForm}
              >
                cancel
              </button>
            </div>
          </div>
        )}

        {words.length > 0 && (
          <div className="controls">
            <input
              className="search-input"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search romanized or english..."
            />

            <select
              className="filter-select"
              value={filterCategory}
              onChange={(event) =>
                setFilterCategory(
                  event.target.value
                )
              }
            >
              <option>All</option>

              {allCategories.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                )
              )}
            </select>

            <div className="view-toggle">
              {[
                "grid",
                "list",
                "categories",
                "saved",
              ].map((viewName) => (
                <button
                  key={viewName}
                  className={`view-btn ${
                    view === viewName
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setView(viewName)
                  }
                >
                  {viewName}
                </button>
              ))}
            </div>

            <span className="word-count">
              {filtered.length} words
            </span>
          </div>
        )}

        {(view === "grid" ||
          view === "saved") && (
          <div className="grid-view">
            {filtered.map((word) => (
              <WordCard
                key={word.id}
                word={word}
                expanded={
                  expandedId === word.id
                }
                onExpand={() =>
                  setExpandedId(
                    expandedId === word.id
                      ? null
                      : word.id
                  )
                }
                onEdit={() =>
                  handleEdit(word)
                }
                onDelete={() =>
                  handleDelete(word.id)
                }
                canDelete={canDelete(word)}
                isBookmarked={bookmarks.has(
                  word.id
                )}
                onBookmark={() =>
                  toggleBookmark(word.id)
                }
              />
            ))}
          </div>
        )}

        {view === "list" && (
          <div className="list-view">
            <div className="list-header">
              <span>Romanized</span>
              <span>English</span>
              <span>Categories</span>
              <span>Part of Speech</span>
              <span />
            </div>

            {filtered.map((word) => (
              <div key={word.id}>
                <div
                  className={`list-row ${
                    expandedId === word.id
                      ? "expanded"
                      : ""
                  }`}
                  onClick={() =>
                    setExpandedId(
                      expandedId === word.id
                        ? null
                        : word.id
                    )
                  }
                >
                  <span className="list-romanized">
                    {word.romanized}
                  </span>

                  <span className="list-english">
                    {word.english}
                  </span>

                  <span>
                    <CategoryTags
                      categories={
                        word.categories
                      }
                    />
                  </span>

                  <span className="list-pos">
                    {word.partOfSpeech ||
                      "—"}
                  </span>

                  <div
                    className="list-actions"
                    onClick={(event) =>
                      event.stopPropagation()
                    }
                  >
                    <button
                      className="btn-small"
                      onClick={() =>
                        handleEdit(word)
                      }
                    >
                      edit
                    </button>

                    {canDelete(word) && (
                      <button
                        className="btn-danger"
                        onClick={() =>
                          handleDelete(
                            word.id
                          )
                        }
                      >
                        del
                      </button>
                    )}
                  </div>
                </div>

                {expandedId === word.id &&
                  word.example && (
                    <div className="list-expanded">
                      "{word.example}"
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}

        {view === "categories" && (
          <div className="themes-view">
            {Object.entries(grouped)
              .sort()
              .map(
                ([category, categoryWords]) => {
                  const color =
                    getCategoryColor(category);

                  return (
                    <div
                      key={category}
                      className="theme-section"
                    >
                      <div className="theme-section-header">
                        <div
                          className="theme-dot"
                          style={{
                            backgroundColor:
                              color.border,
                          }}
                        />

                        <span
                          className="theme-section-name"
                          style={{
                            color: color.text,
                          }}
                        >
                          {category}
                        </span>

                        <div className="theme-divider" />

                        <span className="theme-count">
                          {categoryWords.length}
                        </span>
                      </div>

                      <div className="grid-view">
                        {categoryWords.map(
                          (word) => (
                            <WordCard
                              key={word.id}
                              word={word}
                              expanded={
                                expandedId ===
                                word.id
                              }
                              onExpand={() =>
                                setExpandedId(
                                  expandedId ===
                                    word.id
                                    ? null
                                    : word.id
                                )
                              }
                              onEdit={() =>
                                handleEdit(word)
                              }
                              onDelete={() =>
                                handleDelete(
                                  word.id
                                )
                              }
                              canDelete={canDelete(
                                word
                              )}
                              isBookmarked={bookmarks.has(
                                word.id
                              )}
                              onBookmark={() =>
                                toggleBookmark(
                                  word.id
                                )
                              }
                            />
                          )
                        )}
                      </div>
                    </div>
                  );
                }
              )}
          </div>
        )}

        {words.length === 0 &&
          !showForm && (
            <div className="empty-state">
              <div className="empty-icon">
                ∅
              </div>

              <div className="empty-text">
                No entries yet. Add your first
                word.
              </div>
            </div>
          )}

        {words.length > 0 &&
          filtered.length === 0 &&
          view !== "saved" && (
            <div className="empty-state">
              <div className="empty-icon">
                ∅
              </div>

              <div className="empty-text">
                No entries match your search.
              </div>
            </div>
          )}

        {view === "saved" &&
          filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-text">
                No saved words yet.
              </div>
            </div>
          )}
      </main>
    </div>
  );
}