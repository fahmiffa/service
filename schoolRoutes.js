const express = require("express");
const router = express.Router();
const schoolController = require("./schoolController");
const attendanceController = require("./attendanceController");

// Class Routes
router.get("/classes", schoolController.getClasses);
router.post("/classes", schoolController.createClass);
router.put("/classes/:id", schoolController.updateClass);
router.delete("/classes/:id", schoolController.deleteClass);

// Student Routes
router.get("/students", schoolController.getStudents);
router.post("/students", schoolController.createStudent);
router.put("/students/:id", schoolController.updateStudent);
router.delete("/students/:id", schoolController.deleteStudent);

// Stats Route
router.get("/stats", schoolController.getStats);

// Attendance Routes
router.get("/attendances", attendanceController.getAttendances);
router.get("/attendances/export", attendanceController.exportAttendances);
router.post("/attendances", attendanceController.createAttendance);
router.post("/attendances/rfid", attendanceController.handleEsp32Attendance);
router.delete("/attendances/:id", attendanceController.deleteAttendance);

module.exports = router;
