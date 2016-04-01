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
    , synced
    , videoLabels
    , saved

  debug('[syncVideoLabels] syncing: id=`%s` labels=`%s`', id, labels)

  return this

    // Ensure labels exist in backlot, get full label details object
    .syncLabels(labels)

    // Find all labels assigned to the video
    .then(function(resp) {
      synced = resp

      return self.getVideoLabels(id)
    })

    // Attach any labels sent not currently on the video
    .then(function(resp) {
      videoLabels = resp

      // Extract names for easier comparison
      var names = videoLabels.map(x => x.full_name)

      // Find any synced label not contained in the video label list
      var toSave = synced
        .filter(x => !~names.indexOf(x.full_name))
        .map(x => x.id)

      return self.addVideoLabels(id, toSave)
    })
    .then(function(resp) {
      saved = resp

      // Extract names for easier comparison
      var names = synced.map(x => x.full_name)

      // Find any video labels not contained in the synced label list
      var toRemove = videoLabels
        .filter(x => !~names.indexOf(x.full_name))
        .map(x => x.id)

      return self.removeVideoLabels(id, toRemove)
    })
    .then(function(removed) {
      debug('syncVideoLabels] done: id=`%s`', id)

      return synced
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
      debug('[getLabels] done: resp=`%s`', resp.body)

      return resp.body && resp.body.items || []
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
 * @return {Promise} promise
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
      route: `/v2/assets/${id}/labels`
    , options: { 
        body: labels 
      }
    })
    .then(function(resp) {
      debug('[addVideoLabels] done: id=`%s` resp=`%j`', id, resp.body)
      return resp.body && resp.body.items || []
    })
}

/**
 * Remove labels from a video 
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

  debug('[removeVideoLabels] adding: id=`%s` labels=`%s`', id, labels)

  return this
    .delete({
      route: `/v2/assets/${id}/labels`
    , options: { 
        body: labels 
      }
    })
    .then(function(resp) {
      debug('[removeVideoLabels] done: id=`%s` statusCode=`%j`', id, resp.statusCode)
      return true
    })
}