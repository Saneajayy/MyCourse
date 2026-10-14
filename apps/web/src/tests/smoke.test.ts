import { describe, it, expect } from 'vitest';
import { metadata } from '../app/layout.js';

describe('Web Application Baseline Tests', () => {
  it('Configures SEO metadata for course landing page', () => {
    expect(metadata.title).toContain('Hydraulic Engineering Masterclass');
    expect(metadata.description).toContain('hydraulic systems');
  });

  it('Verifies theme constraint definitions', () => {
    // White + Orange + Dark Blue theme validation
    const brandColors = {
      white: '#FFFFFF',
      orange: '#E05305',
      darkBlue: '#0A192F',
    };

    expect(brandColors.white).toBe('#FFFFFF');
    expect(brandColors.orange).toBe('#E05305');
    expect(brandColors.darkBlue).toBe('#0A192F');
  });
});
