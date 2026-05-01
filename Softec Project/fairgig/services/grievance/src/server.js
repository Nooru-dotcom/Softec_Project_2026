require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { pool } = require('./db');
const { deriveClusterKey } = require('./cluster');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH']
  }
});

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'grievance' });
});

app.post('/grievances', async (req, res) => {
  const { user_id = null, title, description, city, platform, anonymous = true, tags = [] } = req.body;
  if (!title || !description || !city || !platform) {
    return res.status(400).json({ error: 'title, description, city and platform are required' });
  }

  const cluster_key = deriveClusterKey(title, description);
  const query = `
    INSERT INTO grievances (user_id, title, description, city, platform, tags, status, cluster_key, anonymous)
    VALUES ($1, $2, $3, $4, $5, $6, 'open', $7, $8)
    RETURNING *
  `;

  const values = [user_id, title, description, city, platform, tags, cluster_key, anonymous];
  const { rows } = await pool.query(query, values);

  io.emit('grievance:new', rows[0]);
  res.status(201).json(rows[0]);
});

app.get('/grievances', async (req, res) => {
  const { status, city, platform } = req.query;
  const conditions = [];
  const values = [];

  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }
  if (city) {
    values.push(city);
    conditions.push(`city = $${values.length}`);
  }
  if (platform) {
    values.push(platform);
    conditions.push(`platform = $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `SELECT * FROM grievances ${whereClause} ORDER BY created_at DESC LIMIT 200`;
  const { rows } = await pool.query(query, values);
  res.json(rows);
});

app.patch('/grievances/:id/moderate', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['open', 'in_review', 'resolved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'invalid status' });
  }

  const { rows } = await pool.query('UPDATE grievances SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
  if (!rows[0]) {
    return res.status(404).json({ error: 'grievance not found' });
  }

  io.emit('grievance:updated', rows[0]);
  res.json(rows[0]);
});

app.patch('/grievances/:id/tag', async (req, res) => {
  const { id } = req.params;
  const { tags = [] } = req.body;

  const { rows } = await pool.query('UPDATE grievances SET tags = $1 WHERE id = $2 RETURNING *', [tags, id]);
  if (!rows[0]) {
    return res.status(404).json({ error: 'grievance not found' });
  }

  io.emit('grievance:updated', rows[0]);
  res.json(rows[0]);
});

app.get('/grievances/clustered', async (_req, res) => {
  const query = `
    SELECT COALESCE(cluster_key, 'other') AS cluster_key,
           COUNT(*) AS total,
           ARRAY_AGG(id ORDER BY created_at DESC) AS grievance_ids
    FROM grievances
    GROUP BY cluster_key
    ORDER BY total DESC
  `;
  const { rows } = await pool.query(query);
  res.json(rows);
});

io.on('connection', (socket) => {
  socket.emit('connected', { message: 'Connected to FairGig grievance live feed' });
});

const port = Number(process.env.PORT || 8006);
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Grievance service running on port ${port}`);
});
