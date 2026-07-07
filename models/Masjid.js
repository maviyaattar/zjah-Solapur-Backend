const mongoose = require("mongoose");
const validator = require("validator");

const MasjidSchema = new mongoose.Schema({

    name:{
        type:String,
        required:true,
        trim:true
    },

    image:{
        type:String,
        default:""
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

    description:{
        type:String,
        default:""
    },

    imam:{
        type:String,
        default:""
    },

    contact:{
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

    facilities:[{
        type:String,
        trim:true
    }],

    prayerTimes:{

        fajr:{
            type:String,
            default:""
        },

        sunrise:{
            type:String,
            default:""
        },

        zuhr:{
            type:String,
            default:""
        },

        asr:{
            type:String,
            default:""
        },

        maghrib:{
            type:String,
            default:""
        },

        isha:{
            type:String,
            default:""
        },

        jumuah:{
            type:String,
            default:""
        }

    },

    establishedYear:{
        type:Number,
        default:null
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

MasjidSchema.index({ name:1, area:1 },{ unique:true });

module.exports = mongoose.model("Masjid", MasjidSchema);