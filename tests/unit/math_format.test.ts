import { describe, it, expect } from 'vitest';
import { formatMathNotation, formatMathObject } from '@/lib/math-format';

describe('Human Paper Mathematical Notation Formatter', () => {
  it('converts basic powers like n^3 to superscript n³', () => {
    expect(formatMathNotation('n^3')).toBe('n³');
    expect(formatMathNotation('3x^2')).toBe('3x²');
    expect(formatMathNotation('x^n')).toBe('xⁿ');
  });

  it('accurately transforms calculus power rule equations', () => {
    const input = "Using the power rule d/dx[x^n] = n*x^(n-1): d/dx[3x^2] = 6x, d/dx[5x] = 5, and the derivative of a constant (-7) is 0. Thus, f'(x) = 6x + 5.";
    const output = formatMathNotation(input);
    expect(output).toContain('d/dx[xⁿ] = n·xⁿ⁻¹');
    expect(output).toContain('d/dx[3x²] = 6x');
    expect(output).not.toContain('^');
    expect(output).not.toContain('n*x');
  });

  it('converts negative exponents and scientific notation', () => {
    expect(formatMathNotation('10^-3')).toBe('10⁻³');
    expect(formatMathNotation('10^(-6)')).toBe('10⁻⁶');
    expect(formatMathNotation('e^(-x)')).toBe('e⁻ˣ');
  });

  it('formats physics units with superscripts', () => {
    expect(formatMathNotation('Acceleration is 9.8 m/s^2.')).toBe('Acceleration is 9.8 m/s².');
    expect(formatMathNotation('Volume is 250 cm^3.')).toBe('Volume is 250 cm³.');
  });

  it('formats polynomial equations and algebra dot operator', () => {
    expect(formatMathNotation('(a+b)^2 = a^2 + 2*a*b + b^2')).toBe('(a+b)² = a² + 2·a·b + b²');
  });

  it('converts chemical formulas to subscript numbers', () => {
    expect(formatMathNotation('6CO2 + 6H2O -> C6H12O6 + 6O2')).toBe('6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂');
    expect(formatMathNotation('Water (H2O) and Carbon Dioxide (CO2)')).toBe('Water (H₂O) and Carbon Dioxide (CO₂)');
  });

  it('converts variable index subscripts correctly', () => {
    expect(formatMathNotation('x_1 + x_2 = 10')).toBe('x₁ + x₂ = 10');
    expect(formatMathNotation('v_0 + a*t')).toBe('v₀ + a·t');
  });

  it('formats inequality and comparison symbols into paper notation', () => {
    expect(formatMathNotation('x <= 5 and y >= 10 and z != 0')).toBe('x ≤ 5 and y ≥ 10 and z ≠ 0');
    expect(formatMathNotation('x = -b +- sqrt(D)')).toBe('x = -b ± sqrt(D)');
  });

  it('formatMathObject recursively formats nested objects while preserving IDs and enums', () => {
    const data = {
      id: 'q-1234',
      type: 'short_answer',
      prompt: 'Evaluate d/dx[5x^3].',
      options: ['15x^2', '5x^2', '15x^3', '10x'],
      rubric: {
        sample_answer: 'Using d/dx[x^n] = n*x^(n-1), result is 15x^2.',
      },
    };

    const formatted = formatMathObject(data);
    expect(formatted.id).toBe('q-1234');
    expect(formatted.type).toBe('short_answer'); // Must NOT be corrupted into shortₐ...
    expect(formatted.prompt).toBe('Evaluate d/dx[5x³].');
    expect(formatted.options[0]).toBe('15x²');
    expect(formatted.rubric.sample_answer).toContain('d/dx[xⁿ] = n·xⁿ⁻¹');
    expect(formatted.rubric.sample_answer).toContain('15x²');
  });
});
