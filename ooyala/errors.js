'use strict';

/*!
 * Dependencies
 */

var tryJSON = require('try-json')
  , varType = require('var-type')

/**
 * Ooyala API Error
 *
 * @param {Object} ooyala api resp
 * @param {Object} original api request
 */

exports.Error = 
exports.OoyalaError = class extends Error {
  constructor(message) {
    super('OoyalaError')
    this.name = 'OoyalaError'
    this.message = message
  }
}

/**
 * Ooyala API Error
 *
 * @param {Object} ooyala api resp
 * @param {Object} original api request
 */

exports.RequestError = class extends exports.Error {
  constructor(resp, req) {
    super()
    this.name = 'OoyalaRequestError'
    // this.request = req
    
    // Extract details from the response
    if (resp) {
      this.response = resp.toJSON()
      // this.body = resp.body
      // this.statusCode = resp.statusCode

      var decoded = exports.decodeMessage(resp)
      this.message = decoded.str
      this.messageData = decoded.obj
    }
  }
}

/*!
 * Dynamically generate sub-classes
 */

var SUB_CLASSES = [
  'ProcessingVideoError'  // Action attempted against an already processing video
, 'DuplicateVideoError'   // Video asset is a duplicate
, 'UploadingVideoError'   // Action attempted against an already uploading video
, 'MissingChunksError'    // Video asset upload had missing or bad chunks
, 'TooFastError'          // Action attempted against a video too quicky after asset upload
, 'NotFoundError'         // Asset not found
, 'UnauthorizedError'     // Invalid auth / api key
, 'InvalidSignatureError' // Invalid request signature (internal calculation error?)
, 'BadRequestError'       // Likely missing key parameters
]
SUB_CLASSES.forEach(function(klass) {
  exports[klass] = class extends exports.RequestError {
    constructor(resp, req) {
      super(resp, req)
      this.name = 'Ooyala' + klass
    }
  }
})

/*!
 * Method call validation, in general we want to prevent
 * requests to Ooyala that we know are going to fail.
 */

exports.ValidationError = class extends exports.Error {
  constructor(message) {
    super(message)
    this.name = 'OoyalaValidationError'
  }
}

/**
 * Ooyala response message normalization, sometimes 
 * strings are sent, other times objects
 *
 * @param {Object} api response
 * @return {Object} decoded response message
 */

exports.decodeMessage = function(resp) {
  var body = resp && resp.body // && resp.body.message
  if (body.message) body = body.message

  // Check for JSON response
  if (varType(body, 'Object')) {
    return {
      str: JSON.stringify(body)
    , obj: body
    }
  }
  // Attempt to decode string response (can't trust ooyala responses)
  if (varType(body, 'String')) {
    return {
      str: body
    , obj: tryJSON(body) || null
    }
  }
  return {
    str: 'Unknown Error'
  , obj: null
  }
}

/**
 * Get custom error class based on an Ooyala API response
 *
 * @param {Object} api response
 * @param {Object} api request
 * @return {Error} custom error class
 */

exports.getError = function(resp, req) {
  var decoded = exports.decodeMessage(resp)
    , code = resp.statusCode
    , str = decoded.str
    , obj = decoded.obj
    , err

  // Asset replace call, need to wait for Ooyala to finish processing first
  if (str === "Content cannot be replaced since the asset's status is processing") {
    err = new exports.ProcessingVideoError(resp, req)
  }
  
  // Asset replace call, there is really no way out of this once it happens
  if (str === "Content cannot be replaced since the asset's status is duplicate") {
    err = new exports.DuplicateVideoError(resp, req)
  }
  if (~str.indexOf('error: duplicate')) {
    err = new exports.DuplicateVideoError(resp, req)
  }
  
  // Either something else is still uploading this video,
  // or it failed to upload and cant recover
  if (str === 'Content cannot be replaced since the asset\'s status is uploading') {
    err = new exports.UploadingVideoError(resp, req)
  }
  if (str === "The asset is already being replaced. The replacement status is uploading") {
    err = new exports.UploadingVideoError(resp, req)
  }
  
  // Either the initial call to replace the asset, or the upload itself
  if (~str.indexOf("not enough time since last attempt.")) {
    err = new exports.TooFastError(resp, req)
  }
  
  // Invalid signature, likely internal calculation issue :(
  if (str === 'Invalid signature.') {
    err = new exports.InvalidSignatureError(resp, req)
  }
  
  // Asset upload / replacement specific
  if (obj && (obj.missing_chunks || obj.bad_chunks)) {
    err = new exports.MissingChunksError(resp, req)
  }
  
  // Label lookup specific, doesnt return with a 404 for some reason, but the 
  // body is different from the normal response
  if (obj && obj.missing_labels) {
    err = new exports.NotFoundError(resp, req)
  }
  
  // Video lookup specific, as far as I can tell only one route can 404
  if (code === 404) {
    err = new exports.NotFoundError(resp, req)
  }

  // Can happen on any request?
  if (code === 401) {
    err = new exports.UnauthorizedError(resp, req)
  }

  // Can happen on any request?
  if (code === 400) {
    err = new exports.BadRequestError(resp, req)
  }

  return err || new exports.RequestError(resp, req)
}
