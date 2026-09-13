import React from 'react';
import { Tag, FileText, CheckCircle } from 'lucide-react';

interface SampleInfoInputProps {
  sampleName: string;
  onChangeSampleName: (name: string) => void;
}

export const SampleInfoInput: React.FC<SampleInfoInputProps> = ({
  sampleName,
  onChangeSampleName,
}) => {
  return (
    <div
      id="sample-name-card"
      className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5 shadow-xs transition-all hover:border-amber-300"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <Tag className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="sample-name-input-field"
                className="text-sm font-bold text-stone-900 tracking-tight flex items-center gap-1.5"
              >
                Название или шифр исследуемого образца бентонита
              </label>
              {sampleName.trim() && (
                <span className="inline-flex items-center text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <CheckCircle className="w-3 h-3 mr-1 text-emerald-600" /> Внесено в паспорт
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Введите наименование пробы, номер партии или месторождение. Это название будет указано в итоговом официальном PDF-паспорте.
            </p>
          </div>
        </div>

        <div className="w-full sm:w-80 lg:w-96 shrink-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
              <FileText className="w-4 h-4" />
            </div>
            <input
              type="text"
              id="sample-name-input-field"
              value={sampleName}
              onChange={(e) => onChangeSampleName(e.target.value)}
              placeholder="Например: Проба МТ-06 (Северо-Западный карьер)"
              className="w-full text-sm font-medium text-stone-900 bg-stone-50/70 hover:bg-white border border-stone-300 rounded-lg pl-9 pr-3.5 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-amber-600 focus:bg-white focus:border-amber-600 transition-all placeholder:text-stone-400 shadow-2xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
