#!/usr/bin/env node
/**
 * PaperPilot AI Code Review Hook
 *
 * 在 git commit 前调用 DeepSeek 对 staged 变更进行 Code Review。
 * - warning 级别：CR 不通过，终止 commit
 * - advice 级别：展示建议但允许 commit
 *
 * 跳过 hook：git commit --no-verify
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const DEEPSEEK_BASE = "https://api.deepseek.com";
const DIFF_MAX_BYTES = 80 * 1024; // 约 80KB，避免超出 token 限制

function loadEnv() {
  const root = path.join(__dirname, "..");
  for (const name of [".env.local", ".env"]) {
    const envPath = path.join(root, name);
    if (!fs.existsSync(envPath)) continue;
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const m = line.match(/^DEEPSEEK_API_KEY=(.+)$/);
      if (m) return m[1].trim();
    }
  }
  return null;
}

function getStagedDiff() {
  try {
    return execSync("git diff --cached", { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
  } catch {
    return "";
  }
}

function getStagedFiles() {
  try {
    return execSync("git diff --cached --name-only", { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function callDeepSeek(apiKey, diff) {
  const truncated = diff.length > DIFF_MAX_BYTES
    ? diff.slice(0, DIFF_MAX_BYTES) + "\n\n... [内容已截断，超出审查长度限制]"
    : diff;

  const systemPrompt = `你是 PaperPilot 的 Code Review 助手。对用户提供的 git staged 代码变更进行审查。

必须且只能返回一个 JSON 对象，格式如下（不要包含 markdown 代码块或任何其他文字）：
{
  "warnings": [
    { "file": "文件路径", "line": 行号或null, "message": "必须修复的严重问题" }
  ],
  "advice": [
    { "file": "文件路径", "line": 行号或null, "message": "建议性改进意见" }
  ]
}

规则：
- warnings：必须修复才能通过 CR 的问题（安全漏洞、明显 bug、严重违反规范、破坏性变更）
- advice：可选改进（代码风格、可读性、最佳实践、性能优化建议）
- 无则返回空数组 []
- file 使用 git diff 中的路径
- line 为变更涉及的大致行号，无法确定则 null`;

  const userPrompt = `请审查以下 staged 变更：\n\n${truncated}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let res;
  try {
    res = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API 错误 ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "{}";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : raw;

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(`AI 返回格式无效，无法解析 JSON: ${e.message}`);
  }
}

function printComments(warnings, advice) {
  const hasWarnings = warnings && warnings.length > 0;
  const hasAdvice = advice && advice.length > 0;

  if (hasWarnings) {
    console.log("\n\u001b[31m\u001b[1m❌ Code Review 未通过 - 请修复以下问题：\u001b[0m\n");
    warnings.forEach((w, i) => {
      const loc = w.file + (w.line != null ? `:${w.line}` : "");
      console.log(`  \u001b[31m[${i + 1}]\u001b[0m ${loc}`);
      console.log(`      ${w.message}\n`);
    });
  }

  if (hasAdvice) {
    console.log(hasWarnings ? "" : "\n");
    console.log("\u001b[33m\u001b[1m💡 建议（不影响提交）：\u001b[0m\n");
    advice.forEach((a, i) => {
      const loc = a.file + (a.line != null ? `:${a.line}` : "");
      console.log(`  \u001b[33m[${i + 1}]\u001b[0m ${loc}`);
      console.log(`      ${a.message}\n`);
    });
  }

  if (!hasWarnings && !hasAdvice) {
    console.log("\n\u001b[32m✓ Code Review 通过\u001b[0m\n");
  }
}

async function main() {
  const apiKey = loadEnv() || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error("\n\u001b[31m错误：未找到 DEEPSEEK_API_KEY\u001b[0m");
    console.error("请在 .env.local 中配置 DEEPSEEK_API_KEY，或设置环境变量。\n");
    process.exit(1);
  }

  const diff = getStagedDiff();
  const files = getStagedFiles();

  console.log("测试diff", diff);
  console.log("测试files", files);

  if (!diff.trim() || files.length === 0) {
    console.log("\n\u001b[33m无 staged 变更，跳过 Code Review\u001b[0m\n");
    process.exit(0);
  }

  console.log("\n\u001b[36m🤖 正在请求 AI Code Review...\u001b[0m");

  try {
    const result = await callDeepSeek(apiKey, diff);
    const warnings = result.warnings ?? [];
    const advice = result.advice ?? [];

    printComments(warnings, advice);

    if (warnings.length > 0) {
      console.log("\u001b[31m修复上述问题后重新提交，或使用 git commit --no-verify 跳过\u001b[0m\n");
      process.exit(1);
    }

    process.exit(0);
  } catch (err) {
    const msg = err.name === "AbortError" ? "请求超时（30 秒）" : err.message;
    console.error("\n\u001b[31mCode Review 失败：\u001b[0m", msg);
    console.error("\n可使用 git commit --no-verify 跳过本次检查\n");
    process.exit(1);
  }
}

main();
