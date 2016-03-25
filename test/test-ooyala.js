'use strict';

/*!
 * Dependencies
 */

var assert = require('assert')
  , ase = assert.strictEqual
  , fs = require('fs')
  , Promise = require('bluebird')

/*!
 * Test
 */

describe('Ooyala', function() {
  this.timeout(30 * 60 * 1000)

  var Ooyala = require('../index')

  describe('init', function() {
    it('works', function() {
      new Ooyala({ key: 'a', secret: 'b' })
    })

    it('throws', function() {
      assert.throws(
        function() {
          new Ooyala()
        }
      , function(err) {
          assert(err instanceof Ooyala.Error)
          return true
        }
      , Ooyala.ValidationError
      )
    })
  })

  describe('filterParams', function() {

    it('works', function() {
      var obj = Ooyala.filterParams({
        emptyStr: ''
      , emptyArr: []
      , emptyArr2: ['', undefined]
      , okStr: 0
      , okArr: [false]
      , idk: undefined
      , ok: 1
      })

      assert.deepEqual(obj, {
        okStr: 0
      , okArr: [false]
      , ok: 1
      })
    })
  })

  describe('signature', function() {
    var api = new Ooyala({
      expires: 200
    , secret: 'so secret'
    , key: 'such key'
    })

    var d = 1442272419310
      , expires = Math.floor((d + 100) / 1000)

    it('params / string', function() {
      var sign = api.sign({
        method: 'GET'
      , route: '/v2/labels'
      , params: {
          a: 1
        , b: 2
        , c: 3
        , expires: expires
        } 
      , body: 'test'
      })

      // Ensure the ordering of params has no effect
      var signB = api.sign({
        method: 'GET'
      , route: '/v2/labels'
      , params: {
          c: 3
        , a: 1
        , b: 2
        , expires: expires
        } 
      , body: 'test'
      })

      ase(sign, 'TUdCVCShgNJsMR7XAr3Bmax97GWwM5xo1vCQtRiT9jo')
      ase(sign, signB)
    })

    it('empty array', function() {
      var sign = api.sign({
        method: 'GET'
      , route: '/v2/labels'
      , params: {
          empty: []
        , stillEmpty: ['']
        , kindaOk: ['', undefined, 0]
        , ok: [false]
        , another: []
        , expires: expires
        } 
      , body: 'test'
      })
      ase(sign, '7cd/uA83z6cWPQQWQcZBSI9BpkSTMRAOqiot/DSkYjo')
    })

    it('empty string', function() {
      var sign = api.sign({
        method: 'GET'
      , route: '/v2/labels'
      , params: {
          empty: ''
        , ok: '0'
        , stillOk: 0
        , another: ''
        , expires: expires
        } 
      , body: 'test'
      })
      ase(sign, 'CTDnvXVY+Jha1BdrV5ojbwwEieFVSj15i9nPHeiiSck')
    })

    it('json', function() {
      var sign = api.sign({
        method: 'POST'
      , route: '/v2/assets'
      , params: {
          expires: expires
        } 
      , body: {
          one: 1
        , two: 2
        , three: 3
        }
      })
      ase(sign, 'MnV6vVrqJJNy6/01l90earAAwTJ+orKAl1a6f1AdP+w')

      var signB = api.sign({
        method: 'POST'
      , route: '/v2/assets'
      , params: {
          expires: expires
        } 
      , body: [1, 2, 3, 4]
      })
      ase(signB, 'CwyBcFYKR78pVpGT0CTiDRrq4Guq/TJpOw9p0/noq7c')
    })

    it('buffer', function() {
      var sign = api.sign({
        method: 'POST'
      , route: '/v2/whatever'
      , params: {
          expires: expires
        } 
      , body: new Buffer('somestring')
      })

      ase(sign, 'i3w57cBHiIWzrh+QYM2wbmREgnobgqHAtsa4V5tyU2k')

      var signB = api.sign({
        method: 'POST'
      , route: '/v2/whatever'
      , params: {
          expires: expires
        } 
      , body: fs.readFileSync(__dirname + '/data/asset.mp4')
      })

      ase(signB, 'Faqfz/mQXeUK5PYyDLYzih/SIkbM4z6RViSm8N+6i8w')
    })
  })

  describe('validate', function() {
    var api = new Ooyala({ key: 'a', secret: 'b' })

    it('works', function() {
      assert(!api.validate(1, 'Number'))
      assert(!api.validate('a', 'String'))
      assert(!api.validate({}, 'Object'))
      assert(!api.validate([1], 'Array'))
      assert(!api.validate(new Date(), 'Date'))
      assert(!api.validate(new Buffer(1), 'Uint8Array'))
      var foo
      assert(!api.validate(foo, 'Undefined'))
      assert(!api.validate(null, 'Null'))
    })

    it('rejects', function(done) {
      var rej = api.validate(1, 'String', 'test')

      assert(rej instanceof Promise)
      rej
        .catch(Ooyala.Error, function(err) {
          assert(err instanceof Ooyala.ValidationError)
          done()
        })
        .catch(done)
    })

    it('errors', function() {
      var err = api.validate(1, 'String', 'test', true)
      
      assert(err instanceof Ooyala.ValidationError)
    })
  })
})
