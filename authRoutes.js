import express from "express";
const router = express.Router();
import * as authController from "./authController.js";
import * as userController from "./userController.js";

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

export default router;
