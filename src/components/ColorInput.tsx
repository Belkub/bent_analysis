import React, { useRef, useState } from 'react';
import { Camera, Upload, Pipette, Info, Check, AlertCircle } from 'lucide-react';
import { BentoniteColorId } from '../types';
import { BENTONITE_COLORS } from '../data/mineralData';
import { detectColorFromImage, ColorDetectionResult, rgbToHsv, classifyHsvToBentoniteColor } from '../utils/colorDetector';

interface ColorInputProps {
  selectedColorId: BentoniteColorId;
  onChangeColor: (colorId: BentoniteColorId) => void;
  photoUrl?: string;
  onPhotoUploaded?: (photoUrl: string) => void;
}

export const ColorInput: React.FC<ColorInputProps> = ({
  selectedColorId,
  onChangeColor,
  photoUrl,
  onPhotoUploaded,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectionInfo, setDetectionInfo] = useState<ColorDetectionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pipetteActive, setPipetteActive] = useState(false);

  const selectedColor = BENTONITE_COLORS.find((c) => c.id === selectedColorId) || BENTONITE_COLORS[0];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsAnalyzing(true);
    try {
      const url = URL.createObjectURL(file);
      if (onPhotoUploaded) {
        onPhotoUploaded(url);
      }

      const res = await detectColorFromImage(url);
      setDetectionInfo(res);
      onChangeColor(res.colorId);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Не удалось обработать изображение. Выберите цвет вручную.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Allow clicking on image canvas to sample pixel
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const r = pixel[0];
    const g = pixel[1];
    const b = pixel[2];

    const hsv = rgbToHsv(r, g, b);
    const { colorId, confidence } = classifyHsvToBentoniteColor(hsv);
    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

    setDetectionInfo({
      colorId,
      hex,
      rgb: { r, g, b },
      hsv,
      confidence,
    });
    onChangeColor(colorId);
  };

  // Sample photos to test immediately
  const handleLoadSamplePhoto = (sampleUrl: string, targetId: BentoniteColorId) => {
    if (onPhotoUploaded) onPhotoUploaded(sampleUrl);
    onChangeColor(targetId);
  };

  return (
    <section id="color-input-section" className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 text-xs flex items-center justify-center font-semibold">
              1
            </span>
            Цвет природного бентонита
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Классификация цвета (ручной выбор или распознавание по фото)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            id="bentonite-photo-file-input"
          />
          <button
            type="button"
            id="upload-photo-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            {isAnalyzing ? 'Распознавание...' : 'Загрузить фото глины'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Color Dropdown & Swatch selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="color-select-dropdown" className="block text-xs font-semibold text-stone-700 mb-1.5">
            Категория цвета:
          </label>
          <select
            id="color-select-dropdown"
            value={selectedColorId}
            onChange={(e) => onChangeColor(e.target.value as BentoniteColorId)}
            className="w-full text-sm rounded-lg border border-stone-300 bg-stone-50/50 px-3 py-2 text-stone-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-600 focus:bg-white transition-all"
          >
            {BENTONITE_COLORS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Quick Swatch Palette */}
          <div className="mt-3">
            <span className="text-[11px] font-medium text-stone-500 mb-1.5 block">
              Быстрый выбор образца оттенка:
            </span>
            <div className="flex flex-wrap gap-2">
              {BENTONITE_COLORS.map((c) => {
                const isSelected = c.id === selectedColorId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    id={`swatch-btn-${c.id}`}
                    onClick={() => onChangeColor(c.id)}
                    title={c.name}
                    className={`group relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border transition-all ${
                      isSelected
                        ? 'border-amber-700 bg-amber-50/60 font-semibold text-stone-900 shadow-xs ring-1 ring-amber-700'
                        : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-2xs shrink-0"
                      style={{ backgroundColor: c.sampleHex }}
                    />
                    <span className="truncate max-w-[110px]">{c.shortName}</span>
                    {isSelected && <Check className="w-3 h-3 text-amber-700 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Color Information card from Table 1 */}
        <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded-md border border-stone-300 shadow-xs"
                  style={{ backgroundColor: selectedColor.sampleHex }}
                />
                <span className="text-xs font-bold text-stone-900">
                  {selectedColor.name}
                </span>
              </div>
              {detectionInfo && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                  Определено по фото ({detectionInfo.confidence}%)
                </span>
              )}
            </div>

            <div className="text-xs text-stone-600 space-y-1.5 mt-2">
              <p>
                <strong className="text-stone-700">Вероятные примеси:</strong> {selectedColor.probableImpurities}
              </p>
              <p>
                <strong className="text-stone-700">Среда формирования:</strong> {selectedColor.formationEnvironment}
              </p>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-stone-200/80 flex items-center justify-between text-[11px]">
            <span className="text-stone-500">Поведение железа (РФА):</span>
            <span
              className={`font-semibold px-2 py-0.5 rounded-md ${
                selectedColor.ironBehavior === 'structural'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {selectedColor.ironBehavior === 'structural'
                ? 'Структурное Fe (Fe_балласт = 0)'
                : 'Свободное Fe (балласт гематит/гётит)'}
            </span>
          </div>
        </div>
      </div>

      {/* Uploaded Photo Preview and Pixel Sampling */}
      {photoUrl && (
        <div className="mt-4 pt-3 border-t border-stone-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
              <Pipette className="w-3.5 h-3.5 text-stone-500" /> Загруженное фото бентонита (кликните для выбора точки):
            </span>
            {detectionInfo && (
              <span className="text-xs text-stone-500 flex items-center gap-1.5">
                Цвет точки:
                <span
                  className="w-3.5 h-3.5 rounded-sm border border-stone-300 inline-block"
                  style={{ backgroundColor: detectionInfo.hex }}
                />
                <code className="text-[11px] text-stone-600">{detectionInfo.hex}</code>
              </span>
            )}
          </div>
          <div className="relative inline-block border border-stone-200 rounded-lg overflow-hidden bg-stone-100 max-h-48">
            <img
              id="uploaded-bentonite-img"
              src={photoUrl}
              alt="Бентонит"
              className="max-h-48 max-w-full object-contain cursor-crosshair"
              onLoad={(e) => {
                const img = e.currentTarget;
                const canvas = canvasRef.current;
                if (!canvas) return;
                canvas.width = img.naturalWidth || 300;
                canvas.height = img.naturalHeight || 200;
                const ctx = canvas.getContext('2d');
                if (ctx) ctx.drawImage(img, 0, 0);
              }}
              onClick={(e) => {
                // We forward the click to invisible canvas sampling
                const img = e.currentTarget;
                const canvas = canvasRef.current;
                if (!canvas) return;
                const rect = img.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                const x = Math.floor((e.clientX - rect.left) * scaleX);
                const y = Math.floor((e.clientY - rect.top) * scaleY);

                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                const pixel = ctx.getImageData(x, y, 1, 1).data;
                const r = pixel[0];
                const g = pixel[1];
                const b = pixel[2];
                const hsv = rgbToHsv(r, g, b);
                const { colorId, confidence } = classifyHsvToBentoniteColor(hsv);
                const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
                setDetectionInfo({
                  colorId,
                  hex,
                  rgb: { r, g, b },
                  hsv,
                  confidence,
                });
                onChangeColor(colorId);
              }}
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      )}
    </section>
  );
};
