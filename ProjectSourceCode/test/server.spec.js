const chai = require('chai');
const chaiHttp = require('chai-http');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const app = require('../src/index');
const expect = chai.expect;

chai.use(chaiHttp);

const db = new Pool({
  host: process.env.PGHOST || 'db',
  port: process.env.PGPORT || 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

describe('Spots API', () => {
  it('GET /api/spots should return an object with a spots array', done => {
    chai.request(app)
      .get('/api/spots')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('spots');
        expect(res.body.spots).to.be.an('array');
        done();
      });
  });

  it('GET /api/spots?sport_type=climbing should return only climbing spots', done => {
    chai.request(app)
      .get('/api/spots?sport_type=climbing')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property('spots');
        res.body.spots.forEach(spot => {
          expect(spot.sport_type).to.equal('climbing');
        });
        done();
      });
  });

  it('POST /api/spots without a session should return 401', done => {
    chai.request(app)
      .post('/api/spots')
      .send({ name: 'Test Spot', sport_type: 'skating', latitude: 39.7, longitude: -104.9 })
      .end((err, res) => {
        expect(res).to.have.status(401);
        done();
      });
  });
});

describe('POST /api/spots (authenticated)', () => {
  let agent;
  const testUser = {
    username: 'spottest_user',
    password: 'testpass123',
  };

  before(async () => {
    await db.query('DELETE FROM users WHERE username = $1', [testUser.username]);
    const hash = await bcrypt.hash(testUser.password, 10);
    await db.query('INSERT INTO users (username, password) VALUES ($1, $2)', [
      testUser.username,
      hash,
    ]);
  });

  beforeEach(() => {
    agent = chai.request.agent(app);
  });

  afterEach(() => {
    agent.close();
  });

  after(async () => {
    await db.query('DELETE FROM spots WHERE name = $1', ['Auth Spot Test']);
    await db.query('DELETE FROM users WHERE username = $1', [testUser.username]);
  });

  it('should create a spot and return 200 when authenticated', async () => {
    await agent.post('/login').send(testUser);

    const res = await agent.post('/api/spots').send({
      name: 'Auth Spot Test',
      sport_type: 'skating',
      difficulty: 'easy',
      latitude: 39.7392,
      longitude: -104.9903,
    });

    expect(res).to.have.status(200);
    expect(res.body).to.have.property('spot');
    expect(res.body.spot).to.have.property('name', 'Auth Spot Test');
    expect(res.body.spot).to.have.property('sport_type', 'skating');
  });

  it('should return 500 when authenticated but required fields are missing', async () => {
    await agent.post('/login').send(testUser);

    const res = await agent.post('/api/spots').send({
      description: 'Missing name, sport_type, latitude, longitude',
    });

    expect(res).to.have.status(500);
    expect(res.body).to.have.property('error', 'Failed to add spot');
  });
});

// register tests
describe('Register API tests', () => {
  const user_test = {
    email: 'register_test_email',
    username: 'register_test_user',
    password: 'pass_test',

  };

  before(async () => {
    await db.query('DELETE FROM users WHERE email = $1', [user_test.email]);
  });

  after(async () => {
    await db.query('DELETE FROM users WHERE email = $1', [user_test.email]);
  });

  before(async () => {
    await db.query('DELETE FROM users WHERE username = $2', [user_test.username]);
  });

  after(async () => {
    await db.query('DELETE FROM users WHERE username = $2', [user_test.username]);
  });

  it('Positive: POST /register should create a user and redirect', async () => {
    const res = await chai.request(app)
      .post('/register')
      .redirects(0)
      .send(user_test)

    expect(res).to.have.status(302);
    const result = await db.query('SELECT * FROM users WHERE username = $2',
      [user_test.username]);
    expect(result.rows.length).to.equal(2);
    expect(result.rows[1].username).to.equal(user_test.username);
  });
});
it('Negative: POST /register with missing fields should return 400', done => {
  chai.request(app)
    .post('/register')
    .send({ username: 'only_user' })
    .end((err, res) => {
      expect(res).to.have.status(400);
      expect(res.body.message).to.equal('Invalid input');
      done();
    });
});
