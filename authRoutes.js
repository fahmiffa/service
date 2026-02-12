const express = require("express");
const router = express.Router();
const authController = require("./authController");
const userController = require("./userController");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/profile/update", userController.updateProfile);

module.exports = router;
