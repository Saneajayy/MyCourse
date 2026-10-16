'use client';

import React, { useState } from 'react';
import {
  Button,
  Input,
  Tabs,
  Card,
  CardHeader,
  Badge,
  Modal,
  Skeleton,
  Accordion,
  ProgressBar,
  useToast,
} from '../../components/ui';

export default function StyleguidePage() {
  const { info, success, error, warning } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [progressVal, setProgressVal] = useState(65);

  const tabItems = [
    { id: 'overview', label: 'Overview', count: 12 },
    { id: 'components', label: 'Components', count: 10 },
    { id: 'contrast', label: 'Contrast & Tokens' },
  ];

  const accordionItems = [
    {
      id: 'module-1',
      title: 'Module 1: Hydraulic Fluid Power Fundamentals',
      subtitle: '6 Lessons • 1h 45m',
      badge: <Badge variant="orangeSubtle">Free Preview</Badge>,
      content: (
        <p className="text-sm text-course-darkBlue">
          Detailed breakdown of Pascal&apos;s law, pressure transmission, flow vs pressure, and
          viscosity indices for plant maintenance engineers.
        </p>
      ),
    },
    {
      id: 'module-2',
      title: 'Module 2: Positive Displacement Pumps & Actuators',
      subtitle: '8 Lessons • 2h 30m',
      badge: <Badge variant="dark">Paid Access</Badge>,
      content: (
        <p className="text-sm text-course-darkBlue">
          Covers fixed vs variable displacement pumps, axial piston pump swashplate control, and
          hydraulic cylinder sizing calculations.
        </p>
      ),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-16">
      <div>
        <div className="inline-block border border-black px-3 py-1 text-xs font-bold uppercase bg-course-orangeSubtle text-course-darkBlue mb-2">
          Dev-Only Design System Showcase
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-course-darkBlue tracking-tight">
          Component Styleguide
        </h1>
        <p className="text-sm md:text-base text-course-navySubtle mt-1">
          Strict flat design: NO box shadows, NO gradients, NO glassmorphism. Thin 1px solid black
          borders. WCAG AA contrast compliant. Touch targets 44px or larger.
        </p>
      </div>

      {/* 1. Design Tokens & Contrast Ratios */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold uppercase tracking-wider text-course-darkBlue border-b border-black pb-2">
          1. Color Tokens & Contrast Verification
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-black p-4 bg-course-white">
            <div className="h-12 bg-course-darkBlue text-white p-2 font-mono text-xs flex items-center justify-between border border-black">
              <span>Dark Blue (#0A192F)</span>
              <span>17.7:1</span>
            </div>
            <p className="text-xs text-course-navySubtle mt-2">
              Primary text & dark elements on White. Exceeds WCAG AAA (7:1).
            </p>
          </div>

          <div className="border border-black p-4 bg-course-white">
            <div className="h-12 bg-course-orange text-course-darkBlue p-2 font-mono text-xs flex items-center justify-between border border-black font-black">
              <span>Orange (#E05305)</span>
              <span>4.55:1</span>
            </div>
            <p className="text-xs text-course-navySubtle mt-2">
              Fills, badges, buttons, large headings. WCAG AA Large text compliant.
            </p>
          </div>

          <div className="border border-black p-4 bg-course-orange text-course-darkBlue">
            <div className="h-12 bg-course-white text-course-darkBlue p-2 font-mono text-xs flex items-center justify-between border border-black font-bold">
              <span>Dark Blue on Orange</span>
              <span>4.55:1</span>
            </div>
            <p className="text-xs text-course-darkBlue mt-2 font-medium">
              High-contrast text on orange fills. Exceeds WCAG AA Normal (4.5:1).
            </p>
          </div>
        </div>
      </section>

      {/* 2. Buttons */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold uppercase tracking-wider text-course-darkBlue border-b border-black pb-2">
          2. Buttons (Min 44px Touch Target)
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary">Primary Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="dark">Dark Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="primary" isLoading>
            Loading Button
          </Button>
          <Button variant="primary" disabled>
            Disabled Button
          </Button>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <Button size="sm" variant="outline">
            Small Button
          </Button>
          <Button size="md" variant="outline">
            Medium Button
          </Button>
          <Button size="lg" variant="primary">
            Large Button
          </Button>
        </div>
      </section>

      {/* 3. Inputs */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold uppercase tracking-wider text-course-darkBlue border-b border-black pb-2">
          3. Inputs & Forms
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Full Name"
            placeholder="e.g. Ramesh Kumar"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            helperText="As it should appear on your completion certificate"
            required
          />
          <Input
            label="Work Email"
            type="email"
            placeholder="engineer@plant.com"
            error="Please enter a valid engineering organization email"
            defaultValue="invalid-email"
            required
          />
        </div>
      </section>

      {/* 4. Tabs */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold uppercase tracking-wider text-course-darkBlue border-b border-black pb-2">
          4. Tabs (Flat 1px Border)
        </h2>
        <Tabs tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} />
        <p className="text-xs text-course-navySubtle mt-2">
          Currently active tab: <strong className="text-course-darkBlue">{activeTab}</strong>
        </p>
      </section>

      {/* 5. Cards */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold uppercase tracking-wider text-course-darkBlue border-b border-black pb-2">
          5. Cards
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card variant="default">
            <CardHeader
              title="Standard Card"
              subtitle="1px solid black border with clean whitespace"
              action={<Badge variant="orangeSubtle">Status</Badge>}
            />
            <p className="text-sm text-course-navyMuted">
              Built using our design system tokens. No box shadows, sharp 0px radius.
            </p>
          </Card>

          <Card variant="dark">
            <CardHeader
              title="Dark Card"
              subtitle="High contrast inverted container"
              action={<Badge variant="orange">Live</Badge>}
            />
            <p className="text-sm text-course-orangeSubtle">
              Engineered for callouts, stats, and high-impact emphasis sections.
            </p>
          </Card>
        </div>
      </section>

      {/* 6. Badges */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold uppercase tracking-wider text-course-darkBlue border-b border-black pb-2">
          6. Badges
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="default">Default Badge</Badge>
          <Badge variant="orange">Orange Badge</Badge>
          <Badge variant="orangeSubtle">Orange Subtle</Badge>
          <Badge variant="dark">Dark Badge</Badge>
          <Badge variant="success">Payment Verified</Badge>
          <Badge variant="error">Session Revoked</Badge>
        </div>
      </section>

      {/* 7. Modal */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold uppercase tracking-wider text-course-darkBlue border-b border-black pb-2">
          7. Modal Dialog
        </h2>
        <div>
          <Button variant="outline" onClick={() => setIsModalOpen(true)}>
            Open Sample Modal
          </Button>
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Sample Modal Title"
            description="Accessible modal dialog with Esc key dismiss and focus management"
          >
            <div className="space-y-4 mt-2">
              <p className="text-sm text-course-darkBlue">
                This dialog uses a flat 2px solid black border, zero radius, and a semi-transparent
                backdrop.
              </p>
              <div className="flex justify-end gap-3 pt-4 border-t border-black">
                <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={() => setIsModalOpen(false)}>
                  Confirm Action
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      </section>

      {/* 8. Toasts */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold uppercase tracking-wider text-course-darkBlue border-b border-black pb-2">
          8. Toast Notifications
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              info('Information', 'Your course progress was automatically synchronized.')
            }
          >
            Trigger Info Toast
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              success('Payment Confirmed', 'Order #ORD-9821 verified. Access granted.')
            }
          >
            Trigger Success Toast
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              warning('Active Session Warning', 'You have 3 active devices logged in.')
            }
          >
            Trigger Warning Toast
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => error('Playback Conflict', 'Stream taken over by another device.')}
          >
            Trigger Error Toast
          </Button>
        </div>
      </section>

      {/* 9. Skeleton Loaders */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold uppercase tracking-wider text-course-darkBlue border-b border-black pb-2">
          9. Skeleton Loaders
        </h2>
        <div className="border border-black p-6 space-y-4 bg-course-white">
          <div className="flex items-center gap-4">
            <Skeleton width={48} height={48} circle />
            <div className="space-y-2 flex-1">
              <Skeleton height={18} width="40%" />
              <Skeleton height={14} width="70%" />
            </div>
          </div>
          <Skeleton height={100} width="100%" />
        </div>
      </section>

      {/* 10. Accordion */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold uppercase tracking-wider text-course-darkBlue border-b border-black pb-2">
          10. Accordion (Curriculum / FAQ)
        </h2>
        <Accordion items={accordionItems} defaultOpenIds={['module-1']} />
      </section>

      {/* 11. Progress Bar */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold uppercase tracking-wider text-course-darkBlue border-b border-black pb-2">
          11. Progress Bar
        </h2>
        <div className="space-y-4">
          <ProgressBar
            value={progressVal}
            label="Course Curriculum Completion"
            showLabel
            size="md"
            variant="orange"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setProgressVal((p) => Math.max(0, p - 10))}
            >
              -10%
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setProgressVal((p) => Math.min(100, p + 10))}
            >
              +10%
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
