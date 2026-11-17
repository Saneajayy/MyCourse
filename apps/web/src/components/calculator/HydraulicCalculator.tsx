'use client';

import React, { useState } from 'react';
import {
  Cylinder,
  RotateCw,
  Gauge,
  TrendingDown,
  GitFork,
} from 'lucide-react';
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
      <div className="text-left space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
          Hydraulic System Calculator
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500">
          Industrial fluid power formulas, dimensioning &amp; component sizing calculations.
        </p>
      </div>

      {/* 5 Sub-Section Navigation Tabs (Proper Rectangular Boxes) */}
      <div className="flex flex-wrap gap-2 sm:gap-2.5">
        {CALCULATOR_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-bold border transition-colors cursor-pointer rounded-none select-none ${isActive
                ? 'border-black bg-black text-white font-extrabold shadow-xs'
                : 'border-neutral-300 bg-white text-neutral-800 hover:border-black hover:bg-neutral-50'
                }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-neutral-800'}`} />
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
