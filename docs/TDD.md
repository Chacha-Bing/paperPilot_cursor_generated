# TDD

技术⽂档:论⽂导航者(PaperPilot)

整体技术架构(TechStack)

- 前端框架： Next.js 15 (App Router) + TypeScript 。

- UI组件库： Tailwind CSS + Shadcn UI + Framer Motion （⽤于茶茶动画和数字滚

动）。

- 本地存储： Dexie.js (IndexedDB的极简封装)。

- 状态管理： Zustand （轻量级，⽅便跨组件共享当前PDF状态）。

- ⼤模型接⼝： OpenAI SDK (配置为DeepSeek终结点)。

重点技术实现⽅案

## 1. PDF解析与渲染(PDFEngine)

## 1.1 核⼼视图层架构(TheStack)

为了实现波浪线和划词菜单，我们需要在⼀个 div 容器内堆叠三个层：

1. CanvasLayer(底层)：由 pdf.js 负责，将PDF渲染为图⽚，保证视觉还原。

2. TextLayer(中层)：由 pdf.js 渲染的透明⽂本层，由⽆数个透明 <span> 组成，负责浏览器

的原⽣划词。

3. InteractionLayer(顶层)：我们⾃定义的SVG或Canvas画布，负责绘制AI引导波浪线。

## 1.2 核⼼操作技术⽅案

---

PDF如何展⽰在界⾯中？

- 加载流：

a. ⽤⼾上传⽂件，⽣成 Object URL 。

b. pdfjs.getDocument 加载⽂件。

c. 虚拟列表渲染(VirtualList)：为了保证⻓论⽂不卡顿，只渲染视⼝内及其上下2⻚的

Canvas 和 TextLayer 。

- 缩放策略：

◦ 通过全局变量 scale 控制。

◦ 缩放时，必须重新触发 page.render() 并同步更新 TextLayer 的CSS变换。

如何实现系统⾃动画“波浪线”？

AI给出的只是段落⽂本，我们需要将其转化为屏幕上的物理坐标。

## 1. ⽂本定位(AnchorFinding)：

◦ 利⽤ page.getTextContent() 获取⻚⾯所有字符的矩形数据（ transform 矩阵）。

◦ 在当前⻚匹配AI指定的关键词/句⼦。

## 2. 坐标转换：

◦ 将PDF的内部坐标（Points）转换为浏览器的像素坐标（Pixels）。

◦ 公式：$DisplayX=PDFX\timesscale$。

## 3. SVG绘制：

◦ 在InteractionLayer绘制 <path> 。

◦ 波浪线效果：通过 stroke-dasharray 或⾃定义SVGPath形状（如 M 0 5 Q 5 0 10 

5 T 20 5 ）实现。

◦ 挂载ID：给每个波浪线Path绑定⼀个 data-logic-id ，点击时通过该ID唤起右侧侧边栏

对话。

如何实现划词并唤起悬浮菜单？

这是最考验细节的地⽅，我们需要利⽤浏览器的 Selection API 。

## 1. 监听选择事件：

◦ 在 TextLayer 上监听 onMouseUp 事件。

## 2. 获取选区坐标：

```ts
const selection = window.getSelection();
const range = selection.getRangeAt(0);
const rect = range.getBoundingClientRect(); // 获取选区在视口中的绝对位置
```

## 3. 菜单定位与显⽰：

◦ 创建⼀个状态 menuPosition: { x, y, visible } 。

◦ 计算位置： y = rect.top - menuHeight - offset ， x = rect.left + 

rect.width / 2 。

◦ 使⽤ framer-motion 实现平滑的弹出效果。

## 4. 内容处理：

◦ 通过 range.toString() 获取选中的⽂本，传⼊ useChat Hook或存⼊ Zustand 状

态，等待⽤⼾点击菜单中的[学术⼤⽩话]或[存⼊术语表]。

## 1.3 关键边缘情况处理(EdgeCases)

- ⻚⾯滚动中：划词菜单应随⻚⾯滚动⽽⾃动消失，或通过 position: absolute 相对于⽗容

器定位，防⽌漂移。

- 多⾏划词： getBoundingClientRect 会返回⼀个包含多⾏的整体矩形，如果需要精准贴合，

应使⽤ getClientRects() 遍历每⼀⾏。

- 响应式缩放：当⽤⼾点击“放⼤/缩⼩”时，必须调⽤ Interaction Layer 的重绘函数，重新

