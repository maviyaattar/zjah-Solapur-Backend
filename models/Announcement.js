const mongoose = require("mongoose");

const AnnouncementSchema = new mongoose.Schema({

    title:{

        type:String,

        required:true,

        trim:true

    },

    description:{

        type:String,

        required:true

    },

    category:{

        type:String,

        enum:[
            "GENERAL",
            "PROGRAM",
            "MASJID",
            "RAMADAN",
            "EID",
            "EMERGENCY"
        ],

        default:"GENERAL"

    },

    priority:{

        type:String,

        enum:[
            "LOW",
            "MEDIUM",
            "HIGH"
        ],

        default:"MEDIUM"

    },

    expiresAt:{

        type:Date,

        default:null

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

module.exports = mongoose.model(
    "Announcement",
    AnnouncementSchema
);