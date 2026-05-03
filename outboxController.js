const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const getAllOutbox = async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    
    const outboxes = await prisma.outbox.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    res.json(outboxes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteOutbox = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.outbox.delete({
      where: { id: parseInt(id) },
    });
    res.json({ message: "Outbox item deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const clearOutbox = async (req, res) => {
    try {
      const { status } = req.query;
      const where = status ? { status } : {};
      await prisma.outbox.deleteMany({ where });
      res.json({ message: "Outbox cleared" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
};

module.exports = {
  getAllOutbox,
  deleteOutbox,
  clearOutbox
};
