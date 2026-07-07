const mongoose = require("mongoose");
const validator = require("validator");

const ProgramSchema = new mongoose.Schema({

    title:{
        type:String,
        required:true,
        trim:true
    },

    banner:{
        type:String,
        default:""
    },

    type:{
        type:String,
        enum:[
            "BAYAAN",
            "DARS",
            "JALSA",
            "CONFERENCE",
            "WORKSHOP",
            "SEMINAR",
            "MEETING",
            "OTHER"
        ],
        required:true
    },

    description:{
        type:String,
        default:""
    },

    speakers:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Scholar"
    }],

    guestSpeakers:[{
        type:String,
        trim:true
    }],

    venueType:{
        type:String,
        enum:[
            "MASJID",
            "CUSTOM"
        ],
        default:"MASJID"
    },

    masjid:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Masjid",
        default:null
    },

    customVenueName:{
        type:String,
        default:""
    },

    customAddress:{
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

    startDate:{
        type:Date,
        required:true
    },

    endDate:{
        type:Date,
        required:true
    },

    startTime:{
        type:String,
        required:true
    },

    endTime:{
        type:String,
        default:""
    },

    audience:{
        type:String,
        enum:[
            "GENTS",
            "LADIES",
            "BOTH"
        ],
        default:"BOTH"
    },

    registrationRequired:{
        type:Boolean,
        default:false
    },

    registrationLink:{
        type:String,
        default:"",
        validate:{
            validator:value=>!value || validator.isURL(String(value),{ protocols:["http","https"], require_protocol:true }),
            message:"Invalid URL format"
        }
    },

    registrationDeadline:{
        type:Date,
        default:null
    },

    maxParticipants:{
        type:Number,
        default:null
    },

    featured:{
        type:Boolean,
        default:false
    },

    status:{
        type:String,
        enum:[
            "DRAFT",
            "UPCOMING",
            "ONGOING",
            "COMPLETED",
            "CANCELLED"
        ],
        default:"UPCOMING"
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

ProgramSchema.index({ isActive:1, status:1, startDate:1 });
ProgramSchema.index({ createdBy:1, createdAt:-1 });

module.exports = mongoose.model("Program",ProgramSchema);