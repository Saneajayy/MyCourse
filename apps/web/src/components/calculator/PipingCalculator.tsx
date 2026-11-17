'use client';

import React, { useState, useMemo } from 'react';
import { Sigma, Copy, RotateCcw, Check, ChevronDown, X, Pipette, FlaskConical } from 'lucide-react';

export type PipingSubSection = 'using-kinematic' | 'using-absolute';

const SUBSECTIONS: { id: PipingSubSection; label: string }[] = [
  { id: 'using-kinematic', label: 'With kinematic viscosity' },
  { id: 'using-absolute', label: 'With absolute viscosity' },
];

// Custom SVGs matching the hydraulic app icons
function DiameterIcon({ className = 'w-5 h-5 text-black' }: { className?: string }) {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M5 12h14M7 9l-3 3 3 3M17 9l3 3-3 3" />
    </svg>
  );
}

function StreamlineIcon({ className = 'w-5 h-5 text-black' }: { className?: string }) {
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
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10h10M7 14h10" strokeDasharray="2 2" />
    </svg>
  );
}

function ViscosityPourIcon({ className = 'w-5 h-5 text-black' }: { className?: string }) {
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
      <path d="M14 4l5 5-9 9H5v-5l9-9z" />
      <path d="M19 13v6M17 19h4" />
    </svg>
  );
}

function CylinderAreaIcon({ className = 'w-5 h-5 text-black' }: { className?: string }) {
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
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
    </svg>
  );
}

function VelocityIcon({ className = 'w-5 h-5 text-black' }: { className?: string }) {
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
      <path d="M3 8h6M3 12h8M3 16h6" />
      <path d="M14 6l4 12 4-12" />
    </svg>
  );
}

function ReynoldsIcon({ className = 'text-black' }: { className?: string }) {
  return (
    <span
      className={`font-serif font-bold text-base leading-none select-none inline-flex items-baseline ${className}`}
    >
      R<sub className="font-sans text-[10px] font-bold">e</sub>
    </span>
  );
}

// Unit Definitions
export type FlowUnit = 'lpm' | 'm^3/s' | 'm^3/min';
export type DiameterUnit = 'mm' | 'cm' | 'm';
export type AreaUnit = 'mm^2' | 'cm^2' | 'm^2';
export type VelocityUnit = 'm/s' | 'cm/s' | 'km/h';
export type KinematicViscosityUnit = 'cSt' | 'stoke' | 'm^2/s';
export type AbsoluteViscosityUnit = 'cP' | 'poise' | 'Pa-s';

const UNIT_DISPLAY: Record<string, string> = {
  lpm: 'lpm',
  'm^3/s': 'm³/s',
  'm^3/min': 'm³/min',
  mm: 'mm',
  cm: 'cm',
  m: 'm',
  'mm^2': 'mm²',
  'cm^2': 'cm²',
  'm^2': 'm²',
  'm/s': 'm/s',
  'cm/s': 'cm/s',
  'km/h': 'km/h',
  cSt: 'cSt',
  stoke: 'St',
  'm^2/s': 'm²/s',
  cP: 'cP',
  poise: 'poise',
  'Pa-s': 'Pa·s',
};

// Conversions to SI base units
function flowToBase(val: number, unit: FlowUnit): number {
  if (unit === 'lpm') return (val * 0.001) / 60;
  if (unit === 'm^3/min') return val / 60;
  return val; // 'm^3/s'
}

function diameterToBase(val: number, unit: DiameterUnit): number {
  if (unit === 'mm') return val * 1e-3;
  if (unit === 'cm') return val * 1e-2;
  return val; // 'm'
}

function areaFromBase(val: number, unit: AreaUnit): number {
  if (unit === 'mm^2') return val * 1e6;
  if (unit === 'cm^2') return val * 1e4;
  return val; // 'm^2'
}

function velocityFromBase(val: number, unit: VelocityUnit): number {
  if (unit === 'cm/s') return val * 100;
  if (unit === 'km/h') return val * 3.6;
  return val; // 'm/s'
}

