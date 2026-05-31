import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Song from "../models/song.model.js";
import Playlist from "../models/playlist.model.js";
import uploadToCloudinary from "../helper/uploadToCloudinary.js";
import deleteFromCloudinary from "../helper/deleteFromCloudinary.js";

export const signup = async (req, res) => {
  try {
    // 1. Did I get the input?
    const { name, email, password, gender } = req.body;

    // 2. Did I validate it?
    if (!name || !email || !password || !gender) {
      return res.status(400).json({
        success: false,
        message: "All fields (name, email, password, gender) are required",
      });
    }

    // 3. Did I check permissions/rules?
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // 4. Did I do the main action?
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let profileImage = "";
    if (req.file) {
      const result = await uploadToCloudinary(req.file.path, {
        folder: "profile_images",
      });
      profileImage = result.secure_url;
    }

    const user = new User({
      name,
      email,
      password: hashedPassword,
      gender,
      profileImage,
    });
    await user.save();

    // 5. Did I update anything else related?
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // 6. Did I respond to the client?
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        gender: user.gender,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error("Signup error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error during signup",
    });
  }
};

// Login Controller
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        gender: user.gender,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

// Logout Controller
export const logout = (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error during logout",
    });
  }
};

// Upgrade to Seller Controller
export const upgradeCreator = async (req, res) => {
  try {
    const { userId } = req.user;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already a seller
    if (user.role === "creator") {
      return res.status(400).json({
        success: false,
        message: "User is already a creator",
      });
    }

    // Update role to seller
    user.role = "creator";
    await user.save();

    // Generate new JWT with updated role
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Set new cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      success: true,
      message: "User upgraded to creator successfully",

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        gender: user.gender,
      },
    });
  } catch (error) {
    console.error("Upgrade seller error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error during role upgrade",
    });
  }
};

// Get Authenticated User Controller
export const getAuthUser = async (req, res) => {
  try {
    const { userId } = req.user;

    // Find user and populate relevant fields
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        gender: user.gender,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error("Get auth user error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching user data",
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;
    const { name, email, password, gender } = req.body;
    const { profileImage } = req.files || {};

    // Only allow logged-in user to update their own account
    if (id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. You can only update your own account.",
      });
    }

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const updatedData = {};

    // Email update with uniqueness check
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res
          .status(400)
          .json({ success: false, message: "Email already registered." });
      }
      if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return res
          .status(400)
          .json({ success: false, message: "Please enter a valid email." });
      }
      updatedData.email = email.trim();
    }

    if (name) updatedData.name = name.trim();
    if (gender) updatedData.gender = gender.trim();

    // Password update with hashing
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters.",
        });
      }
      const salt = await bcrypt.genSalt(10);
      updatedData.password = await bcrypt.hash(password, salt);
    }

    // Profile image update
    if (profileImage) {
      if (user.profileImage) {
        await deleteFromCloudinary(user.profileImage, "image");
      }
      const result = await uploadToCloudinary(profileImage[0].path, {
        folder: "profile_images",
      });
      updatedData.profileImage = result.secure_url;
    }

    // No fields to update .if the user didn’t send any valid fields, updatedData is {} → empty object → no point in running findByIdAndUpdate
    if (Object.keys(updatedData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided to update.",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updatedData },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        profileImage: updatedUser.profileImage,
        gender: updatedUser.gender,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating user",
      error: error.message,
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.user; // from auth JWT
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // 1️⃣ Delete profile image if exists
    if (user.profileImage) {
      await deleteFromCloudinary(user.profileImage, "image");
    }

    // 2️⃣ If user is creator, delete all uploaded songs and playlists
    if (user.role === "creator") {
      // Find all songs uploaded by creator
      const songs = await Song.find({ uploadedBy: userId });

      // Delete all song files and cover images from Cloudinary
      const deletions = [];
      for (const song of songs) {
        if (song.fileUrl)
          deletions.push(deleteFromCloudinary(song.fileUrl, "video"));
        if (song.coverImage)
          deletions.push(deleteFromCloudinary(song.coverImage, "image"));
      }

      await Promise.allSettled(deletions);

      // Delete songs from DB
      await Song.deleteMany({ uploadedBy: userId });

      // Delete playlists created by this creator
      await Playlist.deleteMany({ user: userId });
    } else {
      //  Optional: If normal user, you may want to remove them from playlists they added songs to
      await Playlist.updateMany({}, { $pull: { songs: { $in: user.playlists } } });
    }

    // 3️⃣ Delete the user
    await User.findByIdAndDelete(userId);

    // 4️⃣ Clear JWT cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json({
      success: true,
      message: "User account and associated resources deleted successfully.",
    });
  } catch (error) {
    console.error("Delete user error:", error.message);
    res.status(500).json({
      success: false,
      message: "Error deleting user account",
      error: error.message,
    });
  }
};
