'use strict';

/*!
 * Dependencies
 */

var Promise = require('bluebird')
  , _ = require('underscore')
  , debug = require('debug')('ooyala:labels')

/**
 * Add all labels provided that are not currently stored in Ooyala
 *
 * @param {Array} labels to sync up
 * @return {Promise} promise
 */

exports.syncLabels = function(labels) {
  var rej = this.validate(labels, 'Array', 'labels')
  if (rej) return rej
  
  var self = this
    , synced

  debug('[syncLabels] starting: labels=`%j`', labels)

  return this
    .getLabels()
    .then(function(existing) {
      var names = existing.map(function(x) {
        return x.full_name
      })

      // Find all labels sent that already exist
      synced = existing.filter(function(x) {
        return ~labels.indexOf(x.full_name)
      })

      // Find any supplied labels that do not yet exist in Ooyala
      return _.difference(labels, names)
    })
    .then(function(missing) {
      if (!missing.length) return []

      return Promise.map(missing, self.createLabel.bind(self))
    })
    .then(function(created) {
      debug('[syncLabels] finished: created=`%j`', created.length)

      return _.uniq(synced.concat(created))
    })
}

/**
 * Sync any given labels with Backlot to ensure existence, then, sync the video 
 * labels with what is given, adding new and removing old. If no labels are sent
 * then all will be cleared from the video.
 *
 * @param {String} ooyala id
 * @param {Array} label data (empty array ok)
 * @return {Promise} label sync results
 */

exports.syncVideoLabels = function(id, labels) {
  var rej = (
    this.validate(id, 'String', 'id')
    || this.validate(labels, 'Array', 'labels')
  )
  if (rej) return rej

  var self = this

  debug('[syncVideoLabels] syncing: id=`%s` labels=`%s`', id, labels)

  return this

    // Ensure labels exist in backlot, get full label details object
    .syncLabels(labels)

    .then(function(synced) {
      var labelIds = synced.map(x => x.id)

      return self.replaceVideoLabels(id, labelIds)
    })
    .then(function(resp) {
      debug('syncVideoLabels] done: id=`%s` resp=`%j`', id, resp)

      return resp
    })
}

/**
 * Get all labels in Ooyala
 *
 * SEE: http://support.ooyala.com/developers/documentation/tasks/api_asset_associate_with_labels.html

 * @return {Promise} promise
 */

exports.getLabels = function() {
  debug('[getLabels] fetching')

  return this
    .get({
      route: '/v2/labels'
    })
    .then(function(resp) {
      var items = resp.body && resp.body.items || []

      debug('[getLabels] done: found=`%s`', items.length)
      return items
    })
}

/**
 * Get full details for a given label name
 *
 * @param {String} label name
 * @return {Promise} promise
 */

exports.getLabelDetails = function(name) {
  var rej = this.validate(name, 'String', name)
  if (rej) return rej

  debug('[getLabelDetails] name=`%s`', name)

  return this
    .get({
      route: '/v2/labels/by_full_path/' + encodeURIComponent(name)
    })
    .then(function(resp) {
      var items = resp.body && resp.body.items || []
      debug('[getLabelDetails] done: found=`%s`', items.length)

      return items[0]
    })
}

/**
 * Create a new label in Ooyala with the given name, all 
 * other data auto created by Ooyala 
 *
 * @param {String} label name
 * @return {Promise} promise
 */

exports.createLabel = function(name) {
  var rej = this.validate(name, 'String', name)
  if (rej) return rej

  debug('[createLabel] name=`%s`', name)

  return this
    .post({
      route: '/v2/labels/by_full_path/' + encodeURIComponent(name)
    })
    .then(function(resp) {
      debug('[createLabel] done: resp=`%j`', resp.body)
      return resp.body[0]
    })
}

/**
 * Delete a new label in Ooyala with the given name
 *
 * @param {String} label name
 * @return {Promise} promise
 */

exports.deleteLabel = function(id) {
  var rej = this.validate(id, 'String', id)
  if (rej) return rej

  debug('[deleteLabel] id=`%s`', id)

  return this
    .delete({
      route: `/v2/labels/${id}`
    })
    .then(function(resp) {
      debug('[deleteLabel] done: id=`%s` resp=`%j`', id, resp.body)
      return resp.body
    })
}

