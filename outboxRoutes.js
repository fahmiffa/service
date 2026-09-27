import express from "express";
const router = express.Router();
import * as controller from "./outboxController.js";

router.get("/", controller.getAllOutbox);
router.delete("/clear", controller.clearOutbox);
router.delete("/:id", controller.deleteOutbox);

export default router;
