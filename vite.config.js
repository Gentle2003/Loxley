import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Design + workflow phase: mocked chain, no wallet libs yet.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
});
