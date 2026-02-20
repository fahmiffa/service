const express = require("express");
const controller = require("./customerController");
const router = express.Router();

router.get("/customers", controller.getAllCustomers);
router.get("/customers/:id", controller.getCustomerById);
router.post("/customers", controller.createCustomer);
router.put("/customers/:id", controller.updateCustomer);
router.delete("/customers/:id", controller.deleteCustomer);

module.exports = router;
