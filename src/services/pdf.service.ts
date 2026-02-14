/**
 * pdf.service - PDF 加载、文本提取、渲染
 *
 * 使用 pdfjs-dist，Worker 通过 jsDelivr CDN 加载。
 * extractTextForPreparse 用于预解析，getPageText 用于划词/术语匹配。
 */
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist/types/src/display/api";
import { searchTermsInWorker } from "./ac-search.service";

export interface LoadedPdf {
  doc: PDFDocumentProxy;
}

export interface PageTextResult {
  pageNumber: number;
  text: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfJsModule = any;

export class PdfService {
  private pdfjsPromise: Promise<PdfJsModule> | null = null;

  private async getPdfJs(): Promise<PdfJsModule> {
    if (!this.pdfjsPromise) {
      this.pdfjsPromise = import("pdfjs-dist");
    }
    const pdfjs = await this.pdfjsPromise;

    // 只在浏览器环境下配置 workerSrc，避免在 Node 端访问 DOM 相关对象。
    // 使用 jsDelivr 拉取与当前 pdfjs-dist 同版的 worker（需与 package.json 中版本一致）。
    if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs";
    }

    return pdfjs;
  }

  public async loadFromArrayBuffer(buffer: ArrayBuffer): Promise<LoadedPdf> {
    const { getDocument } = await this.getPdfJs();
    const loadingTask = getDocument({ data: buffer });
    const doc = (await loadingTask.promise) as PDFDocumentProxy;
    return { doc };
  }

  /**
   * 使用 pdf.js 内置 TextLayer，确保与 Canvas 完美对齐。
   */
  public async renderTextLayer(
    doc: PDFDocumentProxy,
    pageNumber: number,
    container: HTMLElement,
    scale: number
  ): Promise<void> {
    const page: PDFPageProxy = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const textContent = await page.getTextContent();

    container.innerHTML = "";
    container.classList.add("textLayer");
    container.style.width = `${viewport.width}px`;
    container.style.height = `${viewport.height}px`;

    const pdfjs = await this.getPdfJs();
    const { TextLayer, setLayerDimensions } = pdfjs;
    setLayerDimensions(container as HTMLDivElement, viewport);

    const textLayer = new TextLayer({
      textContentSource: textContent,
      container: container as HTMLDivElement,
      viewport
    });

    await textLayer.render();
  }

  /**
   * 渲染到离屏 canvas 再复制到显示 canvas，避免「同一 canvas 多次 render」错误。
   * 使用 devicePixelRatio 提升高 DPI 屏幕清晰度。
   * 返回 { promise, cancel }，unmount 时调用 cancel()。
   */
  public renderPageToCanvas(
    doc: PDFDocumentProxy,
    pageNumber: number,
    canvas: HTMLCanvasElement,
    scale: number
  ): { promise: Promise<void>; cancel: () => void } {
    let task: { cancel: () => void } | null = null;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio ?? 1 : 1;
    const renderScale = scale * Math.min(2, dpr);
    const promise = (async () => {
      const page: PDFPageProxy = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const renderViewport = page.getViewport({ scale: renderScale });
      const offscreen = document.createElement("canvas");
      offscreen.width = renderViewport.width;
      offscreen.height = renderViewport.height;
      const ctx = offscreen.getContext("2d");
      if (!ctx) return;
      const renderTask = page.render({
        canvasContext: ctx,
        canvas: offscreen,
        viewport: renderViewport
      });
      task = { cancel: () => renderTask.cancel() };
      await renderTask.promise;
      const displayCtx = canvas.getContext("2d");
      if (!displayCtx) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      displayCtx.drawImage(offscreen, 0, 0, renderViewport.width, renderViewport.height, 0, 0, viewport.width, viewport.height);
    })();
    return {
      promise,
      cancel: () => task?.cancel()
    };
  }

