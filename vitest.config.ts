/**
 * Vitest 配置
 *
 * 单测：纯逻辑、服务层、工具函数
 * AI 集成测试：需设置 DEEPSEEK_API_KEY 时运行 npm run test:ai
 */
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/e2e/**"],
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/services/**", "src/lib/**"],
      exclude: ["**/*.test.*", "**/*.spec.*", "**/test/**"]
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
