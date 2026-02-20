const express = require("express");
const controller = require("./invoiceController");
const router = express.Router();

router.get("/invoices", controller.getAllInvoices);
router.get("/invoices/:id", controller.getInvoiceById);
router.post("/invoices/generate", controller.generateMonthlyInvoices);
router.put("/invoices/:id", controller.updateInvoiceStatus);
router.delete("/invoices/:id", controller.deleteInvoice);
router.post("/invoices/:id/send", controller.sendInvoiceWhatsApp);
router.post("/invoices/send-all", controller.sendAllPendingInvoices);

module.exports = router;
