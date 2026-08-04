const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Serve static files (index.html, style.css, script.js, assets)
app.use(express.static(path.join(__dirname)));

// Endpoint to serve the song list
app.get("/songs", (req, res) => {
    const songsPath = path.join(__dirname, "songs.json");
    fs.readFile(songsPath, "utf8", (err, data) => {
        if (err) {
            return res.status(500).json({ error: "Unable to read songs.json" });
        }

        try {
            const parsed = JSON.parse(data);
            const songs = Array.isArray(parsed) ? parsed : parsed.songs || [];
            res.json(Array.isArray(parsed) ? parsed : { title: parsed.title || "My Music Library", description: parsed.description || "", songs });
        } catch (parseErr) {
            res.status(500).json({ error: "Invalid songs.json format" });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Spotify app running at http://localhost:${PORT}`);
});
