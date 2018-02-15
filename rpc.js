const ndjson = require('ndjson')
const { spawn } = require('child_process')
const EventEmitter = require('events')
const argv = process.argv.slice(2)

const ee = new EventEmitter()

const kakArgs = ['-ui', 'json']
if (argv[0] === '-c' && argv[1]) kakArgs.push(argv[0], argv[1])
console.log({kakArgs})

let kak = spawn('kak', kakArgs)

kak.stderr.on('error', err => console.log(String(err)))

kak.stdout.pipe(ndjson.parse()).on('data', json => {
  delete json.jsonrpc
  ee.emit('message', json)
})

// :q
kak.stdout.on('end', () => process.exit())

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
