import { test, expect } from '@playwright/test';

/**
 * ============================================================================
 * API & INTEGRATION TEST SUITE: Sales Deals Endpoints
 * ============================================================================
 * Purpose: Validates backend REST API endpoints directly at the HTTP layer
 * without opening a browser context. This ensures ultra-fast test execution 
 * times (milliseconds) and validates backend business logic, status codes, 
 * payload integrity, and JSON schemas.
 */

// Base endpoint URL for mock sales data operations
const API_BASE_URL = 'https://jsonplaceholder.typicode.com';

test.describe('API & Integration Layer - Sales Deals API', () => {

  /**
   * TEST 1: GET Request (Read Operation)
   * Validates fetching a collection of sales deal resources.
   */
  test('GET /posts - Should retrieve list of sales deals with correct schema', async ({ request }) => {
    // 1. Send HTTP GET request using Playwright's built-in `request` API context
    const response = await request.get(`${API_BASE_URL}/posts`);

    // 2. Assert HTTP Status Code (200 OK)
    expect(response.status()).toBe(200);
    
    // 3. Helper assertion to verify status code is in the 200-299 range
    expect(response.ok()).toBeTruthy();

    // 4. Parse the response body as JSON
    const deals = await response.json();

    // 5. Data Structure Validation: Ensure the returned data is a non-empty array
    expect(Array.isArray(deals)).toBeTruthy();
    expect(deals.length).toBeGreaterThan(0);

    // 6. Schema & Field Validation: Check if the first object contains expected contract properties
    const firstDeal = deals[0];
    expect(firstDeal).toHaveProperty('id');
    expect(firstDeal).toHaveProperty('title');
    expect(firstDeal).toHaveProperty('userId');
  });

  /**
   * TEST 2: POST Request (Create Operation)
   * Simulates setting up new entity state directly via API (ideal for test setup hooks).
   */
  test('POST /posts - Should create a new deal (Integration Setup)', async ({ request }) => {
    // Define payload matching backend schema requirements
    const newDealPayload = {
      title: 'Enterprise Plan - Amptalk Inc',
      body: 'Deal Value: $50,000 | Stage: Proposal',
      userId: 1,
    };

    // 1. Send HTTP POST request with payload and HTTP headers
    const response = await request.post(`${API_BASE_URL}/posts`, {
      data: newDealPayload, // Automatically serialized to JSON
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
      },
    });

    // 2. Assert HTTP Status Code (201 Created)
    expect(response.status()).toBe(201);

    // 3. Parse JSON response to verify creation echo
    const createdDeal = await response.json();

    // 4. Integrity Checks: Confirm returned data matches what we submitted
    expect(createdDeal.title).toBe(newDealPayload.title);
    expect(createdDeal.body).toBe(newDealPayload.body);
    
    // 5. Confirm server generated a unique primary key ID for the record
    expect(createdDeal).toHaveProperty('id');
  });

  /**
   * TEST 3: PUT Request (Update Operation)
   * Validates state mutation on an existing entity resource.
   */
  test('PUT /posts/:id - Should update existing deal details', async ({ request }) => {
    // Define updated state attributes
    const updatedPayload = {
      id: 1,
      title: 'Enterprise Plan - Amptalk Inc (Closed Won)',
      body: 'Deal Value: $65,000 | Stage: Contract Signed',
      userId: 1,
    };

    // 1. Send HTTP PUT request targeting resource ID #1
    const response = await request.put(`${API_BASE_URL}/posts/1`, {
      data: updatedPayload,
    });

    // 2. Assert HTTP Status Code (200 OK)
    expect(response.status()).toBe(200);

    // Change this temporarily:
// expect(response.status()).toBe(500);

    // 3. Validate updated values in the response object
    const updatedDeal = await response.json();
    expect(updatedDeal.title).toBe(updatedPayload.title);
    expect(updatedDeal.body).toBe(updatedPayload.body);
  });

  /**
   * TEST 4: DELETE Request (Delete / Clean-up Operation)
   * Verifies resource removal endpoint (ideal for teardown hooks after E2E tests).
   */
  test('DELETE /posts/:id - Should successfully delete/archive deal', async ({ request }) => {
    // 1. Send HTTP DELETE request targeting resource ID #1
    const response = await request.delete(`${API_BASE_URL}/posts/1`);

    // 2. Assert successful HTTP status response (200 OK or 204 No Content)
    expect(response.status()).toBe(200);
  });

});