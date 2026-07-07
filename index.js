require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if(!MONGO_URI){
    console.error("❌ MONGO_URI is required");
    process.exit(1);
}

mongoose
.connect(MONGO_URI)
.then(() => {
    console.log("✅ MongoDB Connected");

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
})
.catch((err) => {
    console.error("❌ MongoDB Connection Failed");
    console.error(err.message);
    process.exit(1);
});
