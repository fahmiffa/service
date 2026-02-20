const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode");
const fs = require("fs");
const path = require("path");
const pino = require("pino");

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const sessions = new Map();
const logger = pino({ level: "fatal" });

async function createSession(deviceId, io) {
  if (sessions.has(deviceId)) {
    io.emit("ready", { deviceId });
    return;
  }

  const sessionPath = path.join(__dirname, "sessions", deviceId);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const sock = makeWASocket({
    auth: state,
    keepAliveIntervalMs: 30000,
    printQRInTerminal: false,
    logger,
    browser: ["WAF Service", "Chrome", "1.0.0"],
  });

  sessions.set(deviceId, sock);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const url = await qrcode.toDataURL(qr);
        io.emit("qr", { deviceId, url });
      } catch (err) {
        console.error("QR Generation Error:", err);
      }
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;

      console.log(
        `Connection closed for ${deviceId}. Reconnecting: ${shouldReconnect}`,
      );

      if (shouldReconnect) {
        sessions.delete(deviceId);
        createSession(deviceId, io);
      } else {
        removeSession(deviceId);
      }
    } else if (connection === "open") {
      console.log(`WhatsApp ready for device: ${deviceId}`);
      io.emit("ready", { deviceId });
    }

    io.emit("connection_status", { deviceId, connection });
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async (m) => {
    if (m.type !== "notify") return;

    for (const msg of m.messages) {
      if (!msg.key.fromMe && msg.message) {
        let text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          "";

        if (text) {
          try {
            const bot = await prisma.bot.findFirst({
              where: {
                key: text.trim(),
              },
            });

            if (bot) {
              const jid = msg.key.remoteJid;
              await sock.sendMessage(jid, { text: bot.respons });
            }
          } catch (err) {
            console.error("Bot Response Error:", err);
          }
        }
      }
    }
  });

  return sock;
}

async function sendMessage(deviceId, to, message) {
  const sock = sessions.get(deviceId);
  if (!sock) throw new Error("Session not found or not initialized");

  const jid = `${to.replace(/\D/g, "")}@s.whatsapp.net`;
  return await sock.sendMessage(jid, { text: message });
}

async function numberCheck(deviceId, to) {
  const sock = sessions.get(deviceId);
  if (!sock) throw new Error("Session not found or not initialized");

  const formattedTo = to.replace(/\D/g, "");
  return await sock.onWhatsApp(formattedTo);
}

async function removeSession(deviceId) {
  const sessionPath = path.join(__dirname, "sessions", deviceId);
  try {
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
  } catch (err) {
    console.error("Error removing session directory:", err);
  }
  sessions.delete(deviceId);
}

function getSessionStatus(deviceId) {
  const sock = sessions.get(deviceId);
  if (!sock) return { status: "disconnected" };
  // Baileys socket doesn't have a simple isConnected property exposed this way easily without checking `ws`
  // But if it's in the map, it's at least initialized.
  // We can try to check user object or similar.
  return { status: "connected", user: sock.user };
}

module.exports = {
  createSession,
  sendMessage,
  numberCheck,
  removeSession,
  getSessionStatus,
};
