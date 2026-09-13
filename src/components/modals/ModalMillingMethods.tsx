import React from 'react';
import { X, Cog, Wind, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { IndustrySuitability } from '../../types';

interface ModalMillingMethodsProps {
  isOpen: boolean;
  onClose: () => void;
  suitableIndustries: IndustrySuitability[];
  allIndustries: IndustrySuitability[];
}

export const ModalMillingMethods: React.FC<ModalMillingMethodsProps> = ({
  isOpen,
  onClose,
  suitableIndustries,
  allIndustries,
}) => {
  if (!isOpen) return null;

  const suitableIds = new Set(suitableIndustries.map((ind) => ind.subIndustryId));

  return (
    <div
      id="modal-milling-backdrop"
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
    >
      <div
        id="modal-milling-container"
        className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Cog className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Методы помола, диспергирования и гранулометрия органоглин
              </h3>
              <p className="text-xs text-stone-500">
                Требования к тонкости D50/D99, ситовому рассеву и характеристика 5 промышленных методов помола
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
          {/* Specific Requirements for Applicable Classes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-900 text-sm">
                Требования к помолу для приемлемых классов применения
              </h4>
              <span className="text-amber-800 font-medium">
                Приемлемо классов: {suitableIndustries.length}
              </span>
            </div>

            <div className="overflow-x-auto border border-stone-200 rounded-xl">
              <table className="min-w-full divide-y divide-stone-200 text-left">
                <thead className="bg-stone-100 text-[10px] font-bold text-stone-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2.5">Отрасль / Класс</th>
                    <th className="px-3 py-2.5">Паста / Суспензия</th>
                    <th className="px-3 py-2.5">Макс. песок (&gt;44мкм)</th>
                    <th className="px-3 py-2.5">Оптимальный метод помола</th>
                    <th className="px-3 py-2.5">Неподходящий / Допустимый</th>
                    <th className="px-3 py-2.5">Требуемый размер частиц (D50, D99, сита)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 bg-white">
                  {allIndustries.map((ind) => {
                    const isAccepted = suitableIds.has(ind.subIndustryId);
                    return (
                      <tr
                        key={ind.subIndustryId}
                        className={`transition-colors ${
                          isAccepted ? 'bg-emerald-50/70' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <td className="px-3 py-2.5 align-top whitespace-nowrap">
                          <span className="font-mono font-bold text-stone-900 mr-1.5">{ind.code}</span>
                          <span className="font-bold text-stone-900">{ind.name}</span>
                          {isAccepted && (
                            <span className="block text-[10px] text-emerald-700 font-semibold mt-0.5">
                              ✓ Приемлемо для образца
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 align-top whitespace-nowrap text-[11px]">
                          <div>Паста: <strong>{ind.pasteAllowed}</strong></div>
                          <div>Суспензия: <strong>{ind.suspensionAllowed}</strong></div>
                        </td>
                        <td className="px-3 py-2.5 align-top font-mono font-semibold text-stone-900 whitespace-nowrap">
                          &lt; {ind.maxSand}%
                        </td>
                        <td className="px-3 py-2.5 align-top text-stone-800 leading-snug">
                          {ind.optimalMilling}
                        </td>
                        <td className="px-3 py-2.5 align-top text-stone-600 leading-snug">
                          {ind.suboptimalMilling}
                        </td>
                        <td className="px-3 py-2.5 align-top font-mono text-[11px] text-stone-800">
                          {ind.particleSize}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5 Methods Detailed Encyclopedia */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-stone-900 text-sm">
              Характеристика способов диспергирования (помола) органоглин
            </h4>
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-600 leading-relaxed text-[11px]">
              Измельчение органоглины — сложная задача, так как частицы покрыты слоем катионного ПАВ, который при нагреве плавится, а при ударе работает как пластичная смазка, заставляя частицы слипаться (агломерироваться).
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Method 1 */}
              <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-xs">
                    1. Молотковые и щековые мельницы (Грубый)
                  </span>
                  <span className="px-1.5 py-0.5 rounded-xs bg-red-100 text-red-800 text-[10px] font-bold">
                    Крайне нежелательно
                  </span>
                </div>
                <p className="text-stone-600 text-[11px]">
                  <strong>Принцип:</strong> Прямой кинетический удар тяжелых стальных молотков.
                </p>
                <p className="text-stone-600 text-[11px]">
                  <strong>Для ОГ:</strong> Вызывают сильный локальный перегрев. Органоглина плавится, налипает на стенки камеры, происходит термическая деградация ЧАС с резким выделением запаха свободного амина.
                </p>
              </div>

              {/* Method 2 */}
              <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-xs">
                    2. Роторно-ножевые и ударные (Средний)
                  </span>
                  <span className="px-1.5 py-0.5 rounded-xs bg-amber-100 text-amber-800 text-[10px] font-bold">
                    Допустимо для базы
                  </span>
                </div>
                <p className="text-stone-600 text-[11px]">
                  <strong>Принцип:</strong> Измельчение быстро вращающимися ножами/билами с калибровочной сеткой.
                </p>
                <p className="text-stone-600 text-[11px]">
                  <strong>Для ОГ:</strong> Допустимо для базовых буровых марок и мастик. Дают медианный размер 50–80 мкм. Главный технологический минус — высокий риск замазывания сетки пластичной органоглиной.
                </p>
              </div>

              {/* Method 3 */}
              <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-xs">
                    3. Трибокинетика (с классификатором)
                  </span>
                  <span className="px-1.5 py-0.5 rounded-xs bg-blue-100 text-blue-800 text-[10px] font-bold">
                    Идеал для пасты
                  </span>
                </div>
                <p className="text-stone-600 text-[11px]">
                  <strong>Принцип:</strong> Разгон ротором и удар о стальные отбойники с выносом воздухом.
                </p>
                <p className="text-stone-600 text-[11px]">
                  <strong>Для ОГ:</strong> Отлично для метода пасты под мастики. Дает срез до 40 мкм без перегрева. Минус: удар о металл сплющивает пакеты в плотные «чешуйки», поэтому такая ОГ не может быть самодиспергирующейся.
                </p>
              </div>

              {/* Method 4 */}
              <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-xs">
                    4. Струйные мельницы (Jet Mill)
                  </span>
                  <span className="px-1.5 py-0.5 rounded-xs bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Оптимальный сухой метод
                  </span>
                </div>
                <p className="text-stone-600 text-[11px]">
                  <strong>Принцип:</strong> Встречные сверхзвуковые потоки воздуха: автогенный удар «частица о частицу».
                </p>
                <p className="text-stone-600 text-[11px]">
                  <strong>Для ОГ:</strong> Воздух охлаждается при расширении — перегрев исключен. «Распушает» тактоиды по спайности. Дает размер 1–10 мкм, исключает абразивные задиры в подшипниках.
                </p>
              </div>

              {/* Method 5 */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-300 shadow-2xs space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                    <Wind className="w-4 h-4 text-emerald-700" />
                    5. Распылительная сушка (Spray Drying) — Премиум-сегмент
                  </span>
                  <span className="px-2 py-0.5 rounded-xs bg-emerald-700 text-white text-[10px] font-bold">
                    Абсолютный идеал
                  </span>
                </div>
                <p className="text-stone-700 text-[11px]">
                  <strong>Принцип:</strong> Жидкая суспензия ОГ впрыскивается через форсунку в сушильную башню с горячим газом. Капли мгновенно высыхают в полете, формируя пористые микросфероиды (20–80 мкм).
                </p>
                <p className="text-stone-700 text-[11px]">
                  <strong>Для ОГ:</strong> Это не помол, а архитектурное конструирование микрочастиц. Благодаря капиллярной структуре, в неполярном растворителе сферы лопаются изнутри. Дает <strong>100% эффект самодиспергирования</strong> без высоких сдвиговых усилий.
                </p>
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
