'use strict';

/*!
 * Dependencies
 */

var debug = require('debug')('ooyala:thumbnails')

/**
 * TODO: There is a size limit on what can be sent, no idea what that limit
 * actually is. If found, add it here for validation
 *
 * Upload thumbnail image as the custom image for the video.
 * This does not automatically set the video to use this image
 * though, must call the `setVideoToUploadedThumbnail` method
 *
 * @param {String} asset id
 * @param {Buffer} caption file contents
 * @return {Promise} promise
 */

exports.uploadVideoCCFile = function(id, file) {

  var rej = (
    this.validate(id, 'String', 'id')
    || this.validate(file, 'Uint8Array', 'file')
  )
  if (rej) return rej

  debug('[uploadVideoCCFile] id=`%s`', id)

  return this
    .put({
      route: `/v2/assets/${id}/closed_captions`
    , options: {
        body: file
      }
    })
    .then(function(resp) {
      debug('[uploadVideoCCFile] done: id=`%s` resp=`%j`', id, resp.body)

      return resp.body
    })
}
