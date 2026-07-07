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

failed(
res,
err.message
);

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

failed(

res,

err.message

);

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

failed(

res,

err.message

);

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

const program=await Program.findById(
req.params.id
);

if(!program)
return failed(
res,
"Program Not Found",
404
);

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

failed(
res,
err.message
);

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

const program=await Program.findById(
req.params.id
);

if(!program)
return failed(
res,
"Program Not Found",
404
);


// Future Security:
// PROGRAM_ADMIN should only delete
// programs created by themselves.

await program.deleteOne();

success(
res,
"Program Deleted Successfully"
);

}

catch(err){

failed(
res,
err.message
);

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

failed(
res,
err.message
);

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

failed(

res,

err.message

);

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

failed(

res,

err.message

);

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

failed(
res,
err.message
);

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

failed(
res,
err.message
);

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

failed(
res,
err.message
);

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

failed(

res,

err.message

);

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

failed(

res,

err.message

);

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

failed(
res,
err.message
);

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

failed(
res,
err.message
);

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

failed(
res,
err.message
);

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

failed(

res,

err.message

);

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

failed(

res,

err.message

);

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

const book=await Library.findById(
req.params.id
);

if(!book)
return failed(
res,
"Book Not Found",
404
);

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

failed(
res,
err.message
);

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

const book=await Library.findById(
req.params.id
);

if(!book)
return failed(
res,
"Book Not Found",
404
);

await book.deleteOne();

success(
res,
"Book Deleted Successfully"
);

}

catch(err){

failed(
res,
err.message
);

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

failed(
res,
err.message
);

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

failed(
res,
err.message
);

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

failed(

res,

err.message

);

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

failed(

res,

err.message

);

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

const announcement=await Announcement.findById(
req.params.id
);

if(!announcement)
return failed(
res,
"Announcement Not Found",
404
);

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

failed(
res,
err.message
);

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

const announcement=await Announcement.findById(
req.params.id
);

if(!announcement)
return failed(
res,
"Announcement Not Found",
404
);

await announcement.deleteOne();

success(
res,
"Announcement Deleted Successfully"
);

}

catch(err){

failed(
res,
err.message
);

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
