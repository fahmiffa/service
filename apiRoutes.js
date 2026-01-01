const express = require("express");
const { body } = require("express-validator");
const controller = require("./whatsappController");

const router = express.Router();

router.post(
  "/send",
  [
    body("number").notEmpty(),
    body("message").notEmpty(),
    body("to").notEmpty(),
  ],
  controller.sendMessage
);

router.post(
  "/number",
  [
    body("number").notEmpty(),
    body("to").notEmpty(),
  ],
  controller.numberCheck
);

module.exports = router;
