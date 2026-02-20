const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function getBots(req, res) {
  try {
    const bots = await prisma.bot.findMany();
    res.json({ status: true, data: bots });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
}

async function createBot(req, res) {
  const { key, respons } = req.body;
  try {
    const bot = await prisma.bot.create({
      data: { key, respons },
    });
    res.json({ status: true, data: bot });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
}

async function updateBot(req, res) {
  const { id } = req.params;
  const { key, respons } = req.body;
  try {
    const bot = await prisma.bot.update({
      where: { id: parseInt(id) },
      data: { key, respons },
    });
    res.json({ status: true, data: bot });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
}

async function deleteBot(req, res) {
  const { id } = req.params;
  try {
    await prisma.bot.delete({
      where: { id: parseInt(id) },
    });
    res.json({ status: true, message: "Bot deleted" });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
}

module.exports = {
  getBots,
  createBot,
  updateBot,
  deleteBot,
};
