function notificationDetail({ mrn, lastname, firstname, dob, ehr } = {}) {
  const notificationDetail = {
    mrn,
    lastname,
    firstname,
    dob,
    ehr,
  };
  return notificationDetail;
}

function notification({
  providerId,
  deviceId,
  eventCode,
  patient: { mrn, lastname, firstname, dob, ehr } = {},
  patientId,
  machineName,
}) {
  const notification = {
    providerId,
    deviceId,
    eventCode,
    patient: notificationDetail({
      mrn,
      lastname,
      firstname,
      dob,
      ehr,
    }),
    patientId,
    machineName,
  };
  return notification;
}

function notificationMessage({ message } = {}) {
  const notification = {
    message,
  };
  return notification;
}

module.exports = { notification, notificationMessage, notificationDetail };
