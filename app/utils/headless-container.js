const { accountService: dbService } = require("../data/levelService");
async function confirmHeadlessContainer(id) {
  let containerDetails = await dbService.getData("tokenDetails");
  containerDetails = JSON.parse(containerDetails);
  console.log(containerDetails?.containerId);
  if (containerDetails?.containerId === id) {
    return true;
  } else {
    console.log("This is not headless container");
    return false;
  }
}

module.exports = {
  confirmHeadlessContainer,
};
