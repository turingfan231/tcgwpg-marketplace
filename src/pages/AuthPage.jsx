import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { neighborhoods } from "../data/mockData";
import { useMarketplace } from "../hooks/useMarketplace";

function normalizePostalInput(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);
}

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    authReady,
    completePasswordRecovery,
    isAuthenticated,
    login,
    requestPasswordReset,
    signup,
  } = useMarketplace();
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });
  const [forgotEmail, setForgotEmail] = useState("");
  const [recoveryForm, setRecoveryForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [signupForm, setSignupForm] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    neighborhood: "St. Vital",
    postalCode: "",
  });

  const redirectTarget = location.state?.from || "/dashboard";

  useEffect(() => {
    if (authReady && isAuthenticated && mode !== "recovery") {
      navigate(redirectTarget, { replace: true });
    }
  }, [authReady, isAuthenticated, mode, navigate, redirectTarget]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const isRecoveryRoute = searchParams.get("mode") === "recovery";
    const hashParams = new URLSearchParams(String(location.hash || "").replace(/^#/, ""));
    const isRecoveryHash = hashParams.get("type") === "recovery";

    if (isRecoveryRoute || isRecoveryHash) {
      setMode("recovery");
      setError("");
      setMessage("Set a new password to finish recovering your account.");
    }
  }, [location.hash, location.search]);

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const result = await login(loginForm);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setMessage("Signing you in...");
    } catch (error) {
      setError(error?.message || "Login failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignupSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const result = await signup(signupForm);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (result.requiresEmailConfirmation) {
        setMode("login");
        setLoginForm({
          email: result.email || signupForm.email,
          password: signupForm.password,
        });
        setMessage(
          "Account created. Check your email, confirm the account, then log in with the same email and password.",
        );
        return;
      }

      setMessage("Account created. Finishing sign-in...");
    } catch (error) {
      setError(error?.message || "Signup failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const result = await requestPasswordReset(forgotEmail);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setMessage("Password reset email sent. Check your inbox and open the recovery link.");
    } catch (error) {
      setError(error?.message || "Password reset email could not be sent.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRecoverySubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const result = await completePasswordRecovery(recoveryForm);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setMode("login");
      setRecoveryForm({ newPassword: "", confirmPassword: "" });
      setMessage("Password updated. You can sign in now.");
    } catch (error) {
      setError(error?.message || "Password reset failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <section className="grid gap-4 xl:grid-cols-[0.78fr_1.22fr] xl:items-start">
        <div className="console-panel p-5 sm:p-6">
          <p className="section-kicker">Account access</p>
          <h1 className="mt-2 font-display text-[2rem] font-semibold leading-[1.02] tracking-[-0.05em] text-ink sm:text-[2.4rem]">
            Sign in or create your account
          </h1>
          <p className="mt-3 max-w-lg text-[0.96rem] leading-7 text-steel">
            Use one account for messages, listings, saved cards, and offers.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-[rgba(203,220,231,0.92)] bg-white px-3 py-1.5 text-[0.76rem] font-semibold text-ink">
              Local messages
            </span>
            <span className="rounded-full border border-[rgba(203,220,231,0.92)] bg-white px-3 py-1.5 text-[0.76rem] font-semibold text-ink">
              Listing tools
            </span>
            <span className="rounded-full border border-[rgba(203,220,231,0.92)] bg-white px-3 py-1.5 text-[0.76rem] font-semibold text-ink">
              Faster deals
            </span>
          </div>
        </div>

        <div className="surface-card p-7">
          <div className="inline-flex rounded-full bg-[#f2f3f5] p-1">
            <button
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                mode === "login" ? "bg-white text-ink shadow-sm" : "text-steel"
              }`}
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
                setMessage("");
              }}
            >
              Login
            </button>
            <button
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                mode === "signup" ? "bg-white text-ink shadow-sm" : "text-steel"
              }`}
              type="button"
              onClick={() => {
                setMode("signup");
                setError("");
                setMessage("");
              }}
            >
              Sign Up
            </button>
          </div>

          {error ? (
            <div className="mt-5 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="mt-5 rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}

          {mode === "login" ? (
            <form className="mt-7 space-y-5" onSubmit={handleLoginSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-steel">Email</span>
                <input
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  type="email"
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-steel">Password</span>
                <input
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  className="text-sm font-semibold text-navy transition hover:text-orange"
                  type="button"
                  onClick={() => {
                    setMode("forgot");
                    setForgotEmail(loginForm.email);
                    setError("");
                    setMessage("");
                  }}
                >
                  Reset password
                </button>
                <button
                className="rounded-full bg-navy px-6 py-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={submitting}
                type="submit"
              >
                {submitting ? "Signing in..." : "Login"}
              </button>
              </div>
            </form>
          ) : mode === "forgot" ? (
            <form className="mt-7 space-y-5" onSubmit={handleForgotSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-steel">Email</span>
                <input
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  type="email"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                />
              </label>
              <p className="text-sm leading-7 text-steel">
                We will send a branded reset email to this address with a secure button to recover your account.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  className="text-sm font-semibold text-steel transition hover:text-ink"
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                    setMessage("");
                  }}
                >
                  Back to login
                </button>
                <button
                  className="rounded-full bg-navy px-6 py-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  disabled={submitting}
                  type="submit"
                >
                  {submitting ? "Sending..." : "Send reset email"}
                </button>
              </div>
            </form>
          ) : mode === "recovery" ? (
            <form className="mt-7 space-y-5" onSubmit={handleRecoverySubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-steel">New password</span>
                <input
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  type="password"
                  value={recoveryForm.newPassword}
                  onChange={(event) =>
                    setRecoveryForm((current) => ({
                      ...current,
                      newPassword: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-steel">Confirm password</span>
                <input
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  type="password"
                  value={recoveryForm.confirmPassword}
                  onChange={(event) =>
                    setRecoveryForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  className="text-sm font-semibold text-steel transition hover:text-ink"
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                >
                  Back to login
                </button>
                <button
                  className="rounded-full bg-orange px-6 py-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  disabled={submitting}
                  type="submit"
                >
                  {submitting ? "Updating..." : "Set new password"}
                </button>
              </div>
            </form>
          ) : (
            <form className="mt-7 grid gap-5 sm:grid-cols-2" onSubmit={handleSignupSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-steel">Username</span>
                <input
                  required
                  maxLength={24}
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  placeholder="localcardguy"
                  value={signupForm.username}
                  onChange={(event) =>
                    setSignupForm((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-steel">
                  Actual name
                </span>
                <input
                  required
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  value={signupForm.name}
                  onChange={(event) =>
                    setSignupForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-steel">Email</span>
                <input
                  required
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  type="email"
                  value={signupForm.email}
                  onChange={(event) =>
                    setSignupForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-steel">Neighborhood</span>
                <select
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  value={signupForm.neighborhood}
                  onChange={(event) =>
                    setSignupForm((current) => ({
                      ...current,
                      neighborhood: event.target.value,
                    }))
                  }
                >
                  {neighborhoods.slice(1).map((neighborhood) => (
                    <option key={neighborhood}>{neighborhood}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-steel">
                  Postal code area
                </span>
                <input
                  maxLength={3}
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  placeholder="R2P"
                  value={signupForm.postalCode}
                  onChange={(event) =>
                    setSignupForm((current) => ({
                      ...current,
                      postalCode: normalizePostalInput(event.target.value),
                    }))
                  }
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-steel">Password</span>
                <input
                  required
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  type="password"
                  value={signupForm.password}
                  onChange={(event) =>
                    setSignupForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="sm:col-span-2">
                <button
                  className="rounded-full bg-orange px-6 py-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  disabled={submitting}
                  type="submit"
                >
                  {submitting ? "Creating account..." : "Create account"}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}


