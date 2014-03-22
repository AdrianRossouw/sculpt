// Copyright 2014. A Medium Corporation

/**
 * @file A base class to create a transform stream in object mode and
 * pass errors to the _transform() callback.
 */
var Transform = require('stream').Transform
var util = require('util')

module.exports = ObjectStream

/**
 * Object mode transformd stream.
 *
 * @constructor
 */
function ObjectStream() {
  this._isBubblingErrors = false
  this._hasHadError = false
  this._errorHandlers = []

  Transform.call(this, {objectMode: true})
}
util.inherits(ObjectStream, Transform)

/**
 * Set the stream to be async. This is only relevant for map and filter streams, and not
 * for the built in streams that implement them.
 *
 * @return {ObjectStream} Current instance
 */
ObjectStream.prototype.async = function () {
  this._inAsyncMode = true
  return this
}

/**
 * Determine whether the stream is in async mode.
 *
 * @return {Boolean}
 */
ObjectStream.prototype.isAsync = function () {
  return !! this._inAsyncMode
}

/**
 * @override
 */
ObjectStream.prototype._transform = function (chunk, enc, callback) {
  var maybeSyncCallback = function () {
    if (this.isAsync()) return
    callback.apply(null, arguments)
  }.bind(this)

  try {
    this._safeTransform(chunk, enc, callback)
    maybeSyncCallback()
  } catch (err) {
    maybeSyncCallback(err)
  }
}

/**
 * Transform incoming data. Uncaught errors are provided as an error argument to
 * the _transform() callback.
 *
 * @abstract
 */
ObjectStream.prototype._safeTransform = function () {
  throw new Error('Child classes should implement _safeTransform() or override _transform()')
}

/**
 * Set stream to bubble errors up to piped sources. Useful to simplify error handling in cases
 * where you can handle all errors in one place. Error objects will  have a 'stack' property
 * that describes where the error actually ocurred, but *not* where it was bubbled to.
 *
 * @return {ObjectStream} Current instance
 */
ObjectStream.prototype.bubbleErrors = function () {
  // Avoid binding these listeners more than once.
  if (this._isBubblingErrors) {
    return this
  }
  this._isBubblingErrors = true

  // Keep track of when this stream encounters an error. When it happens, Node will
  // automatically unpipe source streams. We want to avoid running our unpipe handler
  // in those cases because the whole point is to propagate those errors.
  this.once('error', function () {
    this._hasHadError = true
  }.bind(this))

  this.on('pipe', function (readable) {
    var handleError = function () {
      var args = Array.prototype.slice.call(arguments)
      readable.emit.apply(readable, ['error'].concat(args))
    }

    // Cache the error callback and a reference to the source stream in case we need to stop
    // handling these errors later when the source is unpiped.
    this._errorHandlers.push({readable: readable, fn: handleError})
    this.on('error', handleError)
  }.bind(this))

  // Don't propagate errors to sources that are no longer piped to us.
  this.on('unpipe', function (readable) {
    // Ignore unpipe events that happen after errors. These are triggered internally by Node and
    // would otherwise defeat the whole purpose of bubbling up errors. In other words, only do
    // this when unpipe is explicitly called before an error occurs.
    if (this._hasHadError) return

    // Find the cached error handler(s) for this stream.
    var errorHandlers = this._errorHandlers.reduce(function (memo, handler, idx) {
      if (handler.readable === readable) {
        memo.push({handler: handler, idx: idx})
      }

      return memo
    }, [])

    // Unbind the callback and remove our reference to it (and the relevant source stream).
    errorHandlers.forEach(function (errorHandler) {
      this.removeListener('error', errorHandler.handler.fn)
      this._errorHandlers.splice(errorHandler.idx, 1)
    }.bind(this))
  }.bind(this))

  return this
}
