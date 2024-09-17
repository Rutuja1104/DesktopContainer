# desktop-electron-boilerplate

Artifact example. Patient Context false.

```javscript
 npm start -- -- --integration=cerner --if-facility-id 1d60f646-f1ce-4772-8ade-fb63894961aa --if-facility-secret ht5KM4E5ZAdnM5VweH8V
```

Gorilla example. Patient Context true.

```javscript
npm start -- -- --integration=cerner --ec-key +f6f7IYiW0TqNSXOK9aDlw== --if-facility-id 2a25c31d-7d39-471e-89c4-dc78e766131a --if-facility-secret AVcF9Fqsu77jmgCa
```

Multiple Clients

```javscript
npm start -- -- --integration=cerner  --if-facility-id 4777833e-5279-4245-b50c-826b598702a1 --if-facility-secret DmxbAuqU5Y2dMNO7C8
```

Config File

Example file: example.config.json
Published build install windows location: %USERPROFILE%\AppData\Local\Programs\desktop-electron-boilerplate