/**
 * Get a list of all labels associated with a video
 *
 * @param {String} asset id
 * @return {Promise} promise
 */

exports.getVideoLabels = function(id) {
  var rej = this.validate(id, 'String', 'id')
  if (rej) return rej

  debug('[getVideoLabels] id=`%s`', id)

  return this
    .get({
      route: `/v2/assets/${id}/labels`
    })
    .then(function(resp) {
      debug('[getVideoLabels] done: id=`%s` resp=`%j`', id, resp.body)
      return resp.body && resp.body.items || []
    })
}

/**
 * Add labels to a video
 *
 * @param {String} asset id
 * @param {Array} label ids
 * @return {Promise} ooyala response
 */

exports.addVideoLabels = function(id, labels) {
  var rej = (
    this.validate(id, 'String', 'id')
    || this.validate(labels, 'Array', 'labels')
  )
  if (rej) return rej

  debug('[addVideoLabels] adding: id=`%s` labels=`%s`', id, labels)

  return this
    .post({
      route: `/v2/assets/${id}/labels` // `/${labels.join(',')`
    , options: {

        // TODO: Figure out if this is supposed to be in the body or URL
        body: labels.slice()
      }
    })
    .then(function(resp) {
      debug('[addVideoLabels] done: id=`%s` resp=`%j`', id, resp.body)
      return resp.body && resp.body.items || []
    })
}

/**
 *
 * @param {String} asset id
 * @param {Array} label ids
 * @return {Promise} promise
 */

exports.replaceVideoLabels = function(id, labels) {
  var rej = (
    this.validate(id, 'String', 'id')
    || this.validate(labels, 'Array', 'labels')
  )
  if (rej) return rej
  
  debug('[replaceVideoLabels] replacing: id=`%s` label=`%s`', id, labels)

  return this
    .put({
      // route: `/v2/assets/${id}/labels/${JSON.stringify(labels)}`
      route: `/v2/assets/${id}/labels`
    , options: {
        body: labels.slice()
      }
    })
    .then(function(resp) {
      debug('[replaceVideoLabels] done: id=`%s` statusCode=`%j`', id, resp.statusCode)

      return resp.body && resp.body.items || []
    })
}

/**
 *
 * @param {String} asset id
 * @param {Array} label ids
 * @return {Promise} promise
 */

exports.removeAllVideoLabels = function(id) {
  var rej = this.validate(id, 'String', 'id')
  if (rej) return rej
  
  debug('[removeAllVideoLabels] removing: id=`%s`', id)

  return this
    .delete({
      route: `/v2/assets/${id}/labels`
    })
    .then(function(resp) {
      debug('[removeAllVideoLabels] done: id=`%s` statusCode=`%j`', id, resp.statusCode)
      return null
    })
}

/**
 *
 * @param {String} asset id
 * @param {Array} label ids
 * @return {Promise} promise
 */

exports.removeVideoLabels = function(id, labels) {
  var rej = (
    this.validate(id, 'String', 'id')
    || this.validate(labels, 'Array', 'labels')
  )
  if (rej) return rej

    var self = this

  debug('[removeVideoLabels] removing: id=`%s` label=`%s`', id, labels)

  return Promise
    .map(labels, function(label) {
      return self.removeVideoLabel(id, label)
    })
    .then(function(resp) {
      debug('[removeVideoLabel] done: id=`%s` statusCode=`%j`', id, resp.statusCode)
      return null
    })
}

/**
 * Remove a single label from a video 
 *
 * @param {String} asset id
 * @param {Array} label id
 * @return {Promise} ooyala response
 */

exports.removeVideoLabel = function(id, labelId) {
  var rej = (
    this.validate(id, 'String', 'id')
    || this.validate(labelId, 'String', 'labelId')
  )
  if (rej) return rej
  
  debug('[removeVideoLabel] removing: id=`%s` label=`%s`', id, labelId)

  return this
    .delete({
      route: `/v2/assets/${id}/labels/${labelId}`
    })
    .then(function(resp) {
      debug('[removeVideoLabel] done: id=`%s` label=`%s` statusCode=`%j`', id, labelId, resp.statusCode)
      return null
    })
}
