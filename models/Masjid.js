const mongoose = require("mongoose");

const MasjidSchema = new mongoose.Schema({

    name:{

        type:String,

        required:true,

        trim:true

    },

    area:{

        type:String,

        required:true,

        trim:true

    },

    address:{

        type:String,

        required:true,

        trim:true

    },

    imam:{

        type:String,

        default:""

    },

    contact:{

        type:String,

        default:""

    },

    latitude:{

        type:Number,

        required:true

    },

    longitude:{

        type:Number,

        required:true

    },

    prayerTimes:{

        fajr:String,

        zuhr:String,

        asr:String,

        maghrib:String,

        isha:String,

        jumuah:String

    },

    admin:{

        type:mongoose.Schema.Types.ObjectId,

        ref:"User",

        default:null

    },

    isActive:{

        type:Boolean,

        default:true

    }

},{
    timestamps:true
});

module.exports = mongoose.model("Masjid",MasjidSchema);