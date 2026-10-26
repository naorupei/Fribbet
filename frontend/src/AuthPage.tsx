
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

type AuthPageProps = {
  onSuccess: () => void;
};

export default function AuthPage({ onSuccess }: AuthPageProps) {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEmailAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }

      onSuccess();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Authentication failed.";
      setError(message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleAuth() {
    setError("");
    setLoading(true);

    try {
      await signInWithPopup(auth, googleProvider);
      onSuccess();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Google sign-in failed.";
      setError(message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>fribbet</h1>
        <p className="auth-subtitle">
          Real connections start with compatibility.
        </p>

        <h2>{isSignup ? "Create your account" : "Welcome back"}</h2>
        <p>
          {isSignup
            ? "Find people who just get you."
            : "Sign in to find your people."}
        </p>

        <form onSubmit={handleEmailAuth}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete={isSignup ? "new-password" : "current-password"}
            minLength={6}
            required
          />

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : isSignup
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <div className="auth-divider">or</div>

        <button
          type="button"
          className="google-button"
          onClick={handleGoogleAuth}
          disabled={loading}
        >
          Continue with Google
        </button>

        <p className="auth-switch">
          {isSignup ? "Already have an account?" : "New to Fribbet?"}{" "}
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setIsSignup(!isSignup);
              setError("");
            }}
          >
            {isSignup ? "Sign in" : "Create account"}
          </button>
        </p>
      </section>
    </main>
  );
}
