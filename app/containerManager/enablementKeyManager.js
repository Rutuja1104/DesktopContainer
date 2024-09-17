const { BrowserWindow, screen } = require('electron')

const EnablementKeyManager = () => {
  const { size } = screen.getPrimaryDisplay();
  let windowWidth = (size.width * 60) / 100;
  let windowHeight = (size.height * 60) / 100;

  const windowOptions = {
    focusable: true,
    show: false,
    alwaysOnTop: false,
    skipTaskbar: false,
    minimizable: true,
    width: windowWidth,
    height: windowHeight,
    webPreferences: {
      webviewTag: true,
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  }

  let window = new BrowserWindow(windowOptions)
  window.removeMenu()

  const windowManager = {
    window,
    isDisplayed: false,
    show: async function (url) {
      if (url) {
        await this.window.loadURL(url)
        this.window.show()
        this.isDisplayed = true
      } else {
        this.window.hide()
      }
    },
    close: function () {
      this.window.hide()
      this.isDisplayed = false
    },
    quit: function () {
      this.window.close()
    },
  }

  return windowManager;
}

module.exports = { EnablementKeyManager }