import { createWorker } from 'tesseract.js';
import { OxideComposition } from '../types';
import { PdfNativeItem } from './pdfRenderer';

export type OxideKey =
  | 'SiO2'
  | 'Al2O3'
  | 'Fe2O3'
  | 'CaO'
  | 'MgO'
  | 'Na2O'
  | 'K2O'
  | 'TiO2'
  | 'MnO'
  | 'P2O5'
  | 'SO3';

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface DetectedToken {
  text: string;
  cx: number;
  cy: number;
  bbox: BoundingBox;
  lineIndex?: number;
  isOxide?: boolean;
  oxideKey?: OxideKey;
  isNumber?: boolean;
  numValue?: number;
}

export interface MatchedOxidePair {
  oxide: OxideKey;
  value: number;
  oxideToken: DetectedToken;
  numberToken: DetectedToken;
  distance: number;
  matchType: 'column' | 'row' | 'stream';
}

export interface TableOcrResult {
  oxides: OxideComposition;
  matchedPairs: MatchedOxidePair[];
  allNumbers: DetectedToken[];
  allOxideTokens: { oxide: OxideKey; token: DetectedToken }[];
  rawText: string;
  imageWidth: number;
  imageHeight: number;
  preprocessedDataUrl?: string;
  sourceType: 'native_pdf' | 'tesseract_ocr' | 'text_stream';
}

export const KNOWN_OXIDES: { key: OxideKey; label: string; formula: string }[] = [
  { key: 'SiO2', label: 'SiO₂', formula: 'Диоксид кремния' },
  { key: 'Al2O3', label: 'Al₂O₃', formula: 'Оксид алюминия' },
  { key: 'Fe2O3', label: 'Fe₂O₃', formula: 'Оксид железа (III)' },
  { key: 'CaO', label: 'CaO', formula: 'Оксид кальция' },
  { key: 'MgO', label: 'MgO', formula: 'Оксид магния' },
  { key: 'Na2O', label: 'Na₂O', formula: 'Оксид натрия' },
  { key: 'K2O', label: 'K₂O', formula: 'Оксид калия' },
  { key: 'TiO2', label: 'TiO₂', formula: 'Диоксид титана' },
  { key: 'MnO', label: 'MnO', formula: 'Оксид марганца' },
  { key: 'P2O5', label: 'P₂O₅', formula: 'Оксид фосфора (V)' },
  { key: 'SO3', label: 'SO₃', formula: 'Оксид серы (VI)' },
];

/**
 * Normalizes chemical formulas with broken or spaced subscripts
 * e.g. "Na 2 O" -> "Na2O", "Al 2 O 3" -> "Al2O3", "Fe 2 O 3" -> "Fe2O3"
 */
export function normalizeChemicalFormulasInText(text: string): string {
  return text
    // Al2O3 variations
    .replace(/(?:Al|Ал|A1|Ab|Ah|At)\s*[2z]?\s*[o0оOО]\s*[3з5s]?/gi, ' Al2O3 ')
    // Fe2O3 variations
    .replace(/(?:Fe|Фе|Fer|Fo)\s*[2z]?\s*[o0оOО]\s*[3з5s]?/gi, ' Fe2O3 ')
    // Na2O variations
    .replace(/(?:Na|На|Nu|Nd)\s*[2z]?\s*[o0оOО]/gi, ' Na2O ')
    // K2O variations
    .replace(/(?:K|К)\s*[2z]?\s*[o0оOО]/gi, ' K2O ')
    // P2O5 variations
    .replace(/(?:P|П)\s*[2z]?\s*[o0оOО]\s*[5s]?/gi, ' P2O5 ')
    // SiO2 variations
    .replace(/(?:Si|Си|Fi|S1|Di|Sl)\s*[o0оOО]\s*[2z]?/gi, ' SiO2 ')
    // TiO2 variations
    .replace(/(?:Ti|Ти|Tl)\s*[o0оOО]\s*[2z]?/gi, ' TiO2 ')
    // SO3 variations
    .replace(/(?:S|С)\s*[o0оOО]\s*[3з]?/gi, ' SO3 ')
    // MgO variations
    .replace(/(?:Mg|Мг|My|Mq)\s*[o0оOО]/gi, ' MgO ')
    // CaO variations
    .replace(/(?:Ca|Са|Cu|Cn)\s*[o0оOО]/gi, ' CaO ')
    // MnO variations
    .replace(/(?:Mn|Мн|Mu)\s*[o0оOО]/gi, ' MnO ');
}

