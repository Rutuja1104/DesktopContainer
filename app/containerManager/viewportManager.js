const { BrowserWindow, ipcMain, screen } = require("electron");
const { accountService } = require("../data/levelService");
const {
  auditLogEventHandler,
} = require("container-common/src/helpers/websocket");
const {
  rendererAuditEvents,
} = require("container-common/src/helpers/constant");

function viewportManager(
  contentWidth,
  contentHeight,
  initialCoordinate,
  practitionerId,
  networkId,
  notificationService
) {
  const primaryDisplay = screen.getPrimaryDisplay();

  let viewportOptions = {
    transparent: true,
    animate: true,
    frame: false,
    maximizable: false,
    minimizable: false,
    sandbox: true,
    fullscreenable: false,
    skipTaskbar: true,
    show: false,
    hasShadow: false,
    resizable: false,
    x: initialCoordinate.x,
    y: initialCoordinate.y,
    width: contentWidth,
    height: contentHeight,
    paintWhenInitiallyHidden: true,
    webPreferences: {
      webviewTag: true,
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  };
  let badge = new BrowserWindow(viewportOptions);
  let viewPortOpen = false;
  let firstOpen = true;
  badge.removeMenu();
  let BadgeX = initialCoordinate.x;
  let BadgeY = initialCoordinate.y;
  const Window = badge;

  notificationService.on(`config-updated-${networkId}`, (config) => {
    let layout = config?.layout?.viewport?.properties;
    try {
      if (viewPortOpen) {
        badge.setBounds({
          width: layout.viewportWidth + layout.tabWidthWithViewport,
          height: layout.viewportHeight + layout.tabHeightWithViewport,
        });
        contentWidth = layout.viewportWidth + layout.tabWidthWithViewport;
        contentHeight = layout.viewportHeight + layout.tabHeightWithViewport;
      } else {
        badge.setBounds({
          width: layout.tabWidthWithoutViewport,
          height: layout.tabHeightWithoutViewport,
        });
        contentHeight = layout.tabHeightWithoutViewport;
        contentWidth = layout.tabWidthWithoutViewport;
      }
    } catch (err) {
      console.log("Error : ", err);
    }
  });

  badge.on("show", () => {
    badge.setAlwaysOnTop(true);
  });
  async function setCoordinate(coordinate) {
    await accountService.setData(
      `coordinate_viewport_${networkId}_${practitionerId}`,
      JSON.stringify(coordinate)
    );
  }

  async function setViewportState(viewPortState) {
    await accountService.setData(
      `viewportState_${networkId}_${practitionerId}`,
      viewPortState
    );
  }

  function validateBounds() {
    let maxY = Math.floor(
      primaryDisplay.workAreaSize.height - contentHeight + 1
    );
    let maxX = Math.floor(primaryDisplay.size.width - contentWidth) + 1;
    let viewportX = badge.getBounds().x;
    let viewportY = badge.getBounds().y;
    if (viewportY <= 0) {
      badge.setBounds({
        x: badge.getBounds().x,
        y: 5,
        height: contentHeight,
        width: contentWidth,
      });
    }
    if (viewportX <= 0) {
      badge.setBounds({
        x: 5,
        y: badge.getBounds().y,
        height: contentHeight,
        width: contentWidth,
      });
    }
    if (badge.getBounds().y >= maxY) {
      badge.setBounds({
        height: contentHeight,
        width: contentWidth,
        x: badge.getBounds().x,
        y: maxY - 1,
      });
    }
    if (badge.getBounds().x >= maxX) {
      badge.setBounds({
        x: maxX - 1,
        y: badge.getBounds().y,
        height: contentHeight,
        width: contentWidth,
      });
    }
    if (viewPortOpen && badge.getBounds().y < maxY) {
      BadgeX = badge.getBounds().x;
    } else {
      BadgeY = badge.getBounds().y;
      BadgeX = badge.getBounds().x;
    }
    const coordinate = {
      x: BadgeX,
      y: BadgeY,
    };
    setCoordinate(coordinate);
  }

  badge.on("move", () => {
    validateBounds();
  });

  ipcMain.on(`closeSidecar_${networkId}`, (event, content) => {
    auditLogEventHandler(
      rendererAuditEvents.VIEWPORT_MINIMIZE,
      networkId,
      networkId
    );
    if (content?.isExpired) {
      auditLogEventHandler(
        rendererAuditEvents.CONTEXT_EXPIRED,
        networkId,
        networkId
      );
    }
    viewPortOpen = false;
    setViewportState(viewPortOpen);
    let width = parseInt(content.width);
    let height = parseInt(content.height);
    let viewportWidth = parseInt(content.viewportWidth);
    if (!isNaN(width) && !isNaN(height)) {
      contentWidth = width;
      contentHeight = height;
      let xCord = parseInt(BadgeX + viewportWidth);
      if (firstOpen) {
        firstOpen = false; //
        badge.setBounds({
          x: initialCoordinate.x,
          y: initialCoordinate.y,
          height,
          width,
        });
      } else {
        badge.setBounds({
          x: xCord,
          y: BadgeY,
          height,
          width,
        });
        BadgeX = xCord;
      }
    }
    const coordinate = {
      x: BadgeX,
      y: badge.getBounds().y,
    };
    setCoordinate(coordinate);
  });
  ipcMain.on(`openSidecar_${networkId}`, (event, content) => {
    auditLogEventHandler(
      rendererAuditEvents.VIEWPORT_MAXIMIZE,
      networkId,
      networkId
    );
    viewPortOpen = true;
    setViewportState(viewPortOpen);
    contentWidth =
      parseInt(content.width) + parseInt(content.tabWidthWithoutViewport);
    contentHeight =
      parseInt(content.height) + parseInt(content.tabHeightWithoutViewport);
    let xCord = parseInt(
      BadgeX - contentWidth + parseInt(content.tabWidthWithoutViewport)
    );
    BadgeX = badge.getBounds().x;
    if (!isNaN(contentHeight) && !isNaN(contentWidth)) {
      if (firstOpen) {
        firstOpen = false;
        badge.setBounds({
          x: BadgeX,
          width: contentWidth,
          height: contentHeight,
        });
        validateBounds();
      } else {
        badge.setBounds({
          x: xCord,
          width: contentWidth,
          height: contentHeight,
        });
        const coordinate = {
          x: xCord + 1,
          y: badge.getBounds().y,
        };
        validateBounds();
        setCoordinate(coordinate);
      }
    }
  });

  badge.once("ready-to-show", function () {
    try {
      badge.setBounds({
        width: contentWidth,
        height: contentHeight,
      });
    } catch (err) {
      console.log(err);
    }
    badge.removeMenu();
  });

  const viewportStateManager = {
    window: Window,
    quit: function () {
      auditLogEventHandler(
        rendererAuditEvents.VIEWPORT_QUIT,
        networkId,
        networkId
      );
      this.window.close();
    },
    close: function () {
      auditLogEventHandler(
        rendererAuditEvents.VIEWPORT_CLOSE,
        networkId,
        networkId
      );
      this.window.hide();
    },
    open: function () {
      auditLogEventHandler(
        rendererAuditEvents.VIEWPORT_OPEN,
        networkId,
        networkId
      );
      this.window.show();
    },
  };

  return viewportStateManager;
}

module.exports = { viewportManager };
