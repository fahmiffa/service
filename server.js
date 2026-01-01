const http = require("http");
const socketIO = require("socket.io");
const app = require("./app");
const whatsappService = require("./whatsappService");
const path = require("path");
const fs = require("fs");

const {
  createSession,
} = require("./whatsappService");

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  socket.on("StartConnection", async (deviceId) => {
    try {
      await whatsappService.createSession(deviceId, io);
    } catch (err) {
      socket.emit("error", err.message);
    }
  });

  socket.on("LogoutDevice", async (deviceId) => {
    await whatsappService.removeSession(deviceId);
    socket.emit("message", `Disconnected ${deviceId}`);
  });
});

const sessionsDir = path.join(__dirname, "sessions");

if (fs.existsSync(sessionsDir)) {
  fs.readdirSync(sessionsDir).forEach((deviceId) => {
    const sessionPath = path.join(sessionsDir, deviceId);
    if (fs.existsSync(path.join(sessionPath, "creds.json"))) {
      createSession(deviceId, io);
    }
  });
}

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
