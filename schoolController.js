const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Classes
const getClasses = async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      include: { _count: { select: { students: true } } },
    });
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createClass = async (req, res) => {
  try {
    const { name } = req.body;
    const newClass = await prisma.class.create({ data: { name } });
    res.status(201).json(newClass);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const updatedClass = await prisma.class.update({
      where: { id: parseInt(id) },
      data: { name },
    });
    res.json(updatedClass);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.class.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Class deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Students
const getStudents = async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      include: { class: true },
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createStudent = async (req, res) => {
  try {
    const { name, nis, classId, rfid } = req.body;
    const student = await prisma.student.create({
      data: {
        name,
        nis,
        classId: parseInt(classId),
        rfid: rfid || null,
      },
    });
    res.status(201).json(student);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, nis, classId, rfid } = req.body;
    const student = await prisma.student.update({
      where: { id: parseInt(id) },
      data: {
        name,
        nis,
        classId: parseInt(classId),
        rfid: rfid || null,
      },
    });
    res.json(student);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.student.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Student deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getStats = async (req, res) => {
  try {
    const studentCount = await prisma.student.count();
    const classCount = await prisma.class.count();
    const attendanceCount = await prisma.attendance.count();

    res.json({
      students: studentCount,
      classes: classCount,
      attendances: attendanceCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getStats,
};
