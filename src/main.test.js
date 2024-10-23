import { test, expect, vi } from 'vitest';
import { executeExpression, Scope, execute, measure } from './main';

import * as babel from '@babel/parser';
const { parseExpression } = babel;

const p = (code) => {
  return parseExpression(code);
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

test('while', () => {
  let logs = '';
  const log = vi.fn((...args) => (logs += args.join('')));
  const scope = new Scope();
  scope.set('console', { log });

  execute('let i = 0; while (i < 5) { console.log(i); i++ }', scope);
  expect(logs).toEqual('01234');
  logs = '';

  execute('let i = 0; do { console.log(i); i++ } while (i < 5)', scope);
  expect(logs).toEqual('01234');
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

test('test', () => {
  let logs = '';
  const log = vi.fn((...args) => (logs += args.join('')));
  const scope = new Scope();
  scope.set('console', { log });

  execute('(() => console.log(24))()', scope);
  expect(logs).toBe('24');
  logs = '';

  execute(
    'const foo = (a) => {console.log("res:" + a)}; console.log(foo(123))',
    scope
  );
  expect(logs).toBe('res:123');
  logs = '';
});

test('measure', () => {
  const res = measure(
    (a, b) => {
      const temp = 21;
      for (let i = 0; i < 10; i++) {
        if (i >= 5) {
          temp = a + b;
        }
      }
      let j = 0;
      while (j < 10) {
        j++;
      }
      do {
        j--;
      } while (j > 0);
    },
    [1, 'test']
  );
  expect(res.totalStatements).toBe(188);
});

test('ObjectExpression', () => {
  let logs = '';
  const log = vi.fn((...args) => (logs += args.join('')));
  const scope = new Scope();
  scope.set('console', { log });
  scope.set('JSON', { stringify: JSON.stringify });

  execute('const a = { b: 1, c: 2 }; console.log(JSON.stringify(a))', scope);
  expect(logs).toBe('{"b":1,"c":2}');
});
