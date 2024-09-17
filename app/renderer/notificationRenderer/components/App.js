import React from "react";
const remote = require("@electron/remote");
import { ipcRenderer } from "electron";
import Toast from "container-common/src/components/Toast";
let mainProcess = remote.require("../main");
const App = ({ content }) => {
	const configData = {
		fontSize: content["properties[fontSize]"],
		width: content["properties[width]"],
		height: content["properties[height]"],
		x: content["properties[x]"],
		y: content["properties[y]"],
		color: content["properties[color]"],
		backgroundColor: content["properties[backgroundColor]"],
		networkId: content["properties[networkId]"],
		eventExpiryTimeout: content?.eventExpiryTimeout,
	};
	const notificationData = {
		icon: content["notificationData[icon]"],
		title: content["notificationData[title]"],
		description: content["notificationData[description]"],
	};
	const handleClose = (type) => {
		if (!type) type = "notification_closed";
		ipcRenderer.send("close-notification", { type, networkId: configData.networkId });
	};
	let expiryTimeout = (configData.eventExpiryTimeout ?? 600) * 1000;
	setTimeout(() => {
		handleClose("context_expired");
	}, expiryTimeout);

	function openViewport() {
		let launchContent = {
			"get-counts-for-user-context": { count: content?.count },
			url: content.url,
			maximize: true,
			networkId: configData.networkId,
		};
		mainProcess.notificationService.publish("container-launch", JSON.stringify(launchContent));
		handleClose("notification_acknowledged");
	}

	return (
		<Toast
			type="desktop"
			toastConfig={configData}
			toastContext={notificationData}
			showToast={true}
			handleToastAck={openViewport}
			handleToastClose={handleClose}
		/>
	);
};

export default App;
