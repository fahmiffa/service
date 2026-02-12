const express = require("express");
const router = express.Router();
const authController = require("./authController");
const userController = require("./userController");

// Auth
router.post("/register", authController.register);
router.post("/login", authController.login);

// Profile
router.post("/profile/update", userController.updateProfile);

// Admin - User Management
router.get("/users", userController.getAllUsers);
router.post("/users", userController.createUser);
router.put("/users/:id", userController.updateUser);
router.delete("/users/:id", userController.deleteUser);

module.exports = router;
