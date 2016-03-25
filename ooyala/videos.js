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
  var rej = this.validate(params, ['Object', 'Undefined'], 'params')
  if (rej) return rej

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
  var rej = this.validate(id, 'String', 'id')
  if (rej) return rej

  debug('[getVideoDetails] id=`%s`', id)

  return this
    .get({
      route: `/v2/assets/${id}`
    , params: {
        // Reduce number of API calls and get data upfront
        include: [
          'metadata'
        , 'labels'
        , 'player'
        , 'primary_preview_image'
        ].join(',')
      }
    })
    .then(function(resp) {
      debug('[getVideoDetails] done: id=`%s` resp=`%j`', id, resp.body)
      
      return resp.body
    })
}

/**
 * TODO: Consider validating all data properties sent
 *
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
  var rej = this.validate(video, 'Object', 'video')
  if (rej) return rej

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
  var rej = (
    this.validate(id, 'String', 'id')
    || this.validate(video, 'Object', 'video')
  )
  if (rej) return rej
  
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
  var rej = this.validate(id, 'String', 'id')
  if (rej) return rej

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
  var rej = (
    this.validate(id, 'String', 'id')
    || this.validate(meta, 'Object', 'metadata')
  )
  if (rej) return rej

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
  var rej = (
    this.validate(id, 'String', 'id')
    || this.validate(meta, 'Object', 'metadata')
  )
  if (rej) return rej

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
  var rej = this.validate(id, 'String', 'id')
  if (rej) return rej

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
  var rej = this.validate(id, 'String', 'id')
  if (rej) return rej

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
  var rej = this.validate(id, 'String', 'id')
  if (rej) return rej

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
  var rej = this.validate(id, 'String', 'id')
  if (rej) return rej

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
 *   1. get all possible video info with initial details
 *   2. find related video streams
 *   3. find video source information
 *
 * @param {String} asset id
 * @return {Promise} promise
 */

exports.getFullVideoDetails = function(id) {
  var rej = this.validate(id, 'String', 'id')
  if (rej) return rej

  debug('[getFullVideoDetails] fetching: id=`%s`', id)

  var self = this
    , resp

  // Run this in order for easier debugging
  return this
    .getVideoDetails(id)
    .then(function(details) {
      resp = details
      return self.getVideoStreams(id)
    })
    .then(function(streams) {
      resp.streams = streams
      return self.getVideoSource(id)
    })
    .then(function(source) {
      debug('[getFullVideoDetails] done: id=`%s`', id)

      resp.source = source
      return resp
    })
}

/**
 * Shortcut for video create or update, allows an app to be more agnostic
 *
 * @param {Object} video data
 * @return {Promise} ooyala response data
 */

exports.createOrUpdateVideoAsset = function(video) {
  var rej = (
    this.validate(video, 'Object', 'video')
    || this.validate(video.file_size, 'Number', 'video.file_size')
  )
  if (rej) return rej

  var id = video.embed_code

  debug('[createOrUpdateVideoAsset] data=`%j`', video)

  // Determine how to start the workflow, if the `embed_code` is already known, 
  // then we can assume the video was already created in Backlot, if not, then we 
  // want to create the initial asset
  var start = id
    ? this.updateVideoData(id, _.omit(video, 'embed_code')) 
    : this.createVideoAsset(video)

  return start
    .then(function(results) {
      debug('[createOrUpdateVideoAsset] done: results=`%j`', results)
      return results
    })
}

/**
 * Create a fully detailed video asset in Ooyala. If the data sent contains an 
 * `embed_code` property, it will be updated in place instead. Allow for skipping
 * the first step in the case the application has already handled this, and only 
 * wants to sync up the rest of the data.
 *
 *   1. create or update video data in ooyala
 *   2. sync remaining related video content
 *
 * @param {Object} video data
 * @param {Boolean} skip first step
 * @return {Promise} remote video data
 */

exports.syncVideoAsset = function(video) {
  var rej = (
    this.validate(video, 'Object', 'video')
    || this.validate(video.file_size, 'Number', 'video.file_size')
  )
  if (rej) return rej

  var self = this
    , id = video.embed_code
    , remoteVideo

  debug('[syncVideoAsset] data=`%j`', video)

  return this
    .createOrUpdateVideoAsset(video)
    .then(function(obj) {
      remoteVideo = obj
      id || (id = obj.embed_code)

      // Sync remaining content, ensure we have the `embed_code`
      return self.syncVideoContent(_.extend({
        embed_code: id
      }, video))
    })
    
    // Always return the created video object
    .then(function(results) {
      debug('[syncVideoAsset] completed: results=`%j`', results)

      return remoteVideo
    })

    // Add video data to error if available
    .catch(function(err) {
      debug('[syncVideoAsset] failed: err=`%s`', err)

      err.video = remoteVideo
      return Promise.reject(err)
    })
}

/**
 * Sync all related video content
 *
 *   1. add any metadata found
 *   2. sync any labels found with ooyala label storage
 *   3. assign synced label ids to the video asset
 *
 * @param {Object} video data
 * @return {Promise} video data
 */

exports.syncVideoContent = function(video) {
  var rej = (
    this.validate(video, 'Object', 'video')
    || this.validate(video.embed_code, 'String', 'video.embed_code')
  )
  if (rej) return rej
  
  var self = this
    , id = video.embed_code

  debug('[syncVideoContent] syncing video: id=`%s`', id)

  return Promise
    .resolve()

    // Set video metadata if available
    .then(function() {
      if (!video.metadata) {
        return
      }
      return self.setVideoMetadata(video.embed_code, video.metadata)
    })

    // Sync up any video labels in backlot before assigning to video, treat any 
    // non-existing labels as new labels to be created then assigned
    .then(function() {
      if (!video.labels) {
        return []
      }
      return self.syncLabels(video.labels)
    })

    // Assign labels to video if we have any
    .then(function(ooyalaLabels) {
      var labelIds = (ooyalaLabels || []).map(function(x) {
        return x.id
      })
      if (!labelIds.length) {
        return
      }
      return self.addVideoLabels(id, labelIds) 
    })

    .then(function() {
      debug('[syncVideoAsset] complete: id=`%s`', id)
      return video
    })
}