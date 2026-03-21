import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
    {
        caller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            enum: ["voice", "video"],
            default: "voice",
        },
        status: {
            type: String,
            enum: ["completed", "missed", "rejected"],
            default: "completed",
        },
        duration: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

const Call = mongoose.model("Call", callSchema);

export default Call;
