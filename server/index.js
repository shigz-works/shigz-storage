const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const knex = require('knex')(require('./knexfile').development);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Auth Middleware (Simplified)
const auth = (role) => (req, res, next) => {
  const userRole = req.headers['x-user-role'];
  if (!userRole) return res.status(401).json({ error: 'Unauthorized' });
  if (role && role !== userRole && userRole !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

// Auth Route
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await knex('users').where({ username, password }).first();
  if (user) {
    res.json({ id: user.id, username: user.username, role: user.role });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// States Routes
app.get('/api/states', async (req, res) => {
  const states = await knex('states').select('*');
  res.json(states);
});

// Units Routes
app.get('/api/units', async (req, res) => {
  const { state_id } = req.query;
  let query = knex('units').select('*');
  if (state_id) query = query.where({ state_id });
  const units = await query;
  res.json(units);
});

app.post('/api/units', auth('admin'), async (req, res) => {
  const [id] = await knex('units').insert(req.body);
  res.json({ id, ...req.body });
});

app.put('/api/units/:id', auth('admin'), async (req, res) => {
  await knex('units').where({ id: req.params.id }).update(req.body);
  res.json({ success: true });
});

app.delete('/api/units/:id', auth('admin'), async (req, res) => {
  await knex('units').where({ id: req.params.id }).del();
  res.json({ success: true });
});

// Topics Routes
app.get('/api/topics', async (req, res) => {
  const { unit_id } = req.query;
  let query = knex('topics').select('*').orderBy('order', 'asc');
  if (unit_id) query = query.where({ unit_id });
  const topics = await query;
  res.json(topics);
});

app.post('/api/topics', auth('admin'), async (req, res) => {
  const [id] = await knex('topics').insert(req.body);
  res.json({ id, ...req.body });
});

app.put('/api/topics/:id', auth('admin'), async (req, res) => {
  await knex('topics').where({ id: req.params.id }).update(req.body);
  res.json({ success: true });
});

app.delete('/api/topics/:id', auth('admin'), async (req, res) => {
  await knex('topics').where({ id: req.params.id }).del();
  res.json({ success: true });
});

// Sections Routes
app.get('/api/sections', async (req, res) => {
  const { topic_id, guide_type, q } = req.query;
  let query = knex('sections')
    .leftJoin('topics', 'sections.topic_id', 'topics.id')
    .leftJoin('units', 'topics.unit_id', 'units.id')
    .select('sections.*', 'topics.title as topic_title', 'units.code as unit_code')
    .orderBy('sections.order', 'asc');

  if (topic_id) query = query.where({ 'sections.topic_id': topic_id });
  if (guide_type) query = query.where({ 'sections.guide_type': guide_type });

  if (q) {
    const terms = q.split(' ').filter(t => t.length > 0);
    query = query.where(function() {
      terms.forEach(term => {
        this.orWhere('sections.title', 'like', `%${term}%`)
            .orWhere('sections.content', 'like', `%${term}%`)
            .orWhere('topics.title', 'like', `%${term}%`)
            .orWhere('units.code', 'like', `%${term}%`);
      });
    });
  }

  const sections = await query;
  res.json(sections);
});

app.post('/api/sections', auth('admin'), async (req, res) => {
  const [id] = await knex('sections').insert(req.body);
  res.json({ id, ...req.body });
});

app.put('/api/sections/:id', auth('admin'), async (req, res) => {
  const oldSection = await knex('sections').where({ id: req.params.id }).first();
  const userId = req.headers['x-user-id'];

  if (oldSection && userId) {
    await knex('content_history').insert({
      section_id: req.params.id,
      old_content: oldSection.content,
      updated_by: userId
    });
  }

  await knex('sections').where({ id: req.params.id }).update(req.body);
  res.json({ success: true });
});

app.delete('/api/sections/:id', auth('admin'), async (req, res) => {
  await knex('sections').where({ id: req.params.id }).del();
  res.json({ success: true });
});

app.get('/api/sections/:id/history', auth('admin'), async (req, res) => {
  const history = await knex('content_history')
    .where({ section_id: req.params.id })
    .join('users', 'content_history.updated_by', 'users.id')
    .select('content_history.*', 'users.username')
    .orderBy('created_at', 'desc');
  res.json(history);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
