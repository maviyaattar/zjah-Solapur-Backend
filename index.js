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

// ==========================================================
// AUTH APIs
// ==========================================================


// First Super Admin Setup
app.post("/setup", async (req, res) => {

    try {

        const { name, email, password } = req.body;

        if (!name || !email || !password)
            return failed(res, "All Fields Required");

        const alreadyExists = await User.findOne({
            role: "SUPER_ADMIN"
        });

        if (alreadyExists)
            return failed(res, "Super Admin Already Exists");

        const hash = await bcrypt.hash(password, 10);

        const user = await User.create({

            name,

            email,

            password: hash,

            role: "SUPER_ADMIN"

        });

        success(

            res,

            "Super Admin Created",

            {

                id: user._id,

                email: user.email

            },

            201

        );

    }

    catch (err) {

        failed(res, err.message);

    }

});




// Login
app.post("/login", async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password)
            return failed(res, "Email & Password Required");

        const user = await User.findOne({

            email

        });

        if (!user)
            return failed(res, "Invalid Credentials", 401);

        if (!user.isActive)
            return failed(res, "Account Disabled", 403);

        const match = await bcrypt.compare(

            password,

            user.password

        );

        if (!match)
            return failed(res, "Invalid Credentials", 401);

        const token = generateToken(user);

        success(

            res,

            "Login Successful",

            {

                token,

                user: {

                    id: user._id,

                    name: user.name,

                    email: user.email,

                    role: user.role

                }

            }

        );

    }

    catch (err) {

        failed(res, err.message);

    }

});




// Current User
app.get("/me", auth, async (req, res) => {

    try {

        const user = await User.findById(req.user.id)

        .select("-password");

        if (!user)
            return failed(res, "User Not Found", 404);

        success(res, "Profile", user);

    }

    catch (err) {

        failed(res, err.message);

    }

});




// Change Password
app.put("/change-password", auth, async (req, res) => {

    try {

        const {

            currentPassword,

            newPassword

        } = req.body;

        if (!currentPassword || !newPassword)
            return failed(res, "All Fields Required");

        const user = await User.findById(req.user.id);

        const match = await bcrypt.compare(

            currentPassword,

            user.password

        );

        if (!match)
            return failed(res, "Current Password Incorrect");

        user.password = await bcrypt.hash(

            newPassword,

            10

        );

        await user.save();

        success(res, "Password Updated");

    }

    catch (err) {

        failed(res, err.message);

    }

});




// ==========================================================
// ADMIN MANAGEMENT
// ==========================================================


// Create Program Admin
app.post(
"/admins/program",
auth,
allow("SUPER_ADMIN"),
async(req,res)=>{

try{

const{

name,
email,
password

}=req.body;

if(!name||!email||!password)
return failed(res,"All Fields Required");

const exists=await User.findOne({email});

if(exists)
return failed(res,"Email Already Exists");

const hash=await bcrypt.hash(password,10);

const admin=await User.create({

name,
email,
password:hash,
role:"PROGRAM_ADMIN"

});

success(
res,
"Program Admin Created",
admin,
201
);

}

catch(err){

failed(res,err.message);

}

});




// Create Masjid Admin
app.post(
"/admins/masjid",
auth,
allow("SUPER_ADMIN"),
async(req,res)=>{

try{

const{

name,
email,
password,
assignedMasjid

}=req.body;

if(
!name||
!email||
!password
)
return failed(res,"All Fields Required");

const exists=await User.findOne({email});

if(exists)
return failed(res,"Email Already Exists");

const hash=await bcrypt.hash(password,10);

const admin=await User.create({

name,
email,
password:hash,
role:"MASJID_ADMIN",
assignedMasjid

});

success(
res,
"Masjid Admin Created",
admin,
201
);

}

catch(err){

failed(res,err.message);

}

});


// Create Scholar
app.post(
"/admins/scholar",
auth,
allow("SUPER_ADMIN"),
async(req,res)=>{

try{

const{

name,
email,
password

}=req.body;

if(
!name||
!email||
!password
)
return failed(res,"All Fields Required");

const exists=await User.findOne({email});

if(exists)
return failed(res,"Email Already Exists");

const hash=await bcrypt.hash(password,10);

const scholar=await User.create({

name,
email,
password:hash,
role:"SCHOLAR"

});

success(
res,
"Scholar Created",
scholar,
201
);

}

catch(err){

failed(res,err.message);

}

});




// Get All Admins
app.get(
"/admins",
auth,
allow("SUPER_ADMIN"),
async(req,res)=>{

try{

const admins=await User.find({

role:{
$ne:"SUPER_ADMIN"
}

}).select("-password");

success(
res,
"Admins List",
admins
);

}

catch(err){

failed(res,err.message);

}

});




// Enable / Disable Admin
app.patch(
"/admins/:id/status",
auth,
allow("SUPER_ADMIN"),
async(req,res)=>{

try{

const admin=await User.findById(req.params.id);

if(!admin)
return failed(res,"Admin Not Found",404);

admin.isActive=!admin.isActive;

await admin.save();

success(
res,
"Status Updated",
admin
);

}

catch(err){

failed(res,err.message);

}

});




// Delete Admin
app.delete(
"/admins/:id",
auth,
allow("SUPER_ADMIN"),
async(req,res)=>{

try{

const admin=await User.findById(req.params.id);

if(!admin)
return failed(res,"Admin Not Found",404);

if(admin.role==="SUPER_ADMIN")
return failed(res,"Cannot Delete Super Admin");

await admin.deleteOne();

success(
res,
"Admin Deleted"
);

}

catch(err){

failed(res,err.message);

}

});


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