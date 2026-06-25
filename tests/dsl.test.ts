import { Tokenizer, Parser, VM, runDSL, DiceRoller } from '../src/dsl';

describe('Gaming DSL & AST Execution Engine', () => {
  // Mock dice roller that always returns deterministic values for testing
  const mockDiceRoller = (fixedRolls: number[]): DiceRoller => {
    return (count: number, sides: number) => {
      const rolls = fixedRolls.slice(0, count);
      // Fill remaining if fixedRolls is shorter than count
      while (rolls.length < count) {
        rolls.push(sides);
      }
      const total = rolls.reduce((a, b) => a + b, 0);
      return { rolls, total };
    };
  };

  describe('Tokenizer', () => {
    test('Tokenizes simple assignment and mathematical expressions', () => {
      const code = 'STR = 15 + 2 * 3;';
      const tokenizer = new Tokenizer(code);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(9); // STR, =, 15, +, 2, *, 3, ;, EOF
      expect(tokens[0]).toEqual({ type: 'IDENTIFIER', value: 'STR', line: 1, col: 1 });
      expect(tokens[1]).toEqual({ type: 'OPERATOR', value: '=', line: 1, col: 5 });
      expect(tokens[2]).toEqual({ type: 'NUMBER', value: '15', line: 1, col: 7 });
      expect(tokens[3]).toEqual({ type: 'OPERATOR', value: '+', line: 1, col: 10 });
      expect(tokens[4]).toEqual({ type: 'NUMBER', value: '2', line: 1, col: 12 });
      expect(tokens[5]).toEqual({ type: 'OPERATOR', value: '*', line: 1, col: 14 });
      expect(tokens[6]).toEqual({ type: 'NUMBER', value: '3', line: 1, col: 16 });
      expect(tokens[7]).toEqual({ type: 'SEMICOLON', value: ';', line: 1, col: 17 });
      expect(tokens[8]).toEqual({ type: 'EOF', value: '', line: 1, col: 18 });
    });

    test('Tokenizes dice rolls and comparisons', () => {
      const code = 'resolve(2d6 + STR >= 10)';
      const tokenizer = new Tokenizer(code);
      const tokens = tokenizer.tokenize();

      // resolve, (, 2d6, +, STR, >=, 10, ), EOF
      expect(tokens).toHaveLength(9);
      expect(tokens[0]).toEqual({ type: 'IDENTIFIER', value: 'resolve', line: 1, col: 1 });
      expect(tokens[1]).toEqual({ type: 'LPAREN', value: '(', line: 1, col: 8 });
      expect(tokens[2]).toEqual({ type: 'DICE', value: '2d6', line: 1, col: 9 });
      expect(tokens[3]).toEqual({ type: 'OPERATOR', value: '+', line: 1, col: 13 });
      expect(tokens[4]).toEqual({ type: 'IDENTIFIER', value: 'STR', line: 1, col: 15 });
      expect(tokens[5]).toEqual({ type: 'OPERATOR', value: '>=', line: 1, col: 19 });
      expect(tokens[6]).toEqual({ type: 'NUMBER', value: '10', line: 1, col: 22 });
      expect(tokens[7]).toEqual({ type: 'RPAREN', value: ')', line: 1, col: 24 });
      expect(tokens[8]).toEqual({ type: 'EOF', value: '', line: 1, col: 25 });
    });

    test('Handles decimal numbers, whitespace, and implicit 1d notation', () => {
      const code = 'd20 + 3.5';
      const tokenizer = new Tokenizer(code);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(4); // d20, +, 3.5, EOF
      expect(tokens[0]).toEqual({ type: 'DICE', value: 'd20', line: 1, col: 1 });
      expect(tokens[2]).toEqual({ type: 'NUMBER', value: '3.5', line: 1, col: 7 });
    });

    test('Throws syntax error on unexpected characters', () => {
      expect(() => {
        new Tokenizer('STR = 10 @ 5').tokenize();
      }).toThrow("Syntax Error: Unexpected character '@'");
    });
  });

  describe('Parser', () => {
    test('Parses mathematical operator precedence correctly', () => {
      // 1 + 2 * 3 should be parsed as 1 + (2 * 3)
      const tokenizer = new Tokenizer('1 + 2 * 3');
      const parser = new Parser(tokenizer.tokenize());
      const ast = parser.parse();

      expect(ast.type).toBe('Program');
      const stmt = ast.body[0];
      expect(stmt.type).toBe('ExpressionStatement');
      const expr = (stmt as any).expression;
      expect(expr.type).toBe('BinaryExpression');
      expect(expr.operator).toBe('+');
      expect(expr.left.type).toBe('NumericLiteral');
      expect(expr.left.value).toBe(1);
      expect(expr.right.type).toBe('BinaryExpression');
      expect(expr.right.operator).toBe('*');
      expect(expr.right.left.value).toBe(2);
      expect(expr.right.right.value).toBe(3);
    });

    test('Parses nested grouping parenthesis', () => {
      // (1 + 2) * 3
      const tokenizer = new Tokenizer('(1 + 2) * 3');
      const parser = new Parser(tokenizer.tokenize());
      const ast = parser.parse();

      const expr = (ast.body[0] as any).expression;
      expect(expr.type).toBe('BinaryExpression');
      expect(expr.operator).toBe('*');
      expect(expr.left.type).toBe('BinaryExpression');
      expect(expr.left.operator).toBe('+');
      expect(expr.right.value).toBe(3);
    });

    test('Parses dice expressions, variables, and unary operators', () => {
      const tokenizer = new Tokenizer('-STR + d20');
      const parser = new Parser(tokenizer.tokenize());
      const ast = parser.parse();

      const expr = (ast.body[0] as any).expression;
      expect(expr.type).toBe('BinaryExpression');
      expect(expr.operator).toBe('+');
      expect(expr.left.type).toBe('UnaryExpression');
      expect(expr.left.operator).toBe('-');
      expect(expr.left.argument.type).toBe('Identifier');
      expect(expr.left.argument.name).toBe('STR');
      expect(expr.right.type).toBe('DiceLiteral');
      expect(expr.right.count).toBe(1);
      expect(expr.right.sides).toBe(20);
    });

    test('Parses resolve function calls with single arguments', () => {
      const tokenizer = new Tokenizer('resolve(2d6 >= 8)');
      const parser = new Parser(tokenizer.tokenize());
      const ast = parser.parse();

      const expr = (ast.body[0] as any).expression;
      expect(expr.type).toBe('CallExpression');
      expect(expr.callee).toBe('resolve');
      expect(expr.arguments).toHaveLength(1);
      expect(expr.arguments[0].type).toBe('BinaryExpression');
      expect(expr.arguments[0].operator).toBe('>=');
    });

    test('Throws parse errors for malformed syntax', () => {
      expect(() => {
        new Parser(new Tokenizer('1 +').tokenize()).parse();
      }).toThrow('Parse Error');

      expect(() => {
        new Parser(new Tokenizer('resolve(').tokenize()).parse();
      }).toThrow('Parse Error');

      expect(() => {
        new Parser(new Tokenizer('STR = ').tokenize()).parse();
      }).toThrow('Parse Error');
    });
  });

  describe('VM Runner', () => {
    test('Executes basic assignment and variables retrieval', () => {
      const context = { STR: 12 };
      const code = 'DEX = STR + 2; DEX;';
      const result = runDSL(code, context);

      expect(result.value).toBe(14);
      expect(result.variables).toEqual({ STR: 12, DEX: 14 });
      expect(result.logs).toContain('Lookup: STR = 12');
      expect(result.logs).toContain('Assign: DEX = 14');
      expect(result.logs).toContain('Lookup: DEX = 14');
    });

    test('Handles math operations and division by zero', () => {
      expect(runDSL('10 / 2').value).toBe(5);
      expect(runDSL('1.5 * 4').value).toBe(6);
      expect(runDSL('10 - 2.5').value).toBe(7.5);

      expect(() => {
        runDSL('10 / 0');
      }).toThrow('Division by zero');
    });

    test('Executes comparison operators', () => {
      expect(runDSL('5 >= 5').value).toBe(true);
      expect(runDSL('5 >= 6').value).toBe(false);
      expect(runDSL('5 <= 5').value).toBe(true);
      expect(runDSL('5 < 6').value).toBe(true);
      expect(runDSL('6 > 5').value).toBe(true);
      expect(runDSL('5 == 5').value).toBe(true);
      expect(runDSL('5 != 5').value).toBe(false);
      expect(runDSL('5 != 6').value).toBe(true);
    });

    test('Resolves dice notation using custom DiceRoller', () => {
      // 2d6 + STR against STR: 3
      // We mock 2d6 to roll [4, 5] = 9
      const dRoller = mockDiceRoller([4, 5]);
      const result = runDSL('2d6 + STR', { STR: 3 }, dRoller);

      expect(result.value).toBe(12);
      expect(result.logs).toContain('Roll: 2d6 -> [4, 5] = 9');
      expect(result.logs).toContain('Lookup: STR = 3');
      expect(result.logs).toContain('Binary: 9 + 3 -> 12');
    });

    test('Executes default random dice rolling within standard bounds', () => {
      const runs = 50;
      for (let i = 0; i < runs; i++) {
        const result = runDSL('2d6');
        expect(result.value).toBeGreaterThanOrEqual(2);
        expect(result.value).toBeLessThanOrEqual(12);
      }

      for (let i = 0; i < runs; i++) {
        const result = runDSL('d20');
        expect(result.value).toBeGreaterThanOrEqual(1);
        expect(result.value).toBeLessThanOrEqual(20);
      }
    });

    test('Evaluates resolve function correctly', () => {
      const dRoller = mockDiceRoller([5, 6]); // 2d6 -> 11
      const resultSuccess = runDSL('resolve(2d6 + STR >= 13)', { STR: 3 }, dRoller);

      expect(resultSuccess.value).toEqual({ success: true, value: true });
      expect(resultSuccess.logs).toContain('Call resolve: success=true, value=true');

      const resultFailure = runDSL('resolve(2d6 + STR >= 15)', { STR: 3 }, dRoller);
      expect(resultFailure.value).toEqual({ success: false, value: false });
      expect(resultFailure.logs).toContain('Call resolve: success=false, value=false');
    });

    test('Evaluates min, max, floor, ceil functions', () => {
      expect(runDSL('min(5, 10, 2)').value).toBe(2);
      expect(runDSL('max(5, 10, 2)').value).toBe(10);
      expect(runDSL('floor(4.7)').value).toBe(4);
      expect(runDSL('ceil(4.2)').value).toBe(5);
    });

    test('Throws runtime error on undefined variables and functions', () => {
      expect(() => {
        runDSL('STR + 5', {});
      }).toThrow("Variable 'STR' is not defined");

      expect(() => {
        runDSL('unknownFunc(5)');
      }).toThrow("Undefined function 'unknownFunc'");
    });

    test('Executes complex campaign rulesets with multiple lines', () => {
      const ruleset = `
        BASE_DC = 12;
        PROF_BONUS = 3;
        TOTAL_MOD = DEX + PROF_BONUS;
        ROLL_RES = d20;
        resolve(ROLL_RES + TOTAL_MOD >= BASE_DC);
      `;
      const context = { DEX: 2 };
      const dRoller = mockDiceRoller([6]); // d20 -> 6

      const result = runDSL(ruleset, context, dRoller);
      // DEX = 2
      // BASE_DC = 12
      // PROF_BONUS = 3
      // TOTAL_MOD = DEX + PROF_BONUS = 5
      // ROLL_RES = 6
      // ROLL_RES + TOTAL_MOD = 11 >= 12 -> false
      expect(result.variables.BASE_DC).toBe(12);
      expect(result.variables.PROF_BONUS).toBe(3);
      expect(result.variables.TOTAL_MOD).toBe(5);
      expect(result.variables.ROLL_RES).toBe(6);
      expect(result.value).toEqual({ success: false, value: false });
    });
  });
});
