const request = require('supertest');

// Mock the pg module
jest.mock('pg', () => {
  const mockQuery = jest.fn();
  const mPool = { query: mockQuery };
  return { Pool: jest.fn(() => mPool) };
});

const { Pool } = require('pg');
const app = require('../server'); // adjust path if needed

describe('Game Service API Tests', () => {
  beforeEach(() => {
    // Clear mock calls before each test
    Pool().query.mockReset();
  });

  it('GET /api/games - should return all games', async () => {
    const mockGames = [
      { id: 1, name: 'Game 1', category: 'Action' },
      { id: 2, name: 'Game 2', category: 'Adventure' },
    ];
    Pool().query.mockResolvedValue({ rows: mockGames });

    const res = await request(app).get('/api/games');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockGames);
    expect(Pool().query).toHaveBeenCalledWith('SELECT * FROM games');
  });

  it('GET /api/games/trending - should return latest games', async () => {
    const mockTrending = [{ id: 3, name: 'Game 3' }];
    Pool().query.mockResolvedValue({ rows: mockTrending });

    const res = await request(app).get('/api/games/trending');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockTrending);
    expect(Pool().query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY release_date DESC'), [4]);
  });

  it('GET /api/games/most-played - should return most played games', async () => {
    const mockPopular = [{ id: 4, name: 'Popular Game' }];
    Pool().query.mockResolvedValue({ rows: mockPopular });

    const res = await request(app).get('/api/games/most-played');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockPopular);
    expect(Pool().query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY play_count DESC'), [6]);
  });

  it('GET /api/games/categories - should return categories', async () => {
    Pool().query.mockResolvedValue({ rows: [{ category: 'Action' }, { category: 'Racing' }] });

    const res = await request(app).get('/api/games/categories');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(['Action', 'Racing']);
    expect(Pool().query).toHaveBeenCalledWith(expect.stringContaining('SELECT DISTINCT category'));
  });

  it('GET /api/games/:id - should return single game if found', async () => {
    const mockGame = {
      id: 5,
      name: 'Specific Game',
      category: 'Adventure',
      release_date: '2024-01-01',
      price: 59.99,
      image_url: 'game.jpg',
      play_count: 1000,
      description: 'Awesome game'
    };
    Pool().query.mockResolvedValue({ rows: [mockGame] });

    const res = await request(app).get('/api/games/5');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockGame);
  });

  it('GET /api/games/:id - should return 400 for invalid ID', async () => {
    const res = await request(app).get('/api/games/abc');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid game ID' });
  });

  it('GET /api/games/:id - should return 404 if not found', async () => {
    Pool().query.mockResolvedValue({ rows: [] });

    const res = await request(app).get('/api/games/999');
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'Game not found' });
  });

  it('GET /api/games/:id - should return 500 on DB error', async () => {
    Pool().query.mockRejectedValue(new Error('DB failed'));

    const res = await request(app).get('/api/games/1');
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});
