const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testConnection() {
  console.log("Mencoba koneksi ke MySQL...");
  try {
    await prisma.$connect();
    console.log("✅ BERHASIL: Koneksi ke MySQL lancar!");

    const userCount = await prisma.user.count();
    console.log("Jumlah user saat ini:", userCount);
  } catch (err) {
    console.error("❌ GAGAL: Tidak bisa konek ke MySQL.");
    console.error("Pesan Error:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
