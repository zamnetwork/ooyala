'use strict';

require('./mock')

/*!
 * Dependencies
 */

var Ooyala = require('../index')
  , assert = require('assert')

// Basic method tester
exports.shouldWork = function(promise, done) {
  promise
    .then(function() {
      done()
    })
    .catch(done)
}

// Invalid argument tester
exports.shouldInvalidate = function(promise, done) {
  promise
    .then(function() {
      done(new Error('Should not have passed'))
    })
    .catch(Ooyala.Error, function(err) {
      assert(err instanceof Ooyala.ValidationError)
      assert(err instanceof Ooyala.Error)
      assert(err instanceof Error)
      done()
    })
    .catch(done)
}