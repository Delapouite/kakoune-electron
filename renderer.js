const { ipcRenderer } = require('electron')

let elements = {
  editor: document.getElementById('editor'),
}
let contexts = {}
const ids = ['pad', 'status', 'mode', 'info']
ids.map(id => {
  elements[id] = document.getElementById(id)
  contexts[id] = elements[id].getContext('2d', { alpha: false })
})

const font = {
  height: 12,
}

let defaultFace = {}
let paddingFace = {} // TODO

function clear(ctx) {
  ctx.fillStyle = defaultFace.bg || 'black'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
}

function drawAtom(ctx, { contents, face: { bg, fg } }, x, y) {
  const xPx = x * font.width
  const yPx = y * font.height
  // bg
  ctx.fillStyle = bg === 'default' ? defaultFace.bg : bg
  ctx.fillRect(xPx, yPx, contents.length * font.width, font.height)
  // fg
  ctx.fillStyle = fg === 'default' ? defaultFace.fg : fg
  ctx.fillText(contents, xPx, yPx)
}

function drawLine(ctx, line, y = 0) {
  line.reduce((x, atom) => {
    drawAtom(ctx, atom, x, y)
    return x + atom.contents.length
  }, 0)
}

// info does not accept markup yet
function makeLine(contents, face) {
  return [{ contents, face }]
}

function showInfo(title, contents, anchor, face, style) {
  const lines = contents.trim().split('\n')
  lines.unshift(title)

  elements.info.height = lines.length * font.height
  elements.info.width = Math.max(...lines.map(l => l.length)) * font.width

  clear(contexts.info)
  refreshContext(contexts.info)
  lines.forEach((l, y) => drawLine(contexts.info, makeLine(l, face), y))
}

ipcRenderer.on('message', (event, { method, params }) => {
  switch (method) {
    case 'draw':
      clear(contexts.pad)
      params[0].forEach((l, y) => drawLine(contexts.pad, l, y))
      defaultFace = params[1]
      paddingFace = params[2]
      break
    case 'draw_status':
      clear(contexts.status)
      drawLine(contexts.status, params[0], 0)
      clear(contexts.mode)
      drawLine(contexts.mode, params[1], 0)
      break
    case 'info_show':
      showInfo(...params)
      break
    case 'info_hide':
      elements.info.height = 0
      elements.info.width = 0
      break
  }
})

// resize and init

function refreshContext(ctx) {
  ctx.font = font.height + 'px monospace'
  ctx.textBaseline = 'top'
  font.width = ctx.measureText('m').width
}

function onResize() {
  const { clientHeight, clientWidth } = document.documentElement
  const lines = Math.floor(clientHeight / font.height)
  const columns = Math.floor(clientWidth / font.width)
  const height = lines * font.height
  const width = columns * font.width

  elements.editor.style.height = `${height}px`
  elements.editor.style.width = `${width}px`

  // leave room below for bar
  elements.pad.height = height - font.height
  elements.pad.width = width

  // TODO: correct balancing
  elements.mode.width = width / 2
  elements.status.width = width / 2

  ids.forEach(id => refreshContext(contexts[id]))

  ipcRenderer.send('resize', { columns, lines })
}
onResize()
window.addEventListener('resize', onResize)
