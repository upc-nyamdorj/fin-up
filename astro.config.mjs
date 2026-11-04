// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://www.finup.mn",
  build: {
    // terms.html, served as /terms (cleanUrls in vercel.json)
    format: "file",
    inlineStylesheets: "always",
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
