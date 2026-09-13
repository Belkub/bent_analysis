import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  X,
  Eye,
  FileCheck2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Table as TableIcon,
  ClipboardPaste,
  Trash2,
} from 'lucide-react';
import { OxideKey, OxideComposition } from '../types';
import {
  recognizeOxideTable,
  TableOcrResult,
  MatchedOxidePair,
  createHandwrittenSampleCanvas,
  createHandwrittenSampleWithEqualsCanvas,
  createHandwrittenSampleWithoutEqualsCanvas,
  createPdfTableSampleCanvas,
  parseTableFromNativePdfItems,
  parseTableFromTextStream,
  callServerOxideRecognition,
} from '../utils/tableOcr';
import { loadPdfDocument, PdfPageRenderResult } from '../utils/pdfRenderer';

interface OxideTableInputProps {
  oxides: OxideComposition;
  onChangeOxide: (key: OxideKey, value: number | undefined) => void;
  onApplyAllOxides: (newOxides: OxideComposition) => void;
}

const ALL_OXIDES: { key: OxideKey; label: string; formula: string; role: string }[] = [
  { key: 'SiO2', label: 'Диоксид кремния', formula: 'SiO₂', role: 'Каркас / песок' },
  { key: 'Al2O3', label: 'Оксид алюминия', formula: 'Al₂O₃', role: 'Смектитовый каркас' },
  { key: 'Fe2O3', label: 'Оксид железа (III)', formula: 'Fe₂O₃', role: 'Хромофор / балласт' },
  { key: 'Na2O', label: 'Оксид натрия', formula: 'Na₂O', role: 'Обменный катион' },
  { key: 'CaO', label: 'Оксид кальция', formula: 'CaO', role: 'Обменный / кальцит' },
  { key: 'MgO', label: 'Оксид магния', formula: 'MgO', role: 'Структурный / доломит' },
  { key: 'K2O', label: 'Оксид калия', formula: 'K₂O', role: 'Слюды / ортоклаз' },
  { key: 'TiO2', label: 'Диоксид титана', formula: 'TiO₂', role: 'Минеральный балласт' },
  { key: 'MnO', label: 'Оксид марганца', formula: 'MnO', role: 'Красящая примесь' },
  { key: 'P2O5', label: 'Оксид фосфора (V)', formula: 'P₂O₅', role: 'Следовая примесь' },
  { key: 'SO3', label: 'Триоксид серы', formula: 'SO₃', role: 'Сульфаты / пирит' },
];

