// Copyright 2014. A Medium Corporation

/**
 * @file A transform stream that calls a method on each incoming chunk.
 */
var map = require('./map')

/**
 * Create a Mapper stream that calls a method on each chunk.
 * @param {String} method
 * @return {Mapper}
 */
module.exports = function (method) {
  return map(function (chunk) {
    return chunk[method]()
  })
}
