/**
 * src/dsl.ts
 *
 * Gaming Domain-Specific Language (DSL) & AST Execution Engine.
 * Formally represents tabletop rulesets, dice rolls, character attributes,
 * and action resolution steps without using eval().
 */

// ============================================================================
// 1. Types & interfaces
// ============================================================================

export type TokenType =
  | 'DICE'
  | 'NUMBER'
  | 'IDENTIFIER'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'SEMICOLON'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}

export type ASTNode =
  | ProgramNode
  | AssignmentNode
  | ExpressionStatementNode
  | BinaryExpressionNode
  | UnaryExpressionNode
  | DiceLiteralNode
  | NumericLiteralNode
  | IdentifierNode
  | CallExpressionNode;

export interface ProgramNode {
  type: 'Program';
  body: ASTNode[];
}

export interface AssignmentNode {
  type: 'Assignment';
  name: string;
  value: ASTNode;
}

export interface ExpressionStatementNode {
  type: 'ExpressionStatement';
  expression: ASTNode;
}

export interface BinaryExpressionNode {
  type: 'BinaryExpression';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryExpressionNode {
  type: 'UnaryExpression';
  operator: '-' | '+';
  argument: ASTNode;
}

export interface DiceLiteralNode {
  type: 'DiceLiteral';
  count: number;
  sides: number;
}

export interface NumericLiteralNode {
  type: 'NumericLiteral';
  value: number;
}

export interface IdentifierNode {
  type: 'Identifier';
  name: string;
}

export interface CallExpressionNode {
  type: 'CallExpression';
  callee: string;
  arguments: ASTNode[];
}

export interface VMResult {
  value: any;
  variables: Record<string, any>;
  logs: string[];
}

export type DiceRoller = (count: number, sides: number) => { rolls: number[]; total: number };

// ============================================================================
// 2. Tokenizer
// ============================================================================

export class Tokenizer {
  private input: string;
  private pos = 0;
  private line = 1;
  private col = 1;

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.pos < this.input.length) {
      const char = this.input[this.pos];

      // Whitespace
      if (/\s/.test(char)) {
        if (char === '\n') {
          this.line++;
          this.col = 1;
        } else {
          this.col++;
        }
        this.pos++;
        continue;
      }

      // Semicolon
      if (char === ';') {
        tokens.push({ type: 'SEMICOLON', value: ';', line: this.line, col: this.col });
        this.pos++;
        this.col++;
        continue;
      }

      // Comma
      if (char === ',') {
        tokens.push({ type: 'COMMA', value: ',', line: this.line, col: this.col });
        this.pos++;
        this.col++;
        continue;
      }

      // Parentheses
      if (char === '(') {
        tokens.push({ type: 'LPAREN', value: '(', line: this.line, col: this.col });
        this.pos++;
        this.col++;
        continue;
      }
      if (char === ')') {
        tokens.push({ type: 'RPAREN', value: ')', line: this.line, col: this.col });
        this.pos++;
        this.col++;
        continue;
      }

      // Operators (multi-character check first)
      const remaining = this.input.substring(this.pos);
      const twoChars = remaining.substring(0, 2);
      if (['>=', '<=', '==', '!='].includes(twoChars)) {
        tokens.push({ type: 'OPERATOR', value: twoChars, line: this.line, col: this.col });
        this.pos += 2;
        this.col += 2;
        continue;
      }

      if (['+', '-', '*', '/', '>', '<', '='].includes(char)) {
        tokens.push({ type: 'OPERATOR', value: char, line: this.line, col: this.col });
        this.pos++;
        this.col++;
        continue;
      }

      // Dice roll pattern (e.g. 2d6, d20, 1d100)
      const diceMatch = remaining.match(/^(\d+)?d(\d+)/i);
      if (diceMatch) {
        const fullMatch = diceMatch[0];
        tokens.push({ type: 'DICE', value: fullMatch, line: this.line, col: this.col });
        this.pos += fullMatch.length;
        this.col += fullMatch.length;
        continue;
      }

      // Numeric values
      const numberMatch = remaining.match(/^\d+(\.\d+)?/);
      if (numberMatch) {
        const fullMatch = numberMatch[0];
        tokens.push({ type: 'NUMBER', value: fullMatch, line: this.line, col: this.col });
        this.pos += fullMatch.length;
        this.col += fullMatch.length;
        continue;
      }

      // Identifiers
      const identifierMatch = remaining.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
      if (identifierMatch) {
        const fullMatch = identifierMatch[0];
        tokens.push({ type: 'IDENTIFIER', value: fullMatch, line: this.line, col: this.col });
        this.pos += fullMatch.length;
        this.col += fullMatch.length;
        continue;
      }

      throw new Error(`Syntax Error: Unexpected character '${char}' at line ${this.line}, col ${this.col}`);
    }

    tokens.push({ type: 'EOF', value: '', line: this.line, col: this.col });
    return tokens;
  }
}

