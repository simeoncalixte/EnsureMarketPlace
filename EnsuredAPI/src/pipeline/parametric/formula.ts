/**
 * Slice 5.1 — SAFE parametric payout-formula evaluator (PURE, DB-free).
 *
 * Evaluates a `payoutFormula` string such as `min(limit,(wind-130)*125000)` by
 * binding named variables (the index value, the limit, ...) and computing a number.
 *
 * SECURITY CONTRACT (founder decision #2 — locked):
 *   - NO `eval`, NO `Function`, NO `vm`, NO dynamic `import`. EVER. This module is a
 *     HAND-WRITTEN tokenizer + Pratt parser → AST → evaluator. It cannot execute
 *     arbitrary JavaScript because it never hands a string to any JS evaluator.
 *   - STRICT WHITELIST. The grammar accepts ONLY:
 *       * numeric literals (123, 4.5, 1e3)
 *       * identifiers, each resolved from the supplied `vars` map (unknown ⇒ error,
 *         never a silent 0)
 *       * binary operators  +  -  *  /
 *       * unary minus / unary plus
 *       * parentheses for grouping
 *       * the function calls  min(...)  max(...)  abs(x)  clamp(x, lo, hi)
 *     EVERYTHING else is rejected with `{ ok: false }` and NEVER executes:
 *     unknown identifiers, unknown function names, property access (`a.b`,
 *     `a['b']`), assignment (`=`), comparison / logical operators, the comma
 *     outside a function-argument list, statement separators (`;`), strings,
 *     template literals/backticks, arrow functions, `this`, `constructor`,
 *     `__proto__`, `require`, `process`, `global`, etc. — they are either
 *     un-tokenizable characters or parse errors.
 *   - HARD LIMITS guard against resource-exhaustion input: max input length, max
 *     token count, max parser recursion depth, max AST node count. Deeply nested
 *     or pathologically long input is rejected, not parsed.
 *   - TOTAL. `evaluateFormula` never throws; every failure path returns
 *     `{ ok: false, error }`. Division by zero / non-finite result ⇒ `{ ok:false }`.
 *   - DETERMINISTIC & PURE. No DB, no clock, no network. Same input ⇒ same output.
 */

export type EvaluateOk = { ok: true; value: number };
export type EvaluateErr = { ok: false; error: string };
export type EvaluateResult = EvaluateOk | EvaluateErr;

// --- Hard limits (resource-exhaustion guards) ------------------------------

const MAX_INPUT_LENGTH = 1000; // characters
const MAX_TOKENS = 500;
const MAX_DEPTH = 64; // parser recursion depth
const MAX_NODES = 2000; // AST node count

// --- Whitelisted functions -------------------------------------------------

type FnSpec = { arity: number | [number, number]; apply: (args: number[]) => number };

const FUNCTIONS: Record<string, FnSpec> = {
  min: { arity: [1, 16], apply: (a) => Math.min(...a) },
  max: { arity: [1, 16], apply: (a) => Math.max(...a) },
  abs: { arity: 1, apply: (a) => Math.abs(a[0]) },
  // clamp(x, lo, hi) = max(lo, min(x, hi))
  clamp: { arity: 3, apply: (a) => Math.max(a[1], Math.min(a[0], a[2])) },
};

// --- Tokenizer -------------------------------------------------------------

type TokenType = 'number' | 'ident' | 'op' | 'lparen' | 'rparen' | 'comma';
type Token = { type: TokenType; value: string; pos: number };

const OPERATOR_CHARS = new Set(['+', '-', '*', '/']);

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function isIdentStart(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
}

function isIdentPart(ch: string): boolean {
  return isIdentStart(ch) || isDigit(ch);
}

/**
 * Tokenize. Throws `TokenizeError` on any character outside the whitelist (e.g.
 * `.` used as property access, `;`, `=`, `<`, `>`, `&`, `|`, quotes, backticks,
 * brackets). The only place `.` is allowed is INSIDE a numeric literal.
 */