计算波浪线的路径，否则波浪线会脱离原⽂。

## 2. 术语库全局⾼亮算法(TerminologyMatcher)

- 挑战：对于TerminologyMatcher（术语全局匹配器）来说，最⼤的技术挑战在于：随着术语库
（Glossary）的增⼤，如何在不阻塞主线程（保持60fps滚动性能）的前提下，在PDF复杂的

DOM结构中精准找到并⾼亮这些词。

核⼼匹配逻辑：Aho-Corasick算法(AC⾃动机)

如果使⽤普通的正则表达式遍历（$O(n\timesm)$），当术语有500个、PDF⽂本有1万字时，匹配

速度会产⽣⾁眼可⻅的卡顿。

- 技术选型：使⽤AC⾃动机算法。

- 优势：⼀次扫描（LinearTime）即可找出⽂本中所有匹配的术语。

- ⼯作流：

a. 构建期：应⽤启动或术语库更新时，在本地构建⼀颗 Trie Tree （前缀树）并添加失败指

针。

---

b. 匹配期：将PDF⻚⾯的⽂本流输⼊AC⾃动机，输出所有命中的 [start, end, 

term_id] 。

渲染策略：TextLayer注⼊法

PDF.js⽣成的 TextLayer 是由⼀个个绝对定位的 <span> 组成的。我们不能直接⽤
innerHTML 替换（会破坏PDF.js的定位索引）。

⽅案：基于Range的虚拟⾼亮

1. ⽂本重建：将当前⻚所有 <span> 的 textContent 拼接成⼀个连续字符串，并记录每个

<span> 在字符串中的偏移量索引。

## 2. 索引映射：

◦ AC⾃动机返回：术语"SOTA"出现在第105-108字符。

◦ 查索引表得知：第105-108字符横跨了第3和第4个 <span> 。

## 3. DOM渲染：

◦ 利⽤ Selection 和 Range API，针对这些跨度创建⾼亮。

◦ 或者更简单的：在 Interaction Layer （SVG层）根据对应 <span> 的位置信息，绘制

淡⻘⾊虚线框。

◦ 推荐⽅案：为匹配到的 <span> 添加⼀个 data-term-id 属性，并通过CSS ::after 

或伪元素实现虚线效果。这样性能最好，且能原⽣响应Hover事件。

性能护城河：多线程与防抖(WebWorker)

为了绝对不阻塞UI滚动，匹配逻辑必须搬离主线程。

- Worker协作流：

a. 主线程：监听到⻚⾯进⼊视⼝（IntersectionObserver）。

b. Worker线程：接收该⻚⽂本+术语树。

c. Worker线程：执⾏AC⾃动机匹配，返回命中列表 [{word: 'SOTA', index: [105, 

108]}] 。

d. 主线程：根据索引在DOM上打标记。

交互：Hover预览与跳转

- Hover逻辑：

◦ 采⽤事件委托(EventDelegation)。在PDF容器上监听 mouseover 。

◦ 匹配 e.target.dataset.termId 。

- Pop-up渲染：

◦ 从ZustandStore或Dexie获取该术语的“茶茶⼤⽩话”解释。

---

◦ 使⽤ Floating UI 库处理弹出位置，确保弹窗不超出屏幕边缘。

- 跳转溯源：

◦ 如果该术语是从另⼀篇论⽂A存⼊的，点击弹窗中的“查看来源”，侧边栏切换论⽂A，并⾃

动滚动到当时划词的⻚⾯。

异常处理与冲突

- ⻓短词冲突：如果术语库同时有"Transformer"和"VisionTransformer"，AC⾃动机应⽀持最⻓

匹配原则，避免嵌套⾼亮导致视觉混乱。

- 动态更新：⽤⼾阅读时新存⼊⼀个术语，触发全局⼴播，所有当前已渲染的⻚⾯通过

requestIdleCallback 重新扫描。

## 3. DeepSeek多轮对话与思考流处理

- 解决如何让AI流式输出、⽤⼾对话过⻓时，如何压缩上下⽂作为prompt传给AI等问题，后者是AI
交互中最考验“⼯程审美”的部分。DeepSeek-V3.2的ReasoningContent（思考流）如果处理

得好，会像⼀个活⽣⽣的学⻓在思考；如果处理不好，就会导致⻚⾯跳动或Token成本失控。

DeepSeek思考流与响应流的处理(Streaming)

DeepSeek的API返回的是典型的 Server-Sent Events (SSE) 。特殊之处在于它⽐普通模型多
了⼀个 reasoning_content 字段。

