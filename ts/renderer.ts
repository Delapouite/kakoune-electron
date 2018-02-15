const { ipcRenderer } = require('electron')

type Color = string
type Attribute = string
type Face = {
  fg: Color
  bg: Color
  attributes: Attribute[]
}
type Atom = {
  face: Face
  contents: string
}
type Line = Atom[]
type Coord = {
  line: number
  column: number
}
type MenuStyle = 'prompt' | 'inline'
type InfoStyle = 'prompt' | 'inline' | 'inlineAbove' | 'inlineBellow' | 'menuDoc' | 'modal'

const elements = new Map<string, HTMLElement>()
const canvases = new Map<string, HTMLCanvasElement>()
const contexts = new Map<string, CanvasRenderingContext2D>()

elements.set('editor', document.getElementById('editor')!)

const canvasIds = ['pad', 'status', 'mode', 'info', 'menu']
canvasIds.map(id => {
  canvases.set(id, <HTMLCanvasElement>document.getElementById(id)!)
  contexts.set(id, canvases.get(id)!.getContext('2d', { alpha: false })!)
})

const font = {
  height: 12,
  width: 0
}

const editor = { lines: 0, columns: 0 }

let defaultFace: Face = {
  fg: 'white',
  bg: 'black',
  attributes: []
}
let paddingFace: Face = {
  fg: '#999',
  bg: 'black',
  attributes: []
}

function clear(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = defaultFace.bg
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
}

function drawAtom(ctx: CanvasRenderingContext2D, { contents, face: { bg, fg } }: Atom, x: number, y: number) {
  const xPx = x * font.width
  const yPx = y * font.height
  // bg
  ctx.fillStyle = bg === 'default' ? defaultFace.bg : bg
  ctx.fillRect(xPx, yPx, contents.length * font.width, font.height)
  // fg
  ctx.fillStyle = fg === 'default' ? defaultFace.fg : fg
  ctx.fillText(contents, xPx, yPx)
}

function drawLine(ctx: CanvasRenderingContext2D, line: Line, y = 0) {
  line.reduce((x, atom) => {
    drawAtom(ctx, atom, x, y)
    return x + atom.contents.length
  }, 0)
}

// info does not accept markup yet
function makeLine(contents: string, face: Face) {
  return [{ contents, face }]
}

function showInfo(title: string, contents: string, anchor: Coord, face: Face, style: InfoStyle) {
  const lines = contents.trim().split('\n')
  lines.unshift(title)

  const ctx = contexts.get('info')!
  const widest = Math.max(title.length + 2, ...lines.map(l => l.length))

  setHeight('info', lines.length + 1)
  setWidth('info', widest + 4)

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
    drawLine(ctx, makeLine(contents, face), y)
  })
  contents = `╰─${dash.repeat(widest)}─╯`
  drawLine(ctx, makeLine(contents, face), lines.length)
}

function showMenu(items: Line[], anchor: Coord, selectedItemFace: Face, menuFace: Face, style: MenuStyle) {
  const widest = items.reduce(
    (acc, i) => (i[0].contents.length > acc ? i[0].contents.length : acc),
    0,
  )
  const ctx = contexts.get('menu')!
  const columns = Math.max(1, Math.floor(editor.columns / widest))
  const lines = Math.min(10, Math.floor(items.length / columns))
  setHeight('menu', lines)

  items
    .slice(0, lines * columns)
    .forEach((l, y) => drawLine(ctx, l, y))
  drawLine(ctx, items[0], 0)
}

function drawStatus(status: Line, mode: Line) {
  const statusLen = status.reduce((acc, a) => acc + a.contents.length, 0)
  const modeLen = mode.reduce((acc, a) => acc + a.contents.length, 0)
  const remaining = editor.columns - statusLen
  if (modeLen < remaining) {
    setWidth('status', editor.columns - modeLen)
    drawLine(contexts.get('status')!, status, 0)

    setWidth('mode', modeLen)
    drawLine(contexts.get('mode')!, mode, 0)
  } else if (remaining > 2) {
    // TODO
  }
}

function setTitle(mode: Line) {
  document.title = mode.reduce((acc, a) => acc + a.contents, '')
  document.title += ' - kakoune electron'
}

ipcRenderer.on('message', (evt: any, { method, params }: { method: string, params: any[]}) => {
  switch (method) {
    case 'draw':
      clear(contexts.get('pad')!)
      params[0].forEach((l: Line, y: number) => drawLine(contexts.get('pad')!, l, y))
      defaultFace = params[1]
      paddingFace = params[2]
      break
    case 'draw_status':
      drawStatus(...params)
      setTitle(params[1])
      break
    case 'info_show':
      showInfo(...params)
      break
    case 'info_hide':
      canvases.get('info')!.height = 0
      canvases.get('info')!.width = 0
      break
    case 'menu_show':
      showMenu(...params)
      break
    case 'menu_hide':
      canvases.get('menu')!.height = 0
      break
  }
})

// resize and init

function setWidth(name: string, columns: number) {
  canvases.get(name)!.width = columns * font.width
  refreshContext(contexts.get(name)!)
  clear(contexts.get(name)!)
}

function setHeight(name: string, lines: number) {
  canvases.get(name)!.height = lines * font.height
  refreshContext(contexts.get(name)!)
  clear(contexts.get(name)!)
}

function refreshContext(ctx: CanvasRenderingContext2D) {
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

  elements.get('editor')!.style.height = `${height}px`
  elements.get('editor')!.style.width = `${width}px`

  // leave room below for bar
  canvases.get('pad')!.height = height - font.height
  canvases.get('pad')!.width = width

  // TODO: correct balancing
  canvases.get('mode')!.width = width / 2
  canvases.get('status')!.width = width / 2

  canvases.get('menu')!.width = width

  canvasIds.forEach(id => refreshContext(contexts.get(id)!))

  ipcRenderer.send('resize', { columns: editor.columns, lines: editor.lines })
}
onResize()
window.addEventListener('resize', onResize)
