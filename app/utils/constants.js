let os = require("os");

const epicOptions = {
  login: "provider_login",
  patientOpen: "patientOpen",
  patientClose: "PatientClose",
  patientSwitch: "PatientSwitch",
  logout: "provider_logout",
};

const cernerOptions = {
  login: "Login",
  patientOpen: "chart-open",
  patientClose: "chart-close",
  patientSwitch: "chart-switch",
  logout: "logout",
};

const appEvents = {
  login: "provider_login",
  logout: "provider_logout",
  providerView: "provider_view",
  patientView: "patient_view",
  patientChartView: "patient_chart_view",
  patientEncounterView: "patient_encounter_view",
};

function getEventsOptions(integration) {
  const isEpic = integration === "epic";

  return {
    login: isEpic ? epicOptions.login : cernerOptions.login,
    patientOpen: isEpic ? epicOptions.patientOpen : cernerOptions.patientOpen,
    patientClose: isEpic ? epicOptions.patientClose : cernerOptions.patientClose,
    logout: isEpic ? epicOptions.logout : cernerOptions.logout,
    patientSwitch: isEpic ? epicOptions.patientSwitch : cernerOptions.patientSwitch,
  };
}

const getDeviceId = (isNotMac) => (options) => {
  if (isNotMac()) {
    return { ...options, deviceId: process.env.COMPUTERNAME };
  }
  return { ...options, deviceId: os.hostname() };
};

const CERNER_INTEGRATION = "cerner";
const EPIC_INTEGRATION = "epic";
const AES_128 = "AES-128";
const AES_256 = "AES-256";

const VIEWPORT = "viewport";
const WSPAYLOAD = "https://insiteflow.io/ws-payload";
const WSNETWORKID = "https://insiteflow.io/ws-networkId";
const WSEVENT = "https://insiteflow.io/ws-event";
const WSID = "https://insiteflow.io/ws-id";
const WSTS = "https://insitefow.io/ws-ts";
const WSPRALLEL = "https://insiteflow.io/ws-parallel";
const WSMETADATA = "https://insiteflow.io/ws-metadata";
const DEFAULT_CONFIGURATION = "default_config";
const UPDATED_CONFIGURATION = "updated_config";
const CONFIGURATION_UPDATED = "config_updated";
const USER_CONTEXT = "user_context";
const CONTAINER_LAUNCH = "container_launch";
const REMOVED_CONFIG = "removed_config";
const USER_CONTEXT_DISCOVERED = "user_context_discovered";
const AUDIT_LOG = "audit_logs";
const ENABLEMENTKEY_SUCCESS = "enablementkey_successful";
const ENABLEMENTKEY_DISCOVERED = "enablementkey_discovered";
const WEBSOCKET_CONNECTED = "websocket_connected";
const CONTAINER_UPDATED = "container_updated";
const NETWORK_CONFIG_NOT_FOUND = "network_config_not_found";
const NO_OP = "No_Op";
const webSocketEvents = {
  FOUND_XML: "found_xml",
  UNAUTHORIZED: "Server responded with a non-101 status: 401 Unauthorized",
  BAD_GATEWAY: "Server responded with a non-101 status: 502 Bad Gateway",
};
const CONTAINER_CLOUDWATCH_LOGS = "containers_cloudwatch_logs";

const rendererAuditEvents = {
  VIEWPORT_MAXIMIZE: "viewport_maximize",
  VIEWPORT_MINIMIZE: "viewport_minimize",
  VIEWPORT_OPEN: "viewport_open",
  VIEWPORT_SWITCH: "viewport_switch",
  VIEWPORT_RESET: "viewport_reset",
  VIEWPORT_DRAG: "viewport_drag",
  VIEWPORT_CLOSE: "viewport_close",
  VIEWPORT_QUIT: "viewport_quit",
  NOTIFICATION_DISPLAYED: "notification_displayed",
  NOTIFICATION_ACKNOWLEDGED: "notification_acknowledged",
  NOTIFICATION_DISMISSED: "notification_dismissed",
  NOTIFICATION_SKIPPED: "notification_skipped",
  NOTIFICATION_CLOSED: "notification_closed",
  CONTEXT_EXPIRED: "context_expired",
};

function isNotMac() {
  return process.platform !== "darwin";
}

const EPIC = "epic";
const CERNER = "cerner";
const ARTIFACT = "artifact";
const GORILLA = "healthgorilla";
const MILLIMAN = "milliman";

