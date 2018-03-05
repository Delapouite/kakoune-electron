const path = require('path')
const url = require('url')
const { app, BrowserWindow, ipcMain } = require('electron')

const rpc = require('./rpc')

let win: any

function createWindow() {
  win = new BrowserWindow()

  win.setMenu(null)

  win.loadURL(
    url.format({
      pathname: path.join(__dirname, '../index.html'),
      protocol: 'file:',
      slashes: true
    })
  )

  rpc.on('message', (message: { method: string; params: any[] }) =>
    win.webContents.send('message', message)
  )

  ipcMain.on('keydown', (evt: any, key: string) => rpc.keys(key))
  ipcMain.on(
    'resize',
    (evt: any, { lines, columns }: { lines: number; columns: number }) =>
      rpc.resize(lines, columns)
  )

  process.env.NODE_ENV === 'development' && win.webContents.openDevTools()

  win.on('closed', () => (win = null))
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (win === null) {
    createWindow()
  }
})
