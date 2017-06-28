'use strict';

/*!
 * Dependencies
 */

var debug = require('debug')('ooyala:closedCaptions')

/**
 * Upload Closed Caption file for video asset
 *
 * @param {String} asset id
 * @param {Buffer} caption file contents
 * @return {Promise} promise
 */

exports.uploadVideoClosedCaptions = function(id, file) {

  var rej = (
    this.validate(id, 'String', 'id')
    || this.validate(file, 'String', 'file')
  )
  if (rej) return rej

  debug('[uploadVideoClosedCaptions] id=`%s`', id)

  return this
    .put({
      route: `/v2/assets/${id}/closed_captions`
    , options: {
        body: file
      , headers: {
          'Content-Type': 'text/html'
        }
      }
    })
    .then(function(resp) {
      debug('[uploadVideoClosedCaptions] done: id=`%s` resp=`%j`', id, resp.body)

      return resp.body
    })
}