class TokenizeError extends Error {}
class ParseError extends Error {}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;

  while (i < n) {
    const ch = input[i];

    // Whitespace (only spaces/tabs/newlines) — skip.
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i += 1;
      continue;
    }

    // Numeric literal: digits with optional single decimal point and optional
    // exponent. A leading '.' (e.g. `.5`) is also accepted as a number.
    if (isDigit(ch) || (ch === '.' && i + 1 < n && isDigit(input[i + 1]))) {
      const start = i;
      let sawDot = false;
      let sawExp = false;
      while (i < n) {
        const c = input[i];
        if (isDigit(c)) {
          i += 1;
        } else if (c === '.' && !sawDot && !sawExp) {
          sawDot = true;
          i += 1;
        } else if ((c === 'e' || c === 'E') && !sawExp) {
          sawExp = true;
          i += 1;
          if (i < n && (input[i] === '+' || input[i] === '-')) {
            i += 1;
          }
          if (i >= n || !isDigit(input[i])) {
            throw new TokenizeError(`malformed number at position ${start}`);
          }
        } else {
          break;
        }
      }
      const text = input.slice(start, i);
      // A trailing identifier char immediately after a number (e.g. `5x`) is an
      // error — reject rather than silently splitting.
      if (i < n && isIdentStart(input[i])) {
        throw new TokenizeError(`unexpected character '${input[i]}' after number at position ${i}`);
      }
      tokens.push({ type: 'number', value: text, pos: start });
      continue;
    }

    // Identifier (variable or function name).
    if (isIdentStart(ch)) {
      const start = i;
      while (i < n && isIdentPart(input[i])) {
        i += 1;
      }
      tokens.push({ type: 'ident', value: input.slice(start, i), pos: start });
      continue;
    }

    if (OPERATOR_CHARS.has(ch)) {
      tokens.push({ type: 'op', value: ch, pos: i });
      i += 1;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'lparen', value: ch, pos: i });
      i += 1;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'rparen', value: ch, pos: i });
      i += 1;
      continue;
    }

    if (ch === ',') {
      tokens.push({ type: 'comma', value: ch, pos: i });
      i += 1;
      continue;
    }

    // ANY other character is outside the whitelist — reject hard. This is the
    // single line that rejects `.` (property access), `;`, `=`, `<`, `>`, `!`,
    // `&`, `|`, `^`, `%`, `?`, `:`, `[`, `]`, `{`, `}`, quotes, backticks, `\`,
    // `@`, `#`, `$`, `~`, and any non-ASCII.
    throw new TokenizeError(`illegal character '${ch}' at position ${i}`);
  }

  if (tokens.length > MAX_TOKENS) {
    throw new TokenizeError(`too many tokens (${tokens.length} > ${MAX_TOKENS})`);
  }

  return tokens;
}

// --- AST -------------------------------------------------------------------

type Node =
  | { kind: 'num'; value: number }
  | { kind: 'var'; name: string }
  | { kind: 'unary'; op: '-' | '+'; operand: Node }
  | { kind: 'binary'; op: '+' | '-' | '*' | '/'; left: Node; right: Node }
  | { kind: 'call'; name: string; args: Node[] };

// --- Parser (recursive-descent / precedence-climbing) ----------------------

class Parser {
  private pos = 0;
  private nodeCount = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): Node {
    const node = this.parseExpression(0);
    if (this.pos < this.tokens.length) {
      const t = this.tokens[this.pos];
      throw new ParseError(`unexpected token '${t.value}' at position ${t.pos}`);
    }
    return node;
  }

  private bumpNode(): void {
    this.nodeCount += 1;
    if (this.nodeCount > MAX_NODES) {
      throw new ParseError(`expression too large (> ${MAX_NODES} nodes)`);
    }
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private next(): Token | undefined {
    return this.tokens[this.pos++];
  }

  /** Precedence-climbing expression parser. `depth` guards recursion. */
  private parseExpression(depth: number): Node {
    if (depth > MAX_DEPTH) {
      throw new ParseError(`expression nested too deeply (> ${MAX_DEPTH})`);
    }
    let left = this.parseTerm(depth);

    // Additive operators (lowest precedence handled at this level).
    while (true) {
      const t = this.peek();
      if (t && t.type === 'op' && (t.value === '+' || t.value === '-')) {
        this.next();
        const right = this.parseTerm(depth);
        this.bumpNode();
        left = { kind: 'binary', op: t.value as '+' | '-', left, right };
      } else {
        break;
      }
    }
    return left;
  }

  /** Multiplicative level. */
  private parseTerm(depth: number): Node {
    let left = this.parseUnary(depth);
    while (true) {
      const t = this.peek();
      if (t && t.type === 'op' && (t.value === '*' || t.value === '/')) {
        this.next();
        const right = this.parseUnary(depth);
        this.bumpNode();
        left = { kind: 'binary', op: t.value as '*' | '/', left, right };
      } else {
        break;
      }
    }
    return left;
  }

  /** Unary +/- (chainable). */
  private parseUnary(depth: number): Node {
    const t = this.peek();
    if (t && t.type === 'op' && (t.value === '+' || t.value === '-')) {
      this.next();
      const operand = this.parseUnary(depth + 1);
      this.bumpNode();
      return { kind: 'unary', op: t.value as '+' | '-', operand };
    }
    return this.parsePrimary(depth);
  }

  /** Primary: number, parenthesized expr, variable, or function call. */
  private parsePrimary(depth: number): Node {
    const t = this.next();
    if (!t) {
      throw new ParseError('unexpected end of expression');
    }

    if (t.type === 'number') {
      const value = Number(t.value);
      if (!Number.isFinite(value)) {
        throw new ParseError(`invalid numeric literal '${t.value}'`);
      }
      this.bumpNode();
      return { kind: 'num', value };
    }

    if (t.type === 'lparen') {
      const inner = this.parseExpression(depth + 1);
      const close = this.next();
      if (!close || close.type !== 'rparen') {
        throw new ParseError('missing closing parenthesis');
      }
      return inner;
    }

    if (t.type === 'ident') {
      const nextTok = this.peek();
      if (nextTok && nextTok.type === 'lparen') {
        // Function call — name MUST be in the whitelist.
        if (!Object.prototype.hasOwnProperty.call(FUNCTIONS, t.value)) {
          throw new ParseError(`unknown function '${t.value}'`);
        }
        this.next(); // consume '('
        const args: Node[] = [];
        if (this.peek() && this.peek()!.type !== 'rparen') {
          args.push(this.parseExpression(depth + 1));
          while (this.peek() && this.peek()!.type === 'comma') {
            this.next(); // consume ','
            args.push(this.parseExpression(depth + 1));
          }
        }
        const close = this.next();
        if (!close || close.type !== 'rparen') {
          throw new ParseError(`missing closing parenthesis for '${t.value}('`);
        }
        this.bumpNode();
        return { kind: 'call', name: t.value, args };
      }
      // Bare identifier ⇒ variable reference (resolved at eval time).
      this.bumpNode();
      return { kind: 'var', name: t.value };
    }

    throw new ParseError(`unexpected token '${t.value}' at position ${t.pos}`);
  }
}

