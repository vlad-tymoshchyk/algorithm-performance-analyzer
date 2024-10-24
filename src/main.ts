import fs from 'fs';
import path from 'path';
import { parse, ParseResult } from '@babel/parser';
import esMain from 'es-main';
import { types as t } from '@babel/core';

let globalCode = '';
let globalCounters: Counters = createNewCounters();

// eslint-disable-next-line
// @ts-ignore
export type VariableValue = string | number | boolean | MyObject | Function;
export type LocalScope = Map<string, VariableValue>;
// eslint-disable-next-line
// @ts-ignore
export type MyObject = Record<string, VariableValue>;

export class Scope {
  stack: LocalScope[];
  constructor(scopeStack: LocalScope[] = [new Map<string, VariableValue>()]) {
    this.stack = scopeStack;
  }

  extend(localScope: LocalScope = new Map()) {
    return new Scope([...this.stack, localScope]);
  }

  has(name: string): boolean {
    return this.stack.some((scope) => scope.has(name));
  }

  get(name: string): VariableValue | undefined {
    const scope = this.stack
      .concat()
      .reverse()
      .find((scope) => scope.has(name));
    if (scope) {
      return scope.get(name);
    } else {
      throw new Error(`unknown variable name: ${name}`);
    }
  }

  set(name: string, value: VariableValue): void {
    this.stack[this.stack.length - 1].set(name, value);
  }
}

export type StatementReturnCode =
  | 0
  | 'break'
  | 'continue'
  | ['return', VariableValue];

export const execute = (code: string, scope: Scope = new Scope()) => {
  globalCode = code;
  const ast = parse(code);
  ast.program.body.forEach((statement) => {
    const returnCode = executeStatement(statement, scope);
    if (returnCode !== 0) {
      throw new Error('unexpected return code: ' + returnCode);
    }
  });
};

export const executeStatement = (
  statement: t.Statement,
  scope: Scope
): StatementReturnCode => {
  globalCounters.totalStatements++;
  switch (statement.type) {
    case 'IfStatement':
      globalCounters.ifConditions++;
      const test = executeExpression(statement.test as t.Expression, scope);
      if (test) {
        return executeStatement(statement.consequent, scope);
      } else {
        if (statement.alternate) {
          return executeStatement(statement.alternate, scope);
        }
      }
    case 'EmptyStatement':
      break;
    case 'FunctionDeclaration':
      const id = statement.id.name;
      const body = statement.body.body;

      const fn = (...args: any[]) => {
        const localScope = scope.extend();
        statement.params.forEach((param, idx) => {
          localScope.set((param as t.Identifier).name, args[idx]);
        });
        for (let i = 0; i < body.length; i++) {
          const code = executeStatement(body[i], localScope);
          if (Array.isArray(code)) {
            if (code[0] === 'return') {
              return code[1];
            } else {
              throw new Error('Array can be only return statement');
            }
          } else if (code !== 0) {
            throw new Error('Unexpected return code in function: ' + code);
          }
        }
      };
      Object.defineProperty(fn, 'name', { value: id, writable: false });

      scope.set(id, fn);
      break;
    case 'WhileStatement': {
      const test = statement.test;
      const body = statement.body;
      while (executeExpression(test, scope)) {
        globalCounters.loopIterations++;
        const returnCode = executeStatement(body, scope);
        if (returnCode === 'break') {
          break;
        } else if (returnCode === 'continue') {
          continue;
        } else if (returnCode !== 0) {
          return returnCode;
        }
      }
      return 0;
    }
    case 'DoWhileStatement': {
      const test = statement.test;
      const body = statement.body;
      do {
        globalCounters.loopIterations++;
        const returnCode = executeStatement(body, scope);
        if (returnCode === 'break') {
          break;
        } else if (returnCode === 'continue') {
          continue;
        } else if (returnCode !== 0) {
          return returnCode;
        }
      } while (executeExpression(test, scope));
      return 0;
    }
    case 'ForStatement': {
      const init = statement.init;
      const test = statement.test;
      const update = statement.update;
      const body = statement.body;
      if (init.type !== 'VariableDeclaration') {
        throw new Error('init should be a variable declaration');
      }
      if (init.declarations.length !== 1) {
        throw new Error('init should have only one declaration');
      }
      if (test.type !== 'BinaryExpression') {
        throw new Error('test should be a binary expression');
      }
      if (body.type !== 'BlockStatement') {
        throw new Error('body should be a block statement');
      }
      const localScope = scope.extend();
      for (
        localScope.set(
          (init.declarations[0].id as t.Identifier).name,
          executeExpression(
            init.declarations[0].init as t.Expression,
            localScope
          )
        );
        executeExpression(test, localScope);
        executeExpression(update, localScope)
      ) {
        globalCounters.loopIterations++;
        const returnCode = executeStatement(body, localScope);
        if (returnCode === 'break') {
          break;
        } else if (returnCode === 'continue') {
          continue;
        }
      }
      return 0;
    }
    case 'ExpressionStatement':
      executeExpression(statement.expression, scope);
      return 0;
    case 'BlockStatement':
      for (let i = 0; i < statement.body.length; i++) {
        const returnCode = executeStatement(statement.body[i], scope);
        if (returnCode !== 0) {
          return returnCode;
        }
      }
      return 0;
    case 'VariableDeclaration':
      statement.declarations.forEach((declaration) => {
        globalCounters.variableDeclarations++;
        scope.set(
          (declaration.id as t.Identifier).name,
          executeExpression(declaration.init, scope)
        );
      });
      break;
    case 'BreakStatement':
      return 'break';
    case 'ContinueStatement':
      return 'continue';
    case 'ReturnStatement':
      return ['return', executeExpression(statement.argument, scope)];
    default:
      throw new Error('Unknown statement type: ' + statement.type);
  }
  return 0;
};