export function cleanText(txt: string): string {
  return txt.replace(/[^a-zA-Z0-9а-яА-Я.,%_\-]/g, '').trim();
}

/**
 * Matches a string token to a known oxide key
 */
export function matchOxideKey(txt: string): OxideKey | null {
  const norm = txt
    .replace(/[\s\-:_=%]/g, '')
    .toUpperCase()
    .replace(/^АЛ/, 'AL')
    .replace(/^СИ/, 'SI')
    .replace(/^ФЕ/, 'FE')
    .replace(/^СА/, 'CA')
    .replace(/^МГ/, 'MG')
    .replace(/^НА/, 'NA')
    .replace(/^ТИ/, 'TI')
    .replace(/^МН/, 'MN')
    .replace(/^П/, 'P')
    .replace(/^С/, 'S');

  if (!norm || norm.length < 2) return null;

  // Exact or direct matches
  if (/^AL[2Z]?O[3З5S]?$/.test(norm) || /^AL2O3$/.test(norm) || /^ALO$/.test(norm)) return 'Al2O3';
  if (/^SIO[2Z]?$/.test(norm) || /^SI2O$/.test(norm) || /^SIO2$/.test(norm)) return 'SiO2';
  if (/^FE[2Z]?O[3З5S]?$/.test(norm) || /^FE2O3$/.test(norm) || /^FEO$/.test(norm)) return 'Fe2O3';
  if (/^CAO$/.test(norm) || /^CA0$/.test(norm)) return 'CaO';
  if (/^MGO$/.test(norm) || /^MG0$/.test(norm)) return 'MgO';
  if (/^NA[2Z]?O$/.test(norm) || /^NA20$/.test(norm) || /^NAZO$/.test(norm)) return 'Na2O';
  if (/^K[2Z]?O$/.test(norm) || /^K20$/.test(norm) || /^KZO$/.test(norm)) return 'K2O';
  if (/^TIO[2Z]?$/.test(norm) || /^TI2O$/.test(norm) || /^TIO2$/.test(norm)) return 'TiO2';
  if (/^MNO$/.test(norm) || /^MN0$/.test(norm)) return 'MnO';
  if (/^P[2Z]?O[5S]?$/.test(norm) || /^P2O5$/.test(norm)) return 'P2O5';
  if (/^SO[3З]?$/.test(norm) || /^SO3$/.test(norm)) return 'SO3';

  return null;
}

/**
 * Parses numeric percentage from token (supports decimal comma and dot, e.g. "28", "1,5", "3.2", "0,85%")
 */
export function extractNumber(txt: string): number | null {
  // If word looks like sample code "Пр-5", don't extract
  if (/(?:пр|пр-|sample|проба|№)/i.test(txt)) return null;

  const cleaned = txt.replace(/[^\d.,]/g, '').replace(',', '.');
  if (!cleaned) return null;

  const match = cleaned.match(/\d+(\.\d+)?/);
  if (match) {
    const num = parseFloat(match[0]);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      return num;
    }
  }
  return null;
}

/**
 * Score function for spatial distance between an oxide header and a number.
 * Adapts to both column-based tables and row-based lists/handwritten text.
 */
export function calculateSpatialScore(
  ox: { cx: number; cy: number },
  num: { cx: number; cy: number }
): { score: number; type: 'column' | 'row' } {
  const dx = num.cx - ox.cx;
  const dy = num.cy - ox.cy;

  // Column table: number is in the same column (X within column width) and directly below (dy > 0)
  let colScore = Infinity;
  if (dy > -15 && dy < 400) {
    // heavy weight on column X alignment
    colScore = Math.abs(dx) * 3.5 + Math.max(0, dy) * 1.0;
    if (dx < -60 || dx > 60) colScore += 500; // not same column
  }

  // Row list: number is on the same line (Y within line height) and to the right (dx > 0)
  let rowScore = Infinity;
  if (dx > -15 && dx < 600) {
    // heavy weight on line Y alignment
    rowScore = Math.max(0, dx) * 1.0 + Math.abs(dy) * 4.0;
    if (Math.abs(dy) > 50) rowScore += 500; // not same line
  }

  if (colScore <= rowScore) {
    return { score: colScore, type: 'column' };
  } else {
    return { score: rowScore, type: 'row' };
  }
}

