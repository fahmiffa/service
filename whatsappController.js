const { validationResult } = require("express-validator");
const whatsappService = require("./whatsappService");

async function sendMessage(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: false, errors: errors.mapped() });
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
    return res.status(400).json({ status: false, errors: errors.mapped() });
  }

  const { number, to } = req.body;

  try {
    const val = await whatsappService.numberCheck(number, to);
    if (val.length > 0 && val[0].exists) {
      res.json({ status: true, message: "Good" });
    } else {
      res.status(500).json({ status: false, message: err.message });
    }
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
}

module.exports = { sendMessage, numberCheck };
