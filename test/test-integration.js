'use strict';

/*!
 * Dependencies
 */

var Promise = require('bluebird')
  , assert = require('assert')
  , fs = require('fs')
  , path = require('path')

// Storage
var LABEL_NAME = '/HELIOS_TEST'
  , REMOTE_VIDEO
  , ASSET_ID = 'asdf'

/** 
 * Config helpers
 *
 * @param {String} filepath
 * @return {Object|Null} config if found
 */

function getConfig(fpath) {
  var obj = null

  if (fs.existsSync(fpath)) {
    var str = fs.readFileSync(fpath, 'utf8')

    try {
      obj = JSON.parse(str)
    } catch(e) {
      console.error('Invalid JSON: fpath=`%s`', fpath)
    }
  }
  return obj
}

/*!
 * Check for local config file, or ~/.neulionrc
 */

var localPath = path.join(__dirname, '/../config.json')
  , home = process.env.HOME || process.env.USERPROFILE
  , homePath = path.join(home, '/.ooyalarc')

/*!
 * Argv
 */

var argv = require('yargs')
  .option('integration', {
    alias: 'i'
  , description: 'run test against ooyala backlot'
  })
  .argv

// Check if we actually want to run this against Backlot
var MOCK = !argv.integration
if (MOCK) require('./mock')

/*!
 * Test
 */

describe('Integration', function() {
  this.timeout(30 * 60 * 1000)

  var Ooyala = require('../index')
    , config = getConfig(localPath) || getConfig(homePath) || {}
    , api = new Ooyala(config)

  describe('Cleanup', function() {
    it('Delete Videos', function(done) {
      api
        .searchVideos({
          orderby: 'created_at descending'
        , where: "metadata.updated_by='helios_test' OR metadata.created_by='helios_test'"
        })
        .then(function(videos) {
          return Promise.each(videos, function(video) {
            return api.deleteVideo(video.embed_code)
          })
        })
        .then(function(result) {
          if (MOCK) return done()
          assert(result)
          done()
        })
        .catch(done)
    })

    it('Delete Label', function(done) {
      api
        .getLabelDetails(LABEL_NAME)
        .then(function(label) {
          if (MOCK) return
          if (!label) return

          return api.deleteLabel(label.id)
        })
        .then(function(result) {
          if (MOCK) return done()
          assert(result)
          done()
        })
        .catch(Ooyala.Error, function(err) {
          assert(err instanceof Ooyala.Error)
          if (err.statusCode === 400) {
            return done()
          }
          return done(err)
        })
        .catch(done)
    })
  })

  describe('Upload Workflow', function() {
    it('createFullVideoAsset', function(done) {
      var video = {
        name: 'Helios Test'
      , description: 'Please delete me'
      , labels: [ 
          LABEL_NAME
        , '/Channels/Match Highlights'
        , '/Games/2015/837621' 
        ]
      , file_name: 'helios-test-' + Date.now() + '.mp4' // determine if this is unique vs. the actual asset
      , metadata: {
          created_by: 'helios_test'
        }
      }

      fs.readFile(__dirname + '/data/asset.mp4', function(err, buff) {
        if (err) return done(err)

        video.file_size = buff.length

        api
          .createOrUpdateVideoAsset(video)
          .then(function(result) {
            var id = (result || {}).embed_code || 'test'
            
            return api.uploadFullVideoAsset(id, buff)
          })
          .then(function(result) {
            if (MOCK) return done()
            // console.log('createFull: ', result)


            REMOTE_VIDEO = result
            ASSET_ID = result.embed_code
            done()
          })
          .catch(done)
      })
    })

    it('getFullVideoDetails', function(done) {
      api
        .getFullVideoDetails(ASSET_ID)
        .then(function(result) {
          // console.log('getdetails: ', result)
          
          done()
        })
        .catch(done)
    })

    it('uploadVideoThumbnail', function(done) {
      fs.readFile(__dirname + '/data/thumbnail.jpg', function(err, buff) {
        if (err) return done(err)

        api
          .uploadVideoThumbnail(ASSET_ID, buff)
          .then(function(result) {
            if (MOCK) return done()
            assert(result)
            done()
          })
          .catch(done)
      })
    })

    it('setVideoToUploadedThumbnail', function(done) {
      assert(ASSET_ID, 'Missing asset ID')

      api
        .setVideoToUploadedThumbnail(ASSET_ID)
        .then(function(result) {
          if (MOCK) return done()
          assert(result)
          done()
        })
        .catch(done)
    })

    it('getFullVideoDetails', function(done) {
      assert(ASSET_ID, 'Missing asset ID')

      var self = this

      function loop() {
        self.timeout(60 * 1000)

        api
        .getFullVideoDetails(ASSET_ID)
          .then(function(result) {
            if (MOCK) return done()

            if (result.status === 'live') return done()

            return setTimeout(function() {
              loop()
            }, 5000)
          })
          .catch(done)
      }
      loop()
    })
  })

  // We have to wait some undocumented amount of time before replacing
  // an existing video asset, 40 seconds seems to work fine?
  var sleep = 40

  if (!MOCK) {
    describe(`Sleeping for ${sleep}s`, function() {

      it('Shhh...', function(done) {
        assert(ASSET_ID, 'Missing asset ID')

        this.timeout((sleep + 1) * 1000)
        setTimeout(function() {
          done()
        }, sleep * 1000)
      })
    })
  }

  describe('Replacement Workflow', function() {
    it('replaceFullVideoAsset', function(done) {
      assert(ASSET_ID, 'Asset ID input required')

      var video = {
        file_name: 'helios-replace-test-' + Date.now() + '.mp4'
      }

      fs.readFile(__dirname + '/data/asset2.mp4', function(err, buff) {
        if (err) return done(err)

        video.file_size = buff.length

        api
          .replaceFullVideoAsset(ASSET_ID, buff)
          .then(function(result) {
            if (MOCK) return done()

            assert(result)
            done()
          })
          .catch(done)
      })
    })

    it('getFullVideoDetails', function(done) {
      assert(ASSET_ID, 'Missing asset ID')

      var self = this

      function loop() {
        self.timeout(60 * 1000)

        api
        .getFullVideoDetails(ASSET_ID)
          .then(function(result) {
            if (MOCK) return done()
            if (result.status === 'live') return done()

            return setTimeout(function() {
              loop()
            }, 5000)
          })
          .catch(done)
      }
      loop()
    })
  })

  describe('Cleanup', function() {
    var LABEL

    if (MOCK) LABEL = { id: '235jga1' }

    it('getLabelDetails', function(done) {
      api
        .getLabelDetails(LABEL_NAME)
        .then(function(result) {
          if (MOCK) return done()
          
          LABEL = result
          done()
        })
        .catch(function(err) {
          done(err)
        })
    })

    it('removeVideoLabels', function(done) {
      assert(LABEL && LABEL.id, 'Missing label data')

      var labels = [LABEL.id]

      api
        .removeVideoLabels(ASSET_ID, labels)
        .then(function(result) {
          if (MOCK) return done()

          assert(result)
          done()
        })
        .catch(done)
    })


    it('deleteLabel', function(done) {
      assert(LABEL && LABEL.id, 'Missing label data')

      api
        .deleteLabel(LABEL.id)
        .then(function(result) {
          if (MOCK) return done()

          assert(result)
          done()
        })
        .catch(done)
    })

    it('deleteVideo', function(done) {
      assert(!!ASSET_ID, 'Missing asset ID')

      api
        .deleteVideo(ASSET_ID)
        .then(function(result) {
          if (MOCK) return done()

          assert(result)
          done()
        })
        .catch(done)
    })
  })
})
