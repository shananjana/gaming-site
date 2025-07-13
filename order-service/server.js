const express = require('express');
const { Pool } = require('pg');
const app = express();
app.use(express.json());
const port = 6000;

const pool = new Pool({
  user: 'postgres',
  host: process.env.DB_HOST || 'postgres',
  database: 'lugx_gaming',
  password: process.env.DB_PASSWORD,
  port: 5432,
});

app.listen(port, () => {
  console.log(`Order service running on port ${port}`);
});

app.post('/api/orders', async (req, res) => {
  const { sessionId, items, total } = req.body;

  if (!sessionId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).send({ error: 'Invalid order payload' });
  }

  const { gameId, quantity = 1 } = items[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find or create order
    let result = await client.query(
      `SELECT id FROM orders WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1`, [sessionId]
    );

    let orderId;
    if (result.rows.length > 0) {
      orderId = result.rows[0].id;
    } else {
      const insertOrder = await client.query(
        `INSERT INTO orders (session_id) VALUES ($1) RETURNING id`, [sessionId]
      );
      orderId = insertOrder.rows[0].id;
    }

    // Validate and get price
    const game = await client.query(`SELECT price FROM games WHERE id = $1`, [gameId]);
    if (game.rows.length === 0) throw new Error('Game not found');
    const price = parseFloat(game.rows[0].price);

    // Upsert game to order_items
    await client.query(`
      INSERT INTO order_items (order_id, game_id, quantity, price)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (order_id, game_id)
      DO UPDATE SET quantity = order_items.quantity + EXCLUDED.quantity
    `, [orderId, gameId, quantity, price]);

    // Update total price
    await client.query(`
      UPDATE orders SET total_price = (
        SELECT SUM(quantity * price) FROM order_items WHERE order_id = $1
      ) WHERE id = $1
    `, [orderId]);

    await client.query('COMMIT');
    res.send({ success: true, orderId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Order error:', err);
    res.status(500).send({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/api/cart', async (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId) return res.status(400).send({ error: 'Missing sessionId' });

  const client = await pool.connect();
  try {
    // Get the latest order ID for this session
    const orderResult = await client.query(`
      SELECT id FROM orders
      WHERE session_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [sessionId]);

    if (orderResult.rows.length === 0) {
      return res.json([]); // No cart yet
    }

    const orderId = orderResult.rows[0].id;

    // Get all items for that order
    const itemsResult = await client.query(`
      SELECT g.name, g.image_url, i.quantity, i.price
      FROM order_items i
      JOIN games g ON g.id = i.game_id
      WHERE i.order_id = $1
    `, [orderId]);

    res.json(itemsResult.rows);
  } catch (err) {
    console.error('Cart load error:', err);
    res.status(500).send({ error: 'Failed to load cart' });
  } finally {
    client.release();
  }
});
