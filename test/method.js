// Copyright 2014. A Medium Corporation

var assert = require('assert')
var collect = require('./helpers/collect')
var method = require('../').method

describe('Append', function () {
  it('Should call a method', function (done) {
    var collector = collect()
    var stream = method('toString')

    stream.pipe(collector)
    stream.on('error', done)
    collector.on('end', function () {
      assert.equal(collector.getObjects().shift(), '11')
      done()
    })

    stream.end(11)
  })

  it('Should emit an error if the method does not exist', function (done) {
    var collector = collect()
    var stream = method('fake')

    stream.pipe(collector)
    stream.on('error', function (err) {
      assert.ok(err)
      assert.ok(err.message.indexOf('has no method'))
      done()
    })

    stream.end('A stranger walked in through the door')
  })
})
