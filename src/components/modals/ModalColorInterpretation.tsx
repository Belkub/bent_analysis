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
                Минералогическая классификация и фазовое состояние железа
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
                  <th className="px-3.5 py-2.5">Среда формирования и генезис</th>
                  <th className="px-3.5 py-2.5">Пригодность к ОМ и цвет геля</th>
                  <th className="px-3.5 py-2.5 text-center">Статус Fe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {BENTONITE_COLORS.map((c) => {
                  const isCurrent = c.id === selectedColorId;
                  const isStructural =
                    c.ironBehavior === 'structural' || c.ironBehavior === 'structural_siderite';
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
                      <td className="px-3.5 py-3 align-top text-stone-600 leading-snug">
                        <div className="font-medium text-stone-800">{c.organoSuitabilitySummary}</div>
                        {c.gelColorDescription && (
                          <div className="text-[11px] text-stone-500 mt-0.5 italic">
                            Гель: {c.gelColorDescription}
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-3 align-top text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold ${
                            isStructural
                              ? 'bg-blue-100 text-blue-800'
                              : c.ironBehavior === 'free_organics_sulfides' || c.ironBehavior === 'free_organics_manganese'
                              ? 'bg-stone-200 text-stone-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isStructural
                            ? 'Структурное'
                            : c.ironBehavior === 'free_organics_sulfides' || c.ironBehavior === 'free_organics_manganese'
                            ? 'Органика / Пирит'
                            : 'Свободный балласт'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Deep Dive: 4 Geochemical Behavior Classes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-slate-700" />
                1. Серый и белый бентонит (чистота и стабильность)
              </div>
              <p className="text-stone-600 leading-relaxed text-xs">
                В <strong>сером бентоните</strong> железо находится в умеренно-восстановленной форме (силикатное Fe²⁺/Fe³⁺ в октаэдрах смектита и микросидерит FeCO₃), свободные оксигидроксиды (гётит) отсутствуют. Поэтому серый бентонит дает однородные светлые дымчато-серые гели без желтизны и не катализирует термический распад ЧАС при температурах выше 150°C, являясь превосходной основой для глубоководного бурения HT-HP, клеев и серых грунтовок.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-blue-700" />
                2. Зеленый бентонит (структурное Fe²⁺)
              </div>
              <p className="text-stone-600 leading-relaxed text-xs">
                Ионы Fe²⁺ изоморфно замещают Al³⁺ непосредственно в октаэдрическом каркасе монтмориллонита (эффект нонтронитизации). Железо не образует отдельных минеральных фаз (Fe_балласт = 0). Глина сохраняет превосходную термостойкость и мягкость частиц, пригодна для прецизионных узлов и буровых систем HT-HP.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                3. Свободные оксиды железа (желтые и красные глины)
              </div>
              <p className="text-stone-600 leading-relaxed text-xs">
                Свободный гётит (желтый) и гематит (красный) присутствуют в виде твердых микро- и наночастиц. Они создают минеральный балласт, снижают прозрачность, окрашивают гели в охристые/кирпичные тона, работают как абразив в прецизионных смазках и катализируют термодеградацию четвертичных аммониевых солей при температурах выше 150°C.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-100/80 border border-stone-300 space-y-2">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
                <ShieldAlert className="w-4 h-4 text-stone-700" />
                4. Темно-коричневый / черный бентонит (гуматы, битумы, пирит)
              </div>
              <p className="text-stone-600 leading-relaxed text-xs">
                Высокое содержание дисперсного органического углерода (C_org, гуминовые и фульвокислоты) и аутигенных сульфидов железа (пирит FeS₂). Водорастворимые гуматы конкурируют с катионным ПАВ, увеличивают сорбцию ЧАС и действуют как дефлоккулянты в эмульсиях и полимерных клеях. Гели получаются темно-бурыми или черными. Оптимальная ниша — битумные мастики, антикоры и стандартные РУО.
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
