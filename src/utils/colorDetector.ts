import { BentoniteColorId } from '../types';

export interface ColorDetectionResult {
  colorId: BentoniteColorId;
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsv: { h: number; s: number; v: number };
  confidence: number;
}

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6;
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2;
    } else {
      h = (rNorm - gNorm) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s, v };
}

export function classifyHsvToBentoniteColor(hsv: { h: number; s: number; v: number }): {
  colorId: BentoniteColorId;
  confidence: number;
} {
  const { h, s, v } = hsv;

  // Very dark colors -> Dark gray, earthy, black
  if (v < 0.28) {
    return { colorId: 'dark_gray_black', confidence: Math.min(96, Math.round((1 - v) * 100)) };
  }

  // Very low saturation (< 0.14)
  if (s < 0.15) {
    if (v >= 0.60) {
      return { colorId: 'white_light_gray', confidence: 92 };
    }
    return { colorId: 'dark_gray_black', confidence: 85 };
  }

  // Pink, pale lilac
  if ((h >= 285 && h <= 340) || (h >= 340 && h <= 360 && s < 0.35 && v > 0.6)) {
    return { colorId: 'pink_lilac', confidence: 88 };
  }

  // Red, terracotta, brick
  if ((h >= 345 || h <= 25) && s >= 0.22) {
    return { colorId: 'red_terracotta', confidence: 93 };
  }

  // Yellow, mustard, ochre
  if (h > 25 && h <= 58) {
    // If very high value and low saturation -> cream/white
    if (v > 0.82 && s < 0.28) {
      return { colorId: 'white_light_gray', confidence: 86 };
    }
    return { colorId: 'yellow_ochre', confidence: 94 };
  }

  // Green, olive, pistachio
  if (h > 58 && h <= 165) {
    return { colorId: 'green_olive', confidence: 92 };
  }

  // Blue, bluish-gray, slate
  if (h > 165 && h < 285) {
    if (s < 0.25) {
      return { colorId: 'blue_gray', confidence: 84 };
    }
    return { colorId: 'blue_gray', confidence: 90 };
  }

  // Fallback based on brightness
  if (v > 0.7) {
    return { colorId: 'white_light_gray', confidence: 75 };
  }
  return { colorId: 'dark_gray_black', confidence: 70 };
}

export async function detectColorFromImage(
  imageSource: string | HTMLImageElement
): Promise<ColorDetectionResult> {
  return new Promise((resolve, reject) => {
    const img = typeof imageSource === 'string' ? new Image() : imageSource;

    const process = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 300;
        let width = img.naturalWidth || img.width || 300;
        let height = img.naturalHeight || img.height || 300;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas context not available');
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Sample the central 60% of pixels to avoid background borders
        const startX = Math.floor(width * 0.2);
        const startY = Math.floor(height * 0.2);
        const sampleW = Math.max(1, Math.floor(width * 0.6));
        const sampleH = Math.max(1, Math.floor(height * 0.6));

        const imgData = ctx.getImageData(startX, startY, sampleW, sampleH).data;
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let count = 0;

        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          if (a < 128) continue;
          // Exclude pure white paper background or absolute black edge
          if (r > 248 && g > 248 && b > 248) continue;
          if (r < 15 && g < 15 && b < 15) continue;

          sumR += r;
          sumG += g;
          sumB += b;
          count++;
        }

        let avgR = 200,
          avgG = 195,
          avgB = 180;
        if (count > 0) {
          avgR = Math.round(sumR / count);
          avgG = Math.round(sumG / count);
          avgB = Math.round(sumB / count);
        }

        const hsv = rgbToHsv(avgR, avgG, avgB);
        const { colorId, confidence } = classifyHsvToBentoniteColor(hsv);
        const hex = `#${((1 << 24) + (avgR << 16) + (avgG << 8) + avgB).toString(16).slice(1)}`;

        resolve({
          colorId,
          hex,
          rgb: { r: avgR, g: avgG, b: avgB },
          hsv,
          confidence,
        });
      } catch (err) {
        reject(err);
      }
    };

    if (typeof imageSource === 'string') {
      img.crossOrigin = 'anonymous';
      img.onload = process;
      img.onerror = (e) => reject(e);
      img.src = imageSource;
    } else {
      if (img.complete) {
        process();
      } else {
        img.onload = process;
        img.onerror = (e) => reject(e);
      }
    }
  });
}