// ============================================================================
// 3. Parser
// ============================================================================

export class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    const token = this.peek();
    throw new Error(`Parse Error: ${message} at line ${token.line}, col ${token.col} (got '${token.value}')`);
  }

  private checkNext(type: TokenType, value?: string): boolean {
    if (this.current + 1 >= this.tokens.length) return false;
    const nextToken = this.tokens[this.current + 1];
    if (nextToken.type !== type) return false;
    if (value !== undefined && nextToken.value !== value) return false;
    return true;
  }

  parse(): ProgramNode {
    const body: ASTNode[] = [];
    while (!this.isAtEnd()) {
      body.push(this.statement());
      while (this.match('SEMICOLON')) {
        // consume extra semicolons
      }
    }
    return {
      type: 'Program',
      body,
    };
  }

  private statement(): ASTNode {
    if (this.check('IDENTIFIER') && this.checkNext('OPERATOR', '=')) {
      return this.assignment();
    }
    return this.expressionStatement();
  }

  private assignment(): AssignmentNode {
    const nameToken = this.consume('IDENTIFIER', 'Expected variable name');
    this.consume('OPERATOR', "Expected '=' operator");
    const expr = this.expression();
    return {
      type: 'Assignment',
      name: nameToken.value,
      value: expr,
    };
  }

  private expressionStatement(): ExpressionStatementNode {
    const expr = this.expression();
    return {
      type: 'ExpressionStatement',
      expression: expr,
    };
  }

  private expression(): ASTNode {
    return this.comparison();
  }

  private comparison(): ASTNode {
    let expr = this.additive();

    while (this.peek().type === 'OPERATOR' && ['>=', '<=', '>', '<', '==', '!='].includes(this.peek().value)) {
      const operatorToken = this.advance();
      const right = this.additive();
      expr = {
        type: 'BinaryExpression',
        operator: operatorToken.value,
        left: expr,
        right,
      } as BinaryExpressionNode;
    }

    return expr;
  }

  private additive(): ASTNode {
    let expr = this.multiplicative();

    while (this.peek().type === 'OPERATOR' && ['+', '-'].includes(this.peek().value)) {
      const operatorToken = this.advance();
      const right = this.multiplicative();
      expr = {
        type: 'BinaryExpression',
        operator: operatorToken.value,
        left: expr,
        right,
      } as BinaryExpressionNode;
    }

    return expr;
  }

  private multiplicative(): ASTNode {
    let expr = this.unary();

    while (this.peek().type === 'OPERATOR' && ['*', '/'].includes(this.peek().value)) {
      const operatorToken = this.advance();
      const right = this.unary();
      expr = {
        type: 'BinaryExpression',
        operator: operatorToken.value,
        left: expr,
        right,
      } as BinaryExpressionNode;
    }

    return expr;
  }

  private unary(): ASTNode {
    if (this.match('OPERATOR') && (this.previous().value === '-' || this.previous().value === '+')) {
      const operator = this.previous().value as '-' | '+';
      const right = this.unary();
      return {
        type: 'UnaryExpression',
        operator,
        argument: right,
      } as UnaryExpressionNode;
    }
    return this.primary();
  }

  private primary(): ASTNode {
    if (this.match('NUMBER')) {
      return {
        type: 'NumericLiteral',
        value: parseFloat(this.previous().value),
      };
    }

    if (this.match('DICE')) {
      const val = this.previous().value;
      const parts = val.toLowerCase().split('d');
      const count = parts[0] === '' ? 1 : parseInt(parts[0], 10);
      const sides = parseInt(parts[1], 10);
      return {
        type: 'DiceLiteral',
        count,
        sides,
      };
    }

    if (this.match('IDENTIFIER')) {
      const name = this.previous().value;
      if (this.match('LPAREN')) {
        const args: ASTNode[] = [];
        if (!this.check('RPAREN')) {
          do {
            args.push(this.expression());
          } while (this.match('COMMA'));
        }
        this.consume('RPAREN', "Expected ')' after function arguments");
        return {
          type: 'CallExpression',
          callee: name,
          arguments: args,
        };
      }
      return {
        type: 'Identifier',
        name,
      };
    }

    if (this.match('LPAREN')) {
      const expr = this.expression();
      this.consume('RPAREN', "Expected ')' after expression");
      return expr;
    }

    const token = this.peek();
    throw new Error(
      `Parse Error: Unexpected token '${token.value}' of type '${token.type}' at line ${token.line}, col ${token.col}`
    );
  }
}

// ============================================================================
// 4. VM Runner
// ============================================================================

export const defaultDiceRoller: DiceRoller = (count, sides) => {
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }
  const total = rolls.reduce((sum, val) => sum + val, 0);
  return { rolls, total };
};

export class VM {
  private variables: Record<string, any> = {};
  private logs: string[] = [];
  private diceRoller: DiceRoller;

