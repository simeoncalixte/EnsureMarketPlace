import { evaluateFormula } from './formula';

/**
 * Slice 5.1 — SAFE formula evaluator tests.
 *
 * Two halves:
 *   1. Correctness: arithmetic, precedence, parens, unary, functions, variables.
 *   2. ADVERSARIAL rejection battery: every malicious / out-of-grammar input must
 *      return { ok:false }, NEVER throw, NEVER execute anything.
 */

function val(expr: string, vars: Record<string, number> = {}): number {
  const r = evaluateFormula(expr, vars);
  if (!r.ok) {
    throw new Error(`expected ok for "${expr}" but got error: ${r.error}`);
  }
  return r.value;
}

describe('evaluateFormula — correctness', () => {
  it('numeric literals incl. decimals and exponents', () => {
    expect(val('42')).toBe(42);
    expect(val('3.5')).toBe(3.5);
    expect(val('.5')).toBe(0.5);
    expect(val('1e3')).toBe(1000);
    expect(val('1.5e2')).toBe(150);
    expect(val('2e-1')).toBeCloseTo(0.2, 10);
  });

  it('binary arithmetic', () => {
    expect(val('1+2')).toBe(3);
    expect(val('10-4')).toBe(6);
    expect(val('6*7')).toBe(42);
    expect(val('20/4')).toBe(5);
  });

  it('operator precedence', () => {
    expect(val('2+3*4')).toBe(14);
    expect(val('2*3+4')).toBe(10);
    expect(val('10-2-3')).toBe(5); // left-assoc
    expect(val('100/10/2')).toBe(5); // left-assoc
  });

  it('parentheses override precedence', () => {
    expect(val('(2+3)*4')).toBe(20);
    expect(val('2*(3+4)')).toBe(14);
    expect(val('((1+2))')).toBe(3);
  });

  it('unary minus / plus (incl. chained)', () => {
    expect(val('-5')).toBe(-5);
    expect(val('-(2+3)')).toBe(-5);
    expect(val('3 - -2')).toBe(5);
    expect(val('--5')).toBe(5);
    expect(val('+7')).toBe(7);
    expect(val('2*-3')).toBe(-6);
  });

  it('variable binding (resolved from vars only)', () => {
    expect(val('wind', { wind: 140 })).toBe(140);
    expect(val('wind-130', { wind: 140 })).toBe(10);
    expect(val('(wind-130)*125000', { wind: 140 })).toBe(1_250_000);
    expect(val('limit', { limit: 5_000_000 })).toBe(5_000_000);
  });

  it('min / max / abs / clamp functions', () => {
    expect(val('min(3,5)')).toBe(3);
    expect(val('max(3,5)')).toBe(5);
    expect(val('min(1,2,3,4)')).toBe(1);
    expect(val('max(1,2,3,4)')).toBe(4);
    expect(val('abs(-7)')).toBe(7);
    expect(val('clamp(15,0,10)')).toBe(10);
    expect(val('clamp(-3,0,10)')).toBe(0);
    expect(val('clamp(5,0,10)')).toBe(5);
  });

  it('the canonical payout formula: min(limit,(wind-130)*125000)', () => {
    // Below cap.
    expect(val('min(limit,(wind-130)*125000)', { wind: 140, limit: 5_000_000 })).toBe(1_250_000);
    // Capped at limit.
    expect(val('min(limit,(wind-130)*125000)', { wind: 200, limit: 5_000_000 })).toBe(5_000_000);
  });

  it('whitespace tolerated', () => {
    expect(val('  2  +   3 ')).toBe(5);
    expect(val('min( 3 , 5 )')).toBe(3);
  });
});

