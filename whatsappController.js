const { validationResult } = require("express-validator");
const whatsappService = require("./whatsappService");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Multer Config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "public", "uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 }, // 1MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed"));
    }
  },
}).single("image");

async function uploadImage(req, res) {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ status: false, message: "File too large. Max 1MB" });
    } else if (err) {
      return res.status(400).json({ status: false, message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ status: false, message: "No file uploaded" });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ status: true, imageUrl: imageUrl });
  });
}


async function sendMessage(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: false, errors: errors.array() });
  }

  const { number, message, to, imageUrl } = req.body;

  try {
    await prisma.outbox.create({
      data: {
        senderId: number,
        receiver: to,
        message: message,
        imageUrl: imageUrl,
        status: "draft",
      },
    });
    res.json({ status: true, message: "Message queued in outbox" });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
}


async function numberCheck(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: false, errors: errors.array() });
  }

  const { number, to } = req.body;

  try {
    const result = await whatsappService.numberCheck(number, to);
    if (result && result.length > 0 && result[0].exists) {
      res.json({ status: true, message: "Number exists", data: result[0] });
    } else {
      res.status(404).json({ status: false, message: "Number not found" });
    }
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
}

async function broadcastMessage(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: false, errors: errors.array() });
  }

  const { number, message, recipients, imageUrl } = req.body;

  try {
    for (const recipient of recipients) {
      await prisma.outbox.create({
        data: {
          senderId: number,
          receiver: recipient,
          message: message,
          imageUrl: imageUrl,
          status: "draft",
        },
      });
    }

    res.json({ status: true, message: "Broadcast messages queued in outbox" });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
}


async function logout(req, res) {
  const { number } = req.body;

  try {
    await whatsappService.removeSession(number);
    res.json({ status: true, message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
}

async function getStatus(req, res) {
  const { number } = req.params;

  try {
    const status = whatsappService.getSessionStatus(number);
    res.json({ status: true, data: status });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
}

module.exports = {
  sendMessage,
  numberCheck,
  broadcastMessage,
  logout,
  getStatus,
  uploadImage,
};
