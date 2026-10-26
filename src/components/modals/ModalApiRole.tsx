import React from 'react';
import { X, Target, CheckCircle2, AlertTriangle, AlertCircle, Info, Sparkles, BookOpen, Layers } from 'lucide-react';
import { ApiRheologyEvaluation } from '../../types';

interface ModalApiRoleProps {
  isOpen: boolean;
  onClose: () => void;
  apiModel?: ApiRheologyEvaluation;
  f600?: number;
  f300?: number;
}

export const ModalApiRole: React.FC<ModalApiRoleProps> = ({
  isOpen,
  onClose,
  apiModel,
  f600,
  f300,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="modal-api-role-backdrop"
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
    >
      <div
        id="modal-api-role-container"
        className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-stone-200 max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-stone-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shadow-2xs">
              <Target className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                Роль API-теста в органомодификации бентонита
              </h3>
              <p className="text-xs text-stone-500">
                Физико-химические основы оценки, реологические критерии стандарта API и механизмы поведения суспензий
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-api-role-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto py-4 space-y-5 text-xs text-stone-700 pr-1">
          {/* Current Sample Status Banner (if API test entered) */}
          {apiModel && f600 !== undefined && (
            <div className="p-4 rounded-xl bg-stone-900 text-white border border-stone-800 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/80">
                    Текущий исследуемый образец
                  </span>
                  <span className="text-stone-300 font-mono text-xs">
                    ф600 = {f600} | ф300 = {f300} | PV = {apiModel.pv} | YP = {apiModel.yp}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      apiModel.apiModelQuality === 'excellent'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : apiModel.apiModelQuality === 'good'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : apiModel.apiModelQuality === 'limited'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-red-500/20 text-red-300 border border-red-500/40'
                    }`}
                  >
                    API Модель: {apiModel.apiModelQualityLabel}
                  </span>
                  <span className="font-mono font-bold text-amber-400 bg-stone-800 px-2 py-0.5 rounded text-xs">
                    YP/PV = {apiModel.ratio}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-stone-800/80 p-2.5 rounded-lg border border-stone-700/80">
                  <div className="text-stone-400 text-[11px] mb-1">Степень замещения на натрий:</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold font-mono text-amber-300">
                      x = {apiModel.sodiumSubstitutionDegree}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        apiModel.sodiumSubstitutionRating === 'optimal'
                          ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-600'
                          : apiModel.sodiumSubstitutionRating === 'acceptable'
                          ? 'bg-blue-900/80 text-blue-300 border border-blue-600'
                          : 'bg-red-900/80 text-red-300 border border-red-600'
                      }`}
                    >
                      {apiModel.sodiumSubstitutionLabel}
                    </span>
                  </div>
                  <p className="text-stone-300 text-[11px] mt-1.5 leading-snug">
                    {apiModel.sodiumSubstitutionDescription}
                  </p>
                </div>

                <div className="bg-stone-800/80 p-2.5 rounded-lg border border-stone-700/80">
                  <div className="text-stone-400 text-[11px] mb-1">Реологическое состояние тактоидов:</div>
                  <div className="font-bold text-white text-xs mb-1">
                    {apiModel.label} ({apiModel.suitabilitySummary})
                  </div>
                  <p className="text-stone-300 text-[11px] leading-snug">
                    {apiModel.description}
                  </p>
                  {apiModel.recommendation && (
                    <div className="mt-2 text-[10.5px] text-amber-300 bg-amber-950/60 p-1.5 rounded border border-amber-800/60">
                      💡 {apiModel.recommendation}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 1. Why API standard matches organomodification */}
          <div className="rounded-xl border border-stone-200 p-4 bg-stone-50/50 space-y-2">
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center font-bold">
                1
              </span>
              Почему стандарт API идеально отражает пригодность бентонита к органомодификации?
            </h4>
            <p className="leading-relaxed text-stone-600">
              Стандарты <strong>API (American Petroleum Institute)</strong> изначально разрабатывались для регламентации буровых бентонитовых порошков, однако на глубинном физико-химическом уровне они фундаментально описывают коллоидное состояние дисперсной системы.
            </p>
            <div className="p-3 bg-white rounded-lg border border-stone-200 text-stone-800 space-y-1.5">
              <p className="font-medium text-stone-900">
                И процесс бурения, и реакция интеркаляции четвертичных аммониевых солей (ЧАС) требуют строгого технологического баланса:
              </p>
              <div className="flex items-center gap-3 text-xs">
                <span className="p-2 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-lg flex-1">
                  <strong>1. Высокая дисперсность</strong> (развитая удельная поверхность для контакта)
                </span>
                <span className="font-bold text-stone-400">+</span>
                <span className="p-2 bg-blue-50 text-blue-900 border border-blue-200 rounded-lg flex-1">
                  <strong>2. Сохранение многослойных тактоидов</strong> с рабочими межслоевыми галереями
                </span>
              </div>
            </div>
          </div>

          {/* 2. Physical meaning of basic parameters */}
          <div className="rounded-xl border border-stone-200 p-4 bg-stone-50/50 space-y-3">
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center font-bold">
                2
              </span>
              Физический смысл базовых параметров API и реологии
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* F600 */}
              <div className="p-3 bg-white rounded-lg border border-stone-200">
                <div className="font-bold text-stone-900 flex items-center justify-between mb-1">
                  <span>F₆₀₀ (вязкость при 600 об/мин)</span>
                  <span className="text-[10px] bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded font-mono">F₆₀₀ = PV + YP</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Вязкость предельно разрушенной структуры при максимальной скорости сдвига. Складывается из двух составляющих: (1) объемной доли твердой фазы с учетом гидратных оболочек (определяет PV) и (2) прочности неразрушенной ползучей структуры (определяет YP).
                </p>
              </div>

              {/* PV */}
              <div className="p-3 bg-white rounded-lg border border-stone-200">
                <div className="font-bold text-stone-900 flex items-center justify-between mb-1">
                  <span>PV (пластическая вязкость)</span>
                  <span className="text-[10px] bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded font-mono">PV = F₆₀₀ − F₃₀₀</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Зависит исключительно от объемной доли кинетически независимых частиц (твердое кристаллическое ядро + гидратная оболочка) в потоке на линейном участке течения ротора (300–600 об/мин).
                </p>
              </div>

              {/* YP */}
              <div className="p-3 bg-white rounded-lg border border-stone-200">
                <div className="font-bold text-stone-900 flex items-center justify-between mb-1">
                  <span>YP (динамический предел текучести)</span>
                  <span className="text-[10px] bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded font-mono">YP = F₃₀₀ − PV</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Прочность коагуляционной структуры при низких напряжениях сдвига. Определяется емкостью катионного обмена (ЕКО/КОЕ), плотностью контактов между частицами и степенью дисперсности суспензии: с ростом концентрации и измельчения частиц расстояние между ними уменьшается, что резко увеличивает электростатическое взаимодействие.
                </p>
              </div>

              {/* x = YP / F600 */}
              <div className="p-3 bg-amber-50/80 rounded-lg border border-amber-300">
                <div className="font-bold text-amber-950 flex items-center justify-between mb-1">
                  <span>Степень замещения натрия: x</span>
                  <span className="text-[10px] bg-white text-amber-900 px-2 py-0.5 rounded font-mono font-bold border border-amber-300">x = YP / F₆₀₀</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Доля замещения катионов обменного комплекса на натрий. Рост этого параметра приводит к сильному отклонению течения суспензии от ньютоновской модели (появлению псевдопластического течения и росту структурной вязкости).
                </p>
              </div>
            </div>

            {/* Scale of x */}
            <div className="p-3 bg-white rounded-lg border border-stone-200 space-y-2">
              <div className="font-bold text-stone-900 text-xs">
                Градация степени замещения на натрий x = YP / F₆₀₀:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2 rounded bg-emerald-50 border border-emerald-200">
                  <div className="font-bold text-emerald-900 text-[11px]">✓ Хороший уровень (Оптимально)</div>
                  <div className="font-mono text-emerald-700 text-xs font-bold my-0.5">0,30 – 0,60</div>
                  <p className="text-[10px] text-emerald-800">
                    Идеальный баланс: сохраняются многослойные тактоиды, галереи открыты, максимальный выход органоглины высших сортов.
                  </p>
                </div>

                <div className="p-2 rounded bg-blue-50 border border-blue-200">
                  <div className="font-bold text-blue-900 text-[11px]">• Приемлемый уровень</div>
                  <div className="font-mono text-blue-700 text-xs font-bold my-0.5">0,20–0,30 и 0,60–0,75</div>
                  <p className="text-[10px] text-blue-800">
                    Приемлемо для серийных буровых и смазочных ОГ. Требует строгого выдерживания времени и температуры синтеза.
                  </p>
                </div>

                <div className="p-2 rounded bg-red-50 border border-red-200">
                  <div className="font-bold text-red-900 text-[11px]">✗ Неприемлемый уровень</div>
                  <div className="font-mono text-red-700 text-xs font-bold my-0.5">&lt; 0,20 или &gt; 0,75</div>
                  <p className="text-[10px] text-red-800">
                    При &gt; 0,75 — распад до монослоев (нет галерей). При &lt; 0,20 — недоактивированные кальциевые агрегаты.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Interpretation of 3 API Models & f600 >= 30 Rule */}
          <div className="rounded-xl border border-stone-200 p-4 bg-emerald-50/50 space-y-3 border-emerald-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-700 text-white text-xs flex items-center justify-center font-bold">
                  3
                </span>
                Интерпретация 3 моделей API и их нормативные критерии (F₆₀₀ ≥ 30 для всех 3 моделей)
              </h4>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 border border-emerald-300 font-mono">
                ОБЯЗАТЕЛЬНО: F₆₀₀ ≥ 30
              </span>
            </div>

            <p className="text-xs text-stone-700 leading-relaxed">
              Стандарт <strong>API Spec 13A</strong> регламентирует три базовые модели бентонитовых суспензий. <strong>У всех трех моделей ключевой реологический показатель F₆₀₀ (показание вискозиметра при 600 об/мин) строго должен быть не менее 30.</strong> Если F₆₀₀ &lt; 30, глина не соответствует стандарту API ни по одной из трех моделей и требует предварительной содовой доактивации или обогащения.
            </p>

            {/* Comparison Table of 3 Models */}
            <div className="overflow-x-auto rounded-lg border border-emerald-200 bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-emerald-100/70 text-emerald-950 font-bold text-[11px]">
                  <tr>
                    <th className="p-2 border-b border-emerald-200">Модель API</th>
                    <th className="p-2 border-b border-emerald-200 font-mono">Критерий F₆₀₀</th>
                    <th className="p-2 border-b border-emerald-200 font-mono">Фактор YP / PV</th>
                    <th className="p-2 border-b border-emerald-200">Оценка для ОМ</th>
                    <th className="p-2 border-b border-emerald-200">Коллоидное состояние тактоидов</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-[11px]">
                  <tr className="hover:bg-emerald-50/40">
                    <td className="p-2 font-bold text-stone-900">
                      1. Модель 'non-treated'
                      <span className="block text-[10px] text-stone-500 font-normal">API 13A Section 11</span>
                    </td>
                    <td className="p-2 font-mono font-bold text-emerald-700 bg-emerald-50/50">≥ 30</td>
                    <td className="p-2 font-mono font-bold text-emerald-700">≤ 1.5</td>
                    <td className="p-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                        Отлично (Наилучшая)
                      </span>
                    </td>
                    <td className="p-2 text-stone-600">
                      Крупные многослойные тактоиды, свободные открытые галереи для быстрого проникновения ЧАС.
                    </td>
                  </tr>
                  <tr className="hover:bg-blue-50/40">
                    <td className="p-2 font-bold text-stone-900">
                      2. Модель 'drilling grade'
                      <span className="block text-[10px] text-stone-500 font-normal">API 13A Section 9</span>
                    </td>
                    <td className="p-2 font-mono font-bold text-emerald-700 bg-emerald-50/50">≥ 30</td>
                    <td className="p-2 font-mono font-bold text-blue-700">≤ 3.0</td>
                    <td className="p-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                        Отлично (Стандарт)
                      </span>
                    </td>
                    <td className="p-2 text-stone-600">
                      Стандартная буровая кондиция, качественная содовая активация без разрушения кристаллической структуры.
                    </td>
                  </tr>
                  <tr className="hover:bg-amber-50/40">
                    <td className="p-2 font-bold text-stone-900">
                      3. Модель 'OCMA'
                      <span className="block text-[10px] text-stone-500 font-normal">API 13A Section 10</span>
                    </td>
                    <td className="p-2 font-mono font-bold text-emerald-700 bg-emerald-50/50">≥ 30</td>
                    <td className="p-2 font-mono font-bold text-amber-700">≤ 6.0</td>
                    <td className="p-2">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-[10px]">
                        Хорошо (Приемлемо)
                      </span>
                    </td>
                    <td className="p-2 text-stone-600">
                      Умеренная пептизация пакетов, допустима для серийных ОГ (буровые растворы, базовые смазки).
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Rule Accent */}
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start gap-2">
              <span className="font-bold text-amber-700 shrink-0 text-sm">⚠️</span>
              <div>
                <strong>Критическое правило интерпретации:</strong> если показатель <strong>F₆₀₀ &lt; 30</strong>, исследуемый бентонит <em>не удовлетворяет требованиям ни одной из 3 моделей API</em>. При значениях F₆₀₀ = 18–29 сырье обладает достаточным скрытым потенциалом по YP/PV, однако требует обязательной содовой доактивации (0,3–1,5% Na₂CO₃) для подъема вязкости F₆₀₀ ≥ 30 перед проведением реакции интеркаляции ЧАС.
              </div>
            </div>
          </div>

          {/* 4. Why YP/PV > 6 destroys organomodification (3 Scenarios) */}
          <div className="rounded-xl border border-stone-200 p-4 bg-stone-50/50 space-y-3">
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center font-bold">
                4
              </span>
              Почему рост YP / PV &gt; 6 критически ухудшает органомодификацию? Три сценария деструкции
            </h4>
            <p className="text-stone-600 leading-relaxed">
              Если отношение <strong>YP / PV превышает 6</strong>, это сигнализирует о скрытой деструкции коллоидной системы. В технологической практике выделяются три различных физических механизма:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Scenario A */}
              <div className="p-3 rounded-lg bg-white border border-rose-200 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-900 text-xs">Сценарий А</span>
                  <span className="font-mono text-[10px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                    YP ↑, PV ↓
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-stone-800">
                  Классическая содовая переактивация
                </div>
                <p className="text-[10.5px] text-stone-600 leading-relaxed">
                  <strong>Механизм:</strong> Избыток соды приводит к глубокой пептизации агрегатов на мельчайшие частицы. Удельная поверхность резко растет (YP взлетает), но из-за потери поверхностного заряда мелкие осколки дегидратируются — объем гидратных оболочек уменьшается, и PV падает.
                </p>
                <div className="p-1.5 bg-rose-50 rounded text-[10px] text-rose-900 font-semibold border border-rose-200">
                  ✗ Итог: Пакеты расщеплены до монослоев. Межслоевые галереи исчезают, ЧАС закрепляться негде.
                </div>
              </div>

              {/* Scenario B */}
              <div className="p-3 rounded-lg bg-white border border-amber-200 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950 text-xs">Сценарий Б</span>
                  <span className="font-mono text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
                    YP ↑, PV ↔
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-stone-800">
                  Компенсированный случай (высокий pH)
                </div>
                <p className="text-[10.5px] text-stone-600 leading-relaxed">
                  <strong>Механизм:</strong> Измельчение частиц обычно снижает PV, но за счет роста pH суспензии усиливается диссоциация силанольных групп (≡Si-OH → ≡Si-O⁻ + H⁺). Рост заряда утолщает гидратные оболочки, компенсируя сжатие ядра — PV не меняется.
                </p>
                <div className="p-1.5 bg-amber-50 rounded text-[10px] text-amber-950 font-semibold border border-amber-200">
                  ⚠️ Итог: Физическое ядро частиц истончено, межпакетное пространство утрачено, сырье непригодно для ЧАС.
                </div>
              </div>

              {/* Scenario C */}
              <div className="p-3 rounded-lg bg-white border border-stone-300 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-xs">Сценарий В</span>
                  <span className="font-mono text-[10px] font-bold bg-stone-100 text-stone-800 px-1.5 py-0.5 rounded">
                    YP ↔, PV ↓
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-stone-800">
                  Электролитное сжатие (NaCl) и коагуляция
                </div>
                <p className="text-[10.5px] text-stone-600 leading-relaxed">
                  <strong>Механизм:</strong> Ионы электролита (следы NaCl) сжимают диффузную часть двойного электрического слоя (ДЭС). Гидратные оболочки схлопываются, и PV падает. Сетка YP еще держится за счет коагуляционного сближения. Отношение YP/PV резко возрастает выше 6.
                </p>
                <div className="p-1.5 bg-stone-100 rounded text-[10px] text-stone-900 font-semibold border border-stone-200">
                  ✗ Итог: Частицы слипаются в неплотные хаотичные агломераты с заблокированной поверхностью.
                </div>
              </div>
            </div>

            {/* Summary Table of Scenarios */}
            <div className="overflow-x-auto rounded-lg border border-stone-200">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-stone-100 text-stone-800 font-bold">
                  <tr>
                    <th className="p-2 border-b border-stone-200">Сценарий деструкции</th>
                    <th className="p-2 border-b border-stone-200 font-mono">Динамика YP / PV</th>
                    <th className="p-2 border-b border-stone-200">Физический механизм</th>
                    <th className="p-2 border-b border-stone-200">Состояние кристаллической структуры</th>
                    <th className="p-2 border-b border-stone-200">Поведение ЧАС</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 bg-white">
                  <tr className="hover:bg-rose-50/40">
                    <td className="p-2 font-bold text-rose-900">Сценарий А</td>
                    <td className="p-2 font-mono font-bold text-rose-700">YP ↑, PV ↓</td>
                    <td className="p-2 text-stone-600">Глубокая содовая пептизация + дегидратация мелких осколков</td>
                    <td className="p-2 font-semibold text-stone-800">Полное расщепление пакетов до монослоев</td>
                    <td className="p-2 text-rose-800 font-medium">Закрепляться негде (нет галерей)</td>
                  </tr>
                  <tr className="hover:bg-amber-50/40">
                    <td className="p-2 font-bold text-amber-950">Сценарий Б</td>
                    <td className="p-2 font-mono font-bold text-amber-800">YP ↑, PV ↔</td>
                    <td className="p-2 text-stone-600">Измельчение частиц с компенсацией за счет диссоциации ≡Si-OH / pH</td>
                    <td className="p-2 font-semibold text-stone-800">Толстые гидратные оболочки на истонченных ядрах</td>
                    <td className="p-2 text-amber-900 font-medium">Межпакетное пространство утрачено</td>
                  </tr>
                  <tr className="hover:bg-stone-50">
                    <td className="p-2 font-bold text-stone-900">Сценарий В</td>
                    <td className="p-2 font-mono font-bold text-stone-700">YP ↔, PV ↓</td>
                    <td className="p-2 text-stone-600">Электролитное сжатие ДЭС (NaCl) / начальная коагуляция</td>
                    <td className="p-2 font-semibold text-stone-800">Хаотичные агломераты с заблокированными галереями</td>
                    <td className="p-2 text-stone-800 font-medium">Межслоевая интеркаляция невозможна</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Summary Conclusion */}
          <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 space-y-2">
            <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-700" />
              Итоговое технологическое резюме
            </h4>
            <p className="text-xs text-amber-950 leading-relaxed">
              Все три сценария роста отношения <strong>YP / PV &gt; 6</strong> (будь то через падение PV, удержание PV за счет плотности поверхностного заряда или падение PV из-за электролитного сжатия гидратных оболочек) указывают на одно: <strong>нарушен природный баланс пакетной структуры</strong>.
            </p>
            <div className="p-2.5 rounded-lg bg-white border border-amber-300 font-medium text-xs text-stone-800">
              🎯 <strong>Золотой стандарт для успешной органомодификации:</strong> сырье должно строго укладываться в нормативы API:
              <div className="mt-1 flex flex-wrap gap-2 text-xs font-mono font-bold text-stone-900">
                <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded border border-emerald-300">F₆₀₀ ≥ 30 (норма для всех 3 моделей API)</span>
                <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded border border-emerald-300">YP / PV ≤ 1.5 – 3.0</span>
                <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded border border-emerald-300">x = YP / F₆₀₀ ∈ [0.30 – 0.60]</span>
              </div>
              <span className="text-[11px] text-stone-500 block mt-1">
                Это гарантирует сохранение многослойных тактоидов с открытыми межслоевыми галереями для закрепления четвертичных аммониевых солей.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
          <span className="text-[11px] text-stone-400">
            Основано на физико-химических данных стандарта API и лабораторном исследовании
          </span>
          <button
            type="button"
            id="close-api-role-modal-bottom-btn"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Понятно, закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
