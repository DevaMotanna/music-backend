import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

// Import Routes
import userRouter from "./routes/user.route.js";
import songRouter from "./routes/song.route.js";
import playlistRouter from "./routes/playlist.route.js";


const app = express();

// Middleware
// app.use(
//   cors()
// );
app.use(cors({origin:"*"}));
app.use(express.json());
app.use(cookieParser());



// Routes path

app.use("/api/users", userRouter);
app.use("/api/songs",songRouter);
app.use("/api/playlists", playlistRouter);


export default app;



