# Design System & WCAG Contrast Verification

This document records the exact WCAG 2.1 contrast ratios and design token specifications implemented for **Phase 6: Student-Facing Website**.

---

## 1. Palette & Luminance Definitions

| Token Name            | Hex Code  | Relative Luminance ($L$) | Role & Usage Restrictions                                    |
| :-------------------- | :-------- | :----------------------- | :----------------------------------------------------------- |
| `course-white`        | `#FFFFFF` | 1.000                    | Primary background for pages and cards                       |
| `course-darkBlue`     | `#0A192F` | 0.0093                   | Primary body text, high-emphasis headings, dark buttons      |
| `course-orange`       | `#E05305` | 0.2200                   | Button fills, badge fills, accents, large bold headings only |
| `course-orangeSubtle` | `#FFF4EC` | 0.9150                   | Subtle callout fills, badge backgrounds                      |
| `course-bg`           | `#F8FAFC` | 0.9420                   | Secondary table headers and muted containers                 |
| `course-navyMuted`    | `#4A5568` | 0.1030                   | Secondary explanatory text ($\ge 14\text{px}$)               |

---

## 2. Text / Background Contrast Ratios & WCAG Compliance

| Pair                   | Foreground                | Background                | Calculated Ratio | WCAG AA Standard         | Status & Strict Rules                                                                                |
| :--------------------- | :------------------------ | :------------------------ | :--------------- | :----------------------- | :--------------------------------------------------------------------------------------------------- |
| **Primary Body**       | Dark Blue (`#0A192F`)     | White (`#FFFFFF`)         | **17.70:1**      | $\ge 4.5:1$ (Normal)     | **Passes WCAG AAA (Exceeds 7:1)**                                                                    |
| **Inverted Body**      | White (`#FFFFFF`)         | Dark Blue (`#0A192F`)     | **17.70:1**      | $\ge 4.5:1$ (Normal)     | **Passes WCAG AAA (Exceeds 7:1)**                                                                    |
| **High-Contrast Fill** | Dark Blue (`#0A192F`)     | Safety Orange (`#E05305`) | **4.55:1**       | $\ge 4.5:1$ (Normal)     | **Passes WCAG AA Normal Text**                                                                       |
| **White on Orange**    | White (`#FFFFFF`)         | Safety Orange (`#E05305`) | **3.89:1**       | $\ge 3.0:1$ (Large/Bold) | **Passes WCAG AA for Large/Bold ($\ge 14\text{pt}$ bold / buttons)**. _Fails for small body text._   |
| **Orange on White**    | Safety Orange (`#E05305`) | White (`#FFFFFF`)         | **3.89:1**       | $\ge 3.0:1$ (Large)      | **Passes for Large Text ($\ge 18\text{pt}$ or $\ge 14\text{pt}$ bold)**. _PROHIBITED for body text._ |
| **Secondary Text**     | Slate Muted (`#4A5568`)   | White (`#FFFFFF`)         | **7.54:1**       | $\ge 4.5:1$ (Normal)     | **Passes WCAG AAA**                                                                                  |
| **Success Banner**     | Emerald Dark (`#064E3B`)  | Emerald Light (`#ECFDF5`) | **10.2:1**       | $\ge 4.5:1$ (Normal)     | **Passes WCAG AAA**                                                                                  |
| **Error Banner**       | Rose Dark (`#881337`)     | Rose Light (`#FFF1F2`)    | **9.1:1**        | $\ge 4.5:1$ (Normal)     | **Passes WCAG AAA**                                                                                  |

---

## 3. Strict Aesthetic Constraints Verification

1. **Flat Look Enforcement**:
   - `boxShadow: { none: '0 0 #0000' }` configured in `tailwind.config.ts`.
   - All standard Tailwind shadows (`shadow-sm`, `shadow-md`, `shadow-lg`, etc.) disabled.
   - No CSS gradients (`backgroundImage: { none: 'none' }`).
   - No glassmorphism (`backdrop-filter` absent).
   - Thin 1px solid black borders (`border border-black`) on interactive buttons, tabs, and input elements.
2. **Mobile-First & Touch Targets**:
   - Every interactive element (`<button>`, `<a>`, `<input>`) specifies a minimum touch target of `min-h-[44px]` and `min-w-[44px]`.
   - Responsive breakpoints verified across 360px (mobile 4G viewport), 768px (tablet), and 1280px (desktop).
3. **Typography**:
   - Clean, highly legible sans-serif system stack (`Inter`, system-ui, sans-serif) loaded with zero layout shift.
   - Tone: honest, practical, engineering-focused, zero fake urgency.
