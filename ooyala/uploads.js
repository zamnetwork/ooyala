'use strict';

/*!
 * Dependencies
 */

var Promise = require('bluebird')
  , request = require('request')
  , debug = require('debug')('ooyala:uploads')
  , Errors = require('./errors')

/**
 * Step 2a. Get the Ooyala upload URL for a given asset
 *
 * @param {String} asset id
 * @return {Promise} promise
 */

exports.getVideoUploadUrl = function(id) {
  var rej = this.validate(id, 'String', 'id')
  if (rej) return rej

  return this
    .get({
      route: `/v2/assets/${id}/uploading_urls`
    })
    .then(function(resp) {
      debug('[getVideoUploadUrl] done: resp=`%j`', resp.body)
      return resp.body
    })
}

/**
 * Step 3ab. Upload the raw video asset to ooyala
 *
 * @param {String} asset id
 * @param {String} upload url
 * @param {Buffer} raw asset data
 * @return {Promise} promise
 */

exports._uploadVideoAsset = function(id, urls, buffer, statusCheck) {
  var rej = (
    this.validate(id, 'String', 'id')
    || this.validate(urls, 'Array', 'urls')
    || this.validate(statusCheck, 'Function', 'statusCheck')
  )
  if (rej) return rej
  
  debug('[uploadVideoAsset] starting initial upload: id=`%s` urls=`%s`', id, urls.join(','))

  var self = this
    , pairs = []
    , size = this.config.chunkSize
    , retryLimit = this.config.retryLimit
    , attempt = 1

  urls.forEach(function(url, i) {
    var start = i * size
      , end = ((i + 1) * size)// - 1
      , chunk = buffer.slice(start, end)

    pairs.push({
      url: url
    , chunk: chunk
    })
  })

  // TODO: This could likely be refactored to be simpler
  function upload(list) {
    return new Promise(function(resolve, reject) {
      return Promise
        .each(list, function(pair) {
          return self.uploadVideoChunk(pair.url, pair.chunk)
        })
        .then(function() {
          return statusCheck(id)
        })
        .then(function(body) {
          return resolve(body)
        })
        .catch(Errors.MissingChunksError, function(err) {
          var msgData = err.messageData

          // Check that we have not exceeded the retry limit
          if (attempt > retryLimit) {
            reject(err)
            return
          }

          attempt += 1

          // No chunk data, nothing to retry here
          if (!msgData) {
            reject(err)
            return
          }

          // // No chunk specific data, retry the whole list again
          // if (!msgData) {
          //   return upload(list)
          // }

          var chunks = msgData.missing_chunks
            .concat(msgData.bad_chunks)
            .map(function(filename) {
              return list.filter(function(pair) {
                return ~pair.url.indexOf(filename)
              })[0]
            })
            .filter(function(x) {
              return !!x
            })

          return upload(chunks)
        })
        .catch(reject)
    })
  }

  // Start the upload
  return upload(pairs)
}

/*!
 * Normal upload
 */

exports.uploadVideoAsset = function(id, urls, buffer) {
  return this._uploadVideoAsset(
    id
  , urls
  , buffer
  , this.setVideoUploadStatus.bind(this)
  )
}

/*!
 * Replacement upload
 */

exports.uploadVideoReplaceAsset = function(id, urls, buffer) {
  return this._uploadVideoAsset(
    id
  , urls
  , buffer
  , this.setVideoReplaceUploadStatus.bind(this)
  )
}

/**
 * Upload a video asset chunk to the Ooyala specified URL.
 * NOTE: The url is already signed
 *
 * @param {String} signed upload url
 * @param {Array|Buffer} chunk data
 * @return {Promise} promise
 */

exports.uploadVideoChunk = function(url, chunk) {
  debug('[uploadVideoChunk] uploading, url=`%s` size=`%s`', url, chunk.length)

  return new Promise(function(res, rej) {
    request.put({
      url: url
    , body: chunk
    }, function(err, resp) {
      if (err) {
        debug('[uploadVideoChunk] error: url=`%s` err=`%s`', url, err)
        return rej(err)
      }
      debug('[uploadVideoChunk] success: url=`%s`', url)
      return res(resp)
    })
  })
}

/**
 * Step 4a. Mark a video as uploaded, this is also the final check to ensure 
 * that the video upload went successfully. Generally this should only be 
 * called within the `uploadVideoAsset` method to contain retry logic.
 *
 * @param {String} asset id
 * @param {String} api url (optional)
 * @return {Promise} promise
 */

exports.setVideoUploadStatus = function(id, url) {
  var rej = this.validate(id, 'String', 'id')
  if (rej) return rej
  
  debug('[setVideoUploadStatus] id=`%s`', id, url)

  return this
    .put({
      route: url || `/v2/assets/${id}/upload_status`
    , options: {
        body: {
          // This is only ever marked as uploaded, not sure why
          status: 'uploaded'
        }
      }
    })
    .then(function(resp) {
      debug('[setVideoUploadStatus] done: resp=`%j`', resp.body)

      return resp.body
    })
}

/**
 * Shortcut to method above, tweak the url
 *
 * @param {String} asset id
 * @return {Promise} promise
 */

exports.setVideoReplaceUploadStatus = function(id) {
  return this.setVideoUploadStatus(
    id
  , `/v2/assets/${id}/replacement/upload_status`
  )
}

/**
 * Pipline for replacing the asset of an existing video
 *
 *   1. send initial data to /v2/assets/id/replacement
 *   2. get upload endpoint with /v2/assets/id/replacement/uploading_urls
 *   3. upload file content to upload endpoint
 *   4. send upload status to /v2/assets/id/replacement/upload_status
 *
 * SEE: http://support.ooyala.com/developers/documentation/tasks/api_asset_replacement.html
 *
 * @param {String} asset id
 * @param {Buffer} raw asset file
 * @return {Promise} promise
 */

exports.replaceFullVideoAsset = function(id, file)  {
  var rej = (
    this.validate(id, 'String', 'id')
    || this.validate(file, 'Uint8Array', 'file')
  )
  if (rej) return rej
  
  var self = this

  debug('[replaceFullVideoAsset] replacing: id=`%s`', id)

  return this
    .replaceVideoAsset(id, file.length)
    .then(function() {
      return self.getVideoReplaceUploadUrl(id)
    })
    .then(function(urls) {
      return self.uploadVideoReplaceAsset(id, urls, file)
    })
    .then(function(results) {
      debug('[replaceFullVideoAsset] done: id=`%s`', id)
      return results
    }) 
}

/**
 * Step 1b. Replace the video of an existing object in Ooyala, looks to set the filename
 * Responds with `embed_code` as the ID
 *
 * @param {String} asset id
 * @param {Object} asset data
 *   - `file_size`
 * @return {Promise} promise
 */

exports.replaceVideoAsset = function(id, fileSize) {
  var rej = (
    this.validate(id, 'String', 'id')
    || this.validate(fileSize, 'Number', 'fileSize')
  )
  if (rej) return rej

  debug('[replaceVideoAsset] id=`%s`', id)

  return this
    .post({
      route: `/v2/assets/${id}/replacement`
    , options: {
        body: {
          file_size: fileSize
        , chunk_size: this.config.chunkSize

        // TODO: If the filename is the same, omit it, if changed, include it
        // really not sure how to do this
        //
        // , file_name: video.file_name
        }
      }
    })
    .then(function(resp) {
      debug('[replaceVideoAsset] done: resp=`%j`', resp.body)

      return resp.body
    })
}

/**
 * Step 2b. Get the Ooyala replacement upload URL for a given asset
 *
 * @param {String} asset id
 * @return {Promise} promise
 */

exports.getVideoReplaceUploadUrl = function(id) {
  var rej = this.validate(id, 'String', 'id')
  if (rej) return rej

  debug('[getVideoReplaceUploadUrl] id=`%s`', id)

  return this
    .get({
      route: `/v2/assets/${id}/replacement/uploading_urls`
    })
    .then(function(resp) {
      debug('[getVideoReplaceUploadUrl] done: id=`%s` resp=`%j`', id, resp.body)
      
      return resp.body
    })
}

/**
 * Upload process (A)
 * Pipeline for the 4 step process of creating a new video asset
 *
 *   1. get upload endpoint with /v2/assets/id/uploading_urls
 *   2. upload file content to upload endpoint
 *   3. send upload status to /v2/assets/id/upload_status
 *
 * TODO: allow `file` to be a Stream or Buffer
 * SEE: http://support.ooyala.com/developers/documentation/tasks/api_asset_upload.html
 *
 * @param {Object} asset data
 * @param {Buffer} asset file contents
 * @return {Promise} promise
 */

exports.uploadFullVideoAsset = function(id, file) {
  var rej = (
    this.validate(id, 'String', 'embed_code')
    || this.validate(file, 'Uint8Array', 'file')
  )
  if (rej) return rej

  var self = this

  debug('[createFullVideoAsset] id=`%s`', id)

  return this
    .getVideoUploadUrl(id)

    // Upload file
    .then(function(urls) {
      return self.uploadVideoAsset(id, urls, file)
    })
    
    // All done
    .then(function(results) {
      debug('[createFullVideoAsset] completed: id=`%s` results=`%j`', id, results)
      
      return results
    })
}
