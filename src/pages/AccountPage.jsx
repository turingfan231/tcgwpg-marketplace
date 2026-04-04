import {
  BarChart3,
  Bell,
  BookOpenText,
  Bug,
  Camera,
  CheckCircle2,
  ChevronRight,
  Eye,
  Flag,
  Gamepad2,
  Heart,
  HelpCircle,
  Lock,
  LogOut,
  MapPin,
  Shield,
  ShieldCheck,
  Star,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SeoHead from "../components/seo/SeoHead";
import UserAvatar from "../components/shared/UserAvatar";
import { neighborhoods } from "../data/mockData";
import { approvedMeetupSpots } from "../data/storefrontData";
import { useMarketplace } from "../hooks/useMarketplace";
import { m } from "../mobile/design";
import {
  BottomSheet,
  ChoicePill,
  EmptyBlock,
  MobileScreen,
  PrimaryButton,
  SecondaryButton,
  TextArea,
  TextField,
} from "../mobile/primitives";

const GAME_OPTIONS = ["Magic", "Pokemon", "One Piece", "Dragon Ball Super Fusion World", "Union Arena"];

const normalizePostalInput = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3);

const buildProfileForm = (user) => ({
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
});

function SettingsGroup({ title, children }) {
  return (
    <div className="mb-4 lg:mb-0">
      <p className="mb-1.5 px-4 text-[10px] uppercase tracking-[0.08em] lg:px-0 lg:text-[11px]" style={{ fontWeight: 600, color: "#3e3e46" }}>
        {title}
      </p>
      <div
        className="mx-4 overflow-hidden rounded-[14px] lg:mx-0 lg:rounded-[18px]"
        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}
      >
        {children}
      </div>
    </div>
  );
}

function SettingsRow({ badge, destructive, icon: Icon, iconColor, isLast, label, onClick, sublabel, value }) {
  return (
    <motion.button
      className="flex w-full items-center gap-3 px-3 py-[11px] text-left active:bg-white/[0.015]"
      style={{ borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.035)" }}
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      <div
        className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[9px]"
        style={{ background: destructive ? "rgba(248,113,113,0.08)" : `${iconColor}0d` }}
      >
        <Icon size={14} style={{ color: destructive ? "#f87171" : iconColor }} />
      </div>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-[13px]" style={{ fontWeight: 500, color: destructive ? "#f87171" : "#c0c0c8" }}>
          {label}
        </span>
        {sublabel ? (
          <span className="mt-[1px] block truncate text-[10px]" style={{ fontWeight: 400, color: "#3e3e46" }}>
            {sublabel}
          </span>
        ) : null}
      </div>
      {badge ? (
        <span
          className="shrink-0 rounded-md px-[6px] py-[2px] text-[9px]"
          style={{ fontWeight: 600, color: "#fbbf24", background: "rgba(251,191,36,0.1)" }}
        >
          {badge}
        </span>
      ) : null}
      <div className="flex shrink-0 items-center gap-1">
        {value ? <span className="text-[11px]" style={{ color: "#3e3e46" }}>{value}</span> : null}
        <ChevronRight size={13} style={{ color: "#2a2a32" }} />
      </div>
    </motion.button>
  );
}

function FollowerRow({ seller, onClick }) {
  return (
    <button
      className="flex w-full items-center gap-3 rounded-[16px] px-3 py-2 text-left"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}
      type="button"
      onClick={onClick}
    >
      <UserAvatar className="h-10 w-10 text-[12px]" user={seller} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] text-white" style={{ fontWeight: 700 }}>
          {seller.publicName || seller.name}
        </p>
        <p className="mt-0.5 text-[10px]" style={{ color: "#5e5e66" }}>
          {seller.neighborhood || "Winnipeg"}
        </p>
      </div>
      <ChevronRight size={13} style={{ color: "#2a2a32" }} />
    </button>
  );
}

