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
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("mongo-sanitize");
const validator = require("validator");
const pino = require("pino");
const pinoHttp = require("pino-http");
require("dotenv").config();

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

const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const isProd = process.env.NODE_ENV === "production";

if(!MONGO_URI){
    console.error("❌ MONGO_URI is required");
    process.exit(1);
}

if(!JWT_SECRET){
    console.error("❌ JWT_SECRET is required");
    process.exit(1);
}

const logger = pino({
    level: process.env.LOG_LEVEL || (isProd ? "info" : "debug")
});

// ==========================
// MIDDLEWARE
// ==========================

app.use(pinoHttp({ logger }));

app.use(helmet());

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests, try again later."
    }
});

app.use(cors({
    origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",").map((origin)=>origin.trim()),
    credentials: true
}));

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

app.use((req,res,next)=>{
    if(req.originalUrl === "/api/v1" || req.url === "/api/v1"){
        req.url = "/";
        return next();
    }

    if(req.url.startsWith("/api/v1/")){
        req.url = req.url.replace("/api/v1", "");
    }

    next();
});

app.use((req,res,next)=>{
    if(req.body && typeof req.body === "object"){
        req.body = mongoSanitize(req.body);
    }

    if(req.query && typeof req.query === "object"){
        req.query = mongoSanitize(req.query);
    }

    next();
});

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

function handleError(res,err){
    if(err?.name === "CastError"){
        return failed(res,"Invalid identifier",400);
    }

    if(err?.name === "ValidationError"){
        return failed(res,err.message,400);
    }

    if(err?.code === 11000){
        return failed(res,"Duplicate value already exists",409);
    }

    if(!isProd){
        logger.error({ err }, "Request failed");
    }

    return failed(res,isProd ? "Internal Server Error" : err.message,500);
}

function sanitizeUser(user){
    if(!user){
        return null;
    }

    return {
        id:user._id,
        name:user.name,
        email:user.email,
        role:user.role,
        assignedMasjid:user.assignedMasjid,
        isActive:user.isActive,
        createdAt:user.createdAt,
        updatedAt:user.updatedAt
    };
}

function isValidObjectId(id){
    return mongoose.Types.ObjectId.isValid(id);
}

function isValidEmail(email){
    return validator.isEmail(String(email || ""));
}

function isValidUrl(url){
    if(!url){
        return true;
    }

    return validator.isURL(String(url),{
        protocols:["http","https"],
        require_protocol:true
    });
}

function isValidDate(date){
    if(!date){
        return true;
    }

    return !Number.isNaN(new Date(date).getTime());
}

function isValidTime(time){
    if(!time){
        return true;
    }

    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(time));
}

function assertValidObjectId(res,id,label){
    if(!isValidObjectId(id)){
        failed(res,`${label} is invalid`,400);
        return false;
    }

    return true;
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

        const user = await User.findById(decoded.id).select("id role isActive");

        if(!user || !user.isActive){
            return failed(res,"Unauthorized",401);
        }

        req.user = decoded;
        req.user.role = user.role;

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

        if(!isValidEmail(email))
            return failed(res,"Invalid Email");

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

        handleError(res,err);

    }

});




// Login
app.post("/login", authLimiter, async (req, res) => {

    try {

        const { email, password } = req.body;

        if (!email || !password)
            return failed(res, "Email & Password Required");

        if(!isValidEmail(email))
            return failed(res,"Invalid Email");

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

        handleError(res,err);

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

        handleError(res,err);

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

        if(newPassword.length < 8)
            return failed(res,"New Password must be at least 8 characters");

        const user = await User.findById(req.user.id);

        if(!user)
            return failed(res,"User Not Found",404);

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

        handleError(res,err);

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

if(!isValidEmail(email))
return failed(res,"Invalid Email");

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
sanitizeUser(admin),
201
);

}

catch(err){

handleError(res,err);

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

if(!isValidEmail(email))
return failed(res,"Invalid Email");

if(assignedMasjid && !assertValidObjectId(res,assignedMasjid,"assignedMasjid"))
return;

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
sanitizeUser(admin),
201
);

}

