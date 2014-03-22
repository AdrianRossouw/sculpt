// Copyright 2014. A Medium Corporation

var assert = require('assert')
var ObjectStream = require('../lib/_base')

describe('ObjectStream error bubbling', function () {
  it('Should not bubble errors when bubble mode is not on', function (done) {
    var success = new ObjectStream()
    var fail = new ObjectStream()

    success._safeTransform = function (chunk) {
      this.push(chunk)
    }
    fail._safeTransform = function () {
      throw new Error('Fail')
    }

    success.pipe(fail)
    success.on('error', assert.ifError)
    fail.on('error', function (err) {
      assert.equal(err.message, 'Fail')
      done()
    })

    success.end('While home in New York was champagne and disco')
  })

  it('Should bubble up errors to pipe source when bubbleErrors() is called', function (done) {
    var pass = new (require('stream')).PassThrough()
    var fail = new ObjectStream().bubbleErrors()

    fail._safeTransform = function () {
      throw new Error('Fail')
    }

    pass.on('error', function (err) {
      assert.equal(err.message, 'Fail')
      done()
    })

    pass.pipe(fail)
    pass.end('hello world')
  })

  it('Should bubble errors multiple levels', function (done) {
    var one = new ObjectStream()
    var two = new ObjectStream()
    var three = new ObjectStream()
    var pass = new (require('stream')).PassThrough()

    one._safeTransform = function (chunk) {
      this.push(chunk)
    }
    two._safeTransform = function (chunk) {
      this.push(chunk)
    }
    three._safeTransform = function () {
      throw new Error('Deep error')
    }

    pass
      .pipe(one)
        .on('error', function (err) {
          assert.equal(err.message, 'Deep error')
          done()
        })
      .pipe(two.bubbleErrors())
      .pipe(three.bubbleErrors())

    pass.end('Tapes from L.A. slash San Francisco')
  })

  it('Should stop bubbling errors when a source is unpiped', function (done) {
    var success = new ObjectStream()
    var fail = new ObjectStream().bubbleErrors()

    success._safeTransform = function (chunk) {
      this.push(chunk)
    }

    var doNotFailThisTime = true
    fail._safeTransform = function () {
      if (doNotFailThisTime) {
        doNotFailThisTime = false
        return
      }

      throw new Error('Fail')
    }

    success.pipe(fail)
    success.on('error', assert.ifError)
    success.write('But actually Oakland')

    // Allow the error that would have been emitted from the success stream to finish
    // before we keep going.
    setImmediate(function () {
      fail.on('error', function (err) {
        assert.equal(err.message, 'Fail')
        done()
      })

      success.unpipe(fail)
      fail.end(' and not Alameda')
    })
  })

  it('Should emit errors when piped streams have been unpiped', function (done) {
    var target = new ObjectStream().bubbleErrors()
    var pass = new (require('stream')).PassThrough()

    target._safeTransform = function () {
      throw new Error('Fail')
    }

    pass.pipe(target)
    pass.unpipe(target)

    target.on('data', function () {})
    target.on('error', function (err) {
      assert.equal(err.message, 'Fail')
      done()
    })

    target.end('Your girl was in Berkeley with her Communist reader')
  })

  it('Should not throw errors on error events after bubbleErrors() is called', function (done) {
    var thrower = new ObjectStream()
    var nonthrower = new ObjectStream().bubbleErrors()

    var throwFn = function () {
      throw new Error('Always throw')
    }

    thrower._safeTransform = nonthrower._safeTransform = throwFn

    try {
      nonthrower.end('Mine was entombed within boombox and walkman')
    } catch (e) {
      assert.ifError(e)
    }

    try {
      thrower.end('I was a hoarder but girl that was back then')
    } catch (e) {
      assert.equal(e.message, 'Always throw')
      done()
    }
  })
})
