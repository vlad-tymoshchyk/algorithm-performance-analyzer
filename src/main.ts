import { parseExpression, parse, ParseResult } from '@babel/parser';
import esMain from 'es-main';
// const { parseExpression, parse } = require('@babel/parser');
import traverse from '@babel/traverse';
// const traverse = require('@babel/traverse').default;
import generate from '@babel/generator';
// const generate = require('@babel/generator').default;
import { types as t } from '@babel/core';
// const t = require('@babel/types');
//

// const esMain = import('es-main');

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

export const executeExpression = (
  statement: t.Statement | t.Expression,
  scope: Scope = new Scope()
  // scope: Scope
): VariableValue | undefined => {
  // console.log('statement', statement.type);
  switch (statement.type) {
    case 'Identifier':
      if (!scope.has(statement.name)) {
        throw new Error('variable not found: ' + statement.name);
      }
      return scope.get(statement.name);
    case 'ExpressionStatement':
      return executeExpression(statement.expression, scope);
    case 'NumericLiteral':
      return statement.value;
    case 'StringLiteral':
      return statement.value;
    case 'BooleanLiteral':
      return statement.value;
    case 'CallExpression':
      const callee = executeExpression(statement.callee as t.Expression, scope);
      if (!callee) throw new Error('no callee');
      if (!(callee instanceof Function))
        throw new Error('callee is not a function: ' + callee);
      const args = statement.arguments.map((arg) =>
        executeExpression(arg as t.Expression, scope)
      );
      return callee(...args);
    case 'ArrowFunctionExpression':
      executeExpression(statement.body, scope);
      break;
    case 'BlockStatement':
      statement.body.forEach((node) => executeExpression(node, scope));
      break;
    case 'VariableDeclaration':
      statement.declarations.forEach((declaration) => {
        scope.set(
          (declaration.id as t.Identifier).name,
          executeExpression(declaration.init)
        );
      });
      break;
    case 'BlockStatement':
      break;
    case 'MemberExpression':
      const objectName = (statement.object as t.Identifier).name;
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
        ? executeExpression(statement.property as t.Expression)
        : (statement.property as t.Identifier).name;
      // console.log('property', property);
      if (!property) throw new Error('no property defined');
      if (typeof property !== 'string')
        throw new Error('property should be a string: ' + property);
      if (!object[property])
        throw new Error('no such property on the object: ' + property);
      return object[property];
    case 'EmptyStatement':
      break;
    case 'FunctionDeclaration':
      const id = statement.id.name;
      const body = statement.body.body;
      // console.log('body', body);

      const fn = (...args: any[]) => {
        // console.log('execute function', args);
        const localScope = scope.extend();
        statement.params.forEach((param, idx) => {
          localScope.set((param as t.Identifier).name, args[idx]);
        });
        for (let i = 0; i < body.length; i++) {
          const curStatement = body[i];
          if (curStatement.type === 'ReturnStatement') {
            // console.log('curStatement', curStatement);
            return executeExpression(
              curStatement.argument as t.Expression,
              localScope
            );
          }
          executeExpression(body[i], localScope);
        }
      };
      Object.defineProperty(fn, 'name', { value: id, writable: false });

      scope.set(id, fn);
      // console.log('statement', statement);
      break;
    case 'BinaryExpression':
      switch (statement.operator) {
        case '+':
          return (
            executeExpression(statement.left as t.Expression, scope) +
            executeExpression(statement.right, scope)
          );
      }
    case 'ReturnStatement':
      // console.log('return');
      break;
    default:
      console.log('statement', statement);
      throw new Error('Unknown expression type: ' + statement.type);
  }
};

const executeAst = (ast: ParseResult<t.File>) => {
  if (ast.type !== 'File') {
    console.log('ast should be a File');
  }

  const globalScope = new Scope();

  globalScope.set('console', {
    log(...args: any[]) {
      console.log('log:', ...args);
    },
  });

  ast.program.body.forEach((expr) => {
    executeExpression(expr, globalScope);
  });
};

const runFunction = (fn: () => void) => {
  const code = fn.toString().split('\n').slice(1, -1).join('\n');
  const ast = parse(code);
  executeAst(ast);
};

const runCode = (code: string) => {
  executeAst(parse(code));
};

// console.log(
//   runFunction(() => {
//     console.log;
//   })
// );

const exampleProgram = `
console.log('starts here');
function bubleSort(arr) {
  let temp = 0;
  for (let i = 0; i < arr.length - 1; i++) {
    for (let j = 0; j < arr.length - 1 - i; j++) {
      console.log(
        'j, j + 1',
        j,
        j + 1,
        arr[j] > arr[j + 1],
        arr[j],
        arr[j + 1]
      );
      if (arr[j] > arr[j + 1]) {
        temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }
  return arr;
}
const testArr = [3, 2, 1, 4, 9, 6, 7, 8, 5];
console.log(testArr);
console.log(bubleSort(testArr));
`;

// eslint-disable-next-line
// @ts-ignore
if (esMain(import.meta)) {
  // runCode(exampleProgram);
  runCode(
    'function foo(text) { return text }; console.log(foo("some" + "there"))'
  );
}
