import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  BentoniteColorId,
  OxideComposition,
  ApiTestData,
  AnalysisResults,
  OxideKey,
} from '../types';
import { BENTONITE_COLORS } from '../data/mineralData';

export const ALL_OXIDE_KEYS: OxideKey[] = [
  'SiO2',
  'Al2O3',
  'Fe2O3',
  'CaO',
  'Na2O',
  'MgO',
  'K2O',
  'TiO2',
  'MnO',
  'P2O5',
  'SO3',
];

export interface PdfReportPayload {
  sampleName: string;
  photoUrl?: string;
  colorId: BentoniteColorId;
  oxides: OxideComposition;
  swellingIndex?: number;
  cec?: number;
  cecStandard?: 100 | 110 | 120;
  smectite?: number;
  sand?: number;
  activation: boolean;
  sodaPercent?: number;
  apiTest: ApiTestData;
  analysisResults: AnalysisResults;
}

/**
 * Creates an offscreen container with high-precision antialiasing styles.
 */
function createPdfContainer(id: string): HTMLDivElement {
  const container = document.createElement('div');
  container.id = id;
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '-10000px';
  container.style.width = '794px';
  container.style.zIndex = '-9999';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  (container.style as any).webkitFontSmoothing = 'antialiased';
  (container.style as any).mozOsxFontSmoothing = 'grayscale';
  container.style.textRendering = 'geometricPrecision';
  return container;
}

/**
 * Renders an HTML page element onto an ultra-sharp high-DPI canvas (scale 3, ~300 DPI)
 * and returns it as a lossless PNG Data URL to prevent blurriness and JPEG artifacts.
 */
async function renderPageToCanvas(pageElement: HTMLElement): Promise<HTMLCanvasElement> {
  return await html2canvas(pageElement, {
    scale: 3, // True ~300 DPI high resolution for razor-sharp text
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    scrollX: 0,
    scrollY: 0,
    windowWidth: 794,
    windowHeight: 1123,
    x: 0,
    y: 0,
    width: 794,
    height: 1123,
  });
}

/**
 * Generates and triggers download of an exhaustive, ultra-crisp 4-page PDF laboratory report
 * where data is comfortably distributed across 4 distinct pages without overcrowding,
 * clipping, or abbreviations.
 */
