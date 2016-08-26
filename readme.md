Ooyala API
==========

> Comprehensive Ooyala Backlot API wrapper for Node.js

Ooyala SDK for handling all `video`, `label`, and `thumbnail` related data. Easy-to-use
methods for video asset uploading and retry logic, as well as improved error handling /
interpreting from Ooyala API responses.

This library was built with love and hate through trial and error in working with
the Backlot API for years in production. It also aims to vastly reduce the logic
in [complex upload workflows](http://support.ooyala.com/developers/documentation/tasks/api_asset_upload.html)
as well as try to make sense and normalize the multitude of error types and responses
from Ooyala.

All methods in this SDK are promise based, and strictly validated. If any method
is called with missing or invalid parameter types, it will be rejected with the
`ValidationError` described below. The aim is to prevent any type of bad or
unrecoverable state within Backlot, as it often requires human intervention to continue.

All responses and data types are generally a pass-through of what comes from the Ooyala
API, no object properties are modified other than sanitization on video `title` and
`description`. Typically, the normalization is to keep consistent data responses.

From this `{ items: [{}, {}, {}] }` to this `[{}, {}, {}]`

[Ooyala Documentation](http://support.ooyala.com/developers/documentation/concepts/book_api.html)


Install
-------

With [npm](https://npmjs.org)

```sh
npm install ooyala
```


Usage
-----

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

Uploading
---------

```js
var fs = require('fs')


fs.readFile('/tmp/asset.mp4', function(err, buffer) {

  // Setup our new video asset. This example can be used as an `update/replacement`
  // for existing videos if an `embed_code` property is added.
  var myVideo = {
    name: 'awesome thing i did'
  , description: 'mom get the camera!!'
  , file_name: 'my_asset.mp4' // Ooyala tracks these names as unique keys
  , file_size: buffer.length  // Ooyala needs this to generate upload URLs
  , metadata: {
      made_by: 'me!'
    , internal_id: 124109
    }
  , labels: [
      'Summer 2016'
    , 'Foods/Popcorn'
    ]
  }

  api
    // Create or update the asset, set the metadata, then sync the given labels.
    .syncVideoAsset(myVideo)

    // Here you can check any kind of video status, or save the remote data before
    // continuing. It is recommended to capture state here in case of upload failure.
    .then(function(remoteVideo) {

      // Check if something else is uploading it, we could also check for `duplicate`
      // or `error` status, as Ooyala will respond with an error if attempted.
      if (remoteVideo.status === 'uploading') {
        return Promise.reject(new Error('ooyala will error if we try'))
      }

      // The `embed_code` property is the primary video ID
      var videoId = remoteVideo.embed_code

      // Allow the SDK to handle the multi-step upload workflow, with retry logic
      return api.uploadFullVideoAsset(videoId, buffer)
    })

    .then(function() {
      // All done!
    })

    // Error handling
    .catch(Ooyala.ProcessingVideoError, function(err) {
      // The video is still transcoding, check for updates from Ooyala before trying again
    })
    .catch(Ooyala.DuplicateVideoError, function(err) {
      // The video `file_name` used is in use by another video asset
    })
    .catch(Ooyala.Error, function(err) {
      // Something else went wrong within the Ooyala API or this SDK
    })
    .catch(function(err) {
      // Default error catcher, should always be used with Promises
    })
})
```


Fetching Updates
----------------

Here is an example of how to check for video updates in Ooyala Backlot. The following
code will check for all video updates since yesterday, including human changes through
the UI, as well as video status changes, (`uploading`, `transcoding`, `live`, ...)
then use the last known ooyala update time as the next starting point for the search.


```js
// Starting search date
var start = new Date(Date.now() - (24 * 60 * 60 * 1000))

// Sleep / delay time before next fetch iteration
var sleep = 5 * 60 * 1000

// API polling method
function fetch(search, sleep) {
  api
    .searchVideos({
      where: `update_at>'${search.toISOString()}'`
    })
    .then(function(videos) {

      // Find all `update_at` timestrings from ooyala
      var updates = videos.map(function(x) {
        return +new Date(x.updated_at)
      })

      // Update the search date to the last known update
      search = Math.max.apply(null, updates.concat(search))


      /*!
       * Do something with the results, such as saving to an internal database,
       * sending an outbound HTTP request, or adding to a message queue for processing
       */


      // Sleep a while then do it again
      setTimeout(search, sleep)
    })
    .catch(function(err) {
      console.error('Oh bother', err)
      process.exit(1)
    })
}

// Start the endless polling loop
fetch(start, delay)
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
var api = new Ooyala(config)
```


#### api.request(options)

Ooyala API request wrapper, adds all necessary key and signature data, as well
as custom error handling for invalid responses.

* `options` - Object
  - `method` - String - HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)
  - `route` - String - Ooyala API route
  - `params` - Object - querystring parameters
  - `options` - Object - any [request](https://github.com/request/request) options

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

Request Shortcuts:

```js
api.get(options)
api.post(options)
api.put(options)
api.patch(options)
api.delete(options)
```


#### api.sign(options)

Generate the request signature for API access. Generally for internal use.

[Ooyala Documentation](http://support.ooyala.com/developers/documentation/tasks/api_signing_requests.html)

* `options` - Object
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

The following methods correspond to the top level label assets stored in Backlot.


#### api.getLabels()

Fetch *all* video labels from ooyala. This can become slow if there are many labels
to retrieve.

```js
api.getLabels().then(function(labels) {})
```

#### api.createLabel(name)

Create a new label with the given name.

* `name` - String - label name

```js
api.createLabel('/Awesome/Sauce').then(function(labelDetails) {})
```


#### api.getLabelDetails(name)

Fetch the full label details from ooyala

* `name` - String - label name

```js
api.getLabelDetails('/Awesome/Sauce').then(function(labelDetails) {})
```

#### api.deleteLabel(id)

Delete a label from ooyala, this method is slightly different as it requires the
primary label `id`, rather than the `name`.

* `id` - String - label id

```js
api.deleteLabel('/Awesome/Sauce').then(function(ooyalaResponse) {})
```

#### api.syncLabels(labels)

Convenience method for finding details on all existing labels, as well as creating
any labels that do not yet exist. Returns an array of label details. This method
is recommended for use above the others, as it provides consistent results with
minimal app logic.

The caveat in this method is that it uses the `getLabels` method described above,
if this proves to be a performance issue, then the logic here will be optimized.

* `labels` - Array - list of label names

```js
var labels = [
  'Categories/Food'
, 'Categories/Drinks'
]
api.syncLabels(labels).then(function(labelArray) {})
```


<br/>
Video Labels
------------

The following methods correspond to the linking of Labels and Videos within Backlot.
Any label used here *must* exist before it can be used.


#### api.getVideoLabels(videoId)

Find all labels associated with a given video

* `videoId` - String - video id / embed code

```js
api.getVideoLabels('asest_id').then(function(labels) {})
```

#### api.addVideoLabels(videoId, labelIds)

Add a list of labels to a given video

* `videoId` - String - video id / embed code
* `labelIds` - Array - list of video ids

```js
var labels = ['Foo', 'Bar', 'Baz']

api
  .syncLabels(labels)
  .then(function(labelList) {
    var labelIds = labelList.map(function(x) { return x.id })

    return api.addVideoLabels('asest_id', labelIds)
  })
```

#### api.removeVideoLabel(videoId, labelId)

Remove a given label from the video

* `videoId` - String - video id / embed code
* `labelId` - String - label id

```js
api.removeVideoLabel('asset_id', 'label_id').then(function() {})
```


#### api.removeVideoLabels(videoId, labelIds)

Convenience method for removing multiple labels from a video, which is currently
not supported via Ooyala API. This will map to `removeVideoLabel` above.

* `videoId` - String - video id / embed code
* `labelIds` - Array - list of video ids

```js
api.removeVideoLabels('asset_id', labelIdList).then(function() {})
```


#### api.removeAllVideoLabels(videoId)

Remove all associated labels with the video

* `videoId` - String - video id / embed code


#### api.replaceVideoLabels(videoId, labelIds)

Ooyala provided shortcut for removing all labels and adding the given label ids.
This will remove any existing label data.

* `videoId` - String - video id / embed code
* `labelIds` - Array - list of video ids


#### api.syncVideoLabels(videoId, labelNames)

Convenience method for syncing the given label names in ooyala, then replacing all
video labels with the IDs returned from ooyala. If given an empty list, this will
effectively remove all label associations.

* `videoId` - String - video id / embed code
* `labelNames` - Array - list of video names

```js
api.syncVideoLabels('asset_id', [
  'Topics/HTML'
, 'Topics/JS'
, 'Category/Recent'
])
```



<br/>
Video General
-------------

The following methods correspond to top level `video` objects in Backlot.


#### api.createVideoAsset(data)

Create a new video object in ooyala.

* `data` - Object - video id / embed code

```js
api
  .createVideoAsset({
    name: 'my video'
  , description: 'so awesome'
  , file_name: 'video.mp4'
  , file_size: 309232
  })
```


#### api.deleteVideo(videoId)

Delete a video

* `videoId` - String - video id / embed code


#### api.getVideoDetails(videoId)

Get the top level details of a video

* `videoId` - String - video id / embed code


#### api.getVideoMetadata(videoId)

Get associated video metadata

* `videoId` - String - video id / embed code


#### api.setVideoMetadata(videoId, metadata)

Set the video metadata

* `videoId` - String - video id / embed code
* `metadata` - Object - metadata


#### api.getVideoPlayer(videoId)

Get the video player information

* `videoId` - String - video id / embed code


#### api.getVideoSource(videoId)

Get all video source information

* `videoId` - String - video id / embed code


#### api.getVideoStreams(videoId)

Get all video streams

* `videoId` - String - video id / embed code


#### api.getFullVideoDetails(videoId)

Shortcut for getting all related video data from Ooyala, includes the following
related content: `metadata`, `labels`, `player`, `source_file_info`,
`primary_preview_image`, and `streams`.

* `videoId` - String - video id / embed code

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

Search the Ooyala API for videos. Please see the official documentation below for
how to use the method, as it is not the easiest thing to figure out.

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

* `videoData` - Object - full video object
* `buffer` - Buffer|Uint8Array - raw asset data


```js
fs.readFile('video.mp4', function(err, buffer) {
  var video = {
    name: 'amaze video'
  , description: 'such quality, many likes'
  , file_name: 'the-video-name-1.mp4'
  , file_size: buffer.length
  , hosted_at: 'http://some-site.wow'
  , metadata: { created_by: 'doge' }
  , labels: ['Wow', 'Such', 'Footage']
  }
  api.createFullVideoAsset(video, buffer)
})
```


<br/>
Thumbnails
----------------

#### api.getVideoThumbnails(videoId)

Get a list of generated preview images for a given video

* `videoId` - String - video id


#### api.setVideoToUploadedThumbnail(videoId)

Set the video to use the manually uploaded thumbnail image

* `videoId` - String - video id


#### api.setVideoToGeneratedThumbnail(videoId, [time])

Set the video to use an auto generated preview image at an optional given time.
See the `time` property on the response from the `getVideoThumbnails` method.

* `videoId` - String - video id
* `time` - Number - pre-generated thumbnail time (optional)


#### api.uploadVideoThumbnail(videoId, imageBuffer))

Upload a given raw image asset, it will still need to be manually set for usage
using the `setVideoToUploadedThumbnail` method.

* `videoId` - String - video id
* `imageBuffer` - Buffer|Uint8Array - raw image data



<br/>
Asset Upload
------------

The following methods are used for uploading the actual video file asset to ooyala.
It is highly recommended to use the convenience methods below rather than walk through
each step manually yourself. If you *do* need to use custom upload logic, all methods
are exposed, however, please create an issue so that this process may be improved
for all who use it over time.

With that out of the way, asset upload and replacement in Ooyala Backlot is generally
a four to five step process, in which error handling often requires data from all
steps in the process, for either reporting or retry purposes.

[Ooyala Upload Documentation](http://support.ooyala.com/developers/documentation/tasks/api_asset_upload.html)


#### api.getVideoUploadUrl(videoId)

Fetch the pre-signed ooyala provided upload URL(s) for each file chunk needed.
If you are not using the convenience methods of this SDK for uploading, you will
need the URL array from this method for subsequent chunk upload and retry logic.

* `videoId` - String - video id


#### api.replaceVideoAsset(videoId, uploadUrls, assetBuffer)
#### api.uploadVideoAsset(videoId, uploadUrls, assetBuffer)

Half-convenience method for uploading an asset, primary used internally, but can
be called directly if doing custom upload logic.

* `videoId` - String - video id
* `uploadUrls` - Array - upload urls from the `getVideoUploadUrl` method
* `assetBuffer` - Buffer|Uint8Array - raw asset data


#### api.uploadVideoChunk(uploadUrl, bufferChunk)

Upload the designated file chunk to the designated ooyala provided upload url.
This is part of what makes uploading tricky. The chunks are based on what you set
the `chunkSize` to when initializing the SDK. So, given a `5mb` file, with a `chunkSize`
of `2mb`, it would take 3 upload urls, and 3 `2mb` whole or partial chunks to fully
upload the asset.

* `uploadUrl` - String - ooyala provided upload url
* `bufferChunk` - Buffer|Uint8Array - partial video buffer chunk


#### api.setVideoUploadStatus(videoId)

Once finished uploading all data chunks to all upload URLs, you must (for whatever reason)
tell the Ooyala API that you have finished uploading.

* `videoId` - String - video id

#### api.setVideoReplaceUploadStatus(videoId)

Same as above but for replacement workflow

* `videoId` - String - video id


#### api.updateVideoAsset(videoId, videoData)
#### api.updateVideoData(videoId, videoData)

Update an existing video's data in ooyala.

* `videoId` - String - video id
* `videoData` - Object - video data



<br/>
Asset Replacement
-----------------

#### api.uploadVideoReplaceAsset()

DESCRIPTION

```js
```

#### api.setVideoReplaceUploadStatus()

DESCRIPTION

```js
```

#### api.replaceFullVideoAsset()

DESCRIPTION

```js
```

#### api.replaceVideoAsset()

DESCRIPTION

```js
```

#### api.getVideoReplaceUploadUrl()

DESCRIPTION

```js
```

#### api.replaceVideoMetadata()

DESCRIPTION

```js
```


Data / Response Types
---------------------

### video

### streams
### source
### player
### metadata
### label
### thumbnail


Errors
------

The following error classes are dynamically created based on the HTTP response of
any given API call to ooyala. It is currently unclear which routes can produce which
of the following errors. As this SDK is large, I have yet to associate these with
each method correctly, so for now, assume any method in this SDK can return any of
these errors. Some should stand out as obvious based on what you are doing.

#### Error

Top level generic error class, all of the following error classes are derived from this.

Alias: `OoyalaError`

#### ValidationError

Internal validation error, all methods validate before sending any requests to
prevent corrupted state or wasted API calls to ooyala.

#### RequestError

Top level generic request error, either this or the generic `Error` class should
always be handled, as it is not guaranteed that there is a detailed class representing
all error states from Backlot. All following classes are derived from this.

Given that a request happened, all `RequestError` classes should have the following:

* `response` - request module JSON response
* `message` - string decoded ooyala response
* `messageData` - object decoded ooyala response

The string data should always exist, some error responses from Ooyala contain JSON
data, or *are* themselves, JSON data, and some are simply string responses. So,
brace yourself, there be dragons here. The `messageData` may not exist, or always
be empty, and the `message` may be a stringified object. Because it is unknown,
both are provided.

#### ProcessingVideoError

An action was attempted against an already processing video

#### DuplicateVideoError

This asset (filename) already exists in Backlot. A filename change can bypass this,
however, it should not be needed as a workaround.

#### UploadingVideoError

The video is either currently uploaded, or is stuck in an aborted upload state.
If the former, then the current action can likely be tried again once the upload finishes,
however, if it is the latter, then the asset must be manually deleted from Backlot
as there is no way to continue, either via a new upload or asset replacement.

#### MissingChunksError

The video asset upload is missing chunks / data, this error is actually recoverable,
as Ooyala is attempting to let you know to try again. The logic in the shortcut /
convenience methods will handle this for you.

#### TooFastError

An asset or thumbnail change to the current video is too soon since the last upload
or replacement. The timing here is unknown, error was discovered while running tests,
I would guess this is roughly `30 seconds`.

#### NotFoundError

General 404 response from Ooyala, for any data type.

#### UnauthorizedError

Either asking for an asset that should `404` on your account, but exists somewhere
in Backlot, or you have invalid credentials. It is probably invalid credentials.

#### InvalidSignatureError

This really shouldn't happen with this SDK, in the wild this happens frequently as
the requirements for the API signature are not exactly clear, meaning that the
signature code here is a *really good* guess. If you encounter this error, please
report it and how you did it.

#### BadRequestError

This is Ooyala's general 'ValidationError' response, this SDK attempts to prevent
this type of error from happening beforehand, as it is generally representative of a
malformed request, or missing parameters. If encountered, please report.

#### TooLargeError

This may only apply to thumbnails, the image you are trying to upload is over the max
limit from Ooyala. It is unclear what that exact limit is, but seems to definitely be
under `10mb`.

#### HiddenCharacterError

For any text given to Ooyala, there cannot be any hidden characters, generally this
is seen for video descriptions, as its a pretty free-form text field. This SDK
should take care of this issue for you. If encountered, please report.



<br/>
License
-------

[MIT](license)
