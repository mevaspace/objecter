import { Objecter } from '../../dist/index.mjs';
import assert from 'assert';

console.log('Testing ESM Consumer...');

class Target {
  constructor() {
    this.id = 0;
    this.name = '';
  }
}

const source = { id: 1, name: 'ESM' };
const mapping = [
  { from: 'id', to: 'id' },
  { from: 'name', to: 'name' },
];

try {
  const result = Objecter.convert(source, Target, mapping);
  assert.strictEqual(result.id, 1);
  assert.strictEqual(result.name, 'ESM');
  assert.ok(result instanceof Target);
  console.log('✅ ESM Consumer Test Passed');
} catch (e) {
  console.error('❌ ESM Consumer Test Failed:', e);
  process.exit(1);
}
