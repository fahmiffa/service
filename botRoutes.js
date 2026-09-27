import express from "express";
const router = express.Router();
import * as botController from "./botController.js";

router.get("/", botController.getBots);
router.post("/", botController.createBot);
router.put("/:id", botController.updateBot);
router.delete("/:id", botController.deleteBot);

export default router;
