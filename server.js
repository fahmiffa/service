const http = require("http");
const socketIO = require("socket.io");
const app = require("./app");
const whatsappService = require("./whatsappService");
const path = require("path");
const fs = require("fs");

const server = http.createServer(app);
const io = socketIO(server, {
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
});
