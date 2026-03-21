import User from "../models/user.model.js";

export const getUsers = async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.user._id } }).select("_id username email avatar status isOnline lastSeen");
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
