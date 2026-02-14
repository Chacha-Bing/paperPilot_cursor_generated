/**
 * db.ts - IndexedDB 模型定义（Dexie）
 *
 * 表：papers（论文）、anchors（逻辑锚点）、messages（对话）、glossary（术语）、userProfile（用户配置）
 * 所有持久化数据存于此，禁止用 LocalStorage 存大型数据。
 */
import Dexie, { type Table } from "dexie";

export interface PaperRecord {
  id: string;
  title: string;
  fileData: ArrayBuffer;
  status: "reading" | "archived";
  progress: number;
  lastReadTime: number;
  deconstruction: {
    motivation: string;
    method: string;
    result: string;
    gap: string;
  };
}

export interface LogicAnchorRecord {
  id: string;
  paperId: string;
  pageHint: number;
  anchorText: string;
  chachaComment: string;
  rects?: Array<unknown>;
}

export interface MessageRecord {
  id?: number;
  paperId: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  timestamp: number;
  isMemorySynced: boolean;
}

export interface GlossaryRecord {
  word: string;
  explanation: string;
  sourcePaperId: string;
  addedTime: number;
  masteryLevel: number;
}

export interface UserProfileRecord {
  key: string;
  value: unknown;
}

class PaperPilotDB extends Dexie {
  public papers!: Table<PaperRecord>;
  public anchors!: Table<LogicAnchorRecord>;
  public messages!: Table<MessageRecord>;
  public glossary!: Table<GlossaryRecord>;
  public userProfile!: Table<UserProfileRecord>;

  public constructor() {
    super("PaperPilotDB");

    this.version(1).stores({
      papers: "id, title, status, lastReadTime",
      anchors: "id, paperId",
      messages: "++id, paperId, timestamp, isMemorySynced",
      glossary: "word, sourcePaperId, addedTime",
      userProfile: "key"
    });
  }
}

export const db = new PaperPilotDB();

