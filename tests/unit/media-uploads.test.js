import test from "node:test";
import assert from "node:assert/strict";
import { retryStorageUpload, shouldRetryStorageUpload } from "../../src/lib/mediaUploads.js";

test("shouldRetryStorageUpload only retries transient storage failures", () => {
  assert.equal(shouldRetryStorageUpload({ status: 503, message: "Service unavailable" }), true);
  assert.equal(shouldRetryStorageUpload({ message: "Network request failed" }), true);
  assert.equal(shouldRetryStorageUpload({ status: 400, message: "Invalid bucket" }), false);
});

test("retryStorageUpload retries transient errors and eventually resolves", async () => {
  let attempts = 0;
  const result = await retryStorageUpload(async () => {
    attempts += 1;
    if (attempts < 3) {
      throw { status: 503, message: "temporary outage" };
    }
    return "ok";
  }, { retries: 2, retryDelayMs: 1 });

  assert.equal(result, "ok");
  assert.equal(attempts, 3);
});

test("retryStorageUpload stops on permanent errors", async () => {
  let attempts = 0;

  await assert.rejects(async () => {
    await retryStorageUpload(async () => {
      attempts += 1;
      throw { status: 400, message: "invalid bucket" };
    }, { retries: 2, retryDelayMs: 1 });
  }, (error) => error?.message === "invalid bucket");

  assert.equal(attempts, 1);
});
