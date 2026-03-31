import { AlertTriangle, LockKeyhole, MapPin, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProfileWorkspaceNav from "../components/account/ProfileWorkspaceNav";
import SeoHead from "../components/seo/SeoHead";
import { neighborhoods } from "../data/mockData";
import { approvedMeetupSpots } from "../data/storefrontData";
import { useMarketplace } from "../hooks/useMarketplace";
import UserAvatar from "../components/shared/UserAvatar";
import { trackEvent } from "../lib/analytics";

const GAME_OPTIONS = [
  "Magic",
  "Pokemon",
  "One Piece",
  "Dragon Ball Super Fusion World",
  "Union Arena",
];

function normalizePostalInput(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);
}

function buildProfileForm(user) {
  return {
    username: user?.username || "",
    neighborhood: user?.neighborhood || neighborhoods[1],
    postalCode: normalizePostalInput(user?.postalCode || ""),
    defaultListingGame: user?.defaultListingGame || user?.favoriteGames?.[0] || "Pokemon",
    favoriteGames: user?.favoriteGames || [],
    trustedMeetupSpots: user?.trustedMeetupSpots || [],
    meetupPreferences: user?.meetupPreferences || "",
    responseTime: user?.responseTime || "~ 1 hour",
    bannerStyle: user?.bannerStyle || "neutral",
    bio: user?.bio || "",
  };
}

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
  const [profileForm, setProfileForm] = useState(() => buildProfileForm(currentUser));
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
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(currentUser?.avatarUrl || "");
  const [isProfileDirty, setIsProfileDirty] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const lastSyncedAccountIdRef = useRef(currentUser?.id || "");

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
    const nextAccountId = currentUser?.id || "";
    const accountChanged = nextAccountId !== lastSyncedAccountIdRef.current;

    if (!accountChanged && (isProfileDirty || isSavingProfile)) {
      return;
    }

    setProfileForm(buildProfileForm(currentUser));
    setAvatarFile(null);
    setAvatarPreviewUrl(currentUser?.avatarUrl || "");
    setIsProfileDirty(false);
    lastSyncedAccountIdRef.current = nextAccountId;
  }, [currentUser, isProfileDirty, isSavingProfile]);

  useEffect(() => {
    return () => {
      if (String(avatarPreviewUrl || "").startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setProfileError("");
    setProfileMessage("");
    setIsSavingProfile(true);

    const result = await updateCurrentUserProfile({
      ...profileForm,
      avatarFile,
      removeAvatar: !avatarFile && !avatarPreviewUrl,
    });

    setIsSavingProfile(false);

    if (!result.ok) {
      setProfileError(result.error);
      return;
    }

    trackEvent("profile_settings_saved", {
      defaultListingGame: profileForm.defaultListingGame,
      favoriteGameCount: profileForm.favoriteGames.length,
      trustedMeetupSpotCount: profileForm.trustedMeetupSpots.length,
      hasAvatarUpload: Boolean(avatarFile),
    });
    setProfileMessage(result.warning || "Account location details updated.");
    setAvatarFile(null);
    if (typeof result.avatarUrl === "string") {
      setAvatarPreviewUrl(result.avatarUrl);
    }
    setIsProfileDirty(false);
  }

  function updateProfileFormField(field, value) {
    setProfileError("");
    setProfileMessage("");
    setIsProfileDirty(true);
    setProfileForm((current) => ({
      ...current,
      [field]: value,
    }));
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
    <main className="space-y-8">
      <SeoHead
        canonicalPath="/account"
        description="Manage your TCG WPG Marketplace account settings, meetup area, seller bio, and password."
        title="Account Settings"
        type="profile"
      />
      <ProfileWorkspaceNav sellerId={currentUser?.id} />
      <section aria-labelledby="account-settings-heading" className="surface-card p-7">
        <p className="section-kicker">Account</p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-[-0.05em] text-ink" id="account-settings-heading">
          Manage your local account
        </h1>
        <p className="mt-4 max-w-4xl text-base leading-8 text-steel">
          Actual name and email stay locked once the account is created. Username,
          default listing game, neighborhood, meetup area, and password can be updated here.
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

      <section className="grid items-start gap-7 xl:grid-cols-[0.92fr_1.08fr]">
        <article aria-labelledby="account-identity-heading" className="surface-card self-start p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-navy" size={20} />
            <div>
              <p className="section-kicker">Identity</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink" id="account-identity-heading">
                Locked profile details
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="rounded-[24px] border border-slate-200 bg-[#f7f7f8] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                Username
              </p>
              <p className="mt-2 text-lg font-semibold text-ink">
                {currentUser?.username || currentUser?.publicName}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-[#f7f7f8] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                Full name
              </p>
              <p className="mt-2 text-lg font-semibold text-ink">{currentUser?.name}</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-[#f7f7f8] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                Email
              </p>
              <p className="mt-2 text-lg font-semibold text-ink">{currentUser?.email}</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-[#f7f7f8] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                Profile photo
              </p>
              <div className="mt-4 flex items-center gap-4">
                <UserAvatar
                  className="h-16 w-16"
                  name={currentUser?.name}
                  src={avatarPreviewUrl}
                  user={currentUser}
                />
                <p className="text-sm leading-7 text-steel">
                  Upload a square-ish photo to show on seller pages and listing details.
                </p>
              </div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-[#f7f7f8] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                Account status
              </p>
              <p className="mt-2 text-lg font-semibold text-ink">{accountStatus}</p>
            </div>
          </div>
        </article>

        <div className="space-y-7">
          <article aria-labelledby="account-meetup-heading" className="surface-card p-6">
            <div className="flex items-center gap-3">
              <MapPin className="text-orange" size={20} />
              <div>
                <p className="section-kicker">Meetup Area</p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink" id="account-meetup-heading">
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
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  placeholder="localcardguy"
                  value={profileForm.username}
                  onChange={(event) =>
                    updateProfileFormField("username", event.target.value)
                  }
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-steel">Profile photo</span>
                <div className="rounded-[22px] border border-slate-200 bg-[#f2f3f5] p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <UserAvatar
                      className="h-20 w-20"
                      name={currentUser?.name}
                      src={avatarPreviewUrl}
                      user={currentUser}
                    />
                    <div className="flex-1 space-y-3">
                      <input
                        accept="image/*"
                        className="block w-full text-sm text-steel file:mr-3 file:rounded-full file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                        type="file"
                        onChange={(event) => {
                          const file = event.target.files?.[0] || null;
                          setProfileError("");
                          setProfileMessage("");
                          setIsProfileDirty(true);
                          setAvatarFile(file);

                          if (!file) {
                            setAvatarPreviewUrl(currentUser?.avatarUrl || "");
                            return;
                          }

                          const previewUrl = URL.createObjectURL(file);
                          setAvatarPreviewUrl(previewUrl);
                        }}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-steel transition hover:border-slate-300 hover:text-ink"
                          type="button"
                          onClick={() => {
                            setAvatarFile(null);
                            setAvatarPreviewUrl(currentUser?.avatarUrl || "");
                            setProfileError("");
                            setProfileMessage("");
                            setIsProfileDirty(true);
                          }}
                        >
                          Revert
                        </button>
                        <button
                          className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300"
                          type="button"
                          onClick={() => {
                            setAvatarFile(null);
                            setAvatarPreviewUrl("");
                            setProfileError("");
                            setProfileMessage("");
                            setIsProfileDirty(true);
                          }}
                        >
                          Remove photo
                        </button>
                      </div>
                      <p className="text-sm text-steel">JPG, PNG, or WebP up to 1.5 MB.</p>
                    </div>
                  </div>
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-steel">
                  Default listing game
                </span>
                <select
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  value={profileForm.defaultListingGame}
                  onChange={(event) =>
                    updateProfileFormField("defaultListingGame", event.target.value)
                  }
                >
                  {GAME_OPTIONS.map((game) => (
                    <option key={game} value={game}>
                      {game}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-steel">Neighborhood</span>
                <select
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  value={profileForm.neighborhood}
                  onChange={(event) =>
                    updateProfileFormField("neighborhood", event.target.value)
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
                  value={profileForm.postalCode}
                  onChange={(event) =>
                    updateProfileFormField("postalCode", normalizePostalInput(event.target.value))
                  }
                />
              </label>

              <div className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-steel">Favorite games</span>
                <div className="flex flex-wrap gap-2">
                  {GAME_OPTIONS.map((game) => {
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
                          updateProfileFormField(
                            "favoriteGames",
                            active
                              ? profileForm.favoriteGames.filter((item) => item !== game)
                              : [...profileForm.favoriteGames, game],
                          )
                        }
                      >
                        {game}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-steel">Banner style</span>
                <select
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  value={profileForm.bannerStyle}
                  onChange={(event) =>
                    updateProfileFormField("bannerStyle", event.target.value)
                  }
                >
                  <option value="neutral">Neutral</option>
                  <option value="magic">Magic</option>
                  <option value="pokemon">Pokemon</option>
                  <option value="one-piece">One Piece</option>
                  <option value="dragon-ball-fusion-world">Dragon Ball Super Fusion World</option>
                  <option value="union-arena">Union Arena</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-steel">Response time</span>
                <select
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  value={profileForm.responseTime}
                  onChange={(event) =>
                    updateProfileFormField("responseTime", event.target.value)
                  }
                >
                  <option value="< 15 min">&lt; 15 min</option>
                  <option value="~ 30 min">~ 30 min</option>
                  <option value="~ 1 hour">~ 1 hour</option>
                  <option value="Same day">Same day</option>
                </select>
              </label>

              <div className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-steel">Trusted meetup spots</span>
                <div className="flex flex-wrap gap-2">
                  {approvedMeetupSpots.map((spot) => {
                    const active = profileForm.trustedMeetupSpots.includes(spot.id);
                    return (
                      <button
                        key={spot.id}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          active
                            ? "bg-navy text-white"
                            : "border border-slate-200 bg-white text-steel"
                        }`}
                        type="button"
                        onClick={() =>
                          updateProfileFormField(
                            "trustedMeetupSpots",
                            active
                              ? profileForm.trustedMeetupSpots.filter((item) => item !== spot.id)
                              : [...profileForm.trustedMeetupSpots, spot.id],
                          )
                        }
                      >
                        {spot.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-steel">Meetup preferences</span>
                <textarea
                  className="min-h-24 w-full rounded-[22px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  value={profileForm.meetupPreferences}
                  onChange={(event) =>
                    updateProfileFormField("meetupPreferences", event.target.value)
                  }
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-steel">Seller bio</span>
                <textarea
                  className="min-h-28 w-full rounded-[22px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
                  value={profileForm.bio}
                  onChange={(event) =>
                    updateProfileFormField("bio", event.target.value)
                  }
                />
              </label>

              {profileError ? (
                <div className="sm:col-span-2 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {profileError}
                </div>
              ) : null}
              {profileMessage ? (
                <div className="sm:col-span-2 rounded-[18px] border border-navy/20 bg-navy/5 px-4 py-3 text-sm text-navy">
                  {profileMessage}
                </div>
              ) : null}

              <div className="sm:col-span-2">
                <button
                  className="rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white"
                  disabled={isSavingProfile}
                  type="submit"
                >
                  {isSavingProfile ? "Saving..." : "Save profile settings"}
                </button>
              </div>
            </form>
          </article>

          <article aria-labelledby="account-security-heading" className="surface-card p-6">
            <div className="flex items-center gap-3">
              <LockKeyhole className="text-navy" size={20} />
              <div>
                <p className="section-kicker">Security</p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink" id="account-security-heading">
                  Change password
                </h2>
              </div>
            </div>

            <form className="mt-6 grid gap-5" onSubmit={handlePasswordSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-steel">Current password</span>
                <input
                  required
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
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
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
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
                  className="w-full rounded-[22px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
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
                <div className="rounded-[18px] border border-navy/20 bg-navy/5 px-4 py-3 text-sm text-navy">
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
            <article aria-labelledby="account-appeal-heading" className="surface-card p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-rose-700" size={20} />
                <div>
                  <p className="section-kicker">Appeal</p>
                  <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink" id="account-appeal-heading">
                    Request review
                  </h2>
                </div>
              </div>

              <form className="mt-6 grid gap-5" onSubmit={handleAppealSubmit}>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-steel">Appeal message</span>
                  <textarea
                    required
                    className="min-h-28 w-full rounded-[22px] border border-slate-200 bg-[#f2f3f5] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
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
                  <div className="rounded-[18px] border border-navy/20 bg-navy/5 px-4 py-3 text-sm text-navy">
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

          <article aria-labelledby="account-delete-heading" className="surface-card p-6">
            <div className="flex items-center gap-3">
              <Trash2 className="text-rose-700" size={20} />
              <div>
                <p className="section-kicker">Delete account</p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink" id="account-delete-heading">
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
                    trackEvent("account_delete_requested", {
                      userId: currentUser?.id || null,
                    });
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
    </main>
  );
}


