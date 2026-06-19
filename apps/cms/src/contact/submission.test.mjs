import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyContactSubmission,
  contactRedirect,
  hashContactIp,
  isAllowedContactOrigin,
  normalizeContactSubmission,
  validateContactSubmission
} from "./submission.mjs";

describe("contact submission helpers", () => {
  it("normalizes and validates a valid message", () => {
    const submission = normalizeContactSubmission({
      name: "  George  Dallas ",
      email: " GEORGE@example.COM ",
      subject: " Hello ",
      message: " This is a real message. ",
      consent: "on"
    });

    assert.equal(submission.name, "George Dallas");
    assert.equal(submission.email, "george@example.com");
    assert.deepEqual(validateContactSubmission(submission), []);
  });

  it("rejects invalid required fields", () => {
    const submission = normalizeContactSubmission({ email: "not email", message: "short" });

    assert.deepEqual(validateContactSubmission(submission), [
      "name is required",
      "a valid email is required",
      "subject is required",
      "message must be at least 10 characters",
      "privacy consent is required"
    ]);
  });

  it("silently classifies honeypot submissions as spam", () => {
    const submission = normalizeContactSubmission({
      name: "Bot",
      email: "bot@example.com",
      subject: "Hi",
      message: "A bot filled the hidden website field.",
      consent: true,
      website: "https://spam.example"
    });

    assert.deepEqual(classifyContactSubmission(submission), {
      accept: false,
      spamStatus: "spam",
      reason: "honeypot"
    });
  });

  it("marks very fast submissions as suspected spam", () => {
    const submission = normalizeContactSubmission({
      name: "Fast",
      email: "fast@example.com",
      subject: "Hi",
      message: "This message arrived suspiciously quickly.",
      consent: true,
      startedAt: "1000"
    });

    assert.deepEqual(classifyContactSubmission(submission, 2000), {
      accept: true,
      spamStatus: "suspected",
      reason: "too_fast"
    });
  });

  it("allows only configured public or CMS origins", () => {
    const headers = new Headers({ origin: "https://dev.georgedallas.com" });

    assert.equal(
      isAllowedContactOrigin(
        "https://cms-dev.georgedallas.com/api/contact",
        headers,
        "https://dev.georgedallas.com",
        "https://cms-dev.georgedallas.com"
      ),
      true
    );
    assert.equal(
      isAllowedContactOrigin(
        "https://cms-dev.georgedallas.com/api/contact",
        new Headers({ origin: "https://evil.example" }),
        "https://dev.georgedallas.com",
        "https://cms-dev.georgedallas.com"
      ),
      false
    );
  });

  it("builds stable redirects and one-way IP hashes", () => {
    assert.equal(contactRedirect("https://dev.georgedallas.com", "sent"), "https://dev.georgedallas.com/contact?contact=sent");
    assert.equal(hashContactIp("203.0.113.1", "secret").length, 64);
    assert.notEqual(hashContactIp("203.0.113.1", "secret"), hashContactIp("203.0.113.1", "other-secret"));
  });
});
