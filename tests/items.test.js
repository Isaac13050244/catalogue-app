const request = require('supertest');
const app = require('../index');
const db = require('../db');

let userToken;
let adminToken;

beforeAll(async () => {
  // Register and login a regular user
  const email = `itemuser_${Date.now()}@example.com`;
  await request(app).post('/auth/register').send({ email, password: 'password123' });
  const loginRes = await request(app).post('/auth/login').send({ email, password: 'password123' });
  userToken = loginRes.body.token;

  // Create an admin user directly in the DB
  const bcrypt = require('bcryptjs');
  const hashed = await bcrypt.hash('adminpass', 10);
  const adminEmail = `admin_${Date.now()}@example.com`;
  db.prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)').run(adminEmail, hashed, 'admin');
  const adminLogin = await request(app).post('/auth/login').send({ email: adminEmail, password: 'adminpass' });
  adminToken = adminLogin.body.token;
});

describe('GET /items', () => {
  test('returns a list of items', async () => {
    const res = await request(app).get('/items');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  test('paginates results', async () => {
    const res = await request(app).get('/items?page=1');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeLessThanOrEqual(10);
  });

  test('filters by search keyword', async () => {
    const res = await request(app).get('/items?search=laptop');
    expect(res.status).toBe(200);
    expect(res.body.items.some(i => i.name.toLowerCase().includes('laptop'))).toBe(true);
  });

  test('returns empty array for no match', async () => {
    const res = await request(app).get('/items?search=zzznomatch999');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(0);
  });
});

describe('Favourites', () => {
  test('rejects unauthenticated request', async () => {
    const res = await request(app).post('/items/favourites/1');
    expect(res.status).toBe(401);
  });

  test('adds an item to favourites', async () => {
    const res = await request(app)
      .post('/items/favourites/1')
      .set('Authorization', `Bearer ${userToken}`);
    expect([201, 409]).toContain(res.status); // 409 if already added
  });

  test('gets list of favourites', async () => {
    const res = await request(app)
      .get('/items/favourites')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.favourites)).toBe(true);
  });

  test('removes an item from favourites', async () => {
    await request(app).post('/items/favourites/2').set('Authorization', `Bearer ${userToken}`);
    const res = await request(app)
      .delete('/items/favourites/2')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(200);
  });
});

describe('Admin CRUD', () => {
  let newItemId;

  test('blocks non-admin from creating items', async () => {
    const res = await request(app)
      .post('/items/admin')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Sneaky Item' });
    expect(res.status).toBe(403);
  });

  test('admin can create an item', async () => {
    const res = await request(app)
      .post('/items/admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Item', description: 'Created by admin in test' });
    expect(res.status).toBe(201);
    newItemId = res.body.itemId;
  });

  test('admin can update an item', async () => {
    const res = await request(app)
      .put(`/items/admin/${newItemId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Item', description: 'Updated description' });
    expect(res.status).toBe(200);
  });

  test('admin can delete an item', async () => {
    const res = await request(app)
      .delete(`/items/admin/${newItemId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});