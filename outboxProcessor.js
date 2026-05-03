const { PrismaClient } = require("@prisma/client");
const whatsappService = require("./whatsappService");
const fs = require("fs");
const path = require("path");
const prisma = new PrismaClient();

let isProcessing = false;

async function getActiveSession() {
  const sessionsDir = path.join(__dirname, "sessions");
  if (fs.existsSync(sessionsDir)) {
    const list = fs.readdirSync(sessionsDir);
    return list.length > 0 ? list[0] : null;
  }
  return null;
}

async function processOutbox() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const now = new Date();

    // 1. Cek Jeda Global (Min 5 detik antar pengiriman apapun)
    const lastGlobalSent = await prisma.outbox.findFirst({
      where: { status: { in: ["success", "failed"] } },
      orderBy: { updatedAt: "desc" },
    });

    if (lastGlobalSent) {
      const diffGlobal = (now - new Date(lastGlobalSent.updatedAt)) / 1000;
      if (diffGlobal < 5) {
        isProcessing = false;
        return;
      }
    }

    // 2. Ambil semua draft
    const drafts = await prisma.outbox.findMany({
      where: { status: "draft" },
      orderBy: { createdAt: "asc" },
    });

    if (drafts.length === 0) {
      isProcessing = false;
      return;
    }

    // 3. Cari draft yang memenuhi kriteria jeda nomor yang sama (10 detik)
    let selectedDraft = null;

    for (const draft of drafts) {
      const lastReceiverSent = await prisma.outbox.findFirst({
        where: {
          receiver: draft.receiver,
          status: { in: ["success", "failed"] },
        },
        orderBy: { updatedAt: "desc" },
      });

      if (lastReceiverSent) {
        const diffReceiver = (now - new Date(lastReceiverSent.updatedAt)) / 1000;
        // Jika ada nomor yang sama dalam rentang waktu terakhir, beri jeda 10 detik
        if (diffReceiver < 10) {
          continue;
        }
      }

      selectedDraft = draft;
      break;
    }

    if (!selectedDraft) {
      isProcessing = false;
      return;
    }

    // 4. Kirim Pesan
    try {
      let senderId = selectedDraft.senderId;
      if (!senderId) senderId = await getActiveSession();
      if (!senderId) {
        console.warn(`[Outbox] No active session found for ${selectedDraft.receiver}`);
        isProcessing = false;
        return;
      }

      console.log(`[Outbox] Processing: ${selectedDraft.receiver}`);

      const result = await whatsappService.sendMessage(senderId, selectedDraft.receiver, selectedDraft.message);
      
      await prisma.outbox.update({
        where: { id: selectedDraft.id },
        data: {
          status: "success",
          response: JSON.stringify(result),
          updatedAt: new Date(),
        },
      });
      console.log(`[Outbox] SUCCESS: ${selectedDraft.receiver}`);
    } catch (err) {
      console.error(`[Outbox] FAILED to ${selectedDraft.receiver}:`, err.message);
      await prisma.outbox.update({
        where: { id: selectedDraft.id },
        data: {
          status: "failed",
          response: err.message,
          updatedAt: new Date(),
        },
      });
    }
  } catch (error) {
    console.error("[Outbox] Processor Error:", error);
  } finally {
    isProcessing = false;
  }
}

function startOutboxProcessor() {
  console.log("[Outbox] Processor started (Checking every 1s)");
  // Interval dipercepat menjadi 1 detik untuk pengecekan jeda yang lebih akurat
  setInterval(processOutbox, 1000);
}


module.exports = { startOutboxProcessor };