describe('evaluateFormula — error handling (graceful, never throws)', () => {
  function rejected(expr: string, vars: Record<string, number> = {}): string {
    const r = evaluateFormula(expr, vars);
    expect(r.ok).toBe(false);
    return r.ok ? '' : r.error;
  }

  it('unknown variable → error, NEVER silent 0', () => {
    rejected('wind'); // no vars
    rejected('wind+limit', { wind: 100 }); // limit missing
    const r = evaluateFormula('foo', {});
    expect(r.ok).toBe(false);
  });

  it('division by zero', () => {
    rejected('1/0');
    rejected('5/(3-3)');
  });

  it('non-finite results rejected', () => {
    // huge exponent overflow → Infinity
    rejected('1e308*1e308');
  });

  it('empty / whitespace-only / non-string', () => {
    rejected('');
    rejected('   ');
    // @ts-expect-error testing non-string input
    expect(evaluateFormula(null, {}).ok).toBe(false);
    // @ts-expect-error testing non-string input
    expect(evaluateFormula(123, {}).ok).toBe(false);
  });

  it('malformed arithmetic', () => {
    rejected('1+');
    rejected('*3');
    rejected('(1+2');
    rejected('1+2)');
    rejected('1 2');
    rejected('min()'); // arity 0 not allowed
    rejected('abs(1,2)'); // wrong arity
    rejected('clamp(1,2)'); // wrong arity
  });
});

describe('evaluateFormula — ADVERSARIAL rejection battery', () => {
  // Each of these must return { ok:false } and NEVER execute / throw uncaught.
  const malicious = [
    'eval("1")',
    'eval',
    'require("fs")',
    'require',
    'process.exit(1)',
    'process',
    'global',
    'globalThis',
    'this',
    'constructor',
    'a.constructor',
    '({}).constructor',
    '__proto__',
    'a.__proto__',
    'x.y',
    'a.b.c',
    "x['y']",
    'arr[0]',
    '()=>1',
    '(x)=>x',
    'function(){return 1}',
    '1;2',
    '1,2', // bare comma outside a call
    'a=1',
    'x==1',
    'x===1',
    '1<2',
    '1>2',
    '1<=2',
    '1&&1',
    '1||0',
    '1&1',
    '1|1',
    '1^1',
    '~1',
    '!1',
    '1%2',
    '2**3',
    '1?2:3',
    '"string"',
    "'string'",
    '`template`',
    '`${1}`',
    'new Array(1)',
    'new',
    'delete a',
    'typeof a',
    'void 0',
    'a\\b',
    'a#b',
    'a@b',
    'a$b',
    '0x10', // hex literal not supported
    'window',
    'Math.random()',
    'Math',
    'Number(1)',
    'parseInt("1")',
    'setTimeout',
    'import("fs")',
    'await x',
    'yield 1',
    '5x', // number glued to identifier
  ];

  it.each(malicious)('safely rejects: %s', (expr) => {
    let result: ReturnType<typeof evaluateFormula>;
    expect(() => {
      result = evaluateFormula(expr, { a: 1, x: 1, arr: 1 });
    }).not.toThrow();
    expect(result!.ok).toBe(false);
  });

  it('does not invoke object prototype members via vars', () => {
    // 'toString' / 'hasOwnProperty' exist on Object.prototype but are NOT own
    // properties of an empty vars map → must be rejected, not resolved.
    expect(evaluateFormula('toString', {}).ok).toBe(false);
    expect(evaluateFormula('hasOwnProperty', {}).ok).toBe(false);
    expect(evaluateFormula('valueOf', {}).ok).toBe(false);
  });

  it('rejects input that exceeds the max length', () => {
    const long = '1+'.repeat(600) + '1'; // > 1000 chars
    expect(evaluateFormula(long, {}).ok).toBe(false);
  });

  it('rejects deeply nested input (depth guard, no stack overflow)', () => {
    const deep = '('.repeat(200) + '1' + ')'.repeat(200);
    let result: ReturnType<typeof evaluateFormula>;
    expect(() => {
      result = evaluateFormula(deep, {});
    }).not.toThrow();
    expect(result!.ok).toBe(false);
  });

  it('rejects a large flat expression (node guard)', () => {
    const big = Array.from({ length: 1500 }, () => '1').join('+');
    const r = evaluateFormula(big, {});
    // Either too-many-tokens or too-many-nodes — both are { ok:false }.
    expect(r.ok).toBe(false);
  });
});
