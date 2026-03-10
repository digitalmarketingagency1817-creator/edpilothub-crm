import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "sr"],
  defaultLocale: "en",
  localePrefix: "never", // No URL prefix — locale detected via cookie/header
});
