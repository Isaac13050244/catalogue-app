const request = require('supertest');
const app = require('../index');

describe('POST /auth/register', () => {
  const email = `testuser_${Date.now()}@example.com`;

  test('registers a new user successfully', async () => {
    const res = await request(app).post('/auth/register').send({ email, password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('User registered successfully');
  });

  test('rejects duplicate email', async () => {
    const res = await request(app).post('/auth/register').send({ email, password: 'password123' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already registered');
  });

  test('rejects missing email', async () => {
    const res = await request(app).post('/auth/register').send({ password: 'password123' });
    expect(res.status).toBe(400);
  });

  test('rejects invalid email format', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'notanemail', password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid email format');
  });

  test('rejects short password', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'new@example.com', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Password must be at least 6 characters');
  });
});

describe('POST /auth/login', () => {
  const email = `logintest_${Date.now()}@example.com`;
  const password = 'securepass';

  beforeAll(async () => {
    await request(app).post('/auth/register').send({ email, password });
  });

  test('logs in with correct credentials and returns token', async () => {
    const res = await request(app).post('/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('rejects wrong password', async () => {
    const res = await request(app).post('/auth/login').send({ email, password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  test('rejects unknown email', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'nobody@example.com', password });
    expect(res.status).toBe(401);
  });
});