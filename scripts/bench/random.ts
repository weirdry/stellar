// Preserve Python 3.11 Random(integer).shuffle ordering for the original harness.
// MT19937 initialization/tempering follows CPython's Modules/_randommodule.c;
// integer rejection sampling follows Lib/random.py. See RANDOM_NOTICE.txt.
import { required } from '../support/values.ts';

export function random(seed: number | bigint) {
  const words: number[] = [];
  let value = BigInt(seed);
  if (value < 0n) value = -value;
  do {
    words.push(Number(value & 0xffffffffn));
    value >>= 32n;
  } while (value);
  const state = new Uint32Array(624);
  const at = (index: number) => required(state[index]);
  state[0] = 19650218;
  for (let i = 1; i < 624; i++)
    state[i] = Math.imul(at(i - 1) ^ (at(i - 1) >>> 30), 1812433253) + i;
  let index = 1,
    word = 0;
  for (let count = Math.max(624, words.length); count > 0; count--) {
    state[index] =
      (at(index) ^ Math.imul(at(index - 1) ^ (at(index - 1) >>> 30), 1664525)) +
      required(words[word]) +
      word;
    if (++index === 624) {
      state[0] = at(623);
      index = 1;
    }
    word = (word + 1) % words.length;
  }
  for (let count = 623; count > 0; count--) {
    state[index] =
      (at(index) ^
        Math.imul(at(index - 1) ^ (at(index - 1) >>> 30), 1566083941)) -
      index;
    if (++index === 624) {
      state[0] = at(623);
      index = 1;
    }
  }
  state[0] = 0x80000000;
  index = 624;
  function uint32() {
    if (index === 624) {
      for (let i = 0; i < 624; i++) {
        const combined =
          (at(i) & 0x80000000) | (at((i + 1) % 624) & 0x7fffffff);
        state[i] =
          at((i + 397) % 624) ^
          (combined >>> 1) ^
          (combined & 1 ? 0x9908b0df : 0);
      }
      index = 0;
    }
    let result = at(index++);
    result ^= result >>> 11;
    result ^= (result << 7) & 0x9d2c5680;
    result ^= (result << 15) & 0xefc60000;
    result ^= result >>> 18;
    return result >>> 0;
  }
  return (upper: number) => {
    if (!Number.isInteger(upper) || upper < 1 || upper > 0xffffffff)
      throw new Error('Shuffle bound must fit an unsigned 32-bit integer.');
    const bits = 32 - Math.clz32(upper);
    let result: number;
    do {
      result = uint32() >>> (32 - bits);
    } while (result >= upper);
    return result;
  };
}
export function shuffle<T>(values: T[], next: (upper: number) => number): void {
  for (let i = values.length - 1; i > 0; i--) {
    const j = next(i + 1),
      value = required(values[i]);
    values[i] = required(values[j]);
    values[j] = value;
  }
}
