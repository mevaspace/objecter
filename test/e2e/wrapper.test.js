const { Objecter } = require('../../dist/index.js');
const assert = require('assert');

console.log('Testing CJS Consumer...');

class Target {
  constructor() {
    this.id = 0;
    this.name = '';
  }
}

const source = { id: 1, name: 'CJS' };
const mapping = [
  { from: 'id', to: 'id' },
  { from: 'name', to: 'name' },
];

try {
  const result = Objecter.convert(source, Target, mapping);
  assert.strictEqual(result.id, 1);
  assert.strictEqual(result.name, 'CJS');
  assert.ok(result instanceof Target);
  console.log('✅ CJS Consumer Test Passed');
} catch (e) {
  console.error('❌ CJS Consumer Test Failed:', e);
  process.exit(1);
}
