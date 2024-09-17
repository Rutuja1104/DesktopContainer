const { EpicLoginFileListener } = require("./epicLoginFileListener");

async function AccountServiceFactory(
  options,
  notificationService,
  eventOptions
) {
  switch (options.integration) {
    case "epic":
      let epicListener = EpicLoginFileListener(
        options.contextPath,
        options.contextFolderTemplate,
        options.ecAlgorithm,
        options.ecKey,
        options.ecPath,
        options.EventFileEncryptionUsesIV,
        notificationService,
        eventOptions,
        options?.headless
      );
      return await epicListener.start();

    case "cerner":
      break;
    default:
      console.warn("Unknown system integreation value", options.integration);
  }
}

module.exports = { AccountServiceFactory };
