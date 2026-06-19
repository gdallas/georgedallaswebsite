import { createHash } from "node:crypto";

export const contactMessageLimits = {
  name: 120,
  email: 254,
  subject: 160,
  message: 4000
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeContactSubmission(input = {}) {
  return {
    name: normalizeText(input.name, contactMessageLimits.name),
    email: normalizeText(input.email, contactMessageLimits.email).toLowerCase(),
    subject: normalizeText(input.subject, contactMessageLimits.subject),
    message: normalizeText(input.message, contactMessageLimits.message),
    consent: input.consent === true || input.consent === "true" || input.consent === "on",
    website: normalizeText(input.website, 500),
    startedAt: normalizeText(input.startedAt, 64)
  };
}

export function validateContactSubmission(submission) {
  const errors = [];

  if (!submission.name) {
    errors.push("name is required");
  }
  if (!submission.email || !emailPattern.test(submission.email)) {
    errors.push("a valid email is required");
  }
  if (!submission.subject) {
    errors.push("subject is required");
  }
  if (!submission.message || submission.message.length < 10) {
    errors.push("message must be at least 10 characters");
  }
  if (!submission.consent) {
    errors.push("privacy consent is required");
  }

  return errors;
}

export function classifyContactSubmission(submission, now = Date.now()) {
  if (submission.website) {
    return { accept: false, spamStatus: "spam", reason: "honeypot" };
  }

  const startedAt = Number(submission.startedAt);
  if (Number.isFinite(startedAt) && now - startedAt < 2500) {
    return { accept: true, spamStatus: "suspected", reason: "too_fast" };
  }

  return { accept: true, spamStatus: "clean" };
}

export function isAllowedContactOrigin(requestUrl, headers, publicSiteUrl, cmsPublicUrl) {
  const allowed = new Set([originOf(publicSiteUrl), originOf(cmsPublicUrl)].filter(Boolean));
  const origin = headers.get("origin");
  const referer = headers.get("referer");

  if (origin) {
    return allowed.has(origin);
  }

  if (referer) {
    return allowed.has(originOf(referer));
  }

  return originOf(requestUrl) === originOf(cmsPublicUrl);
}

export function contactRedirect(publicSiteUrl, status) {
  const url = new URL("/contact", publicSiteUrl);
  url.searchParams.set("contact", status);
  return url.toString();
}

export function hashContactIp(ip, secret) {
  const value = ip?.trim();
  if (!value) {
    return undefined;
  }

  return createHash("sha256").update(`${secret}:${value}`).digest("hex");
}

function normalizeText(value, limit) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function originOf(value) {
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}
