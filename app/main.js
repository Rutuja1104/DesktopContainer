const { app, ipcMain, remote: defaultRemote, Notification } = require("electron");
const remote = require("@electron/remote/main");
remote.initialize();
const pipe = require("lodash/fp/flow");
const args = require("minimist")(process.argv.slice(2));
const console = require("console");
const log = require("electron-log");
const { spawn } = require("child_process");
const { AccountServiceFactory } = require("./data/accountService");
const {
	setEnvironmentVariables,
	initSentry,
	initCommonInstance,
	databaseHandler,
	initMixpanel,
	sendToMixpanel,
} = require("container-common/src/helpers/common-helper");
const { containerTypes, operationTypes, auditLog } = require("container-common/src/helpers/constant");
const Sentry = require("@sentry/electron");
const Mixpanel = require("mixpanel");
const { NotificationServiceFactory } = require("./notification/notificationService");
const { EnablementKeyManager } = require("./containerManager/enablementKeyManager");
const { getEventsOptions, rendererAuditEvents, DEFUALT_CONTENT } = require("./utils/constants");
const { accountService } = require("./data/levelService");
const { getOptions, getConfig } = require("./utils/validations");
const qs = require("qs");
const { initAutoUpdater } = require("./utils/auto-updater");
const { initListener } = require("./utils/eneblement-key-listener");
const { NotificationManager } = require("./containerManager/notificationManager");
const { ViewportController } = require("./containerManager/viewportController");
const { confirmHeadlessContainer } = require("./utils/headless-container");
app.disableHardwareAcceleration();
app.console = new console.Console(process.stdout, process.stderr);
const validateConfigInput = pipe();
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
	console.log("Another instance is running so closing this one ");
	app.quit();
}

if (process.platform === "win32") {
	app.setAppUserModelId(app.name);
}
accountService.initData();
initCommonInstance(containerTypes.DESKTOP, accountService);
console.log("Version: ", app.getVersion());
log.catchErrors();
const { initWebSocket, auditLogEventHandler, eventServices } = require("container-common/src/helpers/websocket");
const { checkEnablement } = require("container-common/src/helpers/enablementkey-helper");
const { customLogger } = require("container-common/src/helpers/container-logger");
const { startApiListner, stopApiListener } = require("container-common/src/helpers/api-listner");
const notificationService = NotificationServiceFactory();

async function startContainer() {
	const details = await accountService.getData("enablementKey");
	if (!details) {
		initListener(notificationService);
	} else {
		console.log("EVENT : Connecting websocket");
		await setEnvironmentVariables();
		initMixpanel(Mixpanel);
		initSentry(Sentry);
		eventServices(notificationService);
		initWebSocket();
		customLogger();
		let isHeadless = false;
		notificationService.on("config-updated", async (configuration) => {
			let alwaysOn = configuration.layout?.viewport?.alwaysOn;
			const receivedConfig = getConfig(getOptions(args), configuration);
			let options = validateConfigInput(receivedConfig);
			let networkId = configuration.networkId;
			let primaryNetworkId = await accountService.getData("primaryNetwork");
			primaryNetworkId = JSON.parse(primaryNetworkId);
			if (primaryNetworkId === networkId) {
				initAutoUpdater(networkId);
				if (configuration?.headlessContainer) {
					isHeadless = await confirmHeadlessContainer(configuration?.headlessContainer);
					if (isHeadless) {
						options.headless = true;
						try {
							let networks = await accountService.getData("networks");
							networks = JSON.parse(networks);
							networks.map((network) => {
								if (currentContainer[network]) {
									ipcMain.removeAllListeners(`closeSidecar_${network}`);
									ipcMain.removeAllListeners(`openSidecar_${network}`);
									currentContainer[network].quit();
									delete currentContainer[network];
								}
							});
							if (configuration?.data?.allowedContext?.system?.properties?.contextApi) {
								startApiListner(
									configuration?.data?.allowedContext?.system?.properties?.contextApi,
									notificationService
								);
							} else {
								stopApiListener();
								const eventsOptions = getEventsOptions(options?.integration);
								AccountServiceFactory(options, notificationService, eventsOptions);
							}
						} catch (err) {
							console.log(err);
						}
					}
				} else {
					isHeadless = false;
					try {
						const eventsOptions = getEventsOptions(options?.integration);
						AccountServiceFactory(options, notificationService, eventsOptions);
					} catch (err) {
						console.log(err);
					}
				}
			}
			if (!isHeadless && alwaysOn && !currentContainer?.[networkId]) {
				let defaultContent = JSON.stringify({
					alwaysOn,
					networkId,
					fromNotification: true,
					...DEFUALT_CONTENT,
				});
				notificationService.publish("container-launch", defaultContent);
			}
			if (currentContainer?.[networkId]) {
				currentContainer[networkId].sendData(`config-updated-${networkId}`, configuration);
				notificationService.publish(`config-updated-${networkId}`, JSON.stringify(configuration));
			}
		});
	}
}

app.on("window-all-closed", () => {});

