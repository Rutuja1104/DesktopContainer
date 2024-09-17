const chokidar = require("chokidar");
const fs = require("fs");
const path = require("path");
const basePath = require("path").dirname(
  require("electron").app.getPath("exe")
);
const { auditLogEventHandler } = require("container-common/src/helpers/websocket");
const { auditLog } = require("container-common/src/helpers/constant");
const {
  EnablementKeyManager,
} = require("../containerManager/enablementKeyManager");
async function initListener(notificationService) {
  let enablementWindow = EnablementKeyManager();
  console.log("Enablement key path ", basePath);
  const enablementKeyPath = path.join(basePath, "enablement.key");
  console.log("For listening enablement key path is ", enablementKeyPath);
  if (fs.existsSync(enablementKeyPath)) {
    console.log(`Key file already exists: ${enablementKeyPath}`);
    readEnablement(enablementKeyPath);
    return;
  }
  else {
    await enablementWindow.show(ENABLEMENT_KEY_WINDOW_WEBPACK_ENTRY);
  }
  chokidar
    .watch(enablementKeyPath)
    .once("add", async (path) => {
      console.log(`File ${path} has been added`);
      if (path.endsWith(".key")) {
        console.log(`Found key file: ${path}`);
        enablementWindow.close();
        auditLogEventHandler(auditLog.ENABLEMENTKEY_DISCOVERED);
        readEnablement(path);
      }
    })
    .on("change", async (path) => {
      console.log(`File ${path} has been changed`);
      if (path.endsWith(".key")) {
        console.log(`Key file changed: ${path}`);
        enablementWindow.close();
        auditLogEventHandler(auditLog.ENABLEMENTKEY_DISCOVERED);
        readEnablement(path);
      }
    });
  function readEnablement(path) {
    const data = fs.readFileSync(path, { encoding: "utf8" });
    let content = JSON.stringify({ enablementKey: data });
    notificationService.publish("check-enablement-path", content);
  }
}

module.exports = { initListener };
