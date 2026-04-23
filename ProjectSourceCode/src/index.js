const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const { Pool } = require('pg');
const path = require('path');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const bcrypt = require('bcryptjs'); //bycrypt
const app = express();
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
  helpers: {
    eq: (a, b) => a === b
  }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/'));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'spotdrop',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov'],
    },
  }),
});

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

app.post('/api/spots', upload.single('media'), async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Must be logged in to add a spot' });
  }
  const { name, description, sport_type, difficulty, latitude, longitude } = req.body;
  const media_filename = req.file ? req.file.path : null;
  try {
    const result = await db.query(
      'INSERT INTO spots (name, description, sport_type, difficulty, latitude, longitude, created_by, media_filename) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, description, sport_type, difficulty, latitude, longitude, req.session.user.id, media_filename]
    );
    res.json({ spot: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add spot' });
  }
});

app.delete('/api/spots/:id', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Must be logged in' });
  }
  const { id } = req.params;
  try {
    const result = await db.query(
      'DELETE FROM spots WHERE id = $1 AND created_by = $2 RETURNING id',
      [id, req.session.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(403).json({ error: 'Not authorized or spot not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete spot' });
  }
});

// --- Auth routes (Alex) ---

app.get('/account', async (req, res) => {
  try {
    const user_id = req.session.user.id;

    const user_result = await db.query('SELECT * FROM users WHERE id = $1', [user_id]);
    const spots_result = await db.query('SELECT * FROM spots WHERE created_by = $1 ORDER BY created_at DESC', [user_id]);
    const comments_result = await db.query('SELECT * FROM comments WHERE user_id = $1 ORDER BY created_at DESC', [user_id]);

    res.render('pages/account', {
      user: user_result.rows[0],
      spots: spots_result.rows,
      comments: comments_result.rows
    });
  } catch (err) {
    console.error("Error loading account page:", err);
  }
});

//update profile picture

app.post('/update_profile_pic', async (req, res) => {

  try {
    const user_id = req.session.user.id;
    const selected_picture = req.body.profile_choice;

    await db.query('UPDATE users SET profile_pic = $1 WHERE id = $2', [selected_picture, user_id]);
    res.redirect('/account');
  } catch (err) {
    console.error("Error changing profile picture", err);
  }
});

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
      return res.render('pages/login', { message: "Email or username not found. Please register before logging in." });
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
  const { email, username, password } = req.body;
  //helps fix test error
  if (!username || !password || !email) {
    return res.status(400).json({
      message: 'Invalid input'
    });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO users(email, username, password) VALUES($1, $2, $3)', [email, username, hash]);
    res.redirect('/login');
  } catch (error) {
    if (error.code === '23505') {
      return res.render('pages/register', { message: 'Email or username already taken.' });
    }
    console.error(error);
    res.redirect('/register');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.get('/welcome', (_req, res) => {
  res.json({ status: 'success', message: 'Welcome!' });
});

app.listen(PORT, () => {
  console.log(`SpotDrop running on port ${PORT}`);
});


// rendiering the forum page Akhil

app.get('/spots/:id', async (req, res) => {
  const spotId = req.params.id;

  const spotResult = await db.query(
  'SELECT * FROM spots WHERE id = $1',
  [spotId]
);
const commentsResult = await db.query(
  `SELECT c.id,
          c.content AS text,
          TO_CHAR((c.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Denver'), 'Dy Mon DD YYYY FMHH12:MI:SS AM MTC') AS time,
          c.user_id,
          u.username
   FROM comments c
   JOIN users u ON c.user_id = u.id
   WHERE c.spot_id = $1
   ORDER BY c.created_at DESC`,
    [spotId]
  );

  const spot = spotResult.rows[0];
  // const comments = commentsResult.rows;
  const comments = commentsResult.rows.map(c => {
  return { ...c, isOwner: req.session.user ? c.username === req.session.user.username : false };
});
  res.render('pages/forums', {
    id: spot.id,
    name: spot.name,
    description: spot.description,
    media_filename: spot.media_filename,
    comments: comments,
    user: req.session.user
  });
});
app.post('/addComment', async (req, res) => {
  const { comment, spotId } = req.body;
  const userId = req.session.user.id;
  try {
    const addComment = await db.query(
      'Insert into comments(spot_id,content,user_id) Values($1,$2,$3)',
      [spotId, comment, userId]
    );
    res.redirect(`/spots/${spotId}`);
  } catch (error) {
    console.log("Error in posting commments", error);
  }

})

app.delete('/delete/:id', async (req, res) => {
  const commentId = req.params.id;
  const userId = req.session.user.id; 
  console.log("Session user:", req.session.user);

  try {
    const result = await db.query(
      'DELETE FROM comments WHERE id = $1 AND user_id = $2',
      [commentId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    res.json({ success: true });
  } catch (error) {
    console.log("Error deleting comment:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// About Page WIP -- Sam 
app.get('/about', (req, res) => {
  res.render('pages/about', { user: req.session.user });
});

app.post('/about', async (req, res) => {
  const { username, password } = req.body;

});

module.exports = app;