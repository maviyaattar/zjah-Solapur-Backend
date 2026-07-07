const mongoose = require("mongoose");

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
        required:true
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

module.exports = mongoose.model("Library", LibrarySchema);