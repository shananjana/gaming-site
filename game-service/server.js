// services/game-service/index.js
const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = 5000;

const pool = new Pool({
  user: 'postgres',
  host: process.env.DB_HOST || 'postgres',
  database: 'lugx_gaming',
  password: process.env.DB_PASSWORD,
  port: 5432,
});

// 1) All games
app.get('/api/games', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM games');
  res.json(rows);
});

// 2) Trending: latest releases (or define your own criteria)
app.get('/api/games/trending', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * 
       FROM games 
      ORDER BY release_date DESC 
      LIMIT $1`, 
    [4]
  );
  res.json(rows);
});

// 3) Most played: assume you have a play_count column
app.get('/api/games/most-played', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * 
       FROM games 
      ORDER BY play_count DESC 
      LIMIT $1`, 
    [6]
  );
  res.json(rows);
});

// 4) Categories list
app.get('/api/games/categories', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT DISTINCT category 
       FROM games`
  );
  res.json(rows.map(r => r.category));
});

// Fetch single game by its numeric ID
app.get('/api/games/:id', async (req, res) => {
  const gameId = parseInt(req.params.id, 10);
  if (Number.isNaN(gameId)) {
    return res.status(400).json({ error: 'Invalid game ID' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id,
              name,
              category,
              release_date,
              price,
              image_url,
              play_count,
              description
         FROM games
        WHERE id = $1`,
      [gameId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('DB error fetching game:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Game service running on port ${port}`);
  });
}

module.exports = app;
