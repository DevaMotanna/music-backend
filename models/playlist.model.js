// models/playlist.model.js
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const playlistSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true, 
    },
    songs: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Song',
      }
    ],
    
  },
  { timestamps: true } 
);

const Playlist = model('Playlist', playlistSchema);

export default Playlist;
