const { viewportManager } = require("./viewportManager");
export class ViewportController {
  constructor(
    contentWidth,
    contentHeight,
    coordinate,
    practitionerId,
    networkId,
    notificationService
  ) {
    this.viewportManagerInstance = viewportManager(
      contentWidth,
      contentHeight,
      coordinate,
      practitionerId,
      networkId,
      notificationService
    );
  }
  load(url) {
    this.viewportManagerInstance.window.loadURL(url);
  }
  sendData(eventName, payload) {
    this.viewportManagerInstance.window.webContents.send(eventName, payload);
  }
  open() {
    this.viewportManagerInstance.open();
  }
  close() {
    this.viewportManagerInstance.close();
  }
  quit() {
    this.viewportManagerInstance.quit();
  }
}
