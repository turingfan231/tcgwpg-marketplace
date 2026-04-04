import { ArrowLeft, Eye, EyeOff, Lock, Mail, MapPin, UserPlus } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SeoHead from "../components/seo/SeoHead";
import { neighborhoods } from "../data/mockData";
import { useMarketplace } from "../hooks/useMarketplace";
import { m } from "../mobile/design";
import {
  ChoicePill,
  MobileScreen,
  PrimaryButton,
  ScreenSection,
  SecondaryButton,
  TextField,
} from "../mobile/primitives";

function normalizePostalInput(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);
}

function AuthField({ children, label }) {
  return (
    <label className="block">
      <p className="mb-2 text-[10px] uppercase tracking-[0.12em]" style={{ color: m.textTertiary, fontWeight: 700 }}>
        {label}
      </p>
      {children}
    </label>
  );
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
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [forgotEmail, setForgotEmail] = useState("");
  const [recoveryForm, setRecoveryForm] = useState({ newPassword: "", confirmPassword: "" });
  const [signupForm, setSignupForm] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    neighborhood: neighborhoods[1] || "St. Vital",
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
    const hashParams = new URLSearchParams(String(location.hash || "").replace(/^#/, ""));
    if (searchParams.get("mode") === "recovery" || hashParams.get("type") === "recovery") {
      setMode("recovery");
      setMessage("Set a new password to finish recovering your account.");
      setError("");
    }
  }, [location.hash, location.search]);

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    const result = await login(loginForm);
    setSubmitting(false);
    if (!result?.ok) {
      setError(result?.error || "Login failed.");
      return;
    }
    setMessage("Signing you in...");
  }

  async function handleSignupSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    const result = await signup(signupForm);
    setSubmitting(false);
    if (!result?.ok) {
      setError(result?.error || "Signup failed.");
      return;
    }
    if (result.requiresEmailConfirmation) {
      setMode("login");
      setLoginForm({ email: result.email || signupForm.email, password: signupForm.password });
      setMessage("Account created. Confirm your email, then sign in here.");
      return;
    }
    setMessage("Account created. Finishing sign-in...");
  }

  async function handleForgotSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    const result = await requestPasswordReset(forgotEmail);
    setSubmitting(false);
    if (!result?.ok) {
      setError(result?.error || "Password reset email could not be sent.");
      return;
    }
    setMessage("Password reset email sent. Check your inbox for the recovery link.");
  }

  async function handleRecoverySubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    const result = await completePasswordRecovery(recoveryForm);
    setSubmitting(false);
    if (!result?.ok) {
      setError(result?.error || "Password reset failed.");
      return;
    }
    setMode("login");
    setRecoveryForm({ newPassword: "", confirmPassword: "" });
    setMessage("Password updated. You can sign in now.");
  }

  const title =
    mode === "signup" ? "Create account" : mode === "forgot" ? "Reset password" : mode === "recovery" ? "Choose a new password" : "Sign in";

  return (
    <MobileScreen className="px-5 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <SeoHead
        canonicalPath="/auth"
        description="Sign in or create your TCG WPG account to manage listings, messages, offers, and local marketplace activity."
        title={title}
        type="website"
      />

      <div className="flex items-center justify-between">
        <motion.button
          className="inline-flex h-9 w-9 items-center justify-center rounded-[12px]"
          style={{ background: m.surfaceStrong, border: `1px solid ${m.border}` }}
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={16} style={{ color: m.textSecondary }} />
        </motion.button>
        <div className="rounded-full px-3 py-1" style={{ background: "rgba(239,68,68,0.12)" }}>
          <span className="text-[10px]" style={{ color: "#fca5a5", fontWeight: 700 }}>
            TCG WPG
          </span>
        </div>
      </div>

      <ScreenSection className="px-0 pt-10">
        <p className="text-[11px]" style={{ color: m.textTertiary, fontWeight: 600 }}>
          Winnipeg marketplace access
        </p>
        <h1 className="mt-2 text-[30px] tracking-tight text-white" style={{ fontWeight: 700, lineHeight: 1 }}>
          {title}
        </h1>
        <p className="mt-3 text-[13px]" style={{ color: m.textSecondary, lineHeight: 1.55 }}>
          One account for listings, offers, messages, saved cards, and your local seller workspace.
        </p>
      </ScreenSection>

      {mode !== "recovery" ? (
        <ScreenSection className="px-0 pt-5">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <ChoicePill active={mode === "login"} onClick={() => setMode("login")}>
              Sign In
            </ChoicePill>
            <ChoicePill active={mode === "signup"} onClick={() => setMode("signup")}>
              Create Account
            </ChoicePill>
            <ChoicePill active={mode === "forgot"} onClick={() => setMode("forgot")}>
              Reset
            </ChoicePill>
          </div>
        </ScreenSection>
      ) : null}

      <ScreenSection className="px-0 pt-5">
        <div className="rounded-[24px] border p-4" style={{ background: m.surface, borderColor: m.border, boxShadow: m.shadowPanel }}>
          {message ? (
            <div className="mb-3 rounded-[16px] px-3 py-2 text-[11px]" style={{ background: "rgba(239,68,68,0.08)", color: "#fca5a5", fontWeight: 600 }}>
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="mb-3 rounded-[16px] px-3 py-2 text-[11px]" style={{ background: "rgba(248,113,113,0.08)", color: m.danger, fontWeight: 600 }}>
              {error}
            </div>
          ) : null}

          {mode === "login" ? (
            <form className="space-y-3" onSubmit={handleLoginSubmit}>
              <AuthField label="Email">
                <TextField value={loginForm.email} onChange={(value) => setLoginForm((current) => ({ ...current, email: value }))} placeholder="you@example.com" type="email" />
              </AuthField>
              <AuthField label="Password">
                <div className="relative">
                  <TextField value={loginForm.password} onChange={(value) => setLoginForm((current) => ({ ...current, password: value }))} placeholder="Password" type={showPassword ? "text" : "password"} />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2" type="button" onClick={() => setShowPassword((current) => !current)}>
                    {showPassword ? <EyeOff size={14} style={{ color: m.textSecondary }} /> : <Eye size={14} style={{ color: m.textSecondary }} />}
                  </button>
                </div>
              </AuthField>
              <PrimaryButton disabled={submitting || !loginForm.email || !loginForm.password} type="submit">
                {submitting ? "Signing in..." : "Sign In"}
              </PrimaryButton>
            </form>
          ) : null}

          {mode === "signup" ? (
            <form className="space-y-3" onSubmit={handleSignupSubmit}>
              <AuthField label="Username">
                <TextField value={signupForm.username} onChange={(value) => setSignupForm((current) => ({ ...current, username: value }))} placeholder="cardkingwpg" />
              </AuthField>
              <AuthField label="Public name">
                <TextField value={signupForm.name} onChange={(value) => setSignupForm((current) => ({ ...current, name: value }))} placeholder="CardKingWPG" />
              </AuthField>
              <AuthField label="Email">
                <TextField value={signupForm.email} onChange={(value) => setSignupForm((current) => ({ ...current, email: value }))} placeholder="you@example.com" type="email" />
              </AuthField>
              <AuthField label="Password">
                <div className="relative">
                  <TextField value={signupForm.password} onChange={(value) => setSignupForm((current) => ({ ...current, password: value }))} placeholder="Create a password" type={showPassword ? "text" : "password"} />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2" type="button" onClick={() => setShowPassword((current) => !current)}>
                    {showPassword ? <EyeOff size={14} style={{ color: m.textSecondary }} /> : <Eye size={14} style={{ color: m.textSecondary }} />}
                  </button>
                </div>
              </AuthField>
              <div className="grid grid-cols-[1fr_5.5rem] gap-3">
                <AuthField label="Neighborhood">
                  <select
                    className="h-[42px] w-full rounded-[14px] border px-3 text-[12.5px] outline-none"
                    style={{ background: m.surfaceStrong, borderColor: m.border, color: m.text, fontWeight: 500 }}
                    value={signupForm.neighborhood}
                    onChange={(event) => setSignupForm((current) => ({ ...current, neighborhood: event.target.value }))}
                  >
                    {neighborhoods.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </AuthField>
                <AuthField label="Postal">
                  <TextField value={signupForm.postalCode} onChange={(value) => setSignupForm((current) => ({ ...current, postalCode: normalizePostalInput(value) }))} placeholder="R3C" />
                </AuthField>
              </div>
              <PrimaryButton disabled={submitting || !signupForm.username || !signupForm.email || !signupForm.password || !signupForm.name} type="submit">
                {submitting ? "Creating..." : "Create Account"}
              </PrimaryButton>
            </form>
          ) : null}

          {mode === "forgot" ? (
            <form className="space-y-3" onSubmit={handleForgotSubmit}>
              <AuthField label="Email">
                <TextField value={forgotEmail} onChange={setForgotEmail} placeholder="you@example.com" type="email" />
              </AuthField>
              <PrimaryButton disabled={submitting || !forgotEmail} type="submit">
                {submitting ? "Sending..." : "Send Reset Link"}
              </PrimaryButton>
              <SecondaryButton onClick={() => setMode("login")}>Back to sign in</SecondaryButton>
            </form>
          ) : null}

          {mode === "recovery" ? (
            <form className="space-y-3" onSubmit={handleRecoverySubmit}>
              <AuthField label="New password">
                <TextField value={recoveryForm.newPassword} onChange={(value) => setRecoveryForm((current) => ({ ...current, newPassword: value }))} placeholder="New password" type="password" />
              </AuthField>
              <AuthField label="Confirm password">
                <TextField value={recoveryForm.confirmPassword} onChange={(value) => setRecoveryForm((current) => ({ ...current, confirmPassword: value }))} placeholder="Confirm password" type="password" />
              </AuthField>
              <PrimaryButton disabled={submitting || !recoveryForm.newPassword || !recoveryForm.confirmPassword} type="submit">
                {submitting ? "Updating..." : "Update Password"}
              </PrimaryButton>
            </form>
          ) : null}
        </div>
      </ScreenSection>

      <ScreenSection className="px-0 pt-5">
        <div className="grid gap-2">
          <div className="rounded-[18px] border px-4 py-3" style={{ background: m.surface, borderColor: m.border }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[14px]" style={{ background: "rgba(239,68,68,0.12)" }}>
                <Mail size={16} style={{ color: "#fca5a5" }} />
              </div>
              <div>
                <p className="text-[12px] text-white" style={{ fontWeight: 700 }}>
                  Messages and offers
                </p>
                <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
                  Keep every local negotiation in one thread.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-[18px] border px-4 py-3" style={{ background: m.surface, borderColor: m.border }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[14px]" style={{ background: "rgba(96,165,250,0.12)" }}>
                <MapPin size={16} style={{ color: m.blue }} />
              </div>
              <div>
                <p className="text-[12px] text-white" style={{ fontWeight: 700 }}>
                  Local meetup ready
                </p>
                <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
                  Your account powers listings, meetup preferences, and seller trust.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-[18px] border px-4 py-3" style={{ background: m.surface, borderColor: m.border }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[14px]" style={{ background: "rgba(52,211,153,0.12)" }}>
                <UserPlus size={16} style={{ color: m.success }} />
              </div>
              <div>
                <p className="text-[12px] text-white" style={{ fontWeight: 700 }}>
                  Collector workspace
                </p>
                <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
                  Save cards, track listings, and stay on top of activity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </ScreenSection>
    </MobileScreen>
  );
}
