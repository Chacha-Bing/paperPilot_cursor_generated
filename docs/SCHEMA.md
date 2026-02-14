# Database Schema (IndexedDB via Dexie.js)

## Tables
- `papers`: `id, title, fileData, status, progress, lastReadTime, deconstruction`
- `anchors`: `id, paperId, pageHint, anchorText, chachaComment`
- `messages`: `++id, paperId, role, content, reasoning, timestamp, isMemorySynced`
- `glossary`: `word, explanation, sourcePaperId, addedTime, masteryLevel`
- `userProfile`: `key, value` (存储上一次阅读 ID 等配置)