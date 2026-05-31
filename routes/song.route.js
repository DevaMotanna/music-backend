// routes/songs.routes.js
import express from "express";
import multer from "multer";
import storage from "../config/multerStorage.js";
import { 
  createSong, 
  getSongs, 
  getSongById, 
  playSong,
  getRecentSongs,
  getCreatorSongs,
  updateSong, 
  deleteSong 
} from "../controller/song.controller.js";
import { isLoggedIn } from "../middleware/isLoggedIn.js"; 

const upload = multer({ storage });

const router = express.Router();

// Creator uploads song (audio + cover image)
router.post(
  "/",
  upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),isLoggedIn,
  createSong
);

router.get("/get", getSongs);
// Get recently played songs
router.get("/recent",  isLoggedIn, getRecentSongs);
router.get("/:id", getSongById);

router.post("/play/:id",  isLoggedIn, playSong);


router.get("/creator/songs",  isLoggedIn, getCreatorSongs);
router.put(
  "/:id",
  upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
   isLoggedIn,
  updateSong
);
router.delete("/:id",isLoggedIn, deleteSong);

export default router;