catch(err){

handleError(res,err);

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

if(!isValidEmail(email))
return failed(res,"Invalid Email");

const exists=await User.findOne({email});

if(exists)
return failed(res,"Email Already Exists");

const hash=await bcrypt.hash(password,10);

const scholarUser=await User.create({

name,
email,
password:hash,
role:"SCHOLAR"

});

let scholarProfile = null;

try{

scholarProfile=await Scholar.create({
user:scholarUser._id,
fullName:name,
email
});

}
catch(scholarCreateError){

await User.findByIdAndDelete(scholarUser._id);
throw scholarCreateError;

}

success(
res,
"Scholar Created",
{
user:sanitizeUser(scholarUser),
scholar:scholarProfile
},
201
);

}

catch(err){

handleError(res,err);

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

handleError(res,err);

}

});




// Enable / Disable Admin
app.patch(
"/admins/:id/status",
auth,
allow("SUPER_ADMIN"),
async(req,res)=>{

try{

if(!assertValidObjectId(res,req.params.id,"Admin ID"))
return;

const admin=await User.findById(req.params.id);

if(!admin)
return failed(res,"Admin Not Found",404);

if(admin.role==="SUPER_ADMIN")
return failed(res,"Cannot Change Super Admin Status",403);

admin.isActive=!admin.isActive;

await admin.save();

success(
res,
"Status Updated",
sanitizeUser(admin)
);

}

catch(err){

handleError(res,err);

}

});




// Delete Admin
app.delete(
"/admins/:id",
auth,
allow("SUPER_ADMIN"),
async(req,res)=>{

try{

if(!assertValidObjectId(res,req.params.id,"Admin ID"))
return;

const admin=await User.findById(req.params.id);

if(!admin)
return failed(res,"Admin Not Found",404);

if(admin.role==="SUPER_ADMIN")
return failed(res,"Cannot Delete Super Admin");

if(admin.role==="SCHOLAR"){
await Scholar.findOneAndDelete({user:admin._id});
}

await admin.deleteOne();

success(
res,
"Admin Deleted"
);

}

catch(err){

handleError(res,err);

}

});



// ==========================================================
// PROGRAMS
// ==========================================================

// Create Program

app.post(
"/programs",
auth,
allow("SUPER_ADMIN","PROGRAM_ADMIN"),
async(req,res)=>{

try{

const{

title,
banner,
type,
description,

speakers,
guestSpeakers,

venueType,
masjid,

customVenueName,
customAddress,
googleMapLink,

startDate,
endDate,

startTime,
endTime,

audience,

registrationRequired,
registrationLink,
registrationDeadline,
maxParticipants,

featured,
status

}=req.body;


// Required Validation

if(
!title||
!type||
!startDate||
!startTime
){

return failed(
res,
"Required fields missing."
);

}


// Venue Validation

if(venueType==="MASJID"){

if(!masjid)
return failed(
res,
"Please select a Masjid."
);

if(!assertValidObjectId(res,masjid,"Masjid ID"))
return;

}

else{

if(
!customVenueName||
!customAddress
){

return failed(
res,
"Custom venue required."
);

}

}


// End Date

const finalEndDate=endDate || startDate;


// Workshop Validation

if(
type==="WORKSHOP" &&
registrationRequired
){

if(
!registrationLink||
!registrationDeadline
){

return failed(
res,
"Registration details required."
);

}

}

if(!isValidDate(startDate) || !isValidDate(endDate))
return failed(res,"Invalid date value");

if(!isValidTime(startTime) || !isValidTime(endTime))
return failed(res,"Invalid time value. Use HH:mm");

if(!isValidUrl(registrationLink) || !isValidUrl(googleMapLink))
return failed(res,"Invalid URL format");


// Create

const program=await Program.create({

title,
banner,
type,
description,

speakers,
guestSpeakers,

venueType,
masjid,

customVenueName,
customAddress,
googleMapLink,

startDate,
endDate:finalEndDate,

startTime,
endTime,

audience,

registrationRequired,
registrationLink,
registrationDeadline,
maxParticipants,

featured,

status,

createdBy:req.user.id

});


success(
res,
"Program Created Successfully",
program,
201
);

}

catch(err){

handleError(res,err);

}

});

