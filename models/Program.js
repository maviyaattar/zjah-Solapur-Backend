const mongoose = require("mongoose");

const ProgramSchema = new mongoose.Schema({

    title:{

        type:String,

        required:true,

        trim:true

    },

    description:{

        type:String,

        default:""

    },

    speaker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Scholar"
}

    venue: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Masjid"
}

    poster:{

        type:String,

        default:""

    },

    date:{

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

    status:{

        type:String,

        enum:[
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

module.exports = mongoose.model("Program",ProgramSchema);