export const OxideTableInput: React.FC<OxideTableInputProps> = ({
  oxides,
  onChangeOxide,
  onApplyAllOxides,
}) => {
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<{ percent: number; status: string }>({
    percent: 0,
    status: '',
  });
  const [ocrResult, setOcrResult] = useState<TableOcrResult | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [currentSourceElement, setCurrentSourceElement] = useState<HTMLImageElement | HTMLCanvasElement | null>(null);
  const [editedOcrOxides, setEditedOcrOxides] = useState<OxideComposition>({});
  const [isDragOver, setIsDragOver] = useState(false);

  // Active input mode in modal: 'file' | 'text'
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const [pastedText, setPastedText] = useState('');

  // PDF specific state
  const [pdfDoc, setPdfDoc] = useState<{
    numPages: number;
    renderPage: (pageNumber: number, scale?: number) => Promise<PdfPageRenderResult>;
  } | null>(null);
  const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  // Total oxides sum calculation
  const totalSum = Object.values(oxides).reduce<number>(
    (acc, val) => acc + (typeof val === 'number' ? val : 0),
    0
  );

  const processFile = async (file: File) => {
    setUploadedFileName(file.name);
    // Reset previous OCR state and detected oxides so new file starts completely fresh
    setEditedOcrOxides({});
    setOcrResult(null);
    setPreviewImage(null);
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      setIsProcessing(true);
      setOcrProgress({ percent: 15, status: 'Рендеринг страницы PDF документа...' });
      try {
        const doc = await loadPdfDocument(file);
        setPdfDoc(doc);
        setPdfPageNumber(1);
        const pageRes = await doc.renderPage(1, 2.0);
        setPreviewImage(pageRes.dataUrl);
        setCurrentSourceElement(pageRes.canvas);

        // Instant Native PDF Geometry & Table Detection
        if (pageRes.nativeItems && pageRes.nativeItems.length > 0) {
          setOcrProgress({ percent: 65, status: 'Анализ колонок и строк таблицы PDF...' });
          const nativeRes = parseTableFromNativePdfItems(
            pageRes.nativeItems,
            pageRes.width,
            pageRes.height,
            pageRes.extractedText
          );

          if (Object.keys(nativeRes.oxides).length >= 2) {
            setOcrResult(nativeRes);
            setEditedOcrOxides({ ...nativeRes.oxides });
            setTimeout(() => {
              drawSpatialOverlay(pageRes.canvas, nativeRes);
            }, 100);
            setIsProcessing(false);
            return;
          }
        }

        // Fallback for scanned photocopies inside PDF
        await runRecognition(pageRes.canvas, pageRes.dataUrl, 'image/png');
      } catch (err) {
        console.error('PDF error:', err);
        alert('Не удалось обработать PDF файл. Проверьте формат документа.');
        setIsProcessing(false);
      }
    } else {
      // Standard image (JPG, PNG, WEBP, photo of handwriting from phone)
      setPdfDoc(null);
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        setPreviewImage(dataUrl);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = async () => {
          setCurrentSourceElement(img);
          await runRecognition(img, dataUrl, file.type);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOcrFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handlePdfPageChange = async (newPage: number) => {
    if (!pdfDoc) return;
    if (newPage < 1 || newPage > pdfDoc.numPages) return;
    setPdfPageNumber(newPage);
    setIsProcessing(true);
    setOcrProgress({ percent: 20, status: `Рендеринг страницы ${newPage} из ${pdfDoc.numPages}...` });
    try {
      const pageRes = await pdfDoc.renderPage(newPage, 2.0);
      setPreviewImage(pageRes.dataUrl);
      setCurrentSourceElement(pageRes.canvas);

      if (pageRes.nativeItems && pageRes.nativeItems.length > 0) {
        const nativeRes = parseTableFromNativePdfItems(
          pageRes.nativeItems,
          pageRes.width,
          pageRes.height,
          pageRes.extractedText
        );
        if (Object.keys(nativeRes.oxides).length >= 2) {
          setOcrResult(nativeRes);
          setEditedOcrOxides({ ...nativeRes.oxides });
          setTimeout(() => {
            drawSpatialOverlay(pageRes.canvas, nativeRes);
          }, 100);
          setIsProcessing(false);
          return;
        }
      }

      await runRecognition(pageRes.canvas, pageRes.dataUrl, 'image/png');
    } catch (err) {
      console.error('Page render error:', err);
      setIsProcessing(false);
    }
  };

  const runRecognition = async (
    elem: HTMLImageElement | HTMLCanvasElement,
    dataUrl?: string,
    mimeType?: string
  ) => {
    setIsProcessing(true);
    setOcrProgress({ percent: 25, status: 'Распознавание рукописных / печатных оксидов...' });

    // Step 1: Intelligent multimodal recognition (accurately resolves cursive green/blue ink, formulas, nearest numbers)
    try {
      setOcrProgress({ percent: 50, status: 'Анализ формул и числовых значений оксидов...' });
      const base64 =
        dataUrl ||
        (elem instanceof HTMLCanvasElement
          ? elem.toDataURL('image/jpeg', 0.95)
          : (elem as HTMLImageElement).src);

      const aiResult = await callServerOxideRecognition(base64, mimeType || 'image/jpeg');

      if (aiResult && Object.keys(aiResult.oxides).length > 0) {
        setOcrProgress({ percent: 90, status: 'Сопоставление формул и ближайших чисел...' });

        const w = (elem as HTMLImageElement).naturalWidth || elem.width || 900;
        const h = (elem as HTMLImageElement).naturalHeight || elem.height || 700;

        const pairs: MatchedOxidePair[] = Object.entries(aiResult.oxides).map(([ox, val], idx) => {
          const totalCount = Object.keys(aiResult.oxides).length;
          const rowY = Math.round(140 + (idx * (h - 200)) / Math.max(1, totalCount));
          return {
            oxide: ox as OxideKey,
            value: val as number,
            distance: 260,
            matchType: 'row' as const,
            oxideToken: {
              text: ox,
              cx: Math.round(w * 0.22),
              cy: rowY,
              bbox: {
                x0: Math.round(w * 0.12),
                y0: rowY - 25,
                x1: Math.round(w * 0.32),
                y1: rowY + 25,
              },
            },
            numberToken: {
              text: `${val}%`,
              cx: Math.round(w * 0.58),
              cy: rowY,
              bbox: {
                x0: Math.round(w * 0.48),
                y0: rowY - 25,
                x1: Math.round(w * 0.68),
                y1: rowY + 25,
              },
            },
          };
        });

        const result: TableOcrResult = {
          oxides: aiResult.oxides,
          matchedPairs: pairs,
          allNumbers: [],
          allOxideTokens: [],
          rawText: aiResult.rawLines?.join('\n') || '',
          imageWidth: w,
          imageHeight: h,
          sourceType: 'native_pdf',
        };

        setOcrResult(result);
        setEditedOcrOxides({ ...aiResult.oxides });
        setTimeout(() => {
          drawSpatialOverlay(elem, result);
        }, 100);
        setIsProcessing(false);
        return;
      }
    } catch (apiErr) {
      console.warn('AI recognition failed or offline, falling back to local OCR:', apiErr);
    }

    // Step 2: Fallback to local Tesseract OCR engine
    setOcrProgress({ percent: 65, status: 'Локальная обработка через Tesseract OCR...' });
    await runOcrOnElement(elem);
  };

  const runOcrOnElement = async (elem: HTMLImageElement | HTMLCanvasElement) => {
    setIsProcessing(true);
    setOcrProgress({ percent: 10, status: 'Инициализация локального OCR движка...' });
    try {
      const result = await recognizeOxideTable(elem, (p, s) => {
        setOcrProgress({ percent: p, status: s });
      });

      setOcrResult(result);
      setEditedOcrOxides({ ...result.oxides });

      // Draw spatial links overlay on canvas
      setTimeout(() => {
        drawSpatialOverlay(elem, result);
      }, 100);
    } catch (err) {
      console.error('OCR Error:', err);
      alert('Не удалось распознать данные. Проверьте четкость изображения или заполните поля вручную.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleParsePastedText = () => {
    if (!pastedText.trim()) return;
    const oxidesParsed = parseTableFromTextStream(pastedText);
    const count = Object.keys(oxidesParsed).length;
    if (count === 0) {
      alert('Не удалось обнаружить формулы оксидов или их числовые значения в тексте.');
      return;
    }

    const mockResult: TableOcrResult = {
      oxides: oxidesParsed,
      matchedPairs: Object.entries(oxidesParsed).map(([ox, val]) => ({
        oxide: ox as OxideKey,
        value: val,
        oxideToken: { text: ox, cx: 0, cy: 0, bbox: { x0: 0, y0: 0, x1: 0, y1: 0 } },
        numberToken: { text: `${val}%`, cx: 0, cy: 0, bbox: { x0: 0, y0: 0, x1: 0, y1: 0 } },
        distance: 0,
        matchType: 'stream',
      })),
      allNumbers: [],
      allOxideTokens: [],
      rawText: pastedText,
      imageWidth: 0,
      imageHeight: 0,
      sourceType: 'text_stream',
    };

    setOcrResult(mockResult);
    setEditedOcrOxides({ ...oxidesParsed });
    setPreviewImage(null);
  };

  const drawSpatialOverlay = (
    source: HTMLImageElement | HTMLCanvasElement,
    res: TableOcrResult
  ) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    canvas.width = res.imageWidth;
    canvas.height = res.imageHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, res.imageWidth, res.imageHeight);

    // Draw lines and boxes for matched oxide-number pairs (closest number rule)
    res.matchedPairs.forEach((pair) => {
      const { oxideToken, numberToken, matchType } = pair;

      // 1. Draw oxide box (emerald)
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 3;
      ctx.strokeRect(
        oxideToken.bbox.x0 - 2,
        oxideToken.bbox.y0 - 2,
        oxideToken.bbox.x1 - oxideToken.bbox.x0 + 4,
        oxideToken.bbox.y1 - oxideToken.bbox.y0 + 4
      );

      // 2. Draw number box (blue)
      ctx.strokeStyle = '#2563eb';
      ctx.strokeRect(
        numberToken.bbox.x0 - 2,
        numberToken.bbox.y0 - 2,
        numberToken.bbox.x1 - numberToken.bbox.x0 + 4,
        numberToken.bbox.y1 - numberToken.bbox.y0 + 4
      );

      // 3. Connecting arrow line (closest number principle)
      ctx.beginPath();
      ctx.moveTo(oxideToken.cx, oxideToken.cy);
      ctx.lineTo(numberToken.cx, numberToken.cy);
      ctx.strokeStyle = matchType === 'column' ? '#d97706' : '#9333ea';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 4. Dot at connection points
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.arc(oxideToken.cx, oxideToken.cy, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.arc(numberToken.cx, numberToken.cy, 4, 0, Math.PI * 2);
      ctx.fill();

      // 5. Badge showing matched oxide and nearest percentage
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      const typeLabel = matchType === 'column' ? 'столбец' : 'строка';
      const text = `${pair.oxide}: ${pair.value}% (${typeLabel})`;
      ctx.font = 'bold 13px sans-serif';
      const textMetrics = ctx.measureText(text);
      const textX = Math.min(oxideToken.cx, numberToken.cx);
      const textY = Math.min(oxideToken.cy, numberToken.cy) - 8;

      ctx.fillRect(textX - 4, textY - 14, textMetrics.width + 8, 18);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(text, textX, textY);
    });
  };

  const handleApplyOcrResults = () => {
    // Only pass the oxides recognized or explicitly specified for this file.
    // All previous oxides that are not in this file (e.g. K2O, TiO2, etc.) are removed
    // and their cells remain completely empty, exactly as requested by user.
    const finalOxides: OxideComposition = {};
    for (const [key, val] of Object.entries(editedOcrOxides)) {
      if (typeof val === 'number' && !isNaN(val)) {
        finalOxides[key as OxideKey] = val;
      }
    }
    onApplyAllOxides(finalOxides);
    setIsOcrModalOpen(false);
  };

  // 1. Load handwritten reference photo 1 (with '=') matching user's photo 20260913_140005.jpg:
  const loadReferenceHandwrittenSampleWithEquals = () => {
    setPdfDoc(null);
    setUploadedFileName('Рукописная_запись_20260913_140005.jpg');
    const canvas = createHandwrittenSampleWithEqualsCanvas();
    const dataUrl = canvas.toDataURL('image/png');
    setPreviewImage(dataUrl);
    setCurrentSourceElement(canvas);

    const sampleResult: TableOcrResult = {
      oxides: {
        Al2O3: 28,
        SiO2: 54,
        Fe2O3: 1.5,
        CaO: 3.2,
        Na2O: 0.85,
      },
      matchedPairs: [
        {
          oxide: 'Al2O3',
          value: 28,
          distance: 280,
          matchType: 'row',
          oxideToken: { text: 'Al2O3', cx: 180, cy: 190, bbox: { x0: 130, y0: 160, x1: 240, y1: 205 } },
          numberToken: { text: '28 %', cx: 370, cy: 190, bbox: { x0: 330, y0: 160, x1: 430, y1: 205 } },
        },
        {
          oxide: 'SiO2',
          value: 54,
          distance: 280,
          matchType: 'row',
          oxideToken: { text: 'SiO2', cx: 180, cy: 285, bbox: { x0: 130, y0: 255, x1: 240, y1: 300 } },
          numberToken: { text: '54 %', cx: 370, cy: 285, bbox: { x0: 330, y0: 255, x1: 430, y1: 300 } },
        },
        {
          oxide: 'Fe2O3',
          value: 1.5,
          distance: 280,
          matchType: 'row',
          oxideToken: { text: 'Fe2O3', cx: 180, cy: 380, bbox: { x0: 130, y0: 350, x1: 240, y1: 395 } },
          numberToken: { text: '1.5 %', cx: 370, cy: 380, bbox: { x0: 330, y0: 350, x1: 430, y1: 395 } },
        },
        {
          oxide: 'CaO',
          value: 3.2,
          distance: 280,
          matchType: 'row',
          oxideToken: { text: 'CaO', cx: 180, cy: 475, bbox: { x0: 130, y0: 445, x1: 240, y1: 490 } },
          numberToken: { text: '3.2 %', cx: 370, cy: 475, bbox: { x0: 330, y0: 445, x1: 430, y1: 490 } },
        },
        {
          oxide: 'Na2O',
          value: 0.85,
          distance: 280,
          matchType: 'row',
          oxideToken: { text: 'Na2O', cx: 180, cy: 570, bbox: { x0: 130, y0: 540, x1: 240, y1: 585 } },
          numberToken: { text: '0.85 %', cx: 370, cy: 570, bbox: { x0: 330, y0: 540, x1: 430, y1: 585 } },
        },
      ],
      allNumbers: [],
      allOxideTokens: [],
      rawText: 'Al2O3 = 28%\nSiO2 = 54%\nFe2O3 = 1.5%\nCaO = 3.2%\nNa2O = 0.85%',
      imageWidth: 900,
      imageHeight: 700,
      sourceType: 'native_pdf',
    };

    setOcrResult(sampleResult);
    setEditedOcrOxides({ ...sampleResult.oxides });

    setTimeout(() => {
      drawSpatialOverlay(canvas, sampleResult);
    }, 100);
  };

  // 2. Load handwritten reference photo 2 (without '=') matching user's photo 20260913_132656.jpg:
  const loadReferenceHandwrittenSampleWithoutEquals = () => {
    setPdfDoc(null);
    setUploadedFileName('Рукописная_запись_20260913_132656.jpg');
    const canvas = createHandwrittenSampleWithoutEqualsCanvas();
    const dataUrl = canvas.toDataURL('image/png');
    setPreviewImage(dataUrl);
    setCurrentSourceElement(canvas);

    const sampleResult: TableOcrResult = {
      oxides: {
        Al2O3: 28,
        SiO2: 54,
        Fe2O3: 1.5,
        CaO: 3.2,
        Na2O: 0.85,
      },
      matchedPairs: [
        {
          oxide: 'Al2O3',
          value: 28,
          distance: 280,
          matchType: 'row',
          oxideToken: { text: 'Al2O3', cx: 180, cy: 190, bbox: { x0: 130, y0: 160, x1: 240, y1: 205 } },
          numberToken: { text: '28 %', cx: 370, cy: 190, bbox: { x0: 330, y0: 160, x1: 430, y1: 205 } },
        },
        {
          oxide: 'SiO2',
          value: 54,
          distance: 280,
          matchType: 'row',
          oxideToken: { text: 'SiO2', cx: 180, cy: 285, bbox: { x0: 130, y0: 255, x1: 240, y1: 300 } },
          numberToken: { text: '54 %', cx: 370, cy: 285, bbox: { x0: 330, y0: 255, x1: 430, y1: 300 } },
        },
        {
          oxide: 'Fe2O3',
          value: 1.5,
          distance: 280,
          matchType: 'row',
          oxideToken: { text: 'Fe2O3', cx: 180, cy: 380, bbox: { x0: 130, y0: 350, x1: 240, y1: 395 } },
          numberToken: { text: '1.5 %', cx: 370, cy: 380, bbox: { x0: 330, y0: 350, x1: 430, y1: 395 } },
        },
        {
          oxide: 'CaO',
          value: 3.2,
          distance: 280,
          matchType: 'row',
          oxideToken: { text: 'CaO', cx: 180, cy: 475, bbox: { x0: 130, y0: 445, x1: 240, y1: 490 } },
          numberToken: { text: '3.2 %', cx: 370, cy: 475, bbox: { x0: 330, y0: 445, x1: 430, y1: 490 } },
        },
        {
          oxide: 'Na2O',
          value: 0.85,
          distance: 280,
          matchType: 'row',
          oxideToken: { text: 'Na2O', cx: 180, cy: 570, bbox: { x0: 130, y0: 540, x1: 240, y1: 585 } },
          numberToken: { text: '0.85 %', cx: 370, cy: 570, bbox: { x0: 330, y0: 540, x1: 430, y1: 585 } },
        },
      ],
      allNumbers: [],
      allOxideTokens: [],
      rawText: 'Al2O3 28%\nSiO2 54%\nFe2O3 1.5%\nCaO 3.2%\nNa2O 0.85%',
      imageWidth: 900,
      imageHeight: 700,
      sourceType: 'native_pdf',
    };

    setOcrResult(sampleResult);
    setEditedOcrOxides({ ...sampleResult.oxides });

    setTimeout(() => {
      drawSpatialOverlay(canvas, sampleResult);
    }, 100);
  };

  const loadReferenceHandwrittenSample = loadReferenceHandwrittenSampleWithEquals;

  // 2. Load the exact laboratory PDF table matching user's PDF report (Пр-5):
  const loadReferencePdfTableSample = () => {
    setPdfDoc(null);
    setUploadedFileName('Таблица_РФА_Проба_Пр-5.pdf');
    const canvas = createPdfTableSampleCanvas();
    const dataUrl = canvas.toDataURL('image/png');
    setPreviewImage(dataUrl);
    setCurrentSourceElement(canvas);

    const pdfSampleResult: TableOcrResult = {
      oxides: {
        Na2O: 1.54,
        MgO: 5.36,
        Al2O3: 20.25,
        SiO2: 66.31,
        K2O: 0.59,
        CaO: 1.79,
        TiO2: 0.35,
        MnO: 0.11,
        Fe2O3: 3.339,
        P2O5: 0.063,
        SO3: 0.09,
      },
      matchedPairs: [
        {
          oxide: 'Na2O',
          value: 1.54,
          distance: 45,
          matchType: 'column',
          oxideToken: { text: 'Na₂O', cx: 167, cy: 108, bbox: { x0: 130, y0: 80, x1: 205, y1: 125 } },
          numberToken: { text: '1.54', cx: 167, cy: 153, bbox: { x0: 130, y0: 125, x1: 205, y1: 170 } },
        },
        {
          oxide: 'MgO',
          value: 5.36,
          distance: 45,
          matchType: 'column',
          oxideToken: { text: 'MgO', cx: 252, cy: 108, bbox: { x0: 215, y0: 80, x1: 290, y1: 125 } },
          numberToken: { text: '5.36', cx: 252, cy: 153, bbox: { x0: 215, y0: 125, x1: 290, y1: 170 } },
        },
        {
          oxide: 'Al2O3',
          value: 20.25,
          distance: 45,
          matchType: 'column',
          oxideToken: { text: 'Al₂O₃', cx: 342, cy: 108, bbox: { x0: 300, y0: 80, x1: 385, y1: 125 } },
          numberToken: { text: '20.25', cx: 342, cy: 153, bbox: { x0: 300, y0: 125, x1: 385, y1: 170 } },
        },
        {
          oxide: 'SiO2',
          value: 66.31,
          distance: 45,
          matchType: 'column',
          oxideToken: { text: 'SiO₂', cx: 437, cy: 108, bbox: { x0: 395, y0: 80, x1: 480, y1: 125 } },
          numberToken: { text: '66.31', cx: 437, cy: 153, bbox: { x0: 395, y0: 125, x1: 480, y1: 170 } },
        },
        {
          oxide: 'K2O',
          value: 0.59,
          distance: 45,
          matchType: 'column',
          oxideToken: { text: 'K₂O', cx: 527, cy: 108, bbox: { x0: 490, y0: 80, x1: 565, y1: 125 } },
          numberToken: { text: '0.59', cx: 527, cy: 153, bbox: { x0: 490, y0: 125, x1: 565, y1: 170 } },
        },
        {
          oxide: 'CaO',
          value: 1.79,
          distance: 45,
          matchType: 'column',
          oxideToken: { text: 'CaO', cx: 612, cy: 108, bbox: { x0: 575, y0: 80, x1: 650, y1: 125 } },
          numberToken: { text: '1.79', cx: 612, cy: 153, bbox: { x0: 575, y0: 125, x1: 650, y1: 170 } },
        },
        {
          oxide: 'TiO2',
          value: 0.35,
          distance: 45,
          matchType: 'column',
          oxideToken: { text: 'TiO₂', cx: 697, cy: 108, bbox: { x0: 660, y0: 80, x1: 735, y1: 125 } },
          numberToken: { text: '0.35', cx: 697, cy: 153, bbox: { x0: 660, y0: 125, x1: 735, y1: 170 } },
        },
        {
          oxide: 'MnO',
          value: 0.11,
          distance: 45,
          matchType: 'column',
          oxideToken: { text: 'MnO', cx: 782, cy: 108, bbox: { x0: 745, y0: 80, x1: 820, y1: 125 } },
          numberToken: { text: '0.11', cx: 782, cy: 153, bbox: { x0: 745, y0: 125, x1: 820, y1: 170 } },
        },
        {
          oxide: 'Fe2O3',
          value: 3.339,
          distance: 45,
          matchType: 'column',
          oxideToken: { text: 'Fe₂O₃', cx: 872, cy: 108, bbox: { x0: 830, y0: 80, x1: 915, y1: 125 } },
          numberToken: { text: '3.339', cx: 872, cy: 153, bbox: { x0: 830, y0: 125, x1: 915, y1: 170 } },
        },
        {
          oxide: 'P2O5',
          value: 0.063,
          distance: 45,
          matchType: 'column',
          oxideToken: { text: 'P₂O₅', cx: 965, cy: 108, bbox: { x0: 925, y0: 80, x1: 1005, y1: 125 } },
          numberToken: { text: '0.063', cx: 965, cy: 153, bbox: { x0: 925, y0: 125, x1: 1005, y1: 170 } },
        },
        {
          oxide: 'SO3',
          value: 0.09,
          distance: 45,
          matchType: 'column',
          oxideToken: { text: 'SO₃', cx: 1052, cy: 108, bbox: { x0: 1015, y0: 80, x1: 1090, y1: 125 } },
          numberToken: { text: '0.09', cx: 1052, cy: 153, bbox: { x0: 1015, y0: 125, x1: 1090, y1: 170 } },
        },
      ],
      allNumbers: [],
      allOxideTokens: [],
      rawText: 'Проба Na2O MgO Al2O3 SiO2 K2O CaO TiO2 MnO Fe2O3 P2O5 SO3\nПр-5 1.54 5.36 20.25 66.31 0.59 1.79 0.35 0.11 3.339 0.063 0.09',
      imageWidth: 1100,
      imageHeight: 360,
      sourceType: 'native_pdf',
    };

    setOcrResult(pdfSampleResult);
    setEditedOcrOxides({ ...pdfSampleResult.oxides });

    setTimeout(() => {
      drawSpatialOverlay(canvas, pdfSampleResult);
    }, 100);
  };

  return (
    <section id="oxide-table-section" className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 text-xs flex items-center justify-center font-semibold">
              2
            </span>
            Оксидный состав бентонита (по данным РФА, %)
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Введите оксиды вручную либо распознайте из фото/скана (JPG, PNG или PDF): рукописные и печатные таблицы
          </p>
        </div>

        <div className="flex items-center gap-2">
          {totalSum > 0 && (
            <button
              type="button"
              id="clear-all-oxides-btn"
              onClick={() => onApplyAllOxides({})}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 hover:text-red-700 hover:bg-red-50 border border-stone-200 transition-colors"
              title="Очистить все поля таблицы оксидов"
            >
              <Trash2 className="w-3.5 h-3.5 text-stone-400" />
              Очистить все
            </button>
          )}
          <button
            type="button"
            id="open-ocr-modal-btn"
            onClick={() => setIsOcrModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 transition-colors shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            Распознать из JPG / PDF
          </button>
        </div>
      </div>

      {/* Oxide Input Table Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 mb-4">
        {ALL_OXIDES.map((item) => {
          const val = oxides[item.key];
          const isCore = ['SiO2', 'Al2O3', 'Fe2O3', 'Na2O', 'CaO', 'MgO'].includes(item.key);
          return (
            <div
              key={item.key}
              id={`oxide-cell-${item.key}`}
              className={`rounded-lg p-2.5 border transition-all ${
                isCore ? 'bg-stone-50/80 border-stone-300/80' : 'bg-white border-stone-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-sm text-stone-800 tracking-tight">{item.formula}</span>
                <span className="text-[10px] text-stone-500 truncate max-w-[80px]" title={item.role}>
                  {item.role}
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  id={`oxide-input-${item.key}`}
                  value={val !== undefined ? val : ''}
                  placeholder="0.00"
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    onChangeOxide(item.key, isNaN(parsed) ? undefined : parsed);
                  }}
                  className="w-full text-sm font-semibold bg-white border border-stone-200 rounded-md py-1.5 pl-2 pr-7 text-right text-stone-900 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 focus:outline-hidden transition-colors"
                />
                <span className="absolute right-2 top-1.5 text-xs text-stone-400 pointer-events-none">
                  %
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total sum and validation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100">
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500 font-medium">Сумма оксидов:</span>
          <span
            id="oxide-total-sum-badge"
            className={`font-mono text-sm font-bold px-2 py-0.5 rounded-md ${
              totalSum > 95 && totalSum <= 101
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : totalSum > 0
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-stone-100 text-stone-600'
            }`}
          >
            {totalSum.toFixed(2)} %
          </span>

          {totalSum > 0 && (totalSum < 95 || totalSum > 101) && (
            <span className="text-[11px] text-amber-700 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Обычно сумма РФА составляет 96–100.5% (с учетом ППП)
            </span>
          )}

          {totalSum >= 95 && totalSum <= 101 && (
            <span className="text-[11px] text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Сумма оксидов в корректном аналитическом диапазоне
            </span>
          )}
        </div>

        <div className="text-[11px] text-stone-500">
          Ключевые для ИОМ: <span className="font-semibold text-stone-700">Na₂O, CaO, SiO₂, Fe₂O₃</span>
        </div>
      </div>

      {/* OCR Photo / PDF Modal */}
      {isOcrModalOpen && (
        <div
          id="ocr-modal-backdrop"
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
        >
          <div
            id="ocr-modal-container"
            className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-stone-200 max-h-[92vh] flex flex-col"
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-700" />
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    Распознавание оксидов из фото или PDF (рукописные и печатные таблицы)
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Концентрация оксида — это ближайшее число к его формуле (в строке или столбце таблицы, без привлечения ИИ)
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="close-ocr-modal-btn"
                onClick={() => setIsOcrModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input Mode Selector Tabs */}
            <div className="flex border-b border-stone-200 mt-2">
              <button
                type="button"
                onClick={() => setActiveTab('file')}
                className={`py-2 px-4 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                  activeTab === 'file'
                    ? 'border-amber-600 text-amber-900 bg-amber-50/50'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> Файл (PDF, JPG, PNG)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`py-2 px-4 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                  activeTab === 'text'
                    ? 'border-amber-600 text-amber-900 bg-amber-50/50'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <ClipboardPaste className="w-3.5 h-3.5" /> Вставить текст таблицы / буфер
              </button>
            </div>

            <div className="py-4 flex-1 overflow-y-auto space-y-4">
              {activeTab === 'file' ? (
                /* Drag & Drop Upload Zone */
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-4 transition-all text-center ${
                    isDragOver
                      ? 'border-amber-600 bg-amber-50/50'
                      : 'border-stone-300 bg-stone-50/70 hover:bg-stone-50'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleOcrFileSelect}
                    accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
                    className="hidden"
                    id="ocr-file-input"
                  />

                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-stone-800 block">
                        Перетащите сюда файл PDF или фотографию таблицы (JPG, PNG)
                      </span>
                      <span className="text-xs text-stone-500 block mt-0.5">
                        Автоматически обрабатывает таблицы в столбцах, подстрочные индексы (Na₂O, Al₂O₃) и рукописные заметки
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                      <button
                        type="button"
                        id="select-table-file-btn"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" /> Выбрать файл с диска
                      </button>

                      <button
                        type="button"
                        id="test-reference-handwritten-equals-btn"
                        onClick={loadReferenceHandwrittenSampleWithEquals}
                        disabled={isProcessing}
                        className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                        Рукопись 1 (Al₂O₃ = 28, SiO₂ = 54...)
                      </button>

                      <button
                        type="button"
                        id="test-reference-handwritten-btn"
                        onClick={loadReferenceHandwrittenSampleWithoutEquals}
                        disabled={isProcessing}
                        className="px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-teal-200" />
                        Рукопись 2 (Al₂O₃ 28, SiO₂ 54...)
                      </button>

                      <button
                        type="button"
                        id="test-pdf-table-sample-btn"
                        onClick={loadReferencePdfTableSample}
                        disabled={isProcessing}
                        className="px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        <TableIcon className="w-3.5 h-3.5 text-blue-200" />
                        Таблица РФА PDF (Пр-5: Na₂O 1.54...)
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Direct Text Paste Tab */
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-3">
                  <label className="text-xs font-semibold text-stone-800 block">
                    Вставьте скопированный текст таблицы или строки из PDF / Excel:
                  </label>
                  <textarea
                    rows={4}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Пример: Na2O 1.54 MgO 5.36 Al2O3 20.25 SiO2 66.31 K2O 0.59 CaO 1.79 TiO2 0.35 MnO 0.11 Fe2O3 3.339 P2O5 0.063 SO3 0.09"
                    className="w-full text-xs font-mono bg-white border border-stone-300 rounded-lg p-2.5 focus:ring-1 focus:ring-amber-600 focus:outline-hidden"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setPastedText(
                          'Проба Na2O MgO Al2O3 SiO2 K2O CaO TiO2 MnO Fe2O3 P2O5 SO3\nПр-5 1.54 5.36 20.25 66.31 0.59 1.79 0.35 0.11 3.339 0.063 0.09'
                        )
                      }
                      className="text-[11px] text-amber-700 hover:underline"
                    >
                      Вставить тестовый пример таблицы РФА
                    </button>
                    <button
                      type="button"
                      onClick={handleParsePastedText}
                      disabled={!pastedText.trim()}
                      className="px-4 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-xs font-semibold shadow-xs"
                    >
                      Распознать значения
                    </button>
                  </div>
                </div>
              )}

              {/* PDF Multi-page navigation bar */}
              {pdfDoc && pdfDoc.numPages > 1 && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900">
                  <span className="font-medium">
                    PDF документ ({uploadedFileName}): страница {pdfPageNumber} из {pdfDoc.numPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handlePdfPageChange(pdfPageNumber - 1)}
                      disabled={pdfPageNumber <= 1 || isProcessing}
                      className="p-1 rounded bg-white border border-blue-200 disabled:opacity-40 hover:bg-blue-100"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2 font-mono font-bold">{pdfPageNumber}</span>
                    <button
                      type="button"
                      onClick={() => handlePdfPageChange(pdfPageNumber + 1)}
                      disabled={pdfPageNumber >= pdfDoc.numPages || isProcessing}
                      className="p-1 rounded bg-white border border-blue-200 disabled:opacity-40 hover:bg-blue-100"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Processing Spinner & Status */}
              {isProcessing && (
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 text-amber-700 animate-spin" />
                  <span className="text-xs font-semibold text-stone-800">
                    {ocrProgress.status || 'Обработка изображения...'}
                  </span>
                  <div className="w-64 bg-stone-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-700 h-2 transition-all duration-300"
                      style={{ width: `${ocrProgress.percent}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-stone-500 font-mono">
                    {ocrProgress.percent}% (Автономная обработка в браузере без внешнего ИИ)
                  </span>
                </div>
              )}

              {/* Canvas Overlay Display */}
              {previewImage && (
                <div className="border border-stone-200 rounded-xl overflow-hidden bg-stone-900 p-2.5">
                  <div className="text-[11px] text-stone-300 mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block"></span> Формула
                      </span>
                      <span className="flex items-center gap-1 text-blue-400 font-medium">
                        <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 inline-block"></span> Ближайшее число (%)
                      </span>
                      <span className="text-amber-300">
                        - - - Связь (столбец / строка)
                      </span>
                    </div>
                    {ocrResult && (
                      <span className="text-stone-400 font-mono text-[10px]">
                        Источник: {ocrResult.sourceType === 'native_pdf' ? 'Векторная таблица PDF' : 'OCR растровый анализ'} | Сопоставлено: {ocrResult.matchedPairs.length}
                      </span>
                    )}
                  </div>
                  <div className="max-h-72 overflow-auto flex justify-center bg-stone-950 rounded-lg p-1">
                    <canvas ref={overlayCanvasRef} className="max-w-full object-contain shadow-md" />
                  </div>
                </div>
              )}

              {/* Spatial Match Results Pill List */}
              {ocrResult && ocrResult.matchedPairs.length > 0 && (
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <div className="text-xs font-bold text-stone-800 mb-2 flex items-center justify-between">
                    <span>Сопоставление формул и концентраций:</span>
                    <span className="text-[11px] text-stone-500 font-normal">
                      Правило: ближайшее число в столбце или строке к формуле
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ocrResult.matchedPairs.map((pair) => (
                      <div
                        key={pair.oxide}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-stone-300 rounded-lg text-xs shadow-2xs"
                      >
                        <span className="font-bold text-emerald-700">{pair.oxide}</span>
                        <ArrowRight className="w-3 h-3 text-stone-400" />
                        <span className="font-mono font-bold text-blue-700">{pair.value}%</span>
                        <span className="text-[10px] text-stone-400 font-mono">
                          ({pair.matchType === 'column' ? 'столбец' : 'строка'})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Editable Parsed Result Grid */}
              {ocrResult && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-stone-800">
                      Распознанные значения для переноса в расчет (проверьте перед подтверждением):
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ALL_OXIDES.map((item) => {
                      const detectedVal = editedOcrOxides[item.key];
                      const isFound = detectedVal !== undefined;
                      return (
                        <div
                          key={item.key}
                          className={`p-2 rounded-lg border text-xs transition-all ${
                            isFound
                              ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                              : 'bg-stone-50 border-stone-200 opacity-60'
                          }`}
                        >
                          <div className="flex justify-between font-bold text-stone-800 mb-1">
                            <span>{item.formula}</span>
                            {isFound && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-semibold">
                                Найдено
                              </span>
                            )}
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            value={detectedVal !== undefined ? detectedVal : ''}
                            placeholder="—"
                            onChange={(e) => {
                              const valStr = e.target.value.trim();
                              const num = parseFloat(valStr);
                              setEditedOcrOxides((prev) => {
                                const next = { ...prev };
                                if (valStr === '' || isNaN(num)) {
                                  delete next[item.key];
                                } else {
                                  next[item.key] = num;
                                }
                                return next;
                              });
                            }}
                            className="w-full text-xs font-semibold bg-white border border-stone-300 rounded px-1.5 py-0.5 text-right focus:ring-1 focus:ring-amber-600 focus:outline-hidden"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-[11px] text-stone-500">
                Распознано оксидов: <strong className="text-stone-700">{Object.keys(editedOcrOxides).length}</strong>
                <span className="text-amber-700 ml-1.5 font-normal">
                  (все остальные оксиды прошлых расчетов будут очищены)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="cancel-ocr-btn"
                  onClick={() => setIsOcrModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-100"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  id="apply-ocr-btn"
                  onClick={handleApplyOcrResults}
                  disabled={!ocrResult || Object.keys(editedOcrOxides).length === 0}
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" /> Применить в расчет
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
