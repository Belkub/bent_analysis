/**
 * Types for Bentonite Organomodification Evaluation System
 * Grounded in technical documents: табл_1.pdf, табл_2.pdf, иом.doc, ОГ помол.pdf, ОГ по отраслям.pdf, Смектит.pdf
 */

export type BentoniteColorId =
  | 'white_light_gray'
  | 'yellow_ochre'
  | 'red_terracotta'
  | 'green_olive'
  | 'blue_gray'
  | 'dark_gray_black'
  | 'pink_lilac';

export interface BentoniteColorInfo {
  id: BentoniteColorId;
  name: string;
  shortName: string;
  sampleHex: string;
  probableImpurities: string;
  formationEnvironment: string;
  ironBehavior: 'none' | 'structural' | 'free_oxyhydroxides' | 'free_hematite' | 'free_sulfides' | 'free_organics_manganese' | 'manganese_traces';
  ironStatusDescription: string;
}

export type OxideKey =
  | 'Na2O'
  | 'MgO'
  | 'Al2O3'
  | 'SiO2'
  | 'K2O'
  | 'CaO'
  | 'TiO2'
  | 'MnO'
  | 'Fe2O3'
  | 'P2O5'
  | 'SO3';

export type OxideComposition = Partial<Record<OxideKey, number>>;

export interface ApiTestData {
  f600?: number;
  f300?: number;
  pv?: number;
  yp?: number;
}

export interface BentoniteInputData {
  colorId: BentoniteColorId;
  colorPhotoUrl?: string;
  oxides: OxideComposition;
  swellingIndex?: number; // см3/2г
  cec?: number;           // КОЕ, мг-экв/100г
  cecStandard?: 100 | 110 | 120; // эталон чистого смектита (смектит.pdf)
  smectite?: number;      // %
  sand?: number;          // %
  activation: boolean;
  sodaPercent?: number;   // % Na2CO3
  apiTest: ApiTestData;
}

export type BentoniteType =
  | 'natural_sodium'        // Природно-натриевая
  | 'natural_calcium'       // Природно-кальциевая
  | 'mixed_calsod'          // Смешанная (Ca-Na)
  | 'alkaline_earth_hybrid' // Щелочноземельный гибрид (Ca-Mg)
  | 'insufficient_data';    // Данных недостаточно

export type ApiModel =
  | 'non_treated'    // YP/PV <= 1.5 & ф600 >= 30: наилучшая для ОМ
  | 'drilling_grade' // YP/PV <= 3 & ф600 >= 30: хорошая для ОМ
  | 'ocma'           // YP/PV <= 6 & ф600 >= 30: приемлемая для ОМ
  | 'non_standard';  // ф600 < 30 или YP/PV > 6

export interface ImpurityCalculationDetails {
  na2o: number;
  caoTotal: number;
  caoExchangeable: number;
  isSufficientData: boolean;
  freeSiO2: number;        // Песок (кварц/кристобалит)
  calciteCaCO3: number;    // Мел
  dolomiteMgCO3: number;   // Доломит
  orthoclase: number;      // Полевые шпаты / слюды
  ironBallast: number;     // Железный балласт
  mnoBallast: number;      // Марганец
  tio2Ballast: number;     // Титан
  totalBallast: number;    // Итоговая сумма несмектитовых примесей %
  estimatedSmectite: number; // 100 - totalBallast
  ironTotal: number;       // Fe2O3 %
  ironStructural: number;  // Структурное Fe2O3 %
  ironFree: number;        // Свободное Fe2O3 %
}

export interface IomCalculationDetails {
  value: number;
  multNaCa: number;
  multSiFe: number;
  multCec: number;
  rating: 'excellent' | 'good' | 'acceptable' | 'poor';
  ratingLabel: string;
  isCalculable: boolean;
  missingParams: string[];
}

export interface IndustrySuitability {
  subIndustryId: string;
  code: string;
  name: string;
  category: string;
  isSuitable: boolean;
  reasonsFail: string[];
  reasonsPass: string[];
  allowedColors: string;
  minSmectite: number;
  minCec: number;
  minSwelling: number;
  maxSand: number;
  maxBallast: number;
  targetMedium: string;
  polarity: string;
  fann35Dt: string;
  fann35Xylene: string;
  brookfield: string;
  gelAppearance: string;
  pasteAllowed: string;
  suspensionAllowed: string;
  optimalMilling: string;
  suboptimalMilling: string;
  particleSize: string;
}

export interface AnalysisResults {
  bentoniteType: BentoniteType;
  bentoniteTypeLabel: string;
  bentoniteTypeDescription: string;
  colorInterpretation: string;
  impurities: ImpurityCalculationDetails;
  iom: IomCalculationDetails;
  apiModel?: {
    model: ApiModel;
    label: string;
    description: string;
    pv: number;
    yp: number;
    ratio: number;
  };
  suitableIndustries: IndustrySuitability[];
  allIndustries: IndustrySuitability[];
  effectiveSmectite: number;
  smectiteSource: 'input' | 'xrf_calc' | 'cec_matrix';
  cecStandardUsed?: number;
}

export interface BenchmarkPreset {
  id: string;
  name: string;
  description: string;
  sourceDoc: string;
  data: BentoniteInputData;
}