export async function generateBentonitePdfReport(payload: PdfReportPayload): Promise<void> {
  const {
    sampleName,
    photoUrl,
    colorId,
    oxides,
    swellingIndex,
    cec,
    cecStandard = 120,
    sand,
    activation,
    sodaPercent,
    apiTest,
    analysisResults,
  } = payload;

  const colorInfo = BENTONITE_COLORS.find((c) => c.id === colorId) || BENTONITE_COLORS[0];
  const { impurities, iom, apiModel } = analysisResults;
  const totalOxides = Object.values(oxides).reduce((acc, v) => acc + (v || 0), 0);
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeFormatted = now.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate oxide ratios
  const na2o = oxides.Na2O ?? 0;
  const cao = oxides.CaO ?? 0;
  const sio2 = oxides.SiO2 ?? 0;
  const fe2o3 = oxides.Fe2O3 ?? 0;
  const al2o3 = oxides.Al2O3 ?? 0;

  const naCaRatio = cao > 0 ? (na2o / cao).toFixed(2) : '—';
  const siFeRatio = fe2o3 > 0 ? (sio2 / fe2o3).toFixed(2) : '—';
  const siAlRatio = al2o3 > 0 ? (sio2 / al2o3).toFixed(2) : '—';

  const displaySampleName = sampleName.trim() ? sampleName.trim() : 'Исследуемый образец бентонита';

  // Paste suitability verdict
  const totalBallast = impurities.isSufficientData ? impurities.totalBallast : 0;
  const freeSand = sand ?? impurities.freeSiO2 ?? 0;
  const isPasteAllowed = totalBallast <= 18 && freeSand <= 3 && (iom.value >= 16 || !iom.isCalculable);

  // Smectite source description
  let smectiteSourceText = '✓ Смектит факт (ручной ввод в паспорт)';
  if (analysisResults.smectiteSource === 'cec_matrix') {
    const stdLabel =
      analysisResults.cecStandardUsed === 120
        ? 'Высокозарядный эталон, 120 мг-экв'
        : analysisResults.cecStandardUsed === 110
        ? 'Среднезарядный эталон, 110 мг-экв'
        : 'Низкозарядный эталон, 100 мг-экв';
    smectiteSourceText = `Смектит расчет из КОЕ (${stdLabel})`;
  } else if (analysisResults.smectiteSource === 'xrf_calc') {
    smectiteSourceText = 'Смектит расчетный по балансу РФА (100% − балласт)';
  }

  const container = createPdfContainer('pdf-report-render-target');

  const pageBaseStyle = `
    width: 794px;
    height: 1123px;
    box-sizing: border-box;
    padding: 24px 30px;
    background-color: #ffffff;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  `;

  // =========================================================================
  // PAGE 1: Header, Visual Identity, Physical Properties, Full XRF Table & Ratios
  // =========================================================================
  const page1 = document.createElement('div');
  page1.style.cssText = pageBaseStyle;
  page1.innerHTML = `
    <div>
      <!-- Page 1 Header -->
      <div style="border-bottom: 2.5px solid #b45309; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="font-size: 10px; font-weight: 800; color: #b45309; text-transform: uppercase; letter-spacing: 1px;">
            Паспорт испытаний и заключение о потенциале органомодификации
          </div>
          <h1 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 3px 0 0 0; line-height: 1.2;">
            ${displaySampleName}
          </h1>
          <div style="font-size: 10px; color: #475569; margin-top: 2px;">
            Тип сырья: <strong style="color: #0f172a;">${analysisResults.bentoniteTypeLabel}</strong> • Комплексный физико-химический анализ
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 9px; color: #64748b;">Дата формирования паспорта:</div>
          <div style="font-size: 10.5px; font-weight: 800; color: #0f172a;">${dateFormatted}, ${timeFormatted}</div>
          <div style="display: inline-block; font-size: 9px; font-weight: 700; background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 2px 7px; border-radius: 4px; margin-top: 3px;">
            ✓ Лабораторный расчет ISO / ГОСТ / API
          </div>
        </div>
      </div>

      <!-- Section 1 & 2: Visual and Physical Parameters -->
      <div style="display: grid; grid-template-columns: 240px 1fr; gap: 12px; margin-bottom: 12px;">
        <!-- Left: Photo / Color -->
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background-color: #f8fafc;">
          <div style="font-size: 11px; font-weight: 800; color: #1e293b; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">
            1. Внешний вид и цвет
          </div>
          ${
            photoUrl
              ? `<div style="width: 100%; height: 120px; border-radius: 6px; overflow: hidden; margin-bottom: 8px; border: 1px solid #cbd5e1;">
                   <img src="${photoUrl}" style="width: 100%; height: 100%; object-fit: cover; display: block;" alt="Фото" />
                 </div>`
              : `<div style="width: 100%; height: 80px; border-radius: 6px; background-color: ${colorInfo.sampleHex}; border: 1px solid #cbd5e1; margin-bottom: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #ffffff; text-shadow: 0 1px 3px rgba(0,0,0,0.8); font-size: 11px; font-weight: bold;">
                   <span>Эталон цвета образца</span>
                   <span style="font-size: 9px; font-family: monospace; opacity: 0.9;">${colorInfo.sampleHex}</span>
                 </div>`
          }
          <div style="font-size: 10px; line-height: 1.4; color: #334155;">
            <div><strong>Категория:</strong> ${colorInfo.name}</div>
            <div style="margin-top: 3px;"><strong>Вероятные примеси:</strong> ${colorInfo.probableImpurities}</div>
            <div style="margin-top: 3px;"><strong>Генезис месторождения:</strong> ${colorInfo.formationEnvironment}</div>
          </div>
        </div>

        <!-- Right: Physical-chemical Parameters -->
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background-color: #ffffff;">
          <div style="font-size: 11px; font-weight: 800; color: #1e293b; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; display: flex; justify-content: space-between;">
            <span>2. Физико-химические параметры образца</span>
            <span style="font-size: 9px; color: #64748b; font-weight: normal;">Базовые лабораторные замеры</span>
          </div>
          <table style="width: 100%; font-size: 10px; border-collapse: collapse; text-align: left;">
            <tbody>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 4px 0; color: #64748b;">${analysisResults.smectiteLabel}:</td>
                <td style="padding: 4px 0; font-weight: 800; color: #047857; text-align: right; font-size: 11px;">
                  ${analysisResults.effectiveSmectite}%
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 4px 0; color: #64748b;">Емкость катионного обмена (КОЕ):</td>
                <td style="padding: 4px 0; font-weight: 700; text-align: right; color: #0f172a;">
                  ${cec !== undefined ? `${cec} мг-экв / 100 г (эталон ${cecStandard})` : 'Не определено'}
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 4px 0; color: #64748b;">Показатель набухания:</td>
                <td style="padding: 4px 0; font-weight: 700; text-align: right; color: #0f172a;">
                  ${swellingIndex !== undefined ? `${swellingIndex} мл / 2 г` : 'Не определено'}
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 4px 0; color: #64748b;">Свободный песок (>44 мкм):</td>
                <td style="padding: 4px 0; font-weight: 700; text-align: right; color: #0f172a;">
                  ${sand !== undefined ? `${sand}%` : 'Не определено'}
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 4px 0; color: #64748b;">Содовая активация:</td>
                <td style="padding: 4px 0; font-weight: 700; text-align: right; color: #0f172a;">
                  ${activation ? `Да (введено ${sodaPercent ?? 0}% Na₂CO₃)` : 'Нет (естественная форма бентонита)'}
                </td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Реология 6% суспензии (API тест):</td>
                <td style="padding: 4px 0; font-weight: 700; text-align: right; color: #0f172a;">
                  ${
                    apiModel
                      ? `PV: ${apiModel.pv} сПз | YP: ${apiModel.yp} дфунт/100фт² (YP/PV = ${apiModel.ratio})`
                      : (apiTest.f600 !== undefined ? `ф600 = ${apiTest.f600}, ф300 = ${apiTest.f300}` : 'Не исследовано')
                  }
                </td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top: 6px; padding: 4px 8px; border-radius: 4px; background-color: #eff6ff; border: 1px solid #bfdbfe; font-size: 8.5px; color: #1e40af;">
            <strong>Источник данных смектита:</strong> ${smectiteSourceText}
          </div>
        </div>
      </div>

      <!-- Section 3: Comprehensive XRF Table -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background-color: #f8fafc; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          <span style="font-size: 11px; font-weight: 800; color: #1e293b;">
            3. Химический состав по данным рентгенофлуоресцентного анализа (РФА, масс. %)
          </span>
          <span style="font-size: 9.5px; color: #475569;">
            Сумма оксидов: <strong style="color: #0f172a;">${totalOxides.toFixed(2)}%</strong>
          </span>
        </div>

        <table style="width: 100%; font-size: 9.5px; border-collapse: collapse; text-align: center; margin-bottom: 8px;">
          <thead>
            <tr style="background-color: #e2e8f0; color: #334155;">
              ${ALL_OXIDE_KEYS.map((k) => `<th style="padding: 4px 3px; border: 1px solid #cbd5e1; font-weight: 700;">${k}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            <tr style="background-color: #ffffff;">
              ${ALL_OXIDE_KEYS.map(
                (k) =>
                  `<td style="padding: 5px 3px; border: 1px solid #cbd5e1; font-weight: ${
                    oxides[k] ? '700' : 'normal'
                  }; color: ${oxides[k] ? '#0f172a' : '#94a3b8'};">
                    ${oxides[k] !== undefined ? Number(oxides[k]).toFixed(2) : '0.00'}
                  </td>`
              ).join('')}
            </tr>
          </tbody>
        </table>

        <!-- Moduli & Stoichiometric Coefficients -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 9px;">
          <div>
            <span style="color: #64748b; font-size: 7.5px; display: block; text-transform: uppercase;">Модуль Na₂O / CaO:</span>
            <strong style="color: #0f172a; font-size: 11px;">${naCaRatio}</strong>
            <span style="color: #64748b; font-size: 7.5px; display: block;">${Number(naCaRatio) >= 1 ? 'Натриевый' : 'Кальциевый'}</span>
          </div>
          <div>
            <span style="color: #64748b; font-size: 7.5px; display: block; text-transform: uppercase;">Модуль SiO₂ / Fe₂O₃:</span>
            <strong style="color: #0f172a; font-size: 11px;">${siFeRatio}</strong>
            <span style="color: #64748b; font-size: 7.5px; display: block;">Кремне-железистый</span>
          </div>
          <div>
            <span style="color: #64748b; font-size: 7.5px; display: block; text-transform: uppercase;">Модуль SiO₂ / Al₂O₃:</span>
            <strong style="color: #0f172a; font-size: 11px;">${siAlRatio}</strong>
            <span style="color: #64748b; font-size: 7.5px; display: block;">Монтмориллонитовый</span>
          </div>
          <div>
            <span style="color: #64748b; font-size: 7.5px; display: block; text-transform: uppercase;">Фактор 100 / КОЕ:</span>
            <strong style="color: #0f172a; font-size: 11px;">${cec && cec > 0 ? (100 / cec).toFixed(2) : '—'}</strong>
            <span style="color: #64748b; font-size: 7.5px; display: block;">Обменная кратность</span>
          </div>
        </div>
      </div>

      <!-- Technological Notice -->
      <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; background-color: #f1f5f9;">
        <div style="font-size: 9.5px; color: #334155; line-height: 1.4;">
          <strong>Лабораторное примечание:</strong> Данные оксидного состава РФА приведены в пересчете на прокаленное вещество. Количественные соотношения модулей используются для стехиометрической оценки чистоты монтмориллонитовой решетки, вычисления индекса органомодифицируемости (ИОМ) и минералогического баланса фаз на последующих страницах отчета.
        </div>
      </div>
    </div>

    <!-- Page 1 Footer -->
    <div style="border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center;">
      <span>Комплексный анализ бентонита • Автономный паспорт качества сырья</span>
      <span style="font-weight: 700; color: #64748b;">Страница 1 из 4</span>
    </div>
  `;

  // =========================================================================
  // PAGE 2: Section 4 - Raw Bentonite Type, IOM Calculation, Mineral Impurities
  // =========================================================================
  const page2 = document.createElement('div');
  page2.style.cssText = pageBaseStyle;
  page2.innerHTML = `
    <div>
      <!-- Page 2 Header -->
      <div style="border-bottom: 2.5px solid #b45309; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="font-size: 10px; font-weight: 800; color: #b45309; text-transform: uppercase; letter-spacing: 1px;">
            Заключение о применимости (Раздел 4: Структурно-минералогический потенциал)
          </div>
          <h2 style="font-size: 17px; font-weight: 800; color: #0f172a; margin: 3px 0 0 0; line-height: 1.2;">
            Тип сырья, Индекс ОМ (ИОМ) и распределение балластных минералов
          </h2>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 9px; color: #64748b;">Образец:</div>
          <div style="font-size: 10.5px; font-weight: 800; color: #0f172a;">${displaySampleName}</div>
        </div>
      </div>

      <!-- 4.1. Card: Bentonite Type -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background-color: #f8fafc; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <div style="font-size: 11px; font-weight: 800; color: #b45309; text-transform: uppercase;">
            4.1. Тип бентонита и обменный катионный комплекс
          </div>
          <div style="font-size: 9.5px; font-weight: 700; color: #0f172a; background-color: #e2e8f0; padding: 2px 7px; border-radius: 4px;">
            Модуль Na₂O / CaO: <strong>${naCaRatio}</strong>
          </div>
        </div>
        <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 3px;">
          ${analysisResults.bentoniteTypeLabel}
        </div>
        <div style="font-size: 10px; line-height: 1.4; color: #334155;">
          ${analysisResults.bentoniteTypeDescription}
        </div>
      </div>

      <!-- 4.2. Card: IOM Index Calculation -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background-color: #ffffff; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
          <div style="font-size: 11px; font-weight: 800; color: #b45309; text-transform: uppercase;">
            4.2. Индекс органомодифицируемости (ИОМ)
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 15px; font-weight: 800; color: #b45309; font-family: monospace;">
              ИОМ = ${iom.isCalculable ? iom.value.toFixed(1) : '—'}
            </span>
            <span style="font-size: 9.5px; font-weight: 800; padding: 2.5px 8px; border-radius: 4px; background-color: ${
              iom.rating === 'excellent'
                ? '#dcfce7; color: #166534;'
                : iom.rating === 'good'
                ? '#dbeafe; color: #1e40af;'
                : iom.rating === 'acceptable'
                ? '#fef3c7; color: #92400e;'
                : '#fee2e2; color: #991b1b;'
            }">
              ${iom.ratingLabel}
            </span>
          </div>
        </div>

        <div style="font-size: 10px; color: #1e293b; font-weight: 700; margin-bottom: 4px;">
          ${iom.ratingLabel}
        </div>

        <!-- Formula and Multipliers Table -->
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; margin-bottom: 6px;">
          <div style="font-size: 9.5px; color: #334155; margin-bottom: 4px;">
            <strong>Формула расчета:</strong> ИОМ = (Na₂O / CaO) × (SiO₂ / Fe₂O₃) × (100 / КОЕ)
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; font-size: 9px; text-align: center;">
            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 3px; border-radius: 4px;">
              <span style="color: #64748b; font-size: 8px; display: block;">Множитель Na₂O/CaO:</span>
              <strong style="color: #0f172a; font-size: 10.5px;">${iom.multNaCa.toFixed(2)}</strong>
            </div>
            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 3px; border-radius: 4px;">
              <span style="color: #64748b; font-size: 8px; display: block;">Множитель SiO₂/Fe₂O₃:</span>
              <strong style="color: #0f172a; font-size: 10.5px;">${iom.multSiFe.toFixed(2)}</strong>
            </div>
            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 3px; border-radius: 4px;">
              <span style="color: #64748b; font-size: 8px; display: block;">Множитель 100/КОЕ:</span>
              <strong style="color: #0f172a; font-size: 10.5px;">${iom.multCec.toFixed(2)}</strong>
            </div>
          </div>
        </div>

        <div style="font-size: 9px; color: #475569; line-height: 1.35;">
          <strong>Порог технологической пригодности:</strong> ИОМ ≥ 16.0 гарантирует эффективную интеркаляцию четвертичных аммониевых солей (ЧАС), устойчивое расширение межслоевого пространства d(001) до 28–36 Å и образование стабильных тиксотропных гелей в органических средах.
        </div>
      </div>

      <!-- 4.3. Card: Impurities & Smectite Phase Distribution -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background-color: #ffffff;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div style="font-size: 11px; font-weight: 800; color: #b45309; text-transform: uppercase;">
            4.3. Минералогический баланс балластных фаз и смектита
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 10px; color: #64748b;">
              Балласт (РФА): <strong style="color: #0f172a;">${impurities.isSufficientData ? `${impurities.totalBallast}%` : '—'}</strong>
            </span>
            <span style="font-size: 10px; color: #64748b;">
              ${analysisResults.smectiteLabel}: <strong style="color: #047857; font-size: 12px;">${analysisResults.effectiveSmectite}%</strong>
            </span>
          </div>
        </div>

        <!-- 4 Mineral Phase Boxes -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; font-size: 9px; margin-bottom: 8px;">
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 5px; border-radius: 5px; text-align: center;">
            <div style="color: #64748b; font-size: 8px;">Свободный кварц (SiO₂):</div>
            <div style="font-weight: 800; font-size: 12px; color: #0f172a; margin-top: 1px;">${impurities.freeSiO2}%</div>
            <div style="color: #64748b; font-size: 7.5px;">Абразивный балласт</div>
          </div>
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 5px; border-radius: 5px; text-align: center;">
            <div style="color: #64748b; font-size: 8px;">Кальцит (мел CaCO₃):</div>
            <div style="font-weight: 800; font-size: 12px; color: #0f172a; margin-top: 1px;">${impurities.calciteCaCO3}%</div>
            <div style="color: #64748b; font-size: 7.5px;">Карбонатная фаза</div>
          </div>
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 5px; border-radius: 5px; text-align: center;">
            <div style="color: #64748b; font-size: 8px;">Шпаты и слюды:</div>
            <div style="font-weight: 800; font-size: 12px; color: #0f172a; margin-top: 1px;">${impurities.orthoclase}%</div>
            <div style="color: #64748b; font-size: 7.5px;">Полевошпатовый балласт</div>
          </div>
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 5px; border-radius: 5px; text-align: center;">
            <div style="color: #64748b; font-size: 8px;">Железистый балласт:</div>
            <div style="font-weight: 800; font-size: 12px; color: #0f172a; margin-top: 1px;">${impurities.ironBallast}%</div>
            <div style="color: #64748b; font-size: 7.5px;">Гетит / гематит / сидерит</div>
          </div>
        </div>

        <!-- Manufacturing Method Verdicts -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 9.5px;">
          <div style="border: 1px solid ${isPasteAllowed ? '#a7f3d0' : '#fecaca'}; background-color: ${isPasteAllowed ? '#f0fdf4' : '#fef2f2'}; padding: 6px 8px; border-radius: 5px;">
            <div style="font-weight: 800; color: ${isPasteAllowed ? '#047857' : '#b91c1c'}; margin-bottom: 2px;">
              ${isPasteAllowed ? '✓ Метод пластической пасты: ГОДЕН' : '✗ Метод пластической пасты: НЕ ДОПУСТИМ'}
            </div>
            <div style="color: #334155; line-height: 1.3; font-size: 8.5px;">
              ${
                isPasteAllowed
                  ? 'Содержание балласта ≤ 18% и свободного кварца ≤ 3% допускают реакцию модификации в шнековом экструдере (влажность 25–35%) без абразивного износа оборудования.'
                  : `Балласт (${totalBallast}%) или кварц (${freeSand}%) превышают технологические нормы экструзии, что приведет к перегрузке редуктора и снижению диспергируемости.`
              }
            </div>
          </div>

          <div style="border: 1px solid #a7f3d0; background-color: #f0fdf4; padding: 6px 8px; border-radius: 5px;">
            <div style="font-weight: 800; color: #047857; margin-bottom: 2px;">
              ✓ Водно-суспензионная схема: РЕКОМЕНДОВАНА
            </div>
            <div style="color: #334155; line-height: 1.3; font-size: 8.5px;">
              Гидродиспергирование (10–12% концентрации) с обогащением в батарее гидроциклонов полностью удаляет кварцевый и карбонатный шлам до модификации ЧАС.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Page 2 Footer -->
    <div style="border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center;">
      <span>Комплексный анализ бентонита • Структурно-минералогический потенциал</span>
      <span style="font-weight: 700; color: #64748b;">Страница 2 из 4</span>
    </div>
  `;

  // =========================================================================
  // PAGE 3: Section 4 Continued (4.4 API Model, 4.5 Color Interpretation, 4.6 Milling)
  // =========================================================================
  const page3 = document.createElement('div');
  page3.style.cssText = pageBaseStyle;
  page3.innerHTML = `
    <div>
      <!-- Page 3 Header -->
      <div style="border-bottom: 2.5px solid #b45309; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="font-size: 10px; font-weight: 800; color: #b45309; text-transform: uppercase; letter-spacing: 1px;">
            Заключение о применимости (Раздел 4: Реология, Оптические свойства и Дисперсность)
          </div>
          <h2 style="font-size: 17px; font-weight: 800; color: #0f172a; margin: 3px 0 0 0; line-height: 1.2;">
            Реологическая модель API, фазы железа и регламент помола
          </h2>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 9px; color: #64748b;">Образец:</div>
          <div style="font-size: 10.5px; font-weight: 800; color: #0f172a;">${displaySampleName}</div>
        </div>
      </div>

      <!-- 4.4. Card: API Rheology Model -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background-color: #ffffff; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          <div style="font-size: 11px; font-weight: 800; color: #b45309; text-transform: uppercase;">
            4.4. Реологическая модель API и эффективность активации
          </div>
          ${
            apiModel?.suitabilitySummary
              ? `<span style="font-size: 9.5px; font-weight: 700; padding: 2px 8px; border-radius: 4px; background-color: ${
                  apiModel.model === 'non_treated'
                    ? '#dcfce7; color: #166534;'
                    : apiModel.model === 'drilling_grade'
                    ? '#dbeafe; color: #1e40af;'
                    : apiModel.model === 'ocma'
                    ? '#fef3c7; color: #92400e;'
                    : apiModel.model === 'marginal_ocma'
                    ? '#ffedd5; color: #9a3412;'
                    : '#f1f5f9; color: #334155;'
                }">
                  ${apiModel.suitabilitySummary}
                </span>`
              : ''
          }
        </div>

        ${
          apiModel
            ? `
              <div style="margin-bottom: 6px;">
                <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 3px;">
                  ${apiModel.label}
                </div>
                <div style="font-size: 10px; line-height: 1.4; color: #334155; margin-bottom: 6px;">
                  ${apiModel.description}
                </div>
              </div>

              ${
                apiModel.recommendation
                  ? `
                    <div style="font-size: 9.5px; line-height: 1.35; color: #78350f; background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 6px 10px; margin-bottom: 8px;">
                      <strong>💡 Рекомендация технолога:</strong> ${apiModel.recommendation}
                    </div>
                  `
                  : ''
              }

              <div style="display: flex; justify-content: space-between; align-items: center; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; font-size: 10px;">
                <div style="font-family: monospace; color: #0f172a;">
                  PV: <strong>${apiModel.pv} сПз</strong> | YP: <strong>${apiModel.yp} дфунт/100фт²</strong> | YP/PV: <strong style="color: #b45309; font-size: 11.5px;">${apiModel.ratio}</strong>
                </div>
                <div style="font-size: 9px; color: #64748b;">
                  ${
                    apiModel.ratio <= 1.5
                      ? '🎯 Идеал: YP/PV ≤ 1.5 (Non-treated сорт)'
                      : apiModel.ratio <= 3.0
                      ? '✓ Drilling grade: YP/PV ≤ 3.0'
                      : apiModel.ratio <= 6.0
                      ? '⚠️ OCMA grade: YP/PV 3.0–6.0'
                      : '⚠️ Среднесортная ОГ: YP/PV 6.0–8.0'
                  }
                </div>
              </div>
            `
            : `
              <div style="font-size: 10px; color: #64748b; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px;">
                Активация содой не отмечена либо не введены показания вискозиметра (ф600 и ф300). Для автоматического расчета реологии API введите данные измерений.
              </div>
            `
        }
      </div>

      <!-- 4.5. Card: Color Diagnostics & Iron Speciation -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background-color: #ffffff; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          <div style="font-size: 11px; font-weight: 800; color: #b45309; text-transform: uppercase;">
            4.5. Диагностика цвета и распределение форм железа (Fe)
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="display: inline-block; width: 14px; height: 14px; border-radius: 3px; background-color: ${colorInfo.sampleHex}; border: 1px solid #94a3b8;"></span>
            <span style="font-size: 9.5px; font-weight: 700; color: #475569;">${colorInfo.name} (${colorInfo.sampleHex})</span>
          </div>
        </div>

        <div style="font-size: 10px; line-height: 1.4; color: #334155; margin-bottom: 6px;">
          <div><strong>Диагностика примесей:</strong> ${colorInfo.probableImpurities}</div>
          <div style="margin-top: 2px;"><strong>Среда и фации осадконакопления:</strong> ${colorInfo.formationEnvironment}</div>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; font-size: 9.5px; line-height: 1.35; color: #334155; margin-bottom: 8px;">
          <strong style="color: #0f172a;">Формы нахождения Fe и термическая стойкость:</strong> ${colorInfo.ironStatusDescription}
        </div>

        ${
          impurities.ironTotal > 0
            ? `
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; font-size: 9.5px; text-align: center;">
                <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 5px; border-radius: 5px;">
                  <div style="color: #64748b; font-size: 8px;">Всего Fe₂O₃ (РФА):</div>
                  <div style="font-weight: 800; font-size: 11px; color: #0f172a;">${impurities.ironTotal}%</div>
                </div>
                <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 5px; border-radius: 5px;">
                  <div style="color: #64748b; font-size: 8px;">Структурное Fe в октаэдрах:</div>
                  <div style="font-weight: 800; font-size: 11px; color: #047857;">${impurities.ironStructural}%</div>
                </div>
                <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 5px; border-radius: 5px;">
                  <div style="color: #64748b; font-size: 8px;">Свободный железистый балласт:</div>
                  <div style="font-weight: 800; font-size: 11px; color: #b45309;">${impurities.ironBallast}%</div>
                </div>
              </div>
            `
            : ''
        }
      </div>

      <!-- 4.6. Technological Milling & Particle Distribution Requirements -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background-color: #ffffff;">
        <div style="font-size: 11px; font-weight: 800; color: #b45309; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          4.6. Технологические требования к помолу и гранулометрии ОГ
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 9.5px; line-height: 1.4; color: #334155;">
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 10px; border-radius: 6px;">
            <strong style="color: #0f172a; display: block; margin-bottom: 3px; font-size: 10px;">ЛКМ, гелькоуты и композиты (D50 ≤ 5–8 мкм):</strong>
            Для исключения эффекта полошения и получения высокоглянцевых покрытий требуется струйный или воздухоструйный помол с динамическим воздушным классификатором (порог D99 ≤ 15–20 мкм, остаток на сите 44 мкм < 0.1%). Температура помола строго ограничивается ≤ 60–70 °C во избежание термической деструкции привитого ЧАС.
          </div>
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 10px; border-radius: 6px;">
            <strong style="color: #0f172a; display: block; margin-bottom: 3px; font-size: 10px;">Буровые растворы (РУО) и смазки (D50 ≤ 20–30 мкм):</strong>
            Оптимален механический роторно-вихревой или трибокинетический помол. Технические требования: остаток на контрольном сите 200 меш (74 мкм) ≤ 1.0–1.5%. Обеспечивает мгновенный роспуск в углеводородных средах под сдвиговыми усилиями буровых насосов.
          </div>
        </div>
      </div>
    </div>

    <!-- Page 3 Footer -->
    <div style="border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center;">
      <span>Комплексный анализ бентонита • Реология, цвет и микронизация</span>
      <span style="font-weight: 700; color: #64748b;">Страница 3 из 4</span>
    </div>
  `;

  // =========================================================================
  // PAGE 4: Section 4.7 Industrial Application Matrix (All 8 Industries without cutoffs)
  // =========================================================================
  const page4 = document.createElement('div');
  page4.style.cssText = pageBaseStyle;
  page4.innerHTML = `
    <div>
      <!-- Page 4 Header -->
      <div style="border-bottom: 2.5px solid #b45309; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="font-size: 10px; font-weight: 800; color: #b45309; text-transform: uppercase; letter-spacing: 1px;">
            Заключение о применимости (Раздел 4.7: Отраслевой реестр органоглин)
          </div>
          <h2 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 3px 0 0 0; line-height: 1.2;">
            Оценка пригодности базового бентонита по 8 сферам производства ОГ
          </h2>
          <div style="font-size: 10px; color: #475569; margin-top: 2px;">
            Полное соответствие: <strong style="color: #047857;">${analysisResults.suitableIndustries.length}</strong> • Ограниченно (1-2 п.): <strong style="color: #b45309;">${analysisResults.limitedIndustries.length}</strong> • Не проходит: <strong style="color: #64748b;">${analysisResults.allIndustries.length - analysisResults.applicableIndustries.length}</strong> из 8 направлений
          </div>
        </div>
        <div style="text-align: right;">
          <div style="display: inline-block; font-size: 9.5px; font-weight: 800; background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 2px 8px; border-radius: 4px;">
            Применимо всего: ${analysisResults.applicableIndustries.length} из 8
          </div>
        </div>
      </div>

      <!-- 8 Industries Grid: 2 Columns of 4 Cards each (Spacious, Complete, Zero Clipping) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-bottom: 8px;">
        ${analysisResults.allIndustries
          .map((ind) => {
            const isOk = ind.isSuitable;
            const isLimited = ind.isLimited;
            const borderCol = isOk ? '#a7f3d0' : isLimited ? '#fde68a' : '#e2e8f0';
            const bgCol = isOk ? '#f0fdf4' : isLimited ? '#fefce8' : '#f8fafc';
            const badgeBg = isOk ? '#dcfce7' : isLimited ? '#fef3c7' : '#fee2e2';
            const badgeText = isOk ? '#15803d' : isLimited ? '#92400e' : '#b91c1c';
            const badgeLabel = isOk ? '✓ 100% Норма' : isLimited ? `⚠️ Ограниченно (${ind.failCount} п.)` : `✗ Не проходит (${ind.failCount} п.)`;

            return `
              <div style="border: 1px solid ${borderCol}; background-color: ${bgCol}; border-radius: 6px; padding: 6px 8px; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 3px;">
                    <div style="display: flex; align-items: center; gap: 5px;">
                      <span style="font-family: monospace; font-size: 9.5px; font-weight: 800; background-color: ${
                        isOk ? '#dcfce7' : isLimited ? '#fef3c7' : '#e2e8f0'
                      }; color: #0f172a; padding: 1px 5px; border-radius: 3px;">
                        ${ind.code}
                      </span>
                      <strong style="font-size: 9.5px; color: #0f172a; line-height: 1.2;">${ind.name}</strong>
                    </div>
                    <span style="font-size: 8px; font-weight: 800; padding: 1px 6px; border-radius: 3px; background-color: ${badgeBg}; color: ${badgeText}; shrink-0; margin-left: 4px;">
                      ${badgeLabel}
                    </span>
                  </div>

                  <div style="font-size: 8px; color: #64748b; margin-bottom: 3px;">
                    Сектор: <strong>${ind.category}</strong>
                  </div>

                  <!-- Full Conditions without Abbreviations -->
                  <div style="font-size: 8px; line-height: 1.25; margin-bottom: 3px;">
                    ${
                      ind.reasonsPass.length > 0
                        ? `<div style="color: #15803d; margin-bottom: 1.5px;">
                             ✓ <strong>Выполнено:</strong> ${ind.reasonsPass.join('; ')}
                           </div>`
                        : ''
                    }
                    ${
                      ind.reasonsFail.length > 0
                        ? `<div style="color: ${isLimited ? '#b45309' : '#b91c1c'}; font-weight: 600;">
                             ${isLimited ? '⚠️' : '✗'} <strong>Замечания:</strong> ${ind.reasonsFail.join('; ')}
                           </div>`
                        : ''
                    }
                  </div>
                </div>

                <!-- Parameters summary bar -->
                <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 4px; font-size: 7.5px; color: #334155; border-top: 1px dashed ${
                  isOk ? '#bbf7d0' : isLimited ? '#fde68a' : '#cbd5e1'
                }; padding-top: 2.5px; margin-top: 2px;">
                  <div><span style="color: #64748b;">Среда:</span> <strong>${ind.targetMedium}</strong></div>
                  <div><span style="color: #64748b;">Гель:</span> ${ind.gelAppearance.split('.')[0]}</div>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>

      <!-- Concluding Laboratory Statement and Signatures Block -->
      <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; background-color: #ffffff; margin-bottom: 4px;">
        <div style="font-size: 8.5px; color: #334155; line-height: 1.35; margin-bottom: 6px;">
          <strong>Итоговое лабораторное заключение:</strong> Базовый бентонит исследован по алгоритму многофакторного анализа (стехиометрия оксидов РФА, фазовый состав железа, емкость катионного обмена КОЕ и реология суспензии API). Расчеты верифицированы согласно отраслевым нормативам производства органоглин.
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; font-size: 8.5px; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 5px;">
          <div>
            <span>Руководитель испытаний:</span>
            <div style="margin-top: 10px; border-bottom: 1px dotted #94a3b8; width: 85%;"></div>
          </div>
          <div>
            <span>Ведущий технолог ОГ:</span>
            <div style="margin-top: 10px; border-bottom: 1px dotted #94a3b8; width: 85%;"></div>
          </div>
          <div style="text-align: right;">
            <span>М.П. / Штамп лаборатории:</span>
            <div style="font-size: 7.5px; color: #94a3b8; margin-top: 8px;">Действительно без исправлений</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Page 4 Footer -->
    <div style="border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center;">
      <span>Комплексный анализ бентонита • Отраслевой реестр применения ОГ</span>
      <span style="font-weight: 700; color: #64748b;">Страница 4 из 4</span>
    </div>
  `;

  container.appendChild(page1);
  container.appendChild(page2);
  container.appendChild(page3);
  container.appendChild(page4);
  document.body.appendChild(container);

  try {
    // Render 4 pages sequentially to high-DPI canvases
    const canvas1 = await renderPageToCanvas(page1);
    const canvas2 = await renderPageToCanvas(page2);
    const canvas3 = await renderPageToCanvas(page3);
    const canvas4 = await renderPageToCanvas(page4);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    // Add Page 1
    const imgData1 = canvas1.toDataURL('image/png');
    pdf.addImage(imgData1, 'PNG', 0, 0, 210, 297, undefined, 'SLOW');

    // Add Page 2
    pdf.addPage();
    const imgData2 = canvas2.toDataURL('image/png');
    pdf.addImage(imgData2, 'PNG', 0, 0, 210, 297, undefined, 'SLOW');

    // Add Page 3
    pdf.addPage();
    const imgData3 = canvas3.toDataURL('image/png');
    pdf.addImage(imgData3, 'PNG', 0, 0, 210, 297, undefined, 'SLOW');

    // Add Page 4
    pdf.addPage();
    const imgData4 = canvas4.toDataURL('image/png');
    pdf.addImage(imgData4, 'PNG', 0, 0, 210, 297, undefined, 'SLOW');

    const sanitizedName = (sampleName.trim() || 'Бентонит_Паспорт')
      .replace(/[\/\\?%*:|"<>]/g, '_')
      .replace(/\s+/g, '_');
    const filename = `${sanitizedName}_Паспорт_Лаб_${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.pdf`;

    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Generates and triggers download of an executive 1-page A4 summary passport.
 * Engineered to fit 100% on a single sheet of A4 without any overflow, clipping, or blurring.
 */
export async function generateBentoniteOnePagePdfReport(payload: PdfReportPayload): Promise<void> {
  const {
    sampleName,
    colorId,
    oxides,
    swellingIndex,
    cec,
    cecStandard = 120,
    sand,
    activation,
    sodaPercent,
    apiTest,
    analysisResults,
  } = payload;

  const now = new Date();
  const dateFormatted = `${String(now.getDate()).padStart(2, '0')}.${String(
    now.getMonth() + 1
  ).padStart(2, '0')}.${now.getFullYear()}`;
  const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  const selectedColor =
    BENTONITE_COLORS.find((c) => c.id === colorId) || BENTONITE_COLORS[0];
  const displaySampleName = sampleName.trim() || 'Исследуемый образец';

  const {
    bentoniteTypeLabel,
    bentoniteTypeDescription,
    iom,
    impurities,
    apiModel,
  } = analysisResults;

  // Smectite source description
  let smectiteSourceText = '✓ Смектит факт';
  if (analysisResults.smectiteSource === 'cec_matrix') {
    smectiteSourceText = `КОЕ (${analysisResults.cecStandardUsed || cecStandard} мг-экв)`;
  } else if (analysisResults.smectiteSource === 'xrf_calc') {
    smectiteSourceText = 'РФА баланс';
  }

  // Processing paste/slurry decision
  const totalBallast = impurities.isSufficientData ? impurities.totalBallast : 0;
  const freeSand = sand ?? impurities.freeSiO2 ?? 0;
  const isPasteAllowed = totalBallast <= 18 && freeSand <= 3 && (iom.value >= 16 || !iom.isCalculable);

  // Oxide sums and ratios
  const totalOxides = Object.values(oxides).reduce((acc, v) => acc + (v || 0), 0);
  const na2o = oxides.Na2O ?? 0;
  const cao = oxides.CaO ?? 0;
  const sio2 = oxides.SiO2 ?? 0;
  const fe2o3 = oxides.Fe2O3 ?? 0;
  const naCaRatio = cao > 0 ? (na2o / cao).toFixed(2) : '—';
  const siFeRatio = fe2o3 > 0 ? (sio2 / fe2o3).toFixed(2) : '—';

  const container = createPdfContainer('pdf-1page-report-render-target');

  const page = document.createElement('div');
  page.style.width = '794px';
  page.style.height = '1123px';
  page.style.boxSizing = 'border-box';
  page.style.padding = '18px 22px';
  page.style.backgroundColor = '#ffffff';
  page.style.color = '#0f172a';
  page.style.display = 'flex';
  page.style.flexDirection = 'column';
  page.style.justifyContent = 'space-between';

  page.innerHTML = `
    <div>
      <!-- 1. Compact Header -->
      <div style="border-bottom: 2px solid #b45309; padding-bottom: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; background-color: #fef3c7; color: #92400e; padding: 1.5px 6px; border-radius: 3px; border: 1px solid #fde68a; letter-spacing: 0.5px;">
              ЭКСПРЕСС-ПАСПОРТ • 1 СТРАНИЦА А4
            </span>
            <span style="font-size: 8px; color: #64748b;">Лабораторный комплекс оценки органомодификации</span>
          </div>
          <h1 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 3px 0 0 0; line-height: 1.2;">
            ${displaySampleName}
          </h1>
          <div style="font-size: 9px; color: #475569; margin-top: 1px;">
            Оценка пригодности базового бентонита для производства органоглин (ОГ)
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 9px; font-weight: 800; color: #0f172a;">${dateFormatted} • ${timeFormatted}</div>
          <div style="display: inline-flex; align-items: center; gap: 4px; margin-top: 2px; padding: 2px 7px; border-radius: 4px; border: 1px solid #cbd5e1; background-color: #f8fafc;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${selectedColor.sampleHex}; border: 1px solid rgba(0,0,0,0.2);"></span>
            <span style="font-size: 8.5px; font-weight: 700; color: #0f172a;">${selectedColor.shortName || selectedColor.name}</span>
          </div>
        </div>
      </div>

      <!-- 2. Bento 4 Top Metric Cards -->
      <div style="display: grid; grid-template-columns: 1.2fr 1fr 1.3fr 1.1fr; gap: 6px; margin-bottom: 8px;">
        <!-- Card 1: Type -->
        <div style="border: 1px solid #e2e8f0; border-radius: 5px; padding: 6px 8px; background-color: #f8fafc;">
          <div style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase;">1. Тип сырья (ОГ)</div>
          <div style="font-size: 11px; font-weight: 800; color: #0f172a; margin-top: 1px; line-height: 1.2;">
            ${bentoniteTypeLabel}
          </div>
          <div style="font-size: 8px; color: #475569; margin-top: 2px; line-height: 1.2;">
            ${bentoniteTypeDescription.split('.')[0]}
          </div>
        </div>

        <!-- Card 2: IOM -->
        <div style="border: 1px solid #e2e8f0; border-radius: 5px; padding: 6px 8px; background-color: #f8fafc;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase;">2. Индекс ОМ</span>
            <span style="font-size: 7.5px; font-weight: 800; padding: 1px 5px; border-radius: 3px; background-color: ${
              iom.rating === 'excellent'
                ? '#dcfce7; color: #166534;'
                : iom.rating === 'good'
                ? '#dbeafe; color: #1e40af;'
                : iom.rating === 'acceptable'
                ? '#fef3c7; color: #92400e;'
                : '#fee2e2; color: #991b1b;'
            }">
              ${iom.ratingLabel}
            </span>
          </div>
          <div style="font-size: 14px; font-weight: 800; color: #b45309; margin-top: 1px;">
            ${iom.isCalculable ? iom.value.toFixed(1) : '—'}
          </div>
          <div style="font-size: 7.5px; color: #64748b; margin-top: 1px;">
            M(Na/Ca): ${iom.multNaCa.toFixed(2)} • M(Si/Fe): ${iom.multSiFe.toFixed(2)} • M(КОЕ): ${iom.multCec.toFixed(2)}
          </div>
        </div>

        <!-- Card 3: Impurities & Smectite -->
        <div style="border: 1px solid #e2e8f0; border-radius: 5px; padding: 6px 8px; background-color: #f8fafc;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase;">3. Примеси и смектит</span>
            <span style="font-size: 7.5px; font-weight: 800; padding: 1px 4px; border-radius: 3px; background-color: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe;">
              ${smectiteSourceText}
            </span>
          </div>
          <div style="display: flex; align-items: baseline; gap: 8px; margin-top: 1px;">
            <div>
              <span style="font-size: 7.5px; color: #64748b;">${analysisResults.smectiteLabel}:</span>
              <span style="font-size: 13px; font-weight: 800; color: #047857;">${analysisResults.effectiveSmectite}%</span>
            </div>
            <div>
              <span style="font-size: 7.5px; color: #64748b;">Балласт:</span>
              <span style="font-size: 11px; font-weight: 800; color: #0f172a;">${impurities.isSufficientData ? `${impurities.totalBallast}%` : '—'}</span>
            </div>
          </div>
          <div style="font-size: 7.5px; color: #475569; margin-top: 1px;">
            Кварц: ${impurities.freeSiO2}% • Мел: ${impurities.calciteCaCO3}% • Шпаты: ${impurities.orthoclase}% • Fe: ${impurities.ironBallast}%
          </div>
        </div>

        <!-- Card 4: Rheology -->
        <div style="border: 1px solid #e2e8f0; border-radius: 5px; padding: 6px 8px; background-color: #f8fafc;">
          <div style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase;">4. Реология API (6%)</div>
          <div style="display: flex; align-items: baseline; gap: 6px; margin-top: 1px;">
            <div>
              <span style="font-size: 7.5px; color: #64748b;">PV:</span>
              <span style="font-size: 11px; font-weight: 800; color: #0f172a;">${apiModel?.pv !== undefined ? `${apiModel.pv} сП` : '—'}</span>
            </div>
            <div>
              <span style="font-size: 7.5px; color: #64748b;">YP:</span>
              <span style="font-size: 11px; font-weight: 800; color: #0f172a;">${apiModel?.yp !== undefined ? `${apiModel.yp} lb` : '—'}</span>
            </div>
            <div>
              <span style="font-size: 7.5px; color: #64748b;">YP/PV:</span>
              <span style="font-size: 11px; font-weight: 800; color: #b45309;">${apiModel?.ratio !== undefined ? `${apiModel.ratio}` : '—'}</span>
            </div>
          </div>
          <div style="font-size: 7.5px; color: #475569; margin-top: 1px;">
            ${apiModel ? apiModel.label : (apiTest.f600 !== undefined ? `ф600: ${apiTest.f600}, ф300: ${apiTest.f300}` : 'Естественная реология')}
          </div>
        </div>
      </div>

      <!-- 3. Two Columns: Oxides (Left) & Color / Tech Rules (Right) -->
      <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 8px; margin-bottom: 8px;">
        <!-- Left: Oxides Table & Physical Moduli -->
        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; background-color: #ffffff;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="font-size: 8.5px; text-transform: uppercase; color: #1e293b; letter-spacing: 0.5px;">
              Химический состав (РФА оксиды, масс. %)
            </strong>
            <span style="font-size: 8px; color: #64748b;">Сумма: <strong style="color: #0f172a;">${totalOxides.toFixed(2)}%</strong></span>
          </div>

          <!-- Dense oxide chips -->
          <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 3px; font-size: 8px; margin-bottom: 5px;">
            ${ALL_OXIDE_KEYS.map((k) => `
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 3px; padding: 2px; text-align: center;">
                <span style="color: #64748b; font-size: 7px; display: block;">${k}</span>
                <strong style="color: #0f172a;">${oxides[k] !== undefined ? Number(oxides[k]).toFixed(2) : '0.00'}</strong>
              </div>
            `).join('')}
          </div>

          <!-- Moduli Ratios & Physical properties -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; padding-top: 4px; border-top: 1px dashed #cbd5e1; font-size: 8px;">
            <div>
              <span style="color: #64748b; font-size: 7px; display: block;">Na₂O / CaO:</span>
              <strong style="color: #0f172a;">${naCaRatio}</strong>
            </div>
            <div>
              <span style="color: #64748b; font-size: 7px; display: block;">SiO₂ / Fe₂O₃:</span>
              <strong style="color: #0f172a;">${siFeRatio}</strong>
            </div>
            <div>
              <span style="color: #64748b; font-size: 7px; display: block;">КОЕ (мг-экв):</span>
              <strong style="color: #0f172a;">${cec !== undefined ? `${cec}` : '—'}</strong>
            </div>
            <div>
              <span style="color: #64748b; font-size: 7px; display: block;">Набухание:</span>
              <strong style="color: #0f172a;">${swellingIndex !== undefined ? `${swellingIndex} мл` : '—'}</strong>
            </div>
          </div>
        </div>

        <!-- Right: Color & Manufacturing Tech Rules -->
        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; background-color: #ffffff; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
              <strong style="font-size: 8.5px; text-transform: uppercase; color: #1e293b; letter-spacing: 0.5px;">
                Цвет и хромофоры железа
              </strong>
              <span style="font-size: 7.5px; color: ${selectedColor.id === 'white_light_gray' ? '#15803d' : '#b45309'}; font-weight: 800;">
                ${selectedColor.id === 'white_light_gray' ? '✓ Светлый базовый' : 'Окрашенный'}
              </span>
            </div>
            <div style="font-size: 8px; color: #475569; line-height: 1.3;">
              Fe₂O₃ общ: <strong>${(oxides.Fe2O3 || 0).toFixed(2)}%</strong> • Структурное Fe: <strong>${impurities.ironStructural.toFixed(2)}%</strong> • Fe-балласт: <strong>${impurities.ironFree.toFixed(2)}%</strong>
            </div>
          </div>

          <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #cbd5e1;">
            <strong style="font-size: 8.5px; text-transform: uppercase; color: #1e293b; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">
              Техрегламент производства ОГ
            </strong>
            <div style="font-size: 8px; color: #334155; line-height: 1.35;">
              Синтез: <strong style="color: ${isPasteAllowed ? '#047857' : '#b45309'};">${isPasteAllowed ? 'Паста (влажность 25–35%)' : 'Суспензия (мокрая схема)'}</strong>
              <br/>
              Помол: <strong>95–98% < 74 мкм (200 mesh)</strong> • Песок: <strong>${freeSand}%</strong> ${freeSand > 3 ? '(гидроциклон!)' : '(в норме)'}
              ${activation ? `<br/>Сода: <strong>${sodaPercent ?? 2}% Na₂CO₃</strong>` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- 4. Industry Applicability Matrix (All 8 Industries without truncations) -->
      <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; background-color: #ffffff; margin-bottom: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">
          <div>
            <span style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #b45309; letter-spacing: 0.5px;">
              РЕЕСТР ПРИМЕНИМОСТИ ПО 8 ОТРАСЛЯМ ПРОИЗВОДСТВА ОРГАНОГЛИН (ОГ)
            </span>
            <span style="font-size: 8px; color: #64748b; margin-left: 6px;">
              100% норма: <strong style="color: #047857;">${analysisResults.suitableIndustries.length}</strong> • Ограниченно (1-2 п.): <strong style="color: #b45309;">${analysisResults.limitedIndustries.length}</strong> • Не проходит: <strong style="color: #64748b;">${analysisResults.allIndustries.length - analysisResults.applicableIndustries.length}</strong>
            </span>
          </div>
          <div style="font-size: 8px; font-weight: 800; color: #047857; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 1.5px 6px; border-radius: 3px;">
            Применимо: ${analysisResults.applicableIndustries.length} из 8
          </div>
        </div>

        <!-- 8 Industries Grid: 2 Columns of 4 Items -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
          ${analysisResults.allIndustries
            .map((ind) => {
              const isOk = ind.isSuitable;
              const isLimited = ind.isLimited;
              const borderCol = isOk ? '#a7f3d0' : isLimited ? '#fde68a' : '#e2e8f0';
              const bgCol = isOk ? '#f0fdf4' : isLimited ? '#fefce8' : '#f8fafc';
              const badgeBg = isOk ? '#dcfce7' : isLimited ? '#fef3c7' : '#fee2e2';
              const badgeText = isOk ? '#15803d' : isLimited ? '#92400e' : '#b91c1c';
              const badgeLabel = isOk ? '✓ 100%' : isLimited ? `⚠️ Огранич. (${ind.failCount}п)` : `✗ Откл. (${ind.failCount}п)`;

              return `
                <div style="border: 1px solid ${borderCol}; background-color: ${bgCol}; border-radius: 4px; padding: 4px 6px;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                      <span style="font-family: monospace; font-size: 8.5px; font-weight: 800; background-color: ${
                        isOk ? '#dcfce7' : isLimited ? '#fef3c7' : '#e2e8f0'
                      }; color: #0f172a; padding: 0.5px 4px; border-radius: 2px;">
                        ${ind.code}
                      </span>
                      <strong style="font-size: 8.5px; color: #0f172a; line-height: 1.2;">
                        ${ind.name}
                      </strong>
                    </div>
                    <span style="font-size: 7.5px; font-weight: 800; padding: 0.5px 4px; border-radius: 2px; background-color: ${badgeBg}; color: ${badgeText}; shrink-0; margin-left: 4px;">
                      ${badgeLabel}
                    </span>
                  </div>

                  <div style="font-size: 7.5px; color: #475569; margin-top: 1.5px; line-height: 1.25;">
                    ${
                      isLimited
                        ? `<span style="color: #92400e; font-weight: 600;">⚠️ Замечания (${ind.failCount}): ${ind.reasonsFail.join('; ')}</span>`
                        : isOk
                        ? `<span style="color: #15803d;">✓ Соответствует нормативам: ${ind.reasonsPass.join('; ')}</span>`
                        : `<span style="color: #b91c1c;">✗ Причины отказа: ${ind.reasonsFail.join('; ')}</span>`
                    }
                  </div>

                  <div style="display: flex; justify-content: space-between; font-size: 7px; color: #64748b; margin-top: 2px; border-top: 1px dashed ${
                    isOk ? '#bbf7d0' : isLimited ? '#fde68a' : '#cbd5e1'
                  }; padding-top: 1.5px;">
                    <span>Среда: <strong>${ind.targetMedium}</strong></span>
                    <span>Гель: <strong>${ind.gelAppearance.split('.')[0]}</strong></span>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    </div>

    <!-- 5. Bottom Metrological & Signature Footer -->
    <div style="border-top: 1px solid #cbd5e1; padding-top: 5px; display: flex; justify-content: space-between; align-items: center; font-size: 7.5px; color: #64748b;">
      <div>
        <strong>Метрология:</strong> Автономный расчет по стехиометрическому балансу РФА, фазам железа, КОЕ и индексу ИОМ.
      </div>
      <div>
        Экспресс-паспорт базового бентонита • <strong>Страница 1 из 1</strong>
      </div>
    </div>
  `;

  container.appendChild(page);
  document.body.appendChild(container);

  try {
    const canvas = await renderPageToCanvas(page);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'SLOW');

    const sanitizedName = (sampleName.trim() || 'Бентонит_Паспорт')
      .replace(/[\/\\?%*:|"<>]/g, '_')
      .replace(/\s+/g, '_');
    const filename = `${sanitizedName}_Краткий_Паспорт_${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.pdf`;

    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}
