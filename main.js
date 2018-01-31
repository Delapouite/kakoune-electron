const path = require('path')
const url = require('url')
const { app, BrowserWindow, ipcMain } = require('electron')

const client = require('./rpc')

let win

function createWindow() {
  win = new BrowserWindow()

  win.setMenu(null)

  win.loadURL(
    url.format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true,
    }),
  )

  client.on('message', message => win.webContents.send('message', message))

  ipcMain.on('keydown', (evt, key) => client.keys(key))
  ipcMain.on('resize', (evt, { lines, columns }) =>
    client.resize(lines, columns),
  )

  win.webContents.openDevTools()

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
