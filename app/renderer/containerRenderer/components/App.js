import React, { useEffect, useState } from "react";
import { ipcRenderer } from "electron";
import Viewport from "container-common/src/components/Viewport";
const App = ({ config }) => {
	let defaultConfig = {
		alwaysOn: config["layout[viewport][alwaysOn]"] === "true",
		showCounts: config["layout[viewport][showCounts]"],
		tabWidthWithoutViewport: config["layout[viewport][properties][tabWidthWithoutViewport]"],
		tabHeightWithoutViewport: config["layout[viewport][properties][tabHeightWithoutViewport]"],
		tabWidthWithViewport: config["layout[viewport][properties][tabWidthWithViewport]"],
		tabHeightWithViewport: config["layout[viewport][properties][tabHeightWithViewport]"],
		tabBackgroundColor: config["layout[viewport][properties][tabBackgroundColor]"],
		viewportWidth: config["layout[viewport][properties][viewportWidth]"],
		viewportHeight: config["layout[viewport][properties][viewportHeight]"],
		icon: config["layout[viewport][properties][icon]"],
		count: config["get-counts-for-user-context[count]"],
		url: config.url,
		maximize: config?.maximize,
		networkId: config?.networkId,
		eventExpiryTimeout: config?.eventExpiryTimeout,
		fromNotification: config?.fromNotification,
	};
	let viewportState;
	if (!defaultConfig.maximize) {
		viewportState = config.viewportState === "true";
	} else {
		viewportState = defaultConfig.maximize;
	}
	let viewportIcon = false;
	if (!defaultConfig.fromNotification) {
		viewportIcon = true;
	}
	defaultConfig.showCounts = defaultConfig.showCounts === "true";
	const [newConfig, setNewConfig] = useState(defaultConfig);
	const [isOpenViewport, setIsOpenViewport] = useState(viewportState);
	const [blinkIcon, setBlinkIcon] = useState(viewportIcon);
	const [content, setContent] = useState({
		count: defaultConfig?.count,
		url: defaultConfig.url,
	});
	let timeInterval,
		eventExpiryTimeout = 600;

	ipcRenderer.on(`config-updated-${newConfig.networkId}`, (event, config) => {
		let latestConfig = {
			alwaysOn: config.layout.viewport.alwaysOn,
			showCounts: config.layout.viewport.showCounts,
			tabWidthWithViewport: config.layout.viewport.properties.tabWidthWithViewport,
			tabHeightWithoutViewport: config.layout.viewport.properties.tabHeightWithoutViewport,
			tabWidthWithoutViewport: config.layout.viewport.properties.tabWidthWithoutViewport,
			tabHeightWithViewport: config.layout.viewport.properties.tabHeightWithViewport,
			tabBackgroundColor: config.layout.viewport.properties.tabBackgroundColor,
			viewportWidth: config.layout.viewport.properties.viewportWidth,
			viewportHeight: config.layout.viewport.properties.viewportHeight,
			icon: config.layout.viewport.properties.icon,
			networkId: config?.networkId,
			eventExpiryTimeout: config?.eventExpiryTimeout,
			fromNotification: config?.fromNotification,
		};
		setNewConfig(latestConfig);
		eventExpiryTimeout = config?.eventExpiryTimeout;
	});

	ipcRenderer.on("container-launch", (event, content) => {
		let count = content["get-counts-for-user-context"]?.count;
		setContent({
			count: count,
			url: content.url,
			maximize: content.maximize,
		});
		if (content?.maximize) {
			setBlinkIcon(false);
		}
		if (content?.fromNotification && !content.fromNotification) {
			setBlinkIcon(true);
		}
		if (content?.url) {
			resetTrigger();
		}
	});

	const resetTrigger = () => {
		clearInterval(timeInterval);
		let expiryTime = parseInt(eventExpiryTimeout) ?? 600;
		timeInterval = setTimeout(() => {
			setContent({
				count: 0,
				url: "",
			});
			setIsOpenViewport(false);
			setBlinkIcon(false);
			if (newConfig.alwaysOn !== true) {
				ipcRenderer.send("close-container", {
					alwaysOn: newConfig.alwaysOn,
					viewportState: isOpenViewport,
					networkId: newConfig.networkId,
					isExpired: "context_expired",
				});
			}
		}, expiryTime * 1000);
	};

	useEffect(() => {
		if (isOpenViewport) {
			ipcRenderer.send(`openSidecar_${newConfig.networkId}`, {
				width: newConfig.viewportWidth,
				height: newConfig.viewportHeight,
				tabWidthWithoutViewport: newConfig.tabWidthWithoutViewport,
				tabHeightWithoutViewport: newConfig.tabHeightWithoutViewport,
			});
		} else {
			ipcRenderer.send(`closeSidecar_${newConfig.networkId}`, {
				width: parseInt(newConfig.tabWidthWithoutViewport),
				height: parseInt(newConfig.tabHeightWithoutViewport),
				viewportWidth: parseInt(newConfig.viewportWidth),
				viewportHeight: parseInt(newConfig.viewportHeight),
			});
		}
		setBlinkIcon(false);
	}, [isOpenViewport]);

	return (
		<Viewport
			type="desktop"
			viewPortContent={content}
			toggleViewport={setIsOpenViewport}
			viewPortConfig={newConfig}
			blinking={blinkIcon}
			handleIconClicked={setBlinkIcon}
			viewportState={isOpenViewport}
			eventHandler={ipcRenderer}
		/>
	);
};

export default App;
