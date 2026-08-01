import { useState, useEffect } from "react";
import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
} from "firebase/auth";

const provider = new GoogleAuthProvider();

export default function AuthPage() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getRedirectResult(auth).catch(() => {});
  }, []);

  async function handleEmail() {
    if (!email || !password) return;
    setLoading(true);
    setError("");
    try {
      if (mode === "signin") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      setError(e.message.replace("Firebase: ", "").replace(/\(auth.*\)/, "").trim());
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setError("");
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (e) {
      setError(e.message.replace("Firebase: ", "").replace(/\(auth.*\)/, "").trim());
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
    }}>
      <div style={{
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        padding: "3rem 2.5rem",
        width: "100%",
        maxWidth: "400px",
      }}>

        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{
            width: "64px", height: "64px",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            margin: "0 auto 1.25rem",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.08em" }}>logo</span>
          </div>
          <div style={{
            fontFamily: "var(--serif)",
            fontSize: "28px",
            fontWeight: 400,
            letterSpacing: "0.04em",
            marginBottom: "0.4rem",
          }}>mati</div>
          <div style={{
            fontSize: "11px",
            letterSpacing: "0.18em",
            color: "var(--text-muted)",
            marginBottom: "1.25rem",
          }}>মাটি</div>
          <p style={{ fontSize: "13px", color: "var(--text-mid)", lineHeight: 1.7, margin: 0 }}>
            Hello, welcome to Mati
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-mid)", lineHeight: 1.7, margin: "0.75rem 0 0" }}>
            A space to unearth for those who know the language but want to feel it at its roots
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "1.25rem" }}>
          <button onClick={handleGoogle} style={{
            width: "100%", padding: "10px",
            border: "1px solid var(--border)",
            borderRadius: "4px",
            background: "var(--bg)",
            color: "var(--text)",
            fontSize: "13px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            fontFamily: "var(--mono)",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            continue with google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>or</span>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          </div>

          <input
            placeholder="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
          />
          <input
            placeholder="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleEmail()}
            className="form-input"
          />

          {error && error.length > 2 && (
            <div style={{ fontSize: "12px", color: "var(--danger)" }}>{error}</div>
          )}

          <button onClick={handleEmail} disabled={loading} className="btn-primary" style={{ width: "100%", padding: "10px" }}>
            {loading ? "..." : mode === "signin" ? "continue" : "create account"}
          </button>
        </div>

        <div style={{ textAlign: "center" }}>
          {mode === "signin" ? (
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Don't have an account?{" "}
              <span
                onClick={() => { setMode("signup"); setError(""); }}
                style={{ color: "var(--text-mid)", textDecoration: "underline", cursor: "pointer" }}>
                sign up
              </span>
            </span>
          ) : (
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Already have an account?{" "}
              <span
                onClick={() => { setMode("signin"); setError(""); }}
                style={{ color: "var(--text-mid)", textDecoration: "underline", cursor: "pointer" }}>
                sign in
              </span>
            </span>
          )}
        </div>

      </div>
    </div>
  );
}