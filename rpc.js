const ndjson = require('ndjson')
const { spawn } = require('child_process')
const EventEmitter = require('events')

const ee = new EventEmitter()
// TODO: choose another existing session or create one
const session = 'electron'
const kak = spawn('kak', ['-ui', 'json', '-c', session])

kak.stdout.pipe(ndjson.parse()).on('data', json => {
  delete json.jsonrpc
  ee.emit('message', json)
})

function send(method, params) {
  const json = {
    jsonrpc: '2.0',
    method,
    params,
  }
  console.log(method, params)
  kak.stdin.write(JSON.stringify(json))
}

ee.keys = keys => send('keys', [keys])

ee.resize = (lines, columns) => send('resize', [lines, columns])

module.exports = ee
