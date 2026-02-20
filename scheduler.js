const cron = require("node-cron");
const { PrismaClient } = require("@prisma/client");
const whatsappService = require("./whatsappService");
const prisma = new PrismaClient();

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatPeriod(period) {
  const [year, month] = period.split("-");
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  return `${months[parseInt(month) - 1]} ${year}`;
}

function startScheduler() {
  // Jalankan setiap tanggal 1, jam 08:00 pagi
  // Format cron: minute hour day-of-month month day-of-week
  cron.schedule("0 8 1 * *", async () => {
    console.log("[Scheduler] Running monthly invoice generation...");

    try {
      const now = new Date();
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      // 1. Generate invoices for all customers with amount > 0
      const customers = await prisma.customer.findMany({
        where: { amount: { gt: 0 } },
      });

      const existingInvoices = await prisma.invoice.findMany({
        where: { period },
      });
      const existingCustomerIds = new Set(
        existingInvoices.map((inv) => inv.customerId),
      );
      const newCustomers = customers.filter(
        (c) => !existingCustomerIds.has(c.id),
      );

      if (newCustomers.length === 0) {
        console.log(
          "[Scheduler] All invoices already generated for period:",
          period,
        );
        return;
      }

      const periodShort = period.replace("-", "");
      let counter = existingInvoices.length;
      const generatedInvoices = [];

      for (const customer of newCustomers) {
        counter++;
        const invoiceNo = `INV-${periodShort}-${String(counter).padStart(3, "0")}`;
        const invoice = await prisma.invoice.create({
          data: {
            invoiceNo,
            customerId: customer.id,
            amount: customer.amount,
            period,
            status: "unpaid",
          },
          include: { customer: true },
        });
        generatedInvoices.push(invoice);
      }

      console.log(
        `[Scheduler] Generated ${generatedInvoices.length} invoices for period ${period}`,
      );

      // 2. Send WhatsApp notifications
      // Find the first active WhatsApp session to use as sender
      const fs = require("fs");
      const path = require("path");
      const sessionsDir = path.join(__dirname, "sessions");
      let senderDeviceId = null;

      if (fs.existsSync(sessionsDir)) {
        const sessions = fs.readdirSync(sessionsDir);
        if (sessions.length > 0) {
          senderDeviceId = sessions[0]; // Use first available session
        }
      }

      if (!senderDeviceId) {
        console.log(
          "[Scheduler] No WhatsApp session found, skipping notifications",
        );
        return;
      }

      let sentCount = 0;
      let failedCount = 0;

      for (const invoice of generatedInvoices) {
        try {
          const message = `📋 *INVOICE TAGIHAN*\n\nNo. Invoice: ${invoice.invoiceNo}\nNama: ${invoice.customer.name}\nPeriode: ${formatPeriod(invoice.period)}\nJumlah: ${formatRupiah(invoice.amount)}\n\nMohon segera melakukan pembayaran.\nTerima kasih 🙏`;

          await whatsappService.sendMessage(
            senderDeviceId,
            invoice.customer.hp,
            message,
          );

          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: "sent", sentAt: new Date() },
          });

          sentCount++;
          // Delay 5 detik antar pesan
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } catch (err) {
          console.error(
            `[Scheduler] Failed to send invoice ${invoice.invoiceNo}:`,
            err.message,
          );
          failedCount++;
        }
      }

      console.log(
        `[Scheduler] WhatsApp notifications: ${sentCount} sent, ${failedCount} failed`,
      );
    } catch (error) {
      console.error("[Scheduler] Error:", error.message);
    }
  });

  console.log(
    "[Scheduler] Monthly invoice scheduler started (runs on 1st of every month at 08:00)",
  );
}

module.exports = { startScheduler };
