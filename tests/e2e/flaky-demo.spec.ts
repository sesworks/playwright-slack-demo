import { test, expect } from '@playwright/test';

test.describe('Quality Health Bot Demo', () => {

  test('simulate flaky network/element behavior', async ({ page }, testInfo) => {
    // ------------------------------------------------------------------------
    // ATTEMPT 1 (testInfo.retry === 0): SIMULATE FAILURE
    // ------------------------------------------------------------------------
    if (testInfo.retry === 0) {
      console.log('⚡ Attempt #1: Simulating a transient network/selector failure...');
      // Force an intentional failure on attempt #1
      expect(testInfo.retry, 'Simulated transient failure on Attempt #1').toBe(99);
    }

    // ------------------------------------------------------------------------
    // ATTEMPT 2 (testInfo.retry > 0): GUARANTEED PASS
    // ------------------------------------------------------------------------
    console.log(`✅ Attempt #${testInfo.retry + 1} (Retry): Passing cleanly on retry!`);
    
    // Pure assertion that passes immediately on retry (no network dependency)
    expect(true).toBe(true);
  });

});