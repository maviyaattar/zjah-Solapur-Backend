const mongoose = require("mongoose");

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

        default:""

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

        default:""

    },

    address:{

        type:String,

        default:""

    },

    facebook:{

        type:String,

        default:""

    },

    instagram:{

        type:String,

        default:""

    },

    youtube:{

        type:String,

        default:""

    },

    isActive:{

        type:Boolean,

        default:true

    }

},{
    timestamps:true
});

module.exports = mongoose.model("Scholar",ScholarSchema);