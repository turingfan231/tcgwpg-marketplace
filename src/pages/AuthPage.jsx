import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { neighborhoods } from "../data/mockData";
import { useMarketplace } from "../hooks/useMarketplace";

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authReady, isAuthenticated, login, signup } = useMarketplace();
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    password: "",
    neighborhood: "St. Vital",
    postalCode: "",
  });

  const redirectTarget = location.state?.from || "/dashboard";

  useEffect(() => {
    if (authReady && isAuthenticated) {
      navigate(redirectTarget, { replace: true });
    }
  }, [authReady, isAuthenticated, navigate, redirectTarget]);

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

  return (
    <div className="mx-auto max-w-6xl">
      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-[36px] bg-[#17394a] p-8 text-white shadow-lift">
          <p className="section-kicker text-white/70">Access your account</p>
          <h1 className="mt-3 font-display text-5xl font-semibold leading-tight tracking-[-0.05em]">
            Login or create a local account.
          </h1>
          <p className="mt-4 leading-8 text-white/82">
            Accounts unlock in-app messaging, saved listings, listing management, and a
            cleaner selling flow for repeat local deals.
          </p>

          <div className="mt-8 rounded-[28px] border border-white/15 bg-white/10 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
              Supabase auth
            </p>
            <p className="mt-3 text-base leading-7 text-white/82">
              Signup now creates a real shared account in Supabase. To make an admin,
              create the account first, then promote its profile row in Supabase.
            </p>
          </div>
        </div>

        <div className="surface-card p-7">
          <div className="inline-flex rounded-full bg-[#f4f0e8] p-1">
            <button
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                mode === "login" ? "bg-white text-ink shadow-sm" : "text-steel"
              }`}
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
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
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
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
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
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
                <button
                className="rounded-full bg-navy px-6 py-3.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={submitting}
                type="submit"
              >
                {submitting ? "Signing in..." : "Login"}
              </button>
            </form>
          ) : (
            <form className="mt-7 grid gap-5 sm:grid-cols-2" onSubmit={handleSignupSubmit}>
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-steel">Full name</span>
                <input
                  required
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
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
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
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
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
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
                  Postal code
                </span>
                <input
                  maxLength={7}
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  placeholder="R3X 0A1"
                  value={signupForm.postalCode}
                  onChange={(event) =>
                    setSignupForm((current) => ({
                      ...current,
                      postalCode: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-steel">Password</span>
                <input
                  required
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
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
