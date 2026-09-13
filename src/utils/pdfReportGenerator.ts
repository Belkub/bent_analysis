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
 * Generates and triggers download of a comprehensive 3-page PDF laboratory report
 * containing 100% of interface data and detailed section 4 conclusions.
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

  // Helper for safe sample name
  const displaySampleName = sampleName.trim() ? sampleName.trim() : 'Исследуемый образец';

  // Paste suitability verdict
  const totalBallast = impurities.totalBallast;
  const freeSand = impurities.freeSiO2;
  const isPasteAllowed = totalBallast <= 18 && freeSand <= 3 && (iom.value >= 16 || !iom.isCalculable);

  // Smectite source description string matching UI
  let smectiteSourceText = '✓ Введено напрямую (Приоритет 1)';
  if (analysisResults.smectiteSource === 'cec_matrix') {
    const stdLabel =
      analysisResults.cecStandardUsed === 120
        ? 'Высокозарядный, 120 мг-экв'
        : analysisResults.cecStandardUsed === 110
        ? 'Среднезарядный, 110 мг-экв'
        : 'Низкозарядный, 100 мг-экв';
    smectiteSourceText = `По КОЕ (${stdLabel}) (Приоритет 2)`;
  } else if (analysisResults.smectiteSource === 'xrf_calc') {
    smectiteSourceText = 'По балансу РФА (100% − балласт) (Приоритет 3)';
  }

  // Container element offscreen
  const container = document.createElement('div');
  container.id = 'pdf-report-render-target';
  container.style.position = 'fixed';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.style.width = '794px'; // Exact A4 @ 96 DPI
  container.style.zIndex = '-9999';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#1c1917';
  container.style.fontFamily = 'Arial, "Helvetica Neue", "Segoe UI", sans-serif';

  // Common styles
  const pageBaseStyle = `
    width: 794px;
    height: 1123px;
    box-sizing: border-box;
    padding: 26px 32px;
    background-color: #ffffff;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  `;

  // =========================================================================
  // PAGE 1: Header, Raw Properties, XRF Table, and Section 4 (4.1, 4.2, 4.3)
  // =========================================================================
  const page1 = document.createElement('div');
  page1.style.cssText = pageBaseStyle;
  page1.innerHTML = `
    <div>
      <!-- Page 1 Header -->
      <div style="border-bottom: 2px solid #b45309; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="font-size: 10px; font-weight: bold; color: #b45309; text-transform: uppercase; letter-spacing: 1px;">
            Паспорт испытаний и заключение о потенциале органомодификации
          </div>
          <h1 style="font-size: 17px; font-weight: 800; color: #1c1917; margin: 2px 0 0 0; line-height: 1.2;">
            ${displaySampleName}
          </h1>
          <div style="font-size: 10.5px; color: #57534e; margin-top: 2px;">
            Тип сырья: <strong style="color: #1c1917;">${analysisResults.bentoniteTypeLabel}</strong> • Комплексный физико-химический анализ
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 9.5px; color: #78716c;">Дата формирования:</div>
          <div style="font-size: 10.5px; font-weight: bold; color: #292524;">${dateFormatted}, ${timeFormatted}</div>
          <div style="display: inline-block; font-size: 9px; font-weight: bold; background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 1.5px 6px; border-radius: 4px; margin-top: 2px;">
            ✓ Лабораторный расчет
          </div>
        </div>
      </div>

      <!-- Top Row: Visual sample & Physical properties -->
      <div style="display: grid; grid-template-columns: 220px 1fr; gap: 10px; margin-bottom: 10px;">
        <!-- Left: Photo/Color -->
        <div style="border: 1px solid #e7e5e4; border-radius: 8px; padding: 9px; background-color: #fafaf9;">
          <div style="font-size: 10.5px; font-weight: bold; color: #292524; margin-bottom: 5px; border-bottom: 1px solid #e7e5e4; padding-bottom: 3px;">
            1. Внешний вид и цвет
          </div>
          ${
            photoUrl
              ? `<div style="width: 100%; height: 95px; border-radius: 6px; overflow: hidden; margin-bottom: 6px; border: 1px solid #d6d3d1;">
                   <img src="${photoUrl}" style="width: 100%; height: 100%; object-fit: cover; display: block;" alt="Фото" />
                 </div>`
              : `<div style="width: 100%; height: 55px; border-radius: 6px; background-color: ${colorInfo.sampleHex}; border: 1px solid #d6d3d1; margin-bottom: 6px; display: flex; align-items: center; justify-content: center; color: #ffffff; text-shadow: 0 1px 2px rgba(0,0,0,0.7); font-size: 10px; font-weight: bold;">
                   Эталон цвета: ${colorInfo.sampleHex}
                 </div>`
          }
          <div style="font-size: 9.5px; line-height: 1.35; color: #44403c;">
            <div><strong>Категория цвета:</strong> ${colorInfo.name}</div>
            <div style="margin-top: 2px;"><strong>Примеси:</strong> ${colorInfo.probableImpurities}</div>
          </div>
        </div>

        <!-- Right: Physical-chemical Input Parameters -->
        <div style="border: 1px solid #e7e5e4; border-radius: 8px; padding: 9px; background-color: #ffffff;">
          <div style="font-size: 10.5px; font-weight: bold; color: #292524; margin-bottom: 5px; border-bottom: 1px solid #e7e5e4; padding-bottom: 3px;">
            2. Физико-химические параметры
          </div>
          <table style="width: 100%; font-size: 9.5px; border-collapse: collapse; text-align: left;">
            <tbody>
              <tr style="border-bottom: 1px solid #f5f5f4;">
                <td style="padding: 2.5px 0; color: #78716c;">Содержание смектита:</td>
                <td style="padding: 2.5px 0; font-weight: bold; color: #047857; text-align: right;">
                  ${analysisResults.effectiveSmectite}%
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #f5f5f4;">
                <td style="padding: 2.5px 0; color: #78716c;">Емкость катионного обмена (КОЕ):</td>
                <td style="padding: 2.5px 0; font-weight: bold; text-align: right;">
                  ${cec !== undefined ? `${cec} мг-экв / 100г (эталон ${cecStandard})` : 'Не определено'}
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #f5f5f4;">
                <td style="padding: 2.5px 0; color: #78716c;">Показатель набухания:</td>
                <td style="padding: 2.5px 0; font-weight: bold; text-align: right;">
                  ${swellingIndex !== undefined ? `${swellingIndex} мл / 2г` : 'Не определено'}
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #f5f5f4;">
                <td style="padding: 2.5px 0; color: #78716c;">Содержание свободного песка (>44 мкм):</td>
                <td style="padding: 2.5px 0; font-weight: bold; text-align: right;">
                  ${sand !== undefined ? `${sand}%` : 'Не определено'}
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #f5f5f4;">
                <td style="padding: 2.5px 0; color: #78716c;">Активация кальцинированной содой:</td>
                <td style="padding: 2.5px 0; font-weight: bold; text-align: right;">
                  ${activation ? `Да (${sodaPercent ?? 0}% Na₂CO₃)` : 'Нет (естественная форма)'}
                </td>
              </tr>
              ${
                apiTest.pv !== undefined || apiTest.yp !== undefined
                  ? `<tr>
                      <td style="padding: 2.5px 0; color: #78716c;">Реология 6% суспензии (API):</td>
                      <td style="padding: 2.5px 0; font-weight: bold; text-align: right;">
                        PV: ${apiTest.pv ?? '-'} сПз | YP: ${apiTest.yp ?? '-'} дфунт/100фт² (YP/PV = ${apiModel?.ratio ?? '-'})
                      </td>
                    </tr>`
                  : ''
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- XRF Table -->
      <div style="border: 1px solid #e7e5e4; border-radius: 8px; padding: 8px; background-color: #fafaf9; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; border-bottom: 1px solid #e7e5e4; padding-bottom: 3px;">
          <span style="font-size: 10px; font-weight: bold; color: #292524;">
            3. Химический состав по данным РФА (% масс.)
          </span>
          <span style="font-size: 9px; color: #57534e;">
            Сумма: <strong>${totalOxides.toFixed(2)}%</strong> |
            Na₂O/CaO: <strong>${naCaRatio}</strong> |
            SiO₂/Fe₂O₃: <strong>${siFeRatio}</strong> |
            SiO₂/Al₂O₃: <strong>${siAlRatio}</strong>
          </span>
        </div>

        <table style="width: 100%; font-size: 9px; border-collapse: collapse; text-align: center;">
          <thead>
            <tr style="background-color: #f5f5f4; color: #44403c;">
              ${ALL_OXIDE_KEYS.map((k) => `<th style="padding: 3px 2px; border: 1px solid #e7e5e4;">${k}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              ${ALL_OXIDE_KEYS.map(
                (k) =>
                  `<td style="padding: 3px 2px; border: 1px solid #e7e5e4; font-weight: ${
                    oxides[k] ? 'bold' : 'normal'
                  }; color: ${oxides[k] ? '#1c1917' : '#a8a29e'};">
                    ${oxides[k] !== undefined ? oxides[k] : '0.00'}
                  </td>`
              ).join('')}
            </tr>
          </tbody>
        </table>
      </div>

      <!-- SECTION 4: PART 1 -->
      <div style="border: 1.5px solid #b45309; border-radius: 8px; padding: 10px; background-color: #ffffff;">
        <div style="font-size: 11.5px; font-weight: 800; color: #b45309; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; border-bottom: 1.5px solid #fde68a; padding-bottom: 4px;">
          4. Заключение о применимости базового бентонита к органомодификации (ОМ)
        </div>

        <!-- 4.1. Card: Bentonite Type -->
        <div style="border: 1px solid #e7e5e4; border-radius: 6px; padding: 8px; background-color: #fafaf9; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
            <div style="font-size: 10px; font-weight: bold; color: #b45309; text-transform: uppercase;">
              4.1. Тип бентонита (ОГ)
            </div>
            <div style="font-size: 9.5px; font-weight: bold; color: #292524; background-color: #f5f5f4; padding: 2px 6px; border-radius: 4px; border: 1px solid #e7e5e4;">
              Na₂O / CaO: <strong>${impurities.na2o && impurities.caoTotal ? (impurities.na2o / impurities.caoTotal).toFixed(2) : '—'}</strong>
            </div>
          </div>
          <div style="font-size: 12px; font-weight: 800; color: #1c1917; margin-bottom: 2px;">
            ${analysisResults.bentoniteTypeLabel}
          </div>
          <div style="font-size: 9.5px; line-height: 1.35; color: #44403c;">
            ${analysisResults.bentoniteTypeDescription}
          </div>
        </div>

        <!-- 4.2. Card: IOM Index -->
        <div style="border: 1px solid #e7e5e4; border-radius: 6px; padding: 8px; background-color: #fafaf9; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <div style="font-size: 10px; font-weight: bold; color: #b45309; text-transform: uppercase;">
              4.2. Индекс ОМ (ИОМ)
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 14px; font-weight: 800; color: #92400e; font-family: monospace;">
                ИОМ = ${iom.isCalculable ? iom.value : '—'}
              </span>
              <span style="font-size: 9px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background-color: ${
                iom.rating === 'excellent'
                  ? '#dcfce7; color: #166534;'
                  : iom.rating === 'good'
                  ? '#dbeafe; color: #1e40af;'
                  : iom.rating === 'acceptable'
                  ? '#fef3c7; color: #92400e;'
                  : '#fee2e2; color: #991b1b;'
              }">
                ${
                  iom.rating === 'excellent'
                    ? 'Отлично'
                    : iom.rating === 'good'
                    ? 'Хорошо'
                    : iom.rating === 'acceptable'
                    ? 'Приемлемо'
                    : 'Низкий'
                }
              </span>
            </div>
          </div>
          <div style="font-size: 9.5px; color: #292524; font-weight: bold; margin-bottom: 3px;">
            ${iom.ratingLabel}
          </div>
          <div style="font-size: 9px; background-color: #f5f5f4; border: 1px solid #e7e5e4; padding: 4px 6px; border-radius: 4px; margin-bottom: 3px; display: flex; justify-content: space-between;">
            <span><strong>Множители формулы:</strong> (Na₂O/CaO: ${iom.multNaCa}) × (SiO₂/Fe₂O₃: ${iom.multSiFe}) × (100/КОЕ: ${iom.multCec})</span>
            <span style="color: #78716c;">(Порог технологической пригодности: ИОМ ≥ 16.0)</span>
          </div>
        </div>

        <!-- 4.3. Card: Impurities & Smectite -->
        <div style="border: 1px solid #e7e5e4; border-radius: 6px; padding: 8px; background-color: #fafaf9;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <div style="font-size: 10px; font-weight: bold; color: #b45309; text-transform: uppercase;">
              4.3. Примеси и смектит
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 9.5px; color: #78716c;">
                Балласт (РФА): <strong style="color: #1c1917;">${impurities.isSufficientData ? `${impurities.totalBallast}%` : '—'}</strong>
              </span>
              <span style="font-size: 9.5px; color: #78716c;">
                Смектит (расчетный): <strong style="color: #047857; font-size: 11px;">${analysisResults.effectiveSmectite}%</strong>
              </span>
            </div>
          </div>

          <div style="font-size: 8.5px; margin-bottom: 5px;">
            <span style="display: inline-block; background-color: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 1px 5px; border-radius: 3px; font-weight: bold;">
              ${smectiteSourceText}
            </span>
          </div>

          <!-- 4 mineral breakdown boxes -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; font-size: 8.5px; margin-bottom: 6px;">
            <div style="background-color: #ffffff; border: 1px solid #e7e5e4; padding: 4px; border-radius: 4px; text-align: center;">
              <div style="color: #78716c;">Свободный кварц:</div>
              <div style="font-weight: bold; font-size: 10.5px; color: #1c1917;">${impurities.freeSiO2}%</div>
            </div>
            <div style="background-color: #ffffff; border: 1px solid #e7e5e4; padding: 4px; border-radius: 4px; text-align: center;">
              <div style="color: #78716c;">Кальцит (мел):</div>
              <div style="font-weight: bold; font-size: 10.5px; color: #1c1917;">${impurities.calciteCaCO3}%</div>
            </div>
            <div style="background-color: #ffffff; border: 1px solid #e7e5e4; padding: 4px; border-radius: 4px; text-align: center;">
              <div style="color: #78716c;">Шпаты и слюды:</div>
              <div style="font-weight: bold; font-size: 10.5px; color: #1c1917;">${impurities.orthoclase}%</div>
            </div>
            <div style="background-color: #ffffff; border: 1px solid #e7e5e4; padding: 4px; border-radius: 4px; text-align: center;">
              <div style="color: #78716c;">Железный балласт:</div>
              <div style="font-weight: bold; font-size: 10.5px; color: #1c1917;">${impurities.ironBallast}%</div>
            </div>
          </div>

          <!-- Method Verdicts -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 9px;">
            <div style="border: 1px solid ${isPasteAllowed ? '#a7f3d0' : '#fecaca'}; background-color: ${isPasteAllowed ? '#f0fdf4' : '#fef2f2'}; padding: 5px 6px; border-radius: 4px;">
              <div style="font-weight: bold; color: ${isPasteAllowed ? '#047857' : '#b91c1c'}; margin-bottom: 2px;">
                ${isPasteAllowed ? '✓ Метод пасты: ГОДЕН' : '✗ Метод пасты: НЕ ДОПУСТИМ'}
              </div>
              <div style="color: #44403c; line-height: 1.25; font-size: 8.5px;">
                ${
                  isPasteAllowed
                    ? 'Балласт ≤18% и свободный кварц ≤3% допускают экструзию без износа.'
                    : `Балласт (${totalBallast}%) или кварц (${freeSand}%) превышают нормы пластической технологии.`
                }
              </div>
            </div>

            <div style="border: 1px solid #a7f3d0; background-color: #f0fdf4; padding: 5px 6px; border-radius: 4px;">
              <div style="font-weight: bold; color: #047857; margin-bottom: 2px;">
                ✓ Водно-суспензионный метод: РЕКОМЕНДОВАН
              </div>
              <div style="color: #44403c; line-height: 1.25; font-size: 8.5px;">
                Гидродиспергирование (10–12%) с гидроциклонированием эффективно отделяет карбонаты и кварц.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Page 1 Footer -->
    <div style="border-top: 1px solid #e7e5e4; padding-top: 6px; font-size: 8.5px; color: #a8a29e; display: flex; justify-content: space-between; align-items: center;">
      <span>Комплексный анализ бентонита • Автономный паспорт качества</span>
      <span>Страница 1 из 3</span>
    </div>
  `;

  // =========================================================================
  // PAGE 2: Section 4 Continued (4.4 API Model, 4.5 Color Interpretation, 4.6 Milling)
  // =========================================================================
  const page2 = document.createElement('div');
  page2.style.cssText = pageBaseStyle;
  page2.innerHTML = `
    <div>
      <!-- Page 2 Header -->
      <div style="border-bottom: 2px solid #b45309; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="font-size: 10px; font-weight: bold; color: #b45309; text-transform: uppercase; letter-spacing: 1px;">
            Заключение о применимости (Продолжение)
          </div>
          <h2 style="font-size: 15px; font-weight: 800; color: #1c1917; margin: 2px 0 0 0; line-height: 1.2;">
            Реологическая модель API, цветовая диагностика и помол: ${displaySampleName}
          </h2>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 9.5px; color: #78716c;">Образец:</div>
          <div style="font-size: 10.5px; font-weight: bold; color: #292524;">${displaySampleName}</div>
        </div>
      </div>

      <!-- 4.4. Card: API Model & Rheology Activation -->
      <div style="border: 1px solid #e7e5e4; border-radius: 8px; padding: 10px; background-color: #ffffff; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid #e7e5e4; padding-bottom: 4px;">
          <div style="font-size: 11px; font-weight: bold; color: #b45309; text-transform: uppercase;">
            4.4. Модель API (активация)
          </div>
          ${
            apiModel?.suitabilitySummary
              ? `<span style="font-size: 9.5px; font-weight: bold; padding: 2px 8px; border-radius: 4px; background-color: ${
                  apiModel.model === 'non_treated'
                    ? '#dcfce7; color: #166534;'
                    : apiModel.model === 'drilling_grade'
                    ? '#dbeafe; color: #1e40af;'
                    : apiModel.model === 'ocma'
                    ? '#fef3c7; color: #92400e;'
                    : apiModel.model === 'marginal_ocma'
                    ? '#ffedd5; color: #9a3412;'
                    : '#f5f5f4; color: #44403c;'
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
                <div style="font-size: 13px; font-weight: 800; color: #1c1917; margin-bottom: 3px;">
                  ${apiModel.label}
                </div>
                <div style="font-size: 9.5px; line-height: 1.4; color: #44403c; margin-bottom: 6px;">
                  ${apiModel.description}
                </div>
              </div>

              ${
                apiModel.recommendation
                  ? `
                    <div style="font-size: 9px; line-height: 1.35; color: #78350f; background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 6px 8px; margin-bottom: 8px;">
                      <strong>💡 Рекомендация технолога:</strong> ${apiModel.recommendation}
                    </div>
                  `
                  : ''
              }

              <div style="display: flex; justify-content: space-between; align-items: center; background-color: #fafaf9; border: 1px solid #e7e5e4; border-radius: 6px; padding: 6px 10px; font-size: 9.5px;">
                <div style="font-family: monospace; color: #292524;">
                  Пластическая вязкость (PV): <strong>${apiModel.pv} сПз</strong> | ДНС (YP): <strong>${apiModel.yp} дфунт/100фт²</strong> | Соотношение YP/PV: <strong style="color: #b45309; font-size: 11px;">${apiModel.ratio}</strong>
                </div>
                <div style="font-size: 8.5px; color: #78716c;">
                  ${
                    apiModel.ratio <= 1.5
                      ? '🎯 Идеал: YP/PV ≤ 1.5 (Non-treated высший сорт)'
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
              <div style="font-size: 9.5px; color: #78716c; background-color: #fafaf9; border: 1px solid #e7e5e4; padding: 8px; border-radius: 6px;">
                Активация содой не отмечена либо не введены значения ф600 и ф300 в блоке физико-химических параметров. Для оценки реологии API заполните показания вискозиметра.
              </div>
            `
        }
      </div>

      <!-- 4.5. Card: Color Interpretation -->
      <div style="border: 1px solid #e7e5e4; border-radius: 8px; padding: 10px; background-color: #ffffff; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid #e7e5e4; padding-bottom: 4px;">
          <div style="font-size: 11px; font-weight: bold; color: #b45309; text-transform: uppercase;">
            4.5. Краткая интерпретация цвета бентонита: ${colorInfo.name}
          </div>
          <div style="display: flex; align-items: center; gap: 5px;">
            <span style="display: inline-block; width: 14px; height: 14px; border-radius: 3px; background-color: ${colorInfo.sampleHex}; border: 1px solid #a8a29e;"></span>
            <span style="font-size: 9px; font-weight: bold; color: #57534e;">HEX: ${colorInfo.sampleHex}</span>
          </div>
        </div>

        <div style="font-size: 9.5px; line-height: 1.4; color: #44403c; margin-bottom: 6px;">
          <div><strong>Диагностика примесей:</strong> ${colorInfo.probableImpurities}</div>
          <div style="margin-top: 2px;"><strong>Среда и условия формирования:</strong> ${colorInfo.formationEnvironment}</div>
        </div>

        <div style="background-color: #fafaf9; border: 1px solid #e7e5e4; border-radius: 6px; padding: 6px 8px; font-size: 9px; line-height: 1.35; color: #44403c; margin-bottom: 6px;">
          <strong style="color: #292524;">Поведение и форма нахождения железа (Fe):</strong> ${colorInfo.ironStatusDescription}
        </div>

        ${
          impurities.ironTotal > 0
            ? `
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; font-size: 9px; text-align: center;">
                <div style="background-color: #f5f5f4; border: 1px solid #e7e5e4; padding: 4px; border-radius: 4px;">
                  <div style="color: #78716c;">Всего Fe₂O₃ (РФА):</div>
                  <div style="font-weight: bold; font-size: 10px; color: #1c1917;">${impurities.ironTotal}%</div>
                </div>
                <div style="background-color: #f5f5f4; border: 1px solid #e7e5e4; padding: 4px; border-radius: 4px;">
                  <div style="color: #78716c;">Структурное Fe₂O₃ в смектите:</div>
                  <div style="font-weight: bold; font-size: 10px; color: #047857;">${impurities.ironStructural}%</div>
                </div>
                <div style="background-color: #f5f5f4; border: 1px solid #e7e5e4; padding: 4px; border-radius: 4px;">
                  <div style="color: #78716c;">Свободный железистый балласт:</div>
                  <div style="font-weight: bold; font-size: 10px; color: #b45309;">${impurities.ironBallast}%</div>
                </div>
              </div>
            `
            : ''
        }
      </div>

      <!-- 4.6. Technological Milling & Particle Distribution Requirements -->
      <div style="border: 1px solid #e7e5e4; border-radius: 8px; padding: 10px; background-color: #ffffff;">
        <div style="font-size: 11px; font-weight: bold; color: #b45309; text-transform: uppercase; margin-bottom: 6px; border-bottom: 1px solid #e7e5e4; padding-bottom: 4px;">
          4.6. Технологические рекомендации по помолу и гидродиспергированию ОГ
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 9px; line-height: 1.38; color: #44403c;">
          <div style="background-color: #fafaf9; border: 1px solid #e7e5e4; padding: 8px; border-radius: 6px;">
            <strong style="color: #1c1917; display: block; margin-bottom: 3px; font-size: 9.5px;">Тонкие покрытия, ЛКМ и гелькоуты (D50 ≤ 5–8 мкм):</strong>
            Для предотвращения сошлифовывания и получения глянца требуется струйный или воздухоструйный помол с динамическим воздушным классификатором (порог D99 ≤ 15–20 мкм, сито 44 мкм < 0.1%). Температура помола строго ≤ 60–70 °C во избежание термической деструкции ЧАС.
          </div>
          <div style="background-color: #fafaf9; border: 1px solid #e7e5e4; padding: 8px; border-radius: 6px;">
            <strong style="color: #1c1917; display: block; margin-bottom: 3px; font-size: 9.5px;">Буровые растворы и пластичные смазки (D50 ≤ 20–30 мкм):</strong>
            Оптимален механический ударно-отражательный мельничный помол или тарельчатые дезинтеграторы. Требования: ситовой остаток на сетке 74 мкм (200 mesh) ≤ 1.0–1.5%. Обеспечивает мгновенный роспуск в углеводородах без слипания.
          </div>
        </div>
      </div>
    </div>

    <!-- Page 2 Footer -->
    <div style="border-top: 1px solid #e7e5e4; padding-top: 6px; font-size: 8.5px; color: #a8a29e; display: flex; justify-content: space-between; align-items: center;">
      <span>Комплексный анализ бентонита • Технологические параметры</span>
      <span>Страница 2 из 3</span>
    </div>
  `;

  // =========================================================================
  // PAGE 3: Section 4.7 Industrial Application Matrix (All details from UI)
  // =========================================================================
  const page3 = document.createElement('div');
  page3.style.cssText = pageBaseStyle;
  page3.innerHTML = `
    <div>
      <!-- Page 3 Header -->
      <div style="border-bottom: 2px solid #b45309; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="font-size: 10px; font-weight: bold; color: #b45309; text-transform: uppercase; letter-spacing: 1px;">
            4.7. Применимость базового бентонита по отраслям промышленности
          </div>
          <h2 style="font-size: 15px; font-weight: 800; color: #1c1917; margin: 2px 0 0 0; line-height: 1.2;">
            Оценка пригодности по классам применения органоглин (ОГ): ${displaySampleName}
          </h2>
          <div style="font-size: 9.5px; color: #57534e; margin-top: 2px;">
            Статус: Пригодно к использованию в <strong style="color: #047857;">${analysisResults.suitableIndustries.length}</strong> из ${analysisResults.allIndustries.length} отраслей производства ОГ
          </div>
        </div>
        <div style="text-align: right;">
          <div style="display: inline-block; font-size: 9px; font-weight: bold; background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 2px 6px; border-radius: 4px;">
            ${analysisResults.suitableIndustries.length} одобрено
          </div>
        </div>
      </div>

      <!-- Detailed Matrix Cards of All Industries -->
      <div style="display: flex; flex-direction: column; gap: 7px;">
        ${analysisResults.allIndustries
          .map((ind) => {
            const isOk = ind.isSuitable;
            return `
              <div style="border: 1px solid ${isOk ? '#a7f3d0' : '#e7e5e4'}; background-color: ${
              isOk ? '#f0fdf4' : '#fafaf9'
            }; border-radius: 6px; padding: 6px 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-family: monospace; font-size: 9.5px; font-weight: 800; background-color: ${
                      isOk ? '#dcfce7' : '#e7e5e4'
                    }; color: #1c1917; padding: 1px 5px; border-radius: 3px;">
                      ${ind.code}
                    </span>
                    <strong style="font-size: 10px; color: #1c1917;">${ind.name}</strong>
                    <span style="font-size: 8.5px; color: #78716c;">(${ind.category})</span>
                  </div>
                  <span style="font-size: 8.5px; font-weight: bold; padding: 1px 6px; border-radius: 3px; background-color: ${
                    isOk ? '#dcfce7' : '#fee2e2'
                  }; color: ${isOk ? '#15803d' : '#b91c1c'};">
                    ${isOk ? '✓ Приемлемо' : '✗ Не проходит'}
                  </span>
                </div>

                <!-- Criteria Validation lines -->
                <div style="font-size: 8.5px; line-height: 1.3; margin-bottom: 3px;">
                  ${
                    ind.reasonsPass.length > 0
                      ? `<span style="color: #15803d; margin-right: 8px;">
                           ✓ ${ind.reasonsPass.join('; ')}
                         </span>`
                      : ''
                  }
                  ${
                    ind.reasonsFail.length > 0
                      ? `<span style="color: #b91c1c; font-weight: 600;">
                           ✗ ${ind.reasonsFail.join('; ')}
                         </span>`
                      : ''
                  }
                </div>

                <!-- Parameters summary grid -->
                <div style="display: grid; grid-template-columns: 1.8fr 1.6fr 1.8fr 1.3fr; gap: 6px; font-size: 8px; color: #44403c; border-top: 1px dashed ${
                  isOk ? '#bbf7d0' : '#e7e5e4'
                }; padding-top: 3px;">
                  <div>
                    <span style="color: #78716c;">Среда:</span> <strong>${ind.targetMedium}</strong> (${ind.polarity})
                  </div>
                  <div>
                    <span style="color: #78716c;">Цвет геля:</span> ${ind.gelAppearance}
                  </div>
                  <div>
                    <span style="color: #78716c;">Реология:</span> ${ind.fann35Dt}
                  </div>
                  <div>
                    <span style="color: #78716c;">Помол:</span> ${ind.particleSize}
                  </div>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>

      <!-- Concluding Laboratory Note -->
      <div style="border: 1px solid #e7e5e4; border-radius: 6px; padding: 6px 8px; background-color: #ffffff; margin-top: 10px;">
        <div style="font-size: 8.5px; color: #78716c; line-height: 1.35;">
          <strong>Заключение и метрологический контроль:</strong> Все технологические параметры рассчитаны на основе стехиометрического распределения оксидов РФА, минералогического баланса фаз железа, катионно-обменных свойств и автономного алгоритма оценки индекса органомодифицируемости (ИОМ). Пригоден для предоставления технологам производства органоглин.
        </div>
      </div>
    </div>

    <!-- Page 3 Footer -->
    <div style="border-top: 1px solid #e7e5e4; padding-top: 6px; font-size: 8.5px; color: #a8a29e; display: flex; justify-content: space-between; align-items: center;">
      <span>Комплексный анализ бентонита • Отраслевой реестр применения ОГ</span>
      <span>Страница 3 из 3</span>
    </div>
  `;

  container.appendChild(page1);
  container.appendChild(page2);
  container.appendChild(page3);
  document.body.appendChild(container);

  try {
    // Render Page 1
    const canvas1 = await html2canvas(page1, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    // Render Page 2
    const canvas2 = await html2canvas(page2, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    // Render Page 3
    const canvas3 = await html2canvas(page3, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    // Generate PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    // Add Page 1
    const imgData1 = canvas1.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData1, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

    // Add Page 2
    pdf.addPage();
    const imgData2 = canvas2.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData2, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

    // Add Page 3
    pdf.addPage();
    const imgData3 = canvas3.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData3, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

    // Generate sanitized filename
    const sanitizedName = (sampleName.trim() || 'Бентонит_Паспорт')
      .replace(/[\/\\?%*:|"<>]/g, '_')
      .replace(/\s+/g, '_');
    const filename = `${sanitizedName}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}.pdf`;

    pdf.save(filename);
  } finally {
    // Cleanup offscreen element
    document.body.removeChild(container);
  }
}