app.on("ready", async () => {
	app.quitWhenAllWindowsClosed = false;
	await startContainer();
});
let currentContainer = {};
notificationService.on("container-launch", async (content) => {
	if (content) {
		let networkId = content.networkId;
		try {
			if (content?.notificationData) {
				notificationService.publish("show-notification", JSON.stringify(content));
			}
			if (!currentContainer?.[networkId]) {
				if (content.url || content?.alwaysOn) {
					let configuration = await accountService.getData(`configData_${networkId}`);
					configuration = JSON.parse(configuration);
					const receivedConfig = getConfig(getOptions(args), configuration);
					let config = validateConfigInput(receivedConfig);
					// let providerId = await accountService.getData("providerId");
					let providerId = "abc"; // static for the demo
					let coordinate = await accountService.getData(`coordinate_viewport_${networkId}_${providerId}`);
					if (coordinate !== undefined) {
						coordinate = JSON.parse(coordinate);
					} else {
						coordinate = {
							x: 2,
							y: 2,
						};
					}
					let viewportState = await accountService.getData(`viewportState_${networkId}_${providerId}`);
					viewportState = viewportState !== undefined ? JSON.parse(viewportState) : true;
					config.viewportState = content?.maximize ?? viewportState;
					config = { ...config, coordinate };
					const layout = qs.stringify({ ...config, ...content });
					const viewportProperties = config?.layout?.viewport?.properties;
					let height = viewportProperties?.viewportHeight + viewportProperties?.tabHeightWithViewport;
					let width = viewportProperties?.viewportWidth + viewportProperties?.tabWidthWithViewport;
					currentContainer[networkId] = new ViewportController(
						width,
						height,
						coordinate,
						providerId,
						networkId,
						notificationService
					);
					currentContainer[networkId].load(`${CONTAINER_WINDOW_WEBPACK_ENTRY}?config=${layout}`);
					currentContainer[networkId].open();
					sendToMixpanel(rendererAuditEvents.VIEWPORT_OPEN);
				}
			} else {
				console.log("container already launch, replacing content");
				if (content.url) {
					auditLogEventHandler(rendererAuditEvents.VIEWPORT_SWITCH, networkId, networkId);
					sendToMixpanel(rendererAuditEvents.VIEWPORT_SWITCH);
				} else {
					auditLogEventHandler(rendererAuditEvents.VIEWPORT_RESET, networkId, networkId);
					sendToMixpanel(rendererAuditEvents.VIEWPORT_RESET);
				}
				currentContainer[networkId].open();
				currentContainer[networkId].sendData("container-launch", content);
			}
		} catch (err) {
			console.log("ERROR : Unable to launch container :", err);
			delete currentContainer[networkId];
			notificationService.publish("container-launch", JSON.stringify(content));
		}
	}
});
ipcMain.on("close-container", async (event, details) => {
	let networkId = details?.networkId;
	if (details.alwaysOn === true) {
		let maximize = false;
		let defaultContent = JSON.stringify({
			alwaysOn,
			maximize,
			networkId,
			...DEFUALT_CONTENT,
		});
		notificationService.publish("container-launch", defaultContent);
	} else {
		currentContainer[networkId].close();
		sendToMixpanel(rendererAuditEvents.VIEWPORT_QUIT);
		currentContainer[networkId] = null;
		let providerId = await accountService.getData("providerId");
		await accountService.setData(`viewportState_${networkId}_${providerId}`, details.viewportState);
	}
	if (details?.isExpired) {
		sendToMixpanel(rendererAuditEvents.CONTEXT_EXPIRED);
		auditLogEventHandler(rendererAuditEvents.CONTEXT_EXPIRED, networkId, networkId);
	}
});

notificationService.on("network-removed", (network) => {
	let networkId = network.networkId;
	if (currentContainer[networkId]) {
		ipcMain.removeAllListeners(`closeSidecar_${networkId}`);
		ipcMain.removeAllListeners(`openSidecar_${networkId}`);
		currentContainer[networkId].quit();
		delete currentContainer[networkId];
	}
	if (notificationManager[networkId]) {
		notificationManager[networkId].quit();
		delete currentContainer[networkId];
	}
});

notificationService.on("organization-removed", async () => {
	let installedScope = await databaseHandler(operationTypes.GET, "installed_scope");
	if (installedScope === "currentuser") {
		console.log("Uninstalling the container");
		const command = `start /wait "" "Uninstall InsiteflowDesktop.exe" /S`;
		const uninstallProcess = spawn(command, { shell: true });

		uninstallProcess.stdout.on("data", (data) => {
			console.log(`stdout: ${data}`);
		});

		uninstallProcess.stderr.on("data", (data) => {
			console.error(`stderr: ${data}`);
		});

		uninstallProcess.on("close", (code) => {
			console.log(`child process exited with code ${code}`);
		});
	} else if (installedScope === "allusers") {
		await databaseHandler(operationTypes.SET, "removedOrg", payload.organizationId);
	}
	app.quit();
});

notificationService.on("logout", (event) => {
	if (currentContainer) {
		currentContainer.close();
		currentContainer = null;
	}
});

