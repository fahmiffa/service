const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.create({
      data: {
        username: "testuser_" + Date.now(),
        email: "test_" + Date.now() + "@example.com",
        password: "password123",
        phone: "08" + Date.now(),
        role: 1,
        status: 1,
      },
    });
    console.log("Success:", user);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
