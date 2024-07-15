import { describe, test, expect } from 'vitest';
import { runFunction } from './main';

console.log(
  runFunction(() => {
    const a = 1;
    const b = 2;
    return a + b;
  })
);

test('should be callable', () => {
  expect(() => runFunction()).not.toThrow();
});
