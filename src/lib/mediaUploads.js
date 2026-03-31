function isRetriableMessage(message = "") {
  const normalized = String(message || "").toLowerCase();
  return (
    normalized.includes("timeout") ||
    normalized.includes("network") ||
    normalized.includes("temporar") ||
    normalized.includes("fetch") ||
    normalized.includes("503") ||
    normalized.includes("502") ||
    normalized.includes("504") ||
    normalized.includes("429") ||
    normalized.includes("rate limit")
  );
}

export function shouldRetryStorageUpload(error) {
  if (!error) {
    return false;
  }

  if (typeof error.status === "number" && [429, 502, 503, 504].includes(error.status)) {
    return true;
  }

  if (typeof error.statusCode === "number" && [429, 502, 503, 504].includes(error.statusCode)) {
    return true;
  }

  return isRetriableMessage(error.message || error.error_description || error.name || "");
}

export async function retryStorageUpload(task, options = {}) {
  const retries = Math.max(0, Number(options.retries ?? 2));
  const retryDelayMs = Math.max(0, Number(options.retryDelayMs ?? 250));
  let attempt = 0;
  let lastError = null;

  while (attempt <= retries) {
    try {
      return await task(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !shouldRetryStorageUpload(error)) {
        throw error;
      }

      if (typeof options.onRetry === "function") {
        options.onRetry({ attempt: attempt + 1, error });
      }

      if (retryDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (attempt + 1)));
      }
    }

    attempt += 1;
  }

  throw lastError || new Error("Upload failed.");
}
