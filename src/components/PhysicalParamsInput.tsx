import React from 'react';
import { Sliders, Beaker, CheckSquare, Square, Calculator, Sparkles, HelpCircle } from 'lucide-react';
import { ApiTestData } from '../types';
import { evaluateApiRheology } from '../utils/bentoniteAnalyzer';

interface PhysicalParamsInputProps {
  swellingIndex?: number;
  cec?: number;
  cecStandard?: 100 | 110 | 120;
  smectite?: number;
  sand?: number;
  activation: boolean;
  sodaPercent?: number;
  apiTest: ApiTestData;
  effectiveSmectite?: number;
  smectiteSource?: 'input' | 'xrf_calc' | 'cec_matrix';
  cecStandardUsed?: number;
  xrfSmectite?: number;
  onChangeSwelling: (val: number | undefined) => void;
  onChangeCec: (val: number | undefined) => void;
  onChangeCecStandard?: (val: 100 | 110 | 120 | undefined) => void;
  onChangeSmectite: (val: number | undefined) => void;
  onChangeSand: (val: number | undefined) => void;
  onChangeActivation: (val: boolean) => void;
  onChangeSodaPercent: (val: number | undefined) => void;
  onChangeApiTest: (val: ApiTestData) => void;
}

export const PhysicalParamsInput: React.FC<PhysicalParamsInputProps> = ({
  swellingIndex,
  cec,
  cecStandard,
  smectite,
  sand,
  activation,
  sodaPercent,
  apiTest,
  effectiveSmectite,
  smectiteSource = 'input',
  cecStandardUsed = 100,
  xrfSmectite,
  onChangeSwelling,
  onChangeCec,
  onChangeCecStandard,
  onChangeSmectite,
  onChangeSand,
  onChangeActivation,
  onChangeSodaPercent,
  onChangeApiTest,
}) => {
  // Auto-calculation of PV and YP when f600 and f300 change
  const handleF600Change = (valStr: string) => {
    const f600 = valStr === '' ? undefined : parseFloat(valStr);
    const f300 = apiTest.f300;

    let pv = apiTest.pv;
    let yp = apiTest.yp;

    if (f600 !== undefined && f300 !== undefined) {
      pv = f600 - f300;
      yp = f300 - pv;
    }

    onChangeApiTest({
      ...apiTest,
      f600,
      pv,
      yp,
    });
  };

  const handleF300Change = (valStr: string) => {
    const f300 = valStr === '' ? undefined : parseFloat(valStr);
    const f600 = apiTest.f600;

    let pv = apiTest.pv;
    let yp = apiTest.yp;

    if (f600 !== undefined && f300 !== undefined) {
      pv = f600 - f300;
      yp = f300 - pv;
    }

    onChangeApiTest({
      ...apiTest,
      f300,
      pv,
      yp,
    });
  };

  const calculatedRatio =
    apiTest.pv !== undefined && apiTest.pv > 0 && apiTest.yp !== undefined
      ? (apiTest.yp / apiTest.pv).toFixed(2)
      : null;

  return (
    <section id="physical-params-section" className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
      <div className="mb-4">
        <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 text-xs flex items-center justify-center font-semibold">
            3
          </span>
          Физико-химические параметры и активация
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Индекс набухания, катионообменная емкость (КОЕ), смектит, песок и реология API
        </p>
      </div>

      {/* 4 Core Physical Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        {/* Swelling Index */}
        <div className="rounded-lg border border-stone-200 p-3 bg-stone-50/50 hover:bg-white transition-colors">
          <label htmlFor="input-swelling-index" className="block text-xs font-semibold text-stone-800 mb-1">
            Индекс свободного набухания
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.5"
              min="0"
              placeholder="напр. 25"
              id="input-swelling-index"
              value={swellingIndex !== undefined ? swellingIndex : ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChangeSwelling(isNaN(val) ? undefined : val);
              }}
              className="w-full text-sm font-semibold text-stone-900 bg-white rounded-md border border-stone-300 px-2.5 py-1.5 pr-14 focus:outline-hidden focus:ring-2 focus:ring-amber-600 transition-all text-right"
            />
            <span className="absolute right-2 top-2 text-xs text-stone-400 pointer-events-none font-mono">
              см³/2 г
            </span>
          </div>
          <span className="text-[10px] text-stone-500 mt-1 block">
            Норма для ОМ: &gt; 15–35 мл/2г
          </span>
        </div>

        {/* CEC / КОЕ */}
        <div className="rounded-lg border border-stone-200 p-3 bg-stone-50/50 hover:bg-white transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="input-cec" className="block text-xs font-semibold text-stone-800">
                КОЕ бентонита
              </label>
              <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-amber-100 text-amber-800 font-medium">
                Ключ для ИОМ
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="напр. 85"
                id="input-cec"
                value={cec !== undefined ? cec : ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onChangeCec(isNaN(val) ? undefined : val);
                }}
                className="w-full text-sm font-semibold text-stone-900 bg-white rounded-md border border-stone-300 px-2.5 py-1.5 pr-20 focus:outline-hidden focus:ring-2 focus:ring-amber-600 transition-all text-right"
              />
              <span className="absolute right-2 top-2 text-xs text-stone-400 pointer-events-none font-mono">
                мг-экв/100г
              </span>
            </div>
          </div>

          {/* Standard selector */}
          <div className="mt-2.5 pt-2 border-t border-stone-200/80">
            <div className="flex items-center justify-between text-[10px] text-stone-600 mb-1.5 font-medium">
              <span>Тип смектита для КОЕ:</span>
              <span className="font-semibold text-stone-900 bg-stone-100 px-1.5 py-0.5 rounded text-[10px]">
                {cecStandardUsed === 120
                  ? 'Высокозарядный (120)'
                  : cecStandardUsed === 110
                  ? 'Среднезарядный (110)'
                  : 'Низкозарядный (100)'}
              </span>
            </div>
            {onChangeCecStandard && (
              <div className="grid grid-cols-3 gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => onChangeCecStandard(120)}
                  title="Высокозарядный монтмориллонит (Эталон: 120 мг-экв) — ПО УМОЛЧАНИЮ. Применяется для кавказских и североамериканских бентонитов с высокой плотностью заряда."
                  className={`px-1.5 py-1 rounded text-center font-medium border transition-all ${
                    (cecStandard === 120 || (!cecStandard && cecStandardUsed === 120))
                      ? 'bg-amber-700 text-white border-amber-700 font-bold shadow-xs'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <span className="block leading-tight">120 мг-экв</span>
                  <span className="text-[9px] opacity-90 font-normal">Высокозарядный (по умолч.)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeCecStandard(110)}
                  title="Среднезарядный смектит (Эталон: 110 мг-экв). Характерен для переходных глин (Азия, Сев. Африка)."
                  className={`px-1.5 py-1 rounded text-center font-medium border transition-all ${
                    (cecStandard === 110 || (!cecStandard && cecStandardUsed === 110))
                      ? 'bg-amber-700 text-white border-amber-700 font-bold shadow-xs'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <span className="block leading-tight">110 мг-экв</span>
                  <span className="text-[9px] opacity-90 font-normal">Среднезарядный</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeCecStandard(100)}
                  title="Низкозарядный смектит (Эталон: 100 мг-экв). Подходит для большинства стандартных натриевых и щелочноземельных бентонитов (1 мг-экв ≈ 1%)."
                  className={`px-1.5 py-1 rounded text-center font-medium border transition-all ${
                    (cecStandard === 100 || (!cecStandard && cecStandardUsed === 100))
                      ? 'bg-amber-700 text-white border-amber-700 font-bold shadow-xs'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <span className="block leading-tight">100 мг-экв</span>
                  <span className="text-[9px] opacity-90 font-normal">Низкозарядный</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Smectite % */}
        <div
          className={`rounded-lg border p-3 transition-colors flex flex-col justify-between ${
            smectite !== undefined && smectite > 0
              ? 'border-emerald-300 bg-emerald-50/30'
              : smectiteSource === 'cec_matrix'
              ? 'border-blue-300 bg-blue-50/30'
              : 'border-stone-200 bg-stone-50/50'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="input-smectite" className="block text-xs font-semibold text-stone-800">
                Содержание смектита
              </label>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-sm font-medium ${
                  smectite !== undefined && smectite > 0
                    ? 'bg-emerald-100 text-emerald-800 font-semibold'
                    : smectiteSource === 'cec_matrix'
                    ? 'bg-blue-100 text-blue-800 font-semibold'
                    : 'bg-amber-100 text-amber-800 font-semibold'
                }`}
              >
                {smectite !== undefined && smectite > 0
                  ? 'Приоритет 1 (Ввод)'
                  : smectiteSource === 'cec_matrix'
                  ? 'Приоритет 2 (по КОЕ)'
                  : 'Приоритет 3 (по РФА)'}
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                placeholder={
                  effectiveSmectite !== undefined && effectiveSmectite > 0
                    ? `расчет: ${effectiveSmectite}%`
                    : 'расчет из КОЕ / РФА'
                }
                id="input-smectite"
                value={smectite !== undefined ? smectite : ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onChangeSmectite(isNaN(val) ? undefined : val);
                }}
                className="w-full text-sm font-semibold text-stone-900 bg-white rounded-md border border-stone-300 px-2.5 py-1.5 pr-7 focus:outline-hidden focus:ring-2 focus:ring-amber-600 transition-all text-right placeholder:text-stone-400 placeholder:text-xs"
              />
              <span className="absolute right-2 top-2 text-xs text-stone-400 pointer-events-none">
                %
              </span>
            </div>
          </div>

          <div className="mt-2 text-[10px] leading-tight">
            {smectite !== undefined && smectite > 0 ? (
              <span className="text-emerald-700 font-medium block">
                ✓ Введено вручную ({smectite}%). Эта цифра напрямую используется для интерпретации всех данных.
              </span>
            ) : smectiteSource === 'cec_matrix' ? (
              <span className="text-blue-700 font-medium block">
                ⚙️ Пересчитано по КОЕ ({cec} мг-экв → <strong className="font-bold">{effectiveSmectite}%</strong> по эталону {cecStandardUsed === 120 ? 'Высокозарядного (120 мг-экв)' : cecStandardUsed === 110 ? 'Среднезарядного (110 мг-экв)' : 'Низкозарядного (100 мг-экв)'}). Используется для всех выводов.
              </span>
            ) : (
              <span className="text-amber-800 font-medium block">
                🔬 Расчет по балансу РФА (<strong className="font-bold">{effectiveSmectite ?? 0}%</strong>, 100% - Балласт). Используется для всех выводов.
              </span>
            )}
          </div>
        </div>

        {/* Sand % */}
        <div className="rounded-lg border border-stone-200 p-3 bg-stone-50/50 hover:bg-white transition-colors">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="input-sand" className="block text-xs font-semibold text-stone-800">
              Содержание песка
            </label>
            <span className="text-[10px] text-stone-400">&gt; 44 мкм</span>
          </div>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              placeholder="напр. 0.5"
              id="input-sand"
              value={sand !== undefined ? sand : ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChangeSand(isNaN(val) ? undefined : val);
              }}
              className="w-full text-sm font-semibold text-stone-900 bg-white rounded-md border border-stone-300 px-2.5 py-1.5 pr-7 focus:outline-hidden focus:ring-2 focus:ring-amber-600 transition-all text-right"
            />
            <span className="absolute right-2 top-2 text-xs text-stone-400 pointer-events-none">
              %
            </span>
          </div>
          <span className="text-[10px] text-stone-500 mt-1 block">
            Или вычисляется как своб. SiO₂ = SiO₂ - 2.6×Al₂O₃
          </span>
        </div>
      </div>

      {/* Activation Checkbox & Sub-fields */}
      <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-4 transition-all">
        <div className="flex items-center justify-between">
          <label
            htmlFor="activation-checkbox"
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <input
              type="checkbox"
              id="activation-checkbox"
              checked={activation}
              onChange={(e) => onChangeActivation(e.target.checked)}
              className="w-4 h-4 text-amber-700 rounded border-stone-300 focus:ring-amber-600 cursor-pointer"
            />
            <span className="text-sm font-bold text-stone-900">
              Активация кальцинированной содой (Na₂CO₃) и API-тест
            </span>
          </label>
          <span className="text-xs text-stone-500">
            {activation ? 'Включено' : 'Выключено'}
          </span>
        </div>

        {activation && (
          <div className="mt-4 pt-3 border-t border-stone-200/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {/* Soda percentage */}
              <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                <label htmlFor="input-soda-percent" className="block text-xs font-semibold text-stone-800 mb-1">
                  Количество соды
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="напр. 3.0"
                    id="input-soda-percent"
                    value={sodaPercent !== undefined ? sodaPercent : ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      onChangeSodaPercent(isNaN(val) ? undefined : val);
                    }}
                    className="w-full text-xs font-semibold bg-stone-50 border border-stone-300 rounded px-2 py-1 pr-6 text-right"
                  />
                  <span className="absolute right-2 top-1 text-xs text-stone-400">%</span>
                </div>
                <span className="text-[10px] text-stone-400 mt-1 block">Na₂CO₃</span>
              </div>

              {/* API test: ф600 */}
              <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                <label htmlFor="input-api-f600" className="block text-xs font-semibold text-stone-800 mb-1">
                  ф600 (Fann 600)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="≥ 30"
                    id="input-api-f600"
                    value={apiTest.f600 !== undefined ? apiTest.f600 : ''}
                    onChange={(e) => handleF600Change(e.target.value)}
                    className="w-full text-xs font-semibold bg-stone-50 border border-stone-300 rounded px-2 py-1 text-right"
                  />
                </div>
                <span className="text-[10px] text-stone-400 mt-1 block">об/мин</span>
              </div>

              {/* API test: ф300 */}
              <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                <label htmlFor="input-api-f300" className="block text-xs font-semibold text-stone-800 mb-1">
                  ф300 (Fann 300)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="напр. 22"
                    id="input-api-f300"
                    value={apiTest.f300 !== undefined ? apiTest.f300 : ''}
                    onChange={(e) => handleF300Change(e.target.value)}
                    className="w-full text-xs font-semibold bg-stone-50 border border-stone-300 rounded px-2 py-1 text-right"
                  />
                </div>
                <span className="text-[10px] text-stone-400 mt-1 block">об/мин</span>
              </div>

              {/* API test: PV */}
              <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="input-api-pv" className="text-xs font-semibold text-stone-800">
                    PV (ф600 - ф300)
                  </label>
                  <span className="text-[9px] px-1 bg-blue-100 text-blue-700 rounded-xs">Авто</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    id="input-api-pv"
                    value={apiTest.pv !== undefined ? apiTest.pv : ''}
                    onChange={(e) => {
                      const num = parseFloat(e.target.value);
                      onChangeApiTest({
                        ...apiTest,
                        pv: isNaN(num) ? undefined : num,
                      });
                    }}
                    className="w-full text-xs font-semibold bg-stone-50 border border-stone-300 rounded px-2 py-1 text-right"
                  />
                </div>
                <span className="text-[10px] text-stone-400 mt-1 block">сПз (пласт. вязк.)</span>
              </div>

              {/* API test: YP */}
              <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="input-api-yp" className="text-xs font-semibold text-stone-800">
                    YP (ф300 - PV)
                  </label>
                  <span className="text-[9px] px-1 bg-blue-100 text-blue-700 rounded-xs">Авто</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    id="input-api-yp"
                    value={apiTest.yp !== undefined ? apiTest.yp : ''}
                    onChange={(e) => {
                      const num = parseFloat(e.target.value);
                      onChangeApiTest({
                        ...apiTest,
                        yp: isNaN(num) ? undefined : num,
                      });
                    }}
                    className="w-full text-xs font-semibold bg-stone-50 border border-stone-300 rounded px-2 py-1 text-right"
                  />
                </div>
                <span className="text-[10px] text-stone-400 mt-1 block">фунт/100 фт²</span>
              </div>
            </div>

            {/* Ratio indicator & OM suitability evaluation */}
            {calculatedRatio && (() => {
              const f600Val = apiTest.f600 ?? 0;
              const f300Val = apiTest.f300 ?? 0;
              const evalRes = evaluateApiRheology(f600Val, f300Val, apiTest.pv, apiTest.yp);

              return (
                <div className="p-3 bg-white rounded-lg border border-stone-200 text-xs space-y-2 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-stone-600 font-medium">Соотношение YP / PV:</span>
                      <span className="font-bold text-stone-900 font-mono text-sm bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                        {calculatedRatio}
                      </span>
                      <span className="text-stone-300">|</span>
                      <span className="font-semibold text-stone-800">
                        {evalRes.label}
                      </span>
                    </div>

                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                        evalRes.model === 'non_treated'
                          ? 'bg-emerald-100 text-emerald-800'
                          : evalRes.model === 'drilling_grade'
                          ? 'bg-blue-100 text-blue-800'
                          : evalRes.model === 'ocma'
                          ? 'bg-amber-100 text-amber-800'
                          : evalRes.model === 'marginal_ocma'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {evalRes.suitabilitySummary}
                    </span>
                  </div>

                  <p className="text-stone-600 text-xs leading-relaxed">
                    {evalRes.description}
                  </p>

                  {evalRes.recommendation && (
                    <div className="text-[11px] font-medium text-amber-900 bg-amber-50/90 border border-amber-200 rounded px-2.5 py-1.5 flex items-start gap-1.5">
                      <span className="shrink-0 font-bold">💡 Рекомендация:</span>
                      <span>{evalRes.recommendation}</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </section>
  );
};
