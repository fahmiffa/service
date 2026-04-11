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

function startScheduler() {
  console.log("[Scheduler] Minutely precise scheduler started");

  // Berjalan SETIAP MENIT
  cron.schedule("* * * * *", async () => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    try {
      const customers = await prisma.customer.findMany({
        where: { amount: { gt: 0 } },
      });

      console.log(`[Scheduler] Cycle at ${now.toLocaleTimeString()} - Checking ${customers.length} customers`);

      const senderDeviceId = await getActiveSession();

      for (const customer of customers) {
        const existingInvoice = await prisma.invoice.findFirst({
          where: { 
            customerId: customer.id,
            period: period
          },
        });

        if (existingInvoice) {
          // console.log(`[Scheduler] Skipping ${customer.name}: Invoice already exists`);
          continue;
        }

        const [dueHour, dueMinute] = (customer.dueTime || "00:00").split(":").map(Number);
        
        const isPastDate = currentDay > customer.dueDateDay;
        const isExactDayAndTime = currentDay === customer.dueDateDay && 
                                  (currentHour > dueHour || (currentHour === dueHour && currentMinute >= dueMinute));

        if (isPastDate || isExactDayAndTime) {
          console.log(`[Scheduler] Processing invoice for ${customer.name}...`);
          
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
              
              console.log(`[Scheduler] SUCCESS: Message sent to ${customer.name}`);
            } catch (err) {
              console.error(`[Scheduler] WA SEND ERROR for ${customer.name}:`, err.message);
            }
          } else {
            console.warn(`[Scheduler] WARNING: No active session to send message for ${customer.name}`);
          }
        }
      }
    } catch (error) {
      console.error("[Scheduler] CRITICAL ERROR:", error);
    }
  });

  // Ucapan Harian jam 05:00
  cron.schedule("0 5 * * *", async () => {
    try {
      const senderId = await getActiveSession();
      if (!senderId) return;
      await whatsappService.sendMessage(senderId, "6285173156513", "Assalammualaikum");
    } catch (err) {
      console.error(`[Scheduler] Greeting error:`, err.message);
    }
  });
}

module.exports = { startScheduler };
