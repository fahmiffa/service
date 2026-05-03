const express = require("express");
const router = express.Router();
const controller = require("./outboxController");

router.get("/", controller.getAllOutbox);
router.delete("/clear", controller.clearOutbox);
router.delete("/:id", controller.deleteOutbox);

module.exports = router;
