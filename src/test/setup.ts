/**
 * Vitest 全局 setup
 *
 * - 注入 fake-indexeddb，使 IndexedDB 在 Node 环境可用
 * - 必须在导入 db 或 Dexie 之前执行
 */
import "fake-indexeddb/auto";
