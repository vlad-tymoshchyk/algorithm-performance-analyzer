import { parseExpression, parse, ParseResult } from '@babel/parser';
// const { parseExpression, parse } = require('@babel/parser');
import traverse from '@babel/traverse';
// const traverse = require('@babel/traverse').default;
import generate from '@babel/generator';
// const generate = require('@babel/generator').default;
import { types as t } from '@babel/core';
// const t = require('@babel/types');

type VariableValue = string | number | MyObject;
type LocalScope = Map<string, VariableValue>;
type MyObject = Map<string, VariableValue>;

class Scope {
  stack: LocalScope[];
  constructor(scopeStack: LocalScope[]) {
    this.stack = scopeStack;
  }

  extend(localScope: LocalScope) {
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

const executeStatement = (
  statement: t.Statement | t.Expression,
  scope: Scope
): VariableValue | undefined => {
  switch (statement.type) {
    case 'Identifier':
      return statement.name;
    case 'ExpressionStatement':
      executeStatement(statement.expression, scope);
      break;
    case 'ArrowFunctionExpression':
      executeStatement(statement.body, scope);
      break;
    case 'BlockStatement':
      statement.body.forEach((node) => executeStatement(node, scope));
      break;
    case 'VariableDeclaration':
      console.log('statement', statement);
      break;
    case 'BlockStatement':
      console.log('statement', statement);
      break;
    case 'MemberExpression':
      // console.log('statement', statement);
      const objectName = executeStatement(statement.object, scope);
      if (!objectName) throw new Error('no object name');
      if (typeof objectName !== 'string')
        throw new Error(
          'object name should be a string, got ' + typeof objectName
        );
      const object = scope.get(objectName);
      if (!object) throw new Error('no object found in scope');
      if (typeof object !== 'object')
        throw new Error('member is expression is called not on object');
      if (!object[objectName]) throw new Error('no such property in object');
      return object[objectName];
    default:
      console.log('Unknown expression type', statement.type);
  }
};

const executeAst = (ast: ParseResult<t.File>) => {
  if (ast.type !== 'File') {
    console.log('ast should be a File');
  }

  const globalScope = new Map();

  globalScope.set('console', {});

  ast.program.body.forEach((expr) =>
    executeStatement(expr, new Scope([globalScope]))
  );
};

const runFunction = (fn: () => void) => {
  const code = fn.toString().split('\n').slice(1, -1).join('\n');
  const ast = parse(code);
  executeAst(ast);
};

console.log(
  runFunction(() => {
    console.log;
  })
);
