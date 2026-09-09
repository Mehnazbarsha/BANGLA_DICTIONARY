import { useState } from "react";
import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  GoogleAuthProvider,
} from "firebase/auth";

const provider = new GoogleAuthProvider();

export default function AuthPage() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  function resetMessages() {
    setError("");
    setNotice("");
  }

  async function handleEmail() {
    if (!email || !password) return;
    setLoading(true);
    resetMessages();
    try {
      if (mode === "signin") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handleGoogle() {
    resetMessages();
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError("Enter your email above first, then tap Forgot?");
      return;
    }
    resetMessages();
    try {
      await sendPasswordResetEmail(auth, email);
      setNotice("Password reset email sent.");
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="auth-page">
      {/* Left panel — brand / quote */}
      <div className="auth-brand">
        <div className="auth-brand-pattern" />
        <span className="auth-brand-watermark" aria-hidden="true">মা</span>

        

        <div className="auth-brand-quote-block">
          <p className="auth-quote">Feel the language at its roots.</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="auth-form-side">
        <div className="auth-form-wrap">
          <h1 className="auth-heading">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="auth-subheading">
            {mode === "signin" ? "Sign in to continue your journey." : "Start building your vocabulary."}
          </p>

          <button className="auth-google-btn" onClick={handleGoogle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="auth-divider">
            <span />
            <small>or</small>
            <span />
          </div>

          <div className="auth-field">
            <label className="auth-label">Email address</label>
            <div className="auth-input-wrap">
              <input
                placeholder="you@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
              />
            </div>
          </div>

          <div className="auth-field">
            <div className="auth-field-row">
              <label className="auth-label">Password</label>
              {mode === "signin" && (
                <span className="auth-forgot" onClick={handleForgotPassword}>
                  Forgot?
                </span>
              )}
            </div>
            <div className="auth-input-wrap">
              <input
                placeholder="••••••••"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEmail()}
                className="auth-input has-toggle"
              />
              <button
                type="button"
                className="auth-toggle-visibility"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <i className={showPassword ? "ti ti-eye-off" : "ti ti-eye"} />
              </button>
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}
          {notice && <div className="auth-notice">{notice}</div>}

          <button
            onClick={handleEmail}
            disabled={loading}
            className="auth-submit-btn"
          >
            {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>

          <div className="auth-switch">
            {mode === "signin" ? (
              <>New to Mati?{" "}
                <button onClick={() => { setMode("signup"); resetMessages(); }}>
                  Create an account
                </button>
              </>
            ) : (
              <>Already have an account?{" "}
                <button onClick={() => { setMode("signin"); resetMessages(); }}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}