const mongoose = require("mongoose");

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

        trim:true

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

module.exports = mongoose.model("User",UserSchema);