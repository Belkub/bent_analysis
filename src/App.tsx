import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Calculator,
  RefreshCw,
  FileCheck2,
  HelpCircle,
  FlaskConical,
  ChevronDown,
  ArrowDown,
  FileDown,
  Loader2
} from 'lucide-react';
import { BentoniteColorId, OxideComposition, ApiTestData, BenchmarkPreset } from './types';
import { BENCHMARK_PRESETS, BENTONITE_COLORS } from './data/mineralData';
import { analyzeBentonite } from './utils/bentoniteAnalyzer';
import { generateBentonitePdfReport } from './utils/pdfReportGenerator';
import { Header } from './components/Header';
import { SampleInfoInput } from './components/SampleInfoInput';
import { ColorInput } from './components/ColorInput';
import { OxideTableInput } from './components/OxideTableInput';
import { PhysicalParamsInput } from './components/PhysicalParamsInput';
import { AnalysisSummary } from './components/AnalysisSummary';
import { ModalImpuritiesCalc } from './components/modals/ModalImpuritiesCalc';
import { ModalColorInterpretation } from './components/modals/ModalColorInterpretation';
import { ModalGelCharacteristics } from './components/modals/ModalGelCharacteristics';
import { ModalMillingMethods } from './components/modals/ModalMillingMethods';
import { ModalIomDetails } from './components/modals/ModalIomDetails';

