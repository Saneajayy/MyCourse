'use client';

import React from 'react';
import Image from 'next/image';
import { TiltCard } from '../ui/TiltCard';
import { ScatterCanvas } from '../ui/ScatterCanvas';

export function CertificateSection() {
  return (
    <section
      id="certificate"
      className="relative w-full py-16 sm:py-20 md:py-24 pl-8 sm:pl-12 md:pl-16 lg:pl-20 xl:pl-24 pr-6 sm:pr-8 md:pr-12 lg:pr-16 font-reddit select-none bg-transparent overflow-visible scroll-mt-12 md:scroll-mt-16"
    >

      {/* Self-contained Font-face to guarantee Shalimar loads in all mobile & desktop viewports */}
      <style>{`
        @font-face {
          font-family: 'Shalimar';
          font-style: normal;
          font-weight: 400;
          font-display: swap;
          src: url('/fonts/Shalimar-Latin.woff2') format('woff2'),
               url('/fonts/Shalimar-Regular.ttf') format('truetype');
        }
      `}</style>

      {/* 3D Hydraulic Certificate Component Pixelated Graphic (Right Side, Responsive Desktop & Mobile) */}
      <div className="absolute right-0 top-1/2 -translate-y-[25%] translate-x-[43%] lg:translate-x-[40%] xl:translate-x-[37%] w-[113vw] lg:w-[98vw] xl:w-[88vw] max-w-[1955px] min-w-[820px] pointer-events-none flex items-center justify-end z-0">
        <ScatterCanvas
          dotsUrl="/certificate-dots.json"
          fallbackSrc="/certificate-pixelated.png"
          alt="Hydraulic Certificate 3D Component"
          width={2844}
          height={2212}
          rotationDeg={210}
          containerClassName="w-full h-auto max-h-[170vh] aspect-[2844/2212] rotate-[210deg] flex items-center justify-end"
          imgClassName="w-full h-auto max-h-[170vh] object-contain object-right"
          opacityClass="opacity-85"
          priority
        />
      </div>

      <div className="relative z-10 max-w-5xl flex flex-col items-start">
        {/* Section Heading: Exact single-line uppercase with period */}
        <h2 className="font-extrabold text-white uppercase leading-[0.88] tracking-[-0.02em] text-5xl sm:text-6xl md:text-7xl lg:text-[76px] xl:text-[84px] mb-10 sm:mb-12 md:mb-14 select-none">
          GET CERTIFIED.
        </h2>

        {/* Mobile View: Dedicated Portrait Certificate Card (< md) */}
        <div className="block md:hidden w-full">
          <TiltCard
            className="relative w-full max-w-[380px] sm:max-w-[420px] p-4 sm:p-5 bg-white rounded-lg sm:rounded-xl select-none cursor-pointer"
            maxTilt={4}
          >
            {/* Inner White Card with Blue Border & Blue Content */}
            <div className="relative z-10 bg-white border border-black rounded-md sm:rounded-lg overflow-hidden text-black flex flex-col">
              {/* Top Bar: COURSE CERTIFICATE and CERT-98372 */}
              <div className="flex items-center justify-between px-5 sm:px-6 pt-5 sm:pt-6 pb-3.5 sm:pb-4">
                <span className="text-black font-normal text-[11px] sm:text-[12px] tracking-[0.06em] uppercase">
                  COURSE CERTIFICATE
                </span>
                <span className="text-black font-normal text-[11px] sm:text-[12px] tracking-[0.06em] uppercase">
                  CERT-98372
                </span>
              </div>

              {/* Top Divider Line */}
              <div className="w-full border-b border-black" />

              {/* Main Certificate Content */}
              <div className="px-5 sm:px-6 pt-6 sm:pt-7 pb-6 sm:pb-7 flex flex-col items-start text-left">
                {/* 1. Certificate Title */}
                <div className="flex flex-col items-start text-left mt-1 sm:mt-2 select-none leading-none text-black">
                  <span className="font-light text-[32px] sm:text-[36px] tracking-tight uppercase leading-[1.05]">
                    CERTIFICATE OF
                  </span>
                  <span className="font-light text-[32px] sm:text-[36px] tracking-tight uppercase leading-[1.05]">
                    COMPLETION.
                  </span>
                </div>

                {/* 3. "presented to" */}
                <p className="text-black/75 font-light text-[13px] sm:text-[14px] lowercase tracking-normal text-left mt-5 sm:mt-6 select-none">
                  presented to
                </p>

                <h3 className="font-extrabold text-black text-[24px] sm:text-[27px] tracking-wide uppercase leading-tight select-none mt-1 sm:mt-1.5 mb-2.5 sm:mb-3">
                  VARUN KUMAR
                </h3>

                {/* 5. Course Completion Description */}
                <p className="text-black/80 font-light text-[12px] sm:text-[13px] leading-[1.45] text-left select-none max-w-[340px]">
                  For completing the course of <strong className="font-bold text-black">Hydraulic System Basics</strong> by Mr. Hira lal, covering the Fundamentals of Hydraulic systems, components and circuit designs.
                </p>

                {/* 6. Bottom Row: QR Code (Left) and Signature (Right) */}
                <div className="w-full flex items-end justify-between mt-6 sm:mt-8 pt-1">
                  {/* Verification QR Code: Saturation 0 to render in black */}
                  <div className="relative w-[110px] h-[110px] sm:w-[124px] sm:h-[124px] flex-shrink-0">
                    <Image
                      src="/cert-qr-blue-exact.png"
                      alt="Certificate Verification QR Code"
                      fill
                      sizes="124px"
                      className="object-contain saturate-0 grayscale contrast-200"
                      priority
                    />
                  </div>

                  {/* Instructor Signature: Saturation 0 to render in black */}
                  <div className="flex flex-col items-start select-none">
                    <div className="relative w-[82px] sm:w-[94px] h-[29px] sm:h-[33px]">
                      <Image
                        src="/cert-signature-hiralal.png"
                        alt="HiraLal Signature"
                        fill
                        sizes="94px"
                        className="object-contain object-left saturate-0 grayscale contrast-200"
                        priority
                      />
                    </div>
                    <span className="font-normal text-black text-[11px] sm:text-xs tracking-normal mt-0.5">
                      Course Instructor
                    </span>

                    {/* Exact Stacked Brand Logo below Course Instructor */}
                    <div className="flex flex-col items-start -space-y-0.5 leading-[0.92] text-black select-none mt-2 sm:mt-2.5">
                      <span className="font-extrabold text-[26px] sm:text-[29px] tracking-[0.01em] uppercase leading-[0.92]">
                        HYDRO
                      </span>
                      <span className="font-extrabold text-[26px] sm:text-[29px] tracking-[0.01em] uppercase leading-[0.92]">
                        BASICS
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TiltCard>
        </div>

        {/* Desktop View: Full-size Landscape Certificate Card (>= md) */}
        <div className="hidden md:block w-full">
          <TiltCard
            className="relative w-full max-w-4xl md:max-w-[760px] lg:max-w-[870px] p-5 sm:p-6 md:p-7 bg-white rounded-lg sm:rounded-xl select-none cursor-pointer"
            maxTilt={5}
          >
            {/* Background Design Watermark: Hero 3D Component */}
            <div className="absolute inset-0 overflow-hidden rounded-lg sm:rounded-xl pointer-events-none z-0 flex items-center justify-center">
              <div className="relative w-[175%] sm:w-[169%] md:w-[163%] max-w-[1270px] aspect-[1536/1024] -translate-x-[34%] -translate-y-[17%]">
                <Image
                  src="/hero-watermark-blue.png"
                  alt="Hydraulic Motor Watermark"
                  fill
                  sizes="(max-width: 768px) 120vw, 1050px"
                  className="object-contain opacity-[0.00] select-none pointer-events-none"
                  priority={false}
                />
              </div>
            </div>

            {/* Inner Blue Frame & Certificate Content Area */}
            <div className="relative z-10 border border-black/35 rounded-md sm:rounded-lg p-6 sm:p-7 md:p-8 lg:p-9 min-h-[460px] md:min-h-[476px]" />
          </TiltCard>
        </div>
      </div>
    </section>
  );
}