/**
 * Parses table text stream directly (e.g. from PDF text or copied clipboard text)
 * Handles both:
 * 1) Column table: Header row of oxides followed by Data row of values
 * 2) Row list: Oxide - Value pairs (e.g. Al2O3 28%, SiO2 54%)
 */
export function parseTableFromTextStream(rawText: string): OxideComposition {
  const normalized = normalizeChemicalFormulasInText(rawText);
  // Remove sample ID numbers like "Пр-5" or "Проба 1" so they aren't parsed as concentration
  const sanitized = normalized.replace(/(?:пр(?:оба)?|sample|№|код)\s*[-_–—]?\s*\d+/gi, ' SAMPLE_TAG ');

  const tokens = sanitized.trim().split(/\s+/);
  const oxides: { oxide: OxideKey; index: number; token: string }[] = [];
  const numbers: { value: number; index: number; token: string }[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const ox = matchOxideKey(t);
    if (ox) {
      // avoid adjacent duplicate key
      if (!oxides.some((o) => o.oxide === ox && Math.abs(o.index - i) < 3)) {
        oxides.push({ oxide: ox, index: i, token: t });
      }
      continue;
    }

    const num = extractNumber(t);
    if (num !== null) {
      numbers.push({ value: num, index: i, token: t });
    }
  }

  const result: OxideComposition = {};
  if (oxides.length === 0 || numbers.length === 0) return result;

  const firstOxIdx = oxides[0].index;
  const lastOxIdx = oxides[oxides.length - 1].index;
  const firstNumIdx = numbers[0].index;

  // Case 1: Column table layout:
  // All oxide headers appear first, then all column numbers follow
  if (firstNumIdx > lastOxIdx && numbers.length >= oxides.length) {
    for (let i = 0; i < oxides.length && i < numbers.length; i++) {
      result[oxides[i].oxide] = numbers[i].value;
    }
    return result;
  }

  // Case 2: Interleaved pairs or general proximity by token index
  const usedNumbers = new Set<number>();
  for (const ox of oxides) {
    let bestNum: { value: number; index: number } | null = null;
    let bestDist = Infinity;
    let bestNumIdx = -1;

    for (let j = 0; j < numbers.length; j++) {
      if (usedNumbers.has(j)) continue;
      const num = numbers[j];
      // Prefer numbers appearing after the oxide
      const dist = num.index >= ox.index ? num.index - ox.index : ox.index - num.index + 20;
      if (dist < bestDist) {
        bestDist = dist;
        bestNum = num;
        bestNumIdx = j;
      }
    }

    if (bestNum && bestDist < 15) {
      usedNumbers.add(bestNumIdx);
      result[ox.oxide] = bestNum.value;
    }
  }

  return result;
}

/**
 * Parses native PDF items (text + canvas coordinates) directly with 100% precision
 */
