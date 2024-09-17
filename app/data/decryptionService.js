const crypto = require("crypto");
class Decryptor {
  constructor(algorithmName, key, usesIV) {
    this.usesIV = usesIV;
    this.blockSize = this.algorithmSize(algorithmName);
    if (this.isBase64String(key)) {
      key = Buffer.from(key, "base64");
    } else {
      key = deriveKey(key);
    }

    this.algorithmName = algorithmName;
    this.key = key;
  }

  isBase64String(str) {
    return Buffer.from(str, "base64").toString("base64") === str;
  }

  algorithmSize(name) {
    switch (name) {
      case "AES-128":
        return 128;
      case "AES-256":
        return 256;
      default:
        throw new Error(`Algorithm of type ${name} is not supported.`);
    }
  }
  decrypt(text) {
    let iv = null;
    let buffer = null;

    if (this.usesIV) {
      let data = this.parseTextAndIV(text);
      iv = Buffer.from(data.IV, "base64");
      buffer = Buffer.from(data.Text, "base64");
    } else {
      buffer = Buffer.from(text, "base64");
    }
    return this.decryptData(this.key, iv, buffer);
  }

  parseTextAndIV(raw) {
    const ivStringLength = this.numberOfCharactersToBase64(this.blockSize);

    const iv = raw.substring(0, ivStringLength);
    if (this.isBase64String(iv)) {
      return { Text: raw.substring(ivStringLength), IV: iv };
    }
    return { Text: raw, IV: "" };
  }
  numberOfCharactersToBase64() {
    const num = (4 * (this.blockSize / 8)) / 3;
    const padding = num % 4 == 0 ? 0 : 4 - (num % 4);
    return num + padding;
  }
  decryptData(KeyBase64, iv, buffer) {
    const cipher = crypto.createDecipheriv("aes-128-cbc", KeyBase64, iv);
    let decrypted = cipher.update(buffer, "base64", "utf8");
    decrypted += cipher.final("utf8");
    return decrypted;
  }

  deriveKey(plaintextKey) {
    console.log("DERIVE");
  }
}

function decryptData(raw, key, algorithmName, usesIV = true) {
  let decryptor = new Decryptor(algorithmName, key, usesIV);
  return decryptor.decrypt(raw);
}

module.exports = { decryptData };
