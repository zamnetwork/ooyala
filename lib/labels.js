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
  this.validate(labels, 'Array', 'labels')
  
  var self = this
    , synced

  debug('[syncLabels] starting: labels=`%j`', labels)

  return this
    .getLabels()
    .then(function(existing) {

      // Find all labels sent that already exist
      synced = existing.filter(function(x) {
        return ~labels.indexOf(x.full_name)
      })

      // Find any supplied labels that do not yet exist in Ooyala
      return _.difference(labels, existing.map(function(x) {
        return x.full_name
      }))
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
  this.validate(name, 'String', name)

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
  this.validate(name, 'String', name)

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
  this.validate(id, 'String', id)

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
  this.validate(id, 'String', 'id')

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
  this.validate(id, 'String', 'id')
  this.validate(labels, 'Array', 'labels')

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
      return resp.body
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
  this.validate(id, 'String', 'id')
  this.validate(labels, 'Array', 'labels')

  debug('[removeVideoLabels] adding: id=`%s` labels=`%s`', id, labels)

  return this
    .delete({
      route: `/v2/assets/${id}/labels`
    , options: { 
        body: labels 
      }
    })
    .then(function(resp) {
      debug('[removeVideoLabels] done: id=`%s` resp=`%j`', id, resp.body)
      return resp.body
    })
}