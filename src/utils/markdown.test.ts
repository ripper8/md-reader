import assert from 'node:assert'
import test from 'node:test'
import { parseMarkdown } from './markdown'

test('inline math equation renders correctly', () => {
  const result = parseMarkdown('Inline $a^2 + b^2 = c^2$ equation')
  assert.match(result, /class="katex"/)
  assert.match(result, /<annotation encoding="application\/x-tex">a\^2 \+ b\^2 = c\^2<\/annotation>/)
});

test('block math equation renders correctly', () => {
  const result = parseMarkdown('$$\n\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\n$$')
  assert.match(result, /class="katex-block"/)
  assert.match(result, /\\sum_\{i=1\}/)
});
