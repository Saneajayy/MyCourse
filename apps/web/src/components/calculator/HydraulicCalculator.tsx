'use client';

import React, { useState } from 'react';
import { Cylinder, RotateCw, Gauge, TrendingDown, GitFork } from 'lucide-react';
import { CylinderCalculator } from './CylinderCalculator';
import { MotorCalculator } from './MotorCalculator';
import { PumpCalculator } from './PumpCalculator';
import { PressureDropCalculator } from './PressureDropCalculator';
import { PipingCalculator } from './PipingCalculator';

export type CalculatorSection = 'cylinder' | 'motor' | 'pump' | 'pressure-drop' | 'piping';

interface CalculatorTabConfig {
  id: CalculatorSection;
  label: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CALCULATOR_TABS: CalculatorTabConfig[] = [
  {
    id: 'cylinder',
    label: 'Cylinder',
    tagline: 'Hydraulic Cylinder Sizing & Force',
    icon: Cylinder,
  },
  {
    id: 'motor',
    label: 'Motor',
    tagline: 'Hydraulic Motor Speed & Torque',
    icon: RotateCw,
  },
  {
    id: 'pump',
    label: 'Pump',
    tagline: 'Hydraulic Pump Flow & Input Power',
    icon: Gauge,
  },
  {
    id: 'pressure-drop',
    label: 'Pressure Drop',
    tagline: 'System Line Resistance & Delta P',
    icon: TrendingDown,
  },
  {
    id: 'piping',
    label: 'Piping',
    tagline: 'Hose & Tube Sizing / Velocity',
    icon: GitFork,
  },
];

export function HydraulicCalculator() {
  const [activeSection, setActiveSection] = useState<CalculatorSection>('cylinder');

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

      {/* 5 Sub-Section Navigation Tabs */}
      <div className="flex flex-wrap gap-2 sm:gap-2.5">
        {CALCULATOR_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-[13px] font-medium transition-colors cursor-pointer rounded-lg select-none ${
                isActive
                  ? 'bg-white text-black shadow-sm font-semibold'
                  : 'bg-[#151619] border border-white/[0.08] hover:border-white/[0.14] text-[#c2c4cc] hover:text-white'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-[#c2c4cc]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
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
