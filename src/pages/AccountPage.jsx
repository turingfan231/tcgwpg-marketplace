import { AlertTriangle, LockKeyhole, MapPin, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { neighborhoods } from "../data/mockData";
import { useMarketplace } from "../hooks/useMarketplace";

export default function AccountPage() {
  const navigate = useNavigate();
  const {
    changeCurrentUserPassword,
    currentUser,
    deleteCurrentUserAccount,
    isSuspended,
    submitSuspensionAppeal,
    updateCurrentUserProfile,
  } = useMarketplace();
  const [profileForm, setProfileForm] = useState(() => ({
    username: currentUser?.username || "",
    neighborhood: currentUser?.neighborhood || neighborhoods[1],
    postalCode: currentUser?.postalCode || "",
    favoriteGames: currentUser?.favoriteGames || [],
    meetupPreferences: currentUser?.meetupPreferences || "",
    responseTime: currentUser?.responseTime || "~ 1 hour",
    bannerStyle: currentUser?.bannerStyle || "neutral",
    bio: currentUser?.bio || "",
  }));
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [appealBody, setAppealBody] = useState("");
  const [appealMessage, setAppealMessage] = useState("");
  const [appealError, setAppealError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const accountStatus = useMemo(
    () =>
      isSuspended
        ? "Suspended account"
        : currentUser?.verified
          ? "Verified local account"
          : "Standard local account",
    [currentUser, isSuspended],
  );

  useEffect(() => {
    setProfileForm({
      username: currentUser?.username || "",
      neighborhood: currentUser?.neighborhood || neighborhoods[1],
      postalCode: currentUser?.postalCode || "",
      favoriteGames: currentUser?.favoriteGames || [],
      meetupPreferences: currentUser?.meetupPreferences || "",
      responseTime: currentUser?.responseTime || "~ 1 hour",
      bannerStyle: currentUser?.bannerStyle || "neutral",
      bio: currentUser?.bio || "",
    });
  }, [currentUser]);

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setProfileError("");
    setProfileMessage("");
    const result = await updateCurrentUserProfile(profileForm);

    if (!result.ok) {
      setProfileError(result.error);
      return;
    }

    setProfileMessage("Account location details updated.");
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");
    const result = await changeCurrentUserPassword(passwordForm);

    if (!result.ok) {
      setPasswordError(result.error);
      return;
    }

    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordMessage("Password updated.");
  }

  async function handleAppealSubmit(event) {
    event.preventDefault();
    setAppealMessage("");
    setAppealError("");
    const result = await submitSuspensionAppeal(appealBody);

    if (!result.ok) {
      setAppealError(result.error);
      return;
    }

    setAppealBody("");
    setAppealMessage("Appeal sent to admin support.");
    if (result.threadId) {
      navigate(`/messages/${result.threadId}`);
    }
  }

  return (
    <div className="space-y-8">
      <section className="surface-card p-7">
        <p className="section-kicker">Account</p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-[-0.05em] text-ink">
          Manage your local account
        </h1>
        <p className="mt-4 max-w-4xl text-base leading-8 text-steel">
          Actual name and email stay locked once the account is created. Username,
          neighborhood, meetup area, and password can be updated here.
        </p>
      </section>

      {isSuspended ? (
        <section className="rounded-[28px] border border-rose-200 bg-rose-50 px-6 py-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 text-rose-700" size={18} />
            <div>
              <p className="font-semibold text-rose-900">Account suspended</p>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-rose-800">
                Browsing stays available, but messaging, listing changes, offers, and seller
                actions are locked. You can still change your password, review your account, and
                send an appeal below.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-7 xl:grid-cols-[0.92fr_1.08fr]">
        <article className="surface-card p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-navy" size={20} />
            <div>
              <p className="section-kicker">Identity</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                Locked profile details
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="rounded-[24px] border border-slate-200 bg-[#fbf8f1] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                Username
              </p>
              <p className="mt-2 text-lg font-semibold text-ink">
                {currentUser?.username || currentUser?.publicName}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-[#fbf8f1] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                Full name
              </p>
              <p className="mt-2 text-lg font-semibold text-ink">{currentUser?.name}</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-[#fbf8f1] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                Email
              </p>
              <p className="mt-2 text-lg font-semibold text-ink">{currentUser?.email}</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-[#fbf8f1] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                Account status
              </p>
              <p className="mt-2 text-lg font-semibold text-ink">{accountStatus}</p>
            </div>
          </div>
        </article>

        <div className="space-y-7">
          <article className="surface-card p-6">
            <div className="flex items-center gap-3">
              <MapPin className="text-orange" size={20} />
              <div>
                <p className="section-kicker">Meetup Area</p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                  Neighborhood and postal code
                </h2>
              </div>
            </div>

            <form className="mt-6 grid gap-5 sm:grid-cols-2" onSubmit={handleProfileSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-steel">Username</span>
                <input
                  required
                  maxLength={24}
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  placeholder="localcardguy"
                  value={profileForm.username}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-steel">Neighborhood</span>
                <select
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  value={profileForm.neighborhood}
                  onChange={(event) =>
                    setProfileForm((current) => ({
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
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  placeholder="R2P"
                  value={profileForm.postalCode}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      postalCode: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-steel">Favorite games</span>
                <div className="flex flex-wrap gap-2">
                  {["Magic", "Pokemon", "One Piece"].map((game) => {
                    const active = profileForm.favoriteGames.includes(game);
                    return (
                      <button
                        key={game}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          active
                            ? "bg-navy text-white"
                            : "border border-slate-200 bg-white text-steel"
                        }`}
                        type="button"
                        onClick={() =>
                          setProfileForm((current) => ({
                            ...current,
                            favoriteGames: active
                              ? current.favoriteGames.filter((item) => item !== game)
                              : [...current.favoriteGames, game],
                          }))
                        }
                      >
                        {game}
                      </button>
                    );
                  })}
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-steel">Banner style</span>
                <select
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  value={profileForm.bannerStyle}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      bannerStyle: event.target.value,
                    }))
                  }
                >
                  <option value="neutral">Neutral</option>
                  <option value="magic">Magic</option>
                  <option value="pokemon">Pokemon</option>
                  <option value="one-piece">One Piece</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-steel">Response time</span>
                <select
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  value={profileForm.responseTime}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      responseTime: event.target.value,
                    }))
                  }
                >
                  <option value="< 15 min">&lt; 15 min</option>
                  <option value="~ 30 min">~ 30 min</option>
                  <option value="~ 1 hour">~ 1 hour</option>
                  <option value="Same day">Same day</option>
                </select>
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-steel">Meetup preferences</span>
                <textarea
                  className="min-h-24 w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  value={profileForm.meetupPreferences}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      meetupPreferences: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-steel">Seller bio</span>
                <textarea
                  className="min-h-28 w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  value={profileForm.bio}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      bio: event.target.value,
                    }))
                  }
                />
              </label>

              {profileError ? (
                <div className="sm:col-span-2 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {profileError}
                </div>
              ) : null}
              {profileMessage ? (
                <div className="sm:col-span-2 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {profileMessage}
                </div>
              ) : null}

              <div className="sm:col-span-2">
                <button
                  className="rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white"
                  type="submit"
                >
                  Save profile settings
                </button>
              </div>
            </form>
          </article>

          <article className="surface-card p-6">
            <div className="flex items-center gap-3">
              <LockKeyhole className="text-navy" size={20} />
              <div>
                <p className="section-kicker">Security</p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                  Change password
                </h2>
              </div>
            </div>

            <form className="mt-6 grid gap-5" onSubmit={handlePasswordSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-steel">Current password</span>
                <input
                  required
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      currentPassword: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-steel">New password</span>
                <input
                  required
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      newPassword: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-steel">Confirm new password</span>
                <input
                  required
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                />
              </label>

              {passwordError ? (
                <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {passwordError}
                </div>
              ) : null}
              {passwordMessage ? (
                <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {passwordMessage}
                </div>
              ) : null}

              <div>
                <button
                  className="rounded-full bg-orange px-6 py-3 text-sm font-semibold text-white"
                  type="submit"
                >
                  Update password
                </button>
              </div>
            </form>
          </article>

          {isSuspended ? (
            <article className="surface-card p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-rose-700" size={20} />
                <div>
                  <p className="section-kicker">Appeal</p>
                  <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                    Request review
                  </h2>
                </div>
              </div>

              <form className="mt-6 grid gap-5" onSubmit={handleAppealSubmit}>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-steel">Appeal message</span>
                  <textarea
                    required
                    className="min-h-28 w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                    placeholder="Add your context, what happened, and anything an admin should review."
                    value={appealBody}
                    onChange={(event) => setAppealBody(event.target.value)}
                  />
                </label>
                {appealError ? (
                  <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {appealError}
                  </div>
                ) : null}
                {appealMessage ? (
                  <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {appealMessage}
                  </div>
                ) : null}
                <div>
                  <button
                    className="rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white"
                    type="submit"
                  >
                    Send appeal
                  </button>
                </div>
              </form>
            </article>
          ) : null}

          <article className="surface-card p-6">
            <div className="flex items-center gap-3">
              <Trash2 className="text-rose-700" size={20} />
              <div>
                <p className="section-kicker">Delete account</p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">
                  Remove this account
                </h2>
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-steel">
              This removes your marketplace account. For full auth deletion the API server needs
              Supabase service-role access.
            </p>
            {deleteError ? (
              <div className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {deleteError}
              </div>
            ) : null}
            <div className="mt-5">
              <button
                className="rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white"
                type="button"
                onClick={async () => {
                  setDeleteError("");
                  const result = await deleteCurrentUserAccount();
                  if (!result.ok) {
                    setDeleteError(result.error);
                    return;
                  }
                  navigate("/");
                }}
              >
                Delete my account
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
