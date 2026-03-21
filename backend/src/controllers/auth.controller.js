import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
    });
};

export const registerUser = async (req, res) => {
    const { fullName, username, email, phoneNumber, password } = req.body;

    try {
        console.log('REG: Checking if user exists:', email);
        const userExists = await User.findOne({ email });

        if (userExists) {
            console.log('REG: User already exists');
            return res.status(400).json({ message: "User already exists" });
        }

        console.log('REG: Creating User...');
        const user = await User.create({
            fullName: fullName?.trim() || username,
            username,
            email,
            phoneNumber: phoneNumber?.trim() || "",
            password,
        });

        console.log('REG: User created');
        if (user) {
            const token = generateToken(user._id);
            res.status(201).json({
                _id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                phoneNumber: user.phoneNumber,
                avatar: user.avatar,
                token,
            });
        } else {
            res.status(400).json({ message: "Invalid user data" });
        }
    } catch (error) {
        console.error('REG ERROR:', error);
        res.status(500).json({ message: error.message });
    }
};

export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.comparePassword(password))) {
            res.json({
                _id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                phoneNumber: user.phoneNumber,
                avatar: user.avatar,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: "Invalid email or password" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password");
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateMe = async (req, res) => {
    const { fullName, username, phoneNumber, avatar, status } = req.body;

    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (typeof fullName === "string") {
            user.fullName = fullName.trim();
        }

        if (typeof username === "string" && username.trim()) {
            user.username = username.trim();
        }

        if (typeof phoneNumber === "string") {
            user.phoneNumber = phoneNumber.trim();
        }

        if (typeof avatar === "string") {
            user.avatar = avatar.trim();
        }

        if (typeof status === "string" && status.trim()) {
            user.status = status.trim();
        }

        const updated = await user.save();

        res.json({
            _id: updated._id,
            fullName: updated.fullName,
            username: updated.username,
            email: updated.email,
            phoneNumber: updated.phoneNumber,
            avatar: updated.avatar,
            status: updated.status,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "Username already in use" });
        }
        res.status(500).json({ message: error.message });
    }
};
