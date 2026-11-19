'use client';

import React, { useState, useMemo } from 'react';
import {
  CircleDot,
  Circle,
  Ruler,
  Gauge,
  Pipette,
  Grid3X3,
  FlaskConical,
  ArrowRight,
  Clock,
  Wind,
  GitFork,
  PieChart,
  Sigma,
  Copy,
  RotateCcw,
  Check,
  ChevronDown,
  X,
} from 'lucide-react';

// Unit Type Definitions
export type LengthUnit = 'mm' | 'cm' | 'm';
export type PressureUnit = 'bar' | 'Pa' | 'MPa';
export type FlowUnit = 'lpm' | 'm^3/min' | 'cm^3/min';
export type AreaUnit = 'cm^2' | 'm^2' | 'mm^2';
export type VolumeUnit = 'l' | 'cm^3' | 'm^3';
export type ForceUnit = 'kN' | 'N' | 'dyn' | 'kgf';
export type TimeUnit = 'sec' | 'min' | 'ms';
export type VelocityUnit = 'm/s' | 'cm/s';

// Pretty display labels with superscripts
const UNIT_DISPLAY: Record<string, string> = {
  mm: 'mm',
  cm: 'cm',
  m: 'm',
  bar: 'bar',
  Pa: 'Pa',
  MPa: 'MPa',
  lpm: 'lpm',
  'm^3/min': 'm³/min',
  'cm^3/min': 'cm³/min',
  'cm^2': 'cm²',
  'm^2': 'm²',
  'mm^2': 'mm²',
  l: 'l',
  'cm^3': 'cm³',
  'm^3': 'm³',
  kN: 'kN',
  N: 'N',
  dyn: 'dyn',
  kgf: 'kgf',
  sec: 'sec',
  min: 'min',
  ms: 'ms',
  'm/s': 'm/s',
  'cm/s': 'cm/s',
};

// Conversions to SI base units
function lengthToBase(val: number, unit: LengthUnit): number {
  if (unit === 'mm') return val * 0.001;
  if (unit === 'cm') return val * 0.01;
  return val; // 'm'
}

function pressureToBase(val: number, unit: PressureUnit): number {
  if (unit === 'bar') return val * 100000;
  if (unit === 'MPa') return val * 1000000;
  return val; // 'Pa'
}

function flowToBase(val: number, unit: FlowUnit): number {
  if (unit === 'lpm') return (val * 0.001) / 60; // m^3/s
  if (unit === 'm^3/min') return val / 60;
  return (val * 1e-6) / 60; // 'cm^3/min'
}

// Conversions from SI base units to selected unit
function areaFromBase(val: number, unit: AreaUnit): number {
  if (unit === 'cm^2') return val * 10000;
  if (unit === 'mm^2') return val * 1000000;
  return val; // 'm^2'
}

function volumeFromBase(val: number, unit: VolumeUnit): number {
  if (unit === 'l') return val * 1000;
  if (unit === 'cm^3') return val * 1000000;
  return val; // 'm^3'
}

function forceFromBase(val: number, unit: ForceUnit): number {
  if (unit === 'kN') return val / 1000;
  if (unit === 'N') return val;
  if (unit === 'dyn') return val * 100000;
  return val / 9.80665; // 'kgf'
}

function timeFromBase(val: number, unit: TimeUnit): number {
  if (unit === 'sec') return val;
  if (unit === 'min') return val / 60;
  return val * 1000; // 'ms'
}

function velocityFromBase(val: number, unit: VelocityUnit): number {
  if (unit === 'm/s') return val;
  return val * 100; // 'cm/s'
}

function flowFromBase(val: number, unit: FlowUnit): number {
  if (unit === 'lpm') return val * 60000;
  if (unit === 'm^3/min') return val * 60;
  return val * 6e7; // 'cm^3/min'
}

function pressureFromBase(val: number, unit: PressureUnit): number {
  if (unit === 'bar') return val / 100000;
  if (unit === 'MPa') return val / 1000000;
  return val; // 'Pa'
}

function forceToBase(val: number, unit: ForceUnit): number {
  if (unit === 'kN') return val * 1000;
  if (unit === 'N') return val;
  if (unit === 'dyn') return val / 100000;
  return val * 9.80665; // 'kgf'
}

function timeToBase(val: number, unit: TimeUnit): number {
  if (unit === 'sec') return val;
  if (unit === 'min') return val * 60;
  return val * 0.001; // 'ms'
}

