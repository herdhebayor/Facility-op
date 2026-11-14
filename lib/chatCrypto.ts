export type EncryptedPrivateKeyBackup = {
  salt: string;
  iv: string;
  iterations: number;
  ciphertext: string;
};

export type ChatIdentity = {
  publicKey: JsonWebKey;
  privateKeyBackup: EncryptedPrivateKeyBackup;
};

export type ChatRecipientKey = {
  _id: string;
  chatPublicKey: JsonWebKey | null;
};

export type EncryptedMessagePayload = {
  ciphertext: string;
  iv: string;
  keyEnvelopes: { userId: string; wrappedKey: string }[];
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const BACKUP_ITERATIONS = 310_000;

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function randomBytes(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function deriveBackupKey(passphrase: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: toArrayBuffer(salt), iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function createChatIdentity(passphrase: string): Promise<ChatIdentity & { privateKey: CryptoKey }> {
  const pair = await crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt"],
  );
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveBackupKey(passphrase, salt, BACKUP_ITERATIONS);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: toArrayBuffer(iv) }, key, toArrayBuffer(pkcs8));
  const publicKey = await crypto.subtle.exportKey("jwk", pair.publicKey);

  return {
    publicKey,
    privateKey: pair.privateKey,
    privateKeyBackup: {
      salt: toBase64(salt),
      iv: toBase64(iv),
      iterations: BACKUP_ITERATIONS,
      ciphertext: toBase64(new Uint8Array(ciphertext)),
    },
  };
}

export async function unlockChatPrivateKey(
  publicKey: JsonWebKey,
  backup: EncryptedPrivateKeyBackup,
  passphrase: string,
) {
  const key = await deriveBackupKey(passphrase, fromBase64(backup.salt), backup.iterations);
  const pkcs8 = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(fromBase64(backup.iv)) },
    key,
    toArrayBuffer(fromBase64(backup.ciphertext)),
  );
  return crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"],
  );
}

export async function exportChatPrivateKey(privateKey: CryptoKey) {
  return toBase64(new Uint8Array(await crypto.subtle.exportKey("pkcs8", privateKey)));
}

export async function importChatPrivateKey(privateKey: string) {
  return crypto.subtle.importKey(
    "pkcs8",
    toArrayBuffer(fromBase64(privateKey)),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"],
  );
}

export async function fingerprintChatPublicKey(publicKey: JsonWebKey) {
  const digest = new Uint8Array(await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${publicKey.kty}:${publicKey.n}:${publicKey.e}`),
  ));
  return Array.from(digest.slice(0, 16), (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .match(/.{1,4}/g)
    ?.join(" ") || "";
}

export async function encryptChatText(text: string, recipients: ChatRecipientKey[]): Promise<EncryptedMessagePayload> {
  const keyedRecipients = recipients.filter((recipient): recipient is ChatRecipientKey & { chatPublicKey: JsonWebKey } => Boolean(recipient.chatPublicKey));
  if (!keyedRecipients.length) throw new Error("Set up your encryption key before sending messages.");

  const contentKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = randomBytes(12);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: toArrayBuffer(iv) }, contentKey, encoder.encode(text));
  const rawContentKey = await crypto.subtle.exportKey("raw", contentKey);
  const keyEnvelopes = await Promise.all(keyedRecipients.map(async (recipient) => {
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      recipient.chatPublicKey!,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"],
    );
    const wrappedKey = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, rawContentKey);
    return { userId: recipient._id, wrappedKey: toBase64(new Uint8Array(wrappedKey)) };
  }));

  return {
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    iv: toBase64(iv),
    keyEnvelopes,
  };
}

export async function createPendingRecipientEnvelope(
  message: {
    keyEnvelopes?: { userId: string | { _id: string }; wrappedKey: string }[];
  },
  senderId: string,
  senderPrivateKey: CryptoKey,
  recipient: ChatRecipientKey & { chatPublicKey: JsonWebKey },
) {
  const senderEnvelope = message.keyEnvelopes?.find((envelope) => (
    (typeof envelope.userId === "string" ? envelope.userId : envelope.userId._id) === senderId
  ));
  if (!senderEnvelope) throw new Error("Your encryption key is missing from this message.");
  const rawContentKey = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    senderPrivateKey,
    toArrayBuffer(fromBase64(senderEnvelope.wrappedKey)),
  );
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    recipient.chatPublicKey,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
  const wrappedKey = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, rawContentKey);
  return toBase64(new Uint8Array(wrappedKey));
}

export async function decryptChatMessage(
  message: {
    ciphertext?: string;
    iv?: string;
    keyEnvelopes?: { userId: string | { _id: string }; wrappedKey: string }[];
    text?: string;
    deletedForEveryone?: boolean;
  },
  userId: string,
  privateKey: CryptoKey,
) {
  if (message.deletedForEveryone) return "This message was deleted.";
  if (!message.ciphertext) return message.text || "This older message is unavailable.";

  const envelope = message.keyEnvelopes?.find((item) => {
    const envelopeUserId = typeof item.userId === "string" ? item.userId : item.userId._id;
    return envelopeUserId === userId;
  });
  if (!envelope) throw new Error("This message was not encrypted for this device identity.");

  const rawContentKey = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    toArrayBuffer(fromBase64(envelope.wrappedKey)),
  );
  const contentKey = await crypto.subtle.importKey("raw", rawContentKey, "AES-GCM", false, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(fromBase64(message.iv || "")) },
    contentKey,
    toArrayBuffer(fromBase64(message.ciphertext)),
  );
  return decoder.decode(plaintext);
}
