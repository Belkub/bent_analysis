import React from 'react';
import { Layers, RotateCcw, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  onReset: () => void;
  onLoadPreset?: (preset: any) => void;
  selectedPresetId?: string;
}

export const Header: React.FC<HeaderProps> = ({ onReset }) => {
  return (
    <header id="app-header" className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-700 text-white flex items-center justify-center shadow-sm shrink-0">
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

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="reset-form-btn"
              onClick={onReset}
              title="Очистить все поля формы"
              className="text-xs px-3 py-1.5 rounded-lg text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-colors flex items-center gap-1.5 font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Сбросить форму
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

