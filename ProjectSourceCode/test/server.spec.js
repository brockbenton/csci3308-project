const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../src/index');
const expect = chai.expect;
const { Pool } = require('pg');

//define db issue fix
const db = new Pool({
  host: process.env.PGHOST || 'db',
  port: process.env.PGPORT || 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

chai.use(chaiHttp);

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

//register tests
describe('Register API tests', () => {
  const user_test = {
    username: 'register_test_user',
    password: 'pass_test',

  };

  before(async () => {
    await db.query('DELETE FROM users WHERE username = $1', [user_test.username]);
  });

  after(async () => {
    await db.query('DELETE FROM users WHERE username = $1', [user_test.username]);
  });

  it('Positive: POST /register should create a user and redirect', async () => {
    const res = await chai.request(app)
      .post('/register')
      .redirects(0)
      .send(user_test)

    expect(res).to.have.status(302);
    const result = await db.query('SELECT * FROM users WHERE username = $1',
      [user_test.username]);
    expect(result.rows.length).to.equal(1);
    expect(result.rows[0].username).to.equal(user_test.username);
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