function velocityToBase(val: number, unit: VelocityUnit): number {
  if (unit === 'm/s') return val;
  return val * 0.01; // 'cm/s'
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
        className="h-10 min-w-[76px] sm:min-w-[84px] px-2.5 bg-[#1b1c20] hover:bg-[#22242a] text-[#c2c4cc] hover:text-white font-mono text-xs font-medium border border-white/[0.08] hover:border-white/[0.14] transition-all flex items-center justify-between gap-1.5 cursor-pointer select-none rounded-lg shadow-none"
        title="Click to change unit"
      >
        <span className="whitespace-nowrap">{UNIT_DISPLAY[currentUnit] || currentUnit}</span>
        <ChevronDown className="w-3 h-3 text-[#80828d] shrink-0" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-full mt-1 w-full min-w-full bg-[#18191c] border border-white/[0.1] shadow-2xl z-50 py-1 rounded-lg overflow-hidden">
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
                    ? 'bg-white/10 font-medium text-white'
                    : 'text-[#c2c4cc] hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <span className="whitespace-nowrap">{UNIT_DISPLAY[opt] || opt}</span>
                {opt === currentUnit && (
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5] shrink-0" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function CylinderCalculator() {
  // Input Values
  const [boreStr, setBoreStr] = useState('');
  const [rodStr, setRodStr] = useState('');
  const [strokeStr, setStrokeStr] = useState('');
  const [pressureStr, setPressureStr] = useState('');
  const [flowStr, setFlowStr] = useState('');

  // Units State
  const [boreUnit, setBoreUnit] = useState<LengthUnit>('mm');
  const [rodUnit, setRodUnit] = useState<LengthUnit>('mm');
  const [strokeUnit, setStrokeUnit] = useState<LengthUnit>('mm');
  const [pressureUnit, setPressureUnit] = useState<PressureUnit>('bar');
  const [flowUnit, setFlowUnit] = useState<FlowUnit>('lpm');

  // Output Units State
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('cm^2');
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>('l');
  const [forceUnit, setForceUnit] = useState<ForceUnit>('kN');
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('sec');
  const [velocityUnit, setVelocityUnit] = useState<VelocityUnit>('m/s');
  const [outflowUnit, setOutflowUnit] = useState<FlowUnit>('lpm');

  // Interactive Editable Fields in Results Section (Force, Time, Velocity)
  type EditableField = 'forceBore' | 'forceRod' | 'timeBore' | 'timeRod' | 'velBore' | 'velRod';

  const [activeField, setActiveField] = useState<EditableField | null>(null);
  const [localInputValues, setLocalInputValues] = useState<Record<string, string>>({});

  // Formula Modal State
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Calculations in SI Base Units
  const calculations = useMemo(() => {
    const boreNum = parseFloat(boreStr);
    const rodNum = parseFloat(rodStr);
    const strokeNum = parseFloat(strokeStr);
    const pressureNum = parseFloat(pressureStr);
    const flowNum = parseFloat(flowStr);

    const D = !isNaN(boreNum) && boreNum > 0 ? lengthToBase(boreNum, boreUnit) : null;
    const d = !isNaN(rodNum) && rodNum > 0 ? lengthToBase(rodNum, rodUnit) : null;
    const L = !isNaN(strokeNum) && strokeNum > 0 ? lengthToBase(strokeNum, strokeUnit) : null;
    const P =
      !isNaN(pressureNum) && pressureNum > 0 ? pressureToBase(pressureNum, pressureUnit) : null;
    const Q = !isNaN(flowNum) && flowNum > 0 ? flowToBase(flowNum, flowUnit) : null;

    if (!D) return null;

    // Area
    const R = D / 2;
    const areaBore = Math.PI * R * R;
    const r = d ? d / 2 : 0;
    const areaRod = d && d < D ? areaBore - Math.PI * r * r : null;

    // Volume
    const volBore = L ? areaBore * L : null;
    const volRod = L && areaRod ? areaRod * L : null;

    // Force (F = P * A)
    const forceBore = P ? P * areaBore : null;
    const forceRod = P && areaRod ? P * areaRod : null;

    // Time (T = V / Q)
    const timeBore = volBore && Q ? volBore / Q : null;
    const timeRod = volRod && Q ? volRod / Q : null;

    // Velocity (v = L / T = Q / A)
    const velBore = L && timeBore ? L / timeBore : null;
    const velRod = L && timeRod ? L / timeRod : null;

    // Ratio (Z = Area_bore / Area_rod)
    const ratio = areaRod && areaRod > 0 ? areaBore / areaRod : null;

    // Outflow
    const outflowBore = Q && ratio ? Q / ratio : null;
    const outflowRod = Q && ratio ? Q * ratio : null;

    return {
      areaBore,
      areaRod,
      volBore,
      volRod,
      forceBore,
      forceRod,
      timeBore,
      timeRod,
      velBore,
      velRod,
      ratio,
      outflowBore,
      outflowRod,
    };
  }, [
    boreStr,
    rodStr,
    strokeStr,
    pressureStr,
    flowStr,
    boreUnit,
    rodUnit,
    strokeUnit,
    pressureUnit,
    flowUnit,
  ]);

  // Formatted Output Values in Selected Units
  const areaBoreFormatted = calculations?.areaBore
    ? formatResult(areaFromBase(calculations.areaBore, areaUnit))
    : '';
  const areaRodFormatted = calculations?.areaRod
    ? formatResult(areaFromBase(calculations.areaRod, areaUnit))
    : '';

  const volBoreFormatted = calculations?.volBore
    ? formatResult(volumeFromBase(calculations.volBore, volumeUnit))
    : '';
  const volRodFormatted = calculations?.volRod
    ? formatResult(volumeFromBase(calculations.volRod, volumeUnit))
    : '';

  const forceBoreFormatted = calculations?.forceBore
    ? formatResult(forceFromBase(calculations.forceBore, forceUnit))
    : '';
  const forceRodFormatted = calculations?.forceRod
    ? formatResult(forceFromBase(calculations.forceRod, forceUnit))
    : '';

  const timeBoreFormatted = calculations?.timeBore
    ? formatResult(timeFromBase(calculations.timeBore, timeUnit))
    : '';
  const timeRodFormatted = calculations?.timeRod
    ? formatResult(timeFromBase(calculations.timeRod, timeUnit))
    : '';

  const velBoreFormatted = calculations?.velBore
    ? formatResult(velocityFromBase(calculations.velBore, velocityUnit))
    : '';
  const velRodFormatted = calculations?.velRod
    ? formatResult(velocityFromBase(calculations.velRod, velocityUnit))
    : '';

  const outflowBoreFormatted = calculations?.outflowBore
    ? formatResult(flowFromBase(calculations.outflowBore, outflowUnit))
    : '';
  const outflowRodFormatted = calculations?.outflowRod
    ? formatResult(flowFromBase(calculations.outflowRod, outflowUnit))
    : '';

  const ratioFormatted = calculations?.ratio ? calculations.ratio.toFixed(2) : '';

  // Two-way Interactive Field Handlers
  const handleFieldChange = (field: EditableField, val: string) => {
    setLocalInputValues((prev) => ({ ...prev, [field]: val }));

    if (val.trim() === '') {
      if (field === 'forceBore' || field === 'forceRod') {
        setPressureStr('');
      } else {
        setFlowStr('');
      }
      return;
    }

    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) return;

    if (field === 'forceBore') {
      if (calculations?.areaBore) {
        const fBase = forceToBase(num, forceUnit);
        const pBase = fBase / calculations.areaBore;
        const pDisp = pressureFromBase(pBase, pressureUnit);
        setPressureStr(formatResult(pDisp));
      }
    } else if (field === 'forceRod') {
      if (calculations?.areaRod) {
        const fBase = forceToBase(num, forceUnit);
        const pBase = fBase / calculations.areaRod;
        const pDisp = pressureFromBase(pBase, pressureUnit);
        setPressureStr(formatResult(pDisp));
      }
    } else if (field === 'timeBore') {
      if (calculations?.volBore) {
        const tBase = timeToBase(num, timeUnit);
        const qBase = calculations.volBore / tBase;
        const qDisp = flowFromBase(qBase, flowUnit);
        setFlowStr(formatResult(qDisp));
      }
    } else if (field === 'timeRod') {
      if (calculations?.volRod) {
        const tBase = timeToBase(num, timeUnit);
        const qBase = calculations.volRod / tBase;
        const qDisp = flowFromBase(qBase, flowUnit);
        setFlowStr(formatResult(qDisp));
      }
    } else if (field === 'velBore') {
      if (calculations?.areaBore) {
        const vBase = velocityToBase(num, velocityUnit);
        const qBase = vBase * calculations.areaBore;
        const qDisp = flowFromBase(qBase, flowUnit);
        setFlowStr(formatResult(qDisp));
      }
    } else if (field === 'velRod') {
      if (calculations?.areaRod) {
        const vBase = velocityToBase(num, velocityUnit);
        const qBase = vBase * calculations.areaRod;
        const qDisp = flowFromBase(qBase, flowUnit);
        setFlowStr(formatResult(qDisp));
      }
    }
  };

  const getInputValue = (field: EditableField, formattedVal: string) => {
    if (activeField === field) {
      return localInputValues[field] ?? '';
    }
    return formattedVal;
  };

  const handleFocusField = (field: EditableField, formattedVal: string) => {
    setActiveField(field);
    setLocalInputValues((prev) => ({ ...prev, [field]: formattedVal }));
  };

  // Reset
  const handleReset = () => {
    setBoreStr('');
    setRodStr('');
    setStrokeStr('');
    setPressureStr('');
    setFlowStr('');
    setActiveField(null);
    setLocalInputValues({});
    setCopySuccess(false);
  };

  // Copy Summary
  const handleCopy = () => {
    const text = [
      'HYDRAULIC CYLINDER CALCULATION SUMMARY',
      '---------------------------------------',
      `Piston/Bore Diameter: ${boreStr || '-'} ${UNIT_DISPLAY[boreUnit]}`,
      `Rod Diameter: ${rodStr || '-'} ${UNIT_DISPLAY[rodUnit]}`,
      `Stroke: ${strokeStr || '-'} ${UNIT_DISPLAY[strokeUnit]}`,
      `Pressure: ${pressureStr || '-'} ${UNIT_DISPLAY[pressureUnit]}`,
      `Oil Flow: ${flowStr || '-'} ${UNIT_DISPLAY[flowUnit]}`,
      '',
      `[Bore Side / Rod Side]`,
      `Area: ${areaBoreFormatted || '-'} / ${areaRodFormatted || '-'} ${UNIT_DISPLAY[areaUnit]}`,
      `Volume: ${volBoreFormatted || '-'} / ${volRodFormatted || '-'} ${UNIT_DISPLAY[volumeUnit]}`,
      `Force: ${forceBoreFormatted || '-'} / ${forceRodFormatted || '-'} ${UNIT_DISPLAY[forceUnit]}`,
      `Time: ${timeBoreFormatted || '-'} / ${timeRodFormatted || '-'} ${UNIT_DISPLAY[timeUnit]}`,
      `Velocity: ${velBoreFormatted || '-'} / ${velRodFormatted || '-'} ${UNIT_DISPLAY[velocityUnit]}`,
      `Outflow: ${outflowBoreFormatted || '-'} / ${outflowRodFormatted || '-'} ${UNIT_DISPLAY[outflowUnit]}`,
      `Ratio: ${ratioFormatted || '-'}`,
    ].join('\n');

    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  };

  return (
    <div className="w-full max-w-2xl bg-[#151619] border border-white/[0.08] hover:border-white/[0.14] rounded-xl shadow-none font-reddit select-none overflow-hidden transition-all text-left">
      {/* Top Header Strip with Sigma Formula Button */}
      <div className="relative px-4 sm:px-6 py-2.5 sm:py-3 bg-white/[0.02] border-b border-white/[0.08] flex items-center justify-start z-20">
        <button
          type="button"
          onClick={() => setShowFormulaModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1f2023] hover:bg-[#27282c] active:bg-[#2e3035] text-white font-mono text-xs sm:text-[13px] font-medium border border-white/[0.08] hover:border-white/[0.14] transition-colors cursor-pointer rounded-lg"
          title="View formulas breakdown"
        >
          <Sigma className="w-3.5 h-3.5 text-white/70" />
          <span>Formula Sheet</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 1. INPUTS SECTION                                              */}
      {/* ============================================================== */}
      <div>
        {/* Piston/Bore Diameter */}
        <div className="px-4 sm:px-6 py-3 border-b border-white/[0.06] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
            <CircleDot className="w-4 h-4 sm:w-5 sm:h-5 text-white/70 shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-white">Piston/Bore Diameter</span>
          </div>
          <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
            <input
              type="number"
              step="any"
              placeholder="0"
              value={boreStr}
              onChange={(e) => setBoreStr(e.target.value)}
              className="w-full h-10 px-3 bg-[#1b1c20] border border-white/[0.08] text-right font-mono text-sm font-medium text-white placeholder:text-neutral-500 focus:border-white/30 focus:outline-none transition-colors rounded-lg shadow-none"
            />
            <UnitDropdown
              currentUnit={boreUnit}
              options={['mm', 'cm', 'm']}
              onSelect={setBoreUnit}
            />
          </div>
        </div>

        {/* Rod Diameter */}
        <div className="px-4 sm:px-6 py-3 border-b border-white/[0.06] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
            <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-white/70 shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-white">Rod Diameter</span>
          </div>
          <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
            <input
              type="number"
              step="any"
              placeholder="0"
              value={rodStr}
              onChange={(e) => setRodStr(e.target.value)}
              className="w-full h-10 px-3 bg-[#1b1c20] border border-white/[0.08] text-right font-mono text-sm font-medium text-white placeholder:text-neutral-500 focus:border-white/30 focus:outline-none transition-colors rounded-lg shadow-none"
            />
            <UnitDropdown currentUnit={rodUnit} options={['mm', 'cm', 'm']} onSelect={setRodUnit} />
          </div>
        </div>

        {/* Stroke */}
        <div className="px-4 sm:px-6 py-3 border-b border-white/[0.06] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
            <Ruler className="w-4 h-4 sm:w-5 sm:h-5 text-white/70 shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-white">Stroke</span>
          </div>
          <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
            <input
              type="number"
              step="any"
              placeholder="0"
              value={strokeStr}
              onChange={(e) => setStrokeStr(e.target.value)}
              className="w-full h-10 px-3 bg-[#1b1c20] border border-white/[0.08] text-right font-mono text-sm font-medium text-white placeholder:text-neutral-500 focus:border-white/30 focus:outline-none transition-colors rounded-lg shadow-none"
            />
            <UnitDropdown
              currentUnit={strokeUnit}
              options={['mm', 'cm', 'm']}
              onSelect={setStrokeUnit}
            />
          </div>
        </div>

        {/* Pressure */}
        <div className="px-4 sm:px-6 py-3 border-b border-white/[0.06] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
            <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-white/70 shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-white">Pressure</span>
          </div>
          <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
            <input
              type="number"
              step="any"
              placeholder="0"
              value={pressureStr}
              onChange={(e) => setPressureStr(e.target.value)}
              className="w-full h-10 px-3 bg-[#1b1c20] border border-white/[0.08] text-right font-mono text-sm font-medium text-white placeholder:text-neutral-500 focus:border-white/30 focus:outline-none transition-colors rounded-lg shadow-none"
            />
            <UnitDropdown
              currentUnit={pressureUnit}
              options={['bar', 'Pa', 'MPa']}
              onSelect={setPressureUnit}
            />
          </div>
        </div>

        {/* Oil Flow */}
        <div className="px-4 sm:px-6 py-3 border-b border-white/[0.06] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
            <Pipette className="w-4 h-4 sm:w-5 sm:h-5 text-white/70 shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-white">Oil Flow</span>
          </div>
          <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
            <input
              type="number"
              step="any"
              placeholder="0"
              value={flowStr}
              onChange={(e) => setFlowStr(e.target.value)}
              className="w-full h-10 px-3 bg-[#1b1c20] border border-white/[0.08] text-right font-mono text-sm font-medium text-white placeholder:text-neutral-500 focus:border-white/30 focus:outline-none transition-colors rounded-lg shadow-none"
            />
            <UnitDropdown
              currentUnit={flowUnit}
              options={['lpm', 'm^3/min', 'cm^3/min']}
              onSelect={setFlowUnit}
            />
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. DUAL COLUMN OUTPUTS                                         */}
      {/* ============================================================== */}
      <div>
        {/* Column titles: Bore Side & Rod Side */}
        <div className="px-4 sm:px-6 pt-5 pb-2.5 grid grid-cols-[1fr_80px_80px_70px] sm:grid-cols-[180px_1fr_1fr_76px] items-center gap-2 sm:gap-3 text-xs sm:text-[13px] font-medium text-[#c2c4cc]">
          <div />
          <div className="text-center font-medium text-[#c2c4cc]">Bore Side</div>
          <div className="text-center font-medium text-[#c2c4cc]">Rod Side</div>
          <div />
        </div>

        {/* Row 1: Area */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-white/[0.06] grid grid-cols-[1fr_80px_80px_70px] sm:grid-cols-[180px_1fr_1fr_76px] items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Grid3X3 className="w-4 h-4 text-white/70 shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-white truncate">Area</span>
          </div>
          <div className="h-10 px-2 bg-[#131417] border border-white/[0.05] flex items-center justify-center font-mono text-xs sm:text-sm font-medium text-white rounded-lg">
            {areaBoreFormatted}
          </div>
          <div className="h-10 px-2 bg-[#131417] border border-white/[0.05] flex items-center justify-center font-mono text-xs sm:text-sm font-medium text-white rounded-lg">
            {areaRodFormatted}
          </div>
          <UnitDropdown
            currentUnit={areaUnit}
            options={['cm^2', 'm^2', 'mm^2']}
            onSelect={setAreaUnit}
          />
        </div>

        {/* Row 2: Volume */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-white/[0.06] grid grid-cols-[1fr_80px_80px_70px] sm:grid-cols-[180px_1fr_1fr_76px] items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <FlaskConical className="w-4 h-4 text-white/70 shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-white truncate">Volume</span>
          </div>
          <div className="h-10 px-2 bg-[#131417] border border-white/[0.05] flex items-center justify-center font-mono text-xs sm:text-sm font-medium text-white rounded-lg">
            {volBoreFormatted}
          </div>
          <div className="h-10 px-2 bg-[#131417] border border-white/[0.05] flex items-center justify-center font-mono text-xs sm:text-sm font-medium text-white rounded-lg">
            {volRodFormatted}
          </div>
          <UnitDropdown
            currentUnit={volumeUnit}
            options={['l', 'cm^3', 'm^3']}
            onSelect={setVolumeUnit}
          />
        </div>

        {/* Row 3: Force (Editable two-way input) */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-white/[0.06] grid grid-cols-[1fr_80px_80px_70px] sm:grid-cols-[180px_1fr_1fr_76px] items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <ArrowRight className="w-4 h-4 text-white/70 shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-white truncate">Force</span>
          </div>
          <input
            type="number"
            step="any"
            value={getInputValue('forceBore', forceBoreFormatted)}
            onFocus={() => handleFocusField('forceBore', forceBoreFormatted)}
            onBlur={() => setActiveField(null)}
            onChange={(e) => handleFieldChange('forceBore', e.target.value)}
            className="w-full h-10 px-2 bg-[#1b1c20] border border-white/[0.08] text-center font-mono text-xs sm:text-sm font-medium text-white placeholder:text-neutral-500 focus:border-white/30 focus:outline-none transition-colors rounded-lg shadow-none"
          />
          <input
            type="number"
            step="any"
            value={getInputValue('forceRod', forceRodFormatted)}
            onFocus={() => handleFocusField('forceRod', forceRodFormatted)}
            onBlur={() => setActiveField(null)}
            onChange={(e) => handleFieldChange('forceRod', e.target.value)}
            className="w-full h-10 px-2 bg-[#1b1c20] border border-white/[0.08] text-center font-mono text-xs sm:text-sm font-medium text-white placeholder:text-neutral-500 focus:border-white/30 focus:outline-none transition-colors rounded-lg shadow-none"
          />
          <UnitDropdown
            currentUnit={forceUnit}
            options={['kN', 'N', 'dyn', 'kgf']}
            onSelect={setForceUnit}
          />
        </div>

        {/* Row 4: Time (Editable two-way input) */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-white/[0.06] grid grid-cols-[1fr_80px_80px_70px] sm:grid-cols-[180px_1fr_1fr_76px] items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-4 h-4 text-white/70 shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-white truncate">Time</span>
          </div>
          <input
            type="number"
            step="any"
            value={getInputValue('timeBore', timeBoreFormatted)}
            onFocus={() => handleFocusField('timeBore', timeBoreFormatted)}
            onBlur={() => setActiveField(null)}
            onChange={(e) => handleFieldChange('timeBore', e.target.value)}
            className="w-full h-10 px-2 bg-[#1b1c20] border border-white/[0.08] text-center font-mono text-xs sm:text-sm font-medium text-white placeholder:text-neutral-500 focus:border-white/30 focus:outline-none transition-colors rounded-lg shadow-none"
          />
          <input
            type="number"
            step="any"
            value={getInputValue('timeRod', timeRodFormatted)}
            onFocus={() => handleFocusField('timeRod', timeRodFormatted)}
            onBlur={() => setActiveField(null)}
            onChange={(e) => handleFieldChange('timeRod', e.target.value)}
            className="w-full h-10 px-2 bg-[#1b1c20] border border-white/[0.08] text-center font-mono text-xs sm:text-sm font-medium text-white placeholder:text-neutral-500 focus:border-white/30 focus:outline-none transition-colors rounded-lg shadow-none"
          />
          <UnitDropdown
            currentUnit={timeUnit}
            options={['sec', 'min', 'ms']}
            onSelect={setTimeUnit}
          />
        </div>

        {/* Row 5: Velocity (Editable two-way input) */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-white/[0.06] grid grid-cols-[1fr_80px_80px_70px] sm:grid-cols-[180px_1fr_1fr_76px] items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Wind className="w-4 h-4 text-white/70 shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-white truncate">Velocity</span>
          </div>
          <input
            type="number"
            step="any"
            value={getInputValue('velBore', velBoreFormatted)}
            onFocus={() => handleFocusField('velBore', velBoreFormatted)}
            onBlur={() => setActiveField(null)}
            onChange={(e) => handleFieldChange('velBore', e.target.value)}
            className="w-full h-10 px-2 bg-[#1b1c20] border border-white/[0.08] text-center font-mono text-xs sm:text-sm font-medium text-white placeholder:text-neutral-500 focus:border-white/30 focus:outline-none transition-colors rounded-lg shadow-none"
          />
          <input
            type="number"
            step="any"
            value={getInputValue('velRod', velRodFormatted)}
            onFocus={() => handleFocusField('velRod', velRodFormatted)}
            onBlur={() => setActiveField(null)}
            onChange={(e) => handleFieldChange('velRod', e.target.value)}
            className="w-full h-10 px-2 bg-[#1b1c20] border border-white/[0.08] text-center font-mono text-xs sm:text-sm font-medium text-white placeholder:text-neutral-500 focus:border-white/30 focus:outline-none transition-colors rounded-lg shadow-none"
          />
          <UnitDropdown
            currentUnit={velocityUnit}
            options={['m/s', 'cm/s']}
            onSelect={setVelocityUnit}
          />
        </div>

        {/* Row 6: Outflow */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-white/[0.06] grid grid-cols-[1fr_80px_80px_70px] sm:grid-cols-[180px_1fr_1fr_76px] items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <GitFork className="w-4 h-4 text-white/70 shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-white truncate">Outflow</span>
          </div>
          <div className="h-10 px-2 bg-[#131417] border border-white/[0.05] flex items-center justify-center font-mono text-xs sm:text-sm font-medium text-white rounded-lg">
            {outflowBoreFormatted}
          </div>
          <div className="h-10 px-2 bg-[#131417] border border-white/[0.05] flex items-center justify-center font-mono text-xs sm:text-sm font-medium text-white rounded-lg">
            {outflowRodFormatted}
          </div>
          <UnitDropdown
            currentUnit={outflowUnit}
            options={['lpm', 'm^3/min', 'cm^3/min']}
            onSelect={setOutflowUnit}
          />
        </div>

        {/* Row 7: Ratio */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-white/[0.06] grid grid-cols-[1fr_80px_80px_70px] sm:grid-cols-[180px_1fr_1fr_76px] items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <PieChart className="w-4 h-4 text-white/70 shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-white truncate">Ratio</span>
          </div>
          <div className="h-10 px-2 bg-[#131417] border border-white/[0.05] flex items-center justify-center font-mono text-xs sm:text-sm font-medium text-white rounded-lg">
            {ratioFormatted}
          </div>
          {/* Rod Side has no ratio value, empty box placeholder */}
          <div className="h-10 bg-transparent" />
          <div />
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. BOTTOM ACTIONS (Copy, Reset)                                */}
      {/* ============================================================== */}
      <div className="p-4 sm:px-6 sm:py-5 grid grid-cols-2 gap-3 bg-white/[0.02] border-t border-white/[0.06]">
        <button
          type="button"
          onClick={handleCopy}
          className="h-10 sm:h-11 bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-semibold text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 rounded-lg shadow-sm"
        >
          <Copy className="w-4 h-4" />
          <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="h-10 sm:h-11 bg-[#1f2023] hover:bg-[#27282c] active:bg-[#2e3035] text-white font-medium text-xs uppercase tracking-wider border border-white/[0.08] hover:border-white/[0.14] transition-colors cursor-pointer flex items-center justify-center gap-1.5 rounded-lg shadow-none"
        >
          <RotateCcw className="w-4 h-4 text-white/70" />
          <span>Reset</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 4. FORMULA MODAL DIALOG                                        */}
      {/* ============================================================== */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
          <div className="w-full max-w-lg bg-[#151619] border border-white/[0.1] shadow-2xl rounded-xl overflow-hidden max-h-[90vh] flex flex-col text-white">
            {/* Modal Header */}
            <div className="bg-[#18191c] text-white px-5 py-4 flex items-center justify-between border-b border-white/[0.08]">
              <h3 className="text-base sm:text-lg font-semibold tracking-tight text-white">
                Cylinder Formula Sheet
              </h3>
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="text-[#c2c4cc] hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                aria-label="Close formula modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Table & Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-white text-xs sm:text-sm">
              {/* Columns Header */}
              <div className="grid grid-cols-[90px_1fr_1fr] pb-2 border-b border-white/[0.08] font-medium text-[#c2c4cc] uppercase tracking-wider text-[11px]">
                <div>Metric</div>
                <div className="text-center">Bore side</div>
                <div className="text-center">Rod side</div>
              </div>

              {/* Area */}
              <div className="grid grid-cols-[90px_1fr_1fr] items-center gap-2 py-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-1.5 font-medium text-white">
                  <Grid3X3 className="w-4 h-4 text-white/70" />
                  <span>Area</span>
                </div>
                <div className="text-center font-mono font-medium text-sm text-white">π × R²</div>
                <div className="text-center font-mono font-medium text-sm text-white">
                  X − π × r²
                </div>
              </div>
              <p className="text-[11px] text-[#80828d] font-mono -mt-2">
                <span className="font-semibold text-[#c2c4cc]">R</span> = Radius of
                piston/Bore;&nbsp;
                <span className="font-semibold text-[#c2c4cc]">X</span> = Area on piston/Bore
                side;&nbsp;
                <span className="font-semibold text-[#c2c4cc]">r</span> = Radius of rod
              </p>

              {/* Volume */}
              <div className="grid grid-cols-[90px_1fr_1fr] items-center gap-2 py-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-1.5 font-medium text-white">
                  <FlaskConical className="w-4 h-4 text-white/70" />
                  <span>Volume</span>
                </div>
                <div className="text-center font-mono font-medium text-sm text-white">
                  π × R² × L
                </div>
                <div className="text-center font-mono font-medium text-sm text-white">
                  X − π × r² × L
                </div>
              </div>
              <p className="text-[11px] text-[#80828d] font-mono -mt-2">
                <span className="font-semibold text-[#c2c4cc]">X</span> = Volume on piston/Bore
                side;&nbsp;
                <span className="font-semibold text-[#c2c4cc]">L</span> = Stroke length
              </p>

              {/* Force */}
              <div className="grid grid-cols-[90px_1fr_1fr] items-center gap-2 py-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-1.5 font-medium text-white">
                  <ArrowRight className="w-4 h-4 text-white/70" />
                  <span>Force</span>
                </div>
                <div className="text-center font-mono font-medium text-sm text-white">P × A</div>
                <div className="text-center font-mono font-medium text-sm text-white">P × A</div>
              </div>
              <p className="text-[11px] text-[#80828d] font-mono -mt-2">
                <span className="font-semibold text-[#c2c4cc]">P</span> = Pressure;&nbsp;
                <span className="font-semibold text-[#c2c4cc]">A</span> = Area
              </p>

              {/* Time */}
              <div className="grid grid-cols-[90px_1fr_1fr] items-center gap-2 py-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-1.5 font-medium text-white">
                  <Clock className="w-4 h-4 text-white/70" />
                  <span>Time</span>
                </div>
                <div className="text-center font-mono font-medium text-sm text-white">V ÷ FR</div>
                <div className="text-center font-mono font-medium text-sm text-white">V ÷ FR</div>
              </div>
              <p className="text-[11px] text-[#80828d] font-mono -mt-2">
                <span className="font-semibold text-[#c2c4cc]">V</span> = Volume;&nbsp;
                <span className="font-semibold text-[#c2c4cc]">FR</span> = Oil flow rate
              </p>

              {/* Velocity */}
              <div className="grid grid-cols-[90px_1fr_1fr] items-center gap-2 py-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-1.5 font-medium text-white">
                  <Wind className="w-4 h-4 text-white/70" />
                  <span>Velocity</span>
                </div>
                <div className="text-center font-mono font-medium text-sm text-white">L ÷ T</div>
                <div className="text-center font-mono font-medium text-sm text-white">L ÷ T</div>
              </div>
              <p className="text-[11px] text-[#80828d] font-mono -mt-2">
                <span className="font-semibold text-[#c2c4cc]">L</span> = Stroke length;&nbsp;
                <span className="font-semibold text-[#c2c4cc]">T</span> = Time
              </p>

              {/* Outflow */}
              <div className="grid grid-cols-[90px_1fr_1fr] items-center gap-2 py-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-1.5 font-medium text-white">
                  <GitFork className="w-4 h-4 text-white/70" />
                  <span>Outflow</span>
                </div>
                <div className="text-center font-mono font-medium text-sm text-white">FR ÷ Z</div>
                <div className="text-center font-mono font-medium text-sm text-white">FR × Z</div>
              </div>
              <p className="text-[11px] text-[#80828d] font-mono -mt-2">
                <span className="font-semibold text-[#c2c4cc]">FR</span> = Oil flow rate;&nbsp;
                <span className="font-semibold text-[#c2c4cc]">Z</span> = Ratio
              </p>

              {/* Ratio */}
              <div className="grid grid-cols-[90px_1fr_1fr] items-center gap-2 py-2">
                <div className="flex items-center gap-1.5 font-medium text-white">
                  <PieChart className="w-4 h-4 text-white/70" />
                  <span>Ratio</span>
                </div>
                <div className="col-span-2 text-center font-mono font-medium text-sm text-white">
                  A(X) ÷ A(Y)
                </div>
              </div>
              <p className="text-[11px] text-[#80828d] font-mono -mt-2">
                <span className="font-semibold text-[#c2c4cc]">A(X)</span> = Area bore side;&nbsp;
                <span className="font-semibold text-[#c2c4cc]">A(Y)</span> = Area rod side
              </p>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#18191c] border-t border-white/[0.08] text-right">
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="px-4 py-2 bg-white hover:bg-neutral-200 text-black font-semibold text-xs rounded-lg cursor-pointer transition-colors shadow-sm"
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
