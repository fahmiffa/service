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
    hour: "2-digit",
    minute: "2-digit",
  }).replace(/\./g, ":");
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
  // Berjalan SETIAP MENIT untuk mengecek apakah ada customer yang sudah masuk waktu jatuh temponya
  cron.schedule("* * * * *", async () => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    try {
      // 1. Ambil semua customer yang memiliki tagihan
      const customers = await prisma.customer.findMany({
        where: { amount: { gt: 0 } },
      });

      console.log(`[Scheduler] Cycle at ${new Date().toLocaleTimeString()} - Found ${customers.length} customers with billing`);

      // 2. Cari sesi WhatsApp aktif sekali saja untuk efisiensi
      const senderDeviceId = await getActiveSession();

      for (const customer of customers) {
        // Cek apakah invoice bulan ini sudah ada
        const existingInvoice = await prisma.invoice.findFirst({
          where: { 
            customerId: customer.id,
            period: period
          },
        });

        if (existingInvoice) {
          console.log(`[Scheduler] Skipping ${customer.name}: Invoice already exists for ${period}`);
          continue;
        }

        // Ambil waktu jatuh tempo dari customer
        const [dueHour, dueMinute] = (customer.dueTime || "00:00").split(":").map(Number);
        
        // Cek apakah sudah waktunya:
        const isPastDate = currentDay > customer.dueDateDay;
        const isExactDayAndTime = currentDay === customer.dueDateDay && 
                                  (currentHour > dueHour || (currentHour === dueHour && currentMinute >= dueMinute));

        if (!isPastDate && !isExactDayAndTime) {
           console.log(`[Scheduler] Wait time for ${customer.name} (Scheduled: Tgl ${customer.dueDateDay} ${customer.dueTime})`);
           continue;
        }
          console.log(`[Scheduler] Generating JIT invoice for ${customer.name} (Due: Tgl ${customer.dueDateDay} ${customer.dueTime})`);
          
          const periodShort = period.replace("-", "");
          const totalInvoices = await prisma.invoice.count({ where: { period } });
          const invoiceNo = `INV-${periodShort}-${String(totalInvoices + 1).padStart(3, "0")}`;

          const dueDateTimestamp = new Date(now.getFullYear(), now.getMonth(), customer.dueDateDay, dueHour, dueMinute);

          const invoice = await prisma.invoice.create({
            data: {
              invoiceNo,
              customerId: customer.id,
              amount: customer.amount,
              period,
              status: "unpaid",
              dueDate: dueDateTimestamp,
            },
            include: { customer: true },
          });

          // Kirim WhatsApp
          if (senderDeviceId) {
            try {
              const messageData = {
                invoiceNo: invoice.invoiceNo,
                name: invoice.customer.name,
                period: formatPeriod(invoice.period),
                amount: formatRupiah(invoice.amount),
                dueDate: formatDate(invoice.dueDate),
                alamat: invoice.customer.alamat,
              };

              const message = replaceTemplate(invoice.customer.messageTemplate, messageData);
              await whatsappService.sendMessage(senderDeviceId, invoice.customer.hp, message);

              await prisma.invoice.update({
                where: { id: invoice.id },
                data: { status: "sent", sentAt: new Date() },
              });
              
              console.log(`[Scheduler] Notification sent to ${customer.name}`);
            } catch (err) {
              console.error(`[Scheduler] Failed to send to ${customer.name}:`, err.message);
            }
          }
        }
      }
    } catch (error) {
      console.error("[Scheduler] Minute Task Error:", error.message);
    }
  });

  // Ucapan Harian jam 05:00
  cron.schedule("0 5 * * *", async () => {
    console.log("[Scheduler] Running daily greeting...");
    try {
      const senderId = await getActiveSession();
      if (!senderId) return;

      const targetNumber = "6285173156513";
      const message = "Assalammualaikum";
      await whatsappService.sendMessage(senderId, targetNumber, message);
    } catch (err) {
      console.error(`[Scheduler] Greeting error:`, err.message);
    }
  });

  console.log("[Scheduler] Minutely precise scheduler started");
}

// Helper to find active session
async function getActiveSession() {
  const fs = require("fs");
  const path = require("path");
  const sessionsDir = path.join(__dirname, "sessions");
  if (fs.existsSync(sessionsDir)) {
    const list = fs.readdirSync(sessionsDir);
    return list.length > 0 ? list[0] : null;
  }
  return null;
}

module.exports = { startScheduler };
