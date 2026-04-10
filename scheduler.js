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

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function replaceTemplate(template, data) {
  if (!template) {
    return `📋 *INVOICE TAGIHAN*\n\nNo. Invoice: ${data.invoiceNo}\nNama: ${data.name}\nPeriode: ${data.period}\nJumlah: ${data.amount}\nJatuh Tempo: ${data.dueDate}\n\nMohon segera melakukan pembayaran.\nTerima kasih 🙏`;
  }

  return template
    .replace(/{name}/g, data.name)
    .replace(/{invoiceNo}/g, data.invoiceNo)
    .replace(/{amount}/g, data.amount)
    .replace(/{period}/g, data.period)
    .replace(/{dueDate}/g, data.dueDate)
    .replace(/{alamat}/g, data.alamat || "-");
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

      const [yearStr, monthStr] = period.split("-");

      for (const customer of newCustomers) {
        counter++;
        const invoiceNo = `INV-${periodShort}-${String(counter).padStart(3, "0")}`;

        // Calculate dueDate based on customer.dueDateDay
        const dueDate = new Date(
          parseInt(yearStr),
          parseInt(monthStr) - 1,
          customer.dueDateDay || 10,
        );

        const invoice = await prisma.invoice.create({
          data: {
            invoiceNo,
            customerId: customer.id,
            amount: customer.amount,
            period,
            status: "unpaid",
            dueDate,
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
          const messageData = {
            invoiceNo: invoice.invoiceNo,
            name: invoice.customer.name,
            period: formatPeriod(invoice.period),
            amount: formatRupiah(invoice.amount),
            dueDate: formatDate(invoice.dueDate),
            alamat: invoice.customer.alamat,
          };

          const message = replaceTemplate(
            invoice.customer.messageTemplate,
            messageData,
          );

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


  cron.schedule("0 5 * * *", async () => {
    console.log("[Scheduler] Running daily greeting scheduler...");
    const senderId = "085640431181";
    const targetNumber = "6285173156513";
    const message = "Assalammualaikum";

    try {
      await whatsappService.sendMessage(senderId, targetNumber, message);
      console.log(
        `[Scheduler] Daily greeting sent successfully to ${targetNumber}`,
      );
    } catch (err) {
      console.error(`[Scheduler] Failed to send daily greeting:`, err.message);
    }
  });

  console.log(
    "[Scheduler] Daily greeting scheduler started (runs every day at 05:00)",
  );
}

module.exports = { startScheduler };
