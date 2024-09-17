const CryptoJS = require('crypto-js');
const browserCrypto = require('crypto-browserify');
const jose = require('node-jose');
const { JSEncrypt } = require("jsencrypt");
const os = require('os');
const { Buffer } = require('buffer');
const Sentry = require('@sentry/electron');
const { accountService: dbService } = require('./levelService');
const { AUDIT_LOG, USER_CONTEXT, appEvents } = require('../utils/constants');
const { machineIdSync } = require('node-machine-id');
const { v4: uuidv4 } = require('uuid');

// let username = os.userInfo().username.toLowerCase();
// const machineId = machineIdSync(true);
const interfaces = os.networkInterfaces();
const addresses = [];
let wsId = '';
let wsTs = '';
let correlationId = '';



// Sentry.setTag('macAddress', addresses[0]);





const verify = async (key, jws) => {
  return jose.JWS.createVerify(key).verify(jws);
};

const sign = async (key, data, event, networkId) => {
  const opt = { compact: true, fields: { typ: 'jwt' } };
  wsId = uuidv4();
  wsTs = Math.floor(new Date().getTime());
  let jwt = {
    iss: 'idp:Insiteflow',
    exp: Math.floor(new Date().getTime() / 1000) + 30,
    iat: Math.floor(new Date().getTime() / 1000),
    'https://insiteflow.io/ws-payload': data,
    'https://insiteflow.io/ws-id': wsId,
    'https://insitefow.io/ws-ts': wsTs,
    'https://insiteflow.io/ws-event': event,
  };
  if (data.eventCode === appEvents.patientView) {
    correlationId = uuidv4();
  }
  if (event === AUDIT_LOG) {
    jwt = {
      ...jwt,
      'https://insiteflow.io/ws-parallel': true,
      'https://insiteflow.io/ws-networkId': networkId,
    };
    if (correlationId) {
      jwt = {
        ...jwt,
        'https://insiteflow.io/ws-correlation-id': correlationId,
      };
    }
  }
  if (event === USER_CONTEXT && correlationId) {
    jwt = {
      ...jwt,
      'https://insiteflow.io/ws-correlation-id': correlationId,
    };
  }
  if (data.eventCode === appEvents.logout) {
    correlationId = '';
  }
  const buffer = Buffer.from(JSON.stringify(jwt));
  return jose.JWS.createSign(opt, key).update(buffer).final();
};

const encrypt = async (key, input) => {
  const buffer = Buffer.from(input);
  return jose.JWE.createEncrypt(
    { format: 'compact', contentAlg: 'A256GCM', alg: 'RSA-OAEP' },
    key
  )
    .update(buffer)
    .final();
};

const encryptDecryptData = async (data, operation, event, networkId) => {
  let privateKeyPEM = await dbService.getData('privateKey');
  let publicKeyPEM = await dbService.getData('serverPublicKey');
  privateKeyPEM = JSON.parse(privateKeyPEM);
  publicKeyPEM = JSON.parse(publicKeyPEM);
  let keystore = jose.JWK.createKeyStore();
  let privateKey = await jose.JWK.asKey(privateKeyPEM, 'pem');
  let publicKey = await jose.JWK.asKey(publicKeyPEM, 'pem');
  keystore.add(privateKey);
  keystore.add(publicKey);

  switch (operation) {
    case 'ENCRYPT':
      let signedPayload = await sign(privateKey, data, event, networkId);
      let jwePayload = await encrypt(publicKey, signedPayload);
      return { jwePayload, wsId, wsTs };
    case 'DECRYPT':
      const decrypted = await jose.JWE.createDecrypt(keystore).decrypt(data);
      const verified = await verify(publicKey, decrypted.payload.toString());
      const verifiedPayload = JSON.parse(verified.payload.toString());
      return verifiedPayload;
  }
};

module.exports = {
  encryptDecryptData
};
