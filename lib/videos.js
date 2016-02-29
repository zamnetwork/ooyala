'use strict';

/*!
 * Dependencies
 */

var Promise = require('bluebird')
  , _ = require('underscore')
  , latinize = require('latinize')
  , debug = require('debug')('ooyala:videos')

/**
 * Search the API for videos
 *
 * SEE: http://support.ooyala.com/developers/documentation/tasks/api_asset_query.html
 *
 * @param {Object} search params
 *   - `includes` (?)
 *   - `order_by` (created_at ascending)
 *   - `limit` (100)
 *   - `include` (metadata,labels)
 *   - `where` (updated_at>'2011-06-04T01:22:50Z')
 * @return {Promise} promise
 */

exports.searchVideos = function(params) {
  debug('[searchVideos] searching: params=`%j`', params)

  return this
    .get({
      route: '/v2/assets'
    , params: _.extend({
        // Process the earlier videos first, we want FIFO
        orderby: 'created_at ascending'

        // Reduce number of API calls and get data upfront
      , include: [
          'metadata'
        , 'labels'
        , 'player'
        , 'primary_preview_image'

        // Doesnt look like we can get this info
        //
        // , 'source_file_info'
        // , 'streams'
        ].join(',')
      }, params || {})
    })
    .then(function(resp) {
      var items = resp.body && resp.body.items || []

      debug('[searchVideos] found=`%s`', items.length)
      return items
    })
}

/**
 * Get video details
 *
 * @param {String} asset id
 * @return {Promise} promise
 */

exports.getVideoDetails = function(id) {
  this.validate(id, 'String', 'id')

  debug('[getVideoDetails] id=`%s`', id)

  return this
    .get({
      route: `/v2/assets/${id}`
    , params: {
        include: [
          'metadata'
        , 'labels'
        , 'player'
        , 'primary_preview_image'
        // , 'source_file_info'
        // , 'streams'
        ].join(',')
      }
    })
    .then(function(resp) {
      debug('[getVideoDetails] done: id=`%s` resp=`%j`', id, resp.body)
      
      return resp.body
    })
}

/**
 * Step 1a. Create a new video object in Ooyala, looks to set the filename
 * and file size only, likely to tell the API what to look for in 
 * the subsequent asset upload. Responds with `embed_code` as the ID
 *
 * SEE: http://support.ooyala.com/developers/documentation/tasks/api_asset_create.html
 *
 * @param {Object} asset data
 *   - `name`
 *   - `description`
 *   - `file_name`
 *   - `file_size`
 * @return {Promise} promise
 */

exports.createVideoAsset = function(video) {
  this.validate(video, 'Object', 'video')

  debug('[createVideoAsset] adding video to ooyala, data=`%j`', video)

  return this
    .post({
      route: '/v2/assets'
    , options: {
        // SEE: http://support.ooyala.com/developers/documentation/api/asset_properties.html#asset_properties
        body: _.extend({}, video, {
          asset_type: 'video'
        , name: latinize(video.name || '')
        , description: latinize(video.description || '')
        , file_name: video.file_name
        , file_size: video.file_size
        , chunk_size: this.config.chunkSize
        , hosted_at: video.hosted_at ? encodeURI(decodeURI(video.hosted_at)) : null
        })
      }
    })
    .then(function(resp) {
      debug('[createVideoAsset] done: resp=`%j`', resp.body)
      return resp.body
    })
}

/**
 * Update the video data in Ooyala
 *
 * @param {String} asset id
 * @param {Object} asset data
 *   - `name`
 *   - `description`
 *   - `hosted_at` (?)
 * @return {Promise} promise
 */

exports.updateVideoData = function(id, video) {
  this.validate(id, 'String', 'id')
  this.validate(video, 'Object', 'video')
  
  debug('[updateVideoData] id=`%s` data=`%j`', id, video)

  return this
    .patch({
      route: `/v2/assets/${id}`
    , options: {
        body: _.extend({}, video, {
          name: latinize(video.name || '')
        , description: latinize(video.description || '')
        , hosted_at: video.hosted_at ? encodeURI(decodeURI(video.hosted_at)) : null
        })
      }
    })
    .then(function(resp) {
      debug('[updateVideoData] done: resp=`%j`', resp.body)
    
      return resp.body
    })
}

