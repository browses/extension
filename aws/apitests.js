/*
 * apitests.js
 *
 * AWS API Gateway Test Suite for Browses.
 */
const should = require('should');
const assert = require('assert');
const request = require('supertest');

const loginnURL = 'https://7ibd5w7y69.execute-api.eu-west-1.amazonaws.com/beta';
const browseURL = 'https://f7mlijh134.execute-api.eu-west-1.amazonaws.com/beta';

describe('browses', function() {
  const user = 'joebloggs';
  const pwd = 'salted_hash';
  const service = 'browses';
  const image = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAoAAA
  AHgAQMAAAAPH06nAAAAA1BMVEX///+nxBvIAAAAPElEQVR42u3BAQ0AAADCIPu
  nfg43YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwKJfgA
  AHF2U8TAAAAAElFTkSuQmCC`;
  const token = 'EAACEdEose0cBAIfpYOIcTdQEneTeW0fHfW67SkX2QVxKqnGkfpM3OUXTBsZA1ZBtSxf4VoiAndLheZCs9ToaOyUp14S3xj4hZBCZC9Qg0COJYeygi9bD1ePWZBKCGsNosfeDHRYwJHUW13GgZA7VM8AbavMXnfbkYwJYIuHLvGK8JHLVGtUmroQ';
  /*
   * Get authentication token before running tests.
   */
  // before(function(done) {
  //   const params = {
  //     username: user,
  //     password: pwd,
  //     service: service,
  //   };
  //   request(loginnURL)
  //   .post('/authenticate')
  //   .send(params)
  //   .end((err, res) => {
  //     if (err) {
  //       throw err;
  //     }
  //     token = res.body.token;
  //     done();
  //   });
  // });
  /*
   * Test we can get the last 24 hours of browses.
   */
  describe('getLatestBrowses', function() {
    describe('testGetLatestBrowses', function() {
      it('should return successfully with correct parameters', function(done) {
        request(browseURL)
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
        request(browseURL)
        .get(`/browses/${user}`)
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
   * Test we can upload a browse.
   */
  describe('uploadBrowse', function() {
    describe('testUploadBrowse', function() {
      it('should return successfully with correct parameters', function(done) {
        const params = {
          url: service,
          token: token,
          shot: image,
          title: 'API Tests',
        };
        request(browseURL)
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
   * Test we can add an upvote to a browse.
   */
  describe('addBrowseUpvote', function() {
    describe('testAddBrowseUpvote', function() {
      it('should return successfully with correct parameters', function(done) {
        const params = {
          url: service,
          token: token,
          upvote: 'interesting',
        };
        request(browseURL)
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
          url: service,
          token: token,
        };
        request(browseURL)
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
      request(browseURL)
      .get(`/browses/${user}`)
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
          shot: browses[0].shot,
          token: token,
          published: browses[0].published,
        };
        request(browseURL)
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
