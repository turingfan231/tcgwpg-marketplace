import test from "node:test";
import assert from "node:assert/strict";
import {
  buildClearedDraftState,
  buildNextDraftState,
  normalizeDraftCollection,
  resolveActiveDraft,
  sortListingDrafts,
} from "../../src/lib/listingDrafts.js";

test("normalizeDraftCollection supports array, payload wrapper, and legacy object values", () => {
  assert.deepEqual(normalizeDraftCollection([{ id: "a" }, null]), [{ id: "a" }]);
  assert.deepEqual(normalizeDraftCollection({ drafts: [{ id: "b" }, undefined] }), [{ id: "b" }]);
  assert.deepEqual(normalizeDraftCollection({ id: "legacy-1", title: "Legacy draft" }), [
    { id: "legacy-1", title: "Legacy draft" },
  ]);
  assert.deepEqual(normalizeDraftCollection(null), []);
});

test("buildNextDraftState upserts the active draft, stamps updatedAt, and caps collection size", () => {
  const now = "2026-03-30T10:00:00.000Z";
  const existingDrafts = Array.from({ length: 12 }, (_, index) => ({
    id: `draft-${index + 1}`,
    name: `Draft ${index + 1}`,
    updatedAt: `2026-03-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
  }));

  const next = buildNextDraftState({
    drafts: existingDrafts,
    payload: { id: "draft-4", title: "Updated draft", game: "Pokemon" },
    now,
    maxDrafts: 12,
  });

  assert.equal(next.activeDraftId, "draft-4");
  assert.equal(next.draft.updatedAt, now);
  assert.equal(next.drafts.length, 12);
  assert.equal(next.drafts[0].id, "draft-4");
  assert.equal(next.drafts[0].name, "Updated draft");
  assert.equal(next.drafts.filter((draft) => draft.id === "draft-4").length, 1);
});

test("buildClearedDraftState removes the active draft and promotes the next draft", () => {
  const next = buildClearedDraftState({
    drafts: [
      { id: "draft-a", updatedAt: "2026-03-30T09:00:00.000Z" },
      { id: "draft-b", updatedAt: "2026-03-29T09:00:00.000Z" },
    ],
    activeDraftId: "draft-a",
    draftId: "draft-a",
  });

  assert.deepEqual(next.drafts, [{ id: "draft-b", updatedAt: "2026-03-29T09:00:00.000Z" }]);
  assert.equal(next.activeDraftId, "draft-b");
});

test("resolveActiveDraft and sortListingDrafts keep the newest draft first", () => {
  const drafts = [
    { id: "older", updatedAt: "2026-03-29T09:00:00.000Z" },
    { id: "newer", updatedAt: "2026-03-30T09:00:00.000Z" },
  ];

  assert.deepEqual(sortListingDrafts(drafts).map((draft) => draft.id), ["newer", "older"]);
  assert.equal(resolveActiveDraft(drafts, "newer")?.id, "newer");
  assert.equal(resolveActiveDraft(drafts, "missing"), null);
});
