const { ipcRenderer } = require('electron')

function getModifiers(evt: any) {
  const modifiers = []
  if (evt.getModifierState('Control')) modifiers.push('Control')
  if (evt.getModifierState('Alt')) modifiers.push('Alt')
  return modifiers
}

const specialKeys = {
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  Backspace: 'backspace',
  Delete: 'del',
  Enter: 'ret',
  Escape: 'esc',
  Tab: 'tab',
  PageDown: 'pagedown',
  PageUp: 'pageup',
  Home: 'home',
  End: 'end',
  '+': 'plus',
  '-': 'minus',
  '<': 'lt',
  '>': 'gt',
  ' ': 'space'
}

document.addEventListener('keydown', (evt: any) => {
  console.log(evt.key, getModifiers(evt))
  let begin = ''
  let key
  let end = ''

  if (specialKeys[evt.key]) {
    begin = '<'
    key = specialKeys[evt.key]
    end = '>'
  } else if (evt.key.length === 1) {
    key = evt.key
  } else return

  const modifiers = getModifiers(evt)
  if (modifiers.length) {
    begin = '<'
    if (modifiers.includes('Control')) begin += 'c-'
    if (modifiers.includes('Alt')) begin += 'a-'
    end = '>'
  }

  ipcRenderer.send('keydown', `${begin}${key}${end}`)
})