export function parseTableFromNativePdfItems(
  nativeItems: PdfNativeItem[],
  width: number,
  height: number,
  rawText: string
): TableOcrResult {
  // Step 1: Merge multi-token formulas with subscripts (e.g. "Na" + "2" + "O" -> "Na2O")
  const mergedTokens: DetectedToken[] = [];
  let i = 0;

  while (i < nativeItems.length) {
    let matchedOxide: OxideKey | null = null;
    let spanMatched = 1;

    // Try merging up to 4 consecutive items
    for (let span = 4; span >= 1; span--) {
      if (i + span <= nativeItems.length) {
        const slice = nativeItems.slice(i, i + span);
        // Verify horizontal chain
        let isChain = true;
        for (let k = 0; k < slice.length - 1; k++) {
          const dx = slice[k + 1].x - (slice[k].x + slice[k].width);
          const dy = Math.abs(slice[k + 1].y - slice[k].y);
          if (dx > 35 || dx < -15 || dy > 25) {
            isChain = false;
            break;
          }
        }
        if (isChain) {
          const combinedStr = slice.map((s) => s.str).join('');
          const ox = matchOxideKey(combinedStr);
          if (ox) {
            matchedOxide = ox;
            spanMatched = span;
            const x0 = slice[0].x;
            const y0 = Math.min(...slice.map((s) => s.y));
            const x1 = slice[slice.length - 1].x + slice[slice.length - 1].width;
            const y1 = Math.max(...slice.map((s) => s.y + s.height));

            mergedTokens.push({
              text: ox,
              cx: (x0 + x1) / 2,
              cy: (y0 + y1) / 2,
              bbox: { x0, y0, x1, y1 },
              isOxide: true,
              oxideKey: ox,
            });
            break;
          }
        }
      }
    }

    if (matchedOxide) {
      i += spanMatched;
    } else {
      const item = nativeItems[i];
      const ox = matchOxideKey(item.str);
      const num = extractNumber(item.str);
      mergedTokens.push({
        text: item.str,
        cx: item.x + item.width / 2,
        cy: item.y + item.height / 2,
        bbox: {
          x0: item.x,
          y0: item.y,
          x1: item.x + item.width,
          y1: item.y + item.height,
        },
        isOxide: !!ox,
        oxideKey: ox || undefined,
        isNumber: !ox && num !== null,
        numValue: !ox && num !== null ? num : undefined,
      });
      i++;
    }
  }

  // Filter into oxides and numbers
  const oxideTokens = mergedTokens.filter((t) => t.isOxide && t.oxideKey);
  const numberTokens = mergedTokens.filter((t) => t.isNumber && t.numValue !== undefined);

  // Fallback text stream parse
  const streamOxides = parseTableFromTextStream(rawText);

  // Spatial pairing
  const matchedPairs: MatchedOxidePair[] = [];
  const oxidesResult: OxideComposition = {};
  const usedNumberIndices = new Set<number>();

  for (const ox of oxideTokens) {
    if (!ox.oxideKey) continue;
    let bestScore = Infinity;
    let bestNumIdx = -1;
    let bestType: 'column' | 'row' = 'column';

    for (let j = 0; j < numberTokens.length; j++) {
      if (usedNumberIndices.has(j)) continue;
      const num = numberTokens[j];
      const { score, type } = calculateSpatialScore(ox, num);
      if (score < bestScore) {
        bestScore = score;
        bestNumIdx = j;
        bestType = type;
      }
    }

    if (bestNumIdx !== -1 && bestScore < 300) {
      usedNumberIndices.add(bestNumIdx);
      const chosenNum = numberTokens[bestNumIdx];
      matchedPairs.push({
        oxide: ox.oxideKey,
        value: chosenNum.numValue!,
        oxideToken: ox,
        numberToken: chosenNum,
        distance: Math.round(bestScore),
        matchType: bestType,
      });
      oxidesResult[ox.oxideKey] = chosenNum.numValue!;
    } else if (streamOxides[ox.oxideKey] !== undefined) {
      // Use stream parser result if spatial pair was too distant
      oxidesResult[ox.oxideKey] = streamOxides[ox.oxideKey];
    }
  }

  // Also include any oxides detected from text stream that weren't spatially paired
  for (const [k, val] of Object.entries(streamOxides)) {
    if (oxidesResult[k as OxideKey] === undefined && val !== undefined) {
      oxidesResult[k as OxideKey] = val;
    }
  }

  return {
    oxides: oxidesResult,
    matchedPairs,
    allNumbers: numberTokens,
    allOxideTokens: oxideTokens.map((t) => ({ oxide: t.oxideKey!, token: t })),
    rawText,
    imageWidth: width,
    imageHeight: height,
    sourceType: 'native_pdf',
  };
}

let cachedWorker: any = null;

export async function getOcrWorker(onProgress?: (progress: number, status: string) => void) {
  if (cachedWorker) return cachedWorker;
  try {
    const worker = await createWorker('eng+rus', 1, {
      logger: (m) => {
        if (onProgress && m.status) {
          onProgress(Math.round((m.progress || 0) * 100), m.status);
        }
      },
    });
    cachedWorker = worker;
    return worker;
  } catch (err) {
    console.warn('Failed to load eng+rus worker, falling back to eng:', err);
    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (onProgress && m.status) {
          onProgress(Math.round((m.progress || 0) * 100), m.status);
        }
      },
    });
    cachedWorker = worker;
    return worker;
  }
}

/**
 * Preprocesses image on canvas for document/handwriting OCR:
 * - Detects table/content bounding box to auto-crop large empty margins
 * - Local background division to eliminate paper shadows and lighting gradients
 * - Sharp contrast enhancement for ink strokes (green, blue, black ink, pencil)
 */
