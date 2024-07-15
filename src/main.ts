import { parseExpression, parse } from '@babel/parser';
// const { parseExpression, parse } = require('@babel/parser');
import traverse from '@babel/traverse';
// const traverse = require('@babel/traverse').default;
import generate from '@babel/generator';
// const generate = require('@babel/generator').default;
import { types as t } from '@babel/core';
// const t = require('@babel/types');

const runFunction = (fn: () => void) => {
  const fnText = fn.toString();
  const ast = parse(fn.toString());
  // const fnBody = ast.program.body[0].expression.body.body;
  const fnBody = ast.program.body[0];
  // console.log('fnBody', fnBody);
  // console.log(Object.keys(fnBody));
  // // console.log('ast', fnBody[0]);
  traverse(ast, {
    AssignmentExpression(path) {
      console.log('path', path.node);
      // if (path.node.name === 'a') {
      //   path.node.name = 'aVar';
      // }
    },
    //   VariableDeclaration(path) {
    //     path.insertBefore(
    //       t.expressionStatement(
    //         t.stringLiteral("Because I'm easy come, easy go.")
    //       )
    //     );
    //     path.insertAfter(
    //       t.expressionStatement(t.stringLiteral('A little high, little low.'))
    //     );
    //   },
  });
  const transformedCode = generate(ast).code;
  console.log(transformedCode);
};

console.log(
  runFunction(() => {
    const c = 1;
    // eslint-disable-next-line
    // @ts-ignore
    a = b = c;
  })
);

// console.log(Object.keys(t).join('\n'));
