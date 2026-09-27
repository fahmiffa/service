import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import * as whatsappService from "./whatsappService.js";
import { startScheduler } from "./scheduler.js";
import { startOutboxProcessor } from "./outboxProcessor.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("StartConnection", async (deviceId) => {
    try {
      await whatsappService.createSession(deviceId, io);
    } catch (err) {
      socket.emit("error", err.message);
    }
  });

  socket.on("LogoutDevice", async (deviceId) => {
    try {
      await whatsappService.removeSession(deviceId);
      socket.emit("message", `Disconnected ${deviceId}`);
    } catch (err) {
      socket.emit("error", err.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Auto-restore sessions
const sessionsDir = path.join(__dirname, "sessions");
if (fs.existsSync(sessionsDir)) {
  fs.readdirSync(sessionsDir).forEach((deviceId) => {
    const sessionPath = path.join(sessionsDir, deviceId);
    if (fs.existsSync(path.join(sessionPath, "creds.json"))) {
      whatsappService.createSession(deviceId, io).catch(console.error);
    }
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  startScheduler();
  startOutboxProcessor();
});
