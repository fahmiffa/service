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
      },
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { updateProfile };
