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
  const s3URL = 'https://s3-eu-west-1.amazonaws.com/browses/';
  const appId = '1659456037715738';
  const secret = '7f02b4a9d73f9ca20603ace52f421158';
  const service = 'browses';
  const image = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAoAAA
  AHgAQMAAAAPH06nAAAAA1BMVEX///+nxBvIAAAAPElEQVR42u3BAQ0AAADCIPu
  nfg43YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwKJfgA
  AHF2U8TAAAAAElFTkSuQmCC`;
  var token = '';
  var browser = '';
  var browseID = '';
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
          image,
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
          res.body.should.have.property('name');
          res.body.should.have.property('url');
          res.body.should.have.property('title');
          res.body.should.have.property('image');
          res.body.should.have.property('published');
          browseID = res.body.image.split(s3URL)[1];
          request(s3URL)
          .get(browseID)
          .end((imgErr, imgRes) => {
            imgRes.status.should.be.equal(200);
            done();
          });
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
        .query({ page: 1 })
        .end((err, res) => {
          if (err) {
            throw err;
          }
          res.status.should.be.equal(200);
          res.headers.should.have.property('access-control-allow-origin');
          res.headers['access-control-allow-origin'].should.be.equal('*');
          res.body.should.be.instanceof(Array);
          res.body[0].should.have.property('browser');
          res.body[0].should.have.property('name');
          res.body[0].should.have.property('image');
          res.body[0].should.have.property('url');
          res.body[0].should.have.property('published');
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
   * Test we can get a users browses.
   */
  describe('getUserBrowses', function() {
    describe('testGetUserBrowses', function() {
      it('should return successfully with correct parameters', function(done) {
        request(url)
        .get(`/browses/${browser}`)
        .query({ page: 1 })
        .end((err, res) => {
          if (err) {
            throw err;
          }
          res.status.should.be.equal(200);
          res.headers.should.have.property('access-control-allow-origin');
          res.headers['access-control-allow-origin'].should.be.equal('*');
          res.body.should.be.instanceof(Array);
          res.body[0].should.have.property('browser');
          res.body[0].should.have.property('name');
          res.body[0].should.have.property('image');
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
        .post('/browses/upvote')
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
          res.body.should.have.property('name');
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
        .post('/browses/view')
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
          res.body.should.have.property('name');
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
          browser,
          published: browses[0].published,
          token,
          image: browses[0].image,
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
          res.body.should.have.property('published');
          res.body.should.have.property('name');
          done();
        });
      });
    });
  });
});
