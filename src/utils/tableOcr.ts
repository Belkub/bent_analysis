import { createWorker } from 'tesseract.js';
import { OxideKey, OxideComposition } from '../types';

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
}

export interface MatchedOxidePair {
  oxide: OxideKey;
  value: number;
  oxideToken: DetectedToken;
  numberToken: DetectedToken;
  distance: number;
}

export interface TableOcrResult {
  oxides: OxideComposition;
  matchedPairs: MatchedOxidePair[];
  allNumbers: DetectedToken[];
  allOxideTokens: { oxide: OxideKey; token: DetectedToken }[];
  rawText: string;
  imageWidth: number;
  imageHeight: number;
}

const OXIDE_PATTERNS: Record<OxideKey, RegExp[]> = {
  Na2O: [/na\s*[2z]?\s*[o0]/i, /на\s*[2z]?\s*[о0]/i],
  MgO: [/mg\s*[o0]/i, /мг\s*[о0]/i],
  Al2O3: [/al\s*[2z]?\s*[o0]\s*[3з]?/i, /ал\s*[2z]?\s*[о0]\s*[3з]?/i],
  SiO2: [/si\s*[o0]\s*[2z]?/i, /си\s*[о0]\s*[2z]?/i],
  K2O: [/k\s*[2z]?\s*[o0]/i, /к\s*[2z]?\s*[о0]/i],
  CaO: [/ca\s*[o0]/i, /са\s*[о0]/i],
  TiO2: [/ti\s*[o0]\s*[2z]?/i, /ти\s*[о0]\s*[2z]?/i],
  MnO: [/mn\s*[o0]/i, /мн\s*[о0]/i],
  Fe2O3: [/fe\s*[2z]?\s*[o0]\s*[3з]?/i, /фе\s*[2z]?\s*[о0]\s*[3з]?/i],
  P2O5: [/p\s*[2z]?\s*[o0]\s*[5s]?/i, /п\s*[2z]?\s*[о0]\s*[5s]?/i],
  SO3: [/s\s*[o0]\s*[3з]/i, /с\s*[о0]\s*[3з]/i, /so3/i],
};

function cleanText(txt: string): string {
  return txt.replace(/[^a-zA-Z0-9а-яА-Я.,%_]/g, '').trim();
}

function matchOxideKey(txt: string): OxideKey | null {
  const norm = txt.replace(/[\s\-_]/g, '');
  for (const [oxideKey, patterns] of Object.entries(OXIDE_PATTERNS) as [OxideKey, RegExp[]][]) {
    for (const pat of patterns) {
      if (pat.test(norm)) {
        return oxideKey;
      }
    }
  }
  return null;
}

function extractNumber(txt: string): number | null {
  const cleaned = txt.replace(/[^\d.,]/g, '').replace(',', '.');
  const match = cleaned.match(/\d+(\.\d+)?/);
  if (match) {
    const num = parseFloat(match[0]);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      return num;
    }
  }
  return null;
}

let cachedWorker: any = null;

async function getOcrWorker(onProgress?: (progress: number, status: string) => void) {
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
    // Fallback to eng only if rus language pack fails
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
 * Preprocesses image on canvas for highest OCR contrast
 */
export function preprocessImageForOcr(
  img: HTMLImageElement,
  maxDimension = 1400
): { dataUrl: string; width: number; height: number } {
  const canvas = document.createElement('canvas');
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;

  if (w > maxDimension || h > maxDimension) {
    if (w > h) {
      h = Math.round((h * maxDimension) / w);
      w = maxDimension;
    } else {
      w = Math.round((w * maxDimension) / h);
      h = maxDimension;
    }
  }

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');

  ctx.drawImage(img, 0, 0, w, h);

  // Grayscale & contrast enhancement
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    // Contrast boost
    const enhanced = gray < 130 ? Math.max(0, gray * 0.7) : Math.min(255, gray * 1.25);
    data[i] = enhanced;
    data[i + 1] = enhanced;
    data[i + 2] = enhanced;
  }
  ctx.putImageData(imgData, 0, 0);

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: w,
    height: h,
  };
}

/**
 * Recognizes oxide table by spatial proximity:
 * "число, написанное ближе всего к формуле данного оксида (рукописной или напечатанной)
 * и является процентной долей данного оксида в бентоните"
 */
export async function recognizeOxideTable(
  img: HTMLImageElement,
  onProgress?: (progress: number, status: string) => void
): Promise<TableOcrResult> {
  const { dataUrl, width, height } = preprocessImageForOcr(img);
  const worker = await getOcrWorker(onProgress);

  const ret = await worker.recognize(dataUrl);
  const rawText = ret.data.text || '';
  const words = ret.data.words || [];

  const oxideTokens: { oxide: OxideKey; token: DetectedToken }[] = [];
  const numberTokens: { val: number; token: DetectedToken }[] = [];

  for (const word of words) {
    const rawWord = word.text.trim();
    const clean = cleanText(rawWord);
    if (!clean) continue;

    const bbox: BoundingBox = {
      x0: word.bbox.x0,
      y0: word.bbox.y0,
      x1: word.bbox.x1,
      y1: word.bbox.y1,
    };
    const cx = (bbox.x0 + bbox.x1) / 2;
    const cy = (bbox.y0 + bbox.y1) / 2;

    const detectedToken: DetectedToken = {
      text: rawWord,
      cx,
      cy,
      bbox,
    };

    // Check if it's an oxide formula
    const matchedOxide = matchOxideKey(clean);
    if (matchedOxide) {
      // Don't add duplicate if adjacent
      oxideTokens.push({ oxide: matchedOxide, token: detectedToken });
      continue;
    }

    // Check if it's a number
    const num = extractNumber(clean);
    if (num !== null) {
      numberTokens.push({ val: num, token: detectedToken });
    }
  }

  // Spatial pairing: For each oxide, find nearest number token by distance
  // In tables, numbers are usually to the right or slightly below/above in same row.
  // We use weighted Euclidean distance: dx^2 + 2.0 * dy^2
  const matchedPairs: MatchedOxidePair[] = [];
  const oxidesResult: OxideComposition = {};
  const usedNumberIndices = new Set<number>();

  for (const item of oxideTokens) {
    let bestDist = Infinity;
    let bestNumIndex = -1;

    for (let i = 0; i < numberTokens.length; i++) {
      if (usedNumberIndices.has(i)) continue;
      const numItem = numberTokens[i];

      const dx = numItem.token.cx - item.token.cx;
      const dy = numItem.token.cy - item.token.cy;

      // Slight directional preference: numbers are generally rightwards or below
      const horizontalPenalty = dx < -20 ? 3.0 : 1.0;
      const weightedDist = Math.sqrt((dx * dx * horizontalPenalty) + (dy * dy * 2.5));

      if (weightedDist < bestDist) {
        bestDist = weightedDist;
        bestNumIndex = i;
      }
    }

    if (bestNumIndex !== -1 && bestDist < Math.max(width, height) * 0.45) {
      usedNumberIndices.add(bestNumIndex);
      const chosenNum = numberTokens[bestNumIndex];
      matchedPairs.push({
        oxide: item.oxide,
        value: chosenNum.val,
        oxideToken: item.token,
        numberToken: chosenNum.token,
        distance: Math.round(bestDist),
      });
      oxidesResult[item.oxide] = chosenNum.val;
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
  };
}
