import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const authToken = process.env.SENTRY_AUTH_TOKEN;
  const org = process.env.SENTRY_ORG;
  const project = process.env.SENTRY_PROJECT;
  const release =
    process.env.SENTRY_RELEASE ||
    process.env.VITE_SENTRY_RELEASE ||
    `temptic@${new Date().toISOString().slice(0, 10)}`;

  const enableSentryUpload =
    mode === "production" && Boolean(authToken && org && project);

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: { overlay: false },
    },
    define: {
      "import.meta.env.VITE_SENTRY_RELEASE": JSON.stringify(release),
    },
    build: {
      sourcemap: true,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      enableSentryUpload &&
        sentryVitePlugin({
          authToken,
          org,
          project,
          release: { name: release },
          sourcemaps: {
            filesToDeleteAfterUpload: ["**/*.map"],
          },
          telemetry: false,
        }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
