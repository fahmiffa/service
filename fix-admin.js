const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const phone = "085640431181"; // Nomor dari screenshot Anda
  try {
    const user = await prisma.user.update({
      where: { phone: phone },
      data: {
        status: 1, // Aktifkan
        role: 0, // Jadikan Admin agar bisa buka menu manajemen
      },
    });
    console.log("Berhasil memperbarui user:", user);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
