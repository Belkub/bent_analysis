import {
  AnalysisResults,
  BentoniteColorId,
  BentoniteInputData,
  BentoniteType,
  ApiModel,
  ImpurityCalculationDetails,
  IomCalculationDetails,
  IndustrySuitability
} from '../types';
import { BENTONITE_COLORS, INDUSTRY_SPECS, CEC_SMECTITE_MATRIX } from '../data/mineralData';

export interface ApiRheologyEvaluation {
  model: ApiModel;
  label: string;
  description: string;
  pv: number;
  yp: number;
  ratio: number;
  suitabilitySummary?: string;
  recommendation?: string;
}

/**
 * Оценка реологии бентонита по API-тесту и пригодности для органомодификации (ОМ).
 * Правила:
 * 1. Базовые переделы YP/PV:
 *    - YP/PV <= 1.5: 'non-treated' (наилучшая для ОМ)
 *    - YP/PV <= 3.0: 'drilling grade' (хорошая для ОМ)
 *    - YP/PV <= 6.0: 'OCMA' (приемлемая для ОМ)
 *    - YP/PV 6.0 .. 8.0: ограниченно пригоден для ОМ при получении среднесортной ОГ.
 *                        Если глина активирована, то рекомендуется снизить вложение соды.
 * 2. Сглаженная оценка при ф600 от 18 до 29 (или YP/PV 18..29):
 *    - Вывод о степени пригодности бентонита для ОМ сохраняется (считывается по переделам отношения YP/PV),
 *      но добавляется фраза о рекомендации активации содой 0,3 - 1,5 % для увеличения показателя ф600 выше 30.
 * 3. Если ф600 < 18:
 *    - Нестандартная марка (недостаточная вязкость суспензии).
 */
