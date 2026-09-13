import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Award,
  Layers,
  Palette,
  Droplets,
  Cog,
  FileSpreadsheet,
  ChevronRight,
  ExternalLink,
  Target,
  ArrowUpRight
} from 'lucide-react';
import { AnalysisResults, BentoniteColorId } from '../types';
import { BENTONITE_COLORS } from '../data/mineralData';

interface AnalysisSummaryProps {
  results: AnalysisResults;
  colorId: BentoniteColorId;
  onOpenImpuritiesModal: () => void;
  onOpenColorModal: () => void;
  onOpenGelModal: () => void;
  onOpenMillingModal: () => void;
  onOpenIomModal: () => void;
}

export const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({
  results,
  colorId,
  onOpenImpuritiesModal,
  onOpenColorModal,
  onOpenGelModal,
  onOpenMillingModal,
  onOpenIomModal,
}) => {
  const [industryTab, setIndustryTab] = useState<'suitable' | 'all'>('suitable');
  const colorInfo = BENTONITE_COLORS.find((c) => c.id === colorId) || BENTONITE_COLORS[0];
  const { impurities, iom, apiModel } = results;

  return (
    <div id="analysis-results-section" className="space-y-6">
      {/* Top Main Indicators Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Bentonite Type */}
        <div
          id="bentonite-type-card"
          className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Тип бентонита (ОГ)
              </span>
              <Layers className="w-4 h-4 text-amber-700" />
            </div>
            <h3 className="text-base font-bold text-stone-900 leading-snug">
              {results.bentoniteTypeLabel}
            </h3>
            <p className="text-xs text-stone-600 mt-1.5 line-clamp-3">
              {results.bentoniteTypeDescription}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-400">Na₂O / CaO:</span>
            <span className="font-mono font-bold text-stone-800">
              {impurities.na2o && impurities.caoTotal
                ? (impurities.na2o / impurities.caoTotal).toFixed(2)
                : '—'}
            </span>
          </div>
        </div>

        {/* Card 2: IOM Index */}
        <div
          id="iom-index-card"
          className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Индекс ОМ (ИОМ)
              </span>
              <Award className="w-4 h-4 text-amber-700" />
            </div>
            {iom.isCalculable ? (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold font-mono text-amber-800 tracking-tight">
                    {iom.value}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                      iom.rating === 'excellent'
                        ? 'bg-emerald-100 text-emerald-800'
                        : iom.rating === 'good'
                        ? 'bg-blue-100 text-blue-800'
                        : iom.rating === 'acceptable'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {iom.rating === 'excellent'
                      ? 'Отлично'
                      : iom.rating === 'good'
                      ? 'Хорошо'
                      : iom.rating === 'acceptable'
                      ? 'Приемлемо'
                      : 'Низкий'}
                  </span>
                </div>
                <p className="text-xs text-stone-600 mt-1.5 leading-snug">
                  {iom.ratingLabel}
                </p>
              </div>
            ) : (
              <div className="text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                Заполните Na₂O, CaO, SiO₂, Fe₂O₃ и КОЕ для автоматического расчета ИОМ.
              </div>
            )}
          </div>
          <button
            type="button"
            id="view-iom-btn"
            onClick={onOpenIomModal}
            className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-amber-700 font-semibold hover:text-amber-900 w-full"
          >
            <span>Множители формулы ИОМ</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 3: Impurities & Smectite */}
        <div
          id="impurities-card"
          className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Примеси и смектит
              </span>
              <FileSpreadsheet className="w-4 h-4 text-amber-700" />
            </div>

            <div className="flex items-baseline justify-between mb-2">
              <div>
                <span className="text-xs text-stone-500 block">Балласт (РФА):</span>
                <span className="text-2xl font-bold font-mono text-stone-900">
                  {impurities.isSufficientData ? `${impurities.totalBallast}%` : '—'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-stone-500 block">Смектит (расчетный):</span>
                <span className="text-2xl font-bold font-mono text-emerald-700">
                  {results.effectiveSmectite}%
                </span>
              </div>
            </div>

            {/* Smectite source tag */}
            <div className="mb-2">
              <span
                className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                  results.smectiteSource === 'input'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : results.smectiteSource === 'cec_matrix'
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                {results.smectiteSource === 'input' && '✓ Введено напрямую (Приоритет 1)'}
                {results.smectiteSource === 'cec_matrix' &&
                  `⚙️ По КОЕ (смектит.pdf: ${
                    results.cecStandardUsed === 120
                      ? 'Высокозарядный, 120 мг-экв'
                      : results.cecStandardUsed === 110
                      ? 'Среднезарядный, 110 мг-экв'
                      : 'Низкозарядный, 100 мг-экв'
                  }) (Приоритет 2)`}
                {results.smectiteSource === 'xrf_calc' && '🔬 По РФА (табл_2.pdf: 100% - балласт) (Приоритет 3)'}
              </span>
            </div>

            {impurities.isSufficientData ? (
              <div className="text-[11px] text-stone-500 flex flex-wrap gap-x-2 border-t border-stone-100 pt-1.5">
                <span>Песок: {impurities.freeSiO2}%</span>
                <span>Мел: {impurities.calciteCaCO3}%</span>
                <span>Fe-балл: {impurities.ironBallast}%</span>
                <span>Шпаты: {impurities.orthoclase}%</span>
              </div>
            ) : (
              <span className="text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded-md border border-amber-200 block">
                Недостаточно оксидов РФА для полного минерального балласта.
              </span>
            )}
          </div>
          <button
            type="button"
            id="view-impurities-btn"
            onClick={onOpenImpuritiesModal}
            className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-amber-700 font-semibold hover:text-amber-900 w-full"
          >
            <span>Подробный баланс примесей и смектита</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 4: API Model & Rheology */}
        <div
          id="api-model-card"
          className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Модель API (активация)
              </span>
              <Target className="w-4 h-4 text-amber-700" />
            </div>
            {apiModel ? (
              <div>
                <div className="flex items-start justify-between gap-1.5 mb-1">
                  <span className="text-sm font-bold text-stone-900 leading-tight">
                    {apiModel.label}
                  </span>
                  {apiModel.suitabilitySummary && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                        apiModel.model === 'non_treated'
                          ? 'bg-emerald-100 text-emerald-800'
                          : apiModel.model === 'drilling_grade'
                          ? 'bg-blue-100 text-blue-800'
                          : apiModel.model === 'ocma'
                          ? 'bg-amber-100 text-amber-800'
                          : apiModel.model === 'marginal_ocma'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-stone-100 text-stone-700'
                      }`}
                    >
                      {apiModel.suitabilitySummary}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-600 mt-1 leading-snug">
                  {apiModel.description}
                </p>

                {apiModel.recommendation && (
                  <div className="mt-2 text-[11px] font-medium text-amber-900 bg-amber-50/90 border border-amber-200/80 rounded px-2 py-1 flex items-start gap-1">
                    <span className="shrink-0 font-bold">💡</span>
                    <span>{apiModel.recommendation}</span>
                  </div>
                )}

                <div className="mt-2 flex items-center gap-2 text-xs font-mono text-stone-700">
                  <span>PV: {apiModel.pv}</span>
                  <span>|</span>
                  <span>YP: {apiModel.yp}</span>
                  <span>|</span>
                  <span>YP/PV: <strong>{apiModel.ratio}</strong></span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-stone-500 bg-stone-50 p-2 rounded-lg border border-stone-200">
                Активация содой не отмечена либо не введены значения ф600 и ф300 для API-теста.
              </div>
            )}
          </div>
          <div className="mt-3 pt-2 border-t border-stone-100 text-[11px] text-stone-500">
            {apiModel?.ratio !== undefined && apiModel.ratio <= 1.5
              ? '🎯 Идеал: YP/PV ≤ 1.5 и ф600 ≥ 30'
              : 'Критерии: non-treated ≤ 1.5, drilling ≤ 3, OCMA ≤ 6, среднесортная ОГ 6–8'}
          </div>
        </div>
      </div>

      {/* Color Interpretation & Iron status alert */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className="w-8 h-8 rounded-lg border border-black/20 shrink-0 mt-0.5 shadow-2xs"
            style={{ backgroundColor: colorInfo.sampleHex }}
          />
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Краткая интерпретация цвета бентонита: {colorInfo.name}
              </h4>
            </div>
            <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
              <strong>Примеси:</strong> {colorInfo.probableImpurities} | <strong>Среда:</strong> {colorInfo.formationEnvironment}
            </p>
            <p className="text-[11px] text-stone-500 mt-0.5">
              <strong>Поведение железа:</strong> {colorInfo.ironStatusDescription}
              {impurities.ironTotal > 0 && ` (Всего Fe₂O₃ в РФА: ${impurities.ironTotal}%, структурное: ${impurities.ironStructural}%, свободный балласт: ${impurities.ironBallast}%).`}
            </p>
          </div>
        </div>
        <button
          type="button"
          id="color-diag-btn"
          onClick={onOpenColorModal}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 transition-colors shrink-0"
        >
          <Palette className="w-3.5 h-3.5" />
          Цветовой атлас
        </button>
      </div>

      {/* Suitable Industries Section */}
      <div id="industries-section" className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              Применимость базового бентонита по отраслям промышленности
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Анализ соответствия по цвету, смектиту, КОЕ, индексу набухания и чистоте сырья
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-lg">
            <button
              type="button"
              id="filter-suitable-btn"
              onClick={() => setIndustryTab('suitable')}
              className={`text-xs px-3 py-1 rounded-md font-semibold transition-all ${
                industryTab === 'suitable'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Подходящие ({results.suitableIndustries.length})
            </button>
            <button
              type="button"
              id="filter-all-btn"
              onClick={() => setIndustryTab('all')}
              className={`text-xs px-3 py-1 rounded-md font-semibold transition-all ${
                industryTab === 'all'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Все отрасли ({results.allIndustries.length})
            </button>
          </div>
        </div>

        {/* Industry Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(industryTab === 'suitable' ? results.suitableIndustries : results.allIndustries).map((ind) => {
            const isOk = ind.isSuitable;
            return (
              <div
                key={ind.subIndustryId}
                id={`industry-card-${ind.subIndustryId}`}
                className={`rounded-xl border p-4 transition-all flex flex-col justify-between ${
                  isOk
                    ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-300'
                    : 'border-stone-200 bg-stone-50/50 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded-sm bg-stone-200 text-stone-800">
                          {ind.code}
                        </span>
                        <h4 className="font-bold text-stone-900 text-sm">{ind.name}</h4>
                      </div>
                      <span className="text-[11px] text-stone-500 block mt-0.5">
                        {ind.category}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                        isOk
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {isOk ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      {isOk ? 'Приемлемо' : 'Не проходит'}
                    </span>
                  </div>

                  {/* Criteria validation lists */}
                  <div className="space-y-1 my-2.5 text-xs">
                    {ind.reasonsPass.map((p, idx) => (
                      <div key={idx} className="text-emerald-700 flex items-center gap-1.5 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        {p}
                      </div>
                    ))}
                    {ind.reasonsFail.map((f, idx) => (
                      <div key={idx} className="text-red-700 flex items-center gap-1.5 text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>

                  {/* Summary of environment and rheology */}
                  <div className="mt-3 pt-2.5 border-t border-stone-200/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-stone-500 block">Целевая среда и полярность:</span>
                      <strong className="text-stone-800 block leading-tight">{ind.targetMedium}</strong>
                      <span className="text-[10px] text-stone-500">({ind.polarity})</span>
                    </div>
                    <div>
                      <span className="text-stone-500 block">Внешний вид и цвет геля:</span>
                      <span className="text-stone-700 line-clamp-2 leading-tight">
                        {ind.gelAppearance}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-stone-600">
                    <span className="text-stone-500">Реология (FANN / Брукфильд):</span>
                    <div className="font-mono text-[10px] text-stone-800 truncate" title={ind.fann35Dt}>
                      {ind.fann35Dt}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-stone-200/60 flex items-center justify-between text-[10px] text-stone-500">
                  <span>Оптимальный помол: <strong className="text-stone-700">{ind.optimalMilling.split(' (')[0]}</strong></span>
                  <span>Фракция: <strong className="text-stone-700 font-mono">{ind.particleSize.split(' ')[1]}</strong></span>
                </div>
              </div>
            );
          })}
        </div>

        {results.suitableIndustries.length === 0 && industryTab === 'suitable' && (
          <div className="p-6 text-center text-stone-500 bg-stone-50 rounded-xl border border-stone-200">
            <AlertCircle className="w-8 h-8 mx-auto text-amber-600 mb-2" />
            <strong className="block text-stone-800 text-sm mb-1">
              Нет полного соответствия нормативам ни для одной из 8 отраслей
            </strong>
            <p className="text-xs max-w-md mx-auto">
              Попробуйте проверить оксидный состав (РФА), снизить балласт путем мокрого обогащения или переключитесь на вкладку «Все отрасли», чтобы увидеть причины отклонения.
            </p>
          </div>
        )}
      </div>

      {/* 5 Bottom Detail Action Buttons */}
      <div className="bg-stone-900 text-white rounded-xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Подробные экспертные отчеты по нормативным документам
            </h4>
            <p className="text-xs text-stone-400 mt-0.5">
              Нажмите на кнопку для просмотра математического обоснования и детальных технологических требований
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Button 1 */}
          <button
            type="button"
            id="modal-btn-impurities"
            onClick={onOpenImpuritiesModal}
            className="p-3 rounded-lg bg-stone-800 hover:bg-amber-900/60 border border-stone-700 hover:border-amber-600 transition-all text-left flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between text-amber-400 mb-1">
                <FileSpreadsheet className="w-4 h-4" />
                <ArrowUpRight className="w-3.5 h-3.5 text-stone-500 group-hover:text-amber-400 transition-colors" />
              </div>
              <strong className="text-xs font-bold text-white block">
                Расчет примесей и смектита
              </strong>
            </div>
            <span className="text-[10px] text-stone-400 mt-2 block">
              Пошаговый расчет балласта (табл_2.pdf)
            </span>
          </button>

          {/* Button 2 */}
          <button
            type="button"
            id="modal-btn-color"
            onClick={onOpenColorModal}
            className="p-3 rounded-lg bg-stone-800 hover:bg-amber-900/60 border border-stone-700 hover:border-amber-600 transition-all text-left flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between text-amber-400 mb-1">
                <Palette className="w-4 h-4" />
                <ArrowUpRight className="w-3.5 h-3.5 text-stone-500 group-hover:text-amber-400 transition-colors" />
              </div>
              <strong className="text-xs font-bold text-white block">
                Интерпретация цвета бентонита
              </strong>
            </div>
            <span className="text-[10px] text-stone-400 mt-2 block">
              Фазы Fe и хромофоры (табл_1.pdf)
            </span>
          </button>

          {/* Button 3 */}
          <button
            type="button"
            id="modal-btn-gel"
            onClick={onOpenGelModal}
            className="p-3 rounded-lg bg-stone-800 hover:bg-amber-900/60 border border-stone-700 hover:border-amber-600 transition-all text-left flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between text-amber-400 mb-1">
                <Droplets className="w-4 h-4" />
                <ArrowUpRight className="w-3.5 h-3.5 text-stone-500 group-hover:text-amber-400 transition-colors" />
              </div>
              <strong className="text-xs font-bold text-white block">
                Характеристики геля бентонита
              </strong>
            </div>
            <span className="text-[10px] text-stone-400 mt-2 block">
              Среды, FANN-35, Брукфильд (Реология ОГ)
            </span>
          </button>

          {/* Button 4 */}
          <button
            type="button"
            id="modal-btn-milling"
            onClick={onOpenMillingModal}
            className="p-3 rounded-lg bg-stone-800 hover:bg-amber-900/60 border border-stone-700 hover:border-amber-600 transition-all text-left flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between text-amber-400 mb-1">
                <Cog className="w-4 h-4" />
                <ArrowUpRight className="w-3.5 h-3.5 text-stone-500 group-hover:text-amber-400 transition-colors" />
              </div>
              <strong className="text-xs font-bold text-white block">
                Методы и тонина помола ОГ
              </strong>
            </div>
            <span className="text-[10px] text-stone-400 mt-2 block">
              5 методов помола, D50/D99 (ОГ помол.pdf)
            </span>
          </button>

          {/* Button 5 */}
          <button
            type="button"
            id="modal-btn-iom"
            onClick={onOpenIomModal}
            className="p-3 rounded-lg bg-stone-800 hover:bg-amber-900/60 border border-stone-700 hover:border-amber-600 transition-all text-left flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between text-amber-400 mb-1">
                <Award className="w-4 h-4" />
                <ArrowUpRight className="w-3.5 h-3.5 text-stone-500 group-hover:text-amber-400 transition-colors" />
              </div>
              <strong className="text-xs font-bold text-white block">
                ИОМ (Подробный расчет)
              </strong>
            </div>
            <span className="text-[10px] text-stone-400 mt-2 block">
              Множители Na/Ca, Si/Fe, КОЕ (иом.doc)
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
