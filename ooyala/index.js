'use strict';

/*!
 * Dependencies
 */

var Promise = require('bluebird')
  , crypto = require('crypto')
  , request = require('request')
  , _ = require('underscore')
  , qs = require('qs')
  , varType = require('var-type')
  , debug = require('debug')('ooyala')

/**
 * Ooyala API Constructor
 *
 * SEE: http://support.ooyala.com/developers/documentation/concepts/api_rest_overview.html
 *
 * @param {Object} config
 *   - `endpoint` - ooyala api url (optional)
 *   - `key` - api key
 *   - `secret` - api secret
 *   - `expires` - api query expiration (optional)
 *   - `chunkSize` - file upload chunk size (optional)
 */

function Ooyala(config) {
  var err = (
    this.validate(config, 'Object', 'config', true)
    || this.validate(config.key, 'String', 'config.key', true)
    || this.validate(config.secret, 'String', 'config.secret', true)
  )
  if (err) throw err

  // Set the config defaults
  this.config = _.extend({
    endpoint: 'https://api.ooyala.com' // only one they have AFAIK
  , expires: 2000                      // time in miliseconds
  , chunkSize: 10 * 1048576            // 1.25 megabytes
  , retryLimit: 3                      // file upload retry limit
  }, config)

  debug('[init] using config=`%j`', this.config)
}

/*!
 * Add all Error classes
 */

_.extend(Ooyala, require('./errors'))

/**
 * Filter out all empty parameters to prevent signature errors
 *
 * @param {Object} params
 * @return {Object} filtered params
 * @private
 */

Ooyala.filterParams = function(params) {

  // Remove any empty array values sent in any param
  for (var key in params) {
    var val = params[key]

    if (varType(val, 'Array')) {
      params[key] = val.slice().filter(function(v) {
        return v !== '' && typeof v !== 'undefined'
      })
    }
  }

  // Reject any key that would have an empty value
  return _.pick(params, function(val, key, obj) {
    var tmp = { [key]: val }
      , str = qs.stringify(tmp, { skipNulls: true })

    return (
      str
      && str !== key
      && str.indexOf('=') !== str.length - 1
    )
  })
}

/**
 * Custom request wrapper to handle all required API parameters
 * as well as signing algorithm
 * Ooyala specific method definitions:
 *
 *   POST   - create a new resource
 *   GET    - view a resource
 *   PUT    - replace an existing resource; create a resource
 *   PATCH  - update or modify an existing resource
 *   DELETE - delete a resource
 *
 * @param {String} http method
 * @param {String} api url fragment
 * @param {Object} query string parameters (optional)
 * @param {Object} request module options (optional)
 * @return {Promise} promise
 */

Ooyala.prototype.request = function(opts) {
  var method = opts.method
    , route = opts.route
    , params = Ooyala.filterParams(opts.params || {})
    , options = opts.options || {}
    , start = Date.now()
    , body = options.body

  var rej = (
    this.validate(method, 'String', 'method')
    || this.validate(route, 'String', 'route')
    || this.validate(params, 'Object', 'params')
    || this.validate(options, 'Object', 'options')
  )
  if (rej) return rej

  method = method.toUpperCase()

  // Add required querystring params
  params = _.defaults(params, {
    api_key: this.config.key
  , expires: Math.floor((Date.now() + this.config.expires) / 1000)
  })

  // Sign the request if there is no signature present
  if (!params.signature) {
    params.signature = this.sign({
      method: method
    , route: route
    , params: params
    , body: body
    })
  }

  // We want to log the body, but not if its a Buffer
  var b = {}
  if (!(body instanceof Buffer) && varType(body, 'Object')) {
    b = body
  }
  debug('[request] start: method=`%s` route=`%s` params=`%j` body=`%j`', method, route, params, b)

  // Tack on the finished querystring params
  var url = this.config.endpoint + route + '?' + qs.stringify(params)

  // Add the api key to the headers, not sure if this is required since we are
  // adding to the querystring params as well, default to JSON content type
  options.headers = _.extend({
    'Content-Type': 'application/json'
  }, options.headers || {})

  options = _.extend(options || {}, {
    uri: url
  , json: options.headers['Content-Type'] === 'application/json'
  , method: method
  })

  return new Promise(function(res, rej) {
    var req = request(options, function(err, resp) {

      // Check for non-200 status code, return custom error if not
      if (!err && resp.statusCode !== 200) {
        // err = new OoyalaError(resp, req)
        err = Ooyala.getError(resp, req)
      }
      if (err) {
        debug('[request] route=`%s` err=`%s`', route, err)
        return rej(err)
      }
      var time = Date.now() - start

      debug('[request] done: method=`%s` route=`%s` statusCode=`%s` time=`%sms`', method, route, resp.statusCode, time)
      res(resp)
    })
  })
}

