'use strict';

/*!
 * Dependencies
 */

var mock = require('mock-require')
  , tick = process.nextTick
  , assert = require('assert')
  , ase = assert.strictEqual


var METHODS = [
  'GET'
, 'POST'
, 'PUT'
, 'PATCH'
, 'DELETE'
]

/**
 * Mock request
 */

function request(options, next) {
  ase(typeof options, 'object', 'missing options')
  
  var url = options.uri || options.url

  ase(typeof options.headers, 'object', 'missing `headers`')
  ase(typeof url, 'string', 'missing `uri|url`')
  assert(~METHODS.indexOf(options.method), 'invalid `method`')
  ase(typeof options.headers['Content-Type'], 'string', 'missing `Content-Type`')

  var parts = url.split('?')
    // , base = parts[0]
    , query = parts[1]
    , route = url.replace('https://api.ooyala.com', '')

  if (url !== 'http://test') {
    ase(typeof query, 'string', 'missing signature') // always need a signature
    
    // Only two base paths used in this module
    if (route.indexOf('/v2/labels') !== 0) {
      ase(route.indexOf('/v2/assets'), 0, 'unknown route')
    }
  }

  var body = {
    embed_code: 'test'
  , id: 'test'
  }
  if (~route.indexOf('/uploading_urls')) {
    body = ['http://test']
  }
  if (~route.indexOf('/labels')) {
    body = [body]
  }

  tick(function() {
    next(null, {
      statusCode: 200
    , body: body
    })
  })
}

request.put = function(opts, next) {
  opts.method = 'PUT'
  opts.headers = {
    'Content-Type': 'foo'
  }
  return request(opts, next)
}

mock('request', request)
