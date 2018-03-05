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