/*!
 * Create shortcut methods for each HTTP verb
 */

;['GET'
, 'POST'
, 'PUT'
, 'PATCH'
, 'DELETE'
].forEach(function(method) {
  var m = method.toLowerCase()

  Ooyala.prototype[m] = function(opts) {
    return this.request(_.extend({
      method: method
    }, opts))
  }
})

/**
 * Do some Ooyala request signing magic. What is not mentioned in the docs
 * is that binary files require a little bit of trickyness
 *
 * SEE: http://support.ooyala.com/developers/documentation/tasks/api_signing_requests.html
 *
 * @param {Object} signing options
 *   - `method` - http method
 *   - `route` - api url fragment
 *   - `params` - querystring parameters (optional)
 *   - `body` - request body (optional)
 * @return {String} request signature
 * @private
 */

Ooyala.prototype.sign = function(opts) {
  var method = opts.method
    , route = opts.route
    , params = Ooyala.filterParams(opts.params || {})
    , body = opts.body

  var signature = ''
    , bodyType = varType(body)
    , isBuffer = body instanceof Buffer

  signature += this.config.secret   // 1. add api secret
  signature += method.toUpperCase() // 2. add http method
  signature += route                // 3. add api route uri

  // 4. add each request parameter un-encoded,
  // Ooyala requires the signature keys be sorted
  Object.keys(params).sort().forEach(function(prop) {
    signature += prop + '=' + params[prop]
  })

  // Add the body to the main signature if simple type or can
  // be converted to JSON
  if (body && !isBuffer) {
    if (bodyType === 'String') signature += body
    else if (bodyType === 'Object') signature += JSON.stringify(body)
    else if (bodyType === 'Array') signature += JSON.stringify(body)
  }

  // Start signature encryption
  var signed = crypto
    .createHash('sha256')
    .update(signature, 'utf8')

  // If we are dealing with a binary file, we need to do some special things
  if (isBuffer) signed = signed.update(body, 'binary')

  signed = signed.digest('base64')

  // debug('[sign] complete, signature=`%s`', signed)

  // Not sure if we need to encode this, still going to be
  // parsed by the `qs` module, which may do the same thing
  return signed.substr(0, 43)
}

/**
 * Argument validation
 *
 * @param {Any} arg to check
 * @param {String} expected type
 * @param {String} arg name / label
 * @private
 */

Ooyala.prototype.validate = function(x, types, label, raw) {
  if (!varType(types, 'Array')) types = [types]
  if (varType(x, types)) return null

  var err = new Ooyala.ValidationError(`Invalid '${label}'. Expected: '${types.join(' | ')}', Got: '${varType(x)}'`)
  debug('[validate] err=`%s`', err)

  return raw ? err : Promise.reject(err)
}

/*!
 * Compile class from sub-files
 */

_.extend(Ooyala.prototype, require('./labels'))
_.extend(Ooyala.prototype, require('./thumbnails'))
_.extend(Ooyala.prototype, require('./videos'))
_.extend(Ooyala.prototype, require('./uploads'))

/*!
 * Exports
 */

module.exports = Ooyala
