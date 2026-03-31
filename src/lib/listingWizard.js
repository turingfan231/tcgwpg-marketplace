export function normalizePostalInput(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);
}

export function getListingWizardStepState({
  authReady,
  form,
  liveSearchSupported,
  selectedPrintingId,
}) {
  const title = String(form?.title || "").trim();
  const description = String(form?.description || "").trim();
  const hasPrice =
    form?.price !== null &&
    form?.price !== undefined &&
    String(form.price).trim() !== "";

  const canAdvanceFromSetup = Boolean(title && form?.game && form?.type);
  const canAdvanceFromIdentity = !liveSearchSupported || Boolean(selectedPrintingId || title);
  const canAdvanceFromDetails = Boolean(form?.condition && hasPrice && form?.neighborhood);
  const canPublish = Boolean(
    authReady && title && description && hasPrice && form?.condition,
  );

  return {
    canAdvanceFromSetup,
    canAdvanceFromIdentity,
    canAdvanceFromDetails,
    canPublish,
    stepCanContinue: [
      canAdvanceFromSetup,
      canAdvanceFromIdentity,
      canAdvanceFromDetails,
      canPublish,
    ],
  };
}
