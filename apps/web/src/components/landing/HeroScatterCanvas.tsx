'use client';

import React from 'react';
import { ScatterCanvas } from '../ui/ScatterCanvas';

export function HeroScatterCanvas() {
  return (
    <ScatterCanvas
      dotsUrl="/hero-dots.json"
      fallbackSrc="/hero-pixelated.png"
      alt="Hydraulic System 3D Motor"
      width={3072}
      height={2048}
      rotationDeg={18}
      containerClassName="w-full h-auto max-h-[140vh] aspect-[1536/1024] rotate-[18deg] flex items-center justify-end"
      imgClassName="w-full h-auto max-h-[140vh] object-contain object-right"
      opacityClass="opacity-70"
      priority
    />
  );
}
