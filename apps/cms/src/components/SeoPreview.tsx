"use client";

import { useDocumentInfo, useFormFields } from "@payloadcms/ui";
import { DEFAULT_OG_IMAGE, buildSeoPreview, seoLimits } from "../seo/seoPreview.mjs";
import styles from "./SeoPreview.module.css";

// Live SEO/social preview (GDW-038): a Payload `ui` field on Posts/Pages that
// shows a Google search-result card and a social card, updating as the editor
// types. The canonical origin matches the public site (astro.config `site`).
// Guidance is advisory — it never blocks saving (hard checks live in GDW-037).
const SITE_URL = "https://georgedallas.com";

function statusClass(status: string): string {
  if (status === "ok") return styles.ok;
  return status === "long" ? styles.long : styles.short;
}

export function SeoPreview() {
  const { collectionSlug } = useDocumentInfo();
  const fields = useFormFields(([formFields]) => formFields);
  const value = (name: string): unknown => fields?.[name]?.value;

  const doc = {
    title: value("title") as string,
    seoTitle: value("seoTitle") as string,
    seoDescription: value("seoDescription") as string,
    excerpt: value("excerpt") as string,
    slug: value("slug") as string,
    canonicalUrl: value("canonicalUrl") as string
  };

  const preview = buildSeoPreview(doc, { collection: collectionSlug, siteUrl: SITE_URL });

  // Upload fields expose only the related id in form state, so determine the
  // social-image *source* from presence rather than resolving the URL live.
  const hasSocial = Boolean(value("socialImage"));
  const hasFeatured = Boolean(value("featuredImage"));
  const imageSource = hasSocial ? "social" : hasFeatured ? "featured" : "default";

  const displayTitle = preview.title || "Untitled";
  const displayDescription = preview.description || "No description yet — add an SEO description or excerpt.";

  return (
    <div className={styles.preview}>
      <h4 className={styles.heading}>Search & social preview</h4>

      <div className={styles.cards}>
        <section className={styles.card} aria-label="Google search result preview">
          <span className={styles.cardKind}>Google</span>
          <p className={styles.googleUrl}>{preview.canonical}</p>
          <p className={styles.googleTitle}>{displayTitle}</p>
          <p className={styles.googleDesc}>{displayDescription}</p>
        </section>

        <section className={styles.card} aria-label="Social card preview">
          <span className={styles.cardKind}>Social</span>
          <div className={styles.socialImage} data-source={imageSource}>
            {imageSource === "default" ? (
              <img src={`${SITE_URL}${DEFAULT_OG_IMAGE}`} alt="" />
            ) : (
              <span className={styles.socialImageNote}>
                {imageSource === "social" ? "Using social image" : "Using featured image (fallback)"}
              </span>
            )}
          </div>
          <div className={styles.socialBody}>
            <p className={styles.socialDomain}>georgedallas.com</p>
            <p className={styles.socialTitle}>{displayTitle}</p>
            <p className={styles.socialDesc}>{displayDescription}</p>
          </div>
        </section>
      </div>

      <ul className={styles.hints}>
        <li>
          SEO title: <span className={statusClass(preview.titleLength.status)}>{preview.titleLength.length}</span> chars
          <span className={styles.range}> (aim {seoLimits.title.min}–{seoLimits.title.max})</span>
        </li>
        <li>
          Description: <span className={statusClass(preview.descriptionLength.status)}>{preview.descriptionLength.length}</span> chars
          <span className={styles.range}> (aim {seoLimits.description.min}–{seoLimits.description.max})</span>
        </li>
        {imageSource !== "social" ? (
          <li className={styles.short}>
            {imageSource === "default"
              ? "No social or featured image — the default site image will be used."
              : "No social image — falling back to the featured image."}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
