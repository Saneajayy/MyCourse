'use client';

import React from 'react';

export function FaqSection() {
  const faqs = [
    {
      question: '1. Who is this course designed for ?',
      answer:
        'This course is specifically built for mechanical engineers, maintenance managers, plant technicians, diploma holders, and automation specialists working with industrial hydraulic machinery, presses, injection molding machines, HPUs, and mobile systems.',
    },
    {
      question: '2. How do I get access to the course content ?',
      answer:
        'Your enrollment provides 1 full year (365 days) of continuous, on-demand streaming access to all video lessons, circuit schematics, calculation spreadsheets, and future updates. Optional discounted renewals are available at year-end.',
    },
    {
      question: '3. Can I watch on my mobile phone ?',
      answer:
        'Yes. The video player uses adaptive HLS streaming designed to work seamlessly on 4G/5G mobile connections, tablets, and desktop computers. You can pause on mobile and resume playback seamlessly on your PC.',
    },
    {
      question: '4. Do I get a GST Invoice for company reimbursement ?',
      answer:
        'Yes! Immediately after checkout completes, a compliant GST tax invoice PDF is generated with your business details, order number, and GSTIN. You can download it directly from your account page.',
    },
    {
      question: '5. What if another device logs into my account ?',
      answer:
        'For security and anti-piracy protection, single-student concurrent streaming is enforced. If playback begins on another device, you receive a clear prompt and can easily resume with one click.',
    },
  ];

  return (
    <section
      id="faqs"
      className="relative w-full py-16 sm:py-20 md:py-24 pl-8 sm:pl-12 md:pl-16 lg:pl-20 xl:pl-24 pr-6 sm:pr-8 md:pr-12 lg:pr-16 font-reddit select-none bg-transparent overflow-visible scroll-mt-12 md:scroll-mt-16"
    >
      <div className="relative z-10 max-w-4xl">
        {/* Section Heading matching Figma screenshot: FAQs. */}
        <h2 className="text-white font-extrabold text-5xl sm:text-6xl md:text-7xl lg:text-[76px] leading-none tracking-[-0.02em] mb-10 sm:mb-12">
          FAQs.
        </h2>

        {/* Numbered Questions & Answers list */}
        <div className="space-y-8 sm:space-y-10">
          {faqs.map((faq, index) => (
            <div key={index} className="flex flex-col items-start text-left">
              <h3 className="text-white font-bold text-lg sm:text-xl md:text-[22px] tracking-tight leading-snug">
                {faq.question}
              </h3>
              <p className="text-white/80 font-normal text-sm sm:text-base md:text-[16px] leading-[1.65] mt-2 sm:mt-2.5 max-w-3xl">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
