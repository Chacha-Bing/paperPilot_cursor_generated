# PaperPilot 测试说明

## 测试框架

- **Vitest**：单测运行器，兼容 Next.js 与 ESM
- **fake-indexeddb**：在 Node 环境模拟 IndexedDB
- **@testing-library/react**：React 组件测试（预留）

## 命令

| 命令 | 说明 |
|------|------|
| `npm run test` | 运行所有单测（不含 AI 集成） |
| `npm run test:watch` | 监听模式，文件变更时自动重跑 |
| `npm run test:ai` | 仅运行 AI 集成测试（需配置 API Key） |

## AI 集成测试

AI 集成测试会调用真实的 DeepSeek API，用于校验预解析返回格式是否符合 schema。

**运行方式：**

```bash
DEEPSEEK_API_KEY=sk-xxx npm run test:ai
```

未配置 `DEEPSEEK_API_KEY` 时，该测试会自动跳过，不影响常规 `npm run test`。

## 测试覆盖

- `src/lib/rehype-citation.test.ts`：`[[page, line]]` 引用解析
- `src/services/db.service.test.ts`：IndexedDB CRUD
- `src/services/preparse.service.test.ts`：预解析流程与字段兼容（deconstruction / core_deconstruction）
- `src/services/ai.service.test.ts`：AI 返回 JSON 解析与清洗
- `src/services/ai-integration.test.ts`：可选真实 API 校验
