'use client';

import React, { useState, useMemo } from 'react';
import {
  Sigma,
  Copy,
  RotateCcw,
  Check,
  ChevronDown,
  X,
  Pipette,
  CircleDot,
  FlaskConical,
  Gauge,
  SlidersHorizontal,
} from 'lucide-react';

// Unit Definitions
export type FlowUnit = 'm^3/s' | 'm^3/min' | 'lpm';
export type DiameterUnit = 'mm' | 'cm' | 'm';
export type PressureDropUnit = 'Pa' | 'kPa' | 'bar';

const UNIT_DISPLAY: Record<string, string> = {
  'm^3/s': 'm³/s',
  'm^3/min': 'm³/min',
  lpm: 'lpm',
  mm: 'mm',
  cm: 'cm',
  m: 'm',
  Pa: 'Pa',
  kPa: 'kPa',
  bar: 'bar',
};

// Conversions to base units (Formula uses: Q in LPM, d in mm, Delta P in kPa)
function flowToLpm(val: number, unit: FlowUnit): number {
  if (unit === 'm^3/s') return val * 60000;
  if (unit === 'm^3/min') return val * 1000;
  return val; // 'lpm'
}

function diamToMm(val: number, unit: DiameterUnit): number {
  if (unit === 'm') return val * 1000;
  if (unit === 'cm') return val * 10;
  return val; // 'mm'
}

function pressureFromKpa(valKpa: number, unit: PressureDropUnit): number {
  if (unit === 'bar') return valKpa / 100;
  if (unit === 'Pa') return valKpa * 1000;
  return valKpa; // 'kPa'
}

function formatResult(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val) || val <= 0) {
    return '';
  }
  let str: string;
  if (val >= 1000) str = val.toFixed(1);
  else if (val >= 100) str = val.toFixed(2);
  else if (val >= 1) str = val.toFixed(3);
  else str = val.toFixed(4);

  if (str.includes('.')) {
    str = str.replace(/\.?0+$/, '');
  }
  return str;
}

interface UnitDropdownProps<T extends string> {
  currentUnit: T;
  options: T[];
  onSelect: (newUnit: T) => void;
}