/**
 * Get video metadata (not sure whats different about this from normal details)
 *
 * @param {String} asset id
 * @return {Promise} promise
 */

exports.getVideoMetadata = function(id) {
  this.validate(id, 'String', 'id')

  debug('[getVideoMetadata] id=`%s`', id)

  return this
    .get({
      route: `/v2/assets/${id}/metadata`
    })
    .then(function(resp) {
      debug('[getVideoMetadata] done: id=`%s` resp=`%j`', id, resp.body)
      
      return resp.body
    })
}

/**
 * Set video metadata
 *
 * @param {String} asset id
 * @return {Promise} promise
 */

exports.setVideoMetadata = function(id, meta) {
  this.validate(id, 'String', 'id')
  this.validate(meta, 'Object', 'metadata')

  debug('[setVideoMetadata] id=`%s` meta=`%j`', id, meta)

  return this
    .patch({
      route: `/v2/assets/${id}/metadata`
    , options: { 
        body: meta 
      }
    })
    .then(function(resp) {
      debug('[setVideoMetadata] done: id=`%s` resp=`%j`', id, resp.body)
      
      return resp.body
    })
}

/**
 * Replace video metadata
 *
 * @param {String} asset id
 * @param {Object} new metadata
 * @return {Promise} promise
 */

exports.replaceVideoMetadata = function(id, meta) {
  this.validate(id, 'String', 'id')
  this.validate(meta, 'Object', 'metadata')

  debug('[replaceVideoMetadata] id=`%s` meta=`%j`', id, meta)

  return this
    .put({
      route: `/v2/assets/${id}/metadata`
    , options: { 
        body: meta 
      }
    })
    .then(function(resp) {
      debug('[replaceVideoMetadata] done: id=`%s` resp=`%j`', id, resp.body)
      
      return resp.body
    })
}

/**
 * Get video player
 *
 * @param {String} asset id
 * @return {Promise} promise
 */

exports.getVideoPlayer = function(id) {
  this.validate(id, 'String', 'id')

  debug('[getVideoPlayer] id=`%s`', id)

  return this
    .get({
      route: `/v2/assets/${id}/player`
    })
    .then(function(resp) {
      debug('[getVideoPlayer] done: resp=`%j`', resp.body)
      
      return resp.body
    })
}

/**
 * Get video asset source
 *
 * @param {String} asset id
 * @return {Promise} promise
 */

exports.getVideoSource = function(id) {
  this.validate(id, 'String', 'id')

  debug('[getVideoSource] id=`%s`', id)

  return this
    .get({
      route: `/v2/assets/${id}/source_file_info`
    })
    .then(function(resp) {
      debug('[getVideoSource] done: id=`%s` resp=`%j`', id, resp.body)
    
      return resp.body
    })
}

/**
 * Get video stream
 *
 * @param {String} asset id
 * @return {Promise} promise
 */

exports.getVideoStreams = function(id) {
  this.validate(id, 'String', 'id')

  debug('[getVideoStreams] id=`%s`', id)

  return this
    .get({
      route: `/v2/assets/${id}/streams`
    })
    .then(function(resp) {
      debug('[getVideoStreams] done: id=`%s` resp=`%j`', id, resp.body)
      
      return resp.body
    })
}

/**
 * Delete a video in Ooyala
 *
 * @param {Object} asset data
 * @return {Promise} promise
 */

exports.deleteVideo = function(id) {
  this.validate(id, 'String', 'id')

  debug('[deleteVideo] id=`%s`', id)

  return this
    .delete({
      route: `/v2/assets/${id}`
    })
    .then(function(resp) {
      debug('[deleteVideo] found=`%s`', resp.body)

      return resp.body
    })
}

/**
 * Shortcut to get all information about a video, the default details
 * call will include all related data aside from the streams and source.
 *
 * @param {String} asset id
 * @return {Promise} promise
 */

exports.getFullVideoDetails = function(id) {
  this.validate(id, 'String', 'id')

  debug('[getFullVideoDetails] id=`%s`', id)

  return Promise
    .all([
      this.getVideoDetails(id)
    , this.getVideoStreams(id)
    , this.getVideoSource(id)
    ])
    .spread(function(details, streams, source) {
      var resp = details || {}
      resp.streams = streams
      resp.source = source
      return resp
    })
}