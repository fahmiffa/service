import express from "express";
import { body } from "express-validator";
import * as controller from "./whatsappController.js";

const router = express.Router();

router.post(
  "/send",
  [
    body("number").notEmpty(),
    body("message").notEmpty(),
    body("to").notEmpty(),
  ],
  controller.sendMessage,
);

router.post(
  "/number",
  [body("number").notEmpty(), body("to").notEmpty()],
  controller.numberCheck,
);

router.post(
  "/broadcast",
  [
    body("number").notEmpty(),
    body("message").notEmpty(),
    body("recipients").isArray({ min: 1 }),
  ],
  controller.broadcastMessage,
);

router.post("/logout", [body("number").notEmpty()], controller.logout);

router.get("/status/:number", controller.getStatus);
router.post("/upload", controller.uploadImage);

export default router;
