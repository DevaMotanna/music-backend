// controllers/songs.controller.js
import Song from "../models/song.model.js";
import PlayHistory from "../models/playHistory.model.js";
import Playlist from "../models/playlist.model.js";
import uploadToCloudinary from "../helper/uploadToCloudinary.js";
import deleteFromCloudinary from "../helper/deleteFromCloudinary.js";

export const createSong = async (req, res) => {
  try {
    const { title, artist, album,category } = req.body;

    if (!req.files || !req.files.audio || !req.files.coverImage) {
      return res
        .status(400)
        .json({ message: "Audio and cover image are required." });
    }

    // Upload audio to Cloudinary
    const audioResult = await uploadToCloudinary(req.files.audio[0].path, {
      folder: "songs/audio",
      resource_type: "video", // Cloudinary treats audio as video
    });

    // Upload cover image to Cloudinary
    const imageResult = await uploadToCloudinary(req.files.coverImage[0].path, {
      folder: "songs/images",
      resource_type: "image",
    });

    // Get duration from Cloudinary result
    const duration = audioResult.duration; // duration in seconds

    const newSong = new Song({
      title,
      artist,
      album,
      category,
      duration,
      fileUrl: audioResult.secure_url,
      coverImage: imageResult.secure_url,
      uploadedBy: req.user.userId,
    });

    await newSong.save();

    res.status(200).json({
      success: true,
      message: "Song created successfully",
      newSong,
    });
  } catch (error) {
    console.error("Error creating song:", error);
    res.status(500).json({ message: "Failed to create song." });
  }
};

export const getSongs = async (req, res) => {
  try {
    const { search } = req.query; 

    let query = {};

    if (search) {
      query = {
        $or: [
          { title: { $regex: search, $options: "i" } },  // case-insensitive
          { artist: { $regex: search, $options: "i" } },
          { album: { $regex: search, $options: "i" } },
          { category: { $regex: search, $options: "i" } },
        ],
      };
    }

    const songs = await Song.find(query).populate("uploadedBy", "name email");

    res.status(200).json({
      success: true,
      message: search
        ? `Songs matching "${search}" fetched successfully`
        : "All songs fetched successfully",
      songs,
    });
  } catch (error) {
    console.error("Error fetching songs:", error);
    res.status(500).json({ message: "Failed to fetch songs." });
  }
};

export const getSongById = async (req, res) => {
  try {
    const { id } = req.params;

    const song = await Song.findById(id).populate(
      "uploadedBy",
      "name email"
    );
    if (!song) {
      return res.status(404).json({ message: "Song not found." });
    }
    res.status(200).json({
      succeess: true,
      message: "Song fetched successfully",
      song,
    });
  } catch (error) {
    console.error("Error fetching song:", error);
    res.status(500).json({ message: "Failed to fetch song." });
  }
};

export const playSong = async (req, res) => {
  try {
    const songId = req.params.id;
    const { userId } = req.user;

    // Find song
    const song = await Song.findById(songId);
    if (!song) {
      return res.status(404).json({ message: "Song not found" });
    }

    // Increment playCount
    song.playCount += 1;
    await song.save();

    // Log play history
    await PlayHistory.create({
      user: userId,
      song: songId,
    });

    res.status(200).json({
      message: "Song play logged successfully",
      song: {
        _id: song._id,
        title: song.title,
        artist: song.artist,
        playCount: song.playCount,
      },
    });
  } catch (error) {
    console.error("Error logging song play:", error);
    res.status(500).json({ message: "Failed to log song play" });
  }
};

export const getRecentSongs = async (req, res) => {
  try {
    const { userId } = req.user;

    // Fetch last 50 plays, sorted by newest first
    const recentPlays = await PlayHistory.find({ user: userId })
      .sort({ playedAt: -1 })
      .limit(50) // fetch more to ensure we get unique 20 songs
      .populate("song", "title artist album category coverImage duration")
      .lean();

    // Filter out null songs
    const validPlays = recentPlays.filter((play) => play.song);

    // Keep only the latest entry for each song (unique recent)
    const uniqueSongsMap = new Map();
    for (const play of validPlays) {
      if (!uniqueSongsMap.has(play.song._id.toString())) {
        uniqueSongsMap.set(play.song._id.toString(), {
          _id: play.song._id,
          title: play.song.title,
          artist: play.song.artist,
          album: play.song.album,
          category: play.song.category,
          coverImage: play.song.coverImage,
          duration: play.song.duration,
          playedAt: play.playedAt,
        });
      }
    }

    // Take only the latest 20 unique songs
    const recentSongs = Array.from(uniqueSongsMap.values()).slice(0, 20);

    res.status(200).json({
      success: true,
      message: "Recent songs fetched successfully",
      recentSongs,
    });
  } catch (error) {
    console.error("Error fetching recent songs:", error);
    res.status(500).json({ message: "Failed to fetch recent songs" });
  }
};

export const getCreatorSongs = async (req, res) => {
  try {
    const creatorId = req.user.userId;

    const songs = await Song.find({ uploadedBy: creatorId })
      .populate("uploadedBy", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Creator songs fetched successfully",
      songs,
    });
  } catch (error) {
    console.error("Error fetching creator songs:", error);
    res.status(500).json({ success: false, message: "Failed to fetch songs" });
  }
};

export const updateSong = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { title, artist, album,  category} = req.body;

    const song = await Song.findById(id);

    if (!song) {
      return res.status(404).json({ message: "Song not found." });
    }

    // Check ownership
    if (song.uploadedBy.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this song." });
    }

    if (req.files?.audio) {
      await deleteFromCloudinary(song.fileUrl, "video");
      const audioResult = await uploadToCloudinary(req.files.audio[0].path, {
        folder: "songs/audio",
        resource_type: "video",
      });
      song.fileUrl = audioResult.secure_url;
    }

    if (req.files?.coverImage) {
      await deleteFromCloudinary(song.coverImage, "image");
      const imageResult = await uploadToCloudinary(
        req.files.coverImage[0].path,
        {
          folder: "songs/images",
          resource_type: "image",
        }
      );
      song.coverImage = imageResult.secure_url;
    }

    if (title) song.title = title;
    if (artist) song.artist = artist;
    if (album) song.album = album;
    if (category) song.category= category;


    const updatedSong = await song.save();

    res.json({
      success: true,
      message: "Recent Song Fetched successfully",
      updatedSong,
    });
  } catch (error) {
    console.error("Error updating song:", error);
    res.status(500).json({ message: "Failed to update song." });
  }
};

export const deleteSong = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const song = await Song.findById(id);

    if (!song) {
      return res.status(404).json({ message: "Song not found." });
    }

    // Check ownership
    if (song.uploadedBy.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this song." });
    }

    // Delete song from playlists of all users
    await Playlist.updateMany(
      { songs: song._id },          // Find all playlists containing this song
      { $pull: { songs: song._id } } // Remove it from songs array
    );

    // Delete files from Cloudinary
    if (song.fileUrl) await deleteFromCloudinary(song.fileUrl, "video");
    if (song.coverImage) await deleteFromCloudinary(song.coverImage, "image");

    // Delete song from DB
    await song.deleteOne();

    res.json({ message: "Song deleted successfully." });
  } catch (error) {
    console.error("Error deleting song:", error);
    res.status(500).json({ message: "Failed to delete song." });
  }
};
