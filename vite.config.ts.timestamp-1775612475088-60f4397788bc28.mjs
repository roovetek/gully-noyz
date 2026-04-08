// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
function readPackageVersion() {
  try {
    const packageJsonPath = resolve(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    return packageJson.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}
function getCommitSha() {
  const envSha = process.env.BOLT_GIT_COMMIT_SHA || process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.NETLIFY_COMMIT_REF || process.env.CI_COMMIT_SHA;
  if (envSha) {
    return envSha.slice(0, 7);
  }
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}
function getTimestampSuffix(buildDate2) {
  return buildDate2.replace(/[-:TZ.]/g, "").slice(0, 14);
}
var baseVersion = readPackageVersion();
var buildDate = (/* @__PURE__ */ new Date()).toISOString();
var commitSha = getCommitSha();
var versionSuffix = commitSha || getTimestampSuffix(buildDate);
var appVersion = `${baseVersion}+${versionSuffix}`;
var vite_config_default = defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion),
    "import.meta.env.VITE_BUILD_DATE": JSON.stringify(buildDate)
  },
  optimizeDeps: {
    exclude: ["lucide-react"]
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"]
        }
      }
    },
    minify: true,
    sourcemap: true,
    assetsDir: "assets"
  },
  server: {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate"
    }
  },
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: "./tests/setup.ts",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "tests/",
        "*.config.js",
        "*.config.ts",
        "dist/"
      ]
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBleGVjU3luYyB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdub2RlOnBhdGgnO1xuXG5mdW5jdGlvbiByZWFkUGFja2FnZVZlcnNpb24oKTogc3RyaW5nIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBwYWNrYWdlSnNvblBhdGggPSByZXNvbHZlKHByb2Nlc3MuY3dkKCksICdwYWNrYWdlLmpzb24nKTtcbiAgICBjb25zdCBwYWNrYWdlSnNvbiA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKHBhY2thZ2VKc29uUGF0aCwgJ3V0ZjgnKSkgYXMgeyB2ZXJzaW9uPzogc3RyaW5nIH07XG4gICAgcmV0dXJuIHBhY2thZ2VKc29uLnZlcnNpb24gfHwgJzAuMC4wJztcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuICcwLjAuMCc7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0Q29tbWl0U2hhKCk6IHN0cmluZyB7XG4gIGNvbnN0IGVudlNoYSA9XG4gICAgcHJvY2Vzcy5lbnYuQk9MVF9HSVRfQ09NTUlUX1NIQSB8fFxuICAgIHByb2Nlc3MuZW52LkdJVEhVQl9TSEEgfHxcbiAgICBwcm9jZXNzLmVudi5WRVJDRUxfR0lUX0NPTU1JVF9TSEEgfHxcbiAgICBwcm9jZXNzLmVudi5ORVRMSUZZX0NPTU1JVF9SRUYgfHxcbiAgICBwcm9jZXNzLmVudi5DSV9DT01NSVRfU0hBO1xuXG4gIGlmIChlbnZTaGEpIHtcbiAgICByZXR1cm4gZW52U2hhLnNsaWNlKDAsIDcpO1xuICB9XG5cbiAgdHJ5IHtcbiAgICByZXR1cm4gZXhlY1N5bmMoJ2dpdCByZXYtcGFyc2UgLS1zaG9ydCBIRUFEJywgeyBzdGRpbzogWydpZ25vcmUnLCAncGlwZScsICdpZ25vcmUnXSB9KVxuICAgICAgLnRvU3RyaW5nKClcbiAgICAgIC50cmltKCk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiAnJztcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRUaW1lc3RhbXBTdWZmaXgoYnVpbGREYXRlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYnVpbGREYXRlLnJlcGxhY2UoL1stOlRaLl0vZywgJycpLnNsaWNlKDAsIDE0KTtcbn1cblxuY29uc3QgYmFzZVZlcnNpb24gPSByZWFkUGFja2FnZVZlcnNpb24oKTtcbmNvbnN0IGJ1aWxkRGF0ZSA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbmNvbnN0IGNvbW1pdFNoYSA9IGdldENvbW1pdFNoYSgpO1xuY29uc3QgdmVyc2lvblN1ZmZpeCA9IGNvbW1pdFNoYSB8fCBnZXRUaW1lc3RhbXBTdWZmaXgoYnVpbGREYXRlKTtcbmNvbnN0IGFwcFZlcnNpb24gPSBgJHtiYXNlVmVyc2lvbn0rJHt2ZXJzaW9uU3VmZml4fWA7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIGRlZmluZToge1xuICAgICdpbXBvcnQubWV0YS5lbnYuVklURV9BUFBfVkVSU0lPTic6IEpTT04uc3RyaW5naWZ5KGFwcFZlcnNpb24pLFxuICAgICdpbXBvcnQubWV0YS5lbnYuVklURV9CVUlMRF9EQVRFJzogSlNPTi5zdHJpbmdpZnkoYnVpbGREYXRlKSxcbiAgfSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgZXhjbHVkZTogWydsdWNpZGUtcmVhY3QnXSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgdmVuZG9yOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbSddLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICAgIG1pbmlmeTogdHJ1ZSxcbiAgICBzb3VyY2VtYXA6IHRydWUsXG4gICAgYXNzZXRzRGlyOiAnYXNzZXRzJyxcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgaGVhZGVyczoge1xuICAgICAgJ0NhY2hlLUNvbnRyb2wnOiAnbm8tY2FjaGUsIG5vLXN0b3JlLCBtdXN0LXJldmFsaWRhdGUnLFxuICAgIH0sXG4gIH0sXG4gIHRlc3Q6IHtcbiAgICBnbG9iYWxzOiB0cnVlLFxuICAgIGVudmlyb25tZW50OiAnaGFwcHktZG9tJyxcbiAgICBzZXR1cEZpbGVzOiAnLi90ZXN0cy9zZXR1cC50cycsXG4gICAgY292ZXJhZ2U6IHtcbiAgICAgIHByb3ZpZGVyOiAndjgnLFxuICAgICAgcmVwb3J0ZXI6IFsndGV4dCcsICdqc29uJywgJ2h0bWwnXSxcbiAgICAgIGV4Y2x1ZGU6IFtcbiAgICAgICAgJ25vZGVfbW9kdWxlcy8nLFxuICAgICAgICAndGVzdHMvJyxcbiAgICAgICAgJyouY29uZmlnLmpzJyxcbiAgICAgICAgJyouY29uZmlnLnRzJyxcbiAgICAgICAgJ2Rpc3QvJyxcbiAgICAgIF0sXG4gICAgfSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5TixTQUFTLG9CQUFvQjtBQUN0UCxPQUFPLFdBQVc7QUFDbEIsU0FBUyxnQkFBZ0I7QUFDekIsU0FBUyxvQkFBb0I7QUFDN0IsU0FBUyxlQUFlO0FBRXhCLFNBQVMscUJBQTZCO0FBQ3BDLE1BQUk7QUFDRixVQUFNLGtCQUFrQixRQUFRLFFBQVEsSUFBSSxHQUFHLGNBQWM7QUFDN0QsVUFBTSxjQUFjLEtBQUssTUFBTSxhQUFhLGlCQUFpQixNQUFNLENBQUM7QUFDcEUsV0FBTyxZQUFZLFdBQVc7QUFBQSxFQUNoQyxRQUFRO0FBQ04sV0FBTztBQUFBLEVBQ1Q7QUFDRjtBQUVBLFNBQVMsZUFBdUI7QUFDOUIsUUFBTSxTQUNKLFFBQVEsSUFBSSx1QkFDWixRQUFRLElBQUksY0FDWixRQUFRLElBQUkseUJBQ1osUUFBUSxJQUFJLHNCQUNaLFFBQVEsSUFBSTtBQUVkLE1BQUksUUFBUTtBQUNWLFdBQU8sT0FBTyxNQUFNLEdBQUcsQ0FBQztBQUFBLEVBQzFCO0FBRUEsTUFBSTtBQUNGLFdBQU8sU0FBUyw4QkFBOEIsRUFBRSxPQUFPLENBQUMsVUFBVSxRQUFRLFFBQVEsRUFBRSxDQUFDLEVBQ2xGLFNBQVMsRUFDVCxLQUFLO0FBQUEsRUFDVixRQUFRO0FBQ04sV0FBTztBQUFBLEVBQ1Q7QUFDRjtBQUVBLFNBQVMsbUJBQW1CQSxZQUEyQjtBQUNyRCxTQUFPQSxXQUFVLFFBQVEsWUFBWSxFQUFFLEVBQUUsTUFBTSxHQUFHLEVBQUU7QUFDdEQ7QUFFQSxJQUFNLGNBQWMsbUJBQW1CO0FBQ3ZDLElBQU0sYUFBWSxvQkFBSSxLQUFLLEdBQUUsWUFBWTtBQUN6QyxJQUFNLFlBQVksYUFBYTtBQUMvQixJQUFNLGdCQUFnQixhQUFhLG1CQUFtQixTQUFTO0FBQy9ELElBQU0sYUFBYSxHQUFHLFdBQVcsSUFBSSxhQUFhO0FBR2xELElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixRQUFRO0FBQUEsSUFDTixvQ0FBb0MsS0FBSyxVQUFVLFVBQVU7QUFBQSxJQUM3RCxtQ0FBbUMsS0FBSyxVQUFVLFNBQVM7QUFBQSxFQUM3RDtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLGNBQWM7QUFBQSxFQUMxQjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBLFVBQ1osUUFBUSxDQUFDLFNBQVMsV0FBVztBQUFBLFFBQy9CO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNBLFFBQVE7QUFBQSxJQUNSLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxFQUNiO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixTQUFTO0FBQUEsTUFDUCxpQkFBaUI7QUFBQSxJQUNuQjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE1BQU07QUFBQSxJQUNKLFNBQVM7QUFBQSxJQUNULGFBQWE7QUFBQSxJQUNiLFlBQVk7QUFBQSxJQUNaLFVBQVU7QUFBQSxNQUNSLFVBQVU7QUFBQSxNQUNWLFVBQVUsQ0FBQyxRQUFRLFFBQVEsTUFBTTtBQUFBLE1BQ2pDLFNBQVM7QUFBQSxRQUNQO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbImJ1aWxkRGF0ZSJdCn0K