export function preprocessImageForOcr(
  source: HTMLImageElement | HTMLCanvasElement,
  maxDimension = 2200
): { dataUrl: string; width: number; height: number; canvas: HTMLCanvasElement; offsetX: number; offsetY: number } {
  let srcW = ('naturalWidth' in source ? source.naturalWidth : source.width) || source.width;
  let srcH = ('naturalHeight' in source ? source.naturalHeight : source.height) || source.height;

  // Create temporary canvas to inspect image pixels
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = srcW;
  tempCanvas.height = srcH;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) throw new Error('Canvas 2D unavailable');
  tempCtx.drawImage(source, 0, 0, srcW, srcH);

  // Content bounding box detection (find non-white table area)
  const srcImgData = tempCtx.getImageData(0, 0, srcW, srcH);
  const srcData = srcImgData.data;

  let minX = srcW;
  let minY = srcH;
  let maxX = 0;
  let maxY = 0;
  let inkCount = 0;

  for (let y = 0; y < srcH; y += 4) {
    for (let x = 0; x < srcW; x += 4) {
      const idx = (y * srcW + x) * 4;
      const r = srcData[idx];
      const g = srcData[idx + 1];
      const b = srcData[idx + 2];
      const lum = r * 0.299 + g * 0.587 + b * 0.114;
      // Pixel is ink if significantly darker than white paper (< 230)
      if (lum < 230) {
        inkCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If table/content is located in a compact section (e.g. top of page), crop with 40px padding
  let cropX = 0;
  let cropY = 0;
  let cropW = srcW;
  let cropH = srcH;

  if (inkCount > 50 && maxX > minX && maxY > minY) {
    const pad = 40;
    cropX = Math.max(0, minX - pad);
    cropY = Math.max(0, minY - pad);
    cropW = Math.min(srcW - cropX, maxX - minX + pad * 2);
    cropH = Math.min(srcH - cropY, maxY - minY + pad * 2);
  }

  // Now create output canvas with optimal OCR scaling
  const canvas = document.createElement('canvas');
  let w = cropW;
  let h = cropH;

  if (w > maxDimension || h > maxDimension) {
    if (w > h) {
      h = Math.round((h * maxDimension) / w);
      w = maxDimension;
    } else {
      w = Math.round((w * maxDimension) / h);
      h = maxDimension;
    }
  } else if (w < 1000 && h < 1000) {
    const scale = Math.min(2.5, 1800 / Math.max(w, h));
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');

  ctx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Grayscale & local background normalization
  const grayscale = new Uint8ClampedArray(w * h);
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminance = Math.min(r, r * 0.3 + g * 0.59 + b * 0.11);
    grayscale[i / 4] = luminance;
  }

  const blockSize = 32;
  const gridW = Math.ceil(w / blockSize);
  const gridH = Math.ceil(h / blockSize);
  const bgGrid = new Float32Array(gridW * gridH);

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      let maxVal = 0;
      const startX = gx * blockSize;
      const startY = gy * blockSize;
      const endX = Math.min(w, startX + blockSize);
      const endY = Math.min(h, startY + blockSize);

      for (let y = startY; y < endY; y += 2) {
        for (let x = startX; x < endX; x += 2) {
          const val = grayscale[y * w + x];
          if (val > maxVal) maxVal = val;
        }
      }
      bgGrid[gy * gridW + gx] = Math.max(120, maxVal);
    }
  }

  for (let y = 0; y < h; y++) {
    const gy = Math.min(gridH - 1, Math.floor(y / blockSize));
    for (let x = 0; x < w; x++) {
      const gx = Math.min(gridW - 1, Math.floor(x / blockSize));
      const bg = bgGrid[gy * gridW + gx];
      const val = grayscale[y * w + x];

      let norm = (val / bg) * 255;
      if (norm < 165) {
        norm = Math.max(0, (norm - 35) * 1.35);
      } else {
        norm = Math.min(255, 210 + (norm - 165) * 1.3);
      }

      const pixelIdx = (y * w + x) * 4;
      data[pixelIdx] = norm;
      data[pixelIdx + 1] = norm;
      data[pixelIdx + 2] = norm;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: w,
    height: h,
    canvas,
    offsetX: cropX,
    offsetY: cropY,
  };
}

/**
 * Recognizes oxide concentrations from image/canvas by spatial proximity:
 * "концентрация данного оксида - это число ближайшее к его написанной или напечатанной формуле"
 */
export async function recognizeOxideTable(
  source: HTMLImageElement | HTMLCanvasElement,
  onProgress?: (progress: number, status: string) => void
): Promise<TableOcrResult> {
  const { dataUrl, width, height } = preprocessImageForOcr(source);
  const worker = await getOcrWorker(onProgress);

  const ret = await worker.recognize(dataUrl);
  const rawText = ret.data.text || '';
  const lines = ret.data.lines || [];
  const allWords = ret.data.words || [];

  // Parse direct text stream first as baseline
  const streamOxides = parseTableFromTextStream(rawText);

  // Merge nearby word tokens on each line to form unified chemical formulas (e.g. "Na" + "2" + "O" -> "Na2O")
  const oxideTokens: { oxide: OxideKey; token: DetectedToken }[] = [];
  const numberTokens: { val: number; token: DetectedToken }[] = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const wordsInLine = line.words || [];
    let wIdx = 0;

    while (wIdx < wordsInLine.length) {
      let matchedOxide: OxideKey | null = null;
      let spanMatched = 1;

      for (let span = 4; span >= 1; span--) {
        if (wIdx + span <= wordsInLine.length) {
          const slice = wordsInLine.slice(wIdx, wIdx + span);
          const combinedStr = slice.map((s) => cleanText(s.text)).join('');
          const ox = matchOxideKey(combinedStr);
          if (ox) {
            matchedOxide = ox;
            spanMatched = span;
            const x0 = slice[0].bbox.x0;
            const y0 = Math.min(...slice.map((s) => s.bbox.y0));
            const x1 = slice[slice.length - 1].bbox.x1;
            const y1 = Math.max(...slice.map((s) => s.bbox.y1));

            oxideTokens.push({
              oxide: ox,
              token: {
                text: ox,
                cx: (x0 + x1) / 2,
                cy: (y0 + y1) / 2,
                bbox: { x0, y0, x1, y1 },
                lineIndex: lineIdx,
                isOxide: true,
                oxideKey: ox,
              },
            });
            break;
          }
        }
      }

      if (matchedOxide) {
        wIdx += spanMatched;
      } else {
        const w = wordsInLine[wIdx];
        const raw = w.text.trim();
        const clean = cleanText(raw);

        // Check if single word is oxide
        const ox = matchOxideKey(clean);
        if (ox) {
          oxideTokens.push({
            oxide: ox,
            token: {
              text: ox,
              cx: (w.bbox.x0 + w.bbox.x1) / 2,
              cy: (w.bbox.y0 + w.bbox.y1) / 2,
              bbox: w.bbox,
              lineIndex: lineIdx,
              isOxide: true,
              oxideKey: ox,
            },
          });
        } else {
          // Check if word contains concentration number
          const num = extractNumber(clean);
          if (num !== null) {
            numberTokens.push({
              val: num,
              token: {
                text: raw,
                cx: (w.bbox.x0 + w.bbox.x1) / 2,
                cy: (w.bbox.y0 + w.bbox.y1) / 2,
                bbox: w.bbox,
                lineIndex: lineIdx,
                isNumber: true,
                numValue: num,
              },
            });
          }
        }
        wIdx++;
      }
    }
  }

  // Spatial Pairing: For each oxide, find nearest number adapting to column or row layout
  const matchedPairs: MatchedOxidePair[] = [];
  const oxidesResult: OxideComposition = {};
  const usedNumberIndices = new Set<number>();

  for (const item of oxideTokens) {
    let bestScore = Infinity;
    let bestNumIndex = -1;
    let bestType: 'column' | 'row' = 'column';

    for (let i = 0; i < numberTokens.length; i++) {
      if (usedNumberIndices.has(i)) continue;
      const numItem = numberTokens[i];

      const { score, type } = calculateSpatialScore(item.token, numItem.token);
      if (score < bestScore) {
        bestScore = score;
        bestNumIndex = i;
        bestType = type;
      }
    }

    if (bestNumIndex !== -1 && bestScore < Math.max(width, height) * 0.7) {
      usedNumberIndices.add(bestNumIndex);
      const chosenNum = numberTokens[bestNumIndex];
      matchedPairs.push({
        oxide: item.oxide,
        value: chosenNum.val,
        oxideToken: item.token,
        numberToken: chosenNum.token,
        distance: Math.round(bestScore),
        matchType: bestType,
      });
      oxidesResult[item.oxide] = chosenNum.val;
    } else if (streamOxides[item.oxide] !== undefined) {
      oxidesResult[item.oxide] = streamOxides[item.oxide];
    }
  }

  // Augment with stream parser if any oxides were missed by visual word bounding boxes
  for (const [k, val] of Object.entries(streamOxides)) {
    if (oxidesResult[k as OxideKey] === undefined && val !== undefined) {
      oxidesResult[k as OxideKey] = val;
    }
  }

  return {
    oxides: oxidesResult,
    matchedPairs,
    allNumbers: numberTokens.map((n) => n.token),
    allOxideTokens: oxideTokens,
    rawText,
    imageWidth: width,
    imageHeight: height,
    preprocessedDataUrl: dataUrl,
    sourceType: 'tesseract_ocr',
  };
}

