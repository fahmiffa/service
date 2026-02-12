const { validationResult } = require("express-validator");
const whatsappService = require("./whatsappService");

async function sendMessage(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: false, errors: errors.array() });
  }

  const { number, message, to } = req.body;

  try {
    await whatsappService.sendMessage(number, to, message);
    res.json({ status: true, message: "Message sent" });
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

  const { number, message, recipients } = req.body;

  try {
    // Process recipients in chunks or sequentially with delay
    const results = [];
    for (const recipient of recipients) {
      try {
        await whatsappService.sendMessage(number, recipient, message);
        results.push({ recipient, status: "sent" });
        // Add a small delay to mimic human behavior and avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (err) {
        results.push({ recipient, status: "failed", error: err.message });
      }
    }

    res.json({ status: true, message: "Broadcast completed", results });
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
};