数据流解析逻辑

我们需要在前端实现⼀个流式解析器，实时分发“思考”和“回答”：

- 解析逻辑：

a. 监听SSE的每⼀帧。

b. 如果帧内包含 reasoning_content ，则追加到 current_thought 状态，UI展现

为“学⻓正在推导...”的折叠区域。

c. 如果帧内包含 content ，则追加到 current_response 状态，UI展现为正常的对话⽓

泡。

d. ⾃动结束标志：当 finish_reason 为 stop 时，关闭流并触发本地持久化（写⼊

IndexedDB）。

上下⽂压缩与Prompt策略(ContextManagement)

随着对话深⼊，Context会越来越⻓（尤其是包含PDF⽂本⽚段时）。为了节省Token并保持响应速

度，必须采⽤“滑动窗⼝+语义压缩”策略。

## 1.动态上下⽂构造模型

---

每⼀轮请求给AI的Prompt结构如下（优先级由⾼到低）：

## 1. SystemPrompt：核⼼⼈设与苏格拉底教学法规约（永远保留）。

## 2. CurrentContext：当前⽤⼾划选的原⽂⽚段（永远保留）。

## 3. RecentHistory：最近的3-5轮原始对话（保留细节）。

## 4. CompressedSummary：更早之前的对话摘要（压缩处理）。

## 2.压缩执⾏逻辑(TheSummaryLoop)

- 触发阈值：当历史对话超过10轮或Token数达到4000（可调）。

- 压缩动作：

a. 后台调⽤⼀个轻量级的 gpt-4o-mini 或 DeepSeek-V3 （⾮思考模式），将前6轮对话

压缩成⼀段200字以内的“对话简报”。

b. 保留关键点：摘要中必须包含：⽤⼾已弄懂的知识点、尚未解决的疑问。

c. 更新内存：在后续请求中，将这6轮对话从消息数组中剔除，替换为⼀条 role: system 的

简报消息。

针对PDF的“精准引⽤”协议

为了让茶茶学⻓说话像“在看着PDF⼀样”，我们需要在Prompt中强制约束引⽤格式。

引⽤协议设计

在回复中，要求AI使⽤特定的Markdown格式来引⽤PDF内容：

- 格式： [[page_num, line_num]]

- 前端渲染：当Markdown渲染器解析到这个格式时，⾃动转换成⼀个可点击的标签（如： 第 5 

⻚第 12 ⾏ ）。

- 交互逻辑：⽤⼾点击标签->左侧PDF预览区⾃动通过 scrollTo 滚动到对应坐标并闪烁⾼亮。

## 4. DeepSeek对话输出显⽰

- 对话组件必须⽀持LaTeX和Markdown渲染。因为我们需要处理⼤量的LaTeX公式（数学/物理论

⽂核⼼）、Markdown语法（解构看板核⼼）以及我们⾃定义的PDF引⽤锚点。

渲染引擎选型

为了保证性能和扩展性，我们采⽤React-Markdown⽣态链，因为它具有极强的插件化能⼒。

- 基础渲染： react-markdown 。

- 数学公式： remark-math (解析)+ rehype-katex (渲染)。

---

- 代码⾼亮： react-syntax-highlighter (⽀持Prism或hljs)。

- 安全性： rehype-raw (慎⽤，需配合 sanitize )。

LaTeX公式渲染逻辑(MathSupport)

学术论⽂中存在⼤量⾏内公式（如$E=mc^2$）和块级公式。

- 匹配规则：

◦ ⾏内： $ ... $

◦ 块级： $$...$$

- 性能优化：

◦ KaTeX渲染⽐MathJax快得多。我们需要在全局引⼊ katex.min.css 。

◦ 流式预处理：由于DeepSeek在流式输出时可能会先输出⼀个 $ ，导致公式解析器暂时失效。

我们需要⼀个正则缓冲区，确保公式闭合后再进⾏KaTeX渲染，防⽌⻚⾯闪烁。

⾃定义渲染器(CustomComponents)

这是PaperPilot的特⾊功能。我们需要改写 react-markdown 的默认组件⾏为，插⼊我们的业务
逻辑。

## 1.PDF引⽤锚点渲染(CitationLink)

- 逻辑：识别⽂本中的 [[page, line]] 标记。

- 实现：