/**
 * Creates the exact handwritten sample canvas matching the user's photo:
 * Al2O3 28 %, SiO2 54 %, Fe2O3 1.5 %, CaO 3.2 %, Na2O 0.85 %
 */
export function createHandwrittenSampleCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Paper texture simulation
  ctx.fillStyle = '#fbfbfa';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Faint notebook lines
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (let y = 140; y < canvas.height; y += 120) {
    ctx.beginPath();
    ctx.moveTo(60, y);
    ctx.lineTo(canvas.width - 60, y);
    ctx.stroke();
  }

  // Margin line
  ctx.strokeStyle = '#fecaca';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(130, 0);
  ctx.lineTo(130, canvas.height);
  ctx.stroke();

  // Greenish-blue ink handwritten style
  ctx.fillStyle = '#0f4c3a';
  ctx.font = 'bold 36px "Segoe Script", "Caveat", "Comic Sans MS", cursive, sans-serif';

  const rows = [
    { formula: 'Al₂O₃', num: '28 %', y: 280 },
    { formula: 'SiO₂', num: '54 %', y: 440 },
    { formula: 'Fe₂O₃', num: '1.5 %', y: 600 },
    { formula: 'CaO', num: '3.2 %', y: 760 },
    { formula: 'Na₂O', num: '0.85 %', y: 920 },
  ];

  ctx.fillText('Содержание оксидов в бентоните:', 160, 180);

  rows.forEach((r) => {
    ctx.fillText(r.formula, 200, r.y);
    ctx.fillText('—', 380, r.y);
    ctx.fillText(r.num, 490, r.y);
  });

  return canvas;
}

