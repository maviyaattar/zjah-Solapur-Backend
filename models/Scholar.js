const mongoose = require("mongoose");
const validator = require("validator");

const ScholarSchema = new mongoose.Schema({

    user:{

        type:mongoose.Schema.Types.ObjectId,

        ref:"User",

        required:true,

        unique:true

    },

    fullName:{

        type:String,

        required:true,

        trim:true

    },

    photo:{

        type:String,

        default:"",
        validate:{
            validator:value=>!value || validator.isURL(String(value),{ protocols:["http","https"], require_protocol:true }),
            message:"Invalid URL format"
        }

    },

    qualification:{

        type:String,

        default:""

    },

    designation:{

        type:String,

        default:""

    },

    bio:{

        type:String,

        default:""

    },

    phone:{

        type:String,

        default:""

    },

    email:{

        type:String,

        default:"",
        validate:{
            validator:value=>!value || validator.isEmail(String(value)),
            message:"Invalid email format"
        }

    },

    address:{

        type:String,

        default:""

    },

    facebook:{

        type:String,

        default:"",
        validate:{
            validator:value=>!value || validator.isURL(String(value),{ protocols:["http","https"], require_protocol:true }),
            message:"Invalid URL format"
        }

    },

    instagram:{

        type:String,

        default:"",
        validate:{
            validator:value=>!value || validator.isURL(String(value),{ protocols:["http","https"], require_protocol:true }),
            message:"Invalid URL format"
        }

    },

    youtube:{

        type:String,

        default:"",
        validate:{
            validator:value=>!value || validator.isURL(String(value),{ protocols:["http","https"], require_protocol:true }),
            message:"Invalid URL format"
        }

    },

    isActive:{

        type:Boolean,

        default:true

    }

},{
    timestamps:true
});

ScholarSchema.index({ fullName:1, isActive:1 });

module.exports = mongoose.model("Scholar",ScholarSchema);