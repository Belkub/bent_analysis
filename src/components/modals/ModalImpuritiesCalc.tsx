import React from 'react';
import { X, Calculator, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ImpurityCalculationDetails, BentoniteColorId } from '../../types';
import { BENTONITE_COLORS } from '../../data/mineralData';

interface ModalImpuritiesCalcProps {
  isOpen: boolean;
  onClose: () => void;
  impurities: ImpurityCalculationDetails;
  colorId: BentoniteColorId;
  effectiveSmectite?: number;
  smectiteSource?: 'input' | 'xrf_calc' | 'cec_matrix';
  cecStandardUsed?: number;
  cec?: number;
  inputSmectite?: number;
}

export const ModalImpuritiesCalc: React.FC<ModalImpuritiesCalcProps> = ({
  isOpen,
  onClose,
  impurities,
  colorId,
  effectiveSmectite,
  smectiteSource = 'input',
  cecStandardUsed = 100,
  cec,
  inputSmectite,
}) => {
  if (!isOpen) return null;

  const colorInfo = BENTONITE_COLORS.find((c) => c.id === colorId) || BENTONITE_COLORS[0];

  return (
    <div
      id="modal-impurities-backdrop"
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
    >
      <div
        id="modal-impurities-container"
        className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Подробный расчет примесей и смектита
              </h3>
              <p className="text-xs text-stone-500">
                Минералогический алгоритм разделения балласта по данным РФА (табл_2.pdf)
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
          {!impurities.isSufficientData ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold mb-1">Данных оксидов недостаточно для полного минерального баланса</strong>
                Для расчета свободного песка, карбонатов и балласта требуются процентные доли оксидов: <span className="font-mono font-semibold">SiO₂, Al₂O₃, CaO, Fe₂O₃</span>. Введите их в таблице оксидов.
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Calcite and Exchangeable Na/Ca */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-sm">
                    Шаг 1. Кальцит (мел) и обменный кальций (решение континуума Na/Ca)
                  </span>
                  <span className="px-2 py-0.5 rounded-sm bg-stone-200 text-stone-800 font-mono font-semibold">
                    CaCO₃ = {impurities.calciteCaCO3}%
                  </span>
                </div>
                <p className="text-stone-600 leading-relaxed">
                  Базовая емкость чистого смектита вмещает максимум 3.0% CaO. Доля обменного (полезного) кальция определяется на основе концентрации Na₂O:
                </p>
                <div className="bg-white p-2.5 rounded-lg border border-stone-200/80 font-mono text-[11px] text-stone-800 space-y-1">
                  <div>• Если Na₂O ≥ 1.5%: CaO_обм = 1.0%</div>
                  <div>• Если Na₂O ≤ 0.5%: CaO_обм = 3.0%</div>
                  <div>• Если 0.5% &lt; Na₂O &lt; 1.5%: CaO_обм = 4.0 - 2 × Na₂O = <strong className="text-amber-700">{impurities.caoExchangeable}%</strong></div>
                  <div className="pt-1 border-t border-stone-100 font-semibold text-stone-900">
                    Балластный мел (CaCO₃) = max(0, (CaO_РФА - CaO_обм) × 1.78) = ({impurities.caoTotal} - {impurities.caoExchangeable}) × 1.78 = <strong className="text-emerald-700">{impurities.calciteCaCO3}%</strong>
                  </div>
                </div>
              </div>

              {/* Step 2: Sand (Free Quartz / Cristobalite) */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-sm">
                    Шаг 2. Песок (свободный кварц / кристобалит)
                  </span>
                  <span className="px-2 py-0.5 rounded-sm bg-stone-200 text-stone-800 font-mono font-semibold">
                    SiO₂_своб = {impurities.freeSiO2}%
                  </span>
                </div>
                <p className="text-stone-600 leading-relaxed">
                  Монтмориллонит связывает кремний в каркас в стехиометрическом отношении к алюминию примерно 2.6 : 1. Весь кремний сверх этого отношения — свободный песок:
                </p>
                <div className="bg-white p-2.5 rounded-lg border border-stone-200/80 font-mono text-[11px] text-stone-800">
                  SiO₂_своб = max(0, SiO₂_РФА - (Al₂O₃_РФА × 2.6)) = <strong className="text-emerald-700">{impurities.freeSiO2}%</strong>
                </div>
              </div>

              {/* Step 3: Iron based on color */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-sm">
                    Шаг 3. Учет железа (Fe₂O₃) по цвету комовой глины
                  </span>
                  <span className="px-2 py-0.5 rounded-sm bg-stone-200 text-stone-800 font-mono font-semibold">
                    Fe_балласт = {impurities.ironBallast}%
                  </span>
                </div>
                <p className="text-stone-600 leading-relaxed">
                  Фоновое структурное железо глины составляет до 2.0%. Природный цвет определяет кристаллохимическое состояние остального железа:
                </p>
                <div className="bg-white p-2.5 rounded-lg border border-stone-200/80 text-[11px] space-y-1">
                  <div>
                    <strong className="text-stone-800">Текущий цвет:</strong> {colorInfo.name}
                  </div>
                  <div>
                    <strong className="text-stone-800">Статус в РФА:</strong> {colorInfo.ironStatusDescription}
                  </div>
                  <div className="font-mono text-stone-800 pt-1 border-t border-stone-100">
                    Всего Fe₂O₃: {impurities.ironTotal}% | Структурное: <strong className="text-blue-700">{impurities.ironStructural}%</strong> | Свободный балласт: <strong className="text-emerald-700">{impurities.ironBallast}%</strong>
                  </div>
                </div>
              </div>

              {/* Step 4: Magnesium (Dolomite) and Potassium (Orthoclase) */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-sm">
                    Шаг 4. Магний (доломит) и калий (полевые шпаты / слюды)
                  </span>
                  <div className="space-x-2">
                    <span className="px-2 py-0.5 rounded-sm bg-stone-200 text-stone-800 font-mono font-semibold">
                      MgCO₃ = {impurities.dolomiteMgCO3}%
                    </span>
                    <span className="px-2 py-0.5 rounded-sm bg-stone-200 text-stone-800 font-mono font-semibold">
                      Ортоклаз = {impurities.orthoclase}%
                    </span>
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-stone-200/80 font-mono text-[11px] text-stone-800 space-y-1">
                  <div>• Структурный MgO в смектите до 3.5%. Доломит (MgCO₃) = max(0, (MgO - 3.5) × 2.1) = <strong className="text-emerald-700">{impurities.dolomiteMgCO3}%</strong></div>
                  <div>• Полевой шпат / слюды (Ортоклаз) = K₂O × 5.9 = <strong className="text-emerald-700">{impurities.orthoclase}%</strong></div>
                  {impurities.mnoBallast > 0 && <div>• Оксид марганца (MnO &gt; 0.1%) = {impurities.mnoBallast}%</div>}
                  {impurities.tio2Ballast > 0 && <div>• Диоксид титана (TiO₂) = {impurities.tio2Ballast}%</div>}
                </div>
              </div>

              {/* Step 5: Summary & Smectite Yield */}
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-sm">
                    Итоговая сумма несмектитовых примесей (Балласт) и смектит
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-amber-800 text-white font-mono font-bold text-sm">
                    Балласт = {impurities.totalBallast}%
                  </span>
                </div>
                <div className="bg-white/90 p-3 rounded-lg border border-amber-200 font-mono text-xs space-y-1 text-stone-800">
                  <div>Балласт = SiO₂_своб ({impurities.freeSiO2}) + CaCO₃ ({impurities.calciteCaCO3}) + MgCO₃ ({impurities.dolomiteMgCO3}) + Ортоклаз ({impurities.orthoclase}) + Fe_балласт ({impurities.ironBallast}) + MnO ({impurities.mnoBallast}) + TiO₂ ({impurities.tio2Ballast})</div>
                  <div className="pt-2 border-t border-amber-200 text-stone-900 text-sm font-bold flex justify-between">
                    <span>Расчетное содержание чистого смектита:</span>
                    <span className="text-emerald-800 font-mono">{impurities.estimatedSmectite}%</span>
                  </div>
                </div>
                <p className="text-stone-600 text-xs">
                  {impurities.totalBallast > 20
                    ? '⚠️ Высокий балласт (>20%): глина абсолютно непригодна для прямого получения ОГ методом пасты без предварительного мокрого обогащения (гидроциклонирования).'
                    : impurities.totalBallast > 10
                    ? 'ℹ️ Умеренный балласт (10–20%): применим для базовых буровых марок и битумных мастик.'
                    : '✅ Высокая чистота (балласт < 10%): отличная база для дисперсионной ОМ.'}
                </p>
              </div>

              {/* Step 6: 3-Level Smectite Interpretation Rules */}
              <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-sm flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-700" />
                    Правило выбора содержания смектита для интерпретации данных
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-700 text-white font-mono text-xs font-bold">
                    Использовано: {effectiveSmectite ?? impurities.estimatedSmectite}%
                  </span>
                </div>
                <p className="text-stone-600 text-xs leading-relaxed">
                  В соответствии с регламентом анализа, для оценки пригодности бентонита по отраслям действует строгая иерархия из 3 уровней:
                </p>
                <div className="space-y-2 text-xs">
                  <div
                    className={`p-2.5 rounded-lg border transition-colors ${
                      smectiteSource === 'input'
                        ? 'bg-emerald-100/70 border-emerald-300 font-medium text-emerald-950 shadow-xs'
                        : 'bg-white border-stone-200 text-stone-700 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <strong>1. Ручной ввод смектита (Высший приоритет)</strong>
                      {smectiteSource === 'input' && (
                        <span className="text-[10px] bg-emerald-700 text-white px-1.5 py-0.2 rounded-sm font-bold">
                          АКТИВЕН: {inputSmectite}%
                        </span>
                      )}
                    </div>
                    <span>
                      Если в разделе «Физико-химические параметры» заполнено поле «Содержание смектита», именно эта цифра используется для всех выходных заключений.
                    </span>
                  </div>

                  <div
                    className={`p-2.5 rounded-lg border transition-colors ${
                      smectiteSource === 'cec_matrix'
                        ? 'bg-blue-100/80 border-blue-300 font-medium text-blue-950 shadow-xs'
                        : 'bg-white border-stone-200 text-stone-700 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <strong>2. Пересчет по КОЕ (файл смектит.pdf)</strong>
                      {smectiteSource === 'cec_matrix' && (
                        <span className="text-[10px] bg-blue-700 text-white px-1.5 py-0.2 rounded-sm font-bold">
                          АКТИВЕН: {effectiveSmectite}% (КОЕ = {cec} мг-экв, эталон {cecStandardUsed} мг-экв)
                        </span>
                      )}
                    </div>
                    <span>
                      Если поле «Содержание смектита» не заполнено, но заполнено «КОЕ бентонита», пересчет выполняется по формуле: <code>C_смектит = (КОЕ / {cecStandardUsed} мг-экв) × 100%</code>. По умолчанию строго используется таблица для <strong>Высокозарядного смектита (эталон 120 мг-экв)</strong>, с возможностью переключения в форме на среднезарядный (110) или низкозарядный (100).
                    </span>
                  </div>

                  <div
                    className={`p-2.5 rounded-lg border transition-colors ${
                      smectiteSource === 'xrf_calc'
                        ? 'bg-amber-100/70 border-amber-300 font-medium text-amber-950 shadow-xs'
                        : 'bg-white border-stone-200 text-stone-700 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <strong>3. Минеральный расчет по РФА (файл таблица_2.pdf)</strong>
                      {smectiteSource === 'xrf_calc' && (
                        <span className="text-[10px] bg-amber-700 text-white px-1.5 py-0.2 rounded-sm font-bold">
                          АКТИВЕН: {effectiveSmectite}%
                        </span>
                      )}
                    </div>
                    <span>
                      Если оба поля («Содержание смектита» и «КОЕ бентонита») не заполнены, концентрация смектита вычисляется как разница: <code>100% - Балласт ({impurities.totalBallast}%) = {impurities.estimatedSmectite}%</code>.
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
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
