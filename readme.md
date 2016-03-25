Ooyala API
==========

> Ooyala API library for Node.js

This is a fairly complex API and workflow, this module is meant to be verbose to provide specific logic to each API call as needed.

## WORK IN PROGRESS!


Install
-------

With [npm](https://npmjs.org)

```sh
npm install ooyala
```


Usage
-----

Node.js

```js
var Ooyala = require('ooyala')

var api = new Ooyala({
  secret: 'so secret'
, key: 'such key'

  // defaults
, endpoint: 'https://api.ooyala.com'
, chunkSize: 10485760
, expires: 200
})
```


<br/>
API
-------

#### new Ooyala(config)

Create a new Neulion API wrapper

* `config` - Object -  api options
  - `endpoint` - String - Ooyala HTTP endpoint (optional, default `https://api.ooyala.com`)
  - `key` - String - API Key
  - `secret` - String - API Secret
  - `chunkSize` - Number - File upload chunk size (default `10485760`)
  - `expires` - Number - API query expiration in `ms` (optional, default `2000`)
  - `retryLimit` - Number - Upload asset retry limit

```js
var api = new Ooyala({
  // ...
})
```


#### api.request(options)

Ooyala API request wrapper, adds all necessary key and signature data, as well 
as custom error handling for invalid responses.

* `method` - String - HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)
* `route` - String - Ooyala API route
* `params` - Object - querystring parameters
* `options` - Object - any [request](https://github.com/request/request) options

```js
api
  .request({
    method: 'GET'
  , route: '/v2/assets'
  , params: {
      orderby: 'created_at ascending'
    }
  , options: {}
  )
  .then(function(response) {
    // yay we did it!
  })
  .catch(function(err) {
    // oh noooes...
  })
```

Shortcuts:

```js
api.get(options)
api.post(options)
api.put(options)
api.patch(options)
api.delete(options)
```


#### api.sign(options) 

Generate the request signature for API access.

[Ooyala Documentation](http://support.ooyala.com/developers/documentation/tasks/api_signing_requests.html)

* `options` - Object -  signing options
  - `method` - String - http method
  - `route` - String - api route
  - `params` - String - querystring params
  - `body` - String|Buffer - request body

```js
var signature = api.sign({
  method: 'GET'
, route: '/v2/assets'
, params: {}
})
```


<br/>
Labels
------

#### api.syncLabels()
#### api.getLabels()
#### api.getLabelDetails()
#### api.createLabel()
#### api.deleteLabel()


<br/>
Video Labels
------------

#### api.getVideoLabels()
#### api.addVideoLabels()
#### api.removeVideoLabels()


<br/>
Video General
-------------

#### api.deleteVideo()
#### api.getVideoDetails()
#### api.getVideoMetadata()
#### api.setVideoMetadata()
#### api.getVideoPlayer()
#### api.getVideoSource()
#### api.getVideoStreams()


#### api.getFullVideoDetails(id)

Shortcut for getting all related video data from Ooyala, includes the following 
related content: `metadata`, `labels`, `player`, `source_file_info`, 
`primary_preview_image`, and `streams`.

* `id` - String - asset id

```js
api
  .getFullVideoDetails(id)
  .then(function(video) {
    // video.status (`uploading`, `transcoding`, `live`)
  })
  .catch(function(err) {
    // ...
  })
```


#### api.searchVideos(params)

Search the Ooyala API for videos.

[Ooyala Documentation](http://support.ooyala.com/developers/documentation/tasks/api_asset_query.html)

* `params` - Object - api search parameters
  - `order_by` - String
  - `limit` - Number
  - `include` - String
  - `where` - String

```js
var date = new Date(Date.now() - 600000).toISOString()

api
  .searchVideos({
    where: `updated_at>${date}`
  , orderby: 'updated_at ascending'
  , include: 'labels,metadata'
  , limit: 10
  })
  .then(function(videos) {
    // ...
  })
  .catch(function(err) {
    // ...
  })
```



<br/>
Video Asset Creation
--------------------

#### api.createFullVideoAsset(videoData, buffer)

Workflow for creating a full video asset in Ooyala using the following steps:

1. Create the initial video object
2. Get the upload URLs 
3. Upload the file buffer (includes retry logic)
4. Mark video as uploaded

[Ooyala Documentation](http://support.ooyala.com/developers/documentation/tasks/api_asset_upload.html)

```js
fs.readFile('video.mp4', function(err, buffer) {

  var video = {
    name: 'amaze video'
  , description: 'such quality, many likes'
  , file_name: 'the-video.mp4'
  , file_size: buffer.length
  , hosted_at: 'http://some-site.wow'
  , metadata: {
      created_by: 'doge'
    }
  }

  api
    .createFullVideoAsset(video, buffer)
    .then(function(asset) {
      // all done
    })
    // if the video was created successfully, and errored 
    // somewhere in the API pipeline, the `err` will have a 
    // `video` property attached
    .catch(Ooyala.Error, function(err) {
      // ...
    })
    .catch(function(err) {
      // ...
    })
})
```


<br/>
Thumbnails
----------------

#### api.getVideoThumbnails()
#### api.setVideoToUploadedThumbnail()
#### api.setVideoToGeneratedThumbnail()
#### api.uploadVideoThumbnail()


<br/>
Asset Upload
------------

#### api.createFullVideoAsset()
#### api.createVideoAsset()
#### api.getVideoUploadUrl()
#### api.uploadVideoAsset()
#### api.uploadVideoChunk()
#### api.setVideoUploadStatus()
#### api.updateVideoData()


<br/>
Asset Replacement
-----------------

#### api.uploadVideoReplaceAsset()
#### api.setVideoReplaceUploadStatus()
#### api.replaceFullVideoAsset()
#### api.replaceVideoAsset()
#### api.getVideoReplaceUploadUrl()
#### api.replaceVideoMetadata()


<br/>
License
-------

[MIT](license)
