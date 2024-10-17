// import { parseExpression, parse, ParseResult } from '@babel/parser';
import { describe, test, expect, vi } from 'vitest';
import { runFunction, executeExpression, Scope } from './main';

import * as babel from '@babel/parser';
const { parseExpression, parse, ParseResult } = babel;

const p = (code) => {
  return parseExpression(code);
};
const ps = (code) => {
  return parse(code).program.body[0];
};

test('p function', () => {
  expect(p('12').type).toBe('NumericLiteral');
});

test('handle number/string/boolean literals', () => {
  expect(executeExpression(p('12'))).toBe(12);
  expect(executeExpression(p('"text"'))).toBe('text');
  expect(executeExpression(p("'text'"))).toBe('text');
  expect(executeExpression(p('true'))).toBe(true);
  expect(executeExpression(p('false'))).toBe(false);
});

test('log text', () => {
  const log = vi.fn();
  const scope = new Map();
  scope.set('console', { log });
  expect(
    executeExpression(ps('console.log("test text")'), new Scope().extend(scope))
  ).toBe(undefined);
  expect(log).toHaveBeenCalledTimes(1);
  expect(log).toHaveBeenNthCalledWith(1, 'test text');
});

test('can declare variables', () => {
  const scope = new Scope();
  executeExpression(ps('const name = "test-name"'), scope);
  expect(scope.has('name')).toBe(true);
});

test('can declare functions', () => {
  const scope = new Scope();
  executeExpression(ps('function foo(text) { return "text:" + text }'), scope);
  executeExpression(ps('foo("some info")'), scope);
});
