// import { parseExpression, parse, ParseResult } from '@babel/parser';
import { describe, test, expect, vi } from 'vitest';
import { runFunction, executeExpression, Scope, execute } from './main';

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
  const scope = new Scope();
  scope.set('console', { log });
  expect(execute('console.log("test text")', new Scope().extend(scope))).toBe(
    undefined
  );
  expect(log).toHaveBeenCalledTimes(1);
  expect(log).toHaveBeenNthCalledWith(1, 'test text');
});

test('declare variables / arrays / access arrays', () => {
  let logs = '';
  const log = vi.fn((...args) => (logs += args.join('')));
  const scope = new Scope();
  scope.set('console', { log });
  execute('const name = "test-name"', scope);
  execute('console.log(name)', scope);
  expect(logs).toEqual('test-name');
  logs = '';

  execute('const arr = [1, 2, 3]', scope);
  execute('const index = 2', scope);
  execute('console.log(arr[1], ":", arr[index])', scope);
  expect(logs).toEqual('2:3');
  logs = '';

  execute('const arr = [1, 2, 3]; arr[1] = 9; console.log(arr)', scope);
  expect(logs).toBe('1,9,3');
  logs = '';
});

test('ifStatement', () => {
  let logs = '';
  const log = vi.fn((...args) => (logs += args.join('')));
  const scope = new Scope();
  scope.set('console', { log });

  execute('if (5 > 1) { console.log("run consequent") }', scope);
  expect(logs).toEqual('run consequent');
  logs = '';

  execute(
    'if (5 > 1) { console.log("run consequent") } else { console.log("run alternate"); }',
    scope
  );
  expect(logs).toEqual('run consequent');
  logs = '';

  execute(
    'if (5 < 1) { console.log("run consequent") } else { console.log("run alternate"); }',
    scope
  );
  expect(logs).toEqual('run alternate');
  logs = '';
});

test('forStatement', () => {
  let logs = '';
  const log = vi.fn((...args) => (logs += args.join('')));
  const scope = new Scope();
  scope.set('console', { log });

  execute('for (let i = 0; i < 5; i++) { console.log(i) }', scope);
  expect(logs).toEqual('01234');
  logs = '';

  execute('for (let i = 0; i < 5; i++) { console.log(i); break }', scope);
  expect(logs).toEqual('0');
  logs = '';

  execute(
    'for (let i = 0; i < 5; i++) { if (i === 3) { break }; console.log(i) }',
    scope
  );
  expect(logs).toEqual('012');
  logs = '';

  execute(
    'for (let i = 3; i <= 5; i++) { if (i === 4) { continue }; console.log(i) }',
    scope
  );
  expect(logs).toBe('35');
  logs = '';
});

test('functions', () => {
  let logs = '';
  const log = vi.fn((...args) => (logs += args.join('')));
  const scope = new Scope();
  scope.set('console', { log });
  scope.set('String', String);

  execute(
    'function foo(num) { if (num > 5) { return  "more: " + num  } else { return "less: " + num } }',
    scope
  );

  execute('console.log(String(foo(4)))', scope);
  expect(logs).toBe('less: 4');
  logs = '';

  execute('console.log(String(foo(6)))', scope);
  expect(logs).toBe('more: 6');
  logs = '';
});
