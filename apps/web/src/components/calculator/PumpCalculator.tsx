'use client';

import React, { useState, useMemo } from 'react';
import {
  Sigma,
  Copy,
  RotateCcw,
  Check,
  ChevronDown,
  X,
  Gauge,
  Pipette,
  FlaskConical,
  Disc,
  Wrench,
  Zap,
} from 'lucide-react';

function EnergyRatingIcon({ className = 'w-5 h-5 text-black' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h6l2 2-2 2H4z" />
      <path d="M4 11h9l2 2-2 2H4z" />
      <path d="M4 16h12l2 2-2 2H4z" />
    </svg>
  );
}

export type PumpSubSection =
  | 'flow-rate'
  | 'displacement'
  | 'electric-motor-power'
  | 'total-efficiency';

const SUBSECTIONS: { id: PumpSubSection; label: string; available: boolean }[] = [
  { id: 'flow-rate', label: 'Flow rate', available: true },
  { id: 'displacement', label: 'Displacement', available: true },
  { id: 'electric-motor-power', label: 'Electric motor power', available: true },
  { id: 'total-efficiency', label: 'Total efficiency', available: true },
];

// Unit Definitions
export type FlowUnit = 'm^3/s' | 'm^3/min' | 'lpm';
export type DisplacementUnit = 'cm^3/rev' | 'm^3/rev';
export type SpeedUnit = 'rpm' | 'rps' | 'rad/s';
export type PressureUnit = 'Pa' | 'kPa' | 'bar';
export type PowerUnit = 'W' | 'kW' | 'hp';

const UNIT_DISPLAY: Record<string, string> = {
  'm^3/s': 'm³/s',
  'm^3/min': 'm³/min',
  lpm: 'lpm',
  'cm^3/rev': 'cm³/rev',
  'm^3/rev': 'm³/rev',
  rpm: 'rpm',
  rps: 'rps',
  'rad/s': 'rad/s',
  Pa: 'Pa',
  kPa: 'kPa',
  bar: 'bar',
  W: 'W',
  kW: 'kW',
  hp: 'hp',
  '%': '%',
};

// Conversions to SI base units
function displacementToBase(val: number, unit: DisplacementUnit): number {
  if (unit === 'cm^3/rev') return val * 1e-6;
  return val; // 'm^3/rev'
}

function displacementFromBase(val: number, unit: DisplacementUnit): number {
  if (unit === 'cm^3/rev') return val * 1e6;
  return val; // 'm^3/rev'
}

function speedToBase(val: number, unit: SpeedUnit): number {
  if (unit === 'rpm') return val / 60;
  if (unit === 'rad/s') return val / (2 * Math.PI);
  return val; // 'rps'
}

function flowToBase(val: number, unit: FlowUnit): number {
  if (unit === 'lpm') return (val * 0.001) / 60;
  if (unit === 'm^3/min') return val / 60;
  return val; // 'm^3/s'
}

function flowFromBase(val: number, unit: FlowUnit): number {
  if (unit === 'lpm') return val * 60000;
  if (unit === 'm^3/min') return val * 60;
  return val; // 'm^3/s'
}

function pressureToBase(val: number, unit: PressureUnit): number {
  if (unit === 'kPa') return val * 1000;
  if (unit === 'bar') return val * 100000;
  return val; // 'Pa'
}