const PATIENT_STACK_MAX = 5;
const DEFUALT_CONTENT = {
  "get-counts-for-user-context": { count: 0 },
  url: "",
};
const CONFIG_DETAILS = {
  layout: {
    viewport: {
      alwaysOn: true,
      showCounts: true,
      properties: {
        tabWidth: 115,
        tabHeight: 35,
        tabWidthWithViewport: 28,
        tabHeightWithViewport: 75,
        tabBackgroundColor: "#fff",
        viewportWidth: 365,
        viewportHeight: 500,
        x: "",
        y: "",
        icon: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRuVcgWQT7mrjvBK36n3v36mdFZCz6r8JZrK6_MC2uc8A&s",
      },
    },
    notifications: {
      enabled: true,
      properties: {
        top: "46em",
        fontSize: "18px",
        paddingTop: "30px",
        paddingBottom: "30px",
        borderLeft: "solid 5px rgb(52, 152, 219)",
        width: 320,
        height: 120,
        x: "",
        y: "",
      },
    },
  },
  launch: {
    tokenAudience: "https://babylonhealth.com/sidecar",
    endpointUrl: "https://stage-fhir.insiteflow.com/api/v1",
    eventLaunchUrls: {
      provider_login: "https://staging-interact.iodinesoftware.com/context/6321ccab543c6404be58998d/1?token=",
      provider_logout: "",
      provider_view: "https://staging-interact.iodinesoftware.com/context/6321ccab543c6404be58998d/1?token=",
      patient_view: "https://staging-interact.iodinesoftware.com/context/6321ccab543c6404be58998d/1?token=",
      patient_chart_view: "https://staging-interact.iodinesoftware.com/context/6321ccab543c6404be58998d/1?token=",
      patient_encounter_view: "https://staging-interact.iodinesoftware.com/context/6321ccab543c6404be58998d/1?token=",
      template: "{base}?sso_token={jwe}",
    },
  },
  data: {
    allowedContext: {
      system: {
        name: "epic",
        properties: {
          epicContextAlgorithm: "AES-128",
          facilitySecret: "ht5KM4E5ZAdnM5VweH8V",
          epicContextPath: "C:/Users/TTPL-LNV-024/Documents/insiteflowdesktop_main/desktop-app-container/test/out",
          contextPath: "/home/lnv-75/Documents/insiteFlow/desktop-app-container-main/desktop-app-container/test/out",
          contextFolderTemplate: "{machine-id}-{practitioner-id}",
          logPath: "/home/lnv/Project/InsiteFlow/Main/new-repo/desktop-app-container/test/debug.log",
          epicContextKey: "+f6f7IYiW0TqNSXOK9aDlw==",
          containerUpdateUrl: "https://insiteflow-desktop-app-container.s3.amazonaws.com/main/latest/",
        },
      },
      accountId: "1d60f646-f1ce-4772-8ade-fb63894961aa",
      tenantIds: [],
      providerIds: [],
    },
    dataMappings: [
      {
        accountId: "19956",
        to: "A19956",
      },
      {
        tenantId: "66",
        to: "A66",
      },
      {
        tenantId: "26",
        to: "A26",
      },
      {
        tenantId: "2",
        to: "A2",
      },
      {
        providerId: "p-testing",
        to: "187569342",
      },
      {
        providerId: "p-testing-new",
        to: "165782439",
      },
    ],
  },
};

function getLayoutOptions(integration, layout) {
  const isEpic = integration === "epic";
  return isEpic ? layout : null;
}

module.exports = {
  epicOptions,
  cernerOptions,
  getEventsOptions,
  appEvents,
  CERNER_INTEGRATION,
  EPIC_INTEGRATION,
  AES_128,
  AES_256,
  EPIC,
  GORILLA,
  MILLIMAN,
  CERNER,
  ARTIFACT,
  isNotMac,
  PATIENT_STACK_MAX,
  getDeviceId,
  getLayoutOptions,
  CONFIG_DETAILS,
  VIEWPORT,
  WSPAYLOAD,
  WSEVENT,
  DEFAULT_CONFIGURATION,
  UPDATED_CONFIGURATION,
  USER_CONTEXT,
  AUDIT_LOG,
  ENABLEMENTKEY_SUCCESS,
  WEBSOCKET_CONNECTED,
  CONTAINER_UPDATED,
  webSocketEvents,
  USER_CONTEXT_DISCOVERED,
  WSID,
  WSTS,
  WSMETADATA,
  WSNETWORKID,
  CONTAINER_LAUNCH,
  DEFUALT_CONTENT,
  WSPRALLEL,
  rendererAuditEvents,
  CONFIGURATION_UPDATED,
  ENABLEMENTKEY_DISCOVERED,
  CONTAINER_CLOUDWATCH_LOGS,
  REMOVED_CONFIG,
  NETWORK_CONFIG_NOT_FOUND,
  NO_OP,
};