function UnitDropdown<T extends string>({ currentUnit, options, onSelect }: UnitDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 min-w-[76px] sm:min-w-[84px] px-2.5 bg-white hover:bg-neutral-50 active:bg-neutral-100 text-neutral-900 font-mono text-xs font-bold border border-neutral-300 hover:border-neutral-400 transition-all flex items-center justify-between gap-1.5 cursor-pointer select-none rounded-none shadow-none"
        title="Click to change unit"
      >
        <span className="whitespace-nowrap">{UNIT_DISPLAY[currentUnit] || currentUnit}</span>
        <ChevronDown className="w-3 h-3 text-neutral-500 shrink-0" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-full mt-1 w-full min-w-full bg-white border border-neutral-300 shadow-lg z-50 py-1 rounded-none">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onSelect(opt);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 text-xs font-mono transition-colors flex items-center justify-between gap-1.5 cursor-pointer ${
                  opt === currentUnit
                    ? 'bg-neutral-100 font-bold text-neutral-950'
                    : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950'
                }`}
              >
                <span className="whitespace-nowrap">{UNIT_DISPLAY[opt] || opt}</span>
                {opt === currentUnit && (
                  <Check className="w-3.5 h-3.5 text-neutral-900 stroke-[2.5] shrink-0" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function PressureDropCalculator() {
  const [flowStr, setFlowStr] = useState('');
  const [flowUnit, setFlowUnit] = useState<FlowUnit>('lpm');

  const [diamStr, setDiamStr] = useState('');
  const [diamUnit, setDiamUnit] = useState<DiameterUnit>('mm');

  const [coeffStr, setCoeffStr] = useState('');
  const [sgStr, setSgStr] = useState('');

  const [resultUnit, setResultUnit] = useState<PressureDropUnit>('kPa');
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // -------------------------------------------------------------
  // Calculation:
  // Delta P = [ Q / (0.021275 * pi * K * d^2) ]^2 * S_g
  // Where Q is in LPM, d is in mm, Delta P is in kPa
  // -------------------------------------------------------------
  const deltaPKpa = useMemo(() => {
    const qNum = parseFloat(flowStr);
    const dNum = parseFloat(diamStr);
    const kNum = parseFloat(coeffStr);
    const sgNum = parseFloat(sgStr);

    if (
      isNaN(qNum) ||
      qNum <= 0 ||
      isNaN(dNum) ||
      dNum <= 0 ||
      isNaN(kNum) ||
      kNum <= 0 ||
      isNaN(sgNum) ||
      sgNum <= 0
    ) {
      return null;
    }

    const Q_lpm = flowToLpm(qNum, flowUnit);
    const d_mm = diamToMm(dNum, diamUnit);
    const K = kNum;
    const Sg = sgNum;

    const denominator = 0.021275 * Math.PI * K * (d_mm * d_mm);
    if (denominator <= 0) return null;

    const bracket = Q_lpm / denominator;
    const resultKpa = bracket * bracket * Sg;
    return resultKpa;
  }, [flowStr, flowUnit, diamStr, diamUnit, coeffStr, sgStr]);

  const pressureDropFormatted =
    deltaPKpa !== null ? formatResult(pressureFromKpa(deltaPKpa, resultUnit)) : '';

  // Reset
  const handleReset = () => {
    setFlowStr('');
    setDiamStr('');
    setCoeffStr('');
    setSgStr('');
    setCopySuccess(false);
  };

  // Copy Summary
  const handleCopy = () => {
    const text = [
      'HYDRAULIC PRESSURE DROP CALCULATION',
      '-----------------------------------',
      `Flow rate: ${flowStr || '-'} ${UNIT_DISPLAY[flowUnit]}`,
      `Diameter: ${diamStr || '-'} ${UNIT_DISPLAY[diamUnit]}`,
      `Orifice flow coefficient: ${coeffStr || '-'}`,
      `Specific gravity of fluid: ${sgStr || '-'}`,
      '-----------------------------------',
      `Calculated Pressure drop: ${pressureDropFormatted || '-'} ${UNIT_DISPLAY[resultUnit]}`,
    ].join('\n');

    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  };

  return (
    <div className="w-full max-w-2xl bg-white border border-neutral-300 rounded-none shadow-none font-reddit select-none overflow-hidden">
      {/* Top Header Strip with Sigma Formula Button (Left aligned matching subsection modules) */}
      <div className="relative px-4 sm:px-6 py-2.5 sm:py-3 bg-white border-b border-neutral-300 flex items-center justify-start z-20">
        <button
          type="button"
          onClick={() => setShowFormulaModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-neutral-50 active:bg-neutral-100 text-neutral-900 font-mono text-xs sm:text-sm font-bold border border-neutral-300 hover:border-neutral-400 transition-colors cursor-pointer rounded-none"
          title="View formulas breakdown"
        >
          <Sigma className="w-3.5 h-3.5 text-neutral-700" />
          <span>Formula Sheet</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 1. INPUTS SECTION                                              */}
      {/* ============================================================== */}
      <div>
        {/* Input 1: Flow rate */}
        <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
            <Pipette className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-neutral-900">Flow rate</span>
          </div>
          <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
            <input
              type="number"
              step="any"
              placeholder="0"
              value={flowStr}
              onChange={(e) => setFlowStr(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
            />
            <UnitDropdown
              currentUnit={flowUnit}
              options={['m^3/s', 'm^3/min', 'lpm']}
              onSelect={setFlowUnit}
            />
          </div>
        </div>

        {/* Input 2: Diameter */}
        <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
            <CircleDot className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-neutral-900">Diameter</span>
          </div>
          <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
            <input
              type="number"
              step="any"
              placeholder="0"
              value={diamStr}
              onChange={(e) => setDiamStr(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
            />
            <UnitDropdown
              currentUnit={diamUnit}
              options={['mm', 'cm', 'm']}
              onSelect={setDiamUnit}
            />
          </div>
        </div>

        {/* Input 3: Orifice flow coefficient (Dimensionless) */}
        <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
            <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-neutral-900">
              Orifice flow coefficient
            </span>
          </div>
          <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
            <input
              type="number"
              step="any"
              placeholder="e.g. 0.62"
              value={coeffStr}
              onChange={(e) => setCoeffStr(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
            />
            <div className="w-[70px] sm:w-[76px] shrink-0" />
          </div>
        </div>

        {/* Input 4: Specific gravity of fluid (Dimensionless) */}
        <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
            <FlaskConical className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-neutral-900">
              Specific gravity of fluid
            </span>
          </div>
          <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
            <input
              type="number"
              step="any"
              placeholder="e.g. 0.87"
              value={sgStr}
              onChange={(e) => setSgStr(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
            />
            <div className="w-[70px] sm:w-[76px] shrink-0" />
          </div>
        </div>

        {/* Output: Pressure drop */}
        <div className="px-4 sm:px-6 py-4 bg-neutral-50/50 border-b border-neutral-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
            <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
            <span className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-tight">
              Pressure drop
            </span>
          </div>
          <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
            <div className="w-full h-10 px-3 bg-neutral-100 border border-neutral-300 flex items-center justify-end font-mono text-sm font-bold text-neutral-900">
              {pressureDropFormatted}
            </div>
            <UnitDropdown
              currentUnit={resultUnit}
              options={['Pa', 'kPa', 'bar']}
              onSelect={setResultUnit}
            />
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. BOTTOM ACTIONS (Copy, Reset)                                */}
      {/* ============================================================== */}
      <div className="p-4 sm:px-6 sm:py-5 grid grid-cols-2 gap-3 bg-neutral-50">
        <button
          type="button"
          onClick={handleCopy}
          className="h-10 sm:h-11 bg-black hover:bg-[#262626] text-white font-bold text-xs uppercase tracking-wider border border-black transition-colors cursor-pointer flex items-center justify-center gap-1.5 rounded-none shadow-none"
        >
          <Copy className="w-4 h-4" />
          <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="h-10 sm:h-11 bg-white hover:bg-neutral-100 active:bg-neutral-200 text-neutral-800 font-bold text-xs uppercase tracking-wider border border-neutral-300 hover:border-neutral-400 transition-colors cursor-pointer flex items-center justify-center gap-1.5 rounded-none shadow-none"
        >
          <RotateCcw className="w-4 h-4 text-neutral-600" />
          <span>Reset</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 3. FORMULA MODAL DIALOG                                        */}
      {/* ============================================================== */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 select-none">
          <div className="w-full max-w-lg bg-white border border-black shadow-2xl rounded-none overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-black text-white px-5 py-4 flex items-center justify-between border-b border-black">
              <h3 className="text-base sm:text-lg font-extrabold uppercase tracking-tight">
                Pressure drop formula
              </h3>
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="text-white hover:bg-white/20 p-1 rounded-none transition-colors cursor-pointer"
                aria-label="Close formula modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content (Matching Image 2) */}
            <div className="p-6 overflow-y-auto space-y-6 text-center">
              <div className="flex justify-center text-black">
                <Gauge className="w-12 h-12 stroke-[1.5]" />
              </div>

              {/* Formula */}
              <div className="inline-flex items-center gap-3 font-serif text-lg sm:text-2xl text-neutral-900">
                <span className="italic font-bold">ΔP</span>
                <span>=</span>
                <span className="text-2xl sm:text-3xl font-light">[</span>
                <div className="inline-flex flex-col items-center">
                  <span className="border-b-2 border-black px-4 pb-0.5 italic">Q</span>
                  <span className="pt-1 text-xs sm:text-sm font-sans font-medium">
                    0.021275 π K d²
                  </span>
                </div>
                <span className="text-2xl sm:text-3xl font-light">]²</span>
                <span>×</span>
                <span className="italic font-serif">
                  S<sub>g</sub>
                </span>
              </div>

              {/* Legend */}
              <div className="pt-6 border-t border-neutral-200 text-xs sm:text-sm text-neutral-700 space-y-1.5 text-center font-mono">
                <p>
                  <span className="font-extrabold text-black">Q</span> = Flow rate;&nbsp;
                  <span className="font-extrabold text-black">K</span> = Orifice flow coefficient;
                </p>
                <p>
                  <span className="font-extrabold text-black">d</span> = Diameter;&nbsp;
                  <span className="font-extrabold text-black">
                    S<sub>g</sub>
                  </span>{' '}
                  = Specific gravity of fluid
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-neutral-100 border-t border-black text-right">
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="px-5 py-2 bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-none cursor-pointer border border-black"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
