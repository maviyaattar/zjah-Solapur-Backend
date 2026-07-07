const mongoose = require("mongoose");
const validator = require("validator");

const UserSchema = new mongoose.Schema({

    name:{

        type:String,

        required:true,

        trim:true

    },

    email:{

        type:String,

        required:true,

        unique:true,

        lowercase:true,

        trim:true,
        validate:{
            validator:value=>validator.isEmail(String(value || "")),
            message:"Invalid email format"
        }

    },

    password:{

        type:String,

        required:true

    },

    role:{

        type:String,

        enum:[

            "SUPER_ADMIN",

            "PROGRAM_ADMIN",

            "MASJID_ADMIN",

            "SCHOLAR"

        ],

        required:true

    },

    assignedMasjid:{

        type:mongoose.Schema.Types.ObjectId,

        ref:"Masjid",

        default:null

    },

    isActive:{

        type:Boolean,

        default:true

    }

},{
    timestamps:true
});

UserSchema.index({ role:1, isActive:1 });

module.exports = mongoose.model("User",UserSchema);