const express = require("express");
const router = express.Router();
const botController = require("./botController");

router.get("/", botController.getBots);
router.post("/", botController.createBot);
router.put("/:id", botController.updateBot);
router.delete("/:id", botController.deleteBot);

module.exports = router;