```ts
const components = {
  text: ({ value }) => {
    const regex = /\[\[(\d+),\s*(\d+)\]\]/g;
    // 将文本替换为具有点击事件的 <Badge> 组件
    return value.split(regex).map(...);
  }
}
```

- 效果：渲染为⼀个带图标的深蓝⾊⼩标签。点击后，调⽤ usePDFStore.scrollTo(page, 

line) 。

## 2.思考流展⽰区(ThinkingBox)

- UI表现：对话⽓泡顶部⼀个浅灰⾊、带“逻辑脑”图标的折叠框。

---

- 状态联动：

◦ 当 isThinking 为真时，折叠框内部显⽰流式的 reasoning_content 。

◦ 当 isThinking 结束，折叠框默认收起，⽤⼾可⼿动展开查看学⻓的“⼼路历程”。

样式规范与交互设计(UXDetails)

## 1.Markdown样式类(Typography)

使⽤ @tailwindcss/typography 插件，但需要针对对话⽓泡进⾏微调：

- 表格(Table)：学术论⽂常有对⽐表，必须⽀持全宽展⽰、带边框、隔⾏变⾊。

- 列表(List)：区分有序列表和⽆序列表。

- 引⽤(Blockquote)：⽤于展⽰论⽂中的原话，左侧带粗边。

## 2.流式⾃动滚动(Auto-scroll)

- 逻辑：当AI正在输出时，如果当前滚动条在底部，则随着内容增加⾃动向下滚动。

- 防⽌抖动：如果⽤⼾⼿动向上滚动查看历史，则暂停⾃动滚动。

## 5. AI预解析

等待期的交互增强(TheParsingUI)

为了消解⽤⼾在预解析时的焦虑，前端需根据解析的流式状态同步反馈：

## 1. 0-3s(本地处理)：UI显⽰“茶茶正在帮你翻开书⻚...”。

## 2. 3-8s(AI宏观扫描)：UI显⽰“茶茶正在概括论⽂⼤意...”。

3. 8-15s(逻辑埋点)：UI显⽰“茶茶正在寻找值得讨论的重点...”并逐步在PDF上渲染出第⼀批波浪

线。

预解析的三⼤⽬标

- 结构化映射：提取⽬录、标题、公式坐标，建⽴“坐标->语义”的映射表。

- 语义提炼：⽣成Motivation（动机）、Method（⽅法）、Results（结果）、Gap（局限）的初步

结论。

- 交互布点：预判论⽂难点，⽣成3-5个苏格拉底式提问的“埋点”。

详细执⾏步骤(Workflow)

第⼀阶段：本地预处理(Client-sideExtraction)

在请求AI之前，前端利⽤ pdf.js 进⾏特征提取，减轻AI的上下⽂压⼒。

- ⽂本流清洗：提取全⽂⽂本，去除⻚码、⻚眉⻚脚等噪⾳。

---

- ⽬录解析：通过字体⼤⼩和粗细判断H1/H2标题，⽣成JSON⼤纲。

- 图⽚/公式定位：记录图中Figure和Table的具体⻚码位置，⽣成 Assets_Map 。

第⼆阶段：AI级联解析(AIMulti-passProcessing)

由于PDF全⽂可能超过5万字，直接投喂会丢失细节。我们采⽤“快速扫描+深度采样”的策略。

Step1:宏观扫描(MacroScan)

- 输⼊：Abstract+Introduction+Conclusion。

- 任务：⽣成“⼀键解构”看板的初步草稿。

- 产出：核⼼研究⽬标、主要贡献、结论。

Step2:难点嗅探(LogicProbing)

- 输⼊：Methodology部分的核⼼段落+关键公式。

- 任务：识别论⽂中最难懂、最具逻辑跨度的部分。

- 产出：3-5个[坐标+引导话术]。