  constructor(context: Record<string, number> = {}, diceRoller?: DiceRoller) {
    this.variables = { ...context };
    this.diceRoller = diceRoller || defaultDiceRoller;
  }

  run(program: ProgramNode): VMResult {
    this.logs = [];
    let lastValue: any = undefined;

    for (const statement of program.body) {
      lastValue = this.evaluate(statement);
    }

    return {
      value: lastValue,
      variables: { ...this.variables },
      logs: [...this.logs],
    };
  }

  log(message: string) {
    this.logs.push(message);
  }

  private evaluate(node: ASTNode): any {
    switch (node.type) {
      case 'Program': {
        let lastVal: any = undefined;
        for (const stmt of node.body) {
          lastVal = this.evaluate(stmt);
        }
        return lastVal;
      }

      case 'Assignment': {
        const val = this.evaluate(node.value);
        this.variables[node.name] = val;
        this.log(`Assign: ${node.name} = ${val}`);
        return val;
      }

      case 'ExpressionStatement':
        return this.evaluate(node.expression);

      case 'NumericLiteral':
        return node.value;

      case 'DiceLiteral': {
        const { rolls, total } = this.diceRoller(node.count, node.sides);
        this.log(`Roll: ${node.count}d${node.sides} -> [${rolls.join(', ')}] = ${total}`);
        return total;
      }

      case 'Identifier': {
        if (!(node.name in this.variables)) {
          throw new Error(`Runtime Error: Variable '${node.name}' is not defined`);
        }
        const val = this.variables[node.name];
        this.log(`Lookup: ${node.name} = ${val}`);
        return val;
      }

      case 'UnaryExpression': {
        const val = this.evaluate(node.argument);
        let result: number;
        if (node.operator === '-') {
          result = -val;
        } else {
          result = val;
        }
        this.log(`Unary: ${node.operator}${val} -> ${result}`);
        return result;
      }

      case 'BinaryExpression': {
        const leftVal = this.evaluate(node.left);
        const rightVal = this.evaluate(node.right);
        let result: any;
        switch (node.operator) {
          case '+':
            result = leftVal + rightVal;
            break;
          case '-':
            result = leftVal - rightVal;
            break;
          case '*':
            result = leftVal * rightVal;
            break;
          case '/':
            if (rightVal === 0) throw new Error('Runtime Error: Division by zero');
            result = leftVal / rightVal;
            break;
          case '>=':
            result = leftVal >= rightVal;
            break;
          case '<=':
            result = leftVal <= rightVal;
            break;
          case '>':
            result = leftVal > rightVal;
            break;
          case '<':
            result = leftVal < rightVal;
            break;
          case '==':
            result = leftVal == rightVal;
            break;
          case '!=':
            result = leftVal != rightVal;
            break;
          default:
            throw new Error(`Runtime Error: Unsupported operator '${node.operator}'`);
        }
        this.log(`Binary: ${leftVal} ${node.operator} ${rightVal} -> ${result}`);
        return result;
      }

      case 'CallExpression': {
        const args = node.arguments.map((arg) => this.evaluate(arg));
        const funcName = node.callee;
        if (funcName === 'resolve') {
          if (args.length !== 1) {
            throw new Error('Runtime Error: resolve() expects exactly 1 argument');
          }
          const val = args[0];
          const success = typeof val === 'boolean' ? val : val >= 10;
          const result = { success, value: val };
          this.log(`Call resolve: success=${success}, value=${val}`);
          return result;
        } else if (funcName === 'min') {
          const result = Math.min(...args);
          this.log(`Call min: args=[${args.join(', ')}] -> ${result}`);
          return result;
        } else if (funcName === 'max') {
          const result = Math.max(...args);
          this.log(`Call max: args=[${args.join(', ')}] -> ${result}`);
          return result;
        } else if (funcName === 'floor') {
          const result = Math.floor(args[0]);
          this.log(`Call floor: ${args[0]} -> ${result}`);
          return result;
        } else if (funcName === 'ceil') {
          const result = Math.ceil(args[0]);
          this.log(`Call ceil: ${args[0]} -> ${result}`);
          return result;
        } else {
          throw new Error(`Runtime Error: Undefined function '${funcName}'`);
        }
      }

      default:
        throw new Error(`Runtime Error: Unknown AST node type '${(node as any).type}'`);
    }
  }
}

// ============================================================================
// 5. Direct Runner Helper
// ============================================================================

export function runDSL(code: string, context: Record<string, number> = {}, diceRoller?: DiceRoller): VMResult {
  const tokenizer = new Tokenizer(code);
  const tokens = tokenizer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const vm = new VM(context, diceRoller);
  return vm.run(ast);
}

if (typeof window !== 'undefined') {
  (window as any).runDSL = runDSL;
  (window as any).Tokenizer = Tokenizer;
  (window as any).Parser = Parser;
  (window as any).VM = VM;
}