let notificationManager = {};
notificationService.on("show-notification", async (content) => {
	let networkId = content.networkId;
	let configuration = await accountService.getData(`configData_${networkId}`);
	configuration = JSON.parse(configuration);
	configuration.layout.notifications.eventExpiryTimeout = configuration?.eventExpiryTimeout;
	configuration = configuration.layout.notifications;
	configuration.properties.networkId = networkId;
	let notificationCoordinate = await accountService.getData(`coordinate_notification_${networkId}`);
	if (notificationCoordinate !== undefined) {
		notificationCoordinate = JSON.parse(notificationCoordinate);
	} else {
		notificationCoordinate = {
			x: 2,
			y: 2,
		};
	}
	if (content) {
		if (!notificationManager?.[networkId]) {
			notificationManager[networkId] = NotificationManager(notificationCoordinate, configuration);
		} else {
			console.log("EVENT : notification quiting");
			notificationManager[networkId].quit();
			notificationManager[networkId] = NotificationManager(notificationCoordinate, configuration);
		}
		if (currentContainer?.[networkId]) {
			let providerId = "abc";
			let viewportState = await accountService.getData(`viewportState_${networkId}_${providerId}`);
			viewportState = viewportState !== undefined ? JSON.parse(viewportState) : true;
			if (!viewportState) {
				content = { ...content, ...configuration };
				let launchContent = {
					"get-counts-for-user-context": { count: content?.count },
					url: content.url,
					maximize: false,
					fromNotification: true,
					networkId,
				};
				notificationService.publish("container-launch", JSON.stringify(launchContent));
				content = qs.stringify(content);
				notificationManager[networkId].show(`${NOTIFICATION_WINDOW_WEBPACK_ENTRY}?content=${content}`);
				auditLogEventHandler(rendererAuditEvents.NOTIFICATION_DISPLAYED, networkId, networkId);
				sendToMixpanel(rendererAuditEvents.NOTIFICATION_DISPLAYED);
			} else {
				let launchContent = {
					"get-counts-for-user-context": { count: content?.count },
					url: content.url,
					maximize: false,
					networkId,
				};
				notificationService.publish("container-launch", JSON.stringify(launchContent));
				auditLogEventHandler(rendererAuditEvents.NOTIFICATION_SKIPPED, networkId, networkId);
				sendToMixpanel(rendererAuditEvents.NOTIFICATION_SKIPPED);
			}
		} else {
			content = { ...content, ...configuration };
			content = qs.stringify(content);
			notificationManager[networkId].show(`${NOTIFICATION_WINDOW_WEBPACK_ENTRY}?content=${content}`);
			auditLogEventHandler(rendererAuditEvents.NOTIFICATION_DISPLAYED, networkId, networkId);
			sendToMixpanel(rendererAuditEvents.NOTIFICATION_DISPLAYED);
		}
	}
});
ipcMain.on("close-notification", (event, content) => {
	let networkId = content.networkId;
	notificationManager[content.networkId].quit();
	notificationManager[content.networkId] = undefined;
	if (content.type === rendererAuditEvents.NOTIFICATION_ACKNOWLEDGED) {
		auditLogEventHandler(rendererAuditEvents.NOTIFICATION_ACKNOWLEDGED, content.networkId, content.networkId);
		sendToMixpanel(rendererAuditEvents.NOTIFICATION_ACKNOWLEDGED);
	} else if (content.type === rendererAuditEvents.NOTIFICATION_DISMISSED) {
		auditLogEventHandler(rendererAuditEvents.NOTIFICATION_DISMISSED, content.networkId, content.networkId);
		sendToMixpanel(rendererAuditEvents.NOTIFICATION_DISMISSED);
	} else if (content.type === rendererAuditEvents.CONTEXT_EXPIRED) {
		auditLogEventHandler(rendererAuditEvents.NOTIFICATION_DISMISSED, content.networkId, content.networkId);
		sendToMixpanel(rendererAuditEvents.NOTIFICATION_DISMISSED);
		sendToMixpanel(rendererAuditEvents.CONTEXT_EXPIRED);
		auditLogEventHandler(rendererAuditEvents.CONTEXT_EXPIRED, networkId, networkId);
	}
});

notificationService.on("check-enablement-path", async (content) => {
	try {
		await checkEnablement(content);
		await startContainer();
		const notification = new Notification({
			title: "Successful",
			body: "Container enabled",
		});
		notification.show();
		auditLogEventHandler(auditLog.ENABLEMENTKEY_SUCCESS, content?.enablementKey);
	} catch (err) {
		console.log("ERROR :  ", err);
		const notification = new Notification({
			title: "Enablement key failed",
			body: `Please try again !`,
		});
		notification.show();
		EnablementKeyManager().show(ENABLEMENT_KEY_WINDOW_WEBPACK_ENTRY);
	}
});

ipcMain.on("check-enablement", async (event, content) => {
	notificationService.publish("check-enablement-path", JSON.stringify(content));
});

ipcMain.on("auth-success", async (event, content) => {
	if (content) {
		await startContainer();
	}
});

app.on("browser-window-created", (_, window) => {
	remote.enable(window.webContents);
	// window.webContents.openDevTools({
	// 	mode: "detach",
	// });
});

module.exports = {
	notificationService,
	currentContainer,
};
