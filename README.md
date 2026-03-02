# PaperPilot · 论文导航者
 
> 需求文档见 /docs/PRD.md，技术文档见 /docs/TDD.md
> 
> 由于文档经由AI从PDF转md，所以格式可能不清晰，可以参考源文件：
> [需求文档PRD](https://my.feishu.cn/docx/T4awdjnHCoVDXmxUThhcLZ3anDf?from=from_copylink)、[技术文档TDD](https://my.feishu.cn/wiki/Swx9waXvPi7wnQkR0TTcwBLdnre?from=from_copylink)

> 本项目 PRD/TDD 均经过多轮自然语言交流后由 Gemini 输出
>
> 本项目代码均由 Cursor Composer 1.5 全量生成，包括此 md文件

PaperPilot 是一款面向大学生的论文辅助平台，通过 AI 引导式阅读、苏格拉底提问、术语表全局高亮等功能，帮助新手从「搜不到 / 看不懂 / 记不住」走向「敢搜、敢读、敢问」，带来更好的论文阅读体验。

<img width="3572" height="1994" alt="demo" src="https://github.com/user-attachments/assets/60daa30a-e97a-4afc-b321-6cfa82184406" />

---

## ✨ 核心功能

| 模块 | 说明 |
|------|------|
| **M1 学术启航** | 三关训练：精准搜索、鉴宝专家、破译密语，建立科研基础认知 |
| **M2 结构化阅读** | PDF 上传、AI 预解析、解构看板、划词工具栏、茶茶对话 |
| **术语表** | 划词存入、全局高亮、跨论文跳转溯源 |
| **逻辑锚点** | 琥珀色波浪线标记重点，点击唤起茶茶引导提问 |

---

## 🛠 技术栈

- **框架**：Next.js 16 (App Router) + React 19 + TypeScript
- **样式**：Tailwind CSS + Framer Motion
- **存储**：Dexie.js (IndexedDB)
- **状态**：Zustand
- **AI**：DeepSeek API (OpenAI SDK 兼容)

---

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm / pnpm / yarn

### 安装与运行

```bash
# 克隆项目
git clone <repository-url>
cd paperPilot

# 安装依赖
npm install

# 配置环境变量
# 在项目根目录创建 .env.local，添加：
# DEEPSEEK_API_KEY=sk-your-key

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务
npm start
```

### 环境变量

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥，用于预解析与对话 | 是 |

---

## 📁 项目结构

### 文件路由图

```
paperPilot/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # 根布局（Server）
│   │   ├── page.tsx                  # 首页 / (Client)
│   │   ├── globals.css               # 全局样式
│   │   │
│   │   ├── start/                    # M1 训练营
│   │   │   ├── page.tsx              # /start (Server)
│   │   │   └── StartPageContent.tsx   # 关卡内容 (Client)
│   │   │
│   │   ├── [paperId]/                # 论文详情
│   │   │   ├── page.tsx              # /[paperId] (Server)
│   │   │   └── ReadingWorkbenchLoader.tsx  # 工作台加载器 (Client)
│   │   │
│   │   ├── actions/
│   │   │   └── preparse.ts           # "use server" 预解析
│   │   │
│   │   └── api/
│   │       ├── preparse/route.ts     # POST /api/preparse（备用）
│   │       └── chat/route.ts         # POST /api/chat 流式对话
│   │
│   ├── components/
│   │   ├── m1/                       # M1 训练营组件
│   │   │   ├── SearchTraining.tsx    # 关卡一：精准搜索
│   │   │   ├── QualityJudge.tsx      # 关卡二：鉴宝专家
│   │   │   └── TerminologyLink.tsx   # 关卡三：黑话连线
│   │   │
│   │   └── m2/                       # M2 实验室组件
│   │       ├── ReadingWorkbench/     # 阅读工作台
│   │       │   ├── index.tsx         # 主入口
│   │       │   ├── EmptyState.tsx    # 冷启动上传区
│   │       │   ├── ParsingState.tsx  # 预解析中
│   │       │   └── ReadingState.tsx  # 阅读双栏
│   │       │
│   │       ├── PdfVirtualViewer/     # PDF 虚拟列表
│   │       │   ├── index.tsx         # 主入口
│   │       │   ├── PdfPageLayers.tsx # 单页三层渲染
│   │       │   ├── TermHighlights.tsx# 术语高亮
│   │       │   └── WaveLines.tsx     # 波浪线
│   │       │
│   │       ├── WorkflowSidebar.tsx   # 工作流侧边栏
│   │       ├── GlossarySidebar.tsx   # 术语表侧边栏
│   │       ├── ChatPanel.tsx         # 茶茶对话
│   │       ├── DeconBoard.tsx        # 解构看板
│   │       ├── SelectionToolbar.tsx # 划词工具栏
│   │       ├── PdfThreeLayerShell.tsx# PDF 三层骨架
│   │       └── PdfPagePreview.tsx    # 单页预览
│   │
│   ├── services/
│   │   ├── ai.service.ts             # DeepSeek API
│   │   ├── preparse.service.ts       # 预解析流程
│   │   ├── db.service.ts             # IndexedDB 封装
│   │   ├── pdf.service.ts            # PDF 加载/渲染
│   │   └── ac-search.service.ts      # AC 自动机术语匹配
│   │
│   ├── store/
│   │   ├── paperStore.ts             # 论文/阅读状态
│   │   └── chatStore.ts              # 对话状态
│   │
│   ├── lib/
│   │   ├── db.ts                     # Dexie 模型定义
│   │   └── rehype-citation.ts        # [[page,line]] 引用
│   │
│   └── workers/
│       └── ac-search.worker.ts      # AC 自动机 Worker
│
├── docs/
│   ├── PRD.md                        # 产品需求
│   ├── TDD.md                        # 技术设计
│   └── SCHEMA.md                     # 数据库结构
│
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

### 路由一览

| 路径 | 说明 | 渲染 |
|------|------|------|
| `/` | 首页，上传 PDF 或展示工作台 | Client |
| `/start` | M1 学术启航训练营 | Server + Client |
| `/[paperId]` | 论文详情，阅读工作台 | Server + Client |
| `/api/preparse` | AI 预解析（备用） | - |
| `/api/chat` | 流式对话 | - |

---

## 📖 开发规约

- 业务逻辑置于 `src/services/`，UI 组件不直接操作 DB
- 大型数据存 IndexedDB，禁止 LocalStorage
- PDF 三层结构：CanvasLayer(z:1) | TextLayer(z:2) | InteractionLayer(z:3)
- 术语匹配在 Web Worker 中执行

详见 `.cursorrules` 与 `docs/TDD.md`。

---

## 📄 License

ISC
