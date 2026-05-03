const express = require("express");
const cors = require("cors");
const axios = require("axios");
const http = require("http");
const { Server } = require("socket.io");
let isOrderingEnabled = true;
require('dotenv').config();

// ROUTES
const authRoutes = require("./routes/auth");
const orderRoutes = require("./routes/orders");

const app = express();
app.use(cors());
app.use(express.json());
const fs = require("fs");
const path = require("path");

const visitFile = path.join(__dirname, "visits.json");

// ===== TRACK VISIT =====
app.post("/track-visit", (req, res) => {
  let visits = [];

  if (fs.existsSync(visitFile)) {
    try {
      visits = JSON.parse(fs.readFileSync(visitFile));
    } catch {
      visits = [];
    }
  }

  visits.push({ time: new Date().toISOString() });

  fs.writeFileSync(visitFile, JSON.stringify(visits, null, 2));

  res.json({ success: true });
});

app.get("/visit-stats", (req, res) => {
  let visits = [];

  if (fs.existsSync(visitFile)) {
     try {
    visits = JSON.parse(fs.readFileSync(visitFile));
  } catch (err) {
    visits = [];
  }
}

  const now = new Date(
  new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
);

  let daily = 0;
  let weekly = 0;
  let monthly = 0;
  let yearly = 0;

  visits.forEach(v => {
    const visitDate = new Date(v.time);

    const diffDays = (now - visitDate) / (1000 * 60 * 60 * 24);

    if (diffDays <= 1) daily++;
    if (diffDays <= 7) weekly++;
    if (
      visitDate.getMonth() === now.getMonth() &&
      visitDate.getFullYear() === now.getFullYear()
    ) monthly++;

    if (visitDate.getFullYear() === now.getFullYear()) yearly++;
  });

  res.json({
    total: visits.length,
    daily,
    weekly,
    monthly,
    yearly
  });
});

// ===== GOOGLE API KEY =====
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// ===== ROUTE DISTANCE API (IMPORTANT) =====
app.get("/route", async (req, res) => {
  const { origin, destination } = req.query;

  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/directions/json",
      {
        params: {
          origin,
          destination,
          key: GOOGLE_API_KEY
        }
      }
    );

    const route = response.data.routes[0].legs[0];

    res.json({
      distance: route.distance.text,   // ✅ ROAD DISTANCE
      duration: route.duration.text
    });

  } catch (err) {
    res.status(500).json({ error: "API Error" });
  }
});

// ===== ADMIN ROUTES =====
app.use("/auth", authRoutes);
app.use("/orders", orderRoutes);
// ✅ ADD THIS HERE
app.get("/", (req, res) => {
  res.send("🚀 Namaste Cafe Backend Running");
});

// ===== SERVER =====
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});
// ✅ GET current status
app.get("/order-status", (req, res) => {
  res.json({ enabled: isOrderingEnabled });
});

// ✅ Toggle ON/OFF
app.post("/toggle-orders", (req, res) => {
  isOrderingEnabled = !isOrderingEnabled;
  res.json({ enabled: isOrderingEnabled });
});

// 🔥 MAKE IO GLOBAL
app.set("io", io);


const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server + Socket running on ${PORT}`);
});