function powerFromBase(val: number, unit: PowerUnit): number {
  if (unit === 'kW') return val / 1000;
  if (unit === 'hp') return val / 745.699872;
  return val; // 'W'
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

function UnitDropdown<T extends string>({
  currentUnit,
  options,
  onSelect,
}: UnitDropdownProps<T>) {
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
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
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
                {opt === currentUnit && <Check className="w-3.5 h-3.5 text-neutral-900 stroke-[2.5] shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function PumpCalculator() {
  const [activeSubSection, setActiveSubSection] = useState<PumpSubSection>('flow-rate');
  const [isSubSectionMenuOpen, setIsSubSectionMenuOpen] = useState(false);
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // -------------------------------------------------------------
  // Subsection 1: Flow Rate States (Image 3)
  // Inputs: Displacement, Speed, Volumetric efficiency
  // Output: Flow rate
  // -------------------------------------------------------------
  const [frDispStr, setFrDispStr] = useState('');
  const [frDispUnit, setFrDispUnit] = useState<DisplacementUnit>('cm^3/rev');

  const [frSpeedStr, setFrSpeedStr] = useState('');
  const [frSpeedUnit, setFrSpeedUnit] = useState<SpeedUnit>('rpm');

  const [frVolEffStr, setFrVolEffStr] = useState('');

  const [frResultUnit, setFrResultUnit] = useState<FlowUnit>('lpm');

  // -------------------------------------------------------------
  // Subsection 2: Displacement States (Image 4)
  // Inputs: Flow rate, Speed, Volumetric efficiency
  // Output: Displacement
  // -------------------------------------------------------------
  const [dispFlowStr, setDispFlowStr] = useState('');
  const [dispFlowUnit, setDispFlowUnit] = useState<FlowUnit>('lpm');

  const [dispSpeedStr, setDispSpeedStr] = useState('');
  const [dispSpeedUnit, setDispSpeedUnit] = useState<SpeedUnit>('rpm');

  const [dispVolEffStr, setDispVolEffStr] = useState('');

  const [dispResultUnit, setDispResultUnit] = useState<DisplacementUnit>('cm^3/rev');

  // -------------------------------------------------------------
  // Subsection 3: Electric Motor Power States (Image 2)
  // -------------------------------------------------------------
  const [empDispStr, setEmpDispStr] = useState('');
  const [empDispUnit, setEmpDispUnit] = useState<DisplacementUnit>('cm^3/rev');

  const [empPressureStr, setEmpPressureStr] = useState('');
  const [empPressureUnit, setEmpPressureUnit] = useState<PressureUnit>('bar');

  const [empSpeedStr, setEmpSpeedStr] = useState('');
  const [empSpeedUnit, setEmpSpeedUnit] = useState<SpeedUnit>('rpm');

  const [empMechEffStr, setEmpMechEffStr] = useState('');

  const [empFlowStr, setEmpFlowStr] = useState('');
  const [empFlowUnit, setEmpFlowUnit] = useState<FlowUnit>('lpm');

  const [empVolEffStr, setEmpVolEffStr] = useState('');

  const [empResultUnit, setEmpResultUnit] = useState<PowerUnit>('kW');

  // -------------------------------------------------------------
  // Subsection 4: Total Efficiency States (Image 3)
  // -------------------------------------------------------------
  const [teVolEffStr, setTeVolEffStr] = useState('');
  const [teMechEffStr, setTeMechEffStr] = useState('');

  // -------------------------------------------------------------
  // Calculation: Flow Rate (Image 2)
  // Q = V * N * (eta_v / 100)
  // -------------------------------------------------------------
  const flowRateCalculation = useMemo(() => {
    const dispNum = parseFloat(frDispStr);
    const speedNum = parseFloat(frSpeedStr);
    const volEffNum = parseFloat(frVolEffStr);

    const V = !isNaN(dispNum) && dispNum > 0 ? displacementToBase(dispNum, frDispUnit) : null;
    const N = !isNaN(speedNum) && speedNum > 0 ? speedToBase(speedNum, frSpeedUnit) : null;
    const etaV = !isNaN(volEffNum) && volEffNum > 0 ? volEffNum : null;

    if (V !== null && N !== null && etaV !== null) {
      // Q in m^3/s = V (m^3/rev) * N (rev/s) * (etaV / 100)
      const qBase = V * N * (etaV / 100);
      return qBase;
    }

    return null;
  }, [frDispStr, frDispUnit, frSpeedStr, frSpeedUnit, frVolEffStr]);

  const flowRateFormatted = flowRateCalculation
    ? formatResult(flowFromBase(flowRateCalculation, frResultUnit))
    : '';

  // -------------------------------------------------------------
  // Calculation: Displacement (Image 1)
  // V = Q / (N * (eta_v / 100))
  // -------------------------------------------------------------
  const displacementCalculation = useMemo(() => {
    const flowNum = parseFloat(dispFlowStr);
    const speedNum = parseFloat(dispSpeedStr);
    const volEffNum = parseFloat(dispVolEffStr);

    const Q = !isNaN(flowNum) && flowNum > 0 ? flowToBase(flowNum, dispFlowUnit) : null;
    const N = !isNaN(speedNum) && speedNum > 0 ? speedToBase(speedNum, dispSpeedUnit) : null;
    const etaV = !isNaN(volEffNum) && volEffNum > 0 ? volEffNum : null;

    if (Q !== null && N !== null && etaV !== null) {
      // V in m^3/rev = Q (m^3/s) / (N (rev/s) * (etaV / 100))
      const vBase = Q / (N * (etaV / 100));
      return vBase;
    }

    return null;
  }, [dispFlowStr, dispFlowUnit, dispSpeedStr, dispSpeedUnit, dispVolEffStr]);

  const displacementFormatted = displacementCalculation
    ? formatResult(displacementFromBase(displacementCalculation, dispResultUnit))
    : '';

  // -------------------------------------------------------------
  // Calculation: Electric Motor Power (Image 4)
  // P = (V * p * N) / (2 * PI * (eta_m / 100)) [using Displacement & Speed]
  // OR P = (Q * p) / ((eta_v / 100) * (eta_m / 100)) [using Flow rate & Pressure]
  // In SI base units: V (m^3/rev), p (Pa), N (rps), mechanical work/s = V * p * N
  // -------------------------------------------------------------
  const electricMotorPowerCalculation = useMemo(() => {
    const dispNum = parseFloat(empDispStr);
    const pressNum = parseFloat(empPressureStr);
    const speedNum = parseFloat(empSpeedStr);
    const mechEffNum = parseFloat(empMechEffStr);
    const flowNum = parseFloat(empFlowStr);
    const volEffNum = parseFloat(empVolEffStr);

    const V = !isNaN(dispNum) && dispNum > 0 ? displacementToBase(dispNum, empDispUnit) : null;
    const p = !isNaN(pressNum) && pressNum > 0 ? pressureToBase(pressNum, empPressureUnit) : null;
    const N = !isNaN(speedNum) && speedNum > 0 ? speedToBase(speedNum, empSpeedUnit) : null;
    const etaM = !isNaN(mechEffNum) && mechEffNum > 0 ? mechEffNum : null;
    const Q = !isNaN(flowNum) && flowNum > 0 ? flowToBase(flowNum, empFlowUnit) : null;
    const etaV = !isNaN(volEffNum) && volEffNum > 0 ? volEffNum : null;

    // Method 1: From Displacement, Pressure, Speed, Mechanical Efficiency
    if (V !== null && p !== null && N !== null && etaM !== null) {
      const pBase = (V * p * N) / (etaM / 100);
      return pBase;
    }

    // Method 2: From Flow Rate, Pressure, Volumetric Efficiency, Mechanical Efficiency
    if (Q !== null && p !== null && etaV !== null && etaM !== null) {
      const pBase = (Q * p) / ((etaV / 100) * (etaM / 100));
      return pBase;
    }

    return null;
  }, [
    empDispStr,
    empDispUnit,
    empPressureStr,
    empPressureUnit,
    empSpeedStr,
    empSpeedUnit,
    empMechEffStr,
    empFlowStr,
    empFlowUnit,
    empVolEffStr,
  ]);

  const empPowerFormatted = electricMotorPowerCalculation
    ? formatResult(powerFromBase(electricMotorPowerCalculation, empResultUnit))
    : '';

  // -------------------------------------------------------------
  // Calculation: Total Efficiency (Image 1)
  // eta = (eta_m / 100) * (eta_v / 100) * 100
  // -------------------------------------------------------------
  const totalEfficiencyCalculation = useMemo(() => {
    const volEffNum = parseFloat(teVolEffStr);
    const mechEffNum = parseFloat(teMechEffStr);

    const etaV = !isNaN(volEffNum) && volEffNum > 0 ? volEffNum : null;
    const etaM = !isNaN(mechEffNum) && mechEffNum > 0 ? mechEffNum : null;

    if (etaV !== null && etaM !== null) {
      const total = (etaM / 100) * (etaV / 100) * 100;
      return total;
    }

    return null;
  }, [teVolEffStr, teMechEffStr]);

  const teTotalEffFormatted = totalEfficiencyCalculation
    ? formatResult(totalEfficiencyCalculation)
    : '';

  // Reset
  const handleReset = () => {
    if (activeSubSection === 'flow-rate') {
      setFrDispStr('');
      setFrSpeedStr('');
      setFrVolEffStr('');
    } else if (activeSubSection === 'displacement') {
      setDispFlowStr('');
      setDispSpeedStr('');
      setDispVolEffStr('');
    } else if (activeSubSection === 'electric-motor-power') {
      setEmpDispStr('');
      setEmpPressureStr('');
      setEmpSpeedStr('');
      setEmpMechEffStr('');
      setEmpFlowStr('');
      setEmpVolEffStr('');
    } else if (activeSubSection === 'total-efficiency') {
      setTeVolEffStr('');
      setTeMechEffStr('');
    }
    setCopySuccess(false);
  };

  // Copy Summary
  const handleCopy = () => {
    let text = '';
    if (activeSubSection === 'flow-rate') {
      text = [
        'HYDRAULIC PUMP - FLOW RATE CALCULATION',
        '-------------------------------------',
        `Displacement: ${frDispStr || '-'} ${UNIT_DISPLAY[frDispUnit]}`,
        `Speed: ${frSpeedStr || '-'} ${UNIT_DISPLAY[frSpeedUnit]}`,
        `Volumetric Efficiency: ${frVolEffStr || '-'} %`,
        '-------------------------------------',
        `Calculated Flow Rate: ${flowRateFormatted || '-'} ${UNIT_DISPLAY[frResultUnit]}`,
      ].join('\n');
    } else if (activeSubSection === 'displacement') {
      text = [
        'HYDRAULIC PUMP - DISPLACEMENT CALCULATION',
        '----------------------------------------',
        `Flow Rate: ${dispFlowStr || '-'} ${UNIT_DISPLAY[dispFlowUnit]}`,
        `Speed: ${dispSpeedStr || '-'} ${UNIT_DISPLAY[dispSpeedUnit]}`,
        `Volumetric Efficiency: ${dispVolEffStr || '-'} %`,
        '----------------------------------------',
        `Calculated Displacement: ${displacementFormatted || '-'} ${UNIT_DISPLAY[dispResultUnit]}`,
      ].join('\n');
    } else if (activeSubSection === 'electric-motor-power') {
      text = [
        'HYDRAULIC PUMP - ELECTRIC MOTOR POWER CALCULATION',
        '-------------------------------------------------',
        `Displacement: ${empDispStr || '-'} ${UNIT_DISPLAY[empDispUnit]}`,
        `Pressure: ${empPressureStr || '-'} ${UNIT_DISPLAY[empPressureUnit]}`,
        `Speed: ${empSpeedStr || '-'} ${UNIT_DISPLAY[empSpeedUnit]}`,
        `Mechanical Efficiency: ${empMechEffStr || '-'} %`,
        `Flow Rate: ${empFlowStr || '-'} ${UNIT_DISPLAY[empFlowUnit]}`,
        `Volumetric Efficiency: ${empVolEffStr || '-'} %`,
        '-------------------------------------------------',
        `Calculated Electric Motor Power: ${empPowerFormatted || '-'} ${UNIT_DISPLAY[empResultUnit]}`,
      ].join('\n');
    } else if (activeSubSection === 'total-efficiency') {
      text = [
        'HYDRAULIC PUMP - TOTAL EFFICIENCY CALCULATION',
        '--------------------------------------------',
        `Volumetric Efficiency: ${teVolEffStr || '-'} %`,
        `Mechanical Efficiency: ${teMechEffStr || '-'} %`,
        '--------------------------------------------',
        `Calculated Total Efficiency: ${teTotalEffFormatted || '-'} %`,
      ].join('\n');
    }

    if (navigator?.clipboard && text) {
      navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  };

  const currentSubSectionObj = SUBSECTIONS.find((s) => s.id === activeSubSection);

  return (
    <div className="w-full max-w-2xl bg-white border border-neutral-300 rounded-none shadow-none font-reddit select-none overflow-hidden">
      {/* ============================================================== */}
      {/* 1. TOP HEADER: Formula Sheet Button & SubSection Dropdown      */}
      {/* ============================================================== */}
      <div className="relative px-4 sm:px-6 py-2.5 sm:py-3 border-b border-neutral-300 flex items-center justify-between bg-white z-20">
        <button
          type="button"
          onClick={() => setShowFormulaModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-neutral-50 active:bg-neutral-100 text-neutral-900 font-mono text-xs sm:text-sm font-bold border border-neutral-300 hover:border-neutral-400 transition-colors cursor-pointer rounded-none"
          title="View formulas breakdown"
        >
          <Sigma className="w-3.5 h-3.5 text-neutral-700" />
          <span>Formula Sheet</span>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsSubSectionMenuOpen(!isSubSectionMenuOpen)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-neutral-50 text-neutral-900 font-mono text-xs sm:text-sm font-bold border border-neutral-300 hover:border-neutral-400 transition-colors cursor-pointer rounded-none"
          >
            <span>{currentSubSectionObj?.label || 'Flow rate'}</span>
            <ChevronDown
              className={`w-4 h-4 text-neutral-600 transition-transform ${
                isSubSectionMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu for 4 Subsections */}
          {isSubSectionMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsSubSectionMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 top-full mt-1 w-56 sm:w-64 bg-white border border-neutral-300 shadow-2xl z-40 py-1 rounded-none">
                {SUBSECTIONS.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      setActiveSubSection(sub.id);
                      setIsSubSectionMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm font-bold transition-colors flex items-center justify-between cursor-pointer ${
                      sub.id === activeSubSection
                        ? 'bg-neutral-100 text-neutral-950'
                        : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-950'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{sub.label}</span>
                      {!sub.available && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 border ${
                            sub.id === activeSubSection
                              ? 'border-neutral-400 text-neutral-700'
                              : 'border-neutral-300 text-neutral-500'
                          }`}
                        >
                          Next
                        </span>
                      )}
                    </div>
                    {sub.id === activeSubSection && (
                      <Check className="w-4 h-4 text-neutral-900 stroke-[2.5]" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. SUBSECTION CONTENT                                         */}
      {/* ============================================================== */}

      {/* SUBSECTION 1: FLOW RATE (Image 3) */}
      {activeSubSection === 'flow-rate' && (
        <div>
          {/* Input 1: Displacement */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Disc className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">
                Displacement
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={frDispStr}
                onChange={(e) => setFrDispStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={frDispUnit}
                options={['cm^3/rev', 'm^3/rev']}
                onSelect={setFrDispUnit}
              />
            </div>
          </div>

          {/* Input 2: Speed */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">
                Speed
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={frSpeedStr}
                onChange={(e) => setFrSpeedStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={frSpeedUnit}
                options={['rpm', 'rps', 'rad/s']}
                onSelect={setFrSpeedUnit}
              />
            </div>
          </div>

          {/* Input 3: Volumetric efficiency */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <FlaskConical className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">
                Volumetric efficiency
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={frVolEffStr}
                onChange={(e) => setFrVolEffStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <div className="h-10 min-w-[70px] sm:min-w-[76px] px-2.5 bg-neutral-100 text-neutral-700 font-mono text-xs font-bold border border-neutral-300 flex items-center justify-center rounded-none">
                %
              </div>
            </div>
          </div>

          {/* Separator / Output Header */}
          <div className="px-4 sm:px-6 py-4 bg-neutral-50/50 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Pipette className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-tight">
                Flow rate
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <div className="w-full h-10 px-3 bg-neutral-100 border border-neutral-300 flex items-center justify-end font-mono text-sm font-bold text-neutral-900">
                {flowRateFormatted}
              </div>
              <UnitDropdown
                currentUnit={frResultUnit}
                options={['m^3/s', 'm^3/min', 'lpm']}
                onSelect={setFrResultUnit}
              />
            </div>
          </div>
        </div>
      )}

      {/* SUBSECTION 2: DISPLACEMENT (Image 4) */}
      {activeSubSection === 'displacement' && (
        <div>
          {/* Input 1: Flow rate */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Pipette className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">
                Flow rate
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={dispFlowStr}
                onChange={(e) => setDispFlowStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={dispFlowUnit}
                options={['m^3/s', 'm^3/min', 'lpm']}
                onSelect={setDispFlowUnit}
              />
            </div>
          </div>

          {/* Input 2: Speed */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">
                Speed
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={dispSpeedStr}
                onChange={(e) => setDispSpeedStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={dispSpeedUnit}
                options={['rpm', 'rps', 'rad/s']}
                onSelect={setDispSpeedUnit}
              />
            </div>
          </div>

          {/* Input 3: Volumetric efficiency */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <FlaskConical className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">
                Volumetric efficiency
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={dispVolEffStr}
                onChange={(e) => setDispVolEffStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <div className="h-10 min-w-[70px] sm:min-w-[76px] px-2.5 bg-neutral-100 text-neutral-700 font-mono text-xs font-bold border border-neutral-300 flex items-center justify-center rounded-none">
                %
              </div>
            </div>
          </div>

          {/* Separator / Output Header */}
          <div className="px-4 sm:px-6 py-4 bg-neutral-50/50 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Disc className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-tight">
                Displacement
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <div className="w-full h-10 px-3 bg-neutral-100 border border-neutral-300 flex items-center justify-end font-mono text-sm font-bold text-neutral-900">
                {displacementFormatted}
              </div>
              <UnitDropdown
                currentUnit={dispResultUnit}
                options={['cm^3/rev', 'm^3/rev']}
                onSelect={setDispResultUnit}
              />
            </div>
          </div>
        </div>
      )}

      {/* SUBSECTION 3: ELECTRIC MOTOR POWER (Image 2) */}
      {activeSubSection === 'electric-motor-power' && (
        <div>
          {/* Input 1: Displacement */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Disc className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">
                Displacement
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={empDispStr}
                onChange={(e) => setEmpDispStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={empDispUnit}
                options={['cm^3/rev', 'm^3/rev']}
                onSelect={setEmpDispUnit}
              />
            </div>
          </div>

          {/* Input 2: Pressure */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">
                Pressure
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={empPressureStr}
                onChange={(e) => setEmpPressureStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={empPressureUnit}
                options={['Pa', 'kPa', 'bar']}
                onSelect={setEmpPressureUnit}
              />
            </div>
          </div>

          {/* Input 3: Speed */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">
                Speed
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={empSpeedStr}
                onChange={(e) => setEmpSpeedStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={empSpeedUnit}
                options={['rpm', 'rps', 'rad/s']}
                onSelect={setEmpSpeedUnit}
              />
            </div>
          </div>

          {/* Input 4: Mechanical efficiency */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">
                Mechanical efficiency
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={empMechEffStr}
                onChange={(e) => setEmpMechEffStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <div className="h-10 min-w-[70px] sm:min-w-[76px] px-2.5 bg-neutral-100 text-neutral-700 font-mono text-xs font-bold border border-neutral-300 flex items-center justify-center rounded-none">
                %
              </div>
            </div>
          </div>

          {/* Input 5: Flow rate */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Pipette className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">
                Flow rate
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={empFlowStr}
                onChange={(e) => setEmpFlowStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={empFlowUnit}
                options={['m^3/s', 'm^3/min', 'lpm']}
                onSelect={setEmpFlowUnit}
              />
            </div>
          </div>

          {/* Input 6: Volumetric efficiency */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <FlaskConical className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">
                Volumetric efficiency
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={empVolEffStr}
                onChange={(e) => setEmpVolEffStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <div className="h-10 min-w-[70px] sm:min-w-[76px] px-2.5 bg-neutral-100 text-neutral-700 font-mono text-xs font-bold border border-neutral-300 flex items-center justify-center rounded-none">
                %
              </div>
            </div>
          </div>

          {/* Separator / Output Header */}
          <div className="px-4 sm:px-6 py-4 bg-neutral-50/50 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-tight">
                Electric motor power
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <div className="w-full h-10 px-3 bg-neutral-100 border border-neutral-300 flex items-center justify-end font-mono text-sm font-bold text-neutral-900">
                {empPowerFormatted}
              </div>
              <UnitDropdown
                currentUnit={empResultUnit}
                options={['W', 'kW', 'hp']}
                onSelect={setEmpResultUnit}
              />
            </div>
          </div>
        </div>
      )}

      {/* SUBSECTION 4: TOTAL EFFICIENCY (Image 3) */}
      {activeSubSection === 'total-efficiency' && (
        <div>
          {/* Input 1: Volumetric efficiency */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <FlaskConical className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">
                Volumetric efficiency
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={teVolEffStr}
                onChange={(e) => setTeVolEffStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <div className="h-10 min-w-[70px] sm:min-w-[76px] px-2.5 bg-neutral-100 text-neutral-700 font-mono text-xs font-bold border border-neutral-300 flex items-center justify-center rounded-none">
                %
              </div>
            </div>
          </div>

          {/* Input 2: Mechanical efficiency */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">
                Mechanical efficiency
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={teMechEffStr}
                onChange={(e) => setTeMechEffStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <div className="h-10 min-w-[70px] sm:min-w-[76px] px-2.5 bg-neutral-100 text-neutral-700 font-mono text-xs font-bold border border-neutral-300 flex items-center justify-center rounded-none">
                %
              </div>
            </div>
          </div>

          {/* Separator / Output Header */}
          <div className="px-4 sm:px-6 py-4 bg-neutral-50/50 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <EnergyRatingIcon className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-tight">
                Total efficiency
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <div className="w-full h-10 px-3 bg-neutral-100 border border-neutral-300 flex items-center justify-end font-mono text-sm font-bold text-neutral-900">
                {teTotalEffFormatted}
              </div>
              <div className="h-10 min-w-[70px] sm:min-w-[76px] px-2.5 bg-neutral-100 text-neutral-700 font-mono text-xs font-bold border border-neutral-300 flex items-center justify-center rounded-none">
                %
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. BOTTOM ACTIONS (Copy, Reset)                                */}
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
      {/* 4. FORMULA MODAL DIALOG                                        */}
      {/* ============================================================== */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 select-none">
          <div className="w-full max-w-lg bg-white border border-black shadow-2xl rounded-none overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-black text-white px-5 py-4 flex items-center justify-between border-b border-black">
              <h3 className="text-base sm:text-lg font-extrabold uppercase tracking-tight">
                {activeSubSection === 'electric-motor-power'
                  ? 'Pump - Electric motor power formula'
                  : activeSubSection === 'total-efficiency'
                  ? 'Pump - Total efficiency formula'
                  : activeSubSection === 'displacement'
                  ? 'Pump - Displacement formula'
                  : 'Pump - Flow rate formula'}
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

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto">
              {activeSubSection === 'electric-motor-power' ? (
                /* PUMP ELECTRIC MOTOR POWER FORMULA (Image 4) */
                <div className="text-center py-4 space-y-6">
                  <div className="flex justify-center text-black">
                    <Zap className="w-12 h-12 stroke-[1.5]" />
                  </div>

                  {/* Formula 1 */}
                  <div className="inline-flex items-center gap-3 font-serif text-lg sm:text-2xl text-neutral-900">
                    <span className="italic font-bold">P</span>
                    <span>=</span>
                    <div className="inline-flex flex-col items-center">
                      <span className="border-b-2 border-black px-4 pb-0.5 italic">V × p × N</span>
                      <div className="flex items-center gap-1 pt-1 text-xs sm:text-sm font-sans font-medium">
                        <span className="italic font-serif">2π</span>
                        <span className="px-0.5">×</span>
                        <div className="flex flex-col items-center">
                          <span className="border-b border-black px-1 pb-0.5 italic">η<sub>m</sub></span>
                          <span>100</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs uppercase font-extrabold tracking-widest text-neutral-400">
                    OR
                  </div>

                  <div className="text-xs font-bold text-neutral-600">
                    (Using flow rate)
                  </div>

                  {/* Formula 2 */}
                  <div className="inline-flex items-center gap-3 font-serif text-lg sm:text-2xl text-neutral-900">
                    <span className="italic font-bold">P</span>
                    <span>=</span>
                    <div className="inline-flex flex-col items-center">
                      <span className="border-b-2 border-black px-4 pb-0.5 italic">V × p × N</span>
                      <div className="flex items-center gap-1 pt-1 text-xs sm:text-sm font-sans font-medium">
                        <span className="italic font-serif">2π</span>
                        <span className="px-0.5">×</span>
                        <div className="flex flex-col items-center">
                          <span className="border-b border-black px-1 pb-0.5 italic">η<sub>m</sub></span>
                          <span>100</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs font-bold text-neutral-600">
                    Where
                  </div>

                  {/* Formula 3 (Where V = ...) */}
                  <div className="inline-flex items-center gap-3 font-serif text-base sm:text-xl text-neutral-900">
                    <span className="italic font-bold">V</span>
                    <span>=</span>
                    <div className="inline-flex flex-col items-center">
                      <span className="border-b-2 border-black px-4 pb-0.5 italic">Q</span>
                      <div className="flex items-center gap-1 pt-1 text-xs sm:text-sm font-sans font-medium">
                        <span className="italic font-serif">N</span>
                        <span className="px-0.5">×</span>
                        <div className="flex flex-col items-center">
                          <span className="border-b border-black px-1 pb-0.5 italic">η<sub>v</sub></span>
                          <span>100</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="pt-6 border-t border-neutral-200 text-xs sm:text-sm text-neutral-700 space-y-1 text-center font-mono">
                    <p>
                      <span className="font-extrabold text-black">V</span> = Displacement;&nbsp;
                      <span className="font-extrabold text-black">p</span> = Pressure;&nbsp;
                      <span className="font-extrabold text-black">N</span> = Speed
                    </p>
                    <p>
                      <span className="font-extrabold text-black">η<sub>m</sub></span> = Mechanical efficiency;&nbsp;
                      <span className="font-extrabold text-black">Q</span> = Flow rate;&nbsp;
                      <span className="font-extrabold text-black">η<sub>v</sub></span> = Volumetric efficiency
                    </p>
                  </div>
                </div>
              ) : activeSubSection === 'total-efficiency' ? (
                /* PUMP TOTAL EFFICIENCY FORMULA (Image 1) */
                <div className="text-center py-4 space-y-6">
                  <div className="flex justify-center text-black">
                    <EnergyRatingIcon className="w-12 h-12 stroke-[1.5]" />
                  </div>

                  <div className="inline-flex items-center gap-2 font-serif text-lg sm:text-2xl text-neutral-900">
                    <span className="italic font-bold">η</span>
                    <span>=</span>
                    <div className="inline-flex flex-col items-center text-xs sm:text-sm font-sans font-medium">
                      <span className="border-b border-black px-1.5 pb-0.5 italic">η<sub>m</sub></span>
                      <span>100</span>
                    </div>
                    <span>×</span>
                    <div className="inline-flex flex-col items-center text-xs sm:text-sm font-sans font-medium">
                      <span className="border-b border-black px-1.5 pb-0.5 italic">η<sub>v</sub></span>
                      <span>100</span>
                    </div>
                    <span>× 100</span>
                  </div>

                  {/* Legend */}
                  <div className="pt-6 border-t border-neutral-200 text-xs sm:text-sm text-neutral-700 space-y-1 text-center font-mono">
                    <p>
                      <span className="font-extrabold text-black">η<sub>m</sub></span> = Mechanical efficiency;&nbsp;
                      <span className="font-extrabold text-black">η<sub>v</sub></span> = Volumetric efficiency
                    </p>
                  </div>
                </div>
              ) : activeSubSection === 'displacement' ? (
                /* PUMP DISPLACEMENT FORMULA (Image 1) */
                <div className="text-center py-4 space-y-6">
                  <div className="flex justify-center text-black">
                    <Disc className="w-12 h-12 stroke-[1.5]" />
                  </div>

                  <div className="inline-flex items-center gap-3 font-serif text-lg sm:text-2xl text-neutral-900">
                    <span className="italic font-bold">V</span>
                    <span>=</span>
                    <div className="inline-flex flex-col items-center">
                      <span className="border-b-2 border-black px-4 pb-0.5 italic">Q</span>
                      <div className="flex items-center gap-1 pt-1 text-xs sm:text-sm font-sans font-medium">
                        <span className="italic font-serif">N</span>
                        <span className="px-0.5">×</span>
                        <div className="flex flex-col items-center">
                          <span className="border-b border-black px-1 pb-0.5 italic">η<sub>v</sub></span>
                          <span>100</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="pt-6 border-t border-neutral-200 text-xs sm:text-sm text-neutral-700 space-y-1 text-center font-mono">
                    <p>
                      <span className="font-extrabold text-black">Q</span> = Flow rate;&nbsp;
                      <span className="font-extrabold text-black">N</span> = Speed;&nbsp;
                      <span className="font-extrabold text-black">η<sub>v</sub></span> = Volumetric efficiency
                    </p>
                  </div>
                </div>
              ) : (
                /* PUMP FLOW RATE FORMULA (Image 2) */
                <div className="text-center py-4 space-y-6">
                  <div className="flex justify-center text-black">
                    <Pipette className="w-12 h-12 stroke-[1.5]" />
                  </div>

                  <div className="inline-flex items-center gap-2 font-serif text-lg sm:text-2xl text-neutral-900">
                    <span className="italic font-bold">Q</span>
                    <span>=</span>
                    <span className="italic font-serif">V × N × </span>
                    <div className="inline-flex flex-col items-center text-xs sm:text-sm font-sans font-medium">
                      <span className="border-b-2 border-black px-1.5 pb-0.5 italic">η<sub>v</sub></span>
                      <span>100</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="pt-6 border-t border-neutral-200 text-xs sm:text-sm text-neutral-700 space-y-1 text-center font-mono">
                    <p>
                      <span className="font-extrabold text-black">V</span> = Displacement;&nbsp;
                      <span className="font-extrabold text-black">N</span> = Speed;&nbsp;
                      <span className="font-extrabold text-black">η<sub>v</sub></span> = Volumetric efficiency
                    </p>
                  </div>
                </div>
              )}
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
