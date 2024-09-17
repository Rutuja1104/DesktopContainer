const chokidar = require("chokidar");
const parser = require("xml-js");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { machineIdSync } = require("node-machine-id");
const { decryptData } = require("./decryptionService");
const { wsEvents } = require("container-common/src/helpers/constant");
const {
  notificationMessage,
  notificationDetail,
  notification,
} = require("../notification/notification");
const { USER_CONTEXT_DISCOVERED, appEvents } = require("../utils/constants");
const { accountService } = require("./levelService");
const {
  auditLogEventHandler,
} = require("container-common/src/helpers/websocket");
async function parseIds(inputString) {
  const pattern = /\{([^}]+)\}/g;
  const matches = inputString.match(pattern);
  let containerDetails = await accountService.getData("container_details");
  containerDetails = JSON.parse(containerDetails);
  if (!matches) {
    return [];
  }
  function getKeyValues(id) {
    switch (id) {
      case "machine-id":
        return machineIdSync(true);
      case "username":
        return containerDetails.username;
      default:
        return "";
    }
  }
  const idArray = matches.map((match) => match.slice(1, -1));
  let valueFromId = idArray.map((id) => {
    return getKeyValues(id);
  });
  return valueFromId.join("-");
}

function checkPermissions(path) {
  return new Promise((resolve) => {
    fs.access(path, fs.constants.R_OK | fs.constants.W_OK, (err) => {
      if (err) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}
let watcher;
function EpicLoginFileListener(
  contextPath,
  contextFolderTemplate,
  ecAlgorithm,
  ecKey,
  ecPath,
  EventFileEncryptionUsesIV,
  notificationService,
  eventsOptions,
  headless
) {
  const EpicLoginFileListener = {
    async start() {
      if (
        ecPath ||
        (contextPath !== undefined &&
          (contextFolderTemplate !== "" || contextFolderTemplate !== undefined))
      ) {
        let containerXmlPath;
        let osType = os.type();
        contextPath = contextPath[osType];
        if (!ecPath) {
          let contextFolder = await parseIds(contextFolderTemplate);
          if (headless) containerXmlPath = path.resolve(contextPath);
          else containerXmlPath = path.resolve(contextPath, contextFolder);
        } else {
          containerXmlPath = path.resolve(ecPath);
        }
        let permission = await checkPermissions(path.dirname(containerXmlPath));
        if (!fs.existsSync(containerXmlPath)) {
          if (permission) {
            fs.mkdir(containerXmlPath, { recursive: true }, (err) => {
              if (err) {
                console.error("Error creating folder:", err);
              } else {
                console.log("Folder created successfully");
                this.initListener(containerXmlPath);
              }
            });
          } else {
            console.log(
              "Permission issue on path not able to create folder",
              containerXmlPath
            );
            this.initListener(containerXmlPath);
          }
        } else {
          console.log("Folder already exists");
          this.initListener(containerXmlPath);
        }
      }
    },
    deleteFile(filePath) {
      const MAX_RETRIES = 2;
      const RETRY_DELAY = 100;

      let attempt = 0;

      function attemptDelete() {
        try {
          fs.unlinkSync(filePath);
          console.log(`Successfully deleted: ${filePath}`);
        } catch (err) {
          if (err.code === "EBUSY" && attempt < MAX_RETRIES) {
            attempt++;
            console.log(
              `Retrying delete: ${filePath} (Attempt ${attempt}/${MAX_RETRIES})`
            );
            setTimeout(attemptDelete, RETRY_DELAY);
          } else {
            console.error(`Failed to delete file: ${filePath}`, err);
          }
        }
      }

      attemptDelete();
    },

    initListener(containerXmlPath) {
      if (watcher) {
        console.log("Watcher is already in progress ");
        watcher.close();
      }
      console.log("Started on", containerXmlPath);
      watcher = chokidar.watch(containerXmlPath);
      watcher.on("add", (xmlPath) => {
        setTimeout(() => {
          processXmlFile(xmlPath);
        }, 100);
      });
      const processXmlFile = (xmlPath) => {
        if (xmlPath.endsWith(".xml")) {
          console.log(
            `Found XML file: ${xmlPath}... Decrypting and processing.`
          );
          try {
            let xmlData = fs.readFileSync(xmlPath);
            this.deleteFile(xmlPath);
            const raw = decryptData(
              xmlData.toString(),
              ecKey,
              ecAlgorithm,
              EventFileEncryptionUsesIV
            );
            let machineName;
            if (headless) {
              let path = xmlPath.split(/[/\\]/);
              console.log("PATH ID ", path);
              machineName = path[path.length - 2].toLowerCase();
              console.log("MACHINE NAME IS ", machineName);
            }
            let data = this.parseXML(raw);
            auditLogEventHandler(USER_CONTEXT_DISCOVERED);
            this.handleNotification(raw, data.Event, machineName);
          } catch (err) {
            console.error("Error while parsing XML:", err);
            // if (xmlPath.endsWith(".xml")) fs.unlinkSync(xmlPath);
            this.start();
          }
        }
      };
    },
    async handleNotification(raw, type, machineName) {
      console.log("TYPE IS ", type);
      let msg = notificationMessage();
      let providerId = await accountService.getData("providerId");
      switch (type) {
        case eventsOptions.login:
          let data = this.parseXML(raw);
          let user;
          if (data.AuthenticationData) {
            console.log("Processing authentication data...");
            user = this.parseAuthData(data.AuthenticationData);
          }
          console.log("Initializing container for user...");
          if (machineName) {
            msg.message = notification({
              eventCode: type,
              providerId: user.providerId,
              machineName,
            });
          } else {
            msg.message = notification({
              eventCode: type,
              providerId: user.providerId,
            });
          }
          notificationService.publish(
            wsEvents.USER_CONTEXT,
            JSON.stringify(msg)
          );
          break;
        case eventsOptions.logout:
          let dataLogout = this.parseXML(raw);
          console.log("data for logout is ", dataLogout);
          let username;
          if (dataLogout.CurrentUser) {
            username = dataLogout.CurrentUser;
          }
          console.log("Processing logout for current user: " + username);
          if (username) {
            msg.message = notification({
              type,
              providerId: username,
              ehr: "epic",
            });
            notificationService.publish(
              wsEvents.USER_CONTEXT,
              JSON.stringify(msg)
            );
            notificationService.publish("logout", JSON.stringify(msg));
          }
          msg.message = notification({
            type,
          });
          notificationService.publish("logout", JSON.stringify(msg));
          break;
        case "PatientOpen":
          let patientOpenData = this.parseXML(raw);
          console.log("patientOpenData", patientOpenData);
          const result = this.parsePatient(raw);
          if (machineName) {
            msg.message = notification({
              providerId,
              eventCode: appEvents.patientView,
              patient: result,
              patientId: result.mrn,
              machineName,
            });
          } else {
            msg.message = notification({
              providerId,
              eventCode: appEvents.patientView,
              patient: result,
              patientId: result.mrn,
            });
          }
          notificationService.publish(
            wsEvents.USER_CONTEXT,
            JSON.stringify(msg.message)
          );

          break;
        case eventsOptions.patientSwitch:
          console.log("Doing patient switch...");
          let patient = this.parsePatient(raw);
          if (patient?.mrn) {
            if (machineName) {
              msg.message = notification({
                providerId,
                eventCode: appEvents.patientView,
                patient: { ehr: "epic", ...patient },
                patientId: patient.mrn,
                machineName,
              });
            } else {
              msg.message = notification({
                providerId,
                eventCode: appEvents.patientView,
                patient: patient,
                patientId: patient.mrn,
              });
            }
            notificationService.publish(
              wsEvents.USER_CONTEXT,
              JSON.stringify(msg)
            );
          }
          break;
        case eventsOptions.patientClose:
          if (machineName) {
            msg.message = notification({
              providerId,
              eventCode: "provider_login",
              patient: { ehr: "epic", ...tempPatient },
              patientId: tempPatient?.mrn,
              machineName,
            });
          } else {
            msg.message = notification({
              providerId,
              eventCode: "provider_login",
              patient: { ehr: "epic", ...tempPatient },
              patientId: tempPatient?.mrn,
            });
          }
          notificationService.publish(
            wsEvents.USER_CONTEXT,
            JSON.stringify(msg)
          );
          break;
        default:
          console.log("Unhandled event type: " + type);
          break;
      }
    },
    parsePatient(xmlData) {
      try {
        let result = notificationDetail();
        let parsedJson = parser.xml2json(xmlData, { compact: true, spaces: 4 });
        const xml = JSON.parse(parsedJson);
        let root = xml["EpicStudyData"];
        let eventVal = root["Event"]["_text"];
        if (
          eventVal == "PatientOpen" ||
          eventVal == "PatientClose" ||
          (eventVal == "PatientSwitch" && root["PatientID"])
        ) {
          result.mrn = root["PatientID"]?.["_text"] || "";
          result.dob = root["PatientBirthDate"]?.["_text"] || "";
          let nameParts = root["PatientName"]?.["_text"].split(",");
          if (nameParts) {
            result.lastname = nameParts[0];
            result.firstname = nameParts.slice(1).join(" ");
          }
        }
        result.ehr = "epic";
        return result;
      } catch (err) {
        console.log("ERROR ", err);
        return 0;
      }
    },
    parseXML: function (raw) {
      try {
        let parsedJson = parser.xml2json(raw, { compact: true, spaces: 4 });
        const xml = JSON.parse(parsedJson);
        let root = xml["EpicStudyData"];

        let eventVal = root["Event"]["_text"];
        console.log("PARSED XML IS ", root);
        if (eventVal === "Login" || eventVal === "Logout") {
          eventVal =
            eventVal === "Login" ? "provider_login" : "provider_logout";
          let authData, authInfo, currentUser;
          if (root["AuthenticationData"]) {
            authData = root["AuthenticationData"]["_text"];
          }
          if (root["AuthInfo"]) {
            authInfo = root["AuthInfo"]["_text"];
          }
          if (root["CurrentUser"]) {
            currentUser = root["CurrentUser"]["UserID"];
          }
          const result = {
            Event: eventVal,
            AuthenticationData: authData,
            AuthInfo: authInfo,
            CurrentUser: currentUser,
          };
          console.log("PROVIDER DATA ", result);
          return {
            Event: eventVal,
            AuthenticationData: authData,
            AuthInfo: authInfo,
            CurrentUser: currentUser,
          };
        }
        return { Event: eventVal, AuthenticationData: "", AuthInfo: "" };
      } catch (err) {
        console.log("Parse error is ", err);
        return {
          Event: "provider_login",
          AuthenticationData: "",
          AuthInfo: "",
        };
      }
    },
    parseAuthData: function (authData) {
      console.log("Processing auth data string: " + authData);
      let segments = authData.split("/");
      return { providerId: segments[1], password: segments[2] };
    },
  };
  return EpicLoginFileListener;
}
module.exports = { EpicLoginFileListener };
