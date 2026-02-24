# AI Code Review Hook

在 `git commit` 前自动调用 DeepSeek 对 staged 变更进行 Code Review。

## 功能说明

- **warning 级别**：必须修复的问题（安全漏洞、明显 bug、严重违反规范）→ **CR 不通过**，终止 commit
- **advice 级别**：建议性改进（代码风格、可读性、最佳实践）→ 在终端展示，**仍允许 commit**

## 配置

1. 在 `.env.local` 中配置 DeepSeek API Key（与 PaperPilot 主应用共用）：
   ```
   DEEPSEEK_API_KEY=sk-your-api-key
   ```

2. 首次使用或克隆项目后，执行 `npm install` 会自动安装 husky 并注册 pre-commit hook。

## 使用

- 正常提交：`git add ... && git commit -m "..."` → 自动触发 Code Review
- 跳过检查：`git commit -m "..." --no-verify` 或 `git commit -m "..." -n`
- 手动运行：`npm run code-review`（仅做 CR 检查，不涉及 commit）

## 文件说明

| 文件 | 说明 |
|------|------|
| `scripts/code-review-hook.js` | CR 核心逻辑，调用 DeepSeek API |
| `.husky/pre-commit` | Git pre-commit hook，执行 CR 脚本 |

## 环境要求

- Node.js 18+（需要原生 `fetch` 支持）

## 注意事项

- 若 staged 变更过大（>80KB），会截断后发送，避免超出 token 限制
- 无 staged 变更时跳过 CR，直接放行
- API 调用失败时会终止 commit，可用 `--no-verify` 临时跳过
