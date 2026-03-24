import { useMemo, useState } from "react";
import { neighborhoods } from "../../data/mockData";
import { approvedMeetupSpots } from "../../data/storefrontData";
import { useMarketplace } from "../../hooks/useMarketplace";
import ModalShell from "../ui/ModalShell";

function normalizePostalInput(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);
}

export default function OnboardingModal({ onClose }) {
  const { currentUser, updateCurrentUserProfile } = useMarketplace();
  const [form, setForm] = useState(() => ({
    username: currentUser?.username || "",
    defaultListingGame: currentUser?.defaultListingGame || "Pokemon",
    neighborhood: currentUser?.neighborhood || neighborhoods[1],
    postalCode: normalizePostalInput(currentUser?.postalCode || ""),
    trustedMeetupSpots: currentUser?.trustedMeetupSpots || [],
    meetupPreferences: currentUser?.meetupPreferences || "",
    favoriteGames: currentUser?.favoriteGames?.length
      ? currentUser.favoriteGames
      : [currentUser?.defaultListingGame || "Pokemon"],
  }));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = useMemo(
    () =>
      Boolean(
        String(form.username || "").trim() &&
          String(form.defaultListingGame || "").trim() &&
          String(form.neighborhood || "").trim() &&
          String(form.postalCode || "").trim().length === 3,
      ),
    [form],
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const result = await updateCurrentUserProfile({
      ...form,
      onboardingComplete: true,
    });

    setSaving(false);

    if (!result?.ok) {
      setError(result?.error || "Could not save onboarding details.");
      return;
    }

    setMessage("Profile setup saved.");
    window.setTimeout(() => onClose(), 320);
  }

  return (
    <ModalShell
      subtitle="Set your default game, meetup style, and local area before you start using the marketplace."
      title="Finish account setup"
      wide
      onClose={onClose}
    >
      <form className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-steel">Username</span>
          <input
            required
            maxLength={24}
            className="w-full rounded-[20px] border border-slate-200 bg-[#edf3f7] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
            value={form.username}
            onChange={(event) =>
              setForm((current) => ({ ...current, username: event.target.value }))
            }
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-steel">Default listing game</span>
          <select
            className="w-full rounded-[20px] border border-slate-200 bg-[#edf3f7] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
            value={form.defaultListingGame}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                defaultListingGame: event.target.value,
                favoriteGames: current.favoriteGames.includes(event.target.value)
                  ? current.favoriteGames
                  : [event.target.value, ...current.favoriteGames].slice(0, 3),
              }))
            }
          >
            <option value="Pokemon">Pokemon</option>
            <option value="Magic">Magic</option>
            <option value="One Piece">One Piece</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-steel">Neighborhood</span>
          <select
            className="w-full rounded-[20px] border border-slate-200 bg-[#edf3f7] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
            value={form.neighborhood}
            onChange={(event) =>
              setForm((current) => ({ ...current, neighborhood: event.target.value }))
            }
          >
            {neighborhoods.slice(1).map((neighborhood) => (
              <option key={neighborhood}>{neighborhood}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-steel">Postal prefix</span>
          <input
            maxLength={3}
            className="w-full rounded-[20px] border border-slate-200 bg-[#edf3f7] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
            placeholder="R2P"
            value={form.postalCode}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                postalCode: normalizePostalInput(event.target.value),
              }))
            }
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-2 block text-sm font-semibold text-steel">Approved meetup spots</span>
          <div className="flex flex-wrap gap-2">
            {approvedMeetupSpots.map((spot) => {
              const active = form.trustedMeetupSpots.includes(spot.id);
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
                    setForm((current) => ({
                      ...current,
                      trustedMeetupSpots: active
                        ? current.trustedMeetupSpots.filter((item) => item !== spot.id)
                        : [...current.trustedMeetupSpots, spot.id],
                    }))
                  }
                >
                  {spot.label}
                </button>
              );
            })}
          </div>
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-2 block text-sm font-semibold text-steel">Meetup preference</span>
          <textarea
            className="min-h-28 w-full rounded-[20px] border border-slate-200 bg-[#edf3f7] px-4 py-3 outline-none transition focus:border-navy focus:bg-white"
            placeholder="Add anything useful about timing, stores, or how you like to meet."
            value={form.meetupPreferences}
            onChange={(event) =>
              setForm((current) => ({ ...current, meetupPreferences: event.target.value }))
            }
          />
        </label>

        {error ? (
          <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:col-span-2">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 sm:col-span-2">
            {message}
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3 sm:col-span-2">
          <button
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-steel"
            type="button"
            onClick={onClose}
          >
            Later
          </button>
          <button
            className="rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={!canSubmit || saving}
            type="submit"
          >
            {saving ? "Saving..." : "Save and continue"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
