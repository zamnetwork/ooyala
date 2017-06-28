'use strict';

/*!
 * Dependencies
 */

var debug = require('debug')('ooyala:closedCaptions')
  , StringDecoder = require('string_decoder').StringDecoder
  , varType = require('var-type')

/**
 * Upload Closed Caption file for video asset
 *
 * @param {String} asset id
 * @param {Buffer} caption file contents
 * @return {Promise} promise
 */

exports.uploadVideoClosedCaptions = function(id, file) {
  var contents = file

  if (varType(file, 'Uint8Array')) {
    var decoder = new StringDecoder('utf8')
    contents = decoder.write(contents)
    decoder.end()
  }

  var rej = (
    this.validate(id, 'String', 'id')
    || this.validate(contents, 'String', 'file')
  )
  if (rej) return rej

  debug('[uploadVideoClosedCaptions] id=`%s`', id)

  return this
    .put({
      route: `/v2/assets/${id}/closed_captions`
    , options: {
        body: contents
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
