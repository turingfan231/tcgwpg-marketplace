import bootstrapHandler from "./bootstrap.js";
import localEventsHandler from "./events/local.js";
import app from "../server/index.js";

export default async function handler(req, res) {
  const pathParts = Array.isArray(req.query?.path)
    ? req.query.path
    : typeof req.query?.path === "string"
      ? [req.query.path]
      : [];
  const normalizedPath = `/${pathParts.join("/")}`;

  if (normalizedPath === "/bootstrap") {
    return bootstrapHandler(req, res);
  }

  if (normalizedPath === "/events/local") {
    return localEventsHandler(req, res);
  }

  return app(req, res);
}