/**
 * Creates the exact laboratory PDF table matching the user's document:
 * Header: Проба | Na2O | MgO | Al2O3 | SiO2 | K2O | CaO | TiO2 | MnO | Fe2O3 | P2O5 | SO3
 * Data:   Пр-5  | 1.54 | 5.36 | 20.25 | 66.31 | 0.59 | 1.79 | 0.35 | 0.11 | 3.339 | 0.063 | 0.09
 */
export function createPdfTableSampleCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1100;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px "Times New Roman", Times, serif';
  ctx.fillText('Таблица РФА химического состава бентонитовой глины (PDF документ)', 40, 45);

  const columns = [
    { header: 'Проба', val: 'Пр-5', x: 50, w: 70 },
    { header: 'Na₂O', val: '1.54', x: 130, w: 75, ox: 'Na2O' },
    { header: 'MgO', val: '5.36', x: 215, w: 75, ox: 'MgO' },
    { header: 'Al₂O₃', val: '20.25', x: 300, w: 85, ox: 'Al2O3' },
    { header: 'SiO₂', val: '66.31', x: 395, w: 85, ox: 'SiO2' },
    { header: 'K₂O', val: '0.59', x: 490, w: 75, ox: 'K2O' },
    { header: 'CaO', val: '1.79', x: 575, w: 75, ox: 'CaO' },
    { header: 'TiO₂', val: '0.35', x: 660, w: 75, ox: 'TiO2' },
    { header: 'MnO', val: '0.11', x: 745, w: 75, ox: 'MnO' },
    { header: 'Fe₂O₃', val: '3.339', x: 830, w: 85, ox: 'Fe2O3' },
    { header: 'P₂O₅', val: '0.063', x: 925, w: 80, ox: 'P2O5' },
    { header: 'SO₃', val: '0.09', x: 1015, w: 75, ox: 'SO3' },
  ];

  const tableTop = 80;
  const rowHeight = 45;

  // Grid lines
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;

  // Horizontal borders
  ctx.beginPath();
  ctx.moveTo(40, tableTop);
  ctx.lineTo(1090, tableTop);
  ctx.moveTo(40, tableTop + rowHeight);
  ctx.lineTo(1090, tableTop + rowHeight);
  ctx.moveTo(40, tableTop + rowHeight * 2);
  ctx.lineTo(1090, tableTop + rowHeight * 2);
  ctx.stroke();

  // Header background
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(40, tableTop, 1050, rowHeight);

  // Headers and values
  columns.forEach((col) => {
    // Header
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px "Times New Roman", Times, serif';
    ctx.textAlign = 'center';
    ctx.fillText(col.header, col.x + col.w / 2, tableTop + 28);

    // Value
    ctx.fillStyle = '#1e293b';
    ctx.font = '15px "Times New Roman", Times, serif';
    ctx.fillText(col.val, col.x + col.w / 2, tableTop + rowHeight + 28);

    // Vertical column divider
    ctx.beginPath();
    ctx.moveTo(col.x + col.w, tableTop);
    ctx.lineTo(col.x + col.w, tableTop + rowHeight * 2);
    ctx.stroke();
  });

  // Reset text align
  ctx.textAlign = 'left';

  ctx.fillStyle = '#64748b';
  ctx.font = 'italic 13px sans-serif';
  ctx.fillText('Сумма оксидов = 99.792% (Высокая сходимость анализа РФА)', 40, tableTop + rowHeight * 2 + 35);

  return canvas;
}

