const mongoose = require("mongoose");
const validator = require("validator");

const LibrarySchema = new mongoose.Schema({

    title:{
        type:String,
        required:true,
        trim:true
    },

    description:{
        type:String,
        default:""
    },

    category:{
        type:String,
        enum:[
            "AQEEDAH",
            "HADITH",
            "TAFSEER",
            "FIQH",
            "SEERAH",
            "GENERAL"
        ],
        default:"GENERAL"
    },

    language:{
        type:String,
        enum:[
            "URDU",
            "HINDI",
            "ENGLISH",
            "ARABIC",
            "MARATHI"
        ],
        default:"URDU"
    },

    pdf:{
        type:String,
        required:true,
        validate:{
            validator:value=>validator.isURL(String(value),{ protocols:["http","https"], require_protocol:true }),
            message:"Invalid PDF URL"
        }
    },

    scholar:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Scholar",
        required:true
    },

    downloads:{
        type:Number,
        default:0
    },

    isActive:{
        type:Boolean,
        default:true
    }

},{
    timestamps:true
});

LibrarySchema.index({ scholar:1, createdAt:-1 });
LibrarySchema.index({ category:1, language:1, isActive:1 });

module.exports = mongoose.model("Library", LibrarySchema);