export function evaluateApiRheology(
  f600: number,
  f300: number,
  userPv?: number,
  userYp?: number
): ApiRheologyEvaluation {
  const pv = userPv !== undefined ? userPv : f600 - f300;
  const yp = userYp !== undefined ? userYp : f300 - pv;
  const ratio = pv > 0 ? Number((yp / pv).toFixed(2)) : 0;

  // Проверка условия ф600 от 18 до 29 (либо ratio 18..29)
  const isNearTargetF600 = (f600 >= 18 && f600 < 30) || (ratio >= 18 && ratio <= 29);
  const isOptimalF600 = f600 >= 30;

  let model: ApiModel = 'non_standard';
  let label = 'Нестандартная марка';
  let suitabilitySummary = 'Нестандартная реология';
  let recommendation: string | undefined = undefined;
  let description = '';

  if (isOptimalF600) {
    // ф600 >= 30 (стандарт API)
    if (ratio <= 1.5) {
      model = 'non_treated';
      label = "Модель 'non-treated'";
      suitabilitySummary = 'Наилучшая для органомодификации (ОМ)';
      description =
        'Наилучшая для органомодификации (ОМ): равномерный выход вязкости, минимальный избыточный тиксотропный сдвиг.';
    } else if (ratio <= 3.0) {
      model = 'drilling_grade';
      label = "Модель 'drilling grade'";
      suitabilitySummary = 'Хорошая для органомодификации (ОМ)';
      description =
        'Хорошая для органомодификации (ОМ): стандартная буровая марка с качественной содовой активацией.';
    } else if (ratio <= 6.0) {
      model = 'ocma';
      label = "Модель 'OCMA'";
      suitabilitySummary = 'Приемлемая для органомодификации (ОМ)';
      description =
        'Приемлемая для органомодификации (ОМ): допустимый диапазон, возможен повышенный расход активатора.';
    } else if (ratio <= 8.0) {
      // ratio в интервале 6 - 8
      model = 'marginal_ocma';
      label = 'Ограниченно пригодная марка (YP/PV 6–8)';
      suitabilitySummary = 'Ограниченно пригоден для ОМ (среднесортная ОГ)';
      recommendation = 'Если глина активирована, то рекомендуется снизить вложение соды.';
      description =
        'Бентонит ограниченно пригоден для ОМ при получении среднесортной ОГ, если глина активирована, то рекомендуется снизить вложение соды.';
    } else if (ratio >= 18 && ratio <= 29) {
      // Дополнительная поддержка буквального соотношения YP/PV 18..29
      model = 'ocma';
      label = "Модель 'OCMA' (соотношение 18–29)";
      suitabilitySummary = 'Приемлемая степень пригодности для ОМ сохраняется';
      recommendation = 'Рекомендуется активация содой 0,3–1,5% для увеличения показателя ф600 выше 30.';
      description =
        'Степень пригодности для ОМ сохраняется по переделам YP/PV. Рекомендуется активация содой 0,3–1,5% для увеличения показателя ф600 выше 30.';
    } else {
      model = 'non_standard';
      label = 'Нестандартная марка (YP/PV > 8)';
      suitabilitySummary = 'Не соответствует стандартам ОМ';
      description = `Показатели API не соответствуют стандартам ОМ: избыточный тиксотропный сдвиг (YP/PV = ${ratio} > 8).`;
    }
  } else if (isNearTargetF600) {
    // ф600 от 18 до 29: степень пригодности сохраняется по YP/PV + рекомендация активации содой 0,3 - 1,5%
    recommendation = 'Рекомендуется активация содой 0,3–1,5% для увеличения показателя ф600 выше 30.';

    if (ratio <= 1.5) {
      model = 'non_treated';
      label = "Модель 'non-treated' (ф600 18–29)";
      suitabilitySummary = 'Наилучшая пригодность для ОМ (требует доактивации)';
      description = `Наилучшая для органомодификации (ОМ): равномерный выход вязкости (YP/PV = ${ratio} ≤ 1.5). Рекомендуется активация содой 0,3–1,5% для увеличения показателя ф600 выше 30.`;
    } else if (ratio <= 3.0) {
      model = 'drilling_grade';
      label = "Модель 'drilling grade' (ф600 18–29)";
      suitabilitySummary = 'Хорошая пригодность для ОМ (требует доактивации)';
      description = `Хорошая для органомодификации (ОМ): стандартная буровая марка (YP/PV = ${ratio} ≤ 3.0). Рекомендуется активация содой 0,3–1,5% для увеличения показателя ф600 выше 30.`;
    } else if (ratio <= 6.0) {
      model = 'ocma';
      label = "Модель 'OCMA' (ф600 18–29)";
      suitabilitySummary = 'Приемлемая пригодность для ОМ (требует доактивации)';
      description = `Приемлемая для органомодификации (ОМ): допустимый диапазон реологии (YP/PV = ${ratio} ≤ 6.0). Рекомендуется активация содой 0,3–1,5% для увеличения показателя ф600 выше 30.`;
    } else if (ratio <= 8.0) {
      // ratio в интервале 6 - 8 при ф600 18..29
      model = 'marginal_ocma';
      label = 'Ограниченно пригодная марка (ф600 18–29, YP/PV 6–8)';
      suitabilitySummary = 'Ограниченно пригоден для ОМ (среднесортная ОГ)';
      recommendation =
        'Рекомендуется активация содой 0,3–1,5% для увеличения показателя ф600 выше 30 (если глина активирована, снизить вложение соды).';
      description =
        'Бентонит ограниченно пригоден для ОМ при получении среднесортной ОГ. Рекомендуется активация содой 0,3–1,5% для увеличения показателя ф600 выше 30 (если глина активирована, то рекомендуется снизить вложение соды).';
    } else {
      model = 'non_standard';
      label = 'Нестандартная марка';
      suitabilitySummary = 'Не соответствует стандартам ОМ';
      description = `Показатели API не соответствуют стандартам ОМ: ф600 < 30 и избыточный тиксотропный сдвиг (YP/PV = ${ratio} > 8).`;
    }
  } else {
    // ф600 < 18
    model = 'non_standard';
    label = 'Нестандартная марка (ф600 < 18)';
    suitabilitySummary = 'Недостаточная вязкость';
    recommendation = 'Требуется предварительная активация содой или обогащение сырья.';
    description = `Показатели API ниже допустимых порогов (ф600 = ${f600} < 18, недостаточная вязкость суспензии). Рекомендуется активация содой или проверка содержания смектита.`;
  }

  return {
    model,
    label,
    description,
    pv,
    yp,
    ratio,
    suitabilitySummary,
    recommendation,
  };
}