/**
 * Creates the exact handwritten sample 1 (with '=') matching user's photo 20260913_140005.jpg:
 * Green cursive ink:
 * Al2O3 = 28
 * SiO2 = 54
 * Fe2O3 = 1,5
 * CaO = 3,2
 * Na2O = 0,85
 */
export function createHandwrittenSampleWithEqualsCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 700;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Real paper texture background
  ctx.fillStyle = '#f8f8f6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Faint page lines
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (let y = 100; y < canvas.height; y += 95) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(canvas.width - 40, y);
    ctx.stroke();
  }

  // Margin line
  ctx.strokeStyle = '#fca5a5';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(90, 0);
  ctx.lineTo(90, canvas.height);
  ctx.stroke();

  // Green cursive ink style matching 20260913_140005.jpg
  ctx.fillStyle = '#166534';
  ctx.font = 'bold 38px "Segoe Script", "Caveat", cursive, sans-serif';

  const rows = [
    { text: 'Al2O3 = 28', y: 190 },
    { text: 'SiO2 = 54', y: 285 },
    { text: 'Fe2O3 = 1,5', y: 380 },
    { text: 'CaO = 3,2', y: 475 },
    { text: 'Na2O = 0,85', y: 570 },
  ];

  rows.forEach((r) => {
    ctx.fillText(r.text, 130, r.y);
  });

  return canvas;
}

/**
 * Creates the exact handwritten sample 2 (without '=') matching user's photo 20260913_132656.jpg:
 * Green cursive ink:
 * Al2O3 28
 * SiO2 54
 * Fe2O3 1,5
 * CaO 3,2
 * Na2O 0,85
 */
export function createHandwrittenSampleWithoutEqualsCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 700;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Real paper texture background
  ctx.fillStyle = '#f8f8f6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Faint page lines
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (let y = 100; y < canvas.height; y += 95) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(canvas.width - 40, y);
    ctx.stroke();
  }

  // Margin line
  ctx.strokeStyle = '#fca5a5';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(90, 0);
  ctx.lineTo(90, canvas.height);
  ctx.stroke();

  // Green cursive ink style matching 20260913_132656.jpg
  ctx.fillStyle = '#166534';
  ctx.font = 'bold 38px "Segoe Script", "Caveat", cursive, sans-serif';

  const rows = [
    { text: 'Al2O3 28', y: 190 },
    { text: 'SiO2 54', y: 285 },
    { text: 'Fe2O3 1,5', y: 380 },
    { text: 'CaO 3,2', y: 475 },
    { text: 'Na2O 0,85', y: 570 },
  ];

  rows.forEach((r) => {
    ctx.fillText(r.text, 130, r.y);
  });

  return canvas;
}

/**
 * Calls the server-side Gemini 2.5 Flash recognition endpoint
 */
export async function callServerOxideRecognition(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<{ oxides: OxideComposition; rawLines: string[] }> {
  const response = await fetch('/api/recognize-oxides', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mimeType }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error ${response.status}`);
  }

  const data = await response.json();
  return {
    oxides: data.oxides || {},
    rawLines: data.rawLines || [],
  };
}

