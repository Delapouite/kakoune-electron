const { ipcRenderer } = require('electron')
const React = require('react')
const ReactDOM = require('react-dom')

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
type InfoStyle =
  | 'prompt'
  | 'inline'
  | 'inlineAbove'
  | 'inlineBellow'
  | 'menuDoc'
  | 'modal'

// components

interface EditorState {
  lines: Line[]
  defaultFace: Face
}

class Editor extends React.Component<void, EditorState> {
  state = {
    lines: [],
    defaultFace: null,
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
            this.draw(...params)
            break
          case 'draw_status':
            this.drawStatus(...params)
            break
          case 'info_show':
            this.showInfo(...params)
            break
          case 'info_hide':
            this.hideInfo()
            break
          case 'menu_show':
            this.showMenu(...params)
            break
          case 'menu_select':
            this.selectMenu(...params)
            break
          case 'menu_hide':
            this.hideMenu()
            break
        }
      }
    )
  }

  draw(lines: Line[], defaultFace: Face) {
    this.setState({ lines, defaultFace })
  }

  drawStatus(status: Line, mode: Line) {
    this.setState({ status, mode })
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
    const { atom } = this.props
    const style = {
      background: atom.face.bg,
      color: atom.face.fg
    }
    return (
      <span className="DAtom" style={style}>
        {atom.contents}
      </span>
    )
  }
}

interface DLineProps {
  line: Line
}
class DLine extends React.Component<DLine> {
  render() {
    const { line } = this.props
    return (
      <div className="DLine">
        {line.map((a, k) => <DAtom key={k} atom={a} />)}
      </div>
    )
  }
}

class DBuffer extends React.Component {
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
        {lines.map((l, k) => <DLine line={l} />)}
      </div>
    )
  }
}

class Info extends React.Component {
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
          {lines.map(l => <DLine line={[{ contents: l, face: face || {} }]} />)}
        </div>
      </div>
    )
  }
}

class Menu extends React.Component {
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
    const choices = items.map((dl, k) => {
      if (k === selectedItem) {
        dl[0].face = selectedItemFace
      } else {
        dl[0].face = {}
      }
      return dl
    })
    return (
      <div className="Menu" style={style}>
        {choices.map(dl => <DLine line={dl} />)}
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