// ==========================================================
// GET ALL PROGRAMS
// ==========================================================

app.get(
"/programs",
async(req,res)=>{

try{

const{

status,
type,
featured,
search

}=req.query;

let filter={

isActive:true

};


// Status Filter

if(status){

filter.status=status.toUpperCase();

}


// Program Type

if(type){

filter.type=type.toUpperCase();

}


// Featured

if(featured==="true"){

filter.featured=true;

}


// Search

if(search){

filter.title={

$regex:search,

$options:"i"

};

}


// Fetch

const programs=await Program.find(filter)

.populate(

"masjid",

"name area"

)

.populate(

"speakers",

"fullName photo designation"

)

.populate(

"createdBy",

"name"

)

.sort({

featured:-1,

startDate:1,

createdAt:-1

});


success(

res,

"Programs Loaded",

programs

);

}

catch(err){

handleError(res,err);

}

});

// ==========================================================
// GET SINGLE PROGRAM
// ==========================================================

app.get(
"/programs/:id",
async(req,res)=>{

try{

const program=await Program.findById(

req.params.id

)

.populate(

"masjid"

)

.populate(

"speakers"

)

.populate(

"createdBy",

"name email"

);

if(!program)
return failed(

res,

"Program Not Found",

404

);

success(

res,

"Program Details",

program

);

}

catch(err){

handleError(res,err);

}

});

// ==========================================================
// UPDATE PROGRAM
// ==========================================================

app.put(
"/programs/:id",
auth,
allow("SUPER_ADMIN","PROGRAM_ADMIN"),
async(req,res)=>{

try{

if(!assertValidObjectId(res,req.params.id,"Program ID"))
return;

const program=await Program.findById(
req.params.id
);

if(!program)
return failed(
res,
"Program Not Found",
404
);

if(
req.user.role==="PROGRAM_ADMIN" &&
String(program.createdBy)!==String(req.user.id)
){
return failed(res,"You can only update your own programs",403);
}

const{

title,
banner,
type,
description,

speakers,
guestSpeakers,

venueType,
masjid,

customVenueName,
customAddress,
googleMapLink,

startDate,
endDate,

startTime,
endTime,

audience,

registrationRequired,
registrationLink,
registrationDeadline,
maxParticipants,

featured,
status,

isActive

}=req.body;


// Validation

if(
venueType==="MASJID" &&
!masjid
){

return failed(
res,
"Please select a Masjid."
);

}

if(
venueType==="CUSTOM"
){

if(
!customVenueName||
!customAddress
){

return failed(
res,
"Custom venue required."
);

}

}

if(
type==="WORKSHOP" &&
registrationRequired
){

if(
!registrationLink||
!registrationDeadline
){

return failed(
res,
"Registration details required."
);

}

}

if(!isValidDate(startDate) || !isValidDate(endDate) || !isValidDate(registrationDeadline))
return failed(res,"Invalid date value");

if(!isValidTime(startTime) || !isValidTime(endTime))
return failed(res,"Invalid time value. Use HH:mm");

if(!isValidUrl(registrationLink) || !isValidUrl(googleMapLink))
return failed(res,"Invalid URL format");

if(masjid && !assertValidObjectId(res,masjid,"Masjid ID"))
return;


// Update

program.title=title ?? program.title;

program.banner=banner ?? program.banner;

program.type=type ?? program.type;

program.description=description ?? program.description;

program.speakers=speakers ?? program.speakers;

program.guestSpeakers=guestSpeakers ?? program.guestSpeakers;

program.venueType=venueType ?? program.venueType;

program.masjid=masjid ?? program.masjid;

program.customVenueName=
customVenueName ?? program.customVenueName;

program.customAddress=
customAddress ?? program.customAddress;

program.googleMapLink=
googleMapLink ?? program.googleMapLink;

program.startDate=
startDate ?? program.startDate;

program.endDate=
endDate ?? program.endDate;

program.startTime=
startTime ?? program.startTime;

program.endTime=
endTime ?? program.endTime;

program.audience=
audience ?? program.audience;

program.registrationRequired=
registrationRequired ?? program.registrationRequired;

program.registrationLink=
registrationLink ?? program.registrationLink;

program.registrationDeadline=
registrationDeadline ?? program.registrationDeadline;

program.maxParticipants=
maxParticipants ?? program.maxParticipants;

program.featured=
featured ?? program.featured;

program.status=
status ?? program.status;

program.isActive=
isActive ?? program.isActive;

await program.save();

success(
res,
"Program Updated Successfully",
program
);

}

catch(err){

handleError(res,err);

}

});

