const request = require('supertest');

jest.mock('pg', () => {
  const mockQuery = jest.fn();
  const mPool = { query: mockQuery };
  return { Pool: jest.fn(() => mPool) };
});

const { Pool } = require('pg');
const app = require('../server'); // Adjust path if needed

describe('GET /api/games', () => {
  it('should return all games', async () => {
    const mockGames = [
      { id: 1, name: 'Game 1', category: 'Action' },
      { id: 2, name: 'Game 2', category: 'Adventure' }
    ];

    Pool().query.mockResolvedValue({ rows: mockGames }); // FIX

    const res = await request(app).get('/api/games');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockGames);
    expect(Pool().query).toHaveBeenCalledWith('SELECT * FROM games'); // Will now pass
  });
});
