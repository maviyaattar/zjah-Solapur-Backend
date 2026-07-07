// ==========================================================
// 🕌 ZJAH Solapur Backend
// Version : 1.0.0
// Developer : Maviya Attar
// ==========================================================


// =====================
// IMPORTS
// =====================

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// =====================
// MONGODB CONNECTION
// =====================

const MONGO_URI =
  "YOUR_MONGODB_CONNECTION_STRING";

mongoose
  .connect(MONGO_URI)
  .then(() => {

    console.log("🍃 MongoDB Connected");

  })
  .catch((error) => {

    console.log("❌ MongoDB Connection Failed");

    console.log(error.message);

  });

// =====================
// APP
// =====================

const app = express();


// =====================
// MIDDLEWARE
// =====================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));


// =====================
// HOME ROUTE
// =====================

app.get("/", (req, res) => {

    res.status(200).json({

        success: true,

        app: "ZJAH Solapur Backend",

        version: "1.0.0",

        developer: "Maviya Attar",

        status: "Running Successfully"

    });

});


// =====================
// 404 ROUTE
// =====================

app.use((req, res) => {

    res.status(404).json({

        success: false,

        message: "API Not Found"

    });

});


// =====================
// SERVER
// =====================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

    console.log(`🚀 Server Running On Port ${PORT}`);

});