// ==========================================================
// DELETE PROGRAM
// ==========================================================

app.delete(
"/programs/:id",
auth,
allow("SUPER_ADMIN","PROGRAM_ADMIN"),
async(req,res)=>{

try{

if(!assertValidObjectId(res,req.params.id,"Program ID"))
return;

const program=await Program.findById(
req.params.id
);

if(!program)
return failed(
res,
"Program Not Found",
404
);

if(
req.user.role==="PROGRAM_ADMIN" &&
String(program.createdBy)!==String(req.user.id)
){
return failed(res,"You can only delete your own programs",403);
}

await program.deleteOne();

success(
res,
"Program Deleted Successfully"
);

}

catch(err){

handleError(res,err);

}

});


// ==========================================================
// MASJIDS
// ==========================================================

// Create Masjid

app.post(
"/masjids",
auth,
allow("SUPER_ADMIN"),
async(req,res)=>{

try{

const{

name,
image,
area,
address,
description,
imam,
contact,
googleMapLink,
facilities,
prayerTimes,
establishedYear

}=req.body;


// Required Validation

if(
!name||
!area||
!address
){

return failed(
res,
"Required fields missing."
);

}


// Duplicate Check

const exists=await Masjid.findOne({

name,
area

});

if(exists)
return failed(
res,
"Masjid already exists."
);


// Create

const masjid=await Masjid.create({

name,
image,
area,
address,
description,
imam,
contact,
googleMapLink,
facilities,
prayerTimes,
establishedYear

});


success(

res,

"Masjid Created Successfully",

masjid,

201

);

}

catch(err){

handleError(res,err);

}

});


// ==========================================================
// GET ALL MASJIDS
// ==========================================================

app.get(
"/masjids",
async(req,res)=>{

try{

const{

search,
area

}=req.query;

let filter={

isActive:true

};


// Search

if(search){

filter.name={

$regex:search,

$options:"i"

};

}


// Area Filter

if(area){

filter.area={

$regex:area,

$options:"i"

};

}


// Fetch

const masjids=await Masjid.find(filter)

.populate(

"admin",

"name email"

)

.sort({

name:1

});


success(

res,

"Masjids Loaded",

masjids

);

}

catch(err){

handleError(res,err);

}

});

// ==========================================================
// GET SINGLE MASJID
// ==========================================================

app.get(
"/masjids/:id",
async(req,res)=>{

try{

const masjid=await Masjid.findById(

req.params.id

)

.populate(

"admin",

"name email"

);

if(!masjid)
return failed(

res,

"Masjid Not Found",

404

);

success(

res,

"Masjid Details",

masjid

);

}

catch(err){

handleError(res,err);

}

});
// ==========================================================
// UPDATE MASJID
// ==========================================================

app.put(
"/masjids/:id",
auth,
allow("SUPER_ADMIN"),
async(req,res)=>{

try{

const masjid=await Masjid.findById(
req.params.id
);

if(!masjid)
return failed(
res,
"Masjid Not Found",
404
);

const{

name,
image,
area,
address,
description,
imam,
contact,
googleMapLink,
facilities,
prayerTimes,
establishedYear,
isActive

}=req.body;


// Update

masjid.name=name ?? masjid.name;

masjid.image=image ?? masjid.image;

masjid.area=area ?? masjid.area;

masjid.address=address ?? masjid.address;

masjid.description=
description ?? masjid.description;

masjid.imam=
imam ?? masjid.imam;

masjid.contact=
contact ?? masjid.contact;

masjid.googleMapLink=
googleMapLink ?? masjid.googleMapLink;

masjid.facilities=
facilities ?? masjid.facilities;

masjid.prayerTimes=
prayerTimes ?? masjid.prayerTimes;

masjid.establishedYear=
establishedYear ?? masjid.establishedYear;

masjid.isActive=
isActive ?? masjid.isActive;


await masjid.save();

success(
res,
"Masjid Updated Successfully",
masjid
);

}

catch(err){

handleError(res,err);

}

});
// ==========================================================
// DELETE MASJID
// ==========================================================