  /**
   * 在页面中查找文本的边界框（viewport 坐标），用于波浪线精确定位。
   * 支持跨多个 text item 的长文本，返回整体包围盒。
   */
  public async findTextRects(
    doc: PDFDocumentProxy,
    pageNumber: number,
    searchText: string,
    scale: number
  ): Promise<Array<{ x: number; y: number; width: number; height: number }> | null> {
    const page: PDFPageProxy = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const textContent = await page.getTextContent();
    const items = textContent.items as Array<{ str: string; transform: number[]; width: number; height: number }>;
    const fullText = items.map((i) => i.str).join("");
    const search = searchText.trim();
    let idx = fullText.indexOf(search);
    let endIdx = idx >= 0 ? idx + search.length : 0;

    if (idx < 0) {
      const head = search.slice(0, Math.min(100, search.length)).trim();
      if (head.length >= 20) {
        idx = fullText.indexOf(head);
        if (idx >= 0) endIdx = idx + head.length;
      }
    }
    if (idx < 0) return null;
    let charCount = 0;
    let minLeft = Infinity;
    let minTop = Infinity;
    let maxRight = -Infinity;
    let maxBottom = -Infinity;

    for (const item of items) {
      const len = item.str.length;
      const itemStart = charCount;
      const itemEnd = charCount + len;
      charCount = itemEnd;

      if (itemEnd <= idx || itemStart >= endIdx) continue;

      const x = item.transform[4] ?? 0;
      const y = item.transform[5] ?? 0;
      const w = item.width;
      const h = item.height;
      const pdfRect = [x, y - h, x + w, y];
      const vpRect = viewport.convertToViewportRectangle(pdfRect);
      const left = Math.min(vpRect[0] ?? 0, vpRect[2] ?? 0);
      const right = Math.max(vpRect[0] ?? 0, vpRect[2] ?? 0);
      const top = Math.min(vpRect[1] ?? 0, vpRect[3] ?? 0);
      const bottom = Math.max(vpRect[1] ?? 0, vpRect[3] ?? 0);

      minLeft = Math.min(minLeft, left);
      minTop = Math.min(minTop, top);
      maxRight = Math.max(maxRight, right);
      maxBottom = Math.max(maxBottom, bottom);
    }

    if (minLeft === Infinity) return null;
    return [
      {
        x: minLeft,
        y: minTop,
        width: maxRight - minLeft,
        height: maxBottom - minTop
      }
    ];
  }

  /**
   * 在页面中查找多个术语的边界框，用于术语库全局高亮。
   * 使用 AC 自动机 Web Worker 一次扫描，避免主线程阻塞。
   * 返回 { term, rect }[]，未匹配的术语不包含在结果中。
   */
  public async findTermRects(
    doc: PDFDocumentProxy,
    pageNumber: number,
    terms: string[],
    scale: number
  ): Promise<Array<{ term: string; rect: { x: number; y: number; width: number; height: number } }>> {
    const page: PDFPageProxy = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const textContent = await page.getTextContent();
    const items = textContent.items as Array<{
      str: string;
      transform: number[];
      width: number;
      height: number;
      fontName?: string;
    }>;
    const styles = (textContent as { styles?: Record<string, { fontFamily?: string }> }).styles ?? {};
    const fullText = items.map((i) => i.str).join("");

    const matches = await searchTermsInWorker(fullText, terms);
    const results: Array<{ term: string; rect: { x: number; y: number; width: number; height: number } }> = [];

    const ctx =
      typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;

    for (const { term, start, end } of matches) {
      const rect = this.charRangeToRect(items, styles, viewport, start, end, ctx);
      if (rect) results.push({ term, rect });
    }

    return results;
  }

