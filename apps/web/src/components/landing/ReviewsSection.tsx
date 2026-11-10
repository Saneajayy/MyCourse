'use client';

import React from 'react';
import { TiltCard } from '../ui/TiltCard';

interface Review {
  id: string;
  name: string;
  role: string;
  content: string;
  rating: number;
}

export function ReviewsSection() {
  const reviews: Review[] = [
    {
      id: 'rev-1',
      name: 'Harish Chandra',
      role: 'Maintenance Technician',
      content:
        '“I worked on presses for 8 years, but schematics always confused me. After Modules 1 and 2, symbols and pilot lines clicked. Last week our press lost pressure midway; I traced it to a sticking check valve in 20 minutes and restored production myself.”',
      rating: 5,
    },
    {
      id: 'rev-2',
      name: 'Amit Sharma',
      role: 'Plant Engineer',
      content:
        '“Hydraulic sizing was always a guessing game in our plant. Sir breaks down thrust, velocity, and pump displacement into simple formulas. Last month I sized a dedicated power pack for our fixture myself, and it delivered exact pressure on day one.”',
      rating: 5,
    },
    {
      id: 'rev-3',
      name: 'Sandeep Yadav',
      role: 'Production Supervisor',
      content:
        '“Our hydraulic press kept overheating to 75°C and tripping. We kept swapping coolers without finding the cause. Following Sir’s troubleshooting steps, I found the relief valve was continuously dumping oil. Correcting it fixed the issue permanently.”',
      rating: 5,
    },
    {
      id: 'rev-4',
      name: 'Rajesh Verma',
      role: 'Hydraulic Maintenance Lead',
      content:
        '“The proportional valve section alone is worth the entire price. Tuning amplifier cards and ramp times used to require costly vendor visits. Sir explains spool displacement so clearly that our in-house shift now handles calibration in 30 minutes.”',
      rating: 5,
    },
    {
      id: 'rev-5',
      name: 'Vikas Patel',
      role: 'Service Engineer, Heavy Equipment',
      content:
        '“What makes this course exceptional is zero fluff. Every diagram, cutaway, and calculation comes directly from 22+ years of plant experience. From pump cavitation diagnostics to setting sequence valves, these tips cannot be found in textbooks.”',
      rating: 5,
    },
    {
      id: 'rev-6',
      name: 'Manoj Kulkarni',
      role: 'Quality & Reliability Engineer',
      content:
        '“We used to treat oil filtration as an afterthought, simply topping up reservoirs. The breakdown of ISO 4406 contamination codes was an eye-opener. We overhauled our filter protocols and cut valve spool sticking and seal failures by over 60%.”',
      rating: 5,
    },
    {
      id: 'rev-7',
      name: 'Deepak Singh',
      role: 'Senior Mechanical Engineer',
      content:
        '“Cylinder buckling calculations, regenerative speeds, and synchronous motion are rarely explained with plant reality. I used Sir’s formulas to redesign our shearing unit, and dual cylinder synchronization is now completely flawless under full load.”',
      rating: 5,
    },
    {
      id: 'rev-8',
      name: 'Arvind Nair',
      role: 'Shift Incharge, Extrusion Plant',
      content:
        '“Our extrusion lines run on European machines with complex DIN/ISO schematics. Tracing cartridge valves used to cause major delays. Thanks to this course, our entire shift reads multi-page schematics with clarity, cutting repair times drastically.”',
      rating: 5,
    },
    {
      id: 'rev-9',
      name: 'Kuldeep Bishnoi',
      role: 'Hydraulics Technician',
      content:
        '“Differentiating between cavitation and aeration was always guesswork on our plant floor. Sir’s checklist on suction velocity and breathers helped me pinpoint an air leak at the pump inlet flange, immediately eliminating severe vibration.”',
      rating: 5,
    },
    {
      id: 'rev-10',
      name: 'Pradeep Kumar',
      role: 'Maintenance Executive',
      content:
        '“Hydro-pneumatic accumulators were always intimidating due to high-pressure nitrogen. The step-by-step guidance on pre-charge pressure and bladder replacement was invaluable. We audited our bay using Sir’s guide and eliminated severe line shock waves.”',
      rating: 5,
    },
    {
      id: 'rev-11',
      name: 'Rohit Chauhan',
      role: 'Automation & Hydraulics Engineer',
      content:
        '“The analysis of directional valve spools—tandem, closed, and open center float—cleared up years of confusion. Understanding backpressure helped me redesign our indexing table circuit. Pressure drop is now minimal and our cycle time improved by 15%.”',
      rating: 5,
    },
    {
      id: 'rev-12',
      name: 'Ankit Mishra',
      role: 'Industrial Automation Specialist',
      content:
        '“The greatest strength of this course is Hira Lal Sir’s authentic teaching style. He speaks the real language of the shop floor and explains the \'why\' behind every valve setting. It bridges mechanical automation and fluid power better than any program.”',
      rating: 5,
    },
  ];

  // Double the reviews for a completely seamless, infinite continuous loop
  const duplicatedReviews = [...reviews, ...reviews];

  return (
    <section
      id="reviews"
      className="relative w-full py-16 sm:py-20 md:py-24 font-reddit select-none bg-transparent overflow-hidden scroll-mt-12 md:scroll-mt-16"
    >

      {/* Header Container matching optical left padding */}
      <div className="w-full pl-8 sm:pl-12 md:pl-16 lg:pl-20 xl:pl-24 pr-6 sm:pr-8 md:pr-12 lg:pr-16 mb-10 sm:mb-12 md:mb-14">
        <h2 className="font-extrabold text-white uppercase leading-[0.88] tracking-[-0.02em] text-5xl sm:text-6xl md:text-7xl lg:text-[76px] xl:text-[84px] select-none">
          <span className="block">JOIN 1000+</span>
          <span className="block">LEARNERS.</span>
        </h2>
      </div>

      {/* Full-Bleed Infinite Horizontal Marquee Slider (with vertical padding so hover lift never clips) */}
      <div className="relative w-full overflow-hidden py-5 sm:py-6 md:py-8">
        <div className="animate-marquee-slow flex items-stretch gap-7 sm:gap-8 md:gap-10 lg:gap-12 px-4">
          {duplicatedReviews.map((item, idx) => (
            <TiltCard
              key={`${item.id}-${idx}`}
              maxTilt={5.5}
              scale={1.02}
              className="relative w-[320px] sm:w-[420px] md:w-[480px] lg:w-[540px] xl:w-[580px] min-h-[305px] sm:min-h-[350px] md:min-h-[385px] lg:min-h-[410px] p-6 sm:p-7 md:p-8 lg:p-9 bg-white rounded-lg sm:rounded-xl shrink-0 select-none flex flex-col justify-between cursor-pointer"
            >
              {/* Card Content in Royal Blue #000000 */}
              <div className="relative z-10 flex flex-col justify-between h-full">
                {/* Review Quote Body */}
                <p className="text-black font-normal text-base sm:text-[18px] md:text-[20px] lg:text-[22px] leading-[1.55] sm:leading-[1.5] tracking-[-0.01em]">
                  {item.content}
                </p>

                {/* Author Details & Star Rating */}
                <div className="pt-4 sm:pt-5 mt-4 sm:mt-5 border-t border-black/15">
                  <h3 className="text-black font-bold text-lg sm:text-[21px] md:text-[23px] tracking-tight leading-tight">
                    {item.name}
                  </h3>
                  <p className="text-black/80 font-normal text-xs sm:text-sm md:text-[15px] mt-1">
                    {item.role}
                  </p>

                  {/* 5 Solid Blue Stars */}
                  <div className="flex items-center gap-1.5 mt-2.5 sm:mt-3">
                    {[...Array(item.rating)].map((_, sIdx) => (
                      <svg
                        key={sIdx}
                        className="w-4 h-4 sm:w-5 sm:h-5 fill-black"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
              </div>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  );
}
