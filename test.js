const assert = require(`assert`)
const buildFilename = require(`./build-filename`)

assert.equal(buildFilename('23/01/2020'), `23-01-2020.md`)