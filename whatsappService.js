const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");

const qrcode = require("qrcode");
const fs = require("fs");
const path = require("path");
const pino = require("pino");

const sessions = new Map();

async function createSession(deviceId, io) {
  const sessionPath = path.join(__dirname, ".", "sessions", deviceId);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const sock = makeWASocket({
    auth: state,
    keepAliveIntervalMs: 20000,
    markOnlineOnConnect: false,
    logger: pino({ level: "fatal" }),
    browser: ["SAFARI", "FFA", "1.0"],
    printQRInTerminal: false,
  });

  sessions.set(deviceId, sock);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr, isNewLogin } = update;
    io.emit("connection_status", { deviceId, connection });
    console.log(connection);


    if (qr) {
      qrcode.toDataURL(qr, (err, url) => {
        io.emit("qr", { deviceId, url });
      });
    }

    if (isNewLogin) {
      io.emit("login_success", { deviceId });
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;
      if (shouldReconnect) {
        createSession(deviceId, io);
      } else {
        sessions.delete(deviceId);
      }
    }

    if (connection === "open") {
      io.emit("ready", { deviceId });
    }
  });

  sock.ev.on("messages.upsert", (msg) => {
    console.log(msg);

    // msg.type biasanya "notify" untuk pesan baru
    if (msg.type === "notify") {
      // Ambil pesan pertama
      const messageObj = msg.messages[0];

      // Pastikan pesan punya property message dan conversation (text biasa)
      if (messageObj.message && messageObj.message.conversation) {
        const pesan = messageObj.message.conversation;
        console.log("Pesan masuk:", pesan);

        if (pesan === "ki") {
          // Balas pesan ke pengirim
          sock.sendMessage(messageObj.key.remoteJid, { text: "mi" });
        }
      }
    }

    // Emit ke socket io (optional)
    io.emit("message_received", { deviceId, messages: msg });
  });

  sock.ev.on("creds.update", saveCreds);
}

async function sendMessage(deviceId, to, message) {
  const session = sessions.get(deviceId);
  if (!session) throw new Error("Session not found");

  const jid = `${to}@s.whatsapp.net`;
  return session.sendMessage(jid, { text: message });
}

async function numberCheck(deviceId, to) {
  const session = sessions.get(deviceId);
  if (!session) throw new Error("Session not found");

  const result = await session.onWhatsApp(to);
  console.log(result);
  return result;
}

async function removeSession(deviceId) {
  const sessionPath = path.join(__dirname, ".", "sessions", deviceId);
  fs.rmSync(sessionPath, { recursive: true, force: true });
  sessions.delete(deviceId);
}

module.exports = {
  createSession,
  sendMessage,
  removeSession,
  numberCheck,
};
