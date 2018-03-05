/// <reference path="../types.d.ts" />
const { ipcRenderer } = require('electron')
const React = require('react')
const ReactDOM = require('react-dom')

// helpers

function setTitle(mode: Line) {
  document.title = mode.reduce((acc, a) => acc + a.contents, '')
  document.title += ' - kakoune electron'
}

// TODO dynamic computation
const cell = {
  height: 14,
  width: 7.19
}

function onResize() {
  const { clientHeight, clientWidth } = document.documentElement
  const lines = Math.floor(clientHeight / cell.height)
  const columns = Math.floor(clientWidth / cell.width)
  ipcRenderer.send('resize', { columns, lines })
}

onResize()
window.addEventListener('resize', onResize)

// components

interface InfoState {
  title: string
  contents: string
  anchor: Coord
  face: Face
  style: InfoStyle
}

interface MenuState {
  items: Line[]
  anchor: Coord
  selectedItem: number
  selectedItemFace: Face
  menuFace: Face
  style: MenuStyle
}

interface EditorState {
  lines: Line[]
  defaultFace: Face
  paddingFace: Face
  status: Line
  mode: Line
  info: InfoState
  menu: MenuState
}

class Editor extends React.Component<void, EditorState> {
  state = {
    lines: [],
    defaultFace: null,
    paddingFace: null,
    status: null,
    mode: null,
    info: {
      title: '',
      contents: '',
      anchor: null,
      face: null,
      style: null
    },
    menu: {
      items: null,
      anchor: null,
      selectedItem: -1,
      selectedItemFace: null,
      menuFace: null,
      style: null
    }
  }
  componentDidMount() {
    ipcRenderer.on(
      'message',
      (evt: any, { method, params }: { method: string; params: any[] }) => {
        switch (method) {
          case 'draw':
            this.draw(params[0], params[1], params[2])
            break
          case 'draw_status':
            this.drawStatus(params[0], params[1])
            break
          case 'info_show':
            this.showInfo(params[0], params[1], params[2], params[3], params[4])
            break
          case 'info_hide':
            this.hideInfo()
            break
          case 'menu_show':
            this.showMenu(params[0], params[1], params[2], params[3], params[4])
            break
          case 'menu_select':
            this.selectMenu(params[1])
            break
          case 'menu_hide':
            this.hideMenu()
            break
        }
      }
    )
  }

  draw(lines: Line[], defaultFace: Face, paddingFace: Face) {
    this.setState({ lines, defaultFace, paddingFace })
  }

  drawStatus(status: Line, mode: Line) {
    this.setState({ status, mode })
    setTitle(mode)
  }

  showInfo(
    title: string,
    contents: string,
    anchor: Coord,
    face: Face,
    style: InfoStyle
  ) {
    this.setState({
      info: { title, contents, anchor, face, style }
    })
  }

  hideInfo() {
    this.setState({
      info: Object.assign({}, this.state.info, { title: '', contents: '' })
    })
  }

  showMenu(
    items: Line[],
    anchor: Coord,
    selectedItemFace: Face,
    menuFace: Face,
    style: MenuStyle
  ) {
    this.setState({
      menu: { items, anchor, selectedItemFace, menuFace, style }
    })
  }

  selectMenu(selectedItem: number) {
    this.setState({
      menu: Object.assign({}, this.state.menu, { selectedItem })
    })
  }

  hideMenu() {
    this.setState({
      menu: Object.assign({}, this.state.menu, { items: [] })
    })
  }

  render() {
    const { lines, defaultFace, status, mode, info, menu } = this.state
    return (
      <>
        <DBuffer lines={lines} defaultFace={defaultFace} />
        <StatusMode status={status} mode={mode} defaultFace={defaultFace} />
        <div className="Floating">
          <Info info={info} />
          <Menu menu={menu} />
        </div>
      </>
    )
  }
}

interface DAtomProps {
  atom: Atom
}
class DAtom extends React.Component<DAtomProps> {
  render() {
    const { atom: { contents, face } } = this.props
    const style = {
      background: face.bg === 'default' ? null : face.bg,
      color: face.fg === 'default' ? null : face.fg
    }
    return (
      <span className="DAtom" style={style}>
        {contents}
      </span>
    )
  }
}

interface DLineProps {
  line: Line
}
class DLine extends React.Component<DLineProps, {}> {
  render() {
    const { line } = this.props
    return (
      <div className="DLine">
        {line.map((a: Atom, k: number) => <DAtom atom={a} />)}
      </div>
    )
  }
}

interface DBufferProps {
  lines: Line[]
  defaultFace: Face
}
class DBuffer extends React.Component<DBufferProps> {
  render() {
    const { lines, defaultFace } = this.props
    const style = !defaultFace
      ? {}
      : {
          background: defaultFace.bg,
          color: defaultFace.fg
        }
    return (
      <div className="DBuffer" style={style}>
        {lines.map((l: Line, k: number) => <DLine line={l} />)}
      </div>
    )
  }
}

interface InfoProps {
  info: InfoState
}
class Info extends React.Component<InfoProps> {
  render() {
    const { info: { title, contents, face } } = this.props
    const style = !face
      ? {}
      : {
          background: face.bg,
          color: face.fg
        }
    const lines = contents.trim().split('\n')

    return (
      <div className="Info" style={style}>
        <div className="InfoTitle">{title}</div>
        <div>
          {lines.map((l: string) => (
            <DLine line={[{ contents: l, face: face || {} }]} />
          ))}
        </div>
      </div>
    )
  }
}

interface MenuProps {
  menu: MenuState
}
class Menu extends React.Component<MenuProps> {
  render() {
    const {
      menu: { items, selectedItem, selectedItemFace, menuFace }
    } = this.props
    if (!items) return null
    const style = !menuFace
      ? {}
      : {
          background: menuFace.bg,
          color: menuFace.fg
        }
    // TODO without mutations
    const choices = items.map((dl: Line, k: number) => {
      if (k === selectedItem) {
        dl[0].face = selectedItemFace
      } else {
        dl[0].face = menuFace
      }
      return dl
    })
    return (
      <div className="Menu" style={style}>
        {choices.map((dl: Line)=> <DLine line={dl} />)}
      </div>
    )
  }
}

interface StatusModeProps {
  status: Line
  mode: Line
  defaultFace: Face
}
class StatusMode extends React.Component<StatusModeProps> {
  render() {
    const { status, mode, defaultFace } = this.props
    if (!status || !mode) return null
    const style = !defaultFace
      ? {}
      : {
          background: defaultFace.bg,
          color: defaultFace.fg
        }
    return (
      <div className="StatusMode" style={style}>
        <div className="Status">
          <DLine line={status} />
        </div>
        <div className="Mode">
          <DLine line={mode} />
        </div>
      </div>
    )
  }
}

ReactDOM.render(<Editor />, document.getElementById('editor'))
