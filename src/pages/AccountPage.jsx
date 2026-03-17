import { LockKeyhole, MapPin, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { neighborhoods } from "../data/mockData";
import { useMarketplace } from "../hooks/useMarketplace";

export default function AccountPage() {
  const {
    changeCurrentUserPassword,
    currentUser,
    updateCurrentUserProfile,
  } = useMarketplace();
  const [profileForm, setProfileForm] = useState(() => ({
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

  const accountStatus = useMemo(
    () => (currentUser?.verified ? "Verified local account" : "Standard local account"),
    [currentUser],
  );

  useEffect(() => {
    setProfileForm({
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

  return (
    <div className="space-y-8">
      <section className="surface-card p-7">
        <p className="section-kicker">Account</p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-[-0.05em] text-ink">
          Manage your local account
        </h1>
        <p className="mt-4 max-w-4xl text-base leading-8 text-steel">
          Name and email stay locked once the account is created. Neighborhood, postal
          code, and password can be updated here.
        </p>
      </section>

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
                <span className="mb-2 block text-sm font-semibold text-steel">Postal code</span>
                <input
                  maxLength={7}
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f8f5ee] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  placeholder="R3X 0A1"
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
                  Save location settings
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
        </div>
      </section>
    </div>
  );
}
