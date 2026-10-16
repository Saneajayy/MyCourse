'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface AccordionItemData {
  id: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  content: React.ReactNode;
}

export interface AccordionProps {
  items: AccordionItemData[];
  defaultOpenIds?: string[];
  allowMultiple?: boolean;
  className?: string;
}

export function Accordion({
  items,
  defaultOpenIds = [],
  allowMultiple = true,
  className = '',
}: AccordionProps) {
  const [openIds, setOpenIds] = useState<string[]>(defaultOpenIds);

  const toggle = (id: string) => {
    if (allowMultiple) {
      setOpenIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
      );
    } else {
      setOpenIds((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);
        const headerId = `accordion-header-${item.id}`;
        const panelId = `accordion-panel-${item.id}`;

        return (
          <div key={item.id} className="border border-black bg-course-white">
            <button
              type="button"
              id={headerId}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(item.id)}
              className="w-full min-h-[52px] p-4 text-left flex items-center justify-between gap-4 select-none hover:bg-course-orangeSubtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-black"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-base md:text-lg text-course-darkBlue">
                    {item.title}
                  </span>
                  {item.badge}
                </div>
                {item.subtitle && (
                  <div className="text-xs text-course-navySubtle mt-0.5">{item.subtitle}</div>
                )}
              </div>
              <ChevronDown
                className={`w-5 h-5 text-course-darkBlue shrink-0 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-course-orange' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            {isOpen && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={headerId}
                className="border-t border-black p-4 bg-course-bg"
              >
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