app.delete(
"/masjids/:id",
auth,
allow("SUPER_ADMIN"),
async(req,res)=>{

try{

const masjid=await Masjid.findById(
req.params.id
);

if(!masjid)
return failed(
res,
"Masjid Not Found",
404
);


// Future:
// Check if any Program or
// Masjid Admin is linked
// before deleting.

await masjid.deleteOne();

success(
res,
"Masjid Deleted Successfully"
);

}

catch(err){

handleError(res,err);

}

});

// ==========================================================
// ASSIGN MASJID ADMIN
// ==========================================================

app.patch(
"/masjids/:id/admin",
auth,
allow("SUPER_ADMIN"),
async(req,res)=>{

try{

const{

adminId

}=req.body;

if(!assertValidObjectId(res,req.params.id,"Masjid ID"))
return;

if(!assertValidObjectId(res,adminId,"Admin ID"))
return;

const masjid=await Masjid.findById(
req.params.id
);

if(!masjid)
return failed(
res,
"Masjid Not Found",
404
);

const admin=await User.findById(
adminId
);

if(
!admin||
admin.role!=="MASJID_ADMIN"
){

return failed(
res,
"Masjid Admin Not Found",
404
);

}


// Update both sides

masjid.admin=admin._id;

admin.assignedMasjid=masjid._id;

await masjid.save();

await admin.save();

success(
res,
"Masjid Admin Assigned Successfully",
{
masjid,
admin
}
);

}

catch(err){

handleError(res,err);

}

});


// ==========================================================
// SCHOLARS
// ==========================================================

// Get All Scholars

app.get(
"/scholars",
async(req,res)=>{

try{

const{

search

}=req.query;

let filter={

isActive:true

};


// Search

if(search){

filter.fullName={

$regex:search,

$options:"i"

};

}


// Fetch

const scholars=await Scholar.find(filter)

.populate(

"user",

"name email"

)

.sort({

fullName:1

});


success(

res,

"Scholars Loaded",

scholars

);

}

catch(err){

handleError(res,err);

}

});


// ==========================================================
// GET SINGLE SCHOLAR
// ==========================================================

app.get(
"/scholars/:id",
async(req,res)=>{

try{

const scholar=await Scholar.findById(

req.params.id

)

.populate(

"user",

"name email"

);

if(!scholar)
return failed(

res,

"Scholar Not Found",

404

);

success(

res,

"Scholar Details",

scholar

);

}

catch(err){

handleError(res,err);

}

});


// ==========================================================
// UPDATE SCHOLAR
// ==========================================================

app.put(
"/scholars/:id",
auth,
allow("SUPER_ADMIN"),
async(req,res)=>{

try{

const scholar=await Scholar.findById(
req.params.id
);

if(!scholar)
return failed(
res,
"Scholar Not Found",
404
);

const{

fullName,
photo,
qualification,
designation,
bio,
phone,
email,
address,
facebook,
instagram,
youtube,
isActive

}=req.body;


// Update

scholar.fullName=
fullName ?? scholar.fullName;

scholar.photo=
photo ?? scholar.photo;

scholar.qualification=
qualification ?? scholar.qualification;

scholar.designation=
designation ?? scholar.designation;

scholar.bio=
bio ?? scholar.bio;

scholar.phone=
phone ?? scholar.phone;

scholar.email=
email ?? scholar.email;

scholar.address=
address ?? scholar.address;

scholar.facebook=
facebook ?? scholar.facebook;

scholar.instagram=
instagram ?? scholar.instagram;

scholar.youtube=
youtube ?? scholar.youtube;

scholar.isActive=
isActive ?? scholar.isActive;

await scholar.save();


// Also update User name

if(fullName){

await User.findByIdAndUpdate(
scholar.user,
{
name:fullName
}
);

}

success(
res,
"Scholar Updated Successfully",
scholar
);

}

catch(err){

handleError(res,err);

}

});


// ==========================================================
// DELETE SCHOLAR
// ==========================================================

app.delete(
"/scholars/:id",
auth,
allow("SUPER_ADMIN"),
async(req,res)=>{

try{

const scholar=await Scholar.findById(
req.params.id
);

if(!scholar)
return failed(
res,
"Scholar Not Found",
404
);


// Delete linked User account

await User.findByIdAndDelete(
scholar.user
);


// Delete Scholar profile

await scholar.deleteOne();

success(
res,
"Scholar Deleted Successfully"
);

}

catch(err){

handleError(res,err);

}

});

// ==========================================================
// LIBRARY
// ==========================================================

// Upload Book

app.post(
"/library",
auth,
allow("SUPER_ADMIN","SCHOLAR"),
async(req,res)=>{

try{

const{

title,
description,
category,
language,
pdf,
scholar

}=req.body;


// Validation

if(
!title||
!pdf||
!scholar
){

return failed(
res,
"Required fields missing."
);

}

if(!assertValidObjectId(res,scholar,"Scholar ID"))
return;

if(!isValidUrl(pdf))
return failed(res,"Invalid PDF URL");


// Check Scholar

const scholarExists=await Scholar.findById(
scholar
);

if(!scholarExists)
return failed(
res,
"Scholar Not Found",
404
);

if(
req.user.role==="SCHOLAR" &&
String(scholarExists.user)!==String(req.user.id)
){
return failed(res,"You can only upload books for your own profile",403);
}


// Create

const book=await Library.create({

title,
description,
category,
language,
pdf,
scholar

});

success(
res,
"Book Uploaded Successfully",
book,
201
);

}

catch(err){

handleError(res,err);

}

});

// ==========================================================
// GET ALL BOOKS
// ==========================================================

app.get(
"/library",
async(req,res)=>{

try{

const{

search,
category,
language,
scholar

}=req.query;

let filter={

isActive:true

};


// Search

if(search){

filter.title={

$regex:search,

$options:"i"

};

}


// Category

if(category){

filter.category=
category.toUpperCase();

}


// Language

if(language){

filter.language=
language.toUpperCase();

}


// Scholar

if(scholar){

filter.scholar=scholar;

}


// Fetch

const books=await Library.find(filter)

.populate(

"scholar",

"fullName photo designation"

)

.sort({

createdAt:-1

});


success(

res,

"Books Loaded",

books

);

}

catch(err){

handleError(res,err);

}

});

// ==========================================================
// GET SINGLE BOOK
// ==========================================================

app.get(
"/library/:id",
async(req,res)=>{

try{

const book=await Library.findById(

req.params.id

)

.populate(

"scholar"

);

if(!book)
return failed(

res,

"Book Not Found",

404

);

success(

res,

"Book Details",

book

);

}

catch(err){

handleError(res,err);

}

});

// ==========================================================
// UPDATE BOOK
// ==========================================================

app.put(
"/library/:id",
auth,
allow("SUPER_ADMIN","SCHOLAR"),
async(req,res)=>{

try{

if(!assertValidObjectId(res,req.params.id,"Book ID"))
return;

const book=await Library.findById(
req.params.id
);

if(!book)
return failed(
res,
"Book Not Found",
404
);

if(req.user.role==="SCHOLAR"){
const scholarProfile=await Scholar.findOne({user:req.user.id});
if(!scholarProfile || String(book.scholar)!==String(scholarProfile._id)){
return failed(res,"You can only update your own books",403);
}
}

const{

title,
description,
category,
language,
pdf,
isActive

}=req.body;


// Update

book.title=
title ?? book.title;

book.description=
description ?? book.description;

book.category=
category ?? book.category;

book.language=
language ?? book.language;

book.pdf=
pdf ?? book.pdf;

if(!isValidUrl(book.pdf))
return failed(res,"Invalid PDF URL");

book.isActive=
isActive ?? book.isActive;


await book.save();

success(
res,
"Book Updated Successfully",
book
);

}

catch(err){

handleError(res,err);

}

});


