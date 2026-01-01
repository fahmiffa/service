const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const routes = require("./apiRoutes");

const app = express();

app.use(cors({ origin: "*", methods: ["GET", "POST"], credentials: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api", routes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

module.exports = app;