export function calculateAnalysis(input: BentoniteInputData): AnalysisResults {
  const oxides = input.oxides;
  const colorId = input.colorId;
  const colorInfo = BENTONITE_COLORS.find((c) => c.id === colorId) || BENTONITE_COLORS[0];

  const na2o = oxides.Na2O ?? 0;
  const cao = oxides.CaO ?? 0;
  const mgo = oxides.MgO ?? 0;
  const sio2 = oxides.SiO2 ?? 0;
  const al2o3 = oxides.Al2O3 ?? 0;
  const fe2o3 = oxides.Fe2O3 ?? 0;
  const k2o = oxides.K2O ?? 0;
  const mno = oxides.MnO ?? 0;
  const tio2 = oxides.TiO2 ?? 0;

  // 1. Bentonite Type classification (табл_2.pdf)
  let bentoniteType: BentoniteType = 'insufficient_data';
  let bentoniteTypeLabel = 'Недостаточно данных для определения типа';
  let bentoniteTypeDescription = 'Для надежного определения типа бентонита требуются данные по Na₂O и CaO (РФА).';

  if (oxides.Na2O !== undefined && oxides.CaO !== undefined && (na2o > 0 || cao > 0)) {
    const naCaRatio = cao > 0 ? na2o / cao : 999;

    if (na2o >= 1.5 && cao <= 1.5 && naCaRatio > 1.0) {
      bentoniteType = 'natural_sodium';
      bentoniteTypeLabel = 'Природно-натриевый бентонит';
      bentoniteTypeDescription =
        'Высокий Na₂O (>1.5–3.0%), низкий CaO (0.5–1.5%), соотношение Na₂O/CaO > 1. Сами диспергируются в воде с высокой вязкостью (тип Вайоминг, Даш-Салахлы). Отличная база для ОМ без обязательной содовой активации.';
    } else if (mgo >= 3.5 && cao >= 2.0 && na2o < 1.5) {
      bentoniteType = 'alkaline_earth_hybrid';
      bentoniteTypeLabel = 'Щелочноземельный гибрид (Ca-Mg бентонит)';
      bentoniteTypeDescription =
        'Наряду с кальцием аномально высок магний (MgO > 3.5%) при низком натрии. Характерен для месторождений Средиземноморья и Азии. Требует содовой активации и контроля доломитового балласта.';
    } else if (cao >= 2.5 && na2o <= 0.5 && naCaRatio < 0.5) {
      bentoniteType = 'natural_calcium';
      bentoniteTypeLabel = 'Природно-кальциевый бентонит';
      bentoniteTypeDescription =
        'Высокий CaO (2.5–6.0%), низкий Na₂O (0.1–0.5%), Na₂O/CaO << 1. Для получения качественной ОМ обязательно требует активации кальцинированной содой (замещение Ca²⁺ на Na⁺).';
    } else if (na2o > 0.5 && na2o < 1.5) {
      bentoniteType = 'mixed_calsod';
      bentoniteTypeLabel = 'Смешанная форма (Ca-Na бентонит)';
      bentoniteTypeDescription =
        'Промежуточный состав по натрию (0.5% < Na₂O < 1.5%). Частично сохраняет кальциевые мостики, рекомендуется умеренная содовая активация для максимального раскрытия пластинок.';
    } else if (naCaRatio >= 1.0) {
      bentoniteType = 'natural_sodium';
      bentoniteTypeLabel = 'Натриевый бентонит (преобладание Na⁺)';
      bentoniteTypeDescription = 'Соотношение Na₂O/CaO превышает единицу, преобладает натриевый обменный комплекс.';
    } else {
      bentoniteType = 'natural_calcium';
      bentoniteTypeLabel = 'Кальциевый бентонит (преобладание Ca²⁺)';
      bentoniteTypeDescription = 'Преобладает кальциевый обменный комплекс, рекомендуется активация содой.';
    }
  }

  // 2. Exchangeable CaO & Calcite (CaCO3) calculation (табл_2.pdf)
  let caoExchangeable = 0;
  if (na2o >= 1.5) {
    caoExchangeable = 1.0;
  } else if (na2o <= 0.5) {
    caoExchangeable = 3.0;
  } else {
    // Линейная интерполяция континуума: CaO_обм = 4.0 - 2 * Na2O
    caoExchangeable = Math.max(0, 4.0 - 2.0 * na2o);
  }

  const calciteCaCO3 = Math.max(0, (cao - caoExchangeable) * 1.78);

  // 3. Dolomite MgCO3
  const dolomiteMgCO3 = Math.max(0, (mgo - 3.5) * 2.1);

  // 4. Sand (Free quartz / cristobalite SiO2)
  const freeSiO2 = Math.max(0, sio2 - al2o3 * 2.6);

  // 5. Feldspar / mica (Orthoclase)
  const orthoclase = k2o * 5.9;

  // 6. Iron ballast calculation based on bentonite color
  let ironBallast = 0;
  let ironStructural = fe2o3;
  let ironFree = 0;

  if (colorId === 'white_light_gray') {
    ironBallast = 0;
    ironStructural = fe2o3;
    ironFree = 0;
  } else if (colorId === 'green_olive') {
    // Structural iron in lattice (nontronitization) - not a ballast particle
    ironBallast = 0;
    ironStructural = fe2o3;
    ironFree = 0;
  } else {
    // Free iron: yellow (goethite), red (hematite), blue (pyrite), black/pink
    ironBallast = Math.max(0, fe2o3 - 2.0);
    ironStructural = Math.min(fe2o3, 2.0);
    ironFree = ironBallast;
  }

  // 7. Manganese and Titanium ballast
  const mnoBallast = mno > 0.1 ? mno : 0;
  const tio2Ballast = tio2;

  // Check if oxide data is sufficient for full ballast calculation
  const hasCoreOxides =
    oxides.SiO2 !== undefined &&
    oxides.Al2O3 !== undefined &&
    oxides.CaO !== undefined &&
    sio2 > 0 &&
    al2o3 > 0;

  const totalBallast = hasCoreOxides
    ? freeSiO2 + calciteCaCO3 + dolomiteMgCO3 + orthoclase + ironBallast + mnoBallast + tio2Ballast
    : 0;

  const estimatedSmectite = hasCoreOxides
    ? Math.max(0, Math.min(100, Number((100 - totalBallast).toFixed(2))))
    : 0;

  const impurities: ImpurityCalculationDetails = {
    na2o: Number(na2o.toFixed(2)),
    caoTotal: Number(cao.toFixed(2)),
    caoExchangeable: Number(caoExchangeable.toFixed(2)),
    isSufficientData: hasCoreOxides,
    freeSiO2: Number(freeSiO2.toFixed(2)),
    calciteCaCO3: Number(calciteCaCO3.toFixed(2)),
    dolomiteMgCO3: Number(dolomiteMgCO3.toFixed(2)),
    orthoclase: Number(orthoclase.toFixed(2)),
    ironBallast: Number(ironBallast.toFixed(2)),
    mnoBallast: Number(mnoBallast.toFixed(2)),
    tio2Ballast: Number(tio2Ballast.toFixed(2)),
    totalBallast: Number(totalBallast.toFixed(2)),
    estimatedSmectite: Number(estimatedSmectite.toFixed(2)),
    ironTotal: Number(fe2o3.toFixed(2)),
    ironStructural: Number(ironStructural.toFixed(2)),
    ironFree: Number(ironFree.toFixed(2)),
  };

  // 8. Effective Smectite determination logic:
  // Приоритет 1: Если заполнено 'содержание смектита', то эта цифра используется для интерпретации выводных данных.
  // Приоритет 2: Если 'содержание смектита' НЕ заполнено, а заполнено только 'КОЕ бентонита',
  // то это значение пересчитывается (по табл в файле смектит.pdf) на содержание смектита,
  // которое потом используется для интерпретации всех выходных данных.
  // Приоритет 3: Если же оба поля ('содержание смектита' и 'КОЕ бентонита') НЕ заполнены,
  // то расчет концентрации смектита в бентоните идет по алгоритму в файле таблица_2.pdf.
  let effectiveSmectite = 0;
  let smectiteSource: 'input' | 'xrf_calc' | 'cec_matrix' = 'input';
  let cecStandardUsed: number | undefined = undefined;

  const isSmectiteFilled = input.smectite !== undefined && !isNaN(input.smectite) && input.smectite > 0;
  const isCecFilled = input.cec !== undefined && !isNaN(input.cec) && input.cec > 0;

  if (isSmectiteFilled) {
    // Приоритет 1: Пользователь ввел содержание смектита напрямую
    effectiveSmectite = input.smectite!;
    smectiteSource = 'input';
  } else if (isCecFilled) {
    // Приоритет 2: Смектит не введен, но заполнено КОЕ -> пересчет по таблице смектит.pdf
    smectiteSource = 'cec_matrix';
    // По умолчанию строго используется таблица для Высокозарядного смектита (Эталон: 120 мг-экв) из смектит.pdf,
    // либо опция переключения на низкозарядный (100) или среднезарядный (110)
    cecStandardUsed = input.cecStandard ?? 120;

    // Формула из смектит.pdf: C_смектит = (КОЕ_образца / КОЕ_чистой_фазы) * 100%
    const calculatedSmectiteFromCec = Math.min(
      100,
      Math.round((input.cec! / cecStandardUsed) * 100)
    );
    effectiveSmectite = calculatedSmectiteFromCec;
  } else {
    // Приоритет 3: Оба поля (смектит и КОЕ) НЕ заполнены -> расчет по алгоритму таблица_2.pdf
    smectiteSource = 'xrf_calc';
    effectiveSmectite = hasCoreOxides ? estimatedSmectite : 0;
  }

  // 9. IOM Index Calculation (иом.doc)
  // ИОМ = (W(Na2O) / W(CaO)) * (W(SiO2) / W(Fe2O3)) * (100 / KOE)
  const missingIomParams: string[] = [];
  if (!oxides.Na2O) missingIomParams.push('Na₂O');
  if (!oxides.CaO) missingIomParams.push('CaO');
  if (!oxides.SiO2) missingIomParams.push('SiO₂');
  if (!oxides.Fe2O3) missingIomParams.push('Fe₂O₃');
  if (!input.cec) missingIomParams.push('КОЕ');

  let iomValue = 0;
  let multNaCa = 0;
  let multSiFe = 0;
  let multCec = 0;
  let isCalculable = false;
  let rating: 'excellent' | 'good' | 'acceptable' | 'poor' = 'poor';
  let ratingLabel = 'Расчет невозможен';

  if (missingIomParams.length === 0 && cao > 0 && fe2o3 > 0 && (input.cec ?? 0) > 0) {
    isCalculable = true;
    multNaCa = na2o / cao;
    multSiFe = sio2 / fe2o3;
    multCec = 100 / (input.cec ?? 100);
    iomValue = multNaCa * multSiFe * multCec;

    if (iomValue >= 35) {
      rating = 'excellent';
      ratingLabel = 'Отлично (> 35–40) — превосходный потенциал к органомодификации';
    } else if (iomValue >= 20) {
      rating = 'good';
      ratingLabel = 'Хорошо (20–35) — высокая приспособленность к органомодификации';
    } else if (iomValue >= 16) {
      rating = 'acceptable';
      ratingLabel = 'Приемлемо (16–20) — допустимо для базовых секторов ОМ';
    } else {
      rating = 'poor';
      ratingLabel = 'Низкий (< 16) — ограниченная или слабая приспособленность к ОМ';
    }
  }

  const iom: IomCalculationDetails = {
    value: Number(iomValue.toFixed(1)),
    multNaCa: Number(multNaCa.toFixed(2)),
    multSiFe: Number(multSiFe.toFixed(2)),
    multCec: Number(multCec.toFixed(2)),
    rating,
    ratingLabel,
    isCalculable,
    missingParams: missingIomParams,
  };

  // 10. API Model (если активация включена и введены ф600 и ф300)
  let apiModelResult: AnalysisResults['apiModel'] = undefined;
  if (input.activation && input.apiTest.f600 !== undefined && input.apiTest.f300 !== undefined) {
    apiModelResult = evaluateApiRheology(
      input.apiTest.f600,
      input.apiTest.f300,
      input.apiTest.pv,
      input.apiTest.yp
    );
  }

  // 11. Color interpretation summary
  const colorInterpretation = `${colorInfo.name}: ${colorInfo.probableImpurities} ${colorInfo.formationEnvironment}`;

  // 12. Industry Suitability Evaluation
  const evaluatedIndustries: IndustrySuitability[] = INDUSTRY_SPECS.map((spec) => {
    const reasonsFail: string[] = [];
    const reasonsPass: string[] = [];

    // Check Color
    let colorPass = false;
    if (spec.subIndustryId === 'drilling_standard' || spec.subIndustryId === 'grease_coarse' || spec.subIndustryId === 'mastics_bitumen') {
      colorPass = true;
      reasonsPass.push('Цвет сырья: допускается любой природный оттенок');
    } else if (spec.subIndustryId === 'coatings_premium') {
      if (colorId === 'white_light_gray') {
        colorPass = true;
        reasonsPass.push('Цвет сырья: идеально белый/светло-серый (без хромофоров)');
      } else {
        colorPass = false;
        reasonsFail.push(`Цвет: требуется строго белый или светло-серый (текущий цвет: ${colorInfo.shortName})`);
      }
    } else if (spec.subIndustryId === 'coatings_basic') {
      if (colorId === 'white_light_gray' || colorId === 'green_olive' || colorId === 'yellow_ochre') {
        colorPass = true;
        reasonsPass.push(`Цвет сырья (${colorInfo.shortName}) допустим для базовых ЛКМ`);
      } else {
        colorPass = false;
        reasonsFail.push(`Красные и черные глины искажают колористику светлых эмалей`);
      }
    } else if (spec.subIndustryId === 'liquid_rubber_glues') {
      if (colorId === 'white_light_gray' || colorId === 'green_olive' || colorId === 'yellow_ochre' || colorId === 'red_terracotta') {
        colorPass = true;
        reasonsPass.push(`Цвет допустим (отсутствуют ингибирующие полимеризацию сульфиды)`);
      } else {
        colorPass = false;
        reasonsFail.push(`Черные и синие глины вступают в побочные реакции с полимерами из-за сульфидов и органики`);
      }
    } else if (spec.subIndustryId === 'grease_precision') {
      if (colorId === 'white_light_gray' || colorId === 'green_olive') {
        colorPass = true;
        reasonsPass.push(`Цвет сырья чистый, исключены абразивные гематит и гётит`);
      } else {
        colorPass = false;
        reasonsFail.push(`Красные и желтые глины строго запрещены из-за абразивного гематита и гётита`);
      }
    } else if (spec.subIndustryId === 'drilling_deep_hthp') {
      if (colorId === 'white_light_gray' || colorId === 'green_olive') {
        colorPass = true;
        reasonsPass.push(`Цвет сырья исключает свободные оксиды железа (термостабильность >150°C)`);
      } else {
        colorPass = false;
        reasonsFail.push(`Желтые и красные глины исключаются: свободное железо катализирует термодеградацию ПАВ >150°C`);
      }
    }

    // Check Smectite
    if (effectiveSmectite > 0) {
      if (effectiveSmectite >= spec.minSmectite) {
        reasonsPass.push(`Смектит (${effectiveSmectite}% >= ${spec.minSmectite}%) удовлетворяет нормативу`);
      } else {
        reasonsFail.push(`Недостаточно смектита: ${effectiveSmectite}% (требуется > ${spec.minSmectite}%)`);
      }
    }

    // Check CEC
    if (input.cec !== undefined && input.cec > 0) {
      if (input.cec >= spec.minCec) {
        reasonsPass.push(`КОЕ (${input.cec} мг-экв >= ${spec.minCec}) в норме`);
      } else {
        reasonsFail.push(`КОЕ: ${input.cec} мг-экв/100г (требуется > ${spec.minCec})`);
      }
    }

    // Check Swelling Index
    if (input.swellingIndex !== undefined && input.swellingIndex > 0) {
      if (input.swellingIndex >= spec.minSwelling) {
        reasonsPass.push(`Индекс набухания (${input.swellingIndex} мл/2г >= ${spec.minSwelling}) в норме`);
      } else {
        reasonsFail.push(`Набухание: ${input.swellingIndex} мл/2г (требуется > ${spec.minSwelling})`);
      }
    }

    // Check Sand
    const currentSand = input.sand !== undefined ? input.sand : (hasCoreOxides ? freeSiO2 : undefined);
    if (currentSand !== undefined) {
      if (currentSand <= spec.maxSand) {
        reasonsPass.push(`Содержание песка (${currentSand.toFixed(2)}% <= ${spec.maxSand}%) допустимо`);
      } else {
        reasonsFail.push(`Песок (${currentSand.toFixed(2)}% превышает предел ${spec.maxSand}%)`);
      }
    }

    // Check Ballast
    if (hasCoreOxides) {
      if (totalBallast <= spec.maxBallast) {
        reasonsPass.push(`Несмектитовый балласт (${totalBallast.toFixed(1)}% <= ${spec.maxBallast}%) в норме`);
      } else {
        reasonsFail.push(`Балласт (${totalBallast.toFixed(1)}% превышает допуск ${spec.maxBallast}%)`);
      }
    }

    const failCount = reasonsFail.length;
    const isSuitable = colorPass && failCount === 0;
    const isLimited = !isSuitable && failCount >= 1 && failCount <= 2;
    const suitabilityStatus: 'suitable' | 'limited' | 'unsuitable' = isSuitable
      ? 'suitable'
      : isLimited
      ? 'limited'
      : 'unsuitable';

    return {
      ...spec,
      isSuitable,
      isLimited,
      suitabilityStatus,
      failCount,
      reasonsFail,
      reasonsPass,
    };
  });

  const suitableIndustries = evaluatedIndustries.filter((ind) => ind.isSuitable);
  const limitedIndustries = evaluatedIndustries.filter((ind) => ind.isLimited);
  const applicableIndustries = evaluatedIndustries.filter((ind) => ind.isSuitable || ind.isLimited);

  let smectiteLabel = 'Смектит по РФА';
  if (smectiteSource === 'input') {
    smectiteLabel = 'Смектит факт';
  } else if (smectiteSource === 'cec_matrix') {
    smectiteLabel = 'Смектит расчет из КОЕ';
  }

  return {
    bentoniteType,
    bentoniteTypeLabel,
    bentoniteTypeDescription,
    colorInterpretation,
    impurities,
    iom,
    apiModel: apiModelResult,
    suitableIndustries,
    limitedIndustries,
    applicableIndustries,
    allIndustries: evaluatedIndustries,
    effectiveSmectite,
    smectiteSource,
    smectiteLabel,
    cecStandardUsed,
  };
}

export const analyzeBentonite = calculateAnalysis;
