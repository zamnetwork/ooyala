'use strict';

/*!
 * Dependencies
 */

var assert = require('assert')
  , ase = assert.strictEqual
  , fs = require('fs')

/*!
 * Test
 */

describe('mls-ooyala', function() {
  this.timeout(30 * 60 * 1000)

  var Ooyala = require('../index')

  it('init', function() {
    assert.throws(
      function() {
        var api = new Ooyala()
      }
    , function(err) {
        assert(err instanceof Ooyala.Error)
        return true
      }
    , Ooyala.ValidationError
    )
  })

  describe('Signature', function() {
    var api = new Ooyala({
      expires: 200
    , secret: 'so secret'
    , key: 'such key'
    })

    var d = 1442272419310
      , expires = Math.floor((d + 100) / 1000)

    it('sign params / sign string', function() {
      var route = '/v2/labels'
      var paramsA = {
        a: 1
      , b: 2
      , c: 3
      , expires: expires
      }
      var body = 'test'
      var sign = api.sign({
        method: 'GET'
      , route: route
      , params: paramsA 
      , body: body
      })

      var paramsB = {
        c: 3
      , a: 1
      , b: 2
      , expires: expires
      }
      var signB = api.sign({
        method: 'GET'
      , route: route
      , params: paramsB 
      , body: body
      })

      ase(sign, 'TUdCVCShgNJsMR7XAr3Bmax97GWwM5xo1vCQtRiT9jo')
      ase(sign, signB)
    })

    it('sign json', function() {
      var route = '/v2/assets'
      var params = {
        expires: expires
      }
      var body = {
        one: 1
      , two: 2
      , three: 3
      }
      var sign = api.sign({
        method: 'POST'
      , route: route
      , params: params 
      , body: body
      })

      ase(sign, 'MnV6vVrqJJNy6/01l90earAAwTJ+orKAl1a6f1AdP+w')

      var bodyB = [1, 2, 3, 4]
      var signB = api.sign({
        method: 'POST'
      , route: route
      , params: params 
      , body: bodyB
      })

      ase(signB, 'CwyBcFYKR78pVpGT0CTiDRrq4Guq/TJpOw9p0/noq7c')
    })

    it('sign buffer', function() {
      var route = '/v2/whatever'
      var params = {
        expires: expires
      }
      var body = new Buffer('somestring')

      var sign = api.sign({
        method: 'POST'
      , route: route
      , params: params 
      , body: body
      })

      ase(sign, 'i3w57cBHiIWzrh+QYM2wbmREgnobgqHAtsa4V5tyU2k')

      var bodyB = fs.readFileSync(__dirname + '/data/asset.mp4')
      var signB = api.sign({
        method: 'POST'
      , route: route
      , params: params 
      , body: bodyB
      })

      ase(signB, 'Faqfz/mQXeUK5PYyDLYzih/SIkbM4z6RViSm8N+6i8w')
    })
  })

  describe('validate', function() {
    var api = new Ooyala({})

    it('works', function() {
      api.validate(1, 'Number')
      api.validate('a', 'String')
      api.validate({}, 'Object')
      api.validate([1], 'Array')
      api.validate(new Date(), 'Date')
      api.validate(new Buffer(1), 'Uint8Array')
      var foo
      api.validate(foo, 'Undefined')
      api.validate(null, 'Null')
    })

    it('throws', function() {
      assert.throws(
        function() {
          api.validate(1, 'String', 'test')
        }
      , function(err) {
          assert(err instanceof Ooyala.Error)
          return true
        }
      , Ooyala.ValidationError
      )
    })
  })
})
