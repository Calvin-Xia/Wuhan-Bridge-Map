import { defineConfig, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  devToolbar: {
    enabled: false,
  },
  output: "static",
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Noto Sans SC",
      cssVariable: "--font-sans",
      weights: [400, 500, 600, 700, 800],
    },
    {
      provider: fontProviders.google(),
      name: "Roboto Mono",
      cssVariable: "--font-number",
      weights: [400, 500, 600],
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
