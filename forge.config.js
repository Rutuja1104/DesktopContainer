module.exports = {
  plugins: [
    {
      name: "@electron-forge/plugin-webpack",
      config: {
        port: "3002",
        mainConfig: "./app/webpack.main.config.js",
        devContentSecurityPolicy: "connect-src 'self' * 'unsafe-eval'",
        renderer: {
          config: "./app/webpack.renderer.config.js",
          nodeIntegration: true,
          entryPoints: [
            {
              name: "enablement_key_window",
              html: "./app/html/enablementKey.html",
              js: "./app/renderer/enablementKeyRenderer/renderer.js",
            },
            {
              name: "container_window",
              html: "./app/html/viewport.html",
              js: "./app/renderer/containerRenderer/renderer.js",
            },
            {
              name: "notification_window",
              html: "./app/html/notification.html",
              js: "./app/renderer/notificationRenderer/renderer.js",
            },
          ],
        },
      },
    },
  ],
  packagerConfig: {
    asar: true,
    files: ["!**/node_modules", "!build"],
    // osxNotarize: {
    //   tool: 'notarytool',
    //   appleId: process.env.APPLE_ID,
    //   appleIdPassword: process.env.APPLE_PASSWORD,
    //   teamId: process.env.APPLE_TEAM_ID
    // }
  },
};
