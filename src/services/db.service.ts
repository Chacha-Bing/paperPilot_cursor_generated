/**
 * db.service - IndexedDB 业务封装
 *
 * 封装 papers、anchors、messages 的 CRUD，供 UI 层调用。
 * 所有持久化必须通过此服务或 db 直接访问，禁止使用 LocalStorage 存大型数据。
 */
import {
  db,
  type LogicAnchorRecord,
  type MessageRecord,
  type PaperRecord
} from "@/lib/db";

export class DBService {
  public async getLatestPaper(): Promise<PaperRecord | undefined> {
    return db.papers.orderBy("lastReadTime").last();
  }

  public async getAllPapers(): Promise<PaperRecord[]> {
    return db.papers.orderBy("lastReadTime").reverse().toArray();
  }

  public async savePaper(record: PaperRecord): Promise<void> {
    await db.papers.put(record);
  }

  public async updatePaperDeconstruction(
    paperId: string,
    deconstruction: PaperRecord["deconstruction"]
  ): Promise<void> {
    const paper = await db.papers.get(paperId);
    if (!paper) return;
    await db.papers.update(paperId, {
      deconstruction,
      lastReadTime: Date.now()
    });
  }

  public async saveAnchors(paperId: string, anchors: LogicAnchorRecord[]): Promise<void> {
    await db.anchors.where("paperId").equals(paperId).delete();
    await db.anchors.bulkAdd(anchors);
  }

  public async getAnchors(paperId: string): Promise<LogicAnchorRecord[]> {
    return db.anchors.where("paperId").equals(paperId).toArray();
  }

  public async getMessages(paperId: string, limit?: number): Promise<MessageRecord[]> {
    const q = db.messages.where("paperId").equals(paperId);
    if (limit) {
      const all = await q.reverse().limit(limit).toArray();
      return all.reverse();
    }
    return q.sortBy("timestamp");
  }

  public async addMessage(record: Omit<MessageRecord, "id">): Promise<number> {
    return db.messages.add({
      ...record,
      isMemorySynced: false
    });
  }

  /**
   * 从 File 对象构建并保存 PaperRecord。
   */
  public async savePaperFromFile(file: File): Promise<PaperRecord> {
    const buffer = await file.arrayBuffer();
    const id = `${file.name}-${file.size}-${file.lastModified}`;

    const record: PaperRecord = {
      id,
      title: file.name,
      fileData: buffer,
      status: "reading",
      progress: 0,
      lastReadTime: Date.now(),
      deconstruction: {
        motivation: "",
        method: "",
        result: "",
        gap: ""
      }
    };

    await db.papers.put(record);
    return record;
  }
}

