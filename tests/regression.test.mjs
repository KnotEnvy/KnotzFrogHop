// Regression tests for KnotzFrogHop level construction.
// Runs the REAL setup.js + obstacles.js sources in a stubbed browser
// environment (no new framework: built-in node:test only).
// Usage: node --test tests/
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function makeContext() {
  const gradient = () => ({ addColorStop() {} });
  const ctxStub = () =>
    new Proxy(
      {},
      {
        get(t, p) {
          if (p === 'canvas') return {};
          if (!(p in t)) t[p] = (...a) => gradient(a);
          return t[p];
        },
        set(t, p, v) {
          t[p] = v;
          return true;
        },
      },
    );
  const canvasStub = () => ({ width: 0, height: 0, getContext: () => ctxStub() });
  const store = {};
  const sandbox = {
    console,
    performance,
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
    },
    document: { getElementById: () => canvasStub() },
    Image: class { constructor() { this.src = ''; } },
  };
  vm.createContext(sandbox);
  const src =
    fs.readFileSync(path.join(root, 'setup.js'), 'utf8') +
    '\n' +
    fs.readFileSync(path.join(root, 'obstacles.js'), 'utf8');
  vm.runInContext(src, sandbox, { filename: 'game-bundle.js' });
  return sandbox;
}

// Ask the game itself to report per-lane car speed signs + clock for a level.
function probe(sandbox, level) {
  const json = vm.runInContext(
    `(() => {
      levelIndex = ${level};
      buildLevel(${level});
      const lanes = {};
      for (const c of carsArray) {
        const lane = c.y;
        (lanes[lane] = lanes[lane] || []).push(Math.sign(c.speed));
      }
      return JSON.stringify({
        table: LEVELS[${level}].roadSpeeds,
        lanes: Object.values(lanes),
        carsPerLane: LEVELS[${level}].carsPerLane,
        carW: LEVELS[${level}].carW,
        widths: carsArray.map(c => c.width),
        timeLeft,
        timeLimit: LEVELS[${level}].timeLimit,
      });
    })()`,
    sandbox,
  );
  return JSON.parse(json);
}

describe('level construction', () => {
  for (let level = 0; level < 3; level++) {
    it(`level ${level}: every car follows its lane's signed table speed`, () => {
      const ctx = makeContext();
      const r = probe(ctx, level);
      assert.equal(r.lanes.length, 3, 'three road lanes');
      r.lanes.forEach((signs, lane) => {
        const expected = Math.sign(r.table[lane]);
        assert.notEqual(expected, 0, 'table speed is non-zero');
        assert.equal(signs.length, r.carsPerLane, 'spawn count matches table');
        for (const s of signs) assert.equal(s, expected, `lane ${lane} direction`);
      });
      for (const w of r.widths) assert.equal(w, r.carW, 'car width matches table');
    });

    it(`level ${level}: crossing clock resets to the level time limit`, () => {
      const ctx = makeContext();
      const r = probe(ctx, level);
      assert.equal(r.timeLeft, r.timeLimit);
    });
  }

  it('the seam lane (index 2, beside the river) is the slowest road lane', () => {
    const ctx = makeContext();
    for (let level = 0; level < 3; level++) {
      const table = JSON.parse(
        vm.runInContext(`JSON.stringify(LEVELS[${level}].roadSpeeds)`, ctx),
      );
      assert.ok(
        Math.abs(table[2]) < Math.abs(table[1]),
        `level ${level}: seam lane slower than the fast lane`,
      );
    }
  });

  it('lane 2 runs opposite directions across lands (the double-negation regression)', () => {
    const ctx = makeContext();
    const l1 = probe(ctx, 0);
    const l2 = probe(ctx, 1);
    // The bug turned every lane positive; lane index 1 must be negative in L1.
    assert.ok(l1.lanes[1].every((s) => s < 0), 'L1 lane 2 flows left');
    // Lands must not share one identical flow pattern.
    const sig = (r) => r.lanes.map((signs) => signs[0]).join(',');
    assert.notEqual(sig(l1), sig(l2), 'L1 and L2 flow patterns differ');
  });
});
