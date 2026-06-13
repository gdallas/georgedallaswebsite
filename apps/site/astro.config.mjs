import { defineConfig } from "astro/config";

// Static-first public site (CODEX_RULESET.md section 13). The canonical
// production origin is used for absolute URLs; dev hosting serves the same
// build under dev.georgedallas.com.
export default defineConfig({
  site: "https://georgedallas.com",
  output: "static"
});