export default function App() {
  // 0. Sample Identifier
  const [sampleName, setSampleName] = useState<string>('Бентонит МТ-06');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // 1. Color State
  const [selectedColorId, setSelectedColorId] = useState<BentoniteColorId>('yellow_brown');
  const [clayPhotoUrl, setClayPhotoUrl] = useState<string | undefined>(undefined);

  // 2. Oxide Composition State (initialized with MT-06 benchmark by default)
  const [oxides, setOxides] = useState<OxideComposition>(BENCHMARK_PRESETS[0].data.oxides);

  // 3. Physical Parameters State
  const [swellingIndex, setSwellingIndex] = useState<number | undefined>(BENCHMARK_PRESETS[0].data.swellingIndex);
  const [cec, setCec] = useState<number | undefined>(BENCHMARK_PRESETS[0].data.cec);
  const [cecStandard, setCecStandard] = useState<100 | 110 | 120>(BENCHMARK_PRESETS[0].data.cecStandard ?? 120);
  const [smectite, setSmectite] = useState<number | undefined>(BENCHMARK_PRESETS[0].data.smectite);
  const [sand, setSand] = useState<number | undefined>(BENCHMARK_PRESETS[0].data.sand);

  // 4. Activation State
  const [activation, setActivation] = useState<boolean>(BENCHMARK_PRESETS[0].data.activation);
  const [sodaPercent, setSodaPercent] = useState<number | undefined>(BENCHMARK_PRESETS[0].data.sodaPercent);
  const [apiTest, setApiTest] = useState<ApiTestData>(BENCHMARK_PRESETS[0].data.apiTest);

  // 5. Analysis Trigger State
  const [hasAnalyzed, setHasAnalyzed] = useState<boolean>(true); // initially run on default preset

  // 6. Modal Open State
  const [activeModal, setActiveModal] = useState<
    'none' | 'impurities' | 'color' | 'gel' | 'milling' | 'iom'
  >('none');

  // Load a benchmark sample
  const handleSelectPreset = (preset: BenchmarkPreset) => {
    setSampleName(preset.name);
    setSelectedColorId(preset.data.colorId);
    setOxides({ ...preset.data.oxides });
    setSwellingIndex(preset.data.swellingIndex);
    setCec(preset.data.cec);
    setCecStandard(preset.data.cecStandard ?? 120);
    setSmectite(preset.data.smectite);
    setSand(preset.data.sand);
    setActivation(preset.data.activation);
    setSodaPercent(preset.data.sodaPercent);
    setApiTest({ ...preset.data.apiTest });
    setClayPhotoUrl(undefined);
    setHasAnalyzed(true);
  };

  // Reset form to blank
  const handleReset = () => {
    setSampleName('');
    setSelectedColorId('creamy_white');
    setOxides({});
    setSwellingIndex(undefined);
    setCec(undefined);
    setCecStandard(120);
    setSmectite(undefined);
    setSand(undefined);
    setActivation(false);
    setSodaPercent(undefined);
    setApiTest({ f600: undefined, f300: undefined, pv: undefined, yp: undefined });
    setClayPhotoUrl(undefined);
    setHasAnalyzed(false);
  };

  const handleOxideChange = (key: keyof OxideComposition, value: number | undefined) => {
    setOxides((prev) => {
      const next = { ...prev };
      if (value === undefined || isNaN(value)) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  };

  const handleApplyAllOxides = (newOxides: OxideComposition) => {
    setOxides(newOxides);
  };

  // Execute analytical calculations
  const analysisResults = useMemo(() => {
    return analyzeBentonite({
      colorId: selectedColorId,
      oxides,
      swellingIndex,
      cec,
      cecStandard,
      smectite,
      sand,
      activation,
      sodaPercent,
      apiTest,
    });
  }, [
    selectedColorId,
    oxides,
    swellingIndex,
    cec,
    cecStandard,
    smectite,
    sand,
    activation,
    sodaPercent,
    apiTest,
  ]);

  const handleRunAnalysis = () => {
    setHasAnalyzed(true);
    setTimeout(() => {
      const el = document.getElementById('analysis-results-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  // Generate and download full official laboratory PDF report
  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    try {
      await generateBentonitePdfReport({
        sampleName,
        photoUrl: clayPhotoUrl,
        colorId: selectedColorId,
        oxides,
        swellingIndex,
        cec,
        cecStandard,
        smectite,
        sand,
        activation,
        sodaPercent,
        apiTest,
        analysisResults,
      });
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
      alert('Произошла ошибка при экспорте PDF файла.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-sans selection:bg-amber-200">
      {/* Top Header with Sample Presets */}
      <Header onLoadPreset={handleSelectPreset} onReset={handleReset} />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Input Form Cards */}
        <div className="space-y-5">
          {/* Sample Identification Field */}
          <SampleInfoInput
            sampleName={sampleName}
            onChangeSampleName={setSampleName}
          />

          {/* Section 1: Color Classifier */}
          <ColorInput
            selectedColorId={selectedColorId}
            onChangeColor={setSelectedColorId}
            photoUrl={clayPhotoUrl}
            onPhotoUploaded={setClayPhotoUrl}
          />

          {/* Section 2: Oxide Table with OCR */}
          <OxideTableInput
            oxides={oxides}
            onChangeOxide={handleOxideChange}
            onApplyAllOxides={handleApplyAllOxides}
          />

          {/* Section 3: Physical Parameters & Activation */}
          <PhysicalParamsInput
            swellingIndex={swellingIndex}
            cec={cec}
            cecStandard={cecStandard}
            smectite={smectite}
            sand={sand}
            activation={activation}
            sodaPercent={sodaPercent}
            apiTest={apiTest}
            effectiveSmectite={analysisResults.effectiveSmectite}
            smectiteSource={analysisResults.smectiteSource}
            cecStandardUsed={analysisResults.cecStandardUsed}
            xrfSmectite={analysisResults.impurities.estimatedSmectite}
            onChangeSwelling={setSwellingIndex}
            onChangeCec={setCec}
            onChangeCecStandard={setCecStandard}
            onChangeSmectite={setSmectite}
            onChangeSand={setSand}
            onChangeActivation={setActivation}
            onChangeSodaPercent={setSodaPercent}
            onChangeApiTest={setApiTest}
          />
        </div>

        {/* Big Action Bar */}
        <div className="sticky bottom-4 z-30 bg-stone-900/95 backdrop-blur-md rounded-2xl p-4 text-white shadow-xl border border-stone-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Анализ потенциала бентонита к органомодификации
              </h3>
              <p className="text-xs text-stone-400">
                Автономный комплекс минералогической и реологической оценки
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              id="run-analysis-btn"
              onClick={handleRunAnalysis}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 font-bold text-sm text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>Выполнить анализ</span>
              <ArrowDown className="w-4 h-4 text-amber-200" />
            </button>
          </div>
        </div>

        {/* Results View */}
        {hasAnalyzed && (
          <div className="pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 bg-white p-4 sm:p-5 rounded-xl border border-stone-200 shadow-xs">
              <div>
                <h2 className="text-lg font-extrabold text-stone-900 flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-emerald-700" />
                  <span>Результаты анализа: {sampleName.trim() ? sampleName : 'Исследуемый образец'}</span>
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Сводный отчет о пригодности сырья, минералогическом балансе и рекомендуемых режимах ОГ
                </p>
              </div>

              {/* PDF Download Button in Results Header */}
              <button
                type="button"
                id="download-pdf-report-btn"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 active:scale-98 text-white font-bold text-xs shadow-xs hover:shadow-md transition-all flex items-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
                title="Сформировать и скачать полный 2-страничный PDF-паспорт образца"
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-200" />
                    <span>Формирование PDF...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4 text-amber-200" />
                    <span>Скачать PDF отчет</span>
                  </>
                )}
              </button>
            </div>

            <AnalysisSummary
              results={analysisResults}
              colorId={selectedColorId}
              sampleName={sampleName}
              photoUrl={clayPhotoUrl}
              onDownloadPdf={handleDownloadPdf}
              isGeneratingPdf={isGeneratingPdf}
              onOpenImpuritiesModal={() => setActiveModal('impurities')}
              onOpenColorModal={() => setActiveModal('color')}
              onOpenGelModal={() => setActiveModal('gel')}
              onOpenMillingModal={() => setActiveModal('milling')}
              onOpenIomModal={() => setActiveModal('iom')}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-200 bg-white py-6 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium text-stone-700">
            <span>Анализатор потенциала органомодификации бентонита</span>
            <span>•</span>
            <span className="text-stone-400">100% автономный расчет без ИИ</span>
          </div>
          <div className="text-stone-400 text-[11px]">
            Комплексная оценка качества и применимости бентонитового сырья
          </div>
        </div>
      </footer>

      {/* 5 Modals */}
      <ModalImpuritiesCalc
        isOpen={activeModal === 'impurities'}
        onClose={() => setActiveModal('none')}
        impurities={analysisResults.impurities}
        colorId={selectedColorId}
        effectiveSmectite={analysisResults.effectiveSmectite}
        smectiteSource={analysisResults.smectiteSource}
        cecStandardUsed={analysisResults.cecStandardUsed}
        cec={cec}
        inputSmectite={smectite}
      />

      <ModalColorInterpretation
        isOpen={activeModal === 'color'}
        onClose={() => setActiveModal('none')}
        selectedColorId={selectedColorId}
      />

      <ModalGelCharacteristics
        isOpen={activeModal === 'gel'}
        onClose={() => setActiveModal('none')}
        suitableIndustries={analysisResults.suitableIndustries}
        allIndustries={analysisResults.allIndustries}
      />

      <ModalMillingMethods
        isOpen={activeModal === 'milling'}
        onClose={() => setActiveModal('none')}
        suitableIndustries={analysisResults.suitableIndustries}
        allIndustries={analysisResults.allIndustries}
      />

      <ModalIomDetails
        isOpen={activeModal === 'iom'}
        onClose={() => setActiveModal('none')}
        iom={analysisResults.iom}
      />
    </div>
  );
}
