// models/playHistory.model.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const playHistorySchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    song: {
      type: Schema.Types.ObjectId,
      ref: "Song",
      required: true,
    },
    playedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const PlayHistory = model("PlayHistory", playHistorySchema);

export default PlayHistory;
