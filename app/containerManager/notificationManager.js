const { BrowserWindow, screen } = require("electron");
const { accountService } = require("../data/levelService");

const NotificationManager = (coordinates, config) => {
  const windowOptions = {
    show: false,
    frame: false,
    transparent: true,
    sandbox: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    minimizable: false,
    fullscreenable: false,
    hasShadow: false,
    resizable: false,
    width: config?.properties?.width,
    height: config?.properties?.height,
    x: coordinates?.x,
    y: coordinates?.y,
    webPreferences: {
      webviewTag: true,
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  };
  let contentHeight = config?.properties?.height;
  let contentWidth = config?.properties?.width;
  let networkId = config?.properties?.networkId;

  let window = new BrowserWindow(windowOptions);
  window.removeMenu();

  const primaryDisplay = screen.getPrimaryDisplay();

  let NotificationX = coordinates?.x;
  let NotificationY = coordinates?.y;

  async function setCoordinate(coordinate) {
    await accountService.setData(`coordinate_notification_${networkId}`, JSON.stringify(coordinate));
  }

  window.on("move", () => {
    const maxY = primaryDisplay.workAreaSize.height - contentHeight;
    const maxX = primaryDisplay.size.width - contentWidth;
    if (window.getBounds().x <= 0) {
      window.setBounds({
        x: 2,
        y: window.getBounds().y,
        height: contentHeight,
        width: contentWidth,
      });
    }
    if (window.getBounds().y <= 0) {
      window.setBounds({
        x: window.getBounds().x,
        y: 2,
        height: contentHeight,
        width: contentWidth,
      });
    }
    if (window.getBounds().y > maxY) {
      window.setBounds({
        x: window.getBounds().x,
        y: maxY,
        height: contentHeight,
        width: contentWidth,
      });
    }
    if (window.getBounds().x > maxX) {
      window.setBounds({
        x: maxX,
        y: window.getBounds().y,
        height: contentHeight,
        width: contentWidth,
      });
    }
    if (window.getBounds().y < maxY) {
      NotificationX = window.getBounds().x;
      NotificationY = window.getBounds().y;
    } else {
      NotificationX = window.getBounds().x;
    }
    const notificationCoordinate = {
      x: NotificationX,
      y: NotificationY || window.getBounds().y,
    };
    setCoordinate(notificationCoordinate);
  });

  const windowManager = {
    window,
    isDisplayed: false,
    show: async function (url) {
      if (url) {
        this.window.loadURL(url);
        this.window.show();
        this.isDisplayed = true;
      } else {
        this.window.hide();
      }
    },
    close: async function () {
      this.window.hide();
      this.isDisplayed = false;
    },
    quit: function () {
      this.window.close();
    },
  };

  return windowManager;
};

module.exports = { NotificationManager };