export const executeExpression = (
  statement: t.Expression,
  scope: Scope
): VariableValue | undefined => {
  globalCounters.totalExpressions++;
  let code = 0;
  switch (statement.type) {
    case 'Identifier':
      if (!scope.has(statement.name)) {
        printErrorCode(statement.loc);
        throw new Error('variable not found: ' + statement.name);
      }
      return scope.get(statement.name);
    case 'NumericLiteral':
      return statement.value;
    case 'StringLiteral':
      return statement.value;
    case 'BooleanLiteral':
      return statement.value;
    case 'ArrowFunctionExpression':
      const fn = (...args: any[]) => {
        const localScope = scope.extend();
        statement.params.forEach((param, idx) => {
          localScope.set((param as t.Identifier).name, args[idx]);
        });
        if (statement.body.type === 'BlockStatement') {
          const code = executeStatement(statement.body, localScope);

          if (Array.isArray(code)) {
            if (code[0] === 'return') {
              return code[1];
            } else {
              throw new Error('Array can be only return statement');
            }
          } else if (code !== 0) {
            throw new Error('Unexpected return code in function: ' + code);
          }
        } else {
          return executeExpression(statement.body, localScope);
        }
      };
      return fn;
    case 'ObjectExpression': {
      const object = {};
      statement.properties.forEach((property) => {
        if (property.type === 'ObjectProperty') {
          const key =
            property.key.type === 'Identifier'
              ? property.key.name
              : executeExpression(property.key as t.Expression, scope);
          object[key] = executeExpression(
            property.value as t.Expression,
            scope
          );
        } else {
          throw new Error('Unknown property type: ' + property.type);
        }
      });
      return object;
    }
    case 'CallExpression':
      const callee = executeExpression(statement.callee as t.Expression, scope);
      if (!callee) throw new Error('no callee');
      if (!(callee instanceof Function))
        throw new Error('callee is not a function: ' + callee);
      const args = statement.arguments.map((arg) =>
        executeExpression(arg as t.Expression, scope)
      );
      return callee(...args);
    case 'AssignmentExpression':
      globalCounters.assignments++;
      const left = statement.left as t.Identifier | t.MemberExpression;
      const right = statement.right;
      if (left.type === 'MemberExpression') {
        const object = executeExpression(left.object, scope);
        object[executeExpression(left.property as t.Expression, scope)] =
          executeExpression(right, scope);
      } else {
        switch (statement.operator) {
          case '=':
            scope.set(left.name, executeExpression(right, scope));
            break;
          case '+=':
            scope.set(
              left.name,
              scope.get(left.name) + executeExpression(right, scope)
            );
            break;
          case '-=':
            scope.set(
              left.name,
              scope.get(left.name) - executeExpression(right, scope)
            );
            break;
          case '*=':
            scope.set(
              left.name,
              scope.get(left.name) * executeExpression(right, scope)
            );
            break;
          case '/=':
            scope.set(
              left.name,
              scope.get(left.name) / executeExpression(right, scope)
            );
            break;
          default:
            throw new Error(
              'Unknown AssignmentExpression operator: ' + statement.operator
            );
        }
      }
      break;
    case 'UpdateExpression':
      const updateVariable = statement.argument as t.Identifier;
      switch (statement.operator) {
        case '++':
          scope.set(updateVariable.name, scope.get(updateVariable.name) + 1);
          break;
        case '--':
          scope.set(updateVariable.name, scope.get(updateVariable.name) - 1);
          break;
        default:
          throw new Error('Unknown UpdateExpression operator: ', statement);
      }
      break;
    case 'MemberExpression':
      if (statement.object.type !== 'Identifier') {
        throw new Error('object should be an identifier');
      }
      const objectName = statement.object.name;
      if (!objectName) throw new Error('no object name');
      if (typeof objectName !== 'string')
        throw new Error(
          'object name should be a string, got ' + typeof objectName
        );
      const object = scope.get(objectName);
      if (!object) throw new Error('no object found in scope');
      if (typeof object !== 'object')
        throw new Error('memberexpression object is not an object: ' + object);

      const property = statement.computed
        ? executeExpression(statement.property as t.Expression, scope)
        : (statement.property as t.Identifier).name;
      if (property === undefined || property === null)
        throw new Error('no property defined');
      return object[property];
    case 'ArrayExpression':
      return statement.elements.map((element) =>
        executeExpression(element as t.Expression, scope)
      );
    case 'BinaryExpression': {
      const left = executeExpression(statement.left as t.Expression, scope);
      const right = executeExpression(statement.right, scope);

      switch (statement.operator) {
        case '%':
          return left % right;
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          return left / right;
        case '<':
          return left < right;
        case '<=':
          return left <= right;
        case '>':
          return left > right;
        case '>=':
          return left >= right;
        case '===':
          return left === right;
        case '!==':
          return left !== right;
        default:
          throw new Error(
            'Unknown BinaryExpression operator: ' + statement.operator
          );
      }
    }
    default:
      console.log('statement', statement);
      throw new Error('Unknown expression type: ' + statement.type);
  }

  return code;
};

