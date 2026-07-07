// ============================================================
// 🕌 ZJAH SOLAPUR BACKEND
// Production Version
// Developer : Maviya Attar
// ============================================================

// ==========================
// IMPORTS
// ==========================

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// ==========================
// MODELS
// ==========================

const User = require("./models/User");
const Program = require("./models/Program");
const Masjid = require("./models/Masjid");
const Scholar = require("./models/Scholar");
const Library = require("./models/Library");
const Announcement = require("./models/Announcement");

// ==========================
// APP
// ==========================

const app = express();

// ==========================
// CONFIG
// ==========================

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// ==========================
// DATABASE
// ==========================

mongoose
.connect(MONGO_URI)
.then(() => {

    console.log("✅ MongoDB Connected");

})
.catch((err) => {

    console.log("❌ MongoDB Connection Failed");
    console.log(err.message);

    process.exit(1);

});

// ==========================
// MIDDLEWARE
// ==========================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

// ==========================
// RESPONSE HELPERS
// ==========================

function success(res, message, data = null, status = 200){

    return res.status(status).json({

        success: true,

        message,

        data

    });

}

function failed(res, message, status = 400){

    return res.status(status).json({

        success: false,

        message

    });

}

// ==========================
// JWT
// ==========================

function generateToken(user){

    return jwt.sign(

        {

            id: user._id,

            role: user.role

        },

        JWT_SECRET,

        {

            expiresIn: "30d"

        }

    );

}

// ==========================
// AUTH MIDDLEWARE
// ==========================

async function auth(req,res,next){

    try{

        const authHeader = req.headers.authorization;

        if(!authHeader)
            return failed(res,"Authorization Required",401);

        const token = authHeader.split(" ")[1];

        if(!token)
            return failed(res,"Invalid Token",401);

        const decoded = jwt.verify(token,JWT_SECRET);

        req.user = decoded;

        next();

    }

    catch(err){

        return failed(res,"Unauthorized",401);

    }

}

// ==========================
// ROLE MIDDLEWARE
// ==========================

function allow(...roles){

    return (req,res,next)=>{

        if(!roles.includes(req.user.role))
            return failed(res,"Access Denied",403);

        next();

    }

}

// ==========================
// HEALTH CHECK
// ==========================

app.get("/",(req,res)=>{

    success(

        res,

        "Backend Running",

        {

            app:"ZJAH Solapur",

            version:"1.0.0",

            environment:process.env.NODE_ENV || "development"

        }

    );

});

// ==========================
// 404
// ==========================

app.use((req,res)=>{

    failed(res,"API Not Found",404);

});

// ==========================
// SERVER
// ==========================

app.listen(PORT,()=>{

    console.log(`
==========================================
🕌 ZJAH SOLAPUR BACKEND
==========================================
🚀 Server Started
🌐 Port : ${PORT}
==========================================
`);

});