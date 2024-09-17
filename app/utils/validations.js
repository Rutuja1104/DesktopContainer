const { CERNER_INTEGRATION, EPIC_INTEGRATION, AES_128, AES_256 } = require("./constants");
const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const { decryptData } = require("../data/decryptionService");
const pipe = require("lodash/fp/flow");
function validateRequiredArgs(args) {
  const ecPath = args["path"];
  return ecPath !== undefined ? ecPath : false;
}

function getOptions(args) {
  const facilityId = args["if-facility-id"];
  const facilitySecret = args["if-facility-secret"];
  const ecPath = args["path"];
  const ecKey = args["ec-key"];
  const ecAlgorithm = args["ec-algorithm"];
  const integration = args.integration;
  const encryptedPath = args["_"] ? args["_"][0] : null;
  const debugApp = args["debug-app"] ?? null;
  const debugClient = args["debug-client"] ?? null;
  const logPath = args["log-path"] ?? null;
  const dbPath = args["db-path"] ?? null;
  const layout = args["layout"];
  const containerUpdateUrl = args["containerUpdateUrl"] ?? null;
  const eventLaunchUrls = args["eventLaunchUrls"];
  const contextPath = args["contextPath"];
  const contextFolderTemplate = args["contextFolderTemplate"] ?? null;
  const headlessContainer = args["headlessContainer"] ?? null;
  const eventExpiryTimeout = args["eventExpiryTimeout"] ?? null;

  return {
    facilityId,
    facilitySecret,
    ecPath,
    ecKey,
    ecAlgorithm,
    integration,
    encryptedPath,
    logPath,
    dbPath,
    debugApp,
    debugClient,
    layout,
    containerUpdateUrl,
    eventLaunchUrls,
    contextPath,
    contextFolderTemplate,
    headlessContainer,
    eventExpiryTimeout,
  };
}

const resolver = (...args) => JSON.stringify([...args]);

const getConfigMemo = _.memoize(getConfig, resolver);

function getConfig(options, configDetails) {
  if (configDetails && Object.keys(configDetails)?.length > 0) {
    const configOptions = {
      ecAlgorithm: configDetails?.data?.allowedContext?.system?.properties?.epicContextAlgorithm,
      integration: configDetails?.data?.allowedContext?.system.name,
      ecKey: configDetails?.data?.allowedContext?.system?.properties?.epicContextKey,
      ecPath: configDetails?.data?.allowedContext?.system?.properties?.epicContextPath,
      contextPath: configDetails?.data?.allowedContext?.system?.properties?.contextPath,
      contextFolderTemplate: configDetails?.data?.allowedContext?.system?.properties?.contextFolderTemplate,
      encryptedPath: configDetails?.data?.allowedContext?.system?.properties?.encryptedPath,
      logPath: configDetails?.data?.allowedContext?.system?.properties?.logPath,
      facilityId: configDetails?.data?.allowedContext?.accountId,
      facilitySecret: configDetails?.data?.allowedContext?.system?.properties?.facilitySecret,
      uiWindowPositionX: configDetails?.layout?.viewport?.properties?.x,
      uiWindowPositionY: configDetails?.layout?.viewport?.properties?.y,
      uiWindowSizeX: configDetails?.layout?.viewport?.properties?.height,
      uiWindowSizeY: configDetails?.layout?.viewport?.properties?.width,
      debugApp: configDetails?.debugApp ?? null,
      containerUpdateUrl: configDetails?.containerUpdateUrl,
      layout: configDetails?.layout,
      textColor: configDetails?.layout?.viewport?.properties?.textColor,
      backgroundColor: configDetails?.layout?.viewport?.properties?.backgroundColor,
      eventLaunchUrls: configDetails?.launch?.eventLaunchUrls,
      headlessContainer: configDetails?.headlessContainer,
      eventExpiryTimeout: configDetails?.eventExpiryTimeout,
    };

    let mergedOptions = {};
    Object.keys(configOptions).forEach((key) => {
      if (options[key] !== undefined && options[key] !== null) {
        mergedOptions[key] = options[key];
      } else {
        mergedOptions[key] = configOptions[key];
      }
    });
    options = mergedOptions;
  } else {
    console.log("no config file found!");
  }
  const addHooks = pipe(isEpicIntegrationEnabled(EPIC_INTEGRATION), isCernerIntegrationEnabled(CERNER_INTEGRATION));
  options = addHooks(options);

  if (options.encryptedPath && options.isEpicIntegrationEnabled()) {
    validateEncryptionKey(options);
    validateAlgorithm(options);
    console.log("Decrypting string: " + options.encryptedPath);
    let rawPath = decryptData(options.encryptedPath, options.ecKey, options.ecAlgorithm, true);
    let basePath = rawPath.split("=")[1];
    options.ecPath = path.resolve(basePath, "out");
    if (!fs.existsSync(options.ecPath)) {
      try {
        fs.mkdirSync(options.ecPath);
      } catch (e) {}
    }
    options.dbPath = path.resolve(basePath, "db");
    if (!fs.existsSync(options.dbPath)) {
      fs.mkdirSync(options.dbPath);
    }
    console.log("Checking for XML files in: " + options.ecPath);
  }
  return options;
}

function validateEncryptionKey(options) {
  if (options.isEpicIntegrationEnabled() && !options.ecKey) {
    throw new Error("ec-key path parameter or epicContextKey config.json parameter is required.");
  }
  return { ...options };
}

function validateEncryptedPath(options) {
  const { contextPath, contextFolderTemplate, isEpicIntegrationEnabled } = options;
  if (isEpicIntegrationEnabled() && !contextPath && !contextFolderTemplate) {
    throw new Error("encrypted path as first arg, ec-path arg or epicContextPath config.json parameter is required.");
  }
  return { ...options };
}

function validateAlgorithm(options) {
  const { ecAlgorithm } = options;
  const validOptions = [AES_128, AES_256];

  const valid = validOptions.includes(ecAlgorithm);
  if (valid) {
    return { ...options };
  }
  throw new Error("Supported ecAlgorithm options are " + validOptions.join(", "));
}

function validateIntegration(options) {
  const { integration } = options;
  const validOptions = [CERNER_INTEGRATION, EPIC_INTEGRATION];

  const valid = validOptions.includes(integration);
  if (valid) {
    return { ...options };
  }
  console.error("Supported integration options are " + validOptions.join(", "));
}

const isEpicIntegrationEnabled = (option) => (o) => {
  return {
    ...o,
    isEpicIntegrationEnabled: () => o.integration.toLowerCase() === option,
  };
};

const isCernerIntegrationEnabled = (option) => (o) => {
  return {
    ...o,
    isCernerIntegrationEnabled: () => o.integration.toLowerCase() === option,
  };
};

const required = (key) => (options) => {
  if (options[key]) {
    return { ...options };
  }
  throw new Error(`${key} is required`);
};

module.exports = {
  required,
  isCernerIntegrationEnabled,
  isEpicIntegrationEnabled,
  validateEncryptionKey,
  validateIntegration,
  validateAlgorithm,
  validateEncryptedPath,
  getOptions,
  getConfig,
  getConfigMemo,
  validateRequiredArgs,
};