// --- Evaluator -------------------------------------------------------------

function evalNode(node: Node, vars: Record<string, number>): number {
  switch (node.kind) {
    case 'num':
      return node.value;

    case 'var': {
      // Resolve ONLY from the supplied vars map. Unknown identifier ⇒ error
      // (NEVER a silent 0). Guard against prototype-chain pollution by requiring
      // an own enumerable property.
      if (!Object.prototype.hasOwnProperty.call(vars, node.name)) {
        throw new ParseError(`unknown variable '${node.name}'`);
      }
      const v = vars[node.name];
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        throw new ParseError(`variable '${node.name}' is not a finite number`);
      }
      return v;
    }

    case 'unary': {
      const operand = evalNode(node.operand, vars);
      return node.op === '-' ? -operand : operand;
    }

    case 'binary': {
      const left = evalNode(node.left, vars);
      const right = evalNode(node.right, vars);
      switch (node.op) {
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          if (right === 0) {
            throw new ParseError('division by zero');
          }
          return left / right;
        default:
          throw new ParseError('unknown operator');
      }
    }

    case 'call': {
      const spec = FUNCTIONS[node.name];
      if (!spec) {
        throw new ParseError(`unknown function '${node.name}'`);
      }
      const argc = node.args.length;
      const arity = spec.arity;
      const okArity = Array.isArray(arity)
        ? argc >= arity[0] && argc <= arity[1]
        : argc === arity;
      if (!okArity) {
        throw new ParseError(`wrong number of arguments to '${node.name}' (${argc})`);
      }
      const args = node.args.map((a) => evalNode(a, vars));
      return spec.apply(args);
    }

    default:
      throw new ParseError('unknown node');
  }
}

/**
 * Evaluate a whitelisted arithmetic formula with the supplied numeric variables.
 * TOTAL: never throws — every failure returns `{ ok: false, error }`.
 */
export function evaluateFormula(
  expr: string,
  vars: Record<string, number>,
): EvaluateResult {
  if (typeof expr !== 'string') {
    return { ok: false, error: 'formula must be a string' };
  }
  if (expr.length === 0) {
    return { ok: false, error: 'empty formula' };
  }
  if (expr.length > MAX_INPUT_LENGTH) {
    return { ok: false, error: `formula too long (> ${MAX_INPUT_LENGTH} chars)` };
  }

  const safeVars = vars && typeof vars === 'object' ? vars : {};

  try {
    const tokens = tokenize(expr);
    if (tokens.length === 0) {
      return { ok: false, error: 'formula has no tokens' };
    }
    const ast = new Parser(tokens).parse();
    const value = evalNode(ast, safeVars);
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return { ok: false, error: 'result is not a finite number' };
    }
    return { ok: true, value };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'evaluation failed';
    return { ok: false, error: message };
  }
}
