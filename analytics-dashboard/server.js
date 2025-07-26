const express = require('express');
const { ClickHouse } = require('clickhouse');
const path = require('path');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/lugx-game/analytics', express.static(path.join(__dirname, 'public')));

const clickhouse = new ClickHouse({
  host: process.env.CLICKHOUSE_HOST || 'clickhouse-service',
  port: parseInt(process.env.CLICKHOUSE_PORT) || 8123,
  user: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD,
  debug: false,
  format: 'json',
});

function buildTimeFilter(range) {
  switch (range) {
    case '1h': return `timestamp >= now() - INTERVAL 1 HOUR`;
    case '12h': return `timestamp >= now() - INTERVAL 12 HOUR`;
    case '24h': return `timestamp >= now() - INTERVAL 1 DAY`;
    case '7d': return `timestamp >= now() - INTERVAL 7 DAY`;
    case '30d': return `timestamp >= now() - INTERVAL 30 DAY`;
    default: return `timestamp >= now() - INTERVAL 7 DAY`;
  }
}

app.get('/lugx-game/analytics', async (req, res) => {
  const range = req.query.range || '7d';
  const timeFilter = buildTimeFilter(range);

  try {
    const [eventTypeCounts, eventsOverTime, pageViews, avgDurations, clickHeatmap, elementClicks, scrollDepth] = await Promise.all([
      clickhouse.query(`SELECT event_type, count(*) AS count FROM lugx_analytics.events WHERE ${timeFilter} GROUP BY event_type`).toPromise(),
      clickhouse.query(`SELECT formatDateTime(timestamp, '%Y-%m-%d %H:00:00') AS hour, count(*) AS count FROM lugx_analytics.events WHERE ${timeFilter} GROUP BY hour ORDER BY hour`).toPromise(),
      clickhouse.query(`SELECT page_url, count(*) AS views FROM lugx_analytics.events WHERE ${timeFilter} AND event_type = 'page_view' GROUP BY page_url ORDER BY views DESC`).toPromise(),
      clickhouse.query(`SELECT page_url, avg(duration_ms) AS avg_duration FROM lugx_analytics.events WHERE ${timeFilter} AND event_type = 'page_leave' GROUP BY page_url ORDER BY avg_duration DESC`).toPromise(),
      clickhouse.query(`SELECT click_x, click_y FROM lugx_analytics.events WHERE ${timeFilter} AND event_type = 'click' AND click_x IS NOT NULL AND click_y IS NOT NULL`).toPromise(),
      clickhouse.query(`SELECT element_tag, count(*) AS count FROM lugx_analytics.events WHERE ${timeFilter} AND event_type = 'click' GROUP BY element_tag ORDER BY count DESC`).toPromise(),
      clickhouse.query(`SELECT scroll_depth, count(*) AS count FROM lugx_analytics.events WHERE ${timeFilter} AND event_type = 'page_leave' AND scroll_depth IS NOT NULL GROUP BY scroll_depth ORDER BY scroll_depth`).toPromise(),
    ]);


    res.render('dashboard', {
      selectedRange: range,
      chartData: {
        eventTypeCounts,
        eventsOverTime,
        pageViews,
        avgDurations,
        clickHeatmap,
        elementClicks,
        scrollDepth
      }
    });
    console.log('Dashboard rendered successfully with data for range:', range);
  } catch (err) {
    console.error('Query failed:', err);
    res.status(500).send('Query failed');
  }
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => console.log(`Dashboard running on port ${PORT}`));
