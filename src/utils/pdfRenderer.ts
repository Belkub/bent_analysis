import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker to load from reliable CDN matching installed version
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
}

export interface PdfNativeItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfPageRenderResult {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  width: number;
  height: number;
  extractedText: string;
  nativeItems: PdfNativeItem[];
}

export interface PdfDocumentInfo {
  numPages: number;
  pageTitles: string[];
}

/**
 * Loads a PDF file and returns document metadata and page renderer with native text/geometry extraction
 */
export async function loadPdfDocument(file: File | Blob): Promise<{
  numPages: number;
  renderPage: (pageNumber: number, scale?: number) => Promise<PdfPageRenderResult>;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  return {
    numPages: pdf.numPages,
    renderPage: async (pageNumber: number, scale = 2.0): Promise<PdfPageRenderResult> => {
      const clampedPage = Math.max(1, Math.min(pageNumber, pdf.numPages));
      const page = await pdf.getPage(clampedPage);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas 2D context unavailable for PDF rendering');
      }

      const renderContext = {
        canvasContext: context,
        viewport,
      };

      await page.render(renderContext).promise;

      // Extract native PDF text with exact canvas coordinates
      let extractedText = '';
      const nativeItems: PdfNativeItem[] = [];

      try {
        const textContent = await page.getTextContent();
        for (const item of textContent.items as any[]) {
          if (!item || typeof item.str !== 'string') continue;
          const str = item.str;
          if (!str.trim()) continue;

          extractedText += str + ' ';

          // Transform PDF user space coordinates to canvas pixel space
          const tx = item.transform?.[4] ?? 0;
          const ty = item.transform?.[5] ?? 0;

          let vx = 0;
          let vy = 0;

          if (typeof viewport.convertToViewportPoint === 'function') {
            const pt = viewport.convertToViewportPoint(tx, ty);
            vx = pt[0];
            vy = pt[1];
          } else {
            vx = tx * scale;
            vy = viewport.height - ty * scale;
          }

          const fontHeight = Math.abs(item.transform?.[3] ?? item.height ?? 12) * scale;
          const itemWidth = (item.width ?? (str.length * 6)) * scale;

          // In PDF, (vx, vy) is text baseline; box top is vy - fontHeight
          nativeItems.push({
            str: str.trim(),
            x: Math.round(vx),
            y: Math.round(vy - fontHeight * 0.85),
            width: Math.max(12, Math.round(itemWidth)),
            height: Math.max(10, Math.round(fontHeight)),
          });
        }
      } catch (e) {
        console.warn('Could not extract native PDF text items, fallback to image OCR', e);
      }

      return {
        canvas,
        dataUrl: canvas.toDataURL('image/png'),
        width: canvas.width,
        height: canvas.height,
        extractedText: extractedText.trim(),
        nativeItems,
      };
    },
  };
}
