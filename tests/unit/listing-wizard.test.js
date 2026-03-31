import test from "node:test";
import assert from "node:assert/strict";
import {
  getListingWizardStepState,
  normalizePostalInput,
} from "../../src/lib/listingWizard.js";

function buildForm(overrides = {}) {
  return {
    title: "Base listing",
    game: "Pokemon",
    type: "WTS",
    condition: "NM",
    price: "150",
    neighborhood: "Maples",
    description: "Clean card, local meetup only.",
    ...overrides,
  };
}

test("normalizePostalInput uppercases and strips non-alphanumeric characters", () => {
  assert.equal(normalizePostalInput("r2m-4a1"), "R2M");
  assert.equal(normalizePostalInput("  r2p "), "R2P");
});

test("wizard step state allows setup and details when required fields exist", () => {
  const state = getListingWizardStepState({
    authReady: true,
    form: buildForm(),
    liveSearchSupported: false,
    selectedPrintingId: "",
  });

  assert.equal(state.canAdvanceFromSetup, true);
  assert.equal(state.canAdvanceFromIdentity, true);
  assert.equal(state.canAdvanceFromDetails, true);
  assert.equal(state.canPublish, true);
  assert.deepEqual(state.stepCanContinue, [true, true, true, true]);
});

test("wizard identity step requires a selected printing for supported live-search games when the title is empty", () => {
  const state = getListingWizardStepState({
    authReady: true,
    form: buildForm({ title: "" }),
    liveSearchSupported: true,
    selectedPrintingId: "",
  });

  assert.equal(state.canAdvanceFromSetup, false);
  assert.equal(state.canAdvanceFromIdentity, false);
  assert.equal(state.canPublish, false);
});

test("wizard publish step requires auth, description, and price", () => {
  const unauthenticated = getListingWizardStepState({
    authReady: false,
    form: buildForm(),
    liveSearchSupported: false,
    selectedPrintingId: "",
  });
  const missingDescription = getListingWizardStepState({
    authReady: true,
    form: buildForm({ description: " " }),
    liveSearchSupported: false,
    selectedPrintingId: "",
  });
  const missingPrice = getListingWizardStepState({
    authReady: true,
    form: buildForm({ price: "" }),
    liveSearchSupported: false,
    selectedPrintingId: "",
  });

  assert.equal(unauthenticated.canPublish, false);
  assert.equal(missingDescription.canPublish, false);
  assert.equal(missingPrice.canPublish, false);
});
