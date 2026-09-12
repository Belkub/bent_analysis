import React from 'react';
import { X, Activity, Droplets, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';
import { IndustrySuitability } from '../../types';

interface ModalGelCharacteristicsProps {
  isOpen: boolean;
  onClose: () => void;
  suitableIndustries: IndustrySuitability[];
  allIndustries: IndustrySuitability[];
}

export const ModalGelCharacteristics: React.FC<ModalGelCharacteristicsProps> = ({
  isOpen,
  onClose,
  suitableIndustries,
  allIndustries,
}) => {
  if (!isOpen) return null;

  const suitableIds = new Set(suitableIndustries.map((ind) => ind.subIndustryId));

  return (
    <div
      id="modal-gel-backdrop"
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
    >
      <div
        id="modal-gel-container"
        className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Droplets className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Характеристики и условия тестирования гелей органоглин (6% суспензии)
              </h3>
              <p className="text-xs text-stone-500">
                Целевые среды, полярность, вискозиметрия FANN-35 и Брукфильда, оптика геля
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 flex-1 overflow-y-auto space-y-5 text-xs text-stone-700">
          {/* Status banner for current bentonite */}
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
            <span className="text-amber-900 font-semibold">
              Приемлемо отраслей для текущего образца: <strong className="font-bold">{suitableIndustries.length}</strong> из {allIndustries.length}
            </span>
            <span className="text-[11px] text-amber-800">
              Выделены зеленым цветом в таблице ниже
            </span>
          </div>

          {/* Rheological Specifications Table */}
          <div className="overflow-x-auto border border-stone-200 rounded-xl">
            <table className="min-w-full divide-y divide-stone-200 text-left">
              <thead className="bg-stone-100 text-[10px] font-bold text-stone-700 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">Отрасль применения</th>
                  <th className="px-3 py-2.5">Целевая среда и полярность</th>
                  <th className="px-3 py-2.5">FANN-35 (ДТ / Уайт-спирит)</th>
                  <th className="px-3 py-2.5">FANN-35 (Ксилол)</th>
                  <th className="px-3 py-2.5">Брукфильд (6% гель)</th>
                  <th className="px-3 py-2.5">Внешний вид и цвет геля</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {allIndustries.map((ind) => {
                  const isAccepted = suitableIds.has(ind.subIndustryId);
                  return (
                    <tr
                      key={ind.subIndustryId}
                      className={`transition-colors ${
                        isAccepted ? 'bg-emerald-50/60' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <td className="px-3 py-3 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-stone-900">{ind.code}</span>
                          <div>
                            <span className="font-bold text-stone-900 block">{ind.name}</span>
                            <span className="text-[10px] text-stone-500">{ind.category}</span>
                            {isAccepted ? (
                              <span className="inline-flex items-center text-[10px] text-emerald-700 font-semibold gap-0.5 mt-0.5">
                                <CheckCircle2 className="w-3 h-3" /> Приемлемо
                              </span>
                            ) : (
                              <span className="text-[10px] text-stone-400 block mt-0.5">
                                Не соответствует нормам
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <strong className="text-stone-800 block">{ind.targetMedium}</strong>
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded-sm bg-stone-100 text-[10px] font-medium text-stone-600">
                          {ind.polarity}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top font-mono text-[11px] text-stone-800">
                        {ind.fann35Dt}
                      </td>
                      <td className="px-3 py-3 align-top font-mono text-[11px] text-stone-800">
                        {ind.fann35Xylene}
                      </td>
                      <td className="px-3 py-3 align-top font-mono text-[11px] text-stone-800">
                        {ind.brookfield}
                      </td>
                      <td className="px-3 py-3 align-top text-stone-600 leading-snug">
                        {ind.gelAppearance}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Expert Technical Notes from Реология ОГ.pdf */}
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
            <h4 className="font-bold text-stone-900 text-xs flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-700" />
              Ключевые закономерности реологических испытаний
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-stone-600 text-[11px] leading-relaxed">
              <div className="p-3 bg-white rounded-lg border border-stone-200">
                <strong className="text-stone-900 block mb-1">
                  1. Премиальные ЛКМ (4б):
                </strong>
                Органоглины типа "Self-dispersing" (на бензильных ЧАС) обладают высоким сродством к ароматике. В ксилоле дают вязкость 80–100 по FANN-35 сразу ДО активации polar-активатором. Прирост после активатора всего 20–30%.
              </div>

              <div className="p-3 bg-white rounded-lg border border-stone-200">
                <strong className="text-stone-900 block mb-1">
                  2. Буровые глины (1а, 1б):
                </strong>
                Модифицируются диметил-ди(гидрогенизированным талловым) аммонием (2M2HT). В чистом ксилоле сворачиваются в мицеллы. Максимум вязкости достигается в дизеле при обязательном присутствии полярного активатора.
              </div>

              <div className="p-3 bg-white rounded-lg border border-stone-200">
                <strong className="text-stone-900 block mb-1">
                  3. Индекс тиксотропии (Брукфильд):
                </strong>
                Для тиксотропных гелей ОГ отношение вязкости при 10 об/мин к вязкости при 100 об/мин (η₁₀ / η₁₀₀) должно быть не менее <strong>3.5 – 4.0</strong> для гарантии отсутствия оседания пигментов.
              </div>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-stone-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
