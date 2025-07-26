const express = require('express');
const { ClickHouse } = require('clickhouse');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());

const { GetObjectCommand } = require('@aws-sdk/client-s3');

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

const BUCKET_NAME = process.env.S3_BUCKET;
const REGION = process.env.AWS_REGION || 'us-east-1';
const FLUSH_INTERVAL_MS = 10000; // 10 seconds
const MAX_RETRIES = 3;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const clickhouse = new ClickHouse({
  host: process.env.CLICKHOUSE_HOST || 'clickhouse-service',
  port: parseInt(process.env.CLICKHOUSE_PORT) || 8123,
  user: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD,
  debug: false,
  format: 'json',
});

let eventBuffer = [];

function formatEventToCSV(event) {
  return [
    event.session_id,
    event.event_type,
    event.page_url,
    event.element_tag,
    event.element_id,
    event.element_class,
    event.click_x,
    event.click_y,
    event.scroll_depth,
    event.duration_ms,
    event.timestamp
  ].map(v => (v === null ? '' : `"${v}"`)).join(',');
}

async function uploadBufferToS3(events) {
  if (!events.length) return;

  const key = `analytics/${new Date().toISOString().split('T')[0]}.csv`;
  const tmpFile = `/tmp/${path.basename(key)}`;

  try {
    let existingData = '';

    // Try to fetch the existing object (if it exists)
    try {
      const existing = await s3.send(new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
      }));
      existingData = await streamToString(existing.Body);
    } catch (err) {
      if (err.name !== 'NoSuchKey') {
        console.warn(`Failed to read existing object for key ${key}:`, err.message);
      }
    }

    // Append new lines to existing data
    const newData = events.map(formatEventToCSV).join('\n');
    existingData = existingData.trimEnd();
    const fullData = `${existingData}${existingData ? '\n' : ''}${newData}`;

    // Write to temp file and upload
    fs.writeFileSync(tmpFile, fullData);
    const fileStream = fs.createReadStream(tmpFile);

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileStream,
      ContentType: 'text/csv'
    }));

    console.log(`Appended ${events.length} events to S3: ${key}`);
  } catch (err) {
    console.error('Failed to append events to S3:', err);
  }
}

setInterval(() => {
  const batch = [...eventBuffer];
  eventBuffer = [];
  if (batch.length > 0) {
    uploadBufferToS3(batch);
  }
}, FLUSH_INTERVAL_MS);

app.post('/api/analytics/events', async (req, res) => {
  const data = req.body;
  console.log('Received event:', data);

  const event = {
    session_id: data.sessionId || 'unknown',
    event_type: data.type || 'unknown',
    page_url: data.url || '',
    element_tag: data.tag || null,
    element_id: data.id || null,
    element_class: data.classes || null,
    click_x: data.x || null,
    click_y: data.y || null,
    scroll_depth: data.scrollDepth || null,
    duration_ms: data.durationMs || null,
    timestamp: data.timestamp || new Date().toISOString()
  };

  try {
    await clickhouse.query(`
      INSERT INTO lugx_analytics.events (
        session_id, event_type, page_url, element_tag,
        element_id, element_class, click_x, click_y,
        scroll_depth, duration_ms, timestamp
      ) VALUES (
        '${event.session_id}',
        '${event.event_type}',
        '${event.page_url}',
        ${event.element_tag ? `'${event.element_tag}'` : 'NULL'},
        ${event.element_id ? `'${event.element_id}'` : 'NULL'},
        ${event.element_class ? `'${event.element_class}'` : 'NULL'},
        ${event.click_x !== null ? event.click_x : 'NULL'},
        ${event.click_y !== null ? event.click_y : 'NULL'},
        ${event.scroll_depth !== null ? event.scroll_depth : 'NULL'},
        ${event.duration_ms !== null ? event.duration_ms : 'NULL'},
        parseDateTimeBestEffort('${event.timestamp}')
      )
    `).toPromise();

    eventBuffer.push(event);
    res.status(200).send('Event inserted into ClickHouse and buffered for S3');
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
  console.log('Analytics service running at /api/analytics/events');
});
