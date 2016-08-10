/*
 * apitests.js
 *
 * AWS API Gateway Test Suite for Browses.
 */
const should = require('should');
const assert = require('assert');
const request = require('supertest');


describe('browses', function() {
  const url = 'https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta';
  const appId = '509258605951475';
  const secret = '1cbcd4c805fec6f7dbc030d24eeab9cd';
  const service = 'browses';
  const image = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAoAAA
  AHgAQMAAAAPH06nAAAAA1BMVEX///+nxBvIAAAAPElEQVR42u3BAQ0AAADCIPu
  nfg43YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwKJfgA
  AHF2U8TAAAAAElFTkSuQmCC`;
  var token = '';
  var browser = '';
  /*
   * Get authentication token before running tests.
   */
  before(function(done) {
    request('https://graph.facebook.com/oauth')
    .get('/access_token')
    .query({ client_id: appId })
    .query({ client_secret: secret })
    .query({ grant_type: 'client_credentials' })
    .end((err, res) => {
      if (err) {
        throw err;
      }
      const accessToken = res.text.replace('access_token=', '');
      request('https://graph.facebook.com/')
      .get(`/${appId}/accounts/test-users`)
      .query({ access_token: accessToken })
      .end((err, res) => {
        if (err) {
          throw err;
        }
        const response = JSON.parse(res.text);
        browser = response.data[0].id;
        token = response.data[0].access_token;
        done();
      });
    });
  });
  /*
   * Test we can upload a browse.
   */
  describe('uploadBrowse', function() {
    describe('testUploadBrowse', function() {
      it('should return successfully with correct parameters', function(done) {
        const params = {
          token,
          url: service,
          shot: image,
          title: 'API Tests',
        };
        request(url)
        .post('/browses')
        .send(params)
        .end((err, res) => {
          if (err) {
            throw err;
          }
          res.status.should.be.equal(200);
          res.headers.should.have.property('access-control-allow-origin');
          res.headers['access-control-allow-origin'].should.be.equal('*');
          res.body.should.be.instanceof(Object);
          res.body.should.have.property('browser');
          res.body.should.have.property('url');
          res.body.should.have.property('title');
          res.body.should.have.property('shot');
          res.body.should.have.property('published');
          done();
        });
      });
    });
  });
  /*
   * Test we can get the last 24 hours of browses.
   */
  describe('getLatestBrowses', function() {
    describe('testGetLatestBrowses', function() {
      it('should return successfully with correct parameters', function(done) {
        request(url)
        .get('/browses')
        .end((err, res) => {
          if (err) {
            throw err;
          }
          res.status.should.be.equal(200);
          res.headers.should.have.property('access-control-allow-origin');
          res.headers['access-control-allow-origin'].should.be.equal('*');
          res.body.should.be.instanceof(Array);
          if (res.body.length > 0) {
            res.body[0].should.have.property('browser');
            res.body[0].should.have.property('shot');
            res.body[0].should.have.property('url');
          }
          done();
        });
      });
    });
  });
  /*
   * Test we can get a users browses.
   */
  describe('getUserBrowses', function() {
    describe('testGetUserBrowses', function() {
      it('should return successfully with correct parameters', function(done) {
        request(url)
        .get(`/browses/${browser}`)
        .end((err, res) => {
          if (err) {
            throw err;
          }
          res.status.should.be.equal(200);
          res.headers.should.have.property('access-control-allow-origin');
          res.headers['access-control-allow-origin'].should.be.equal('*');
          res.body.should.be.instanceof(Array);
          res.body[0].should.have.property('browser');
          res.body[0].should.have.property('shot');
          res.body[0].should.have.property('url');
          res.body[0].should.have.property('title');
          res.body[0].should.have.property('browsers');
          res.body[0].should.have.property('published_first_by');
          res.body[0].should.have.property('published_first_time');
          res.body[0].should.have.property('published_last_by');
          res.body[0].should.have.property('published_last_time');
          done();
        });
      });
    });
  });
  /*
   * Test we can add an upvote to a browse.
   */
  describe('addBrowseUpvote', function() {
    describe('testAddBrowseUpvote', function() {
      it('should return successfully with correct parameters', function(done) {
        const params = {
          token,
          url: service,
          upvote: 'interesting',
        };
        request(url)
        .post('/links/upvote')
        .send(params)
        .end((err, res) => {
          if (err) {
            throw err;
          }
          res.status.should.be.equal(200);
          res.headers.should.have.property('access-control-allow-origin');
          res.headers['access-control-allow-origin'].should.be.equal('*');
          res.body.should.be.instanceof(Object);
          res.body.should.have.property('browser');
          res.body.should.have.property('url');
          res.body.should.have.property('upvote');
          done();
        });
      });
    });
  });
  /*
   * Test we can add a browse view.
   */
  describe('addBrowseView', function() {
    describe('testAddBrowseView', function() {
      it('should return successfully with correct parameters', function(done) {
        const params = {
          token,
          url: service,
        };
        request(url)
        .post('/links/view')
        .send(params)
        .end((err, res) => {
          if (err) {
            throw err;
          }
          res.status.should.be.equal(200);
          res.headers.should.have.property('access-control-allow-origin');
          res.headers['access-control-allow-origin'].should.be.equal('*');
          res.body.should.be.instanceof(Object);
          res.body.should.have.property('browser');
          res.body.should.have.property('url');
          done();
        });
      });
    });
  });
  /*
   * Test we can delete a browse.
   */
  describe('deleteBrowse', function() {
    var browses;
    /*
     * Get browse info before running test.
     */
    before(function(done) {
      request(url)
      .get(`/browses/${browser}`)
      .end((err, res) => {
        if (err) {
          throw err;
        }
        res.status.should.be.equal(200);
        res.headers.should.have.property('access-control-allow-origin');
        res.headers['access-control-allow-origin'].should.be.equal('*');
        browses = res.body;
        done();
      });
    });

    describe('testDeleteBrowse', function() {
      it('should return successfully with correct parameters', function(done) {
        const params = {
          token,
          shot: browses[0].shot,
          published: browses[0].published,
        };
        request(url)
        .delete('/browses')
        .send(params)
        .end((err, res) => {
          if (err) {
            throw err;
          }
          res.status.should.be.equal(200);
          res.headers.should.have.property('access-control-allow-origin');
          res.headers['access-control-allow-origin'].should.be.equal('*');
          res.body.should.be.instanceof(Object);
          res.body.should.have.property('browser');
          res.body.should.have.property('shot');
          res.body.should.have.property('published');
          done();
        });
      });
    });
  });
});