◦ ⽰例： { page: 5, rect: [x,y,w,h], query: "学弟，这个损失函数⾥加的这个惩

罚项，你觉得是为了防⽌过拟合还是加速收敛？" }

Step3:术语发现(GlossaryMining)

- 任务：⽐对当前⽤⼾的 glossary 表，发现⽂中出现的新⽣可能不懂的专有名词（如：

Backpropagation,AttentionMask）。

- 产出：建议存⼊术语表的词条。

提⽰词⼯程(PromptOrchestration)

预解析不是⼀次简单的总结，⽽是⼀次“深层语义扫描”。我们将使⽤StructuredPrompting（结

构化提⽰词）策略，强制要求AI产出符合前端数据结构的JSON。

A.预解析全局系统提⽰词(Pre-parsingSystemPrompt)

Role:你是PaperPilot的智能中枢「茶茶学⻓」。你现在拥有⼀篇论⽂的全⽂⽂本（已清洗）。你

的任务是充当“先遣队”，为⽤⼾建⽴阅读地图。

TaskObjectives:

1. 核⼼解构：提取论⽂的四⼤⽀柱（Motivation,Method,Result,Gap）。

## 2. 逻辑锚点：寻找3-5处论⽂中最具启发性、或逻辑转折最硬核的段落。

## 3. 知识发现：识别出5个对新⼿有⻔槛的领域专有名词。

OutputRequirement:必须且只能输出标准JSON格式，严禁任何解释性⽂字。

ReasoningLogic(思考路径):

- 优先扫描Introduction寻找Motivation。

---

- 扫描Experiment寻找Results，并与Abstract⾥的结论对⻬。

- 寻找诸如"However","Incontrast","Wepropose"等关键词定位逻辑转折点。

B.输⼊内容模版(UserPromptConstruction)

前端会将PDF提取出的信息按以下格式拼接后发送给DeepSeek：

```md
--- 论文元数据 ---
Title: {{title}}
Authors: {{authors}}

--- 结构化文本片段 ---
[Abstract]: {{abstract_text}}
[Introduction]: {{intro_chunks}}
[Methods]: {{method_chunks}}
[Conclusion]: {{conclusion_text}}

--- 任务指令 ---
请基于上述内容，完成预解析任务，并为每个“逻辑锚点”提供在原文中的精确字符串片段（用于前端定位）。
```

C.预期输出数据结构(ExpectedJSONSchema)

为了让前端（如 Dexie.js ）能⽆缝解析，AI返回的JSON必须严格遵循以下格式：

```json
{
  "deconstruction": {  // 对应右侧“解构看板”数据
    "motivation": "作者认为现有的 [A技术] 在处理 [B场景] 时存在 [C缺陷]，因此提出此方案。",
    "method": "核心是引入了 [X机制]，通过 [Y算法] 实现了对 [Z变量] 的动态调整。",
    "result": "在 [Dataset] 上准确率提升了 15%，且计算开销降低了 20%。",
    "gap": "该方法在 [极端长文本] 场景下的表现尚未验证，且对 [硬件A] 有依赖。"
  },
  "logic_anchors": [ // 对应 PDF 上的“智能波浪线”
    {
      "anchor_text": "Specifically, we replace...", // 关键！这是原文的文本片段
      "page_hint": 4, // 缩小搜索范围，提高性能
      "chacha_comment": "学弟，注意看这里..." // 点击波浪线后，对话框的首句引导语
    }
  ],
  "suggested_glossary": [ // 对应术语预存建议
    { "term": "Ablation Study", "category": "General Academic" },
    { "term": "Transformer", "category": "Domain Specific" }
  ]
}
```

数据落地逻辑(DataHydration)

解析完成后，数据必须⽴即持久化到IndexedDB，以保证“瞬时加载”体验。

IndexedDB paper_analysis 数据结构：

```json
{
  paperId: "hash_id",
  deconstruction: {
    motivation: "...",
    method: "...",
    result: "...",
    gap: "..."
  },
  hints: [
    { page: 2, position: {x,y}, text: "...", chachaQuestion: "..." }
  ],
  status: "analyzed"
}
```

## 6. PDF虚拟渲染

对于⼀个需要同时承载PDF渲染、TextLayer划词、SVG波浪线、术语⾼亮这四层复杂交互的项⽬来

说，虚拟渲染（VirtualRendering/Windowing）不是“锦上添花”，⽽是“⽣存基⽯”。

如果⼀次性加载⼀篇50⻚的论⽂（每⻚包含⼤量Canvas像素和数千个DOM节点），内存占⽤会迅

速飙升⾄2GB以上，导致低配设备浏览器直接崩溃。

以下是针对PaperPilot的PDF虚拟渲染技术⽅案。

核⼼原理：视⼝驱动的按需加载

虚拟渲染的核⼼是：只渲染⽤⼾“看得⻅”的那⼏⻚，销毁“看不⻅”的Canvas以释放内存。

- 渲染窗⼝（Buffer）：设定当前视⼝⻚为$N$，则实际渲染范围为$[N-1,N,N+1]$。

- 占位容器（Placeholder）：未渲染的⻚⾯使⽤⼀个与原⻚⾯⽐例⼀致的空⽩ div 撑开⾼度，确

保滚动条的⻓度和位置始终准确。

技术实现路径

---

⻚⾯⾼度预估与占位

在PDF加载之初（ getDocument 成功后），我们需要先获取每⼀⻚的原始⽐例（Viewbox）。

- ⽅案：遍历 pdf.getPage(i) 获取宽和⾼，存⼊⼀个 pageRects 数组。

- 效果：计算出全书总⾼度。滚动条会根据这个总⾼度渲染，⽤⼾拖动滚动条时，⻚⾯不会发⽣“跳

动”。

滚动监听与动态装载(TheIntersectionObserver)

我们不使⽤传统的 onScroll 监听（性能差），⽽是使⽤ Intersection Observer 监控每个
⻚⾯的占位容器。

1. 进⼊视⼝：当⻚⾯$N$的占位符进⼊视⼝->触发 pdf.getPage(N) 渲染。

## 2. 渲染优先级：

◦ Phase1:渲染 Canvas （最快让⽤⼾看到内容）。

◦ Phase2:延迟加载 TextLayer （⽤于划词和术语⾼亮）。

◦ Phase3:延迟加载 InteractionLayer （⽤于画AI波浪线）。

3. 离开视⼝：当⻚⾯离开视⼝超过2⻚距离->销毁Canvas对象，将DOM节点恢复为简单的占位

div 。

内存管理(MemoryManagement)

PDF.js的渲染⾮常耗费显存。

- 策略：显式调⽤ canvas.width = 0; canvas.height = 0; 来强制浏览器回收Canvas

占⽤的内存。

- 清理内容：同时清理该⻚在状态库（Zustand）中绑定的DOM引⽤，防⽌内存泄漏。

复杂性挑战：虚拟渲染下的“波浪线定位”

在虚拟渲染模式下，波浪线绘制⾯临⼀个悖论：AI给出的波浪线在第10⻚，但⽤⼾现在在第1⻚，

第10⻚的DOM还没创建，怎么定位？

解决⽅案：延迟补偿机制(LazyCompensation)

1. 数据挂起：AI预解析产⽣的 logic_anchors 存⼊全局Store，标记状态为 pending 。

2. 滚动触发：当⽤⼾滚动到第10⻚，虚拟渲染引擎创建该⻚的 TextLayer 。

3. ⽣命周期钩⼦：在 TextLayer.onRenderSuccess 回调中，检查Store：“本⻚是否有待处

理的波浪线？”。

## 4. 实时渲染：如果有，此时再执⾏ anchor_text 匹配并绘制。

---

AI

AI 调用
调用模型为DeepSeek-V3.2（deepseek-chat 和 deepseek-reasoner）
【deepseek开发_API_key】sk-8a1378fd41a74eacb0a59ac42cffd14a

不同阶段给AI的prompt

详⻅同级PRD.md文档中「AI 部分（设置于Prompt）：苏格拉底式对话系统」部分

动态上下文组装
每次组装AI对话信息时，我们不发送全量的论文数据，而是根据用户的操作意图，发送“论文索引 + 局部切片 + 历史记忆”。
1. 基于 M2 预解析的“解构快照”
我们在 db.ts 的 papers 表中存储了 deconstruction 字段。
- 逻辑：当用户问宏观问题（如“这篇文章创新点在哪？”）时，我们只发送这几百字的解构 JSON。
- 效果：AI 不需要读完全文，就能基于预解析的“精华摘要”给出极其精准的回答。
2. 基于“当前视口”的上下文检索
我们在 .cursorrules 中定义了 PDF 的三层渲染架构。
- 逻辑：当用户在某一页提问时，前端会获取当前视口（Viewport）内的文字。
- Prompt 构造：
- "用户正在阅读第 5 页，当前页面的核心内容如下：[此处仅插入第 5 页文本]。请结合该背景回答用户的问题。"
3. 基于“划词/锚点”的精准注入
- 逻辑：如果用户点击了“波浪线”或者进行了“划词提问”，我们会将划词内容currentSelection及其前后 500 字的“邻近文本”activeContext发送给 AI。
- 效果：这模拟了人类的思维方式——盯着哪一段，就只讨论哪一段。
在 ai.service.ts 中，我们组装 Prompt 的逻辑伪代码如下：

```ts
// 组装发给 DeepSeek 的最终 Payloadconst payload = {
  model: "deepseek-v3",
  messages: [
    { role: "system", content: `你现在是茶茶学长...${systemParts}` },    // 全局prompt
    { role: "system", content: `当前论文解构：${paper.deconstruction}` }, // 基础背景
    { role: "system", content: `视口上下文：${activeContext}` }, // 局部细节
    { role: "system", content: `当前划词：${currentSelection}` }, // 局部细节
    ...chatHistory, // 最近 10 条对话历史
    { role: "user", content: userInput }
  ]
};
```


数据模型设计(DatabaseSchema)

LocalStorage 核心配置快照表

| Key | 类型 | 说明 | 为什么非存 LS 不可？ |
| :--- | :--- | :--- | :--- |
| **PP_HAS_GUIDED** | `boolean` | **新手引导完成标志**。`true` 表示用户已完成 M1。 | 页面加载的第一时间就要判断：是直接展示 M2 工作台，还是强行弹起 M1 教学框。如果存 IDB 异步读取，会导致页面先闪现 M2 再跳 M1。 |
| **PP_LAST_PAPER_ID** | `string` | **上次阅读论文 ID** (格式如 `hash_12345`)。 | 实现“回到上次读到的那篇论文”的快速定位逻辑。 |

IndexedDB表结构(Dexie定义)

(1) papers 表

- 关键点：我们把 fileData 直接存⼊IndexedDB。这样⽤⼾刷新⻚⾯或断⽹时，不需要重新上

传，实现“秒开”。

---

- 解构字段：预解析完成后直接存⼊，不再重复请求AI。

(2) anchors 表(波浪线)

- 关键点：存储 anchorText ⽽不是固定坐标。每次⻚⾯加载时，根据 anchorText 动态计算

当前缩放⽐下的 rects 。

(3) messages 表(对话流)

- 关键点： reasoning 字段单独存储。UI渲染时可以根据这个字段是否存在来展⽰“思考折叠

框”。

- 同步位： isMemorySynced 标记该消息是否已经被Mem0提取成“⻓效记忆”。

(4) glossary 表(术语库)

- 关键点： word 作为主键，⽅便在全站PDF阅读时进⾏快速匹配（AC⾃动机的数据源）。

(5) userProfile 表(画像层)【未来启⽤】

- 关键点：记录⽤⼾的“认知状态”。例如： { key: 'math_level', value: 

'advanced' } 。这部分数据将作为⻓效记忆的本地副本。

```ts
// db.ts - Dexie 数据库定义
import Dexie, { type Table } from 'dexie';

export interface Paper {
  id: string;               // 文件 MD5 哈希作为唯一 ID
  title: string;
  fileData: ArrayBuffer;    // PDF 原始二进制数据
  status: 'reading' | 'archived'; // 阅读中或已存档
  progress: number;         // 阅读进度 (0-1)
  lastReadTime: number;     // 时间戳
  deconstruction: {         // M2 预解析的解构看板数据
    motivation: string;
    method: string;
    result: string;
    gap: string;
  };
}

export interface LogicAnchor {
  id: string;               // 锚点 ID
  paperId: string;          // 所属论文
  pageHint: number;         // 页码建议
  anchorText: string;       // 匹配的原文文本
  chachaComment: string;    // 茶茶的初始提问
  rects: any[];             // 前端计算出的坐标缓存（选填，缩放后需更新）
}

export interface Message {
  id?: number;              // 自增 ID
  paperId: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;       // DeepSeek 的思考流内容
  timestamp: number;
  isMemorySynced: boolean;  // 是否已同步到长效记忆(Mem0)
}

export interface Glossary {
  word: string;             // 术语原文（主键）
  explanation: string;      // 茶茶大白话解释
  sourcePaperId: string;    // 来源论文 ID
  addedTime: number;
  masteryLevel: number;     // 掌握度 (0-1)，用于“学习模式”
}

export interface UserProfile {
  key: string;              // 'learning_style', 'academic_level' 等
  value: any;
}

// 定义 Dexie 实例
export class PaperPilotDB extends Dexie {
  papers!: Table<Paper>;
  anchors!: Table<LogicAnchor>;
  messages!: Table<Message>;
  glossary!: Table<Glossary>;
  userProfile!: Table<UserProfile>;

  constructor() {
    super('PaperPilotDB');
    this.version(1).stores({
      papers: 'id, title, status, lastReadTime', // 索引字段
      anchors: 'id, paperId',
      messages: '++id, paperId, timestamp, isMemorySynced',
      glossary: 'word, sourcePaperId, addedTime',
      userProfile: 'key'
    });
  }
}

export const db = new PaperPilotDB();
```

---

代码规范&可维护性

⼀、宏观架构约束(MacroArchitecture)

1. 数据为王：所有交互状态需在Zustand中同步，所有持久化数据存⼊IndexedDB。

## 2. 性能⾄上：PDF渲染需⽀持虚拟列表，术语匹配需⾛WebWorker。

3. ⼈设对⻬：AI回复组件必须⽀持LaTeX和思考流折叠，且语⽓需符合‘茶茶学⻓’⼈设。

4. 代码整洁：遵循分层架构，View层不写业务逻辑，Service层不操作DOM。”

分层设计原则(The3-TierLayering)

项⽬严格遵守“逻辑与视图分离”的三层架构，严禁在UI组件内直接书写复杂的算法或数据库查

询。

- ViewLayer(ReactComponents):仅负责UI渲染和响应⽤⼾事件。

- ServiceLayer(PureTSClasses):核⼼逻辑层。包括 AIService 、 DBService 、

PDFParser 。

- DataLayer(Storage):封装对IndexedDB(Dexie)和LocalStorage的访问。

PDF三层夹⼼组件模型(TheSandboxModel)

PDF容器必须严格遵守 Relative-Absolute 布局，确保坐标系对⻬：

## 1. Bottom:CanvasLayer(负责显⽰， z-index: 1 )

2. Middle:TextLayer(负责划词，透明， z-index: 2 )

3. Top:InteractionLayer(SVG/Canvas，负责波浪线， z-index: 3 , pointer-events: 

none )

⼆、重点微观代码规范(MicroCodingStandards)

状态管理规范(ZustandSlices)

禁⽌建⽴单⼀巨⼤的Store。根据业务领域切分为Slices：

- usePaperStore :维护当前PDF的 scale , rotation , currentPage , anchors 。

- useChatStore :维护 messages 数组、 isThinking 状态、 reasoningContent 。

- 约束:严禁在Store中存储⾮序列化的对象（如PDF.js的原⽣Document对象），只存储基础类型

和简单JSON。

异步与性能规范

---

- WebWorker:凡是涉及全⽂匹配（AC⾃动机）或⼤型⽂本清洗的操作，必须放⼊

src/workers/ 下。

- Virtualization:PDF列表渲染必须使⽤ react-window 或同类思想，离开视⼝的 Canvas 必

须通过 canvas.width = 0 释放内存。

- EffectCleanup:所有的 useEffect 必须包含完整的 cleanup 函数（取消API请求、移除

EventListener），防⽌内存泄漏。

类型安全(TypeScript)

- NoAny:严禁使⽤ any 。所有API返回值、DB表记录必须定义 interface 。

- DiscriminatedUnions:消息体推荐使⽤辨别联合类型：

- TypeScript

```ts
type Message = { role: 'user'; content: string } | { role: 'assistant'; content: string; reasoning?: string };
```

## 三、核⼼模块实现详述(CoreModuleSpecs)

PDF渲染器逻辑(PageRenderer.tsx)

AI编写此组件时必须满⾜：

- Props:接收 pageNumber , scale , onTextLayerRendered 。

- Logic:

a. 检测进⼊视⼝后再调⽤ page.render() 。

b. 渲染完成后，⽴即通知 InteractionLayer 执⾏波浪线⽐对。

划词菜单拦截逻辑

- 监听 TextLayer 的 mouseup 事件。

- 使⽤ window.getSelection() 获取选区，并计算 rect = 

range.getBoundingClientRect() 。

- 若选区为空，⽴即销毁菜单；若不为空，计算菜单位置并显⽰。

## 四、项⽬⽂件树规约(FolderStructure)

```text
src/
├── app/                  # Next.js App Router 路由
├── components/           # UI 视图
│   ├── m1/               # 新手引导专属组件
│   ├── m2/               # 核心实验室组件 (PDFView, ChatPanel, DeconBoard)
│   └── ui/               # Shadcn UI 原子组件
├── services/             # 业务逻辑 (Class/Function)
│   ├── ai.service.ts     # 封装 DeepSeek 流式请求
│   ├── db.service.ts     # Dexie 初始化与 CRUD
│   └── search.worker.ts  # AC 自动机 Web Worker
├── store/                # Zustand Stores
├── types/                # .d.ts 定义
└── lib/                  # 工具函数 (PDF坐标转换, 格式化)
```