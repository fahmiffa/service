const { PrismaClient } = require("@prisma/client");
const whatsappService = require("./whatsappService");
const prisma = new PrismaClient();

// GET all invoices (with optional period filter)
const getAllInvoices = async (req, res) => {
  try {
    const { period } = req.query;
    const where = period ? { period } : {};
    const invoices = await prisma.invoice.findMany({
      where,
      include: { customer: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET single invoice
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(id) },
      include: { customer: true },
    });
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generate monthly invoices for all customers
const generateMonthlyInvoices = async (req, res) => {
  try {
    const { period } = req.body; // format: "2026-02"
    if (!period) {
      return res
        .status(400)
        .json({ message: "Period is required (format: YYYY-MM)" });
    }

    const customers = await prisma.customer.findMany({
      where: { amount: { gt: 0 } },
    });

    if (customers.length === 0) {
      return res
        .status(400)
        .json({ message: "Tidak ada customer dengan tagihan" });
    }

    // Check if invoices already exist for this period
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
      return res
        .status(400)
        .json({ message: "Invoice untuk periode ini sudah di-generate" });
    }

    // Generate invoice number: INV-YYYYMM-XXX
    const periodShort = period.replace("-", "");
    let counter = existingInvoices.length;

    const invoices = [];
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
      invoices.push(invoice);
    }

    res.status(201).json({
      message: `${invoices.length} invoice berhasil di-generate`,
      invoices,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update invoice status
const updateInvoiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updateData = { status };
    if (status === "paid") {
      updateData.paidAt = new Date();
    }

    const invoice = await prisma.invoice.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: { customer: true },
    });

    res.json({ message: "Status invoice berhasil diperbarui", invoice });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete invoice
const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.invoice.delete({ where: { id: parseInt(id) } });
    res.json({ message: "Invoice berhasil dihapus" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Format currency
function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

// Format period to readable month name
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

// Send single invoice via WhatsApp
const sendInvoiceWhatsApp = async (req, res) => {
  try {
    const { id } = req.params;
    const { sender } = req.body; // nomor WA pengirim (deviceId)

    if (!sender) {
      return res.status(400).json({ message: "Sender (nomor WA) diperlukan" });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(id) },
      include: { customer: true },
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const message = `📋 *INVOICE TAGIHAN*\n\nNo. Invoice: ${invoice.invoiceNo}\nNama: ${invoice.customer.name}\nPeriode: ${formatPeriod(invoice.period)}\nJumlah: ${formatRupiah(invoice.amount)}\n\nMohon segera melakukan pembayaran.\nTerima kasih 🙏`;

    await whatsappService.sendMessage(sender, invoice.customer.hp, message);

    await prisma.invoice.update({
      where: { id: parseInt(id) },
      data: { status: "sent", sentAt: new Date() },
    });

    res.json({ message: "Invoice berhasil dikirim via WhatsApp" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Send all unpaid invoices via WhatsApp
const sendAllPendingInvoices = async (req, res) => {
  try {
    const { sender, period } = req.body;

    if (!sender) {
      return res.status(400).json({ message: "Sender (nomor WA) diperlukan" });
    }

    const where = { status: { in: ["unpaid"] } };
    if (period) where.period = period;

    const invoices = await prisma.invoice.findMany({
      where,
      include: { customer: true },
    });

    if (invoices.length === 0) {
      return res
        .status(400)
        .json({ message: "Tidak ada invoice yang perlu dikirim" });
    }

    const results = [];
    for (const invoice of invoices) {
      try {
        const message = `📋 *INVOICE TAGIHAN*\n\nNo. Invoice: ${invoice.invoiceNo}\nNama: ${invoice.customer.name}\nPeriode: ${formatPeriod(invoice.period)}\nJumlah: ${formatRupiah(invoice.amount)}\n\nMohon segera melakukan pembayaran.\nTerima kasih 🙏`;

        await whatsappService.sendMessage(sender, invoice.customer.hp, message);

        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: "sent", sentAt: new Date() },
        });

        results.push({ invoiceNo: invoice.invoiceNo, status: "sent" });

        // Delay 3 detik antar pesan
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (err) {
        results.push({
          invoiceNo: invoice.invoiceNo,
          status: "failed",
          error: err.message,
        });
      }
    }

    res.json({
      message: "Broadcast invoice selesai",
      total: results.length,
      sent: results.filter((r) => r.status === "sent").length,
      failed: results.filter((r) => r.status === "failed").length,
      results,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  generateMonthlyInvoices,
  updateInvoiceStatus,
  deleteInvoice,
  sendInvoiceWhatsApp,
  sendAllPendingInvoices,
};
