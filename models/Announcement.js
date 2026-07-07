const mongoose = require("mongoose");
const validator = require("validator");

const AnnouncementSchema = new mongoose.Schema({

    title:{
        type:String,
        required:true,
        trim:true
    },

    banner:{
        type:String,
        default:""
    },

    description:{
        type:String,
        required:true
    },

    category:{
        type:String,
        enum:[
            "GENERAL",
            "EID",
            "IJTIMAI_DUA",
            "GOVERNMENT",
            "NOTICE",
            "EMERGENCY",
            "OTHER"
        ],
        default:"GENERAL"
    },

    date:{
        type:Date,
        default:null
    },

    time:{
        type:String,
        default:""
    },

    location:{
        type:String,
        default:""
    },

    googleMapLink:{
        type:String,
        default:"",
        validate:{
            validator:value=>!value || validator.isURL(String(value),{ protocols:["http","https"], require_protocol:true }),
            message:"Invalid URL format"
        }
    },

    masjid:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Masjid",
        default:null
    },

    showPopup:{
        type:Boolean,
        default:false
    },

    pinned:{
        type:Boolean,
        default:false
    },

    expiryDate:{
        type:Date,
        default:null
    },

    status:{
        type:String,
        enum:[
            "DRAFT",
            "PUBLISHED",
            "EXPIRED"
        ],
        default:"PUBLISHED"
    },

    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    isActive:{
        type:Boolean,
        default:true
    }

},{
    timestamps:true
});

AnnouncementSchema.index({ isActive:1, category:1, pinned:-1, createdAt:-1 });
AnnouncementSchema.index({ masjid:1, status:1, date:1 });

module.exports = mongoose.model("Announcement", AnnouncementSchema);