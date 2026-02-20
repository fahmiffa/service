const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// GET all customers
const getAllCustomers = async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET single customer
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) },
    });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CREATE customer
const createCustomer = async (req, res) => {
  try {
    const { name, hp, alamat, amount } = req.body;
    const customer = await prisma.customer.create({
      data: { name, hp, alamat, amount: amount ? parseFloat(amount) : 0 },
    });
    res.status(201).json({
      message: "Customer created successfully",
      customer,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// UPDATE customer
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, hp, alamat, amount } = req.body;
    const customer = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: {
        name,
        hp,
        alamat,
        amount: amount !== undefined ? parseFloat(amount) : undefined,
      },
    });
    res.json({
      message: "Customer updated successfully",
      customer,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE customer
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.customer.delete({
      where: { id: parseInt(id) },
    });
    res.json({ message: "Customer deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
