const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function check() {
  const phone = "085640431181";
  try {
    const user = await prisma.user.findFirst({
      where: { phone: phone },
    });

    if (user) {
      console.log("DATA USER DITEMUKAN:");
      console.log("- Username:", user.username);
      console.log(
        "- Status saat ini:",
        user.status,
        `(Type: ${typeof user.status})`,
      );
      console.log("- Role saat ini:", user.role);

      if (user.status !== 1) {
        console.log(">>> Memperbaiki status ke 1...");
        await prisma.user.update({
          where: { id: user.id },
          data: { status: 1, role: 0 },
        });
        console.log(">>> Berhasil diperbaiki! Silakan login kembali.");
      } else {
        console.log(">>> Status sudah 1. Seharusnya sudah bisa login.");
      }
    } else {
      console.log("User dengan nomor tersebut tidak ditemukan di database.");
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