function kinematicToBase(val: number, unit: KinematicViscosityUnit): number {
  if (unit === 'cSt') return val * 1e-6;
  if (unit === 'stoke') return val * 1e-4;
  return val; // 'm^2/s'
}

function absoluteToBase(val: number, unit: AbsoluteViscosityUnit): number {
  if (unit === 'cP') return val * 1e-3;
  if (unit === 'poise') return val * 0.1;
  return val; // 'Pa-s'
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

export function PipingCalculator() {
  const [activeSubSection, setActiveSubSection] = useState<PipingSubSection>('using-kinematic');
  const [isSubSectionMenuOpen, setIsSubSectionMenuOpen] = useState(false);
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // -------------------------------------------------------------
  // Output Display Units
  // -------------------------------------------------------------
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('mm^2');
  const [velocityUnit, setVelocityUnit] = useState<VelocityUnit>('m/s');

  // -------------------------------------------------------------
  // Subsection 1: Using Kinematic Viscosity States (Image 1)
  // Inputs: Flow rate, Inside pipe diameter, Kinematic viscosity
  // -------------------------------------------------------------
  const [kvFlowStr, setKvFlowStr] = useState('');
  const [kvFlowUnit, setKvFlowUnit] = useState<FlowUnit>('lpm');

  const [kvDiameterStr, setKvDiameterStr] = useState('');
  const [kvDiameterUnit, setKvDiameterUnit] = useState<DiameterUnit>('mm');

  const [kvViscosityStr, setKvViscosityStr] = useState('');
  const [kvViscosityUnit, setKvViscosityUnit] = useState<KinematicViscosityUnit>('cSt');

  // -------------------------------------------------------------
  // Subsection 2: Using Absolute Viscosity States (Image 2)
  // Inputs: Flow rate, Specific gravity, Inside pipe diameter, Absolute viscosity
  // -------------------------------------------------------------
  const [avFlowStr, setAvFlowStr] = useState('');
  const [avFlowUnit, setAvFlowUnit] = useState<FlowUnit>('lpm');

  const [avSpecificGravityStr, setAvSpecificGravityStr] = useState('');

  const [avDiameterStr, setAvDiameterStr] = useState('');
  const [avDiameterUnit, setAvDiameterUnit] = useState<DiameterUnit>('mm');

  const [avViscosityStr, setAvViscosityStr] = useState('');
  const [avViscosityUnit, setAvViscosityUnit] = useState<AbsoluteViscosityUnit>('cP');

  // -------------------------------------------------------------
  // Calculations: Using Kinematic Viscosity (Image 3)
  // A = (PI * d^2) / 4
  // v = Q / A
  // Re = (v * d) / nu
  // -------------------------------------------------------------
  const kinematicCalculations = useMemo(() => {
    const flowNum = parseFloat(kvFlowStr);
    const dNum = parseFloat(kvDiameterStr);
    const nuNum = parseFloat(kvViscosityStr);

    const Q = !isNaN(flowNum) && flowNum > 0 ? flowToBase(flowNum, kvFlowUnit) : null;
    const d = !isNaN(dNum) && dNum > 0 ? diameterToBase(dNum, kvDiameterUnit) : null;
    const nu = !isNaN(nuNum) && nuNum > 0 ? kinematicToBase(nuNum, kvViscosityUnit) : null;

    let areaBase: number | null = null;
    let velocityBase: number | null = null;
    let reynolds: number | null = null;

    if (d !== null) {
      areaBase = (Math.PI * Math.pow(d, 2)) / 4;
    }

    if (Q !== null && areaBase !== null && areaBase > 0) {
      velocityBase = Q / areaBase;
    }

    if (velocityBase !== null && d !== null && nu !== null && nu > 0) {
      reynolds = (velocityBase * d) / nu;
    }

    return { areaBase, velocityBase, reynolds };
  }, [kvFlowStr, kvFlowUnit, kvDiameterStr, kvDiameterUnit, kvViscosityStr, kvViscosityUnit]);

  // -------------------------------------------------------------
  // Calculations: Using Absolute Viscosity (Image 4)
  // A = (PI * d^2) / 4
  // v = Q / A
  // Re = (1000 * v * d * S_g) / mu
  // -------------------------------------------------------------
  const absoluteCalculations = useMemo(() => {
    const flowNum = parseFloat(avFlowStr);
    const sgNum = parseFloat(avSpecificGravityStr);
    const dNum = parseFloat(avDiameterStr);
    const muNum = parseFloat(avViscosityStr);

    const Q = !isNaN(flowNum) && flowNum > 0 ? flowToBase(flowNum, avFlowUnit) : null;
    const Sg = !isNaN(sgNum) && sgNum > 0 ? sgNum : null;
    const d = !isNaN(dNum) && dNum > 0 ? diameterToBase(dNum, avDiameterUnit) : null;
    const mu = !isNaN(muNum) && muNum > 0 ? absoluteToBase(muNum, avViscosityUnit) : null;

    let areaBase: number | null = null;
    let velocityBase: number | null = null;
    let reynolds: number | null = null;

    if (d !== null) {
      areaBase = (Math.PI * Math.pow(d, 2)) / 4;
    }

    if (Q !== null && areaBase !== null && areaBase > 0) {
      velocityBase = Q / areaBase;
    }

    if (velocityBase !== null && d !== null && Sg !== null && mu !== null && mu > 0) {
      // Re = (rho * v * d) / mu, where rho = Sg * 1000 kg/m^3
      reynolds = (1000 * Sg * velocityBase * d) / mu;
    }

    return { areaBase, velocityBase, reynolds };
  }, [
    avFlowStr,
    avFlowUnit,
    avSpecificGravityStr,
    avDiameterStr,
    avDiameterUnit,
    avViscosityStr,
    avViscosityUnit,
  ]);

  // Active outputs depending on selected subsection
  const currentCalculations =
    activeSubSection === 'using-kinematic' ? kinematicCalculations : absoluteCalculations;

  const areaFormatted = currentCalculations.areaBase
    ? formatResult(areaFromBase(currentCalculations.areaBase, areaUnit))
    : '';

  const velocityFormatted = currentCalculations.velocityBase
    ? formatResult(velocityFromBase(currentCalculations.velocityBase, velocityUnit))
    : '';

  const reynoldsFormatted = currentCalculations.reynolds
    ? currentCalculations.reynolds >= 100
      ? currentCalculations.reynolds.toFixed(0)
      : currentCalculations.reynolds.toFixed(1)
    : '';

  // Reset
  const handleReset = () => {
    if (activeSubSection === 'using-kinematic') {
      setKvFlowStr('');
      setKvDiameterStr('');
      setKvViscosityStr('');
    } else {
      setAvFlowStr('');
      setAvSpecificGravityStr('');
      setAvDiameterStr('');
      setAvViscosityStr('');
    }
    setCopySuccess(false);
  };

  // Copy Summary
  const handleCopy = () => {
    let text = '';
    if (activeSubSection === 'using-kinematic') {
      text = [
        'HYDRAULIC PIPING - KINEMATIC VISCOSITY CALCULATION',
        '-------------------------------------------------',
        `Flow Rate: ${kvFlowStr || '-'} ${UNIT_DISPLAY[kvFlowUnit]}`,
        `Inside Pipe Diameter: ${kvDiameterStr || '-'} ${UNIT_DISPLAY[kvDiameterUnit]}`,
        `Kinematic Viscosity: ${kvViscosityStr || '-'} ${UNIT_DISPLAY[kvViscosityUnit]}`,
        '-------------------------------------------------',
        `Cross-sectional Area: ${areaFormatted || '-'} ${UNIT_DISPLAY[areaUnit]}`,
        `Velocity: ${velocityFormatted || '-'} ${UNIT_DISPLAY[velocityUnit]}`,
        `Reynolds Number: ${reynoldsFormatted || '-'}`,
      ].join('\n');
    } else {
      text = [
        'HYDRAULIC PIPING - ABSOLUTE VISCOSITY CALCULATION',
        '------------------------------------------------',
        `Flow Rate: ${avFlowStr || '-'} ${UNIT_DISPLAY[avFlowUnit]}`,
        `Specific Gravity: ${avSpecificGravityStr || '-'}`,
        `Inside Pipe Diameter: ${avDiameterStr || '-'} ${UNIT_DISPLAY[avDiameterUnit]}`,
        `Absolute Viscosity: ${avViscosityStr || '-'} ${UNIT_DISPLAY[avViscosityUnit]}`,
        '------------------------------------------------',
        `Cross-sectional Area: ${areaFormatted || '-'} ${UNIT_DISPLAY[areaUnit]}`,
        `Velocity: ${velocityFormatted || '-'} ${UNIT_DISPLAY[velocityUnit]}`,
        `Reynolds Number: ${reynoldsFormatted || '-'}`,
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
            <span>{currentSubSectionObj?.label || 'With kinematic viscosity'}</span>
            <ChevronDown
              className={`w-4 h-4 text-neutral-600 transition-transform ${
                isSubSectionMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu for 2 Subsections */}
          {isSubSectionMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsSubSectionMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-neutral-300 shadow-2xl z-40 py-1 rounded-none">
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
                    <span>{sub.label}</span>
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

      {/* SUBSECTION 1: USING KINEMATIC VISCOSITY (Image 1) */}
      {activeSubSection === 'using-kinematic' && (
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
                value={kvFlowStr}
                onChange={(e) => setKvFlowStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={kvFlowUnit}
                options={['lpm', 'm^3/s', 'm^3/min']}
                onSelect={setKvFlowUnit}
              />
            </div>
          </div>

          {/* Input 2: Inside pipe diameter */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <DiameterIcon className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">
                Inside pipe diameter
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={kvDiameterStr}
                onChange={(e) => setKvDiameterStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={kvDiameterUnit}
                options={['mm', 'cm', 'm']}
                onSelect={setKvDiameterUnit}
              />
            </div>
          </div>

          {/* Input 3: Kinematic viscosity */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <StreamlineIcon className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">
                Kinematic viscosity
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={kvViscosityStr}
                onChange={(e) => setKvViscosityStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={kvViscosityUnit}
                options={['cSt', 'stoke', 'm^2/s']}
                onSelect={setKvViscosityUnit}
              />
            </div>
          </div>
        </div>
      )}

      {/* SUBSECTION 2: USING ABSOLUTE VISCOSITY (Image 2) */}
      {activeSubSection === 'using-absolute' && (
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
                value={avFlowStr}
                onChange={(e) => setAvFlowStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={avFlowUnit}
                options={['lpm', 'm^3/s', 'm^3/min']}
                onSelect={setAvFlowUnit}
              />
            </div>
          </div>

          {/* Input 2: Specific gravity */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <FlaskConical className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">
                Specific gravity
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="e.g. 0.87"
                value={avSpecificGravityStr}
                onChange={(e) => setAvSpecificGravityStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
            </div>
          </div>

          {/* Input 3: Inside pipe diameter */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <DiameterIcon className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">
                Inside pipe diameter
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={avDiameterStr}
                onChange={(e) => setAvDiameterStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={avDiameterUnit}
                options={['mm', 'cm', 'm']}
                onSelect={setAvDiameterUnit}
              />
            </div>
          </div>

          {/* Input 4: Absolute viscosity */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <ViscosityPourIcon className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">
                Absolute viscosity
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={avViscosityStr}
                onChange={(e) => setAvViscosityStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={avViscosityUnit}
                options={['cP', 'poise', 'Pa-s']}
                onSelect={setAvViscosityUnit}
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. OUTPUTS SECTION (Shared between both subsections)          */}
      {/* ============================================================== */}

      {/* Output 1: Cross-sectional area */}
      <div className="px-4 sm:px-6 py-3.5 bg-neutral-50/50 border-b border-neutral-300 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
          <CylinderAreaIcon className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
          <span className="text-xs sm:text-sm font-bold text-neutral-900">
            Cross-sectional area
          </span>
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
          <div className="w-full h-10 px-3 bg-neutral-100 border border-neutral-300 flex items-center justify-end font-mono text-sm font-bold text-neutral-900">
            {areaFormatted}
          </div>
          <UnitDropdown
            currentUnit={areaUnit}
            options={['mm^2', 'cm^2', 'm^2']}
            onSelect={setAreaUnit}
          />
        </div>
      </div>

      {/* Output 2: Velocity */}
      <div className="px-4 sm:px-6 py-3.5 bg-neutral-50/50 border-b border-neutral-300 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
          <VelocityIcon className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
          <span className="text-xs sm:text-sm font-bold text-neutral-900">Velocity</span>
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
          <div className="w-full h-10 px-3 bg-neutral-100 border border-neutral-300 flex items-center justify-end font-mono text-sm font-bold text-neutral-900">
            {velocityFormatted}
          </div>
          <UnitDropdown
            currentUnit={velocityUnit}
            options={['m/s', 'cm/s', 'km/h']}
            onSelect={setVelocityUnit}
          />
        </div>
      </div>

      {/* Output 3: Reynolds number (Dimensionless) */}
      <div className="px-4 sm:px-6 py-3.5 bg-neutral-50/50 border-b border-neutral-300 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
          <div className="w-5 h-5 flex items-center justify-center shrink-0">
            <ReynoldsIcon className="text-black" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-neutral-900">Reynolds number</span>
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
          <div className="w-full h-10 px-3 bg-neutral-100 border border-neutral-300 flex items-center justify-end font-mono text-sm font-bold text-neutral-900">
            {reynoldsFormatted}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. BOTTOM ACTIONS (Copy, Reset)                                */}
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
      {/* 5. FORMULA MODAL DIALOG                                        */}
      {/* ============================================================== */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 select-none">
          <div className="w-full max-w-lg bg-white border border-black shadow-2xl rounded-none overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-black text-white px-5 py-4 flex items-center justify-between border-b border-black">
              <h3 className="text-base sm:text-lg font-extrabold uppercase tracking-tight">
                {activeSubSection === 'using-kinematic'
                  ? 'Piping - With kinematic viscosity'
                  : 'Piping - With absolute viscosity'}
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
              {activeSubSection === 'using-kinematic' ? (
                /* PIPING - KINEMATIC VISCOSITY FORMULA (Image 3) */
                <div className="py-4 space-y-6">
                  {/* Formula 1: Area */}
                  <div className="flex items-center justify-center gap-6">
                    <CylinderAreaIcon className="w-9 h-9 stroke-[1.5]" />
                    <div className="inline-flex items-center gap-3 font-serif text-lg sm:text-2xl text-neutral-900">
                      <span className="italic font-bold">A</span>
                      <span>=</span>
                      <div className="inline-flex flex-col items-center">
                        <span className="border-b-2 border-black px-3 pb-0.5 italic">π d²</span>
                        <span className="pt-0.5 italic font-sans text-base sm:text-xl">4</span>
                      </div>
                    </div>
                  </div>

                  {/* Formula 2: Velocity */}
                  <div className="flex items-center justify-center gap-6 pt-2">
                    <VelocityIcon className="w-9 h-9 stroke-[1.5]" />
                    <div className="inline-flex items-center gap-3 font-serif text-lg sm:text-2xl text-neutral-900">
                      <span className="italic font-bold">v</span>
                      <span>=</span>
                      <div className="inline-flex flex-col items-center">
                        <span className="border-b-2 border-black px-3 pb-0.5 italic">Q</span>
                        <span className="pt-0.5 italic">A</span>
                      </div>
                    </div>
                  </div>

                  {/* Formula 3: Reynolds Number */}
                  <div className="flex items-center justify-center gap-6 pt-2">
                    <ReynoldsIcon className="text-xl" />
                    <div className="inline-flex items-center gap-3 font-serif text-lg sm:text-2xl text-neutral-900">
                      <span className="italic font-bold">Re</span>
                      <span>=</span>
                      <div className="inline-flex flex-col items-center">
                        <span className="border-b-2 border-black px-3 pb-0.5 italic">
                          1000 × v × d
                        </span>
                        <span className="pt-0.5 italic">ν</span>
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="pt-6 border-t border-neutral-200 text-xs sm:text-sm text-neutral-700 space-y-1 text-center font-mono">
                    <p>
                      <span className="font-extrabold text-black">A</span> = Cross-sectional
                      area;&nbsp;
                      <span className="font-extrabold text-black">d</span> = Inside pipe diameter;
                    </p>
                    <p>
                      <span className="font-extrabold text-black">v</span> = Velocity;&nbsp;
                      <span className="font-extrabold text-black">Q</span> = Flow rate;&nbsp;
                      <span className="font-extrabold text-black">Re</span> = Reynolds number;
                    </p>
                    <p>
                      <span className="font-extrabold text-black">ν</span> = Kinematic viscosity
                    </p>
                  </div>
                </div>
              ) : (
                /* PIPING - ABSOLUTE VISCOSITY FORMULA (Image 4) */
                <div className="py-4 space-y-6">
                  {/* Formula 1: Area */}
                  <div className="flex items-center justify-center gap-6">
                    <CylinderAreaIcon className="w-9 h-9 stroke-[1.5]" />
                    <div className="inline-flex items-center gap-3 font-serif text-lg sm:text-2xl text-neutral-900">
                      <span className="italic font-bold">A</span>
                      <span>=</span>
                      <div className="inline-flex flex-col items-center">
                        <span className="border-b-2 border-black px-3 pb-0.5 italic">π d²</span>
                        <span className="pt-0.5 italic font-sans text-base sm:text-xl">4</span>
                      </div>
                    </div>
                  </div>

                  {/* Formula 2: Velocity */}
                  <div className="flex items-center justify-center gap-6 pt-2">
                    <VelocityIcon className="w-9 h-9 stroke-[1.5]" />
                    <div className="inline-flex items-center gap-3 font-serif text-lg sm:text-2xl text-neutral-900">
                      <span className="italic font-bold">v</span>
                      <span>=</span>
                      <div className="inline-flex flex-col items-center">
                        <span className="border-b-2 border-black px-3 pb-0.5 italic">Q</span>
                        <span className="pt-0.5 italic">A</span>
                      </div>
                    </div>
                  </div>

                  {/* Formula 3: Reynolds Number */}
                  <div className="flex items-center justify-center gap-6 pt-2">
                    <ReynoldsIcon className="text-xl" />
                    <div className="inline-flex items-center gap-3 font-serif text-lg sm:text-2xl text-neutral-900">
                      <span className="italic font-bold">Re</span>
                      <span>=</span>
                      <div className="inline-flex flex-col items-center">
                        <span className="border-b-2 border-black px-3 pb-0.5 italic">
                          1000 × v × d × S<sub>g</sub>
                        </span>
                        <span className="pt-0.5 italic">μ</span>
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="pt-6 border-t border-neutral-200 text-xs sm:text-sm text-neutral-700 space-y-1 text-center font-mono">
                    <p>
                      <span className="font-extrabold text-black">A</span> = Cross-sectional
                      area;&nbsp;
                      <span className="font-extrabold text-black">d</span> = Inside pipe diameter;
                    </p>
                    <p>
                      <span className="font-extrabold text-black">v</span> = Velocity;&nbsp;
                      <span className="font-extrabold text-black">Q</span> = Flow rate;&nbsp;
                      <span className="font-extrabold text-black">Re</span> = Reynolds number;
                    </p>
                    <p>
                      <span className="font-extrabold text-black">
                        S<sub>g</sub>
                      </span>{' '}
                      = Specific gravity;&nbsp;
                      <span className="font-extrabold text-black">μ</span> = Absolute viscosity
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
