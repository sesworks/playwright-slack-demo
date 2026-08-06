// tests/api/users.spec.ts
import { test, expect } from '@playwright/test';
import { UserSchema, UsersListSchema } from './schemas/user.schema';
import { CreatePostResponseSchema } from './schemas/post.schema';

const API_BASE_URL = 'https://jsonplaceholder.typicode.com';

test.describe('API Validation & Contract Suite', () => {

  test('GET /users - should return 200 and match UsersList schema', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/users`);
    
    // 1. Status Code Assertion
    expect(response.status()).toBe(200);

    // 2. Response Schema Validation
    const body = await response.json();
    const parseResult = UsersListSchema.safeParse(body);

    if (!parseResult.success) {
      console.error('Schema validation failed:', parseResult.error.format());
    }

    expect(parseResult.success).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test('GET /users/1 - should return individual user matching User schema', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/users/1`);
    
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    const parseResult = UserSchema.safeParse(body);

    expect(parseResult.success).toBe(true);
    expect(body.id).toBe(1);
  });

  test('POST /posts - should create new post and return 201 with valid schema', async ({ request }) => {
    const payload = {
      title: 'Playwright API Integration Test',
      body: 'Testing REST endpoints with Zod schema validation.',
      userId: 1,
    };

    const response = await request.post(`${API_BASE_URL}/posts`, {
      data: payload,
    });

    expect(response.status()).toBe(201);

    const body = await response.json();
    const parseResult = CreatePostResponseSchema.safeParse(body);

    expect(parseResult.success).toBe(true);
    expect(body.title).toBe(payload.title);
  });

  test('GET /users/99999 - should return 404 for non-existent resource', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/users/99999`);
    expect(response.status()).toBe(404);
  });

});