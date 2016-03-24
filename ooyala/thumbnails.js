'use strict';

/*!
 * Dependencies
 */

var debug = require('debug')('ooyala:thumbnails')

/**
 * Get a list of generated preview images
 *
 * SEE: http://support.ooyala.com/developers/documentation/tasks/api_asset_manage_preview.html
 *
 * @param {String} asset id
 * @return {Promise} promise
 */

exports.getVideoThumbnails = function(id) {
  var rej = this.validate(id, 'String', 'id')
  if (rej) return rej

  debug('[getVideoThumbnails] id=`%s`', id)

  return this
    .get({
      route: `/v2/assets/${id}/generated_preview_images`
    })
    .then(function(resp) {
      debug('[getVideoThumbnails] done: resp=`%j`', resp.body)
      
      return resp.body
    })
}

/**
 * Set video to use the custom uploaded preview image
 *
 * @param {String} asset id
 * @return {Promise} promise
 */

exports.setVideoToUploadedThumbnail = function(id) {
  var rej = this.validate(id, 'String', 'id')
  if (rej) return rej
  
  debug('[setVideoToUploadedThumbnail] id=`%s`', id)

  return this
    .put({
      route: `/v2/assets/${id}/primary_preview_image`
    , options: {
        body: {
          type: 'uploaded_file'
        }
      }
    })
    .then(function(resp) {
      debug('[setVideoToUploadedThumbnail] done: resp=`%j`', resp.body)

      return resp.body
    })
}

/**
 * Set video to use auto generated preview image
 *
 * @param {String} asset id
 * @param {Number} video time (optional)
 * @return {Promise} promise
 */

exports.setVideoToGeneratedThumbnail = function(id, time) {
  var rej = this.validate(id, 'String', 'id')
  if (rej) return rej

  debug('[setVideoToGeneratedThumbnail] id=`%s` time=`%s`', id, time)

  return this
    .put({
      route: `/v2/assets/${id}/primary_preview_image`
    , options: {
        body: {
          type: 'generated'
        , time: time || 0
        }
      }
    })
    .then(function(resp) {
      debug('[setVideoToGeneratedThumbnail] done: id=`%s` resp=`%j`', id, resp.body)
      
      return resp.body
    })
}

/**
 * Upload thumbnail image as the custom image for the video. 
 * This does not automatically set the video to use this image 
 * though, must call the `setVideoToUploadedThumbnail` method
 *
 * @param {String} asset id
 * @param {Buffer} raw image file
 * @return {Promise} promise
 */

exports.uploadVideoThumbnail = function(id, file) {
  var rej = this.validate(id, 'String', 'id')
  if (rej) return rej
  
  debug('[uploadVideoThumbnail] id=`%s`', id)

  return this
    .post({
      route: `/v2/assets/${id}/preview_image_files`
    , options: {
        body: file
      , headers: {
          'Content-Type': 'multipart/mixed'
        }
      }
    })
    .then(function(resp) {
      debug('[uploadVideoThumbnail] done: id=`%s` resp=`%j`', id, resp.body)
      
      return resp.body
    })
}
