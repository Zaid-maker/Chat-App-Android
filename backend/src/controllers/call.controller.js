import Call from "../models/call.model.js";

const mapCallForUser = (call, currentUserId) => {
    const isOutgoing = String(call.caller._id) === String(currentUserId);
    const contact = isOutgoing ? call.receiver : call.caller;

    return {
        _id: call._id,
        contact,
        direction: isOutgoing ? "outgoing" : "incoming",
        type: call.type,
        status: call.status,
        duration: call.duration,
        createdAt: call.createdAt,
    };
};

export const getCalls = async (req, res) => {
    try {
        const calls = await Call.find({
            $or: [{ caller: req.user._id }, { receiver: req.user._id }],
        })
            .populate("caller", "username avatar email")
            .populate("receiver", "username avatar email")
            .sort({ createdAt: -1 });

        const mapped = calls.map((call) => mapCallForUser(call, req.user._id));
        res.json(mapped);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createCall = async (req, res) => {
    const { receiverId, type = "voice", status = "completed", duration = 0 } = req.body;

    if (!receiverId) {
        return res.status(400).json({ message: "receiverId is required" });
    }

    if (String(receiverId) === String(req.user._id)) {
        return res.status(400).json({ message: "Cannot call yourself" });
    }

    try {
        const created = await Call.create({
            caller: req.user._id,
            receiver: receiverId,
            type,
            status,
            duration,
        });

        const full = await Call.findById(created._id)
            .populate("caller", "username avatar email")
            .populate("receiver", "username avatar email");

        res.status(201).json(mapCallForUser(full, req.user._id));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
