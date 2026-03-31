export function normalizeDraftCollection(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (value && Array.isArray(value.drafts)) {
    return value.drafts.filter(Boolean);
  }

  if (value && typeof value === "object" && Object.keys(value).length) {
    return [value];
  }

  return [];
}

export function buildNextDraftState({
  drafts = [],
  payload = {},
  now = new Date().toISOString(),
  maxDrafts = 12,
}) {
  const nextDraft = {
    ...payload,
    id: payload.id || `draft-${Date.now()}`,
    name: payload.name || payload.title || `${payload.game || "Listing"} draft`,
    updatedAt: now,
  };

  const nextDrafts = [
    nextDraft,
    ...drafts.filter((draft) => draft?.id !== nextDraft.id),
  ].slice(0, maxDrafts);

  return {
    draft: nextDraft,
    drafts: nextDrafts,
    activeDraftId: nextDraft.id,
  };
}

export function buildClearedDraftState({
  drafts = [],
  activeDraftId = null,
  draftId = null,
}) {
  const nextDrafts = drafts.filter((draft) => draft?.id !== draftId);
  const nextActiveDraftId =
    draftId === activeDraftId ? nextDrafts[0]?.id || null : activeDraftId;

  return {
    drafts: nextDrafts,
    activeDraftId: nextActiveDraftId,
  };
}

export function sortListingDrafts(drafts = []) {
  return [...drafts].sort(
    (left, right) =>
      new Date(right?.updatedAt || 0).getTime() - new Date(left?.updatedAt || 0).getTime(),
  );
}

export function resolveActiveDraft(drafts = [], activeDraftId = null) {
  return activeDraftId
    ? drafts.find((draft) => draft?.id === activeDraftId) || null
    : null;
}
