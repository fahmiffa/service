const express = require("express");
const cors = require("cors");
const path = require("path");
const routes = require("./apiRoutes");
const authRoutes = require("./authRoutes");
const schoolRoutes = require("./schoolRoutes");
const customerRoutes = require("./customerRoutes");
const invoiceRoutes = require("./invoiceRoutes");
require("dotenv").config();

const app = express();

// Middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/api", routes);
app.use("/api/auth", authRoutes);
app.use("/api", schoolRoutes);
app.use("/api", customerRoutes);
app.use("/api", invoiceRoutes);
const botRoutes = require("./botRoutes");
app.use("/api/bots", botRoutes);

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

module.exports = app;
