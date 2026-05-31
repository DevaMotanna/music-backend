import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minLength: [3, "Name can't be less than 3 characters"],
      maxLength: [30, "Name can't exceed 30 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      unique: [true, "Email already registered, enter another email"],
      validate: {
        validator: (v) => {
          return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: "Please enter valid email",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minLength: [6, "Password can't be less than 6 characters"],
    },
    profileImage: {
      type: String,
      default: "",
    },
    gender: {
      type: String,
    },

    role: {
      type: String,
      enum: ["user", "creator"],
      default: "user",
    },

    playlists: [
      { type: mongoose.Schema.Types.ObjectId,
       ref: "Playlist" 
      }
    ],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
