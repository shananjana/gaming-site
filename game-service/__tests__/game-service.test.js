const request = require('supertest');
const express = require('express');
const { Pool } = require('pg');

jest.mock('pg', () => {
  const mClient = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  };
  return {
    Pool: jest.fn(() => mClient),
  };
});

const app = express();
app.use(express.json());

const mockGames = [
  { id: 1, name: 'Game A', category: 'Action', play_count: 100, release_date: '2023-09-01' },
  { id: 2, name: 'Game B', category: 'Racing', play_count: 90, release_date: '2023-08-01' }
];

const pool = new Pool();

// mock endpoints
app.get('/api/games', async (req, res) => {
  const { rows } = await pool.query();
  res.json(rows);
});

describe('GET /api/games', () => {
  it('should return all games', async () => {
    pool.query.mockResolvedValue({ rows: mockGames });

    const res = await request(app).get('/api/games');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockGames);
    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM games');
  });
});
