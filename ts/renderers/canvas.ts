const { ipcRenderer } = require('electron')
const { splitEvery } = require('ramda')

// types
type ColumnCount = number
type LineCount = number

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
  line: LineCount
  column: ColumnCount
}
type MenuStyle = 'prompt' | 'inline'
type InfoStyle = 'prompt' | 'inline' | 'inlineAbove' | 'inlineBellow' | 'menuDoc' | 'modal'

// helpers

const getLen = (line: Line) => line.reduce((acc, a) => acc + a.contents.length, 0)

// view

function buildMount() {
  function createCanvas(id, width, height) {
    const canvas = document.createElement('canvas')
    canvas.id = id
    canvas.width = width
    canvas.height = height
    return canvas
  }
  const editor = document.getElementById('editor')
  const main = document.createElement('main')
  main.append(
    createCanvas('pad', 800, 600),
    createCanvas('info', 0, 0),
    createCanvas('menu', 0, 0),
  )
  const aside = document.createElement('aside')
  aside.append(
    createCanvas('status', 400, 12),
    createCanvas('mode', 400, 12),
  )
  editor.append(main, aside)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'css/canvas.css'
  document.head.append(link)
}
buildMount()

const elements = new Map<string, HTMLElement>()
const canvases = new Map<string, HTMLCanvasElement>()
const contexts = new Map<string, CanvasRenderingContext2D>()

elements.set('editor', document.getElementById('editor')!)

const canvasIds = ['pad', 'status', 'mode', 'info', 'menu']
canvasIds.map(id => {
  canvases.set(id, <HTMLCanvasElement>document.getElementById(id)!)
  contexts.set(id, canvases.get(id)!.getContext('2d', { alpha: false })!)
})

// state
const S = {
  lines: 0,
  columns: 0,
  statusOnTop: false,
  font: {
    height: 12,
    width: 0
  },
  menu: {
    items: [],
    fg: null,
    bg: null,
    anchor: null,
    style: null,
    selectedItem: 0,
    columns: 1,
    topLine: 0
  },
  info: {
    title: '',
    content: '',
    face: null,
    anchor: null,
    style: null,
  }
}

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

function drawAtom(ctx: CanvasRenderingContext2D, { contents, face: { bg, fg } }: Atom, column: ColumnCount, line: LineCount) {
  const x = column * S.font.width
  const y = line * S.font.height
  // bg
  ctx.fillStyle = bg === 'default' ? defaultFace.bg : bg
  ctx.fillRect(x, y, contents.length * S.font.width, S.font.height)
  // fg
  ctx.fillStyle = fg === 'default' ? defaultFace.fg : fg
  ctx.fillText(contents, x, y)
}

// can be a partial line
function drawLine(ctx: CanvasRenderingContext2D, line: Line, column: ColumnCount = 0, l: LineCount = 0) {
  line.reduce((column, atom) => {
    drawAtom(ctx, atom, column, l)
    return column + atom.contents.length
  }, column)
}

// info does not accept markup yet
function makeLine(contents: string, face: Face) {
  return [{ contents, face }]
}

function showInfo(title: string, contents: string, anchor: Coord, face: Face, style: InfoStyle) {
  const lines = contents.trim().split('\n')
  lines.unshift(title)

  const ctx = contexts.get('info')!
  const widest = Math.max(title.length + 2, ...lines.map(dl => dl.length))

  setDimensions('info', widest + 4, lines.length + 1)

  const dash = '─'
  lines.forEach((str, l) => {
    let contents
    if (l === 0) {
      if (!str) contents = `╭─${dash.repeat(widest)}─╮`
      else {
        const dashCount = widest - str.length - 2
        const left = dash.repeat(Math.ceil(dashCount / 2))
        const right = left.length
          ? dash.repeat(widest - str.length - left.length - 2)
          : ''
        contents = `╭─${left}┤${str}├${right}─╮`
      }
    } else {
      contents = `│ ${str.padEnd(widest, ' ')} │`
    }
    drawLine(ctx, makeLine(contents, face), 0, l)
  })
  contents = `╰─${dash.repeat(widest)}─╯`
  drawLine(ctx, makeLine(contents, face), 0, lines.length)
}

// items are Lines because they can have many parts (i.e. autocomplete)
function showMenu(items: Line[], anchor: Coord, selectedItemFace: Face, menuFace: Face, style: MenuStyle) {
  Object.assign(S.menu, {
    fg: selectedItemFace,
    bg: menuFace,
    style,
    anchor
  })

  const widest = items.reduce((acc, i) => Math.max(getLen(i), acc), 0)

  const ctx = contexts.get('menu')!
  const columns = Math.max(1, Math.floor(S.columns / widest))
  const lines = Math.min(10, Math.floor(items.length / columns))
  setHeight('menu', lines)

  splitEvery(columns, items.slice(0, columns * lines)).forEach((dls: Line[], l: LineCount) => {
    dls.forEach((cell, i) => {
      drawLine(ctx, cell, widest * i, l)
    })
  })
  drawLine(ctx, items[0])
}

function drawStatus(status: Line, mode: Line) {
  const statusLen = getLen(status)
  const modeLen = getLen(mode)
  const remaining = S.columns - statusLen
  if (modeLen < remaining) {
    setWidth('status', S.columns - modeLen)
    drawLine(contexts.get('status')!, status)

    setWidth('mode', modeLen)
    drawLine(contexts.get('mode')!, mode)
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
      params[0].forEach((dl: Line, l: LineCount) => drawLine(contexts.get('pad')!, dl, 0, l))
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

function setDimensions(name: string, columns: ColumnCount, lines: LineCount) {
  setWidth(name, columns)
  setHeight(name, lines)
}

function setWidth(name: string, columns: ColumnCount) {
  canvases.get(name)!.width = columns * S.font.width
  refreshContext(contexts.get(name)!)
  clear(contexts.get(name)!)
}

function setHeight(name: string, lines: LineCount) {
  canvases.get(name)!.height = lines * S.font.height
  refreshContext(contexts.get(name)!)
  clear(contexts.get(name)!)
}

function refreshContext(ctx: CanvasRenderingContext2D) {
  ctx.font = S.font.height + 'px monospace'
  ctx.textBaseline = 'top'
  S.font.width = ctx.measureText('m').width
}

function onResize() {
  const { clientHeight, clientWidth } = document.documentElement
  S.lines = Math.floor(clientHeight / S.font.height)
  S.columns = Math.floor(clientWidth / S.font.width)
  const height = S.lines * S.font.height
  const width = S.columns * S.font.width

  elements.get('editor')!.style.height = `${height}px`
  elements.get('editor')!.style.width = `${width}px`

  // leave room below for bar
  canvases.get('pad')!.height = height - S.font.height
  canvases.get('pad')!.width = width

  // TODO: correct balancing
  canvases.get('mode')!.width = width / 2
  canvases.get('status')!.width = width / 2

  canvases.get('menu')!.width = width

  canvasIds.forEach(id => refreshContext(contexts.get(id)!))

  ipcRenderer.send('resize', { columns: S.columns, lines: S.lines })
}
onResize()
window.addEventListener('resize', onResize)
