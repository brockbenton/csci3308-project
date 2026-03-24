const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../src/index');
const expect = chai.expect;

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
