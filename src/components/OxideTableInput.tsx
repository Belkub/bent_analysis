import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, X, Eye } from 'lucide-react';
import { OxideKey, OxideComposition } from '../types';
import { recognizeOxideTable, TableOcrResult, MatchedOxidePair } from '../utils/tableOcr';

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
  const [editedOcrOxides, setEditedOcrOxides] = useState<OxideComposition>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  // Total oxides sum calculation
  const totalSum = Object.values(oxides).reduce<number>(
    (acc, val) => acc + (typeof val === 'number' ? val : 0),
    0
  );

  const handleOcrFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviewImage(url);
    await runOcrOnUrl(url);
  };

  const runOcrOnUrl = async (imgUrl: string) => {
    setIsProcessing(true);
    setOcrProgress({ percent: 10, status: 'Инициализация OCR движка...' });
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = imgUrl;
      });

      const result = await recognizeOxideTable(img, (p, s) => {
        setOcrProgress({ percent: p, status: s });
      });

      setOcrResult(result);
      setEditedOcrOxides({ ...result.oxides });

      // Draw spatial links overlay on canvas after render
      setTimeout(() => {
        drawSpatialOverlay(img, result);
      }, 100);
    } catch (err) {
      console.error('OCR Error:', err);
      alert('Ошибка при распознавании таблицы. Проверьте четкость изображения или заполните поля вручную.');
    } finally {
      setIsProcessing(false);
    }
  };

  const drawSpatialOverlay = (img: HTMLImageElement, res: TableOcrResult) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    canvas.width = res.imageWidth;
    canvas.height = res.imageHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, res.imageWidth, res.imageHeight);

    // Draw lines and boxes for matched oxide-number pairs
    res.matchedPairs.forEach((pair, idx) => {
      const { oxideToken, numberToken } = pair;

      // Draw oxide box (amber)
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 3;
      ctx.strokeRect(
        oxideToken.bbox.x0,
        oxideToken.bbox.y0,
        oxideToken.bbox.x1 - oxideToken.bbox.x0,
        oxideToken.bbox.y1 - oxideToken.bbox.y0
      );

      // Draw number box (emerald)
      ctx.strokeStyle = '#059669';
      ctx.strokeRect(
        numberToken.bbox.x0,
        numberToken.bbox.y0,
        numberToken.bbox.x1 - numberToken.bbox.x0,
        numberToken.bbox.y1 - numberToken.bbox.y0
      );

      // Connecting arrow line (distance principle)
      ctx.beginPath();
      ctx.moveTo(oxideToken.cx, oxideToken.cy);
      ctx.lineTo(numberToken.cx, numberToken.cy);
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`${pair.oxide} → ${pair.value}%`, numberToken.cx + 5, numberToken.cy - 5);
    });
  };

  const handleApplyOcrResults = () => {
    onApplyAllOxides({ ...oxides, ...editedOcrOxides });
    setIsOcrModalOpen(false);
  };

  // Quick preset test tables for immediate verification without requiring external files
  const loadMockOcrTest = (type: 'handwritten' | 'printed') => {
    // Generate a synthetic test canvas image with handwritten / printed oxides
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 380;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background paper
    ctx.fillStyle = type === 'handwritten' ? '#faf7ee' : '#ffffff';
    ctx.fillRect(0, 0, 600, 380);

    // Draw lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let y = 40; y < 380; y += 35) {
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(580, y);
      ctx.stroke();
    }

    // Draw table content
    ctx.fillStyle = '#0f172a';
    ctx.font = type === 'handwritten' ? 'italic 20px cursive' : 'bold 18px monospace';
    ctx.fillText('РФА анализ оксидного состава бентонита (%)', 40, 30);

    const testEntries = [
      { ox: 'SiO2', val: '65.34' },
      { ox: 'Al2O3', val: '16.50' },
      { ox: 'Fe2O3', val: '3.45' },
      { ox: 'CaO', val: '2.10' },
      { ox: 'Na2O', val: '1.85' },
      { ox: 'MgO', val: '2.80' },
      { ox: 'K2O', val: '0.65' },
      { ox: 'TiO2', val: '0.24' },
    ];

    testEntries.forEach((entry, i) => {
      const y = 70 + i * 35;
      ctx.font = type === 'handwritten' ? '22px cursive' : 'bold 17px sans-serif';
      ctx.fillText(entry.ox, 60, y);
      // Position number close to formula with slight random offset to test distance proximity
      const xOffset = 220 + (type === 'handwritten' ? Math.sin(i) * 15 : 0);
      ctx.fillText(`${entry.val}%`, xOffset, y);
    });

    const dataUrl = canvas.toDataURL('image/png');
    setPreviewImage(dataUrl);
    runOcrOnUrl(dataUrl);
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
            Введите известные оксиды вручную либо загрузите фото таблицы (печатной или рукописной)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="open-ocr-modal-btn"
            onClick={() => setIsOcrModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5" />
            Загрузить фото таблицы
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
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-stone-900">{item.formula}</span>
                <span className="text-[10px] text-stone-400 font-mono">{item.key}</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0.00"
                  value={val !== undefined ? val : ''}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    onChangeOxide(item.key, isNaN(parsed) ? undefined : parsed);
                  }}
                  id={`oxide-input-${item.key}`}
                  className="w-full text-sm font-semibold text-stone-900 bg-white rounded-md border border-stone-300 px-2 py-1 pr-6 focus:outline-hidden focus:ring-2 focus:ring-amber-600 transition-all text-right"
                />
                <span className="absolute right-2 top-1 text-xs text-stone-400 pointer-events-none">
                  %
                </span>
              </div>
              <span className="text-[10px] text-stone-500 block truncate mt-1" title={item.role}>
                {item.role}
              </span>
            </div>
          );
        })}
      </div>

      {/* Total Sum & Validation Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-lg bg-stone-50 border border-stone-200/80 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-stone-600 font-medium">Сумма введенных оксидов:</span>
          <span className="font-bold font-mono text-stone-900 text-sm">
            {totalSum.toFixed(2)}%
          </span>
          {totalSum > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                totalSum >= 85 && totalSum <= 101
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {totalSum >= 85 && totalSum <= 101
                ? 'В норме для РФА (остаток — ППП/H₂O)'
                : 'Неполный состав (допустимо для экспресс-оценки)'}
            </span>
          )}
        </div>

        <div className="text-[11px] text-stone-500">
          Ключевые для ИОМ: <span className="font-semibold text-stone-700">Na₂O, CaO, SiO₂, Fe₂O₃</span>
        </div>
      </div>

      {/* OCR Photo Modal */}
      {isOcrModalOpen && (
        <div
          id="ocr-modal-backdrop"
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
        >
          <div
            id="ocr-modal-container"
            className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-stone-200 max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-700" />
                <h3 className="text-base font-bold text-stone-900">
                  Распознавание таблицы оксидов по фото
                </h3>
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

            <div className="py-4 flex-1 overflow-y-auto space-y-4">
              <div className="text-xs text-stone-600 bg-amber-50/70 border border-amber-200 rounded-lg p-3">
                <strong>Автономный алгоритм пространственного сопоставления:</strong> Приложение находит формулы оксидов (печать или рукописные) и связывает каждое число с ближайшей формулой по евклидовому расстоянию. Таблица может содержать любое количество оксидов (2, 3, 4 и более).
              </div>

              {/* Upload Controls and Quick Mock Previews */}
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleOcrFileSelect}
                  accept="image/*"
                  className="hidden"
                  id="ocr-file-input"
                />
                <button
                  type="button"
                  id="select-table-photo-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
                >
                  <Upload className="w-4 h-4" /> Выбрать файл с фото таблицы
                </button>

                <span className="text-xs text-stone-400">или протестируйте образец:</span>

                <button
                  type="button"
                  id="test-printed-sample-btn"
                  onClick={() => loadMockOcrTest('printed')}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-medium"
                >
                  Тест: Печатная таблица
                </button>
                <button
                  type="button"
                  id="test-handwritten-sample-btn"
                  onClick={() => loadMockOcrTest('handwritten')}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-medium"
                >
                  Тест: Рукописные заметки
                </button>
              </div>

              {/* Processing Spinner & Status */}
              {isProcessing && (
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 text-amber-700 animate-spin" />
                  <span className="text-xs font-semibold text-stone-800">
                    {ocrProgress.status || 'Обработка изображения...'}
                  </span>
                  <div className="w-48 bg-stone-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-700 h-2 transition-all duration-300"
                      style={{ width: `${ocrProgress.percent}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-stone-500 font-mono">
                    {ocrProgress.percent}% (Автономно в браузере)
                  </span>
                </div>
              )}

              {/* Canvas Overlay Display */}
              {previewImage && (
                <div className="border border-stone-200 rounded-xl overflow-hidden bg-stone-900 p-2">
                  <div className="text-[11px] text-stone-300 mb-1 flex items-center justify-between">
                    <span>
                      Карта пространственного связывания: <strong className="text-amber-400">Оксид</strong> → <strong className="text-emerald-400">Ближайшее число</strong>
                    </span>
                    {ocrResult && (
                      <span className="text-stone-400">
                        Найдено пар: {ocrResult.matchedPairs.length}
                      </span>
                    )}
                  </div>
                  <div className="max-h-64 overflow-auto flex justify-center bg-stone-800 rounded-lg">
                    <canvas ref={overlayCanvasRef} className="max-w-full object-contain" />
                  </div>
                </div>
              )}

              {/* Editable Parsed Result Preview */}
              {ocrResult && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-stone-800">
                      Распознанные оксиды (проверьте и при необходимости скорректируйте):
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ALL_OXIDES.map((item) => {
                      const detectedVal = editedOcrOxides[item.key];
                      return (
                        <div
                          key={item.key}
                          className={`p-2 rounded-lg border text-xs ${
                            detectedVal !== undefined
                              ? 'bg-emerald-50/70 border-emerald-300'
                              : 'bg-stone-50 border-stone-200 opacity-60'
                          }`}
                        >
                          <div className="flex justify-between font-bold text-stone-800 mb-1">
                            <span>{item.formula}</span>
                            {detectedVal !== undefined && (
                              <span className="text-[10px] text-emerald-700">Найдено</span>
                            )}
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            value={detectedVal !== undefined ? detectedVal : ''}
                            placeholder="—"
                            onChange={(e) => {
                              const num = parseFloat(e.target.value);
                              setEditedOcrOxides((prev) => ({
                                ...prev,
                                [item.key]: isNaN(num) ? undefined : num,
                              }));
                            }}
                            className="w-full text-xs font-semibold bg-white border border-stone-300 rounded px-1.5 py-0.5 text-right"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-3">
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
                <CheckCircle2 className="w-4 h-4" /> Применить в форму
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
