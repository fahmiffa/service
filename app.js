import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import routes from "./apiRoutes.js";
import authRoutes from "./authRoutes.js";
import customerRoutes from "./customerRoutes.js";
import invoiceRoutes from "./invoiceRoutes.js";
import botRoutes from "./botRoutes.js";
import outboxRoutes from "./outboxRoutes.js";

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
app.use("/api", customerRoutes);
app.use("/api", invoiceRoutes);
app.use("/api/bots", botRoutes);
app.use("/api/outbox", outboxRoutes);

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

export default app;