export default function AccountPage() {
  const navigate = useNavigate();
  const {
    bugReportsForCurrentUser,
    changeCurrentUserPassword,
    collectionItems,
    currentUser,
    currentUserListings,
    deleteCurrentUserAccount,
    ensureWorkspaceDataLoaded,
    isAdmin,
    isSuspended,
    logout,
    sellers,
    submitSuspensionAppeal,
    unreadNotificationCount,
    updateCurrentUserProfile,
    wishlist,
  } = useMarketplace();

  const [profileForm, setProfileForm] = useState(() => buildProfileForm(currentUser));
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [appealBody, setAppealBody] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(currentUser?.avatarUrl || "");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [appealMessage, setAppealMessage] = useState("");
  const [appealError, setAppealError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [sheet, setSheet] = useState("");
  const lastSyncedAccountIdRef = useRef(currentUser?.id || "");

  const publicProfileHref = currentUser?.id ? `/seller/${currentUser.id}` : "/";

  useEffect(() => {
    void ensureWorkspaceDataLoaded();
  }, [ensureWorkspaceDataLoaded]);
  const joinedLabel = currentUser?.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString("en-CA", { month: "short", year: "numeric" })
    : "Marketplace member";
  const favoriteGamesLabel = profileForm.favoriteGames.length ? profileForm.favoriteGames.join(", ") : "Not set";
  const meetupSummary = profileForm.trustedMeetupSpots.length ? `${profileForm.trustedMeetupSpots.length} saved` : "Not set";
  const followerUsers = useMemo(
    () =>
      (Array.isArray(sellers) ? sellers : []).filter((seller) =>
        Array.isArray(seller.followedSellerIds) ? seller.followedSellerIds.includes(currentUser?.id) : false,
      ),
    [currentUser?.id, sellers],
  );
  const followerCount = followerUsers.length;

  useEffect(() => {
    const nextAccountId = currentUser?.id || "";
    if (nextAccountId === lastSyncedAccountIdRef.current) return;
    setProfileForm(buildProfileForm(currentUser));
    setAvatarFile(null);
    setAvatarPreviewUrl(currentUser?.avatarUrl || "");
    lastSyncedAccountIdRef.current = nextAccountId;
  }, [currentUser]);

  useEffect(
    () => () => {
      if (String(avatarPreviewUrl || "").startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    },
    [avatarPreviewUrl],
  );

  function updateProfile(field, value) {
    setProfileError("");
    setProfileMessage("");
    setProfileForm((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile() {
    setProfileError("");
    setProfileMessage("");
    setIsSavingProfile(true);
    const result = await updateCurrentUserProfile({
      ...profileForm,
      avatarFile,
      removeAvatar: !avatarFile && !avatarPreviewUrl,
    });
    setIsSavingProfile(false);
    if (!result?.ok) {
      setProfileError(result?.error || "Profile could not be updated.");
      return;
    }
    setProfileMessage(result.warning || "Account settings updated.");
    setAvatarFile(null);
    if (typeof result.avatarUrl === "string") setAvatarPreviewUrl(result.avatarUrl);
    setSheet("");
  }

  async function savePassword() {
    setPasswordError("");
    setPasswordMessage("");
    const result = await changeCurrentUserPassword(passwordForm);
    if (!result?.ok) {
      setPasswordError(result?.error || "Password could not be changed.");
      return;
    }
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordMessage("Password updated.");
    setSheet("");
  }

  async function saveAppeal() {
    setAppealError("");
    setAppealMessage("");
    const result = await submitSuspensionAppeal(appealBody);
    if (!result?.ok) {
      setAppealError(result?.error || "Appeal could not be submitted.");
      return;
    }
    setAppealBody("");
    setAppealMessage("Appeal sent to admin support.");
    setSheet("");
    if (result.threadId) navigate(`/inbox/${result.threadId}`);
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm("Delete this account permanently?");
    if (!confirmed) return;
    setDeleteError("");
    const result = await deleteCurrentUserAccount();
    if (!result?.ok) {
      setDeleteError(result?.error || "Account could not be deleted.");
      return;
    }
    navigate("/");
  }

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  if (!currentUser) {
    return (
      <MobileScreen>
        <SeoHead
          canonicalPath="/account"
          description="Manage your TCG WPG account settings, meetup details, and security preferences."
          title="Account"
          type="profile"
        />
        <div className="px-4 pt-[max(0.9rem,env(safe-area-inset-top))]">
          <h1 className="text-[24px] text-white" style={{ fontWeight: 700 }}>Account</h1>
        </div>
        <div className="px-4 pt-6">
          <EmptyBlock
            title="Sign in required"
            description="Log in to manage your seller profile, security, and marketplace preferences."
            action={<PrimaryButton onClick={() => navigate("/auth")}>Go to login</PrimaryButton>}
          />
        </div>
      </MobileScreen>
    );
  }

  return (
    <MobileScreen>
      <SeoHead
        canonicalPath="/account"
        description="Manage your TCG WPG account settings, meetup details, and security preferences."
        title="Account"
        type="profile"
      />

      <header className="relative overflow-hidden lg:hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -5%, rgba(220,38,38,0.1) 0%, transparent 50%), linear-gradient(180deg, #111114 0%, #0c0c0e 100%)",
          }}
        />
        <div className="relative z-10 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] lg:px-6 lg:pb-6 lg:pt-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              {avatarPreviewUrl ? (
                <img
                  alt="Profile"
                  className="h-[50px] w-[50px] rounded-[16px] object-cover"
                  src={avatarPreviewUrl}
                  style={{ boxShadow: `0 4px 16px ${m.redGlow}` }}
                />
              ) : (
                <div
                  className="flex h-[50px] w-[50px] items-center justify-center rounded-[16px] text-[19px] text-white"
                  style={{ background: m.redGradient, boxShadow: `0 4px 16px ${m.redGlow}`, fontWeight: 700 }}
                >
                  {String(currentUser?.publicName || currentUser?.name || currentUser?.username || "U").charAt(0).toUpperCase()}
                </div>
              )}
              {currentUser?.verified ? (
                <div
                  className="absolute -bottom-[2px] -right-[2px] flex h-[17px] w-[17px] items-center justify-center rounded-full"
                  style={{ background: "#0c0c0e", border: "2px solid #0c0c0e" }}
                >
                  <CheckCircle2 size={13} fill="#3b82f6" style={{ color: "#fff" }} />
                </div>
              ) : null}
              <label
                className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full"
                style={{ background: "rgba(30,30,36,0.9)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <Camera size={8} style={{ color: "#78787f" }} />
                <input
                  accept="image/*"
                  className="hidden"
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (String(avatarPreviewUrl || "").startsWith("blob:")) URL.revokeObjectURL(avatarPreviewUrl);
                    setAvatarFile(file);
                    setAvatarPreviewUrl(URL.createObjectURL(file));
                  }}
                />
              </label>
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[17px] text-white" style={{ fontWeight: 700, lineHeight: 1.15 }}>
                {currentUser?.publicName || currentUser?.name || currentUser?.username || "Account"}
              </h1>
              <div className="mt-[2px] flex items-center gap-1">
                <MapPin size={9} style={{ color: "#4e4e56" }} />
                <span className="text-[11px]" style={{ color: "#5e5e66" }}>{currentUser?.neighborhood || "Winnipeg, MB"}</span>
                <span className="text-[10px]" style={{ color: "#2a2a32" }}>/</span>
                <span className="text-[11px]" style={{ color: "#4e4e56" }}>Since {joinedLabel}</span>
              </div>
              <div className="mt-[5px] flex items-center gap-1.5">
                {(currentUser?.overallRating || currentUser?.rating) ? (
                  <>
                    <Star size={10} fill="#fbbf24" style={{ color: "#fbbf24" }} />
                    <span className="text-[11px]" style={{ color: "#d0d0d4", fontWeight: 600 }}>
                      {Number(currentUser?.overallRating || currentUser?.rating).toFixed(1)}
                    </span>
                  </>
                ) : null}
                <span className="text-[10px]" style={{ color: "#5e5e66" }}>{currentUserListings.length} active</span>
                <span className="text-[10px]" style={{ color: "#2a2a32" }}>/</span>
                <span className="text-[10px]" style={{ color: "#5e5e66" }}>{wishlist.length} saved</span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex gap-1.5">
            {currentUser?.verified ? (
              <div className="flex items-center gap-1 rounded-lg px-2 py-[4px]" style={{ background: "#60a5fa08", border: "1px solid #60a5fa0d" }}>
                <Shield size={9} style={{ color: "#60a5fa" }} />
                <span className="text-[9px]" style={{ color: "#60a5fa", fontWeight: 600 }}>Verified</span>
              </div>
            ) : null}
            <div className="flex items-center gap-1 rounded-lg px-2 py-[4px]" style={{ background: "#6ee7b708", border: "1px solid #6ee7b70d" }}>
              <Zap size={9} style={{ color: "#6ee7b7" }} />
              <span className="text-[9px]" style={{ color: "#6ee7b7", fontWeight: 600 }}>{profileForm.responseTime || "Fast responder"}</span>
            </div>
            {isAdmin ? (
              <div className="flex items-center gap-1 rounded-lg px-2 py-[4px]" style={{ background: "#fbbf2408", border: "1px solid #fbbf240d" }}>
                <ShieldCheck size={9} style={{ color: "#fbbf24" }} />
                <span className="text-[9px]" style={{ color: "#fbbf24", fontWeight: 600 }}>Admin</span>
              </div>
            ) : null}
          </div>

          <div className="mt-3.5 flex gap-2 lg:flex-wrap">
            <motion.button
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-[9px] lg:min-w-[220px] lg:flex-none lg:px-5"
              style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.1), rgba(185,28,28,0.06))", border: "1px solid rgba(239,68,68,0.1)" }}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => navigate("/dashboard")}
            >
              <BarChart3 size={13} style={{ color: "#f87171" }} />
              <span className="text-[12px]" style={{ color: "#fca5a5", fontWeight: 600 }}>Seller Dashboard</span>
            </motion.button>
            <motion.button
              className="flex items-center justify-center gap-1.5 rounded-xl px-4 py-[9px] lg:min-w-[180px]"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => navigate(publicProfileHref)}
            >
              <Eye size={13} style={{ color: "#5e5e66" }} />
              <span className="text-[12px]" style={{ color: "#7a7a82", fontWeight: 500 }}>View Profile</span>
            </motion.button>
          </div>
        </div>
        <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05) 50%, transparent)" }} />
      </header>

      <main className="hidden min-h-0 flex-1 overflow-y-auto lg:block">
        <div className="mx-auto w-full max-w-[1540px] px-8 py-8">
          <div className="min-w-0 space-y-6">
            {(profileMessage || profileError || passwordMessage || passwordError || appealMessage || appealError || deleteError) ? (
              <div className="grid gap-3">
                {profileMessage ? <div className="rounded-[18px] px-4 py-3 text-[12px]" style={{ background: "rgba(52,211,153,0.08)", color: m.success, fontWeight: 700 }}>{profileMessage}</div> : null}
                {profileError ? <div className="rounded-[18px] px-4 py-3 text-[12px]" style={{ background: "rgba(248,113,113,0.08)", color: m.danger, fontWeight: 700 }}>{profileError}</div> : null}
                {passwordMessage ? <div className="rounded-[18px] px-4 py-3 text-[12px]" style={{ background: "rgba(52,211,153,0.08)", color: m.success, fontWeight: 700 }}>{passwordMessage}</div> : null}
                {passwordError ? <div className="rounded-[18px] px-4 py-3 text-[12px]" style={{ background: "rgba(248,113,113,0.08)", color: m.danger, fontWeight: 700 }}>{passwordError}</div> : null}
                {appealMessage ? <div className="rounded-[18px] px-4 py-3 text-[12px]" style={{ background: "rgba(52,211,153,0.08)", color: m.success, fontWeight: 700 }}>{appealMessage}</div> : null}
                {appealError ? <div className="rounded-[18px] px-4 py-3 text-[12px]" style={{ background: "rgba(248,113,113,0.08)", color: m.danger, fontWeight: 700 }}>{appealError}</div> : null}
                {deleteError ? <div className="rounded-[18px] px-4 py-3 text-[12px]" style={{ background: "rgba(248,113,113,0.08)", color: m.danger, fontWeight: 700 }}>{deleteError}</div> : null}
              </div>
            ) : null}

            <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.35fr)_420px]">
              <div
                className="overflow-hidden rounded-[30px] border p-6"
                style={{
                  background:
                    "radial-gradient(circle at top right, rgba(239,68,68,0.12) 0%, transparent 28%), linear-gradient(180deg, rgba(20,20,24,0.96), rgba(12,12,16,0.98))",
                  borderColor: "rgba(255,255,255,0.05)",
                }}
              >
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-center">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      {avatarPreviewUrl ? (
                        <img
                          alt="Profile"
                          className="h-[82px] w-[82px] rounded-[24px] object-cover"
                          src={avatarPreviewUrl}
                          style={{ boxShadow: `0 10px 28px ${m.redGlow}` }}
                        />
                      ) : (
                        <div
                          className="flex h-[82px] w-[82px] items-center justify-center rounded-[24px] text-[30px] text-white"
                          style={{ background: m.redGradient, boxShadow: `0 10px 28px ${m.redGlow}`, fontWeight: 700 }}
                        >
                          {String(currentUser?.publicName || currentUser?.name || currentUser?.username || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      {currentUser?.verified ? (
                        <div
                          className="absolute -bottom-[4px] -right-[4px] flex h-[24px] w-[24px] items-center justify-center rounded-full"
                          style={{ background: "#0c0c0e", border: "2px solid #0c0c0e" }}
                        >
                          <CheckCircle2 size={16} fill="#3b82f6" style={{ color: "#fff" }} />
                        </div>
                      ) : null}
                    </div>
                    <div className="min-w-0 pt-2">
                      <p className="text-[30px] text-white" style={{ fontWeight: 800, lineHeight: 1.05 }}>
                        {currentUser?.publicName || currentUser?.name || currentUser?.username || "Account"}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <MapPin size={12} style={{ color: "#5e5e66" }} />
                        <span className="text-[12px]" style={{ color: "#8a8a92" }}>{currentUser?.neighborhood || "Winnipeg, MB"}</span>
                        <span className="text-[12px]" style={{ color: "#44444c" }}>•</span>
                        <span className="text-[12px]" style={{ color: "#5e5e66" }}>Since {joinedLabel}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {currentUser?.verified ? (
                          <div className="flex items-center gap-1 rounded-lg px-2 py-[5px]" style={{ background: "#60a5fa08", border: "1px solid #60a5fa0d" }}>
                            <Shield size={10} style={{ color: "#60a5fa" }} />
                            <span className="text-[10px]" style={{ color: "#60a5fa", fontWeight: 700 }}>Verified</span>
                          </div>
                        ) : null}
                        <div className="flex items-center gap-1 rounded-lg px-2 py-[5px]" style={{ background: "#6ee7b708", border: "1px solid #6ee7b70d" }}>
                          <Zap size={10} style={{ color: "#6ee7b7" }} />
                          <span className="text-[10px]" style={{ color: "#6ee7b7", fontWeight: 700 }}>{profileForm.responseTime || "Fast responder"}</span>
                        </div>
                        {isAdmin ? (
                          <div className="flex items-center gap-1 rounded-lg px-2 py-[5px]" style={{ background: "#fbbf2408", border: "1px solid #fbbf240d" }}>
                            <ShieldCheck size={10} style={{ color: "#fbbf24" }} />
                            <span className="text-[10px]" style={{ color: "#fbbf24", fontWeight: 700 }}>Admin</span>
                          </div>
                        ) : null}
                      </div>
                      <p className="mt-4 max-w-[42rem] text-[13px]" style={{ color: "#7a7a82", lineHeight: 1.6 }}>
                        Manage your marketplace identity, seller preferences, security, and account tools from one desktop workspace.
                      </p>
                    </div>
                  </div>
                  <div className="grid shrink-0 gap-2 xl:self-center">
                    <PrimaryButton className="!h-[48px] !rounded-[16px] !px-5" onClick={() => navigate("/dashboard")}>
                      Seller Dashboard
                    </PrimaryButton>
                    <SecondaryButton className="!h-[48px] !rounded-[16px] !px-5" onClick={() => navigate(publicProfileHref)}>
                      View Public Profile
                    </SecondaryButton>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex min-h-[184px] flex-col rounded-[24px] border px-4 py-4" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.05)" }}>
                  <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "#5e5e66", fontWeight: 700 }}>Active</p>
                  <p className="mt-auto text-[34px] text-white" style={{ fontWeight: 800 }}>{currentUserListings.length}</p>
                  <p className="mt-2 text-[11px]" style={{ color: "#6a6a72", lineHeight: 1.45 }}>Listings currently visible in the marketplace.</p>
                </div>
                <div className="flex min-h-[184px] flex-col rounded-[24px] border px-4 py-4" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.05)" }}>
                  <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "#5e5e66", fontWeight: 700 }}>Saved</p>
                  <p className="mt-auto text-[34px] text-white" style={{ fontWeight: 800 }}>{wishlist.length}</p>
                  <p className="mt-2 text-[11px]" style={{ color: "#6a6a72", lineHeight: 1.45 }}>Cards you are tracking from around Winnipeg.</p>
                </div>
                <button
                  className="flex min-h-[184px] flex-col rounded-[24px] border px-4 py-4 text-left transition-colors hover:bg-white/[0.03]"
                  style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.05)" }}
                  type="button"
                  onClick={() => setSheet("followers")}
                >
                  <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "#5e5e66", fontWeight: 700 }}>Followers</p>
                  <p className="mt-auto text-[34px] text-white" style={{ fontWeight: 800 }}>{followerCount}</p>
                  <p className="mt-2 text-[11px]" style={{ color: "#6a6a72", lineHeight: 1.45 }}>People following your public seller profile.</p>
                </button>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <div className="space-y-6">
                <SettingsGroup title="Overview">
                  <SettingsRow icon={Bell} iconColor="#f87171" label="Notification Center" sublabel="Messages, offers, reminders, and updates" value={String(unreadNotificationCount)} onClick={() => navigate("/notifications")} />
                  <SettingsRow icon={Users} iconColor="#6ee7b7" label="Followers" sublabel="See who follows your seller profile" value={String(followerCount)} onClick={() => setSheet("followers")} />
                  <SettingsRow icon={Eye} iconColor="#a78bfa" isLast label="Public Seller Profile" sublabel="See how buyers view your profile" onClick={() => navigate(publicProfileHref)} />
                </SettingsGroup>

                <SettingsGroup title="Meetup">
                  <SettingsRow icon={MapPin} iconColor="#f87171" label="Trusted Meetup Spots" sublabel="Manage your preferred public meetup locations" value={meetupSummary} onClick={() => setSheet("preferences")} />
                  <SettingsRow icon={MapPin} iconColor="#60a5fa" label="Meetup Notes" sublabel={profileForm.meetupPreferences || "No meetup notes added"} isLast onClick={() => setSheet("preferences")} />
                </SettingsGroup>

                <SettingsGroup title="Privacy & Security">
                  <SettingsRow icon={Lock} iconColor="#a78bfa" label="Password & Security" sublabel="Change your password" onClick={() => setSheet("security")} />
                  {isAdmin ? (
                    <SettingsRow badge="Admin" icon={ShieldCheck} iconColor="#fbbf24" label="Admin Panel" sublabel="Moderation and controls" isLast onClick={() => navigate("/admin")} />
                  ) : (
                    <SettingsRow icon={Flag} iconColor="#fb7185" label="Suspension Appeal" sublabel={isSuspended ? "Explain the situation to admin support" : "Appeal options unavailable"} value={isSuspended ? undefined : "Locked"} isLast onClick={() => { if (isSuspended) setSheet("appeal"); }} />
                  )}
                </SettingsGroup>
              </div>

              <div className="space-y-6">
                <SettingsGroup title="Marketplace">
                  <SettingsRow icon={Heart} iconColor="#f87171" label="Wishlist" sublabel="Saved cards and watchlist" value={String(wishlist.length)} onClick={() => navigate("/wishlist")} />
                  <SettingsRow icon={BookOpenText} iconColor="#60a5fa" label="Collection" sublabel="Your binder and collection value" value={String(collectionItems.length)} onClick={() => navigate("/collection")} />
                  <SettingsRow icon={BarChart3} iconColor="#ef4444" label="Seller Dashboard" sublabel="Listings, drafts, and offers" value={String(currentUserListings.length)} isLast onClick={() => navigate("/dashboard")} />
                </SettingsGroup>

                <SettingsGroup title="Seller">
                  <SettingsRow icon={Gamepad2} iconColor="#fbbf24" label="Favorite Games" sublabel={favoriteGamesLabel} onClick={() => setSheet("preferences")} />
                  <SettingsRow icon={Shield} iconColor="#60a5fa" label="Profile Details" sublabel={`${profileForm.username || "No username"} / ${profileForm.neighborhood || "Winnipeg"}`} onClick={() => setSheet("profile")} />
                  <SettingsRow icon={Star} iconColor="#6ee7b7" label="Default Listing Game" sublabel={profileForm.defaultListingGame || "Not set"} isLast onClick={() => setSheet("preferences")} />
                </SettingsGroup>
              </div>

              <div className="space-y-6">
                <SettingsGroup title="Support">
                  {!isAdmin ? (
                    <SettingsRow badge={bugReportsForCurrentUser.length ? String(bugReportsForCurrentUser.length) : undefined} icon={Bug} iconColor="#fb7185" label="Bug Reports" sublabel="Beta feedback and QA reports" onClick={() => navigate("/beta/bugs")} />
                  ) : null}
                  <SettingsRow icon={HelpCircle} iconColor="#60a5fa" label="Help & Support" sublabel="Open a support conversation in inbox" onClick={() => navigate("/inbox")} />
                  <SettingsRow destructive icon={LogOut} iconColor="#f87171" label="Log Out" onClick={() => void handleLogout()} />
                  <SettingsRow destructive icon={Trash2} iconColor="#f87171" isLast label="Delete Account" sublabel="Remove your marketplace profile and access" onClick={() => void handleDeleteAccount()} />
                </SettingsGroup>
              </div>
            </div>
          </div>
        </div>
      </main>

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-4 lg:hidden">
        <div className="lg:mx-auto lg:w-full lg:max-w-[1320px]">
        <div className="px-4 lg:px-0">
        {profileMessage ? <div className="mb-3 rounded-[14px] px-3 py-2 text-[11px] lg:rounded-[16px]" style={{ background: "rgba(52,211,153,0.08)", color: m.success, fontWeight: 600 }}>{profileMessage}</div> : null}
        {profileError ? <div className="mb-3 rounded-[14px] px-3 py-2 text-[11px] lg:rounded-[16px]" style={{ background: "rgba(248,113,113,0.08)", color: m.danger, fontWeight: 600 }}>{profileError}</div> : null}
        {passwordMessage ? <div className="mb-3 rounded-[14px] px-3 py-2 text-[11px] lg:rounded-[16px]" style={{ background: "rgba(52,211,153,0.08)", color: m.success, fontWeight: 600 }}>{passwordMessage}</div> : null}
        {passwordError ? <div className="mb-3 rounded-[14px] px-3 py-2 text-[11px] lg:rounded-[16px]" style={{ background: "rgba(248,113,113,0.08)", color: m.danger, fontWeight: 600 }}>{passwordError}</div> : null}
        {appealMessage ? <div className="mb-3 rounded-[14px] px-3 py-2 text-[11px] lg:rounded-[16px]" style={{ background: "rgba(52,211,153,0.08)", color: m.success, fontWeight: 600 }}>{appealMessage}</div> : null}
        {appealError ? <div className="mb-3 rounded-[14px] px-3 py-2 text-[11px] lg:rounded-[16px]" style={{ background: "rgba(248,113,113,0.08)", color: m.danger, fontWeight: 600 }}>{appealError}</div> : null}
        {deleteError ? <div className="mb-3 rounded-[14px] px-3 py-2 text-[11px] lg:rounded-[16px]" style={{ background: "rgba(248,113,113,0.08)", color: m.danger, fontWeight: 600 }}>{deleteError}</div> : null}
        </div>

        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:gap-y-6">
        <SettingsGroup title="Notifications">
          <SettingsRow icon={Bell} iconColor="#f87171" label="Notification Center" sublabel="Messages, offers, reminders, and updates" value={String(unreadNotificationCount)} isLast onClick={() => navigate("/notifications")} />
        </SettingsGroup>

        <SettingsGroup title="Marketplace">
          <SettingsRow icon={Heart} iconColor="#f87171" label="Wishlist" sublabel="Saved cards and watchlist" value={String(wishlist.length)} onClick={() => navigate("/wishlist")} />
          <SettingsRow icon={BookOpenText} iconColor="#60a5fa" label="Collection" sublabel="Your binder and collection value" value={String(collectionItems.length)} onClick={() => navigate("/collection")} />
          <SettingsRow icon={BarChart3} iconColor="#ef4444" label="Seller Dashboard" sublabel="Listings, drafts, and offers" value={String(currentUserListings.length)} onClick={() => navigate("/dashboard")} />
          <SettingsRow icon={Users} iconColor="#6ee7b7" label="Followers" sublabel="See who follows your seller profile" value={String(followerCount)} onClick={() => setSheet("followers")} />
          <SettingsRow icon={Eye} iconColor="#a78bfa" isLast label="Public Seller Profile" sublabel="See how buyers view your profile" onClick={() => navigate(publicProfileHref)} />
        </SettingsGroup>

        <SettingsGroup title="Meetup">
          <SettingsRow icon={MapPin} iconColor="#f87171" label="Trusted Meetup Spots" sublabel="Manage your preferred public meetup locations" value={meetupSummary} onClick={() => setSheet("preferences")} />
          <SettingsRow icon={MapPin} iconColor="#60a5fa" label="Meetup Notes" sublabel={profileForm.meetupPreferences || "No meetup notes added"} isLast onClick={() => setSheet("preferences")} />
        </SettingsGroup>

        <SettingsGroup title="Seller">
          <SettingsRow icon={Gamepad2} iconColor="#fbbf24" label="Favorite Games" sublabel={favoriteGamesLabel} onClick={() => setSheet("preferences")} />
          <SettingsRow icon={Shield} iconColor="#60a5fa" label="Profile Details" sublabel={`${profileForm.username || "No username"} / ${profileForm.neighborhood || "Winnipeg"}`} onClick={() => setSheet("profile")} />
          <SettingsRow icon={Star} iconColor="#6ee7b7" label="Default Listing Game" sublabel={profileForm.defaultListingGame || "Not set"} isLast onClick={() => setSheet("preferences")} />
        </SettingsGroup>

        <SettingsGroup title="Privacy & Security">
          <SettingsRow icon={Lock} iconColor="#a78bfa" label="Password & Security" sublabel="Change your password" onClick={() => setSheet("security")} />
          {isAdmin ? (
            <SettingsRow badge="Admin" icon={ShieldCheck} iconColor="#fbbf24" label="Admin Panel" sublabel="Moderation and controls" isLast onClick={() => navigate("/admin")} />
          ) : (
            <SettingsRow icon={Flag} iconColor="#fb7185" label="Suspension Appeal" sublabel={isSuspended ? "Explain the situation to admin support" : "Appeal options unavailable"} value={isSuspended ? undefined : "Locked"} isLast onClick={() => { if (isSuspended) setSheet("appeal"); }} />
          )}
        </SettingsGroup>

        <SettingsGroup title="Support">
          {!isAdmin ? (
            <SettingsRow badge={bugReportsForCurrentUser.length ? String(bugReportsForCurrentUser.length) : undefined} icon={Bug} iconColor="#fb7185" label="Bug Reports" sublabel="Beta feedback and QA reports" onClick={() => navigate("/beta/bugs")} />
          ) : null}
          <SettingsRow icon={HelpCircle} iconColor="#60a5fa" label="Help & Support" sublabel="Open a support conversation in inbox" onClick={() => navigate("/inbox")} />
          <SettingsRow destructive icon={LogOut} iconColor="#f87171" label="Log Out" onClick={() => void handleLogout()} />
          <SettingsRow destructive icon={Trash2} iconColor="#f87171" isLast label="Delete Account" sublabel="Remove your marketplace profile and access" onClick={() => void handleDeleteAccount()} />
        </SettingsGroup>
        </div>
        </div>

        <div className="pb-4 pt-6 text-center lg:pb-8">
          <p className="text-[10px]" style={{ color: "#252530", fontWeight: 400 }}>TCG WPG / Winnipeg&apos;s Trading Card Marketplace</p>
          <p className="mt-[2px] text-[9px]" style={{ color: "#1e1e28", fontWeight: 400 }}>Local mobile rebuild / Manitoba</p>
        </div>
      </main>

      <BottomSheet open={sheet === "profile"} onClose={() => setSheet("")}>
        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <p className="text-[14px] text-white" style={{ fontWeight: 700 }}>Profile details</p>
          <div className="mt-4 grid gap-3">
            <TextField value={profileForm.username} onChange={(value) => updateProfile("username", value)} placeholder="Username" />
            <div className="grid grid-cols-[1fr_5.5rem] gap-3">
              <select
                className="h-[42px] w-full rounded-[14px] border px-3 text-[12.5px] outline-none"
                style={{ background: m.surfaceStrong, borderColor: m.border, color: m.text, fontWeight: 500 }}
                value={profileForm.neighborhood}
                onChange={(event) => updateProfile("neighborhood", event.target.value)}
              >
                {neighborhoods.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <TextField value={profileForm.postalCode} onChange={(value) => updateProfile("postalCode", normalizePostalInput(value))} placeholder="R3C" />
            </div>
            <TextArea value={profileForm.bio} onChange={(value) => updateProfile("bio", value)} placeholder="Short seller bio..." rows={4} />
            <div className="grid grid-cols-2 gap-2">
              <SecondaryButton onClick={() => setSheet("")}>Cancel</SecondaryButton>
              <PrimaryButton disabled={isSavingProfile} onClick={() => void saveProfile()}>{isSavingProfile ? "Saving..." : "Save profile"}</PrimaryButton>
            </div>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === "preferences"} onClose={() => setSheet("")}>
        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <p className="text-[14px] text-white" style={{ fontWeight: 700 }}>Seller preferences</p>
          <div className="mt-4 grid gap-3">
            <select
              className="h-[42px] w-full rounded-[14px] border px-3 text-[12.5px] outline-none"
              style={{ background: m.surfaceStrong, borderColor: m.border, color: m.text, fontWeight: 500 }}
              value={profileForm.defaultListingGame}
              onChange={(event) => updateProfile("defaultListingGame", event.target.value)}
            >
              {GAME_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <TextField value={profileForm.responseTime} onChange={(value) => updateProfile("responseTime", value)} placeholder="Response time" />
            <TextArea value={profileForm.meetupPreferences} onChange={(value) => updateProfile("meetupPreferences", value)} placeholder="Meetup preferences..." rows={3} />
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-[0.12em]" style={{ color: m.textTertiary, fontWeight: 700 }}>Favorite games</p>
              <div className="flex flex-wrap gap-2">
                {GAME_OPTIONS.map((game) => (
                  <ChoicePill
                    key={game}
                    active={profileForm.favoriteGames.includes(game)}
                    onClick={() =>
                      updateProfile(
                        "favoriteGames",
                        profileForm.favoriteGames.includes(game)
                          ? profileForm.favoriteGames.filter((value) => value !== game)
                          : [...profileForm.favoriteGames, game],
                      )
                    }
                  >
                    {game}
                  </ChoicePill>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-[0.12em]" style={{ color: m.textTertiary, fontWeight: 700 }}>Trusted meetup spots</p>
              <div className="flex flex-wrap gap-2">
                {approvedMeetupSpots.slice(0, 8).map((spot) => (
                  <ChoicePill
                    key={spot.id}
                    active={profileForm.trustedMeetupSpots.includes(spot.id)}
                    onClick={() =>
                      updateProfile(
                        "trustedMeetupSpots",
                        profileForm.trustedMeetupSpots.includes(spot.id)
                          ? profileForm.trustedMeetupSpots.filter((value) => value !== spot.id)
                          : [...profileForm.trustedMeetupSpots, spot.id],
                      )
                    }
                  >
                    {spot.label}
                  </ChoicePill>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SecondaryButton onClick={() => setSheet("")}>Cancel</SecondaryButton>
              <PrimaryButton disabled={isSavingProfile} onClick={() => void saveProfile()}>{isSavingProfile ? "Saving..." : "Save preferences"}</PrimaryButton>
            </div>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === "followers"} onClose={() => setSheet("")}>
        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <p className="text-[14px] text-white" style={{ fontWeight: 700 }}>Followers</p>
          <p className="mt-1 text-[10px]" style={{ color: m.textSecondary }}>
            People following your seller profile.
          </p>
          <div className="mt-4 grid gap-2">
            {followerUsers.length ? (
              followerUsers.map((seller) => (
                <FollowerRow key={`account-follower-${seller.id}`} seller={seller} onClick={() => navigate(`/seller/${seller.id}`)} />
              ))
            ) : (
              <p className="text-[11px]" style={{ color: m.textSecondary }}>
                No followers yet.
              </p>
            )}
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === "security"} onClose={() => setSheet("")}>
        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <p className="text-[14px] text-white" style={{ fontWeight: 700 }}>Password & security</p>
          <div className="mt-4 grid gap-3">
            <TextField value={passwordForm.currentPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))} placeholder="Current password" type="password" />
            <TextField value={passwordForm.newPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))} placeholder="New password" type="password" />
            <TextField value={passwordForm.confirmPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))} placeholder="Confirm new password" type="password" />
            <div className="grid grid-cols-2 gap-2">
              <SecondaryButton onClick={() => setSheet("")}>Cancel</SecondaryButton>
              <PrimaryButton onClick={() => void savePassword()}>Update password</PrimaryButton>
            </div>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === "appeal"} onClose={() => setSheet("")}>
        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <p className="text-[14px] text-white" style={{ fontWeight: 700 }}>Suspension appeal</p>
          <p className="mt-1 text-[11px]" style={{ color: m.textSecondary }}>Explain the situation and we will send it to admin support.</p>
          <div className="mt-4 grid gap-3">
            <TextArea value={appealBody} onChange={setAppealBody} placeholder="Describe what happened and any supporting context..." rows={5} />
            <div className="grid grid-cols-2 gap-2">
              <SecondaryButton onClick={() => setSheet("")}>Cancel</SecondaryButton>
              <PrimaryButton onClick={() => void saveAppeal()}>Submit appeal</PrimaryButton>
            </div>
          </div>
        </div>
      </BottomSheet>
    </MobileScreen>
  );
}
