const { ipcRenderer } = require('electron')

let elements = {}
let contexts = {}
;['pad', 'status', 'mode'].map(id => {
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
  }
})

// resize and init

function refreshContext (ctx) {
  ctx.font = font.height + 'px monospace'
  ctx.textBaseline = 'top'
  font.width = ctx.measureText('m').width
}

function onResize() {
  const { clientHeight, clientWidth } = document.documentElement
  // leave room below for bar
  elements.pad.height = clientHeight - font.height
  elements.pad.width = clientWidth
  refreshContext(contexts.pad)

  // TODO: correct balancing
  elements.mode.width = clientWidth / 2
  refreshContext(contexts.mode)
  elements.status.width = clientWidth / 2
  refreshContext(contexts.status)

  ipcRenderer.send('resize', {
    columns: Math.floor(clientWidth / font.width),
    lines: Math.floor(clientHeight / font.height) - 1,
  })
}
onResize()
window.addEventListener('resize', onResize)
