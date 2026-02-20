const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

const register = async (req, res) => {
  try {
    let { username, email, password, phone } = req.body;
    console.log("Registration attempt:", { username, email, phone });
    username = username?.trim();
    email = email?.trim();

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }, { phone }] },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Username, email, or phone already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with role=1 (user) and status=1 (active)
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        phone,
        role: 1,
        status: 1,
      },
    });

    res
      .status(201)
      .json({ message: "User registered successfully", userId: user.id });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Error registering user", error: error.message });
  }
};

const login = async (req, res) => {
  try {
    let { phone, password } = req.body;
    phone = phone?.trim();
    console.log("Login attempt for phone:", phone);

    const user = await prisma.user.findFirst({
      where: { phone },
    });

    if (!user) {
      console.log("User not found:", phone);
      return res.status(401).json({ message: "User not found" });
    }

    // Cek status akun
    console.log("Found user for login:", {
      id: user.id,
      phone: user.phone,
      status: user.status,
      statusType: typeof user.status,
    });

    if (user.status !== 1) {
      console.log(
        "Login blocked: status is not 1. Actual status:",
        user.status,
      );
      return res
        .status(403)
        .json({
          message: `Akun Anda tidak aktif (Status: ${user.status}). Hubungi admin.`,
        });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log("Invalid password for:", phone);
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      message: "Login successful",
      token,
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
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
};

module.exports = { register, login };
