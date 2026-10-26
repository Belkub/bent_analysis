import {
  AnalysisResults,
  BentoniteColorId,
  BentoniteInputData,
  BentoniteType,
  ApiModel,
  ImpurityCalculationDetails,
  IomCalculationDetails,
  IndustrySuitability,
  ApiRheologyEvaluation,
  SodiumSubstitutionRating,
  ApiModelQuality,
  IndustryApiSummary,
} from '../types';
import { BENTONITE_COLORS, INDUSTRY_SPECS, CEC_SMECTITE_MATRIX } from '../data/mineralData';

/**
 * Оценка реологии бентонита по API-тесту и пригодности для органомодификации (ОМ).
 * Реологические критерии стандарта API Spec 13A и механизмы поведения бентонитовых суспензий:
 * 
 * ОБЯЗАТЕЛЬНЫЙ КРИТЕРИЙ: У ВСЕХ 3 МОДЕЛЕЙ API ПОКАЗАТЕЛЬ ф600 ДОЛЖЕН БЫТЬ НЕ МЕНЕЕ 30 (F₆₀₀ ≥ 30)!
 * 1. Модели при F₆₀₀ ≥ 30 (классификация по структурному фактору YP/PV):
 *    - YP/PV <= 1.5: модель 'non-treated' (API 13A Section 11, наилучшая для ОМ, сохранение тактоидов с межслоевыми галереями)
 *    - YP/PV <= 3.0: модель 'drilling grade' (API 13A Section 9, хорошая для ОМ, стандартная буровая кондиция)
 *    - YP/PV <= 6.0: модель 'ocma' (API 13A Section 10, приемлемая для ОМ, умеренная пептизация)
 *    - YP/PV 6.0 .. 8.0: 'marginal_ocma' — ограниченно пригоден для ОМ при получении среднесортной ОГ (снизить вложение соды)
 *    - YP/PV > 8.0: 'non_standard' — избыточный тиксотропный сдвиг, деструкция структуры (сценарии А/Б/В)
 * 2. Оценка при F₆₀₀ < 30:
 *    - Ни одна из 3 моделей API не выполняется (норма F₆₀₀ ≥ 30 для всех 3 моделей).
 *    - При ф600 от 18 до 29: классифицируется как не соответствующий API (требует активации содой 0,3–1,5% для подъема ф600 ≥ 30).
 *    - При ф600 < 18: нестандартная марка (критически недостаточная вязкость суспензии).
 * 3. Степень замещения на натрий по данным API-теста x = YP / F600:
 *    - Хороший уровень (Оптимально): 0,30 - 0,60
 *    - Приемлемый уровень: 0,20 - 0,30 и 0,60 - 0,75
 *    - Неприемлемый уровень: выше 0,75 (риск монослойной пептизации / распада тактоидов) и ниже 0,20 (недоактивация)
 * 4. Классификация API-модели для отраслевых отчетов:
 *    - "Отлично" при non-treated или drilling grade (ф600 ≥ 30, YP/PV <= 3.0)
 *    - "Хорошо" при OCMA (ф600 ≥ 30, YP/PV <= 6.0)
 *    - "Ограниченно" при marginal_ocma (ф600 ≥ 30, YP/PV 6.0–8.0) либо ф600 18–29
 *    - "Неприемлемо" при non_standard (ф600 < 18 или YP/PV > 8.0)
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
  const sodiumSubstitutionDegree = f600 > 0 ? Number((yp / f600).toFixed(3)) : 0;

  // Оценка степени замещения на натрий x = YP / F600
  let sodiumSubstitutionRating: SodiumSubstitutionRating = 'unacceptable';
  let sodiumSubstitutionLabel = 'Неприемлемый уровень';
  let sodiumSubstitutionDescription = '';

  if (sodiumSubstitutionDegree >= 0.3 && sodiumSubstitutionDegree <= 0.6) {
    sodiumSubstitutionRating = 'optimal';
    sodiumSubstitutionLabel = 'Хороший уровень (Оптимально)';
    sodiumSubstitutionDescription =
      'Оптимальная степень замещения (0,30–0,60): сохраняется многослойная тактоидная структура с открытыми межслоевыми галереями для полноценной интеркаляции ЧАС.';
  } else if (
    (sodiumSubstitutionDegree >= 0.2 && sodiumSubstitutionDegree < 0.3) ||
    (sodiumSubstitutionDegree > 0.6 && sodiumSubstitutionDegree <= 0.75)
  ) {
    sodiumSubstitutionRating = 'acceptable';
    sodiumSubstitutionLabel = 'Приемлемый уровень';
    sodiumSubstitutionDescription =
      sodiumSubstitutionDegree < 0.3
        ? 'Умеренное замещение (0,20–0,30): тактоиды сохранены, но раскрытие пластинок может требовать увеличенного времени сдвига.'
        : 'Повышенное замещение (0,60–0,75): допустимо, но возрастает риск частичного распада тактоидов при интенсивном диспергировании.';
  } else {
    sodiumSubstitutionRating = 'unacceptable';
    sodiumSubstitutionLabel = 'Неприемлемый уровень';
    sodiumSubstitutionDescription =
      sodiumSubstitutionDegree > 0.75
        ? 'Критическая переактивация (x > 0,75): кристаллические пакеты расщепляются до монослоев, межслоевые галереи исчезают, ЧАС закрепляться негде.'
        : 'Недостаточная активация (x < 0,20): преобладают нераскрытые плотные кальциевые агрегаты с низкой гидрофильной раздвижкой.';
  }

  // ОБЯЗАТЕЛЬНОЕ ТРЕБОВАНИЕ: У ВСЕХ 3 МОДЕЛЕЙ API ПОКАЗАТЕЛЬ ф600 ДОЛЖЕН БЫТЬ НЕ МЕНЕЕ 30
  const isOptimalF600 = f600 >= 30;

  let model: ApiModel = 'non_standard';
  let label = 'Нестандартная марка';
  let suitabilitySummary = 'Нестандартная реология';
  let recommendation: string | undefined = undefined;
  let description = '';
  let apiModelQuality: ApiModelQuality = 'unacceptable';
  let apiModelQualityLabel = 'Неприемлемо (ф600 < 30)';

  if (isOptimalF600) {
    // ф600 >= 30: выполняется базовый норматив вискозиметра для всех 3 моделей API
    if (ratio <= 1.5) {
      model = 'non_treated';
      label = "Модель 'non-treated' (API 13A Sec 11)";
      suitabilitySummary = 'Наилучшая для органомодификации (ОМ)';
      description = `Соответствует модели non-treated (ф600 = ${f600} ≥ 30, YP/PV = ${ratio} ≤ 1.5): равномерный выход вязкости, частицы остаются многослойными тактоидами с открытыми галереями для свободного проникновения ЧАС.`;
      apiModelQuality = 'excellent';
      apiModelQualityLabel = 'Отлично';
    } else if (ratio <= 3.0) {
      model = 'drilling_grade';
      label = "Модель 'drilling grade' (API 13A Sec 9)";
      suitabilitySummary = 'Хорошая для органомодификации (ОМ)';
      description = `Соответствует модели drilling grade (ф600 = ${f600} ≥ 30, YP/PV = ${ratio} ≤ 3.0): кондиционная буровая марка со сбалансированной содовой активацией и сохранными тактоидами.`;
      apiModelQuality = 'excellent';
      apiModelQualityLabel = 'Отлично';
    } else if (ratio <= 6.0) {
      model = 'ocma';
      label = "Модель 'OCMA' (API 13A Sec 10)";
      suitabilitySummary = 'Приемлемая для органомодификации (ОМ)';
      description = `Соответствует модели OCMA (ф600 = ${f600} ≥ 30, YP/PV = ${ratio} ≤ 6.0): допустимый диапазон реологии, умеренная пептизация пакетов, пригодна для серийных сортов ОГ.`;
      apiModelQuality = 'good';
      apiModelQualityLabel = 'Хорошо';
    } else if (ratio <= 8.0) {
      model = 'marginal_ocma';
      label = 'Ограниченно пригодная марка (ф600 ≥ 30, YP/PV 6–8)';
      suitabilitySummary = 'Ограниченно пригоден для ОМ (среднесортная ОГ)';
      recommendation =
        'Если глина активирована, рекомендуется снизить вложение соды во избежание монослойного распада тактоидов.';
      description = `Показатель ф600 = ${f600} ≥ 30 в норме, однако повышенный тиксотропный сдвиг (YP/PV = ${ratio} ∈ 6–8) свидетельствует о начальной деструкции тактоидов. Пригодно для среднесортной ОГ.`;
      apiModelQuality = 'limited';
      apiModelQualityLabel = 'Ограниченно';
    } else {
      model = 'non_standard';
      label = `Нестандартная марка (ф600 = ${f600} ≥ 30, YP/PV = ${ratio} > 8)`;
      suitabilitySummary = 'Не соответствует стандартам ОМ (деструкция тактоидов)';
      recommendation =
        'Критический избыток соды или электролитное загрязнение. Рекомендуется снизить дозировку соды во избежание разрушения межслоевых галерей.';
      description = `Показатели API не соответствуют стандартам ОМ: критический тиксотропный сдвиг (YP/PV = ${ratio} > 8). Высок риск разрушения тактоидов до монослоев (сценарии деструкции А/Б/В), ЧАС закрепляться негде.`;
      apiModelQuality = 'unacceptable';
      apiModelQualityLabel = 'Неприемлемо';
    }
  } else if (f600 >= 18 && f600 < 30) {
    // ф600 от 18 до 29: НЕ удовлетворяет нормативу ни одной из 3 моделей API (норма ф600 >= 30)
    model = 'non_standard';
    label = `Не соответствует API: ф600 < 30 (текущий: ${f600})`;
    suitabilitySummary = 'Требует активации до ф600 ≥ 30';
    recommendation =
      'У всех 3 моделей API (non-treated, drilling grade, OCMA) норма ф600 составляет не менее 30. Рекомендуется содовая активация 0,3–1,5% для увеличения ф600 выше 30.';
    description = `Показатель ф600 = ${f600} ниже обязательного норматива стандарта API (у всех трех моделей норма ф600 ≥ 30). Потенциал по структурному фактору YP/PV = ${ratio}: ${
      ratio <= 1.5
        ? 'высокий (соответствует non-treated при ф600 ≥ 30)'
        : ratio <= 3.0
        ? 'хороший (соответствует drilling grade при ф600 ≥ 30)'
        : ratio <= 6.0
        ? 'умеренный (соответствует OCMA при ф600 ≥ 30)'
        : 'риск деструкции (YP/PV > 6)'
    }. Необходима содовая доактивация сырья для достижения порога ф600 ≥ 30.`;
    apiModelQuality = 'limited';
    apiModelQualityLabel = 'Ограниченно (ф600 < 30)';
  } else {
    // ф600 < 18
    model = 'non_standard';
    label = `Нестандартная марка (ф600 = ${f600} < 18)`;
    suitabilitySummary = 'Недостаточная вязкость (ф600 < 30)';
    recommendation =
      `Критически низкая вязкость суспензии (ф600 = ${f600} при норме ≥ 30 для всех 3 моделей API). Требуется интенсивная содовая активация или предварительное обогащение сырья.`;
    description = `Показатели API существенно ниже допустимого норматива: ф600 = ${f600} (у всех трех моделей норма ф600 ≥ 30). Недостаточный коллоидный выход вязкости суспензии.`;
    apiModelQuality = 'unacceptable';
    apiModelQualityLabel = 'Неприемлемо (ф600 < 30)';
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
    sodiumSubstitutionDegree,
    sodiumSubstitutionRating,
    sodiumSubstitutionLabel,
    sodiumSubstitutionDescription,
    apiModelQuality,
    apiModelQualityLabel,
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
  } else if (colorId === 'grey') {
    // Grey bentonite: iron is predominantly structural in smectite lattice (Fe2+/Fe3+) and authigenic micro-siderite (FeCO3)
    // Non-abrasive, structural allowance up to 3.0% Fe2O3
    ironBallast = Math.max(0, fe2o3 - 3.0);
    ironStructural = Math.min(fe2o3, 3.0);
    ironFree = ironBallast;
  } else if (colorId === 'dark_brown_black' || colorId === 'dark_gray_black') {
    // Dark brown / black: organic matter complexes, pyritic sulfides, manganese
    ironBallast = Math.max(0, fe2o3 - 2.0);
    ironStructural = Math.min(fe2o3, 2.0);
    ironFree = ironBallast;
  } else {
    // Free iron: yellow (goethite), red (hematite), blue (pyrite), pink
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
    const isDarkBrownBlack = colorId === 'dark_brown_black' || colorId === 'dark_gray_black';

    if (spec.subIndustryId === 'drilling_standard' || spec.subIndustryId === 'grease_coarse' || spec.subIndustryId === 'mastics_bitumen') {
      colorPass = true;
      if (spec.subIndustryId === 'mastics_bitumen' && isDarkBrownBlack) {
        reasonsPass.push('Цвет сырья: гуминовые соединения темно-коричневой/черной глины совместимы с битумом и пластифицируют его');
      } else {
        reasonsPass.push(`Цвет сырья (${colorInfo.shortName}): допускается любой природный оттенок`);
      }
    } else if (spec.subIndustryId === 'coatings_premium') {
      if (colorId === 'white_light_gray') {
        colorPass = true;
        reasonsPass.push('Цвет сырья: идеально белый / кремовый (без хромофоров)');
      } else if (colorId === 'grey') {
        colorPass = false;
        reasonsFail.push('Цвет: для премиальных прозрачных лаков и белоснежных эмалей требуется белый сырец без хромофоров (серый цвет дает дымчатый оттенок)');
      } else {
        colorPass = false;
        reasonsFail.push(`Цвет: требуется строго белый или кремовый (текущий цвет: ${colorInfo.shortName})`);
      }
    } else if (spec.subIndustryId === 'coatings_basic') {
      if (colorId === 'white_light_gray' || colorId === 'grey' || colorId === 'green_olive' || colorId === 'yellow_ochre') {
        colorPass = true;
        reasonsPass.push(`Цвет сырья (${colorInfo.shortName}) допустим для грунтовок, шпатлевок и эмалей`);
      } else {
        colorPass = false;
        reasonsFail.push('Красные и темно-коричневые/черные глины искажают колористику светлых эмалей');
      }
    } else if (spec.subIndustryId === 'liquid_rubber_glues') {
      if (colorId === 'white_light_gray' || colorId === 'grey' || colorId === 'green_olive' || colorId === 'yellow_ochre' || colorId === 'red_terracotta') {
        colorPass = true;
        reasonsPass.push('Цвет допустим (отсутствуют ингибирующие полимеризацию сульфиды и свободные гуматы)');
      } else {
        colorPass = false;
        reasonsFail.push('Темно-коричневые/черные и синие глины вступают в побочные реакции с полимерами из-за сульфидов и гуминовых кислот');
      }
    } else if (spec.subIndustryId === 'grease_precision') {
      if (colorId === 'white_light_gray' || colorId === 'grey' || colorId === 'green_olive') {
        colorPass = true;
        reasonsPass.push(`Цвет сырья (${colorInfo.shortName}): исключены абразивные гематит, гётит и пирит`);
      } else {
        colorPass = false;
        reasonsFail.push('Красные, желтые и темно-коричневые/черные глины строго запрещены из-за абразивных минералов (гематит, гётит, пирит)');
      }
    } else if (spec.subIndustryId === 'drilling_deep_hthp') {
      if (colorId === 'white_light_gray' || colorId === 'grey' || colorId === 'green_olive') {
        colorPass = true;
        reasonsPass.push(`Цвет сырья (${colorInfo.shortName}): исключены термолабильные свободные оксигидроксиды Fe и гуматы (термостабильность >150°C)`);
      } else if (isDarkBrownBlack) {
        colorPass = false;
        reasonsFail.push('Темно-коричневые и черные глины исключаются: гуматы и сульфиды подвержены термодеструкции при >150°C');
      } else {
        colorPass = false;
        reasonsFail.push('Желтые и красные глины исключаются: свободные оксиды железа катализируют термодеградацию ПАВ >150°C');
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

    // Build Industry API Summary (API-модель и степень замещения натрия)
    let apiSummary: IndustryApiSummary | undefined = undefined;
    if (apiModelResult) {
      const q = apiModelResult.apiModelQuality;
      const x = apiModelResult.sodiumSubstitutionDegree ?? 0;
      const xLabel = apiModelResult.sodiumSubstitutionLabel || 'Не определено';
      let conclusion = '';

      if (q === 'excellent') {
        if (apiModelResult.sodiumSubstitutionRating === 'optimal') {
          conclusion = `API-модель Отлично (${apiModelResult.label}), замещение Na x = ${x} (Оптимально). Тактоидная структура сохранена, открытые галереи для ЧАС — сырье высшей кондиции для ${spec.name}.`;
        } else if (apiModelResult.sodiumSubstitutionRating === 'acceptable') {
          conclusion = `API-модель Отлично (${apiModelResult.label}), замещение Na x = ${x} (${xLabel}). Реология в норме, сырье пригодно для ${spec.name}.`;
        } else {
          conclusion = `API-модель ${apiModelResult.label}, но степень замещения Na x = ${x} (${xLabel}) — риск распада тактоидов либо недоактивации.`;
        }
      } else if (q === 'good') {
        if (apiModelResult.sodiumSubstitutionRating === 'optimal' || apiModelResult.sodiumSubstitutionRating === 'acceptable') {
          conclusion = `API-модель Хорошо (OCMA, YP/PV ≤ 6), замещение Na x = ${x} (${xLabel}). Удовлетворяет требованиям для выпуска ОГ под ${spec.name}.`;
        } else {
          conclusion = `API-модель Хорошо (OCMA), однако замещение Na x = ${x} (${xLabel}) требует технологической корректировки расхода соды.`;
        }
      } else if (q === 'limited') {
        if (apiModelResult.label.includes('ф600 < 30')) {
          conclusion = `API-модель Ограниченно (${apiModelResult.label}), замещение Na x = ${x} (${xLabel}). Показатель ф600 ниже обязательного порога (норма ф600 ≥ 30 для всех 3 моделей API). Требуется содовая активация для вывода ф600 ≥ 30.`;
        } else {
          conclusion = `API-модель Ограниченно (${apiModelResult.label}, YP/PV 6–8), замещение Na x = ${x} (${xLabel}). Повышенная тиксотропия, пригодно для среднесортной ОГ (снизьте дозировку соды).`;
        }
      } else {
        conclusion = `API-модель Неприемлемо (${apiModelResult.label}), замещение Na x = ${x} (${xLabel}). Не соответствует обязательным критериям стандарта API (ф600 ≥ 30 для всех 3 моделей) либо критическая деструкция тактоидов.`;
      }

      apiSummary = {
        modelLabel: apiModelResult.label,
        modelQuality: apiModelResult.apiModelQuality || 'unacceptable',
        modelQualityLabel: apiModelResult.apiModelQualityLabel || 'Неприемлемо',
        sodiumSubstitutionDegree: apiModelResult.sodiumSubstitutionDegree,
        sodiumSubstitutionRating: apiModelResult.sodiumSubstitutionRating,
        sodiumSubstitutionLabel: apiModelResult.sodiumSubstitutionLabel,
        conclusion,
      };
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
      apiSummary,
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
