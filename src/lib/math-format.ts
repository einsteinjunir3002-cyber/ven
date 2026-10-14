/**
 * Utility for formatting mathematical statements, exponents, bases, and scientific notation
 * into human-readable notation (superscript/subscript) exactly as written on paper.
 * Example: "n^3" -> "n³", "d/dx[x^n] = n*x^(n-1)" -> "d/dx[xⁿ] = n·xⁿ⁻¹"
 */

export const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ',
  'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'i': 'ⁱ', 'j': 'ʲ',
  'k': 'ᵏ', 'l': 'ˡ', 'm': 'ᵐ', 'n': 'ⁿ', 'o': 'ᵒ',
  'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ',
  'v': 'ᵛ', 'w': 'ʷ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ',
  'A': 'ᴬ', 'B': 'ᴮ', 'D': 'ᴰ', 'E': 'ᴱ', 'G': 'ᴳ',
  'H': 'ᴴ', 'I': 'ᴵ', 'J': 'ᴶ', 'K': 'ᴷ', 'L': 'ᴸ',
  'M': 'ᴹ', 'N': 'ᴺ', 'O': 'ᴼ', 'P': 'ᴾ', 'R': 'ᴿ',
  'T': 'ᵀ', 'U': 'ᵁ', 'V': 'ⱽ', 'W': 'ᵂ',
};

export const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
  'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
  'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ',
  'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
  'v': 'ᵥ', 'x': 'ₓ',
};

export function toSuperscript(str: string): string {
  return str.split('').map((c) => SUPERSCRIPT_MAP[c] ?? c).join('');
}

export function toSubscript(str: string): string {
  return str.split('').map((c) => SUBSCRIPT_MAP[c] ?? c).join('');
}

/**
 * Transforms machine-like notation (carets ^, underscores _) into human paper notation
 */
export function formatMathNotation(text: string): string {
  if (!text || typeof text !== 'string') return text;

  let formatted = text;

  // 1. Caret with parenthesized or braced exponents: x^(n-1), x^{n-1}, x^(2n+1), 10^(-3)
  formatted = formatted.replace(/\^[\(\{]([a-zA-Z0-9\+\-\=\s]+)[\)\}]/g, (_, expr: string) => {
    const cleanExpr = expr.replace(/\s+/g, '');
    return toSuperscript(cleanExpr);
  });

  // 2. Caret with direct exponent token: n^3 -> n³, 3x^2 -> 3x², x^n -> xⁿ, 10^-3 -> 10⁻³, m/s^2 -> m/s²
  formatted = formatted.replace(/\^(-?[a-zA-Z0-9]+)/g, (_, expr: string) => {
    return toSuperscript(expr);
  });

  // 3. Subscripts with underscore and parentheses or curly braces: x_(1) -> x₁, a_{n-1} -> aₙ₋₁
  formatted = formatted.replace(/([a-zA-Z0-9])_[\(\{]([a-zA-Z0-9\+\-\=\s]+)[\)\}]/g, (_, base: string, expr: string) => {
    const cleanExpr = expr.replace(/\s+/g, '');
    return base + toSubscript(cleanExpr);
  });

  // 4. Subscripts for single index variable/digit: x_1 -> x₁, v_0 -> v₀, a_n -> aₙ, x_i -> xᵢ
  formatted = formatted.replace(/([a-zA-Z])_([0-9a-z])\b/g, (_, base: string, expr: string) => {
    return base + toSubscript(expr);
  });

  // 5. Common chemical compounds with subscripts: H2O -> H₂O, CO2 -> CO₂, C6H12O6 -> C₆H₁₂O₆
  formatted = formatted.replace(/(?:^|\b|\s|\()([0-9]*)(H2O|CO2|O2|N2|H2|CH4|C6H12O6|NH3|H2SO4|NO2|SO2|CaCO3)\b/g, (match, _coeff, formula: string) => {
    const subFormula = formula.replace(/(\d+)/g, (digits: string) => toSubscript(digits));
    return match.replace(formula, subFormula);
  });

  // 6. Replace multiplication * with dot operator between algebraic terms (e.g. 2*a*b -> 2·a·b, n*x -> n·x)
  let prevMul = '';
  while (prevMul !== formatted) {
    prevMul = formatted;
    formatted = formatted.replace(/([a-zA-Z0-9⁰-⁹ⁿ⁻⁺])\s*\*\s*([a-zA-Z0-9⁰-⁹ⁿ⁻⁺])/g, '$1·$2');
  }

  // 7. Common mathematical symbols humans write on paper
  formatted = formatted.replace(/(?:\+\/-|\+\-)/g, '±');
  formatted = formatted.replace(/<=/g, '≤');
  formatted = formatted.replace(/>=/g, '≥');
  formatted = formatted.replace(/!=/g, '≠');
  formatted = formatted.replace(/<->/g, '↔');
  formatted = formatted.replace(/(?<=\s)->(?=\s)/g, '→');

  return formatted;
}

const RESERVED_METADATA_KEYS = new Set([
  'id',
  'quiz_id',
  'question_id',
  'user_id',
  'attempt_id',
  'type',
  'status',
  'verdict',
  'difficulty',
  'mode',
  'source_type',
  'created_at',
  'started_at',
  'submitted_at',
  'marked_at',
]);

/**
 * Deeply formats all strings inside an object or array with mathematical notation,
 * preserving identifiers, types, and DB schema fields intact.
 */
export function formatMathObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return formatMathNotation(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => formatMathObject(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      if (RESERVED_METADATA_KEYS.has(key)) {
        result[key] = val;
      } else {
        result[key] = formatMathObject(val);
      }
    }
    return result as T;
  }

  return obj;
}
