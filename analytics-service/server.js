const express = require('express');
const { ClickHouse } = require('clickhouse');
const app = express();
app.use(express.json());

const clickhouse = new ClickHouse({
  host: process.env.CLICKHOUSE_HOST || 'clickhouse-service',
  port: parseInt(process.env.CLICKHOUSE_PORT) || 8123,
  user: process.env.CLICKHOUSE_USER,  // Now using secret
  password: process.env.CLICKHOUSE_PASSWORD,  // Now using secret
  debug: true,
  format: 'json'
});


// 👇 Handle the full path including prefix
app.post('/api/analytics/events', async (req, res) => {
  console.log('Received analytics event:', req.body);
  
  try {
    await clickhouse.query(`
      INSERT INTO lugx_analytics.events (
        event_type, page_url, element_target, 
        element_id, user_id, timestamp
      ) VALUES (
        '${req.body.type || 'unknown'}',
        '${req.body.url || ''}',
        '${req.body.target || ''}',
        ${req.body.id ? `'${req.body.id}'` : 'NULL'},
        ${req.body.user_id ? `'${req.body.user_id}'` : 'NULL'},
        now()
      )
    `).toPromise();

    res.status(200).send();
  } catch (err) {
    console.error('ClickHouse insert failed:', err);
    res.status(500).json({ error: 'Event processing failed' });
  }
});

// Health check
app.get('/api/analytics/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(8080, () => {
  console.log('Analytics service ready at /api/analytics/events');
});
