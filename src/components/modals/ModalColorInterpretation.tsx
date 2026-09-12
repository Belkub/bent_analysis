import React from 'react';
import { X, Palette, CheckCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { BentoniteColorId } from '../../types';
import { BENTONITE_COLORS } from '../../data/mineralData';

interface ModalColorInterpretationProps {
  isOpen: boolean;
  onClose: () => void;
  selectedColorId: BentoniteColorId;
}

export const ModalColorInterpretation: React.FC<ModalColorInterpretationProps> = ({
  isOpen,
  onClose,
  selectedColorId,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="modal-color-backdrop"
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
    >
      <div
        id="modal-color-container"
        className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Цветовая диагностика примесей в бентонитовых глинах
              </h3>
              <p className="text-xs text-stone-500">
                Минералогическая таблица-определитель и фазовое состояние железа (табл_1.pdf)
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
          {/* Introductory Concept */}
          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 leading-relaxed text-stone-600">
            Чистый монтмориллонит (основа бентонита) сам по себе практически бесцветен или имеет легкий белый/кремовый оттенок. Все многообразие цветов обусловлено хромофорными примесями — в первую очередь металлами с переменной валентностью (железо, марганец) и органикой.
          </div>

          {/* Core Table from Table 1 */}
          <div className="overflow-x-auto border border-stone-200 rounded-xl">
            <table className="min-w-full divide-y divide-stone-200 text-left">
              <thead className="bg-stone-100/80 text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                <tr>
                  <th className="px-3.5 py-2.5">Цвет комового бентонита</th>
                  <th className="px-3.5 py-2.5">Вероятные химические примеси и фазы</th>
                  <th className="px-3.5 py-2.5">Среда формирования и свойства</th>
                  <th className="px-3.5 py-2.5 text-center">Статус Fe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {BENTONITE_COLORS.map((c) => {
                  const isCurrent = c.id === selectedColorId;
                  return (
                    <tr
                      key={c.id}
                      className={`transition-colors ${
                        isCurrent ? 'bg-amber-50/70 font-medium' : 'hover:bg-stone-50/50'
                      }`}
                    >
                      <td className="px-3.5 py-3 align-top whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full border border-black/20 shrink-0 shadow-2xs"
                            style={{ backgroundColor: c.sampleHex }}
                          />
                          <div>
                            <span className="font-semibold text-stone-900 block">{c.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] text-amber-800 font-bold flex items-center gap-0.5">
                                <CheckCircle className="w-3 h-3" /> Текущий образец
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3.5 py-3 align-top text-stone-600 leading-snug">
                        {c.probableImpurities}
                      </td>
                      <td className="px-3.5 py-3 align-top text-stone-600 leading-snug">
                        {c.formationEnvironment}
                      </td>
                      <td className="px-3.5 py-3 align-top text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold ${
                            c.ironBehavior === 'structural'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {c.ironBehavior === 'structural' ? 'Структурное' : 'Свободный балласт'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Deep Dive: Structural vs Free Iron */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                1. Свободные примеси (желтые, красные, синие глины)
              </div>
              <p className="text-stone-600 leading-relaxed text-xs">
                Оксиды и сульфиды железа существуют как отдельные микро- и наночастицы (гётит, гематит, пирит). Они выступают жестким балластом, забивают межпакетные поры между тактоидами глины, мешают проникновению молекул ЧАС при органомодификации и могут катализировать термическую деградацию ПАВ при забойных температурах выше 150°C.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-blue-700" />
                2. Структурные примеси (зеленые глины)
              </div>
              <p className="text-stone-600 leading-relaxed text-xs">
                Ионы Fe²⁺ встроены непосредственно в октаэдрический скелет кристаллической решетки монтмориллонита вместо Al³⁺ (эффект нонтронитизации). Такая глина остается фазово чистой — на дифрактограмме РФА нет пиков оксидов железа, а железо не образует микроабразивных частиц. Однако поверхностный заряд меняется, влияя на обменную емкость.
              </p>
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
