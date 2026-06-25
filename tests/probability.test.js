/**
 * tests/probability.test.js
 *
 * Comprehensive unit tests for the Math Probability Curves Analyzer VM.
 * Verifies standard, exploding, roll-and-keep, and success pool calculations.
 */

const fs = require('fs');
const path = require('path');

describe('Math Probability Curves Analyzer VM', () => {
  let calculateProbability;

  beforeAll(() => {
    // Clear cache and load compiled app.js
    const appPath = path.resolve(__dirname, '../dist/app.js');
    delete require.cache[appPath];
    require('../dist/app.js');
    calculateProbability = window.calculateProbability;
  });

  test('calculateProbability function exists', () => {
    expect(calculateProbability).toBeDefined();
    expect(typeof calculateProbability).toBe('function');
  });

  describe('Standard Rolls (Sum)', () => {
    test('3d6 sum is calculated exactly and correctly', () => {
      const dist = calculateProbability('standard', { count: 3, sides: 6, modifier: 0 });

      // Range for 3d6 is 3 to 18
      expect(dist.min).toBe(3);
      expect(dist.max).toBe(18);

      // Mean (Expected Value) is 3 * 3.5 = 10.5
      expect(dist.mean).toBeCloseTo(10.5, 2);

      // Verify that probabilities sum to 1.0 (approx due to floating point)
      const sumPdf = Object.values(dist.pdf).reduce((a, b) => a + b, 0);
      expect(sumPdf).toBeCloseTo(1.0, 5);

      // CDF at min should be 1.0
      expect(dist.cdf[3]).toBeCloseTo(1.0, 5);

      // 3d6 has exactly 1/216 chance of rolling 3 (or 18)
      expect(dist.pdf[3]).toBeCloseTo(1 / 216, 5);
      expect(dist.pdf[18]).toBeCloseTo(1 / 216, 5);

      // Probability of rolling 10 or higher
      expect(dist.cdf[10]).toBeGreaterThan(0.5);
    });

    test('3d6+2 modifier works correctly', () => {
      const dist = calculateProbability('standard', { count: 3, sides: 6, modifier: 2 });

      // Range shifted by +2
      expect(dist.min).toBe(5);
      expect(dist.max).toBe(20);

      // Mean shifted by +2
      expect(dist.mean).toBeCloseTo(12.5, 2);
    });
  });

  describe('Exploding Rolls', () => {
    test('1d6 exploding has a higher mean than standard 1d6', () => {
      const standardDist = calculateProbability('standard', { count: 1, sides: 6, modifier: 0 });
      const explodingDist = calculateProbability('exploding', { count: 1, sides: 6, modifier: 0, explode: true });

      // Standard d6 mean is 3.5
      expect(standardDist.mean).toBe(3.5);

      // Exploding d6 mean is 3.5 + 3.5 / 5 = 4.2
      // Let's verify it's around 4.2 (allow tolerance since it's a simulation)
      expect(explodingDist.mean).toBeGreaterThan(4.0);
      expect(explodingDist.mean).toBeLessThan(4.4);

      // Exploding max roll can be much higher than 6
      expect(explodingDist.max).toBeGreaterThan(6);
    });
  });

  describe('Roll and Keep (Highest)', () => {
    test('4d6 keep highest 3 has a higher mean than standard 3d6', () => {
      const standardDist = calculateProbability('standard', { count: 3, sides: 6, modifier: 0 });
      const rollKeepDist = calculateProbability('rollkeep', { count: 4, sides: 6, keepCount: 3, modifier: 0 });

      expect(standardDist.mean).toBe(10.5);

      // 4d6 keep 3 expected value is around 12.24
      expect(rollKeepDist.mean).toBeGreaterThan(11.8);
      expect(rollKeepDist.mean).toBeLessThan(12.6);

      expect(rollKeepDist.min).toBe(3);
      expect(rollKeepDist.max).toBe(18);
    });
  });

  describe('Success Pools', () => {
    test('10d6 with success threshold 5 counts successes', () => {
      const successPoolDist = calculateProbability('successpool', { count: 10, sides: 6, successThreshold: 5 });

      // Success range is 0 to 10
      expect(successPoolDist.min).toBeGreaterThanOrEqual(0);
      expect(successPoolDist.max).toBeLessThanOrEqual(10);

      // Probability of success per die (5 or 6) is 2/6 = 1/3
      // Expected successes over 10 dice = 10 * 1/3 = 3.333
      expect(successPoolDist.mean).toBeGreaterThan(3.1);
      expect(successPoolDist.mean).toBeLessThan(3.6);
    });
  });
});