// ==========================================================
// DELETE BOOK
// ==========================================================

app.delete(
"/library/:id",
auth,
allow("SUPER_ADMIN","SCHOLAR"),
async(req,res)=>{

try{

if(!assertValidObjectId(res,req.params.id,"Book ID"))
return;

const book=await Library.findById(
req.params.id
);

if(!book)
return failed(
res,
"Book Not Found",
404
);

if(req.user.role==="SCHOLAR"){
const scholarProfile=await Scholar.findOne({user:req.user.id});
if(!scholarProfile || String(book.scholar)!==String(scholarProfile._id)){
return failed(res,"You can only delete your own books",403);
}
}

await book.deleteOne();

success(
res,
"Book Deleted Successfully"
);

}

catch(err){

handleError(res,err);

}

});

// ==========================================================
// DOWNLOAD BOOK
// ==========================================================

app.patch(
"/library/:id/download",
async(req,res)=>{

try{

const book=await Library.findById(
req.params.id
);

if(!book)
return failed(
res,
"Book Not Found",
404
);

book.downloads+=1;

await book.save();

success(
res,
"Download Count Updated",
{
downloads:book.downloads
}
);

}

catch(err){

handleError(res,err);

}

});


// ==========================================================
// ANNOUNCEMENTS
// ==========================================================

// Create Announcement

app.post(
"/announcements",
auth,
allow("SUPER_ADMIN","PROGRAM_ADMIN","MASJID_ADMIN"),
async(req,res)=>{

try{

const{

title,
banner,
description,
category,

date,
time,

location,
googleMapLink,

masjid,

showPopup,
pinned,

expiryDate,
status

}=req.body;


// Validation

if(
!title||
!description
){

return failed(
res,
"Required fields missing."
);

}

if(masjid && !assertValidObjectId(res,masjid,"Masjid ID"))
return;

if(!isValidDate(date) || !isValidDate(expiryDate))
return failed(res,"Invalid date value");

if(!isValidTime(time))
return failed(res,"Invalid time value. Use HH:mm");

if(!isValidUrl(googleMapLink))
return failed(res,"Invalid URL format");

if(req.user.role==="MASJID_ADMIN"){
const adminUser = await User.findById(req.user.id).select("assignedMasjid");
if(!adminUser?.assignedMasjid){
return failed(res,"No masjid assigned to this admin",403);
}

if(!masjid || String(adminUser.assignedMasjid)!==String(masjid)){
return failed(res,"MASJID_ADMIN can only manage their assigned masjid announcements",403);
}
}


// Create

const announcement=await Announcement.create({

title,
banner,
description,
category,

date,
time,

location,
googleMapLink,

masjid,

showPopup,
pinned,

expiryDate,

status,

createdBy:req.user.id

});


success(

res,

"Announcement Created Successfully",

announcement,

201

);

}

catch(err){

handleError(res,err);

}

});

// ==========================================================
// GET ALL ANNOUNCEMENTS
// ==========================================================

app.get(
"/announcements",
async(req,res)=>{

try{

const{

search,
category

}=req.query;

let filter={

isActive:true

};


// Search

if(search){

filter.title={

$regex:search,

$options:"i"

};

}


// Category

if(category){

filter.category=
category.toUpperCase();

}


// Fetch

const announcements=await Announcement.find(filter)

.populate(

"masjid",

"name area"

)

.populate(

"createdBy",

"name"

)

.sort({

pinned:-1,

createdAt:-1

});


success(

res,

"Announcements Loaded",

announcements

);

}

catch(err){

handleError(res,err);

}

});



// ==========================================================
// GET SINGLE ANNOUNCEMENT
// ==========================================================

app.get(
"/announcements/:id",
async(req,res)=>{

try{

const announcement=await Announcement.findById(

req.params.id

)

.populate(

"masjid",

"name area address"

)

.populate(

"createdBy",

"name email"

);

if(!announcement)
return failed(

res,

"Announcement Not Found",

404

);

success(

res,

"Announcement Details",

announcement

);

}

catch(err){

handleError(res,err);

}

});



// ==========================================================
// UPDATE ANNOUNCEMENT
// ==========================================================

