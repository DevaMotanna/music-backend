// models/song.model.js
import mongoose from 'mongoose';


const songSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    artist: {
      type: String,
      trim: true,
    },
    album: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    duration: {
      type: Number, // in seconds
    },
    fileUrl: {
      type: String,
      required: true,
    },
    coverImage: {
      type: String,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    playCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Song = mongoose.model('Song', songSchema);

export default Song;
