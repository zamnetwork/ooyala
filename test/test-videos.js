'use strict';

require('./mock')

/*!
 * Dependencies
 */

var assert = require('assert')
  , ase = assert.strictEqual
  , varType = require('var-type')
  , utils = require('./utils')

/*!
 * Test
 */

describe('Videos', function() {
  this.timeout(30 * 60 * 1000)

  var Ooyala = require('../index')
    , api = new Ooyala({ key: 'a', secret: 'b' })

  describe('searchVideos', function() {
    it('valid', function(done) {
      utils.shouldWork(
        api
          .searchVideos()
          .then(function(data) {
            ase(varType(data), 'Array')
          })
      , done
      )
    })

    it('invalid', function(done) {
      utils.shouldInvalidate(
        api.searchVideos('hello')
      , done
      )
    })
  })

  describe('getVideoDetails', function() {
    it('valid', function(done) {
      utils.shouldWork(
        api
          .getVideoDetails('abc')
          .then(function(data) {
            ase(varType(data), 'Object')
          })
      , done
      )
    })

    it('invalid', function(done) {
      utils.shouldInvalidate(
        api.getVideoDetails()
      , done
      )
    })
    it('invalid', function(done) {
      utils.shouldInvalidate(
        api.getVideoDetails(22)
      , done
      )
    })
  })

  describe('createVideoAsset', function() {
    it('valid', function(done) {
      utils.shouldWork(
        api
          .createVideoAsset({
            name: 'hello'
          , description: 'there'
          , hosted_at: 'http://github.com/majorleaguesoccer/ooyala'
          , file_name: 'video.mp4'
          , file_size: 22222
          })
          .then(function(data) {
            assert(varType(data, 'Object', 'Array'))
          })
      , done
      )
    })

    it('invalid', function(done) {
      utils.shouldInvalidate(
        api.createVideoAsset('hello')
      , done
      )
    })
    it('invalid', function(done) {
      utils.shouldInvalidate(
        api.createVideoAsset()
      , done
      )
    })
  })

  describe('updateVideoData', function() {
  })

  describe('getVideoMetadata', function() {
  })

  describe('setVideoMetadata', function() {
  })

  describe('replaceVideoMetadata', function() {
  })

  describe('getVideoPlayer', function() {
  })

  describe('getVideoSource', function() {
  })

  describe('getVideoStreams', function() {
  })

  describe('deleteVideo', function() {
  })

  describe('getFullVideoDetails', function() {
  })
})
