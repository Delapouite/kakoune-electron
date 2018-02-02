const { ipcRenderer } = require('electron')

let elements = {
  editor: document.getElementById('editor'),
}
let contexts = {}
const ids = ['pad', 'status', 'mode', 'info', 'menu']
ids.map(id => {
  elements[id] = document.getElementById(id)
  contexts[id] = elements[id].getContext('2d', { alpha: false })
})

const font = {
  height: 12,
}

const editor = { lines: 0, columns: 0 }

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

  const widest = Math.max(title.length + 2, ...lines.map(l => l.length))

  elements.info.height = (lines.length + 1) * font.height
  setWidth('info', (widest + 4) * font.width)

  const dash = '─'
  lines.forEach((l, y) => {
    let contents
    if (y === 0) {
      if (!l) contents = `╭─${dash.repeat(widest)}─╮`
      else {
        const dashCount = widest - l.length - 2
        const left = dash.repeat(Math.ceil(dashCount / 2))
        const right = left.length
          ? dash.repeat(widest - l.length - left.length - 2)
          : ''
        contents = `╭─${left}┤${l}├${right}─╮`
      }
    } else {
      contents = `│ ${l.padEnd(widest, ' ')} │`
    }
    drawLine(contexts.info, makeLine(contents, face), y)
  })
  contents = `╰─${dash.repeat(widest)}─╯`
  drawLine(contexts.info, makeLine(contents, face), lines.length)
}

function showMenu(items, anchor, selectedItemFace, menuFace) {
  const widest = items.reduce(
    (acc, i) => (i[0].contents.length > acc ? i[0].contents.length : acc),
    0,
  )
  const columns = Math.max(1, Math.floor(editor.columns / widest))
  const lines = Math.min(10, Math.floor(items.length / columns))
  const slicedItems = items.slice(0, lines * columns)
  setHeight('menu', lines * font.height)

  slicedItems.forEach((l, y) => drawLine(contexts.menu, l, y))
  drawLine(contexts.menu, items[0], 0)
}

function drawStatus(status, mode) {
  const statusLen = status.reduce((acc, a) => acc + a.contents.length, 0)
  const modeLen = mode.reduce((acc, a) => acc + a.contents.length, 0)
  const remaining = editor.columns - statusLen
  if (modeLen < remaining) {
    setWidth('status', (editor.columns - modeLen) * font.width)
    drawLine(contexts.status, status, 0)

    setWidth('mode', modeLen * font.width)
    drawLine(contexts.mode, mode, 0)
  } else if (remaining > 2) {
    // TODO
  }
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
      drawStatus(...params)
      break
    case 'info_show':
      showInfo(...params)
      break
    case 'info_hide':
      elements.info.height = 0
      elements.info.width = 0
      break
    case 'menu_show':
      showMenu(...params)
      break
    case 'menu_hide':
      elements.menu.height = 0
      break
  }
})

// resize and init

function setWidth(name, width) {
  elements[name].width = width
  refreshContext(contexts[name])
  clear(contexts[name])
}

function setHeight(name, height) {
  elements[name].height = height
  refreshContext(contexts[name])
  clear(contexts[name])
}

function refreshContext(ctx) {
  ctx.font = font.height + 'px monospace'
  ctx.textBaseline = 'top'
  font.width = ctx.measureText('m').width
}

function onResize() {
  const { clientHeight, clientWidth } = document.documentElement
  editor.lines = Math.floor(clientHeight / font.height)
  editor.columns = Math.floor(clientWidth / font.width)
  const height = editor.lines * font.height
  const width = editor.columns * font.width

  elements.editor.style.height = `${height}px`
  elements.editor.style.width = `${width}px`

  // leave room below for bar
  elements.pad.height = height - font.height
  elements.pad.width = width

  // TODO: correct balancing
  elements.mode.width = width / 2
  elements.status.width = width / 2

  elements.menu.width = width

  ids.forEach(id => refreshContext(contexts[id]))

  ipcRenderer.send('resize', { columns: editor.columns, lines: editor.lines })
}
onResize()
window.addEventListener('resize', onResize)
