const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const { Pool } = require('pg');
const path = require('path');

const bcrypt = require('bcryptjs'); //bycrypt
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const PORT = 3000;

const db = new Pool({
  host: process.env.PGHOST || 'db',
  port: process.env.PGPORT || 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'spotdrop_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
}));

// --- Map routes (Brock) ---

app.get('/', (req, res) => {
  res.render('pages/home', { user: req.session.user });
});

app.get('/api/spots', async (req, res) => {
  try {
    const { sport_type } = req.query;
    let query = 'SELECT * FROM spots ORDER BY created_at DESC';
    let params = [];
    if (sport_type && sport_type !== 'all') {
      query = 'SELECT * FROM spots WHERE sport_type = $1 ORDER BY created_at DESC';
      params = [sport_type];
    }
    const result = await db.query(query, params);
    res.json({ spots: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load spots' });
  }
});

app.post('/api/spots', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Must be logged in to add a spot' });
  }
  const { name, description, sport_type, difficulty, latitude, longitude } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO spots (name, description, sport_type, difficulty, latitude, longitude, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, description, sport_type, difficulty, latitude, longitude, req.session.user.id]
    );
    res.json({ spot: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add spot' });
  }
});

// --- Auth routes (Alex) ---

app.get('/login', (req, res) => {
  res.render('pages/login');
});

app.post('/login', async (req, res) => {
  // TODO: Alex implements login logic
  const { username, password } = req.body;

  try {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];


    if (!user) {
      return res.render('pages/login', { message: "Username not found. Please register before logging in." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (match) {
      req.session.user = user;
      req.session.save(() => {
        res.redirect('/');
      });

    } else {
      res.render('pages/login', { message: "Incorrect password. Please try again." });
    }
  } catch (error) {
    console.error(error);
    res.redirect('/login');
  }
});

app.get('/register', (req, res) => {
  res.render('pages/register');
});

app.post('/register', async (req, res) => {
  // TODO: Alex implements registration logic
  const { username, password } = req.body;
  //helps fix test error
  if (!username || !password) {
    return res.status(400).json({
      message: 'Invalid input'
    });
  }

  try {
    const hash = await bcrypt.hash(password, 10); // hash the password
    await db.query('INSERT INTO users(username, password) VALUES($1, $2)', [username, hash]);
    res.redirect('/login');
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Username already taken.' });
    }
    console.error(error);
    res.redirect('/register');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.listen(PORT, () => {
  console.log(`SpotDrop running on port ${PORT}`);
});

module.exports = app;
