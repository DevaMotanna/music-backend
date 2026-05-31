// controllers/playlist.controller.js
import Playlist from "../models/playlist.model.js";
import Song from "../models/song.model.js";

export const createPlaylist = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Playlist name is required.",
      });
    }

    const newPlaylist = new Playlist({
      name,
      description,
      user: req.user.userId,
    });

    await newPlaylist.save();

    res.status(201).json({
      success: true,
      message: "Playlist created successfully.",
      playlist: newPlaylist,
    });
  } catch (error) {
    console.error("Error creating playlist:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create playlist.",
      error: error.message,
    });
  }
};

export const getPlaylistById = async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate("user", "name email")
      .populate("songs");

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found." });
    }

    res.status(200).json({
      success: true,
      message: "Playlist fetched successfully.",
      playlist,
    });
  } catch (error) {
    console.error("Error fetching playlist:", error);
    res.status(500).json({ message: "Failed to fetch playlist." });
  }
};

export const getUserPlaylists = async (req, res) => {
  try {
    const { userId } = req.user;

    const playlists = await Playlist.find({ user: userId })
      .populate("songs", "title artist duration") // only return selected fields from Song
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Playlists fetched successfully.",
      playlists,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const updatePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { name, description } = req.body;

    const playlist = await Playlist.findById(id);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found." });
    }

    // Check ownership
    if (playlist.user.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this playlist." });
    }

    if (name) playlist.name = name;
    if (description) playlist.description = description;

    const updatedPlaylist = await playlist.save();
    res.status(200).json({
      success: true,
      message: "Playlist updated successfully.",
      updatedPlaylist,
    });
  } catch (error) {
    console.error("Error updating playlist:", error);
    res.status(500).json({ message: "Failed to update playlist." });
  }
};

export const deletePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const playlist = await Playlist.findById(id);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found." });
    }

    // Check ownership
    if (playlist.user.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this playlist." });
    }

    await playlist.deleteOne();
    res.status(200).json({
      success: true,
      message: "Playlist deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting playlist:", error);
    res.status(500).json({ message: "Failed to delete playlist." });
  }
};

export const addSongToPlaylist = async (req, res) => {
  try {
    const { songId } = req.body;
    const { id } = req.params;
    const { userId } = req.user;

    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found." });
    }

    // Check ownership
    if (playlist.user.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to modify this playlist." });
    }

    // Check if song exists
    const song = await Song.findById(songId);
    if (!song) {
      return res.status(404).json({ message: "Song not found." });
    }

    // Avoid duplicates
    if (playlist.songs.includes(songId)) {
      return res.status(400).json({ message: "Song already in playlist." });
    }

    playlist.songs.push(songId);
    await playlist.save();

    res.status(200).json({
      success: true,
      message: "Song added to playlist.",
      playlist,
    });
  } catch (error) {
    console.error("Error adding song to playlist:", error);
    res.status(500).json({ message: "Failed to add song." });
  }
};


export const removeSongFromPlaylist = async (req, res) => {
  try {
    const { songId } = req.body;
    const { id } = req.params;
    const { userId } = req.user;
    
    const playlist = await Playlist.findById(id);
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found." });
    }

    // Check ownership
    if (playlist.user.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to modify this playlist." });
    }

    // Check if song exists in playlist
    if (!playlist.songs.includes(songId)) {
      return res.status(400).json({ message: "Song not in playlist." });
    }

    playlist.songs = playlist.songs.filter(
      (id) => id.toString() !== songId.toString()
    );
    await playlist.save();

    res.status(200).json({
      success: true,
      message: "Song removed from  playlist.",
      playlist,
    });
  } catch (error) {
    console.error("Error removing song from playlist:", error);
    res.status(500).json({ message: "Failed to remove song." });
  }
};
