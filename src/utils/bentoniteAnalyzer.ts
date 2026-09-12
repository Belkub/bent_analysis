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
  // "Если во входных данных есть только значение КОЕ (а смектита нет, то для работы с данными
  // концентрация смектита (в %) определяется по алгоритму в файле табл_2.pdf, а если данных РФА по
  // оксидам не хватает, то содержание смектита определяется по таблице в файле Смектит.pdf."
  let effectiveSmectite = 0;
  let smectiteSource: 'input' | 'xrf_calc' | 'cec_matrix' = 'input';
  let cecStandardUsed: number | undefined = undefined;

  if (input.smectite !== undefined && input.smectite > 0) {
    effectiveSmectite = input.smectite;
    smectiteSource = 'input';
  } else if (hasCoreOxides) {
    effectiveSmectite = estimatedSmectite;
    smectiteSource = 'xrf_calc';
  } else if (input.cec !== undefined && input.cec > 0) {
    smectiteSource = 'cec_matrix';
    // Decide standard: 100 meq (standard sodium / moderate), 110 meq (intermediate), 120 meq (high-charge Caucasian)
    if (bentoniteType === 'natural_sodium') {
      cecStandardUsed = 100;
    } else if (input.cec > 105) {
      cecStandardUsed = 120;
    } else if (input.cec > 85) {
      cecStandardUsed = 110;
    } else {
      cecStandardUsed = 100;
    }
    effectiveSmectite = Math.min(100, Math.round((input.cec / cecStandardUsed) * 100));
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
    const f600 = input.apiTest.f600;
    const f300 = input.apiTest.f300;
    const pv = input.apiTest.pv !== undefined ? input.apiTest.pv : f600 - f300;
    const yp = input.apiTest.yp !== undefined ? input.apiTest.yp : f300 - pv;
    const ratio = pv > 0 ? Number((yp / pv).toFixed(2)) : 0;

    let model: ApiModel = 'non_standard';
    let label = 'Нестандартная марка';
    let description = 'Показатели API не соответствуют стандартным маркам (ф600 < 30 или YP/PV > 6).';

    if (f600 >= 30) {
      if (ratio <= 1.5) {
        model = 'non_treated';
        label = "Модель 'non-treated'";
        description = 'Наилучшая для органомодификации (ОМ): равномерный выход вязкости, минимальный избыточный тиксотропный сдвиг.';
      } else if (ratio <= 3.0) {
        model = 'drilling_grade';
        label = "Модель 'drilling grade'";
        description = 'Хорошая для органомодификации (ОМ): стандартная буровая марка с качественной содовой активацией.';
      } else if (ratio <= 6.0) {
        model = 'ocma';
        label = "Модель 'OCMA'";
        description = 'Приемлемая для органомодификации (ОМ): допустимый диапазон, возможен повышенный расход активатора.';
      }
    }

    apiModelResult = {
      model,
      label,
      description,
      pv,
      yp,
      ratio,
    };
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

    const isSuitable = colorPass && reasonsFail.length === 0;

    return {
      ...spec,
      isSuitable,
      reasonsFail,
      reasonsPass,
    };
  });

  const suitableIndustries = evaluatedIndustries.filter((ind) => ind.isSuitable);

  return {
    bentoniteType,
    bentoniteTypeLabel,
    bentoniteTypeDescription,
    colorInterpretation,
    impurities,
    iom,
    apiModel: apiModelResult,
    suitableIndustries,
    allIndustries: evaluatedIndustries,
    effectiveSmectite,
    smectiteSource,
    cecStandardUsed,
  };
}

export const analyzeBentonite = calculateAnalysis;
