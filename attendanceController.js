const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getAttendances = async (req, res) => {
  try {
    const attendances = await prisma.attendance.findMany({
      include: {
        student: {
          include: { class: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(attendances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createAttendance = async (req, res) => {
  try {
    const { studentId, status } = req.body;
    const attendance = await prisma.attendance.create({
      data: {
        studentId: parseInt(studentId),
        status,
      },
      include: {
        student: { include: { class: true } },
      },
    });

    // Emit live update
    const io = req.app.get("io");
    if (io) {
      io.emit("attendanceUpdate", attendance);
      io.emit("statsUpdate");
    }

    res.status(201).json(attendance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.attendance.delete({
      where: { id: parseInt(id) },
    });
    res.json({ message: "Attendance record deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const handleEsp32Attendance = async (req, res) => {
  try {
    const { uid } = req.body;
    const deviceId = req.headers["device-id"];

    console.log(`ESP32 Request | Device: ${deviceId} | UID: ${uid}`);

    if (!uid) {
      return res.status(400).json({
        success: false,
        msg: "UID Required",
      });
    }

    // Find student by RFID/UID
    const student = await prisma.student.findUnique({
      where: { rfid: uid },
    });

    if (!student) {
      console.log(`RFID ${uid} not found`);
      return res.status(400).json({
        success: false,
        msg: "User Not Found",
      });
    }

    // Determine status automatically (toggle based on today's logs)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastLog = await prisma.attendance.findFirst({
      where: {
        studentId: student.id,
        createdAt: { gte: today },
      },
      orderBy: { createdAt: "desc" },
    });

    const status = lastLog?.status === "masuk" ? "pulang" : "masuk";

    // Create attendance record
    const attendance = await prisma.attendance.create({
      data: {
        studentId: student.id,
        status: status,
      },
      include: {
        student: { include: { class: true } },
      },
    });

    console.log(`Attendance Recorded: ${student.name} - ${status}`);

    // Emit live update
    const io = req.app.get("io");
    if (io) {
      io.emit("attendanceUpdate", attendance);
      io.emit("statsUpdate");
    }

    // Response matching ESP32 expected JSON format
    res.status(200).json({
      success: true,
      msg: student.name, // Will be displayed on the first line of LCD
    });
  } catch (error) {
    console.error("ESP32 API Error:", error.message);
    res.status(400).json({
      success: false,
      msg: "Server Error",
    });
  }
};

const ExcelJS = require("exceljs");

const exportAttendances = async (req, res) => {
  try {
    const attendances = await prisma.attendance.findMany({
      include: {
        student: {
          include: { class: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Absensi");

    worksheet.columns = [
      { header: "Waktu", key: "time", width: 25 },
      { header: "NIS", key: "nis", width: 15 },
      { header: "Nama Siswa", key: "name", width: 30 },
      { header: "Kelas", key: "class", width: 20 },
      { header: "Status", key: "status", width: 15 },
    ];

    attendances.forEach((att) => {
      worksheet.addRow({
        time: new Date(att.createdAt).toLocaleString("id-ID"),
        nis: att.student.nis,
        name: att.student.name,
        class: att.student.class?.name || "-",
        status: att.status.toUpperCase(),
      });
    });

    // Formatting
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=" + "laporan_absensi.xlsx",
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAttendances,
  createAttendance,
  deleteAttendance,
  handleEsp32Attendance,
  exportAttendances,
};
