'use client';

import React, { useState, useMemo } from 'react';
import {
  Sigma,
  Copy,
  RotateCcw,
  Check,
  ChevronDown,
  X,
  Zap,
  Gauge,
  Pipette,
  FlaskConical,
  Wrench,
  Disc,
  RotateCw,
} from 'lucide-react';

export type MotorSubSection =
  'flow-rate' | 'pressure' | 'displacement' | 'speed' | 'torque' | 'power';

const SUBSECTIONS: { id: MotorSubSection; label: string; available: boolean }[] = [
  { id: 'flow-rate', label: 'Flow rate', available: true },
  { id: 'pressure', label: 'Pressure', available: true },
  { id: 'displacement', label: 'Displacement', available: true },
  { id: 'speed', label: 'Speed', available: true },
  { id: 'torque', label: 'Torque', available: true },
  { id: 'power', label: 'Power', available: true },
];

// Unit Definitions
export type FlowUnit = 'm^3/s' | 'm^3/min' | 'lpm';
export type PressureUnit = 'Pa' | 'kPa' | 'bar';
export type DisplacementUnit = 'cm^3/rev' | 'm^3/rev';
export type SpeedUnit = 'rps' | 'rpm' | 'rad/s';
export type PowerUnit = 'W' | 'kW' | 'hp';
export type TorqueUnit = 'Nm' | 'kNm';

