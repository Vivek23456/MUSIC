import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: ".", // root is ./app folder if you deploy from there
  build: {
    outDir: "dist",
  },
});
