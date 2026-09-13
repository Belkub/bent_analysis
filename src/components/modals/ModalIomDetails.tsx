import React from 'react';
import { X, Award, CheckCircle2, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';
import { IomCalculationDetails } from '../../types';

interface ModalIomDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  iom: IomCalculationDetails;
}

export const ModalIomDetails: React.FC<ModalIomDetailsProps> = ({
  isOpen,
  onClose,
  iom,
}) => {
  if (!isOpen) return null;

  const benchmarkSamples = [
    { name: 'МТ-06 (Китайский эталон)', naCa: '1,70', siFe: '41,82 (73,19 / 1,75)', koe100: '1,27', iom: '90,3', rank: '1', note: 'Огромный отрыв: идеальная комбинация кремнезема, натрия и умеренной КОЕ' },
    { name: 'Желтая акт. (Марокко)', naCa: '1,22', siFe: '31,94 (65,07 / 2,04)', koe100: '1,15', iom: '44,8', rank: '2', note: 'Уверенное второе место, хорошая структурная база' },
    { name: 'Белая акт. (Марокко)', naCa: '1,23', siFe: '30,04 (66,09 / 2,20)', koe100: '1,09', iom: '40,3', rank: '4–5', note: 'Высокая чистота, но уступает МТ-06 по кремнезему' },
    { name: 'Грузия №10 (Аскангель)', naCa: '1,34', siFe: '19,12 (65,97 / 3,45)', koe100: '0,88', iom: '22,5', rank: '3', note: 'Природный натрий, на практике работает лучше за счет стабильной структуры' },
    { name: 'ДС (Десятый Склад)', naCa: '1,30', siFe: '11,25 (65,34 / 5,81)', koe100: '1,36', iom: '19,9', rank: '4–5', note: 'Жестко пенализируется за экстремальное содержание железа (5,81 %)' },
    { name: 'Грузия №5', naCa: '0,86', siFe: '19,85 (66,31 / 3,34)', koe100: '0,85', iom: '14,5', rank: '6', note: 'Падает на дно из-за низкого натрия и огромной мешающей КОЕ (117,4)' },
  ];

  return (
    <div
      id="modal-iom-backdrop"
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
    >
      <div
        id="modal-iom-container"
        className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Индекс Органомодифицируемости (ИОМ)
              </h3>
              <p className="text-xs text-stone-500">
                Физико-химический алгоритм комплексной оценки способности бентонита к интеркаляции ЧАС
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 flex-1 overflow-y-auto space-y-5 text-xs text-stone-700">
          {/* Formula Display */}
          <div className="p-4 rounded-xl bg-stone-900 text-white space-y-3">
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
              Математическая формула показателя
            </span>
            <div className="p-3 bg-stone-800/90 rounded-lg text-center font-mono text-base tracking-wide text-amber-300">
              ИОМ = ( W(Na₂O) / W(CaO) ) × ( W(SiO₂) / W(Fe₂O₃) ) × ( 100 / КОЕ )
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-stone-300 text-[11px] pt-1">
              <div className="p-2 bg-stone-800 rounded-md">
                <strong className="text-white block mb-0.5">Множитель 1 (Na/Ca):</strong>
                Оценивает потенциал первичного осмотического набухания пластинок.
              </div>
              <div className="p-2 bg-stone-800 rounded-md">
                <strong className="text-white block mb-0.5">Множитель 2 (Si/Fe):</strong>
                Оценивает структурную чистоту и наличие свободного кремнезема (распорок).
              </div>
              <div className="p-2 bg-stone-800 rounded-md">
                <strong className="text-white block mb-0.5">Множитель 3 (100/КОЕ):</strong>
                Вводит штраф за избыточный заряд (если КОЕ &gt; 100, множитель &lt; 1, понижая рейтинг).
              </div>
            </div>
          </div>

          {/* Current Sample Calculation */}
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-300 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900 text-sm">
                Расчет ИОМ для вашего образца
              </span>
              {iom.isCalculable ? (
                <span className="px-3 py-1 rounded-md bg-amber-800 text-white font-mono font-bold text-base shadow-2xs">
                  ИОМ = {iom.value}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-sm bg-red-100 text-red-800 font-medium">
                  Недостаточно данных
                </span>
              )}
            </div>

            {iom.isCalculable ? (
              <div className="space-y-2">
                <div className="p-3 bg-white rounded-lg border border-amber-200 font-mono text-xs flex flex-wrap items-center justify-between gap-2">
                  <span>
                    ИОМ = ({iom.multNaCa}) × ({iom.multSiFe}) × ({iom.multCec}) = <strong className="text-amber-800 font-bold text-sm">{iom.value}</strong>
                  </span>
                  <span className="text-[11px] text-stone-600 font-sans">
                    {iom.ratingLabel}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div className={`p-2 rounded-lg border ${iom.value >= 35 ? 'bg-emerald-100 border-emerald-400 font-bold' : 'bg-white border-stone-200'}`}>
                    <span className="block text-emerald-800">&gt; 35 – 40: Отлично</span>
                    <span className="text-stone-500 font-normal">Превосходный потенциал</span>
                  </div>
                  <div className={`p-2 rounded-lg border ${iom.value >= 20 && iom.value < 35 ? 'bg-blue-100 border-blue-400 font-bold' : 'bg-white border-stone-200'}`}>
                    <span className="block text-blue-800">20 – 35: Хорошо</span>
                    <span className="text-stone-500 font-normal">Высокая пригодность</span>
                  </div>
                  <div className={`p-2 rounded-lg border ${iom.value >= 16 && iom.value < 20 ? 'bg-amber-100 border-amber-400 font-bold' : 'bg-white border-stone-200'}`}>
                    <span className="block text-amber-800">16 – 20: Приемлемо</span>
                    <span className="text-stone-500 font-normal">Допустимо для базовых ОГ</span>
                  </div>
                  <div className={`p-2 rounded-lg border ${iom.value < 16 ? 'bg-red-100 border-red-400 font-bold' : 'bg-white border-stone-200'}`}>
                    <span className="block text-red-800">&lt; 16: Низкий</span>
                    <span className="text-stone-500 font-normal">Слабый выход ОМ</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-stone-600">
                Для расчета ИОМ необходимо заполнить: <strong className="text-amber-800">{iom.missingParams.join(', ')}</strong>.
              </div>
            )}
          </div>

          {/* Reference Benchmarks Table from иом.doc */}
          <div className="space-y-2">
            <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-700" />
              Таблица эталонных лабораторных образцов
            </h4>

            <div className="overflow-x-auto border border-stone-200 rounded-xl">
              <table className="min-w-full divide-y divide-stone-200 text-left">
                <thead className="bg-stone-100 text-[10px] font-bold text-stone-700 uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2.5">Образец</th>
                    <th className="px-3 py-2.5 text-center">Na₂O / CaO</th>
                    <th className="px-3 py-2.5 text-center">SiO₂ / Fe₂O₃</th>
                    <th className="px-3 py-2.5 text-center">100 / КОЕ</th>
                    <th className="px-3 py-2.5 text-center">ИОМ</th>
                    <th className="px-3 py-2.5 text-center">Ранг</th>
                    <th className="px-3 py-2.5">Физико-химический вывод</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 bg-white">
                  {benchmarkSamples.map((s, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/70">
                      <td className="px-3 py-2.5 font-bold text-stone-900 whitespace-nowrap">
                        {s.name}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-center text-stone-800">
                        {s.naCa}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-center text-stone-800">
                        {s.siFe}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-center text-stone-800">
                        {s.koe100}
                      </td>
                      <td className="px-3 py-2.5 font-mono font-bold text-center text-amber-800">
                        {s.iom}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-center text-stone-900">
                        {s.rank}
                      </td>
                      <td className="px-3 py-2.5 text-stone-600 leading-snug">
                        {s.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-stone-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