app.put(
"/announcements/:id",
auth,
allow("SUPER_ADMIN","PROGRAM_ADMIN","MASJID_ADMIN"),
async(req,res)=>{

try{

if(!assertValidObjectId(res,req.params.id,"Announcement ID"))
return;

const announcement=await Announcement.findById(
req.params.id
);

if(!announcement)
return failed(
res,
"Announcement Not Found",
404
);

// ==========================
// Request Body
// ==========================

const{

title,
banner,
description,
category,

date,
time,

location,
googleMapLink,

masjid,

showPopup,
pinned,

expiryDate,

status,

isActive

}=req.body;


// PROGRAM_ADMIN Ownership

if(
req.user.role==="PROGRAM_ADMIN" &&
String(announcement.createdBy)!==String(req.user.id)
){

return failed(
res,
"You can only update your own announcements",
403
);

}


// MASJID_ADMIN Permission

if(req.user.role==="MASJID_ADMIN"){

const adminUser=await User.findById(req.user.id)

.select("assignedMasjid");

if(!adminUser?.assignedMasjid){

return failed(
res,
"No masjid assigned to this admin",
403
);

}

const targetMasjid=masjid ?? announcement.masjid;

if(
!targetMasjid ||
String(targetMasjid)!==
String(adminUser.assignedMasjid)
){

return failed(
res,
"MASJID_ADMIN can only manage announcements for assigned masjid",
403
);

}

}


// Validations

if(
masjid &&
!assertValidObjectId(
res,
masjid,
"Masjid ID"
)
)
return;

if(
!isValidDate(date) ||
!isValidDate(expiryDate)
)
return failed(
res,
"Invalid date value"
);

if(
!isValidTime(time)
)
return failed(
res,
"Invalid time value. Use HH:mm"
);

if(
!isValidUrl(googleMapLink)
)
return failed(
res,
"Invalid URL format"
);


// Update

announcement.title=
title ?? announcement.title;

announcement.banner=
banner ?? announcement.banner;

announcement.description=
description ?? announcement.description;

announcement.category=
category ?? announcement.category;

announcement.date=
date ?? announcement.date;

announcement.time=
time ?? announcement.time;

announcement.location=
location ?? announcement.location;

announcement.googleMapLink=
googleMapLink ?? announcement.googleMapLink;

announcement.masjid=
masjid ?? announcement.masjid;

announcement.showPopup=
showPopup ?? announcement.showPopup;

announcement.pinned=
pinned ?? announcement.pinned;

announcement.expiryDate=
expiryDate ?? announcement.expiryDate;

announcement.status=
status ?? announcement.status;

announcement.isActive=
isActive ?? announcement.isActive;

await announcement.save();

success(
res,
"Announcement Updated Successfully",
announcement
);

}

catch(err){

handleError(res,err);

}

});







// ==========================================================
// DELETE ANNOUNCEMENT
// ==========================================================

app.delete(
"/announcements/:id",
auth,
allow("SUPER_ADMIN","PROGRAM_ADMIN","MASJID_ADMIN"),
async(req,res)=>{

try{

if(!assertValidObjectId(res,req.params.id,"Announcement ID"))
return;

const announcement=await Announcement.findById(
req.params.id
);

if(!announcement)
return failed(
res,
"Announcement Not Found",
404
);

if(req.user.role==="PROGRAM_ADMIN" && String(announcement.createdBy)!==String(req.user.id)){
return failed(res,"You can only delete your own announcements",403);
}

if(req.user.role==="MASJID_ADMIN"){
const adminUser = await User.findById(req.user.id).select("assignedMasjid");
if(!adminUser?.assignedMasjid || String(announcement.masjid)!==String(adminUser.assignedMasjid)){
return failed(res,"MASJID_ADMIN can only delete announcements for assigned masjid",403);
}
}

await announcement.deleteOne();

success(
res,
"Announcement Deleted Successfully"
);

}

catch(err){

handleError(res,err);

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

app.use((err,req,res,next)=>{
    logger.error({ err, path:req.originalUrl }, "Unhandled error");
    handleError(res,err);
});

module.exports = app;
