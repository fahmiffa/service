const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

const updateProfile = async (req, res) => {
  try {
    const { userId, username, password, phone } = req.body;

    const updateData = { username };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    if (phone) {
      updateData.phone = phone;
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: updateData,
    });

    res.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        status: updatedUser.status,
      },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// GET semua users (admin only)
const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CREATE user (admin only)
const createUser = async (req, res) => {
  try {
    let { username, email, password, phone, role, status } = req.body;
    username = username?.trim();
    email = email?.trim();

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }, { phone }] },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Username, email, atau phone sudah digunakan" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        phone,
        role: role ?? 1,
        status: status ?? 1,
      },
    });

    res.status(201).json({
      message: "User berhasil dibuat",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE user (admin only)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    let { username, email, password, phone, role, status } = req.body;

    const updateData = {};
    if (username) updateData.username = username.trim();
    if (email) updateData.email = email.trim();
    if (phone) updateData.phone = phone;
    if (role !== undefined) updateData.role = parseInt(role);
    if (status !== undefined) updateData.status = parseInt(status);
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.json({
      message: "User berhasil diperbarui",
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        status: updatedUser.status,
      },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE user (admin only)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: "User berhasil dihapus" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  updateProfile,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
};