const UNIT_DISPLAY: Record<string, string> = {
  'm^3/s': 'm³/s',
  'm^3/min': 'm³/min',
  lpm: 'lpm',
  Pa: 'Pa',
  kPa: 'kPa',
  bar: 'bar',
  'cm^3/rev': 'cm³/rev',
  'm^3/rev': 'm³/rev',
  rps: 'rps',
  rpm: 'rpm',
  'rad/s': 'rad/s',
  W: 'W',
  kW: 'kW',
  hp: 'hp',
  Nm: 'Nm',
  kNm: 'kNm',
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

function speedFromBase(val: number, unit: SpeedUnit): number {
  if (unit === 'rpm') return val * 60;
  if (unit === 'rad/s') return val * (2 * Math.PI);
  return val; // 'rps'
}

function powerToBase(val: number, unit: PowerUnit): number {
  if (unit === 'kW') return val * 1000;
  if (unit === 'hp') return val * 745.699872;
  return val; // 'W'
}

function pressureToBase(val: number, unit: PressureUnit): number {
  if (unit === 'kPa') return val * 1000;
  if (unit === 'bar') return val * 100000;
  return val; // 'Pa'
}

function pressureFromBase(val: number, unit: PressureUnit): number {
  if (unit === 'kPa') return val / 1000;
  if (unit === 'bar') return val / 100000;
  return val; // 'Pa'
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

function torqueToBase(val: number, unit: TorqueUnit): number {
  if (unit === 'kNm') return val * 1000;
  return val; // 'Nm'
}

function torqueFromBase(val: number, unit: TorqueUnit): number {
  if (unit === 'kNm') return val / 1000;
  return val; // 'Nm'
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

export function MotorCalculator() {
  const [activeSubSection, setActiveSubSection] = useState<MotorSubSection>('flow-rate');
  const [isSubSectionMenuOpen, setIsSubSectionMenuOpen] = useState(false);
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // -------------------------------------------------------------
  // Subsection 1: Flow Rate States
  // -------------------------------------------------------------
  const [frDispStr, setFrDispStr] = useState('');
  const [frDispUnit, setFrDispUnit] = useState<DisplacementUnit>('cm^3/rev');

  const [frSpeedStr, setFrSpeedStr] = useState('');
  const [frSpeedUnit, setFrSpeedUnit] = useState<SpeedUnit>('rpm');

  const [frVolEffStr, setFrVolEffStr] = useState('');

  const [frPowerStr, setFrPowerStr] = useState('');
  const [frPowerUnit, setFrPowerUnit] = useState<PowerUnit>('kW');

  const [frPressureStr, setFrPressureStr] = useState('');
  const [frPressureUnit, setFrPressureUnit] = useState<PressureUnit>('bar');

  const [frMechEffStr, setFrMechEffStr] = useState('');

  const [frResultUnit, setFrResultUnit] = useState<FlowUnit>('lpm');

  // -------------------------------------------------------------
  // Subsection 2: Pressure States
  // -------------------------------------------------------------
  const [prPowerStr, setPrPowerStr] = useState('');
  const [prPowerUnit, setPrPowerUnit] = useState<PowerUnit>('kW');

  const [prFlowStr, setPrFlowStr] = useState('');
  const [prFlowUnit, setPrFlowUnit] = useState<FlowUnit>('lpm');

  const [prVolEffStr, setPrVolEffStr] = useState('');
  const [prMechEffStr, setPrMechEffStr] = useState('');

  const [prTorqueStr, setPrTorqueStr] = useState('');
  const [prTorqueUnit, setPrTorqueUnit] = useState<TorqueUnit>('Nm');

  const [prDispStr, setPrDispStr] = useState('');
  const [prDispUnit, setPrDispUnit] = useState<DisplacementUnit>('cm^3/rev');

  const [prResultUnit, setPrResultUnit] = useState<PressureUnit>('bar');

  // -------------------------------------------------------------
  // Subsection 3: Displacement States
  // -------------------------------------------------------------
  const [dispTorqueStr, setDispTorqueStr] = useState('');
  const [dispTorqueUnit, setDispTorqueUnit] = useState<TorqueUnit>('Nm');

  const [dispMechEffStr, setDispMechEffStr] = useState('');

  const [dispPressureStr, setDispPressureStr] = useState('');
  const [dispPressureUnit, setDispPressureUnit] = useState<PressureUnit>('bar');

  const [dispFlowStr, setDispFlowStr] = useState('');
  const [dispFlowUnit, setDispFlowUnit] = useState<FlowUnit>('lpm');

  const [dispVolEffStr, setDispVolEffStr] = useState('');

  const [dispSpeedStr, setDispSpeedStr] = useState('');
  const [dispSpeedUnit, setDispSpeedUnit] = useState<SpeedUnit>('rpm');

  const [dispResultUnit, setDispResultUnit] = useState<DisplacementUnit>('cm^3/rev');

  // -------------------------------------------------------------
  // Subsection 4: Speed States
  // -------------------------------------------------------------
  const [spdFlowStr, setSpdFlowStr] = useState('');
  const [spdFlowUnit, setSpdFlowUnit] = useState<FlowUnit>('lpm');

  const [spdVolEffStr, setSpdVolEffStr] = useState('');

  const [spdDispStr, setSpdDispStr] = useState('');
  const [spdDispUnit, setSpdDispUnit] = useState<DisplacementUnit>('cm^3/rev');

  const [spdPowerStr, setSpdPowerStr] = useState('');
  const [spdPowerUnit, setSpdPowerUnit] = useState<PowerUnit>('kW');

  const [spdTorqueStr, setSpdTorqueStr] = useState('');
  const [spdTorqueUnit, setSpdTorqueUnit] = useState<TorqueUnit>('Nm');

  const [spdResultUnit, setSpdResultUnit] = useState<SpeedUnit>('rpm');

  // -------------------------------------------------------------
  // Subsection 5: Torque States (Image 2)
  // -------------------------------------------------------------
  const [trqMechEffStr, setTrqMechEffStr] = useState('');

  const [trqDispStr, setTrqDispStr] = useState('');
  const [trqDispUnit, setTrqDispUnit] = useState<DisplacementUnit>('cm^3/rev');

  const [trqPressureStr, setTrqPressureStr] = useState('');
  const [trqPressureUnit, setTrqPressureUnit] = useState<PressureUnit>('bar');

  const [trqPowerStr, setTrqPowerStr] = useState('');
  const [trqPowerUnit, setTrqPowerUnit] = useState<PowerUnit>('kW');

  const [trqSpeedStr, setTrqSpeedStr] = useState('');
  const [trqSpeedUnit, setTrqSpeedUnit] = useState<SpeedUnit>('rpm');

  const [trqResultUnit, setTrqResultUnit] = useState<TorqueUnit>('Nm');

  // -------------------------------------------------------------
  // Subsection 6: Power States (Image 3)
  // -------------------------------------------------------------
  const [pwrTorqueStr, setPwrTorqueStr] = useState('');
  const [pwrTorqueUnit, setPwrTorqueUnit] = useState<TorqueUnit>('Nm');

  const [pwrSpeedStr, setPwrSpeedStr] = useState('');
  const [pwrSpeedUnit, setPwrSpeedUnit] = useState<SpeedUnit>('rpm');

  const [pwrFlowStr, setPwrFlowStr] = useState('');
  const [pwrFlowUnit, setPwrFlowUnit] = useState<FlowUnit>('lpm');

  const [pwrPressureStr, setPwrPressureStr] = useState('');
  const [pwrPressureUnit, setPwrPressureUnit] = useState<PressureUnit>('bar');

  const [pwrVolEffStr, setPwrVolEffStr] = useState('');
  const [pwrMechEffStr, setPwrMechEffStr] = useState('');

  const [pwrResultUnit, setPwrResultUnit] = useState<PowerUnit>('kW');

  // -------------------------------------------------------------
  // Calculation: Flow Rate
  // Q = (V * N) / (eta_v / 100)
  // OR Q = P / ((eta_v / 100) * (eta_m / 100) * p)
  // -------------------------------------------------------------
  const flowRateCalculation = useMemo(() => {
    const dispNum = parseFloat(frDispStr);
    const speedNum = parseFloat(frSpeedStr);
    const volEffNum = parseFloat(frVolEffStr);
    const powerNum = parseFloat(frPowerStr);
    const pressNum = parseFloat(frPressureStr);
    const mechEffNum = parseFloat(frMechEffStr);

    const V = !isNaN(dispNum) && dispNum > 0 ? displacementToBase(dispNum, frDispUnit) : null;
    const N = !isNaN(speedNum) && speedNum > 0 ? speedToBase(speedNum, frSpeedUnit) : null;
    const etaV = !isNaN(volEffNum) && volEffNum > 0 ? volEffNum : null;

    const P = !isNaN(powerNum) && powerNum > 0 ? powerToBase(powerNum, frPowerUnit) : null;
    const p = !isNaN(pressNum) && pressNum > 0 ? pressureToBase(pressNum, frPressureUnit) : null;
    const etaM = !isNaN(mechEffNum) && mechEffNum > 0 ? mechEffNum : null;

    // Method 1: Kinematic from Displacement & Speed & Volumetric Eff
    if (V !== null && N !== null && etaV !== null) {
      const qBase = (V * N) / (etaV / 100);
      return qBase;
    }

    // Method 2: Energy from Power, Pressure & Efficiencies
    if (P !== null && p !== null && etaV !== null && etaM !== null) {
      const qBase = P / ((etaV / 100) * (etaM / 100) * p);
      return qBase;
    }

    return null;
  }, [
    frDispStr,
    frDispUnit,
    frSpeedStr,
    frSpeedUnit,
    frVolEffStr,
    frPowerStr,
    frPowerUnit,
    frPressureStr,
    frPressureUnit,
    frMechEffStr,
  ]);

  const flowRateFormatted = flowRateCalculation
    ? formatResult(flowFromBase(flowRateCalculation, frResultUnit))
    : '';

  // -------------------------------------------------------------
  // Calculation: Pressure
  // p = P / ((eta_v / 100) * (eta_m / 100) * Q)
  // OR p = (T * 2 * PI) / ((eta_m / 100) * V)
  // -------------------------------------------------------------
  const pressureCalculation = useMemo(() => {
    const powerNum = parseFloat(prPowerStr);
    const flowNum = parseFloat(prFlowStr);
    const volEffNum = parseFloat(prVolEffStr);
    const mechEffNum = parseFloat(prMechEffStr);
    const torqueNum = parseFloat(prTorqueStr);
    const dispNum = parseFloat(prDispStr);

    const P = !isNaN(powerNum) && powerNum > 0 ? powerToBase(powerNum, prPowerUnit) : null;
    const Q = !isNaN(flowNum) && flowNum > 0 ? flowToBase(flowNum, prFlowUnit) : null;
    const etaV = !isNaN(volEffNum) && volEffNum > 0 ? volEffNum : null;
    const etaM = !isNaN(mechEffNum) && mechEffNum > 0 ? mechEffNum : null;
    const T = !isNaN(torqueNum) && torqueNum > 0 ? torqueToBase(torqueNum, prTorqueUnit) : null;
    const V = !isNaN(dispNum) && dispNum > 0 ? displacementToBase(dispNum, prDispUnit) : null;

    // Method 1: Power, Efficiencies, Flow Rate
    if (P !== null && Q !== null && etaV !== null && etaM !== null) {
      const pBase = P / ((etaV / 100) * (etaM / 100) * Q);
      return pBase;
    }

    // Method 2: Torque, Mechanical Efficiency, Displacement
    if (T !== null && V !== null && etaM !== null) {
      const pBase = (T * 2 * Math.PI) / ((etaM / 100) * V);
      return pBase;
    }

    return null;
  }, [
    prPowerStr,
    prPowerUnit,
    prFlowStr,
    prFlowUnit,
    prVolEffStr,
    prMechEffStr,
    prTorqueStr,
    prTorqueUnit,
    prDispStr,
    prDispUnit,
  ]);

  const pressureFormatted = pressureCalculation
    ? formatResult(pressureFromBase(pressureCalculation, prResultUnit))
    : '';

  // -------------------------------------------------------------
  // Calculation: Displacement
  // V = (T * 2 * PI) / ((eta_m / 100) * p)
  // OR V = (Q * (eta_v / 100)) / N
  // -------------------------------------------------------------
  const displacementCalculation = useMemo(() => {
    const torqueNum = parseFloat(dispTorqueStr);
    const mechEffNum = parseFloat(dispMechEffStr);
    const pressNum = parseFloat(dispPressureStr);
    const flowNum = parseFloat(dispFlowStr);
    const volEffNum = parseFloat(dispVolEffStr);
    const speedNum = parseFloat(dispSpeedStr);

    const T = !isNaN(torqueNum) && torqueNum > 0 ? torqueToBase(torqueNum, dispTorqueUnit) : null;
    const etaM = !isNaN(mechEffNum) && mechEffNum > 0 ? mechEffNum : null;
    const p = !isNaN(pressNum) && pressNum > 0 ? pressureToBase(pressNum, dispPressureUnit) : null;
    const Q = !isNaN(flowNum) && flowNum > 0 ? flowToBase(flowNum, dispFlowUnit) : null;
    const etaV = !isNaN(volEffNum) && volEffNum > 0 ? volEffNum : null;
    const N = !isNaN(speedNum) && speedNum > 0 ? speedToBase(speedNum, dispSpeedUnit) : null;

    // Method 1: T * 2pi / ((eta_m / 100) * p)
    if (T !== null && p !== null && etaM !== null) {
      const vBase = (T * 2 * Math.PI) / ((etaM / 100) * p);
      return vBase;
    }

    // Method 2: Q * (eta_v / 100) / N
    if (Q !== null && etaV !== null && N !== null) {
      const vBase = (Q * (etaV / 100)) / N;
      return vBase;
    }

    return null;
  }, [
    dispTorqueStr,
    dispTorqueUnit,
    dispMechEffStr,
    dispPressureStr,
    dispPressureUnit,
    dispFlowStr,
    dispFlowUnit,
    dispVolEffStr,
    dispSpeedStr,
    dispSpeedUnit,
  ]);

  const displacementFormatted = displacementCalculation
    ? formatResult(displacementFromBase(displacementCalculation, dispResultUnit))
    : '';

  // -------------------------------------------------------------
  // Calculation: Speed
  // N = (Q * (eta_v / 100)) / V
  // OR N = P / T (in rad/s, in rps: (P / T) / (2 * PI))
  // -------------------------------------------------------------
  const speedCalculation = useMemo(() => {
    const flowNum = parseFloat(spdFlowStr);
    const volEffNum = parseFloat(spdVolEffStr);
    const dispNum = parseFloat(spdDispStr);
    const powerNum = parseFloat(spdPowerStr);
    const torqueNum = parseFloat(spdTorqueStr);

    const Q = !isNaN(flowNum) && flowNum > 0 ? flowToBase(flowNum, spdFlowUnit) : null;
    const etaV = !isNaN(volEffNum) && volEffNum > 0 ? volEffNum : null;
    const V = !isNaN(dispNum) && dispNum > 0 ? displacementToBase(dispNum, spdDispUnit) : null;
    const P = !isNaN(powerNum) && powerNum > 0 ? powerToBase(powerNum, spdPowerUnit) : null;
    const T = !isNaN(torqueNum) && torqueNum > 0 ? torqueToBase(torqueNum, spdTorqueUnit) : null;

    // Method 1: (Q * (eta_v / 100)) / V -> base in rps
    if (Q !== null && etaV !== null && V !== null) {
      const nBaseRps = (Q * (etaV / 100)) / V;
      return nBaseRps;
    }

    // Method 2: N = P / T -> in rad/s, so rps = (P / T) / (2 * PI)
    if (P !== null && T !== null) {
      const nBaseRps = P / T / (2 * Math.PI);
      return nBaseRps;
    }

    return null;
  }, [
    spdFlowStr,
    spdFlowUnit,
    spdVolEffStr,
    spdDispStr,
    spdDispUnit,
    spdPowerStr,
    spdPowerUnit,
    spdTorqueStr,
    spdTorqueUnit,
  ]);

  const speedFormatted = speedCalculation
    ? formatResult(speedFromBase(speedCalculation, spdResultUnit))
    : '';

  // -------------------------------------------------------------
  // Subsection 5: Torque Calculation (Image 1 & 2)
  // T = ((eta_m / 100) * p * V) / (2 * PI)
  // OR T = P / (2 * PI * N_rps)
  // -------------------------------------------------------------
  const torqueCalculation = useMemo(() => {
    const mechEffNum = parseFloat(trqMechEffStr);
    const dispNum = parseFloat(trqDispStr);
    const pressNum = parseFloat(trqPressureStr);
    const powerNum = parseFloat(trqPowerStr);
    const speedNum = parseFloat(trqSpeedStr);

    const etaM = !isNaN(mechEffNum) && mechEffNum > 0 ? mechEffNum : null;
    const V = !isNaN(dispNum) && dispNum > 0 ? displacementToBase(dispNum, trqDispUnit) : null;
    const p = !isNaN(pressNum) && pressNum > 0 ? pressureToBase(pressNum, trqPressureUnit) : null;
    const P = !isNaN(powerNum) && powerNum > 0 ? powerToBase(powerNum, trqPowerUnit) : null;
    const N = !isNaN(speedNum) && speedNum > 0 ? speedToBase(speedNum, trqSpeedUnit) : null;

    // Method 1: ((eta_m / 100) * p * V) / (2 * PI)
    if (etaM !== null && p !== null && V !== null) {
      const tBase = ((etaM / 100) * p * V) / (2 * Math.PI);
      return tBase;
    }

    // Method 2: P / (2 * PI * N_rps)
    if (P !== null && N !== null) {
      const tBase = P / (2 * Math.PI * N);
      return tBase;
    }

    return null;
  }, [
    trqMechEffStr,
    trqDispStr,
    trqDispUnit,
    trqPressureStr,
    trqPressureUnit,
    trqPowerStr,
    trqPowerUnit,
    trqSpeedStr,
    trqSpeedUnit,
  ]);

  const torqueFormatted = torqueCalculation
    ? formatResult(torqueFromBase(torqueCalculation, trqResultUnit))
    : '';

  // -------------------------------------------------------------
  // Subsection 6: Power Calculation (Image 3 & 4)
  // P = T * (2 * PI * N_rps)
  // OR P = Q * p * (eta_v / 100) * (eta_m / 100)
  // -------------------------------------------------------------
  const powerCalculation = useMemo(() => {
    const torqueNum = parseFloat(pwrTorqueStr);
    const speedNum = parseFloat(pwrSpeedStr);
    const flowNum = parseFloat(pwrFlowStr);
    const pressNum = parseFloat(pwrPressureStr);
    const volEffNum = parseFloat(pwrVolEffStr);
    const mechEffNum = parseFloat(pwrMechEffStr);

    const T = !isNaN(torqueNum) && torqueNum > 0 ? torqueToBase(torqueNum, pwrTorqueUnit) : null;
    const N = !isNaN(speedNum) && speedNum > 0 ? speedToBase(speedNum, pwrSpeedUnit) : null;
    const Q = !isNaN(flowNum) && flowNum > 0 ? flowToBase(flowNum, pwrFlowUnit) : null;
    const p = !isNaN(pressNum) && pressNum > 0 ? pressureToBase(pressNum, pwrPressureUnit) : null;
    const etaV = !isNaN(volEffNum) && volEffNum > 0 ? volEffNum : null;
    const etaM = !isNaN(mechEffNum) && mechEffNum > 0 ? mechEffNum : null;

    // Method 1: T * (2 * PI * N_rps)
    if (T !== null && N !== null) {
      const pBase = T * (2 * Math.PI * N);
      return pBase;
    }

    // Method 2: Q * p * (eta_v / 100) * (eta_m / 100)
    if (Q !== null && p !== null && etaV !== null && etaM !== null) {
      const pBase = Q * p * (etaV / 100) * (etaM / 100);
      return pBase;
    }

    return null;
  }, [
    pwrTorqueStr,
    pwrTorqueUnit,
    pwrSpeedStr,
    pwrSpeedUnit,
    pwrFlowStr,
    pwrFlowUnit,
    pwrPressureStr,
    pwrPressureUnit,
    pwrVolEffStr,
    pwrMechEffStr,
  ]);

  const powerFormatted = powerCalculation
    ? formatResult(powerFromBase(powerCalculation, pwrResultUnit))
    : '';

  // Reset
  const handleReset = () => {
    if (activeSubSection === 'flow-rate') {
      setFrDispStr('');
      setFrSpeedStr('');
      setFrVolEffStr('');
      setFrPowerStr('');
      setFrPressureStr('');
      setFrMechEffStr('');
    } else if (activeSubSection === 'pressure') {
      setPrPowerStr('');
      setPrFlowStr('');
      setPrVolEffStr('');
      setPrMechEffStr('');
      setPrTorqueStr('');
      setPrDispStr('');
    } else if (activeSubSection === 'displacement') {
      setDispTorqueStr('');
      setDispMechEffStr('');
      setDispPressureStr('');
      setDispFlowStr('');
      setDispVolEffStr('');
      setDispSpeedStr('');
    } else if (activeSubSection === 'speed') {
      setSpdFlowStr('');
      setSpdVolEffStr('');
      setSpdDispStr('');
      setSpdPowerStr('');
      setSpdTorqueStr('');
    } else if (activeSubSection === 'torque') {
      setTrqMechEffStr('');
      setTrqDispStr('');
      setTrqPressureStr('');
      setTrqPowerStr('');
      setTrqSpeedStr('');
    } else if (activeSubSection === 'power') {
      setPwrTorqueStr('');
      setPwrSpeedStr('');
      setPwrFlowStr('');
      setPwrPressureStr('');
      setPwrVolEffStr('');
      setPwrMechEffStr('');
    }
    setCopySuccess(false);
  };

  // Copy Summary
  const handleCopy = () => {
    let text = '';
    if (activeSubSection === 'flow-rate') {
      text = [
        'HYDRAULIC MOTOR - FLOW RATE CALCULATION',
        '---------------------------------------',
        `Displacement: ${frDispStr || '-'} ${UNIT_DISPLAY[frDispUnit]}`,
        `Speed: ${frSpeedStr || '-'} ${UNIT_DISPLAY[frSpeedUnit]}`,
        `Volumetric Efficiency: ${frVolEffStr || '-'} %`,
        `Power: ${frPowerStr || '-'} ${UNIT_DISPLAY[frPowerUnit]}`,
        `Pressure: ${frPressureStr || '-'} ${UNIT_DISPLAY[frPressureUnit]}`,
        `Mechanical Efficiency: ${frMechEffStr || '-'} %`,
        '---------------------------------------',
        `Calculated Flow Rate: ${flowRateFormatted || '-'} ${UNIT_DISPLAY[frResultUnit]}`,
      ].join('\n');
    } else if (activeSubSection === 'pressure') {
      text = [
        'HYDRAULIC MOTOR - PRESSURE CALCULATION',
        '---------------------------------------',
        `Power: ${prPowerStr || '-'} ${UNIT_DISPLAY[prPowerUnit]}`,
        `Flow Rate: ${prFlowStr || '-'} ${UNIT_DISPLAY[prFlowUnit]}`,
        `Volumetric Efficiency: ${prVolEffStr || '-'} %`,
        `Mechanical Efficiency: ${prMechEffStr || '-'} %`,
        `Torque: ${prTorqueStr || '-'} ${UNIT_DISPLAY[prTorqueUnit]}`,
        `Displacement: ${prDispStr || '-'} ${UNIT_DISPLAY[prDispUnit]}`,
        '---------------------------------------',
        `Calculated Pressure: ${pressureFormatted || '-'} ${UNIT_DISPLAY[prResultUnit]}`,
      ].join('\n');
    } else if (activeSubSection === 'displacement') {
      text = [
        'HYDRAULIC MOTOR - DISPLACEMENT CALCULATION',
        '------------------------------------------',
        `Torque: ${dispTorqueStr || '-'} ${UNIT_DISPLAY[dispTorqueUnit]}`,
        `Mechanical Efficiency: ${dispMechEffStr || '-'} %`,
        `Pressure: ${dispPressureStr || '-'} ${UNIT_DISPLAY[dispPressureUnit]}`,
        `Flow Rate: ${dispFlowStr || '-'} ${UNIT_DISPLAY[dispFlowUnit]}`,
        `Volumetric Efficiency: ${dispVolEffStr || '-'} %`,
        `Speed: ${dispSpeedStr || '-'} ${UNIT_DISPLAY[dispSpeedUnit]}`,
        '------------------------------------------',
        `Calculated Displacement: ${displacementFormatted || '-'} ${UNIT_DISPLAY[dispResultUnit]}`,
      ].join('\n');
    } else if (activeSubSection === 'speed') {
      text = [
        'HYDRAULIC MOTOR - SPEED CALCULATION',
        '-----------------------------------',
        `Flow Rate: ${spdFlowStr || '-'} ${UNIT_DISPLAY[spdFlowUnit]}`,
        `Volumetric Efficiency: ${spdVolEffStr || '-'} %`,
        `Displacement: ${spdDispStr || '-'} ${UNIT_DISPLAY[spdDispUnit]}`,
        `Power: ${spdPowerStr || '-'} ${UNIT_DISPLAY[spdPowerUnit]}`,
        `Torque: ${spdTorqueStr || '-'} ${UNIT_DISPLAY[spdTorqueUnit]}`,
        '-----------------------------------',
        `Calculated Speed: ${speedFormatted || '-'} ${UNIT_DISPLAY[spdResultUnit]}`,
      ].join('\n');
    } else if (activeSubSection === 'torque') {
      text = [
        'HYDRAULIC MOTOR - TORQUE CALCULATION',
        '------------------------------------',
        `Mechanical Efficiency: ${trqMechEffStr || '-'} %`,
        `Displacement: ${trqDispStr || '-'} ${UNIT_DISPLAY[trqDispUnit]}`,
        `Pressure: ${trqPressureStr || '-'} ${UNIT_DISPLAY[trqPressureUnit]}`,
        `Power: ${trqPowerStr || '-'} ${UNIT_DISPLAY[trqPowerUnit]}`,
        `Speed: ${trqSpeedStr || '-'} ${UNIT_DISPLAY[trqSpeedUnit]}`,
        '------------------------------------',
        `Calculated Torque: ${torqueFormatted || '-'} ${UNIT_DISPLAY[trqResultUnit]}`,
      ].join('\n');
    } else if (activeSubSection === 'power') {
      text = [
        'HYDRAULIC MOTOR - POWER CALCULATION',
        '-----------------------------------',
        `Torque: ${pwrTorqueStr || '-'} ${UNIT_DISPLAY[pwrTorqueUnit]}`,
        `Speed: ${pwrSpeedStr || '-'} ${UNIT_DISPLAY[pwrSpeedUnit]}`,
        `Flow Rate: ${pwrFlowStr || '-'} ${UNIT_DISPLAY[pwrFlowUnit]}`,
        `Pressure: ${pwrPressureStr || '-'} ${UNIT_DISPLAY[pwrPressureUnit]}`,
        `Volumetric Efficiency: ${pwrVolEffStr || '-'} %`,
        `Mechanical Efficiency: ${pwrMechEffStr || '-'} %`,
        '-----------------------------------',
        `Calculated Power: ${powerFormatted || '-'} ${UNIT_DISPLAY[pwrResultUnit]}`,
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

          {/* Dropdown Menu for 6 Subsections */}
          {isSubSectionMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsSubSectionMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 top-full mt-1 w-48 sm:w-56 bg-white border border-neutral-300 shadow-2xl z-40 py-1 rounded-none">
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

      {/* SUBSECTION 1: FLOW RATE */}
      {activeSubSection === 'flow-rate' && (
        <div>
          {/* Input 1: Displacement */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Disc className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">Displacement</span>
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
              <span className="text-xs sm:text-sm font-bold text-neutral-900">Speed</span>
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
                options={['rps', 'rpm', 'rad/s']}
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

          {/* Input 4: Power */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">Power</span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={frPowerStr}
                onChange={(e) => setFrPowerStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={frPowerUnit}
                options={['W', 'kW', 'hp']}
                onSelect={setFrPowerUnit}
              />
            </div>
          </div>

          {/* Input 5: Pressure */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">Pressure</span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={frPressureStr}
                onChange={(e) => setFrPressureStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={frPressureUnit}
                options={['Pa', 'kPa', 'bar']}
                onSelect={setFrPressureUnit}
              />
            </div>
          </div>

          {/* Input 6: Mechanical efficiency */}
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
                value={frMechEffStr}
                onChange={(e) => setFrMechEffStr(e.target.value)}
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

      {/* SUBSECTION 2: PRESSURE */}
      {activeSubSection === 'pressure' && (
        <div>
          {/* Input 1: Power */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">Power</span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={prPowerStr}
                onChange={(e) => setPrPowerStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={prPowerUnit}
                options={['W', 'kW', 'hp']}
                onSelect={setPrPowerUnit}
              />
            </div>
          </div>

          {/* Input 2: Flow rate */}
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
                value={prFlowStr}
                onChange={(e) => setPrFlowStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={prFlowUnit}
                options={['m^3/s', 'm^3/min', 'lpm']}
                onSelect={setPrFlowUnit}
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
                value={prVolEffStr}
                onChange={(e) => setPrVolEffStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <div className="h-10 min-w-[70px] sm:min-w-[76px] px-2.5 bg-neutral-100 text-neutral-700 font-mono text-xs font-bold border border-neutral-300 flex items-center justify-center rounded-none">
                %
              </div>
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
                value={prMechEffStr}
                onChange={(e) => setPrMechEffStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <div className="h-10 min-w-[70px] sm:min-w-[76px] px-2.5 bg-neutral-100 text-neutral-700 font-mono text-xs font-bold border border-neutral-300 flex items-center justify-center rounded-none">
                %
              </div>
            </div>
          </div>

          {/* Input 5: Torque */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <RotateCw className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">Torque</span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={prTorqueStr}
                onChange={(e) => setPrTorqueStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={prTorqueUnit}
                options={['Nm', 'kNm']}
                onSelect={setPrTorqueUnit}
              />
            </div>
          </div>

          {/* Input 6: Displacement */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Disc className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">Displacement</span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={prDispStr}
                onChange={(e) => setPrDispStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={prDispUnit}
                options={['cm^3/rev', 'm^3/rev']}
                onSelect={setPrDispUnit}
              />
            </div>
          </div>

          {/* Separator / Output Header */}
          <div className="px-4 sm:px-6 py-4 bg-neutral-50/50 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-tight">
                Pressure
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <div className="w-full h-10 px-3 bg-neutral-100 border border-neutral-300 flex items-center justify-end font-mono text-sm font-bold text-neutral-900">
                {pressureFormatted}
              </div>
              <UnitDropdown
                currentUnit={prResultUnit}
                options={['Pa', 'kPa', 'bar']}
                onSelect={setPrResultUnit}
              />
            </div>
          </div>
        </div>
      )}

      {/* SUBSECTION 3: DISPLACEMENT (Image 4) */}
      {activeSubSection === 'displacement' && (
        <div>
          {/* Input 1: Torque */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <RotateCw className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">Torque</span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={dispTorqueStr}
                onChange={(e) => setDispTorqueStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={dispTorqueUnit}
                options={['Nm', 'kNm']}
                onSelect={setDispTorqueUnit}
              />
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
                value={dispMechEffStr}
                onChange={(e) => setDispMechEffStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <div className="h-10 min-w-[70px] sm:min-w-[76px] px-2.5 bg-neutral-100 text-neutral-700 font-mono text-xs font-bold border border-neutral-300 flex items-center justify-center rounded-none">
                %
              </div>
            </div>
          </div>

          {/* Input 3: Pressure */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">Pressure</span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={dispPressureStr}
                onChange={(e) => setDispPressureStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={dispPressureUnit}
                options={['Pa', 'kPa', 'bar']}
                onSelect={setDispPressureUnit}
              />
            </div>
          </div>

          {/* Input 4: Flow rate */}
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

          {/* Input 5: Volumetric efficiency */}
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

          {/* Input 6: Speed */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">Speed</span>
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
                options={['rps', 'rpm', 'rad/s']}
                onSelect={setDispSpeedUnit}
              />
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

      {/* SUBSECTION 4: SPEED (Image 2) */}
      {activeSubSection === 'speed' && (
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
                value={spdFlowStr}
                onChange={(e) => setSpdFlowStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={spdFlowUnit}
                options={['m^3/s', 'm^3/min', 'lpm']}
                onSelect={setSpdFlowUnit}
              />
            </div>
          </div>

          {/* Input 2: Volumetric efficiency */}
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
                value={spdVolEffStr}
                onChange={(e) => setSpdVolEffStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <div className="h-10 min-w-[70px] sm:min-w-[76px] px-2.5 bg-neutral-100 text-neutral-700 font-mono text-xs font-bold border border-neutral-300 flex items-center justify-center rounded-none">
                %
              </div>
            </div>
          </div>

          {/* Input 3: Displacement */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Disc className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">Displacement</span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={spdDispStr}
                onChange={(e) => setSpdDispStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={spdDispUnit}
                options={['cm^3/rev', 'm^3/rev']}
                onSelect={setSpdDispUnit}
              />
            </div>
          </div>

          {/* Input 4: Power */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">Power</span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={spdPowerStr}
                onChange={(e) => setSpdPowerStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={spdPowerUnit}
                options={['W', 'kW', 'hp']}
                onSelect={setSpdPowerUnit}
              />
            </div>
          </div>

          {/* Input 5: Torque */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <RotateCw className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">Torque</span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={spdTorqueStr}
                onChange={(e) => setSpdTorqueStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={spdTorqueUnit}
                options={['Nm', 'kNm']}
                onSelect={setSpdTorqueUnit}
              />
            </div>
          </div>

          {/* Separator / Output Header */}
          <div className="px-4 sm:px-6 py-4 bg-neutral-50/50 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-tight">
                Speed
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <div className="w-full h-10 px-3 bg-neutral-100 border border-neutral-300 flex items-center justify-end font-mono text-sm font-bold text-neutral-900">
                {speedFormatted}
              </div>
              <UnitDropdown
                currentUnit={spdResultUnit}
                options={['rps', 'rpm', 'rad/s']}
                onSelect={setSpdResultUnit}
              />
            </div>
          </div>
        </div>
      )}

      {/* SUBSECTION 5: TORQUE (Image 2) */}
      {activeSubSection === 'torque' && (
        <div>
          {/* Input 1: Mechanical efficiency */}
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
                value={trqMechEffStr}
                onChange={(e) => setTrqMechEffStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <div className="h-10 min-w-[70px] sm:min-w-[76px] px-2.5 bg-neutral-100 text-neutral-700 font-mono text-xs font-bold border border-neutral-300 flex items-center justify-center rounded-none">
                %
              </div>
            </div>
          </div>

          {/* Input 2: Displacement */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Disc className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">Displacement</span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={trqDispStr}
                onChange={(e) => setTrqDispStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={trqDispUnit}
                options={['cm^3/rev', 'm^3/rev']}
                onSelect={setTrqDispUnit}
              />
            </div>
          </div>

          {/* Input 3: Pressure */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">Pressure</span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={trqPressureStr}
                onChange={(e) => setTrqPressureStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={trqPressureUnit}
                options={['Pa', 'kPa', 'bar']}
                onSelect={setTrqPressureUnit}
              />
            </div>
          </div>

          {/* Input 4: Power */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">Power</span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={trqPowerStr}
                onChange={(e) => setTrqPowerStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={trqPowerUnit}
                options={['W', 'kW', 'hp']}
                onSelect={setTrqPowerUnit}
              />
            </div>
          </div>

          {/* Input 5: Speed */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">Speed</span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={trqSpeedStr}
                onChange={(e) => setTrqSpeedStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={trqSpeedUnit}
                options={['rps', 'rpm', 'rad/s']}
                onSelect={setTrqSpeedUnit}
              />
            </div>
          </div>

          {/* Separator / Output Header */}
          <div className="px-4 sm:px-6 py-4 bg-neutral-50/50 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-extrabold text-neutral-900 uppercase tracking-tight">
                Torque
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <div className="w-full h-10 px-3 bg-neutral-100 border border-neutral-300 flex items-center justify-end font-mono text-sm font-bold text-neutral-900">
                {torqueFormatted}
              </div>
              <UnitDropdown
                currentUnit={trqResultUnit}
                options={['Nm', 'kNm']}
                onSelect={setTrqResultUnit}
              />
            </div>
          </div>
        </div>
      )}

      {/* SUBSECTION 6: POWER (Image 3) */}
      {activeSubSection === 'power' && (
        <div>
          {/* Input 1: Torque */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">Torque</span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={pwrTorqueStr}
                onChange={(e) => setPwrTorqueStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={pwrTorqueUnit}
                options={['Nm', 'kNm']}
                onSelect={setPwrTorqueUnit}
              />
            </div>
          </div>

          {/* Input 2: Speed */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">Speed</span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={pwrSpeedStr}
                onChange={(e) => setPwrSpeedStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={pwrSpeedUnit}
                options={['rps', 'rpm', 'rad/s']}
                onSelect={setPwrSpeedUnit}
              />
            </div>
          </div>

          {/* Input 3: Flow rate */}
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
                value={pwrFlowStr}
                onChange={(e) => setPwrFlowStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={pwrFlowUnit}
                options={['m^3/s', 'm^3/min', 'lpm']}
                onSelect={setPwrFlowUnit}
              />
            </div>
          </div>

          {/* Input 4: Pressure */}
          <div className="px-4 sm:px-6 py-3 border-b border-neutral-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-[140px] sm:min-w-[180px]">
              <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-neutral-900">Pressure</span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <input
                type="number"
                step="any"
                placeholder="0"
                value={pwrPressureStr}
                onChange={(e) => setPwrPressureStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <UnitDropdown
                currentUnit={pwrPressureUnit}
                options={['Pa', 'kPa', 'bar']}
                onSelect={setPwrPressureUnit}
              />
            </div>
          </div>

          {/* Input 5: Volumetric efficiency */}
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
                value={pwrVolEffStr}
                onChange={(e) => setPwrVolEffStr(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 text-right font-mono text-sm font-bold text-neutral-900 focus:border-black focus:outline-none transition-colors rounded-none shadow-none"
              />
              <div className="h-10 min-w-[70px] sm:min-w-[76px] px-2.5 bg-neutral-100 text-neutral-700 font-mono text-xs font-bold border border-neutral-300 flex items-center justify-center rounded-none">
                %
              </div>
            </div>
          </div>

          {/* Input 6: Mechanical efficiency */}
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
                value={pwrMechEffStr}
                onChange={(e) => setPwrMechEffStr(e.target.value)}
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
                Power
              </span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end max-w-xs sm:max-w-sm">
              <div className="w-full h-10 px-3 bg-neutral-100 border border-neutral-300 flex items-center justify-end font-mono text-sm font-bold text-neutral-900">
                {powerFormatted}
              </div>
              <UnitDropdown
                currentUnit={pwrResultUnit}
                options={['W', 'kW', 'hp']}
                onSelect={setPwrResultUnit}
              />
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
                {activeSubSection === 'power'
                  ? 'Motor - Power formula'
                  : activeSubSection === 'torque'
                    ? 'Motor - Torque formula'
                    : activeSubSection === 'displacement'
                      ? 'Motor - Displacement formula'
                      : activeSubSection === 'speed'
                        ? 'Motor - Speed formula'
                        : activeSubSection === 'pressure'
                          ? 'Motor - Pressure formula'
                          : 'Motor - Flow rate formula'}
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
              {activeSubSection === 'torque' ? (
                /* TORQUE FORMULA BREAKDOWN (Image 1) */
                <div className="text-center py-4 space-y-6">
                  <div className="flex justify-center text-black">
                    <Wrench className="w-12 h-12 stroke-[1.5]" />
                  </div>

                  {/* Formula 1 */}
                  <div className="inline-flex items-center gap-3 font-serif text-lg sm:text-2xl text-neutral-900">
                    <span className="italic font-bold">T</span>
                    <span>=</span>
                    <div className="inline-flex flex-col items-center">
                      <div className="border-b-2 border-black px-4 pb-0.5 flex items-center gap-1 text-xs sm:text-sm font-sans font-medium">
                        <div className="flex flex-col items-center">
                          <span className="border-b border-black px-1 pb-0.5 italic">
                            η<sub>m</sub>
                          </span>
                          <span>100</span>
                        </div>
                        <span className="px-0.5">×</span>
                        <span className="italic font-serif text-base sm:text-xl">p</span>
                        <span className="px-0.5">×</span>
                        <span className="italic font-serif text-base sm:text-xl">V</span>
                      </div>
                      <span className="pt-1 italic font-serif">2π</span>
                    </div>
                  </div>

                  <div className="text-xs uppercase font-extrabold tracking-widest text-neutral-400">
                    OR
                  </div>

                  {/* Formula 2 */}
                  <div className="inline-flex items-center gap-3 font-serif text-lg sm:text-2xl text-neutral-900">
                    <span className="italic font-bold">T</span>
                    <span>=</span>
                    <div className="inline-flex flex-col items-center">
                      <span className="border-b-2 border-black px-4 pb-0.5 italic">P</span>
                      <span className="pt-1 italic font-serif">N</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="pt-6 border-t border-neutral-200 text-xs sm:text-sm text-neutral-700 space-y-1 text-center font-mono">
                    <p>
                      <span className="font-extrabold text-black">
                        η<sub>m</sub>
                      </span>{' '}
                      = Mechanical efficiency;&nbsp;
                      <span className="font-extrabold text-black">p</span> = Pressure;&nbsp;
                      <span className="font-extrabold text-black">V</span> = Displacement
                    </p>
                    <p>
                      <span className="font-extrabold text-black">P</span> = Power;&nbsp;
                      <span className="font-extrabold text-black">N</span> = Speed
                    </p>
                  </div>
                </div>
              ) : activeSubSection === 'power' ? (
                /* POWER FORMULA BREAKDOWN (Image 4) */
                <div className="text-center py-4 space-y-6">
                  <div className="flex justify-center text-black">
                    <Zap className="w-12 h-12 stroke-[1.5]" />
                  </div>

                  {/* Formula 1 */}
                  <div className="inline-flex items-center gap-3 font-serif text-lg sm:text-2xl text-neutral-900">
                    <span className="italic font-bold">P</span>
                    <span>=</span>
                    <span className="italic">T × N</span>
                  </div>

                  <div className="text-xs uppercase font-extrabold tracking-widest text-neutral-400">
                    OR
                  </div>

                  {/* Formula 2 */}
                  <div className="inline-flex items-center gap-2 font-serif text-lg sm:text-2xl text-neutral-900">
                    <span className="italic font-bold">P</span>
                    <span>=</span>
                    <span className="italic">Q × p × </span>
                    <div className="inline-flex flex-col items-center text-xs sm:text-sm font-sans font-medium">
                      <span className="border-b border-black px-1 pb-0.5 italic">
                        η<sub>v</sub>
                      </span>
                      <span>100</span>
                    </div>
                    <span>×</span>
                    <div className="inline-flex flex-col items-center text-xs sm:text-sm font-sans font-medium">
                      <span className="border-b border-black px-1 pb-0.5 italic">
                        η<sub>m</sub>
                      </span>
                      <span>100</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="pt-6 border-t border-neutral-200 text-xs sm:text-sm text-neutral-700 space-y-1 text-center font-mono">
                    <p>
                      <span className="font-extrabold text-black">T</span> = Torque;&nbsp;
                      <span className="font-extrabold text-black">N</span> = Speed;&nbsp;
                      <span className="font-extrabold text-black">Q</span> = Flow rate
                    </p>
                    <p>
                      <span className="font-extrabold text-black">p</span> = Pressure;&nbsp;
                      <span className="font-extrabold text-black">
                        η<sub>v</sub>
                      </span>{' '}
                      = Volumetric efficiency;&nbsp;
                      <span className="font-extrabold text-black">
                        η<sub>m</sub>
                      </span>{' '}
                      = Mechanical efficiency
                    </p>
                  </div>
                </div>
              ) : activeSubSection === 'displacement' ? (
                /* DISPLACEMENT FORMULA BREAKDOWN (Image 3) */
                <div className="text-center py-4 space-y-6">
                  <div className="flex justify-center text-black">
                    <Disc className="w-12 h-12 stroke-[1.5]" />
                  </div>

                  {/* Formula 1 */}
                  <div className="inline-flex items-center gap-3 font-serif text-lg sm:text-2xl text-neutral-900">
                    <span className="italic font-bold">V</span>
                    <span>=</span>
                    <div className="inline-flex flex-col items-center">
                      <span className="border-b-2 border-black px-4 pb-0.5 italic">T × 2π</span>
                      <div className="flex items-center gap-1 pt-1 text-xs sm:text-sm font-sans font-medium">
                        <div className="flex flex-col items-center">
                          <span className="border-b border-black px-1 pb-0.5 italic">
                            η<sub>m</sub>
                          </span>
                          <span>100</span>
                        </div>
                        <span className="px-0.5">×</span>
                        <span className="italic font-serif">p</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs uppercase font-extrabold tracking-widest text-neutral-400">
                    OR
                  </div>

                  {/* Formula 2 */}
                  <div className="inline-flex items-center gap-3 font-serif text-lg sm:text-2xl text-neutral-900">
                    <span className="italic font-bold">V</span>
                    <span>=</span>
                    <div className="inline-flex flex-col items-center">
                      <div className="border-b-2 border-black px-4 pb-0.5 flex items-center gap-1">
                        <span className="italic font-serif">Q</span>
                        <span>×</span>
                        <div className="flex flex-col items-center text-xs sm:text-sm font-sans font-medium">
                          <span className="border-b border-black px-1 pb-0.5 italic">
                            η<sub>v</sub>
                          </span>
                          <span>100</span>
                        </div>
                      </div>
                      <span className="pt-1 italic font-serif">N</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="pt-6 border-t border-neutral-200 text-xs sm:text-sm text-neutral-700 space-y-1 text-center font-mono">
                    <p>
                      <span className="font-extrabold text-black">T</span> = Torque;&nbsp;
                      <span className="font-extrabold text-black">
                        η<sub>m</sub>
                      </span>{' '}
                      = Mechanical efficiency;&nbsp;
                      <span className="font-extrabold text-black">p</span> = Pressure
                    </p>
                    <p>
                      <span className="font-extrabold text-black">Q</span> = Flow rate;&nbsp;
                      <span className="font-extrabold text-black">
                        η<sub>v</sub>
                      </span>{' '}
                      = Volumetric efficiency;&nbsp;
                      <span className="font-extrabold text-black">N</span> = Speed
                    </p>
                  </div>
                </div>
              ) : activeSubSection === 'speed' ? (
                /* SPEED FORMULA BREAKDOWN (Image 1) */
                <div className="text-center py-4 space-y-6">
                  <div className="flex justify-center text-black">
                    <Gauge className="w-12 h-12 stroke-[1.5]" />
                  </div>

                  {/* Formula 1 */}
                  <div className="inline-flex items-center gap-3 font-serif text-lg sm:text-2xl text-neutral-900">
                    <span className="italic font-bold">N</span>
                    <span>=</span>
                    <div className="inline-flex flex-col items-center">
                      <div className="border-b-2 border-black px-4 pb-0.5 flex items-center gap-1">
                        <span className="italic font-serif">Q</span>
                        <span>×</span>
                        <div className="flex flex-col items-center text-xs sm:text-sm font-sans font-medium">
                          <span className="border-b border-black px-1 pb-0.5 italic">
                            η<sub>v</sub>
                          </span>
                          <span>100</span>
                        </div>
                      </div>
                      <span className="pt-1 italic font-serif">V</span>
                    </div>
                  </div>

                  <div className="text-xs uppercase font-extrabold tracking-widest text-neutral-400">
                    OR
                  </div>

                  {/* Formula 2 */}
                  <div className="inline-flex items-center gap-3 font-serif text-lg sm:text-2xl text-neutral-900">
                    <span className="italic font-bold">N</span>
                    <span>=</span>
                    <div className="inline-flex flex-col items-center">
                      <span className="border-b-2 border-black px-4 pb-0.5 italic">P</span>
                      <span className="pt-1 italic font-serif">T</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="pt-6 border-t border-neutral-200 text-xs sm:text-sm text-neutral-700 space-y-1 text-center font-mono">
                    <p>
                      <span className="font-extrabold text-black">Q</span> = Flow rate;&nbsp;
                      <span className="font-extrabold text-black">
                        η<sub>v</sub>
                      </span>{' '}
                      = Volumetric efficiency;&nbsp;
                      <span className="font-extrabold text-black">V</span> = Displacement
                    </p>
                    <p>
                      <span className="font-extrabold text-black">P</span> = Power;&nbsp;
                      <span className="font-extrabold text-black">T</span> = Torque
                    </p>
                  </div>
                </div>
              ) : activeSubSection === 'pressure' ? (
                /* PRESSURE FORMULA BREAKDOWN */
                <div className="text-center py-4 space-y-6">
                  <div className="flex justify-center text-black">
                    <Gauge className="w-12 h-12 stroke-[1.5]" />
                  </div>

                  {/* Formula 1 */}
                  <div className="inline-flex items-center gap-3 font-serif text-lg sm:text-2xl text-neutral-900">
                    <span className="italic font-bold">p</span>
                    <span>=</span>
                    <div className="inline-flex flex-col items-center">
                      <span className="border-b-2 border-black px-4 pb-0.5 italic">P</span>
                      <div className="flex items-center gap-1 pt-1 text-xs sm:text-sm font-sans font-medium">
                        <div className="flex flex-col items-center">
                          <span className="border-b border-black px-1 pb-0.5 italic">
                            η<sub>v</sub>
                          </span>
                          <span>100</span>
                        </div>
                        <span className="px-0.5">×</span>
                        <div className="flex flex-col items-center">
                          <span className="border-b border-black px-1 pb-0.5 italic">
                            η<sub>m</sub>
                          </span>
                          <span>100</span>
                        </div>
                        <span className="px-0.5">×</span>
                        <span className="italic font-serif">Q</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs uppercase font-extrabold tracking-widest text-neutral-400">
                    OR
                  </div>

                  {/* Formula 2 */}
                  <div className="inline-flex items-center gap-3 font-serif text-lg sm:text-2xl text-neutral-900">
                    <span className="italic font-bold">p</span>
                    <span>=</span>
                    <div className="inline-flex flex-col items-center">
                      <span className="border-b-2 border-black px-4 pb-0.5 italic">T × 2π</span>
                      <div className="flex items-center gap-1 pt-1 text-xs sm:text-sm font-sans font-medium">
                        <div className="flex flex-col items-center">
                          <span className="border-b border-black px-1 pb-0.5 italic">
                            η<sub>m</sub>
                          </span>
                          <span>100</span>
                        </div>
                        <span className="px-0.5">×</span>
                        <span className="italic font-serif">V</span>
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="pt-6 border-t border-neutral-200 text-xs sm:text-sm text-neutral-700 space-y-1 text-center font-mono">
                    <p>
                      <span className="font-extrabold text-black">P</span> = Power;&nbsp;
                      <span className="font-extrabold text-black">
                        η<sub>v</sub>
                      </span>{' '}
                      = Volumetric efficiency;
                    </p>
                    <p>
                      <span className="font-extrabold text-black">
                        η<sub>m</sub>
                      </span>{' '}
                      = Mechanical efficiency;&nbsp;
                      <span className="font-extrabold text-black">Q</span> = Flow rate;
                    </p>
                    <p>
                      <span className="font-extrabold text-black">T</span> = Torque;&nbsp;
                      <span className="font-extrabold text-black">V</span> = Displacement
                    </p>
                  </div>
                </div>
              ) : (
                /* FLOW RATE FORMULA BREAKDOWN */
                <div className="text-center py-4 space-y-6">
                  <div className="flex justify-center text-black">
                    <Pipette className="w-12 h-12 stroke-[1.5]" />
                  </div>

                  {/* Formula 1 */}
                  <div className="inline-flex items-center gap-3 font-serif text-lg sm:text-2xl text-neutral-900">
                    <span className="italic font-bold">Q</span>
                    <span>=</span>
                    <div className="inline-flex flex-col items-center">
                      <span className="border-b-2 border-black px-4 pb-0.5 italic">V × N</span>
                      <div className="flex flex-col items-center pt-1 text-xs sm:text-sm font-sans font-medium">
                        <span className="border-b border-black px-1.5 pb-0.5 italic">
                          η<sub>v</sub>
                        </span>
                        <span>100</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs uppercase font-extrabold tracking-widest text-neutral-400">
                    OR
                  </div>

                  {/* Formula 2 */}
                  <div className="inline-flex items-center gap-3 font-serif text-lg sm:text-2xl text-neutral-900">
                    <span className="italic font-bold">Q</span>
                    <span>=</span>
                    <div className="inline-flex flex-col items-center">
                      <span className="border-b-2 border-black px-4 pb-0.5 italic">P</span>
                      <div className="flex items-center gap-1 pt-1 text-xs sm:text-sm font-sans font-medium">
                        <div className="flex flex-col items-center">
                          <span className="border-b border-black px-1 pb-0.5 italic">
                            η<sub>v</sub>
                          </span>
                          <span>100</span>
                        </div>
                        <span className="px-0.5">×</span>
                        <div className="flex flex-col items-center">
                          <span className="border-b border-black px-1 pb-0.5 italic">
                            η<sub>m</sub>
                          </span>
                          <span>100</span>
                        </div>
                        <span className="px-0.5">×</span>
                        <span className="italic font-serif">p</span>
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="pt-6 border-t border-neutral-200 text-xs sm:text-sm text-neutral-700 space-y-1 text-center font-mono">
                    <p>
                      <span className="font-extrabold text-black">V</span> = Displacement;&nbsp;
                      <span className="font-extrabold text-black">N</span> = Speed;
                    </p>
                    <p>
                      <span className="font-extrabold text-black">
                        η<sub>v</sub>
                      </span>{' '}
                      = Volumetric efficiency;&nbsp;
                      <span className="font-extrabold text-black">P</span> = Power;
                    </p>
                    <p>
                      <span className="font-extrabold text-black">
                        η<sub>m</sub>
                      </span>{' '}
                      = Mechanical efficiency;&nbsp;
                      <span className="font-extrabold text-black">p</span> = Pressure
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
