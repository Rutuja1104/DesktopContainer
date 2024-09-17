const { accountService: dbService, accountService } = require("../data/levelService");
const { autoUpdater } = require("electron-updater");
const { auditLogEventHandler } = require("container-common/src/helpers/websocket");
const { auditLog } = require("container-common/src/helpers/constant");
const log = require("electron-log");
const { app, Notification } = require("electron");
const exec = require("child_process").exec;
const { BrowserWindow } = require("electron");
log.transports.file.level = "trace";
let updaterInterval;
export async function initAutoUpdater(networkId) {
  let currentVersion = await dbService.getData("currentVersion");
  let latestVersion = app.getVersion();
  if (currentVersion !== undefined && currentVersion !== latestVersion) {
    await dbService.setData("currentVersion", latestVersion);
    auditLogEventHandler(auditLog.CONTAINER_UPDATED, latestVersion);
    const notification = new Notification({
      title: "Container updated !",
      body: `Successfully updated to new version v${latestVersion}`,
    });
    notification.show();
  } else {
    await dbService.setData("currentVersion", latestVersion);
  }
  autoUpdater.logger = log;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  let configData = await dbService.getData(`configData_${networkId}`);
  configData = JSON.parse(configData);
  const containerUpdateUrl = configData?.containerUpdateUrl;
  const containerUpdateInterval = (configData?.containerUpdateInterval ?? 900) * 1000;
  console.log("Update container url ", containerUpdateUrl);
  try {
    if (containerUpdateUrl?.length) {
      autoUpdater.setFeedURL({ url: containerUpdateUrl, provider: "generic" });
      autoUpdater.checkForUpdates();
      clearInterval(updaterInterval);
      updaterInterval = setInterval(async () => {
        autoUpdater.checkForUpdates();
      }, containerUpdateInterval);
    }
  } catch (err) {
    console.log("Error : ", err);
  }
}
let command = `reg query "HKEY_LOCAL_MACHINE\\SOFTWARE" /s /f "InsiteflowDesktop.exe"`;
exec(command, (error, stdout, stderr) => {
  if (error) {
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }

  const lines = stdout.split("\n");
  let installed = "unknown";

  for (const line of lines) {
    if (line.includes("/allusers")) {
      installed = "allusers";
      break;
    } else if (line.includes("/currentuser")) {
      installed = "currentuser";
      break;
    }
  }
  console.log(`Installed scope: ${installed}`);
  dbService.setData("installed_scope", installed);
});

autoUpdater.on("update-available", (info) => {
  console.log(`Update available, downloading update...`, info);
  autoUpdater.downloadUpdate();
});

autoUpdater.on("update-not-available", (info) => {
  console.log(`No update available`);
});

autoUpdater.on("download-progress", (progressObj) => {
  console.log(`Download speed: ${progressObj.bytesPerSecond}`);
  console.log(`Downloaded ${progressObj.percent}%`);
});

autoUpdater.on("update-downloaded", (info) => {
  console.log(`Update downloaded`);
  triggerUpdate();
});

function getContainerState() {
  return new Promise((resolve, reject) => {
    setInterval(async () => {
      let providerId = await accountService.getData("providerId");
      let networks = await accountService.getData("networks");
      networks = JSON.parse(networks);
      networks.forEach(async networkId => {
        let viewportState = await accountService.getData(
          `viewportState_${networkId}_${providerId}`
        );
        viewportState = (viewportState !== undefined) ? viewportState : false;
        if (!viewportState) {
          resolve(true);
        }
        else {
          resolve(false);
        }
      });
    }, 10000)
  })
}

let triggerInterval;
async function triggerUpdate() {
  const timeInterval = 60000;
  let installedScope = await dbService.getData("installed_scope");
  console.log("Installed scope is ", installedScope);
  triggerInterval = setInterval(async () => {
    let status = await getContainerState();
    console.log("Container status is ",status);
    if (
      status &&
      (installedScope === "currentuser" ||
        installedScope === "unknown" ||
        installedScope === undefined)
    ) {
      console.log(" No windows open, triggering auto updater ");
      clearInterval(triggerInterval);
      clearInterval(updaterInterval);
      autoUpdater.quitAndInstall(true, true);
    }
  }, timeInterval);
}
autoUpdater.on("error", (info) => {
  console.log(info);
});