  /**
   * 将字符范围 [start, end) 映射为 viewport 矩形。
   * 使用 measureText 按实际字符宽度比例裁剪，避免比例字体导致的偏移。
   */
  private charRangeToRect(
    items: Array<{ str: string; transform: number[]; width: number; height: number; fontName?: string }>,
    styles: Record<string, { fontFamily?: string }>,
    viewport: { convertToViewportRectangle: (r: number[]) => number[] },
    idx: number,
    endIdx: number,
    ctx: CanvasRenderingContext2D | null
  ): { x: number; y: number; width: number; height: number } | null {
    let charCount = 0;
    let minLeft = Infinity;
    let minTop = Infinity;
    let maxRight = -Infinity;
    let maxBottom = -Infinity;

    for (const item of items) {
      const len = item.str.length;
      const itemStart = charCount;
      const itemEnd = charCount + len;
      charCount = itemEnd;

      const overlapStart = Math.max(idx, itemStart);
      const overlapEnd = Math.min(endIdx, itemEnd);
      if (overlapStart >= overlapEnd) continue;

      const x = item.transform[4] ?? 0;
      const y = item.transform[5] ?? 0;
      const w = item.width;
      const h = item.height;

      const offsetInItem = overlapStart - itemStart;
      const overlapLen = overlapEnd - overlapStart;

      let fracStart: number;
      let fracLen: number;

      if (ctx && item.str) {
        const fontFamily = styles[item.fontName ?? ""]?.fontFamily ?? "sans-serif";
        ctx.font = `${h}px ${fontFamily}`;
        const fullWidth = ctx.measureText(item.str).width;
        if (fullWidth > 0) {
          const beforeWidth = ctx.measureText(item.str.slice(0, offsetInItem)).width;
          const matchWidth = ctx.measureText(item.str.slice(offsetInItem, offsetInItem + overlapLen)).width;
          fracStart = beforeWidth / fullWidth;
          fracLen = matchWidth / fullWidth;
        } else {
          fracStart = offsetInItem / len;
          fracLen = overlapLen / len;
        }
      } else {
        fracStart = offsetInItem / len;
        fracLen = overlapLen / len;
      }

      const pdfLeft = x + fracStart * w;
      const pdfWidth = fracLen * w;
      const pdfRect = [pdfLeft, y - h, pdfLeft + pdfWidth, y];
      const vpRect = viewport.convertToViewportRectangle(pdfRect);
      const left = Math.min(vpRect[0] ?? 0, vpRect[2] ?? 0);
      const right = Math.max(vpRect[0] ?? 0, vpRect[2] ?? 0);
      const top = Math.min(vpRect[1] ?? 0, vpRect[3] ?? 0);
      const bottom = Math.max(vpRect[1] ?? 0, vpRect[3] ?? 0);

      minLeft = Math.min(minLeft, left);
      minTop = Math.min(minTop, top);
      maxRight = Math.max(maxRight, right);
      maxBottom = Math.max(maxBottom, bottom);
    }

    if (minLeft === Infinity) return null;
    return {
      x: minLeft,
      y: minTop,
      width: maxRight - minLeft,
      height: maxBottom - minTop
    };
  }

  /** 提取单页文本，用于预解析或划词。 */
  public async getPageText(
    doc: PDFDocumentProxy,
    pageNumber: number
  ): Promise<PageTextResult> {
    const page: PDFPageProxy = await doc.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ("str" in item ? (item as { str: string }).str : ""))
      .join("");
    return { pageNumber, text };
  }

  /** 提取前 N 页文本，用于 AI 预解析（Abstract + Intro + Methods + Conclusion）。 */
  public async extractTextForPreparse(
    doc: PDFDocumentProxy,
    maxPages: number = 10
  ): Promise<{ byPage: PageTextResult[]; fullText: string; totalPages: number }> {
    const totalPages = doc.numPages;
    const capped = Math.min(maxPages, totalPages);
    const byPage: PageTextResult[] = [];

    for (let i = 1; i <= capped; i++) {
      const result = await this.getPageText(doc, i);
      byPage.push(result);
    }

    const fullText = byPage
      .map((p) => `[Page ${p.pageNumber}]\n${p.text}`)
      .join("\n\n");

    return { byPage, fullText, totalPages };
  }
}