const executeAst = (ast: ParseResult<t.File>) => {
  if (ast.type !== 'File') {
    console.log('ast should be a File');
  }

  const globalScope = new Scope();

  globalScope.set('console', {
    log(...args: any[]) {
      console.log('[log]', ...args);
    },
  });

  // search for function declarations
  ast.program.body.forEach((expr) => {
    if (expr.type !== 'FunctionDeclaration') return;
    executeStatement(expr, globalScope);
  });

  ast.program.body.forEach((expr) => {
    if (expr.type === 'FunctionDeclaration') return;
    executeStatement(expr, globalScope);
  });
};

function printErrorCode(loc: t.SourceLocation) {
  if (!globalCode) {
    throw new Error('no code provided');
  }
  const startLine = loc.start.line;
  console.log('error at line:', startLine, 'column:', loc.start.column);
  console.log('--- Error: ------------------');
  console.log(
    globalCode
      .split('\n')
      .map((line, idx) => `${startLine + idx + 1} ${line}`)
      .slice(loc.start.line - 2, loc.end.line + 1)
      .join('\n')
  );
  console.log('-----------------------------');
}

const runCode = (code: string) => {
  globalCode = code;
  executeAst(parse(code));
};

export interface Counters {
  totalStatements: number;
  totalExpressions: number;
  variableDeclarations: number;
  assignments: number;
  ifConditions: number;
  loopIterations: number;
}

function createNewCounters(): Counters {
  return {
    totalStatements: 0,
    totalExpressions: 0,
    variableDeclarations: 0,
    assignments: 0,
    ifConditions: 0,
    loopIterations: 0,
  };
}

export function measure(foo: Function, args: Array<any>) {
  const code = `(${foo.toString()})(${args.map((arg) => JSON.stringify(arg)).join(', ')})`;
  runCode(code);
  const counters = globalCounters;
  globalCounters = createNewCounters();
  return counters;
}

// eslint-disable-next-line
// @ts-ignore
if (esMain(import.meta)) {
  const filename = path.resolve(process.argv[2]);
  runCode(fs.readFileSync(filename, 'utf-8'));
}
