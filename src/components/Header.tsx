import React from 'react';
import { Layers, RotateCcw, Sparkles, CheckCircle2 } from 'lucide-react';
import { BENCHMARK_PRESETS, SamplePreset } from '../data/mineralData';
import { BentoniteInputData } from '../types';

interface HeaderProps {
  onLoadPreset: (preset: SamplePreset) => void;
  onReset: () => void;
  selectedPresetId?: string;
}

export const Header: React.FC<HeaderProps> = ({ onLoadPreset, onReset, selectedPresetId }) => {
  return (
    <header id="app-header" className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-700 text-white flex items-center justify-center shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-stone-900 tracking-tight">
                  Органомодификация бентонита
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Автономный режим
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Оценка потенциала ОМ, индекса ИОМ, типа сырья по РФА, примесей и применимости по отраслям
              </p>
            </div>
          </div>

          {/* Quick Benchmark presets from documentation */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center text-xs font-semibold text-stone-600 mr-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 mr-1" /> Образцы из отчета:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {BENCHMARK_PRESETS.slice(0, 5).map((preset) => {
                const isActive = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    id={`preset-btn-${preset.id}`}
                    onClick={() => onLoadPreset(preset)}
                    title={preset.description}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
                      isActive
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200/80'
                    }`}
                  >
                    {preset.name.split(' (')[0]}
                  </button>
                );
              })}
            </div>
            <button
              id="reset-form-btn"
              onClick={onReset}
              title="Очистить поля"
              className="text-xs px-2.5 py-1 rounded-md text-stone-500 hover:text-stone-800 hover:bg-stone-100 border border-transparent transition-colors ml-1 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Сброс
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
