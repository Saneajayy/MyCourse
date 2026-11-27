'use client';

import React, { useState } from 'react';
import { CylinderCalculator } from './CylinderCalculator';
import { MotorCalculator } from './MotorCalculator';
import { PumpCalculator } from './PumpCalculator';
import { PressureDropCalculator } from './PressureDropCalculator';
import { PipingCalculator } from './PipingCalculator';

export type CalculatorSection = 'cylinder' | 'motor' | 'pump' | 'pressure-drop' | 'piping';

export interface CalculatorSubSection {
  id: CalculatorSection;
  label: string;
}

export const CALCULATOR_SUB_SECTIONS: CalculatorSubSection[] = [
  { id: 'cylinder', label: 'Cylinder' },
  { id: 'motor', label: 'Motor' },
  { id: 'pump', label: 'Pump' },
  { id: 'pressure-drop', label: 'Pressure Drop' },
  { id: 'piping', label: 'Piping' },
];

export interface HydraulicCalculatorProps {
  activeSection?: CalculatorSection;
  onSectionChange?: (section: CalculatorSection) => void;
}

export function HydraulicCalculator({
  activeSection: controlledSection,
  onSectionChange: _onSectionChange,
}: HydraulicCalculatorProps = {}) {
  const [internalSection] = useState<CalculatorSection>('cylinder');
  const activeSection = controlledSection ?? internalSection;

  return (
    <div className="space-y-6 text-left w-full max-w-4xl xl:max-w-5xl select-none font-reddit">
      {/* Header Title & Subtitle */}
      <div className="text-left">
        <h1 className="text-lg sm:text-[20px] font-medium text-white tracking-normal">
          Hydraulic System Calculator
        </h1>
        <p className="text-xs sm:text-[13px] text-[#c2c4cc] mt-1">
          Industrial fluid power formulas, dimensioning &amp; component sizing calculations.
        </p>
      </div>

      {/* ACTIVE SECTION CONTENT */}

      {/* 1. CYLINDER SECTION */}
      {activeSection === 'cylinder' && <CylinderCalculator />}

      {/* 2. MOTOR SECTION */}
      {activeSection === 'motor' && <MotorCalculator />}

      {/* 3. PUMP SECTION */}
      {activeSection === 'pump' && <PumpCalculator />}

      {/* 4. PRESSURE DROP SECTION */}
      {activeSection === 'pressure-drop' && <PressureDropCalculator />}

      {/* 5. PIPING SECTION */}
      {activeSection === 'piping' && <PipingCalculator />}
    </div>
  );
}
