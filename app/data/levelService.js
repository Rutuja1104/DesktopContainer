const { Level } = require("level");
const path = require("path");
const { app } = require("electron");
const userPath = app.getPath("userData");
const sessionData = app.getAppPath();
const os = require("os");
let accountDB;
const accountService = {
  initData() {
    let osType = os.type();
    let dbPath;
    if (osType === "Darwin") {
      console.log('In the mac', sessionData)
      dbPath = path.join(sessionData,"..","..", ".insiteflow-desktop", "db");
    }
    else{
      dbPath = path.join(userPath, ".insiteflow-desktop", "db");
    }
    accountDB = new Level(dbPath, { valueEncoding: "json" });
    console.log("Database created at", dbPath);
  },
  async getData(key) {
    try {
      return await accountDB.get(key);
    } catch (err) {
      if (err.notFound) {
        return undefined;
      } else {
        throw err;
      }
    }
  },
  async setData(key, value) {
    return await accountDB.put(key, value);
  },

  async delData(key){
    try {
      return await accountDB.del(key);
    } catch (err) {
      if (err.notFound) {
        return undefined;
      } else {
        throw err;
      }
    }
  }
};

module.exports = { accountService };
