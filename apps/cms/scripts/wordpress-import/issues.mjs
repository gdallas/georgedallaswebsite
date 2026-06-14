// Turn a transformed post plus per-post context into import-issue records (the
// cleanup queue). Pure so issue generation is unit-testable.

function issue(kind, severity, wordpressId, detail) {
  return { kind, severity, wordpressId, detail };
}

export function buildIssues(transformed, context = {}) {
  const { warnings, data } = transformed;
  const wordpressId = data.wordpressOriginalId;
  const issues = [];

  for (const code of warnings.shortcodes) {
    issues.push(issue("unsupported_shortcode", "warning", wordpressId, `Unsupported shortcode [${code}] kept as text.`));
  }
  for (const embed of warnings.embeds) {
    issues.push(issue("broken_embed", "warning", wordpressId, `Embed not converted and dropped: ${embed}.`));
  }
  if (!data.excerpt) {
    issues.push(issue("missing_excerpt", "info", wordpressId, "No excerpt imported; add one before publishing."));
  }
  if (context.duplicateSlug) {
    issues.push(
      issue("duplicate_slug", "error", wordpressId, `Slug "${data.slug}" already used by ${context.duplicateSlug}.`)
    );
  }
  for (const src of context.mediaDownloadFailed ?? []) {
    issues.push(issue("media_download_failed", "error", wordpressId, `Could not download image: ${src}`));
  }
  for (const src of context.imageRelinkFailed ?? []) {
    issues.push(issue("image_relink_failed", "warning", wordpressId, `Image could not be relinked: ${src}`));
  }
  for (const src of context.mediaMissingAlt ?? []) {
    issues.push(issue("media_missing_alt", "warning", wordpressId, `Imported image has no alt text: ${src}`));
  }

  return issues;
}

// A post needs human review when it generated any issue more serious than info.
export function needsReview(issues) {
  return issues.some((entry) => entry.severity !== "info");
}
