const audio = document.getElementById("audio");
const songList = document.getElementById("songList");
const title = document.getElementById("title");
const artist = document.getElementById("artist");
const cover = document.getElementById("cover");
const playBtn = document.getElementById("play");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const progressBar = document.getElementById("progressBar");
const volume = document.getElementById("volume");
const currentTime = document.getElementById("currentTime");
const duration = document.getElementById("duration");
const search = document.getElementById("search");

let songs = [];
let currentSong = 0;
let isPlaying = false;

function createFallbackCoverSource(songTitle) {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="320" height="180">
            <rect width="100%" height="100%" fill="#1db954" />
            <circle cx="160" cy="90" r="60" fill="#0f172a" opacity="0.3" />
            <path d="M145 60h30v60h-30z" fill="#fff" />
            <text x="160" y="155" text-anchor="middle" fill="#fff" font-size="24" font-family="Arial, sans-serif">${songTitle}</text>
        </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createFallbackAudioDataUrl() {
    const sampleRate = 22050;
    const duration = 1;
    const samples = sampleRate * duration;
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);

    const writeString = (offset, str) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, samples * 2, true);

    for (let i = 0; i < samples; i++) {
        const t = i / sampleRate;
        const sample = Math.sin(2 * Math.PI * 440 * t);
        view.setInt16(44 + i * 2, sample * 0x7fff, true);
    }

    const bytes = new Uint8Array(buffer);
    let binary = "";
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });

    return `data:audio/wav;base64,${btoa(binary)}`;
}

function normalizeAssetUrl(value, fallback) {
    if (typeof value !== "string" || !value.trim()) {
        return fallback;
    }

    if (/^(https?:|data:)/i.test(value) || value.startsWith("/")) {
        return value;
    }

    return `/${value}`;
}

function getCoverSource(song) {
    return song?.cover
        ? normalizeAssetUrl(song.cover, createFallbackCoverSource(song?.title || "Music"))
        : createFallbackCoverSource(song?.title || "Music");
}

function getAudioSource(song) {
    return song?.file
        ? normalizeAssetUrl(song.file, createFallbackAudioDataUrl())
        : createFallbackAudioDataUrl();
}

// Format seconds into m:ss
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

// Load songs from the server
async function loadSongs() {
    try {
        const res = await fetch("/songs");
        const payload = await res.json();
        songs = Array.isArray(payload) ? payload : payload.songs || [];
        displaySongs(songs);
    } catch (err) {
        console.error("Failed to load songs:", err);
        songList.innerHTML = '<p style="color:#b3b3b3">Failed to load songs. Make sure the server is running.</p>';
    }
}

// Render the song cards
function displaySongs(list) {
    songList.innerHTML = "";
    list.forEach((song) => {
        const card = document.createElement("div");
        card.className = "song";
        card.innerHTML = `
            <img src="${getCoverSource(song)}" alt="${song.title}" onerror="this.src='data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="100%" height="100%" fill="#1db954"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#fff" font-size="24" font-family="Arial">Music</text></svg>')}'">
            <h3>${song.title}</h3>
            <p>${song.artist}</p>
            <div class="play-icon">▶</div>
        `;
        card.addEventListener("click", () => {
            const realIndex = songs.indexOf(song);
            playSong(realIndex);
        });
        songList.appendChild(card);
    });
}

// Play a song by index
function playSong(index) {
    currentSong = index;
    const song = songs[index];
    audio.src = getAudioSource(song);
    cover.src = getCoverSource(song);
    title.innerText = song.title;
    artist.innerText = song.artist;
    audio.load();
    audio.play().then(() => {
        isPlaying = true;
        playBtn.innerHTML = '⏸';
    }).catch(() => {
        isPlaying = false;
        playBtn.innerHTML = '▶';
    });
}

function startPlayback() {
    if (!songs.length) return;

    if (!audio.src || !songs[currentSong]) {
        currentSong = 0;
        playSong(currentSong);
        return;
    }

    audio.play().then(() => {
        isPlaying = true;
        playBtn.innerHTML = '⏸';
    }).catch(() => {
        isPlaying = false;
        playBtn.innerHTML = '▶';
    });
}

// Toggle play/pause
playBtn.onclick = () => {
    if (!songs.length) return;
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
        playBtn.innerHTML = '▶';
    } else {
        startPlayback();
    }
};

// Next song
nextBtn.onclick = () => {
    currentSong++;
    if (currentSong >= songs.length) currentSong = 0;
    playSong(currentSong);
};

// Previous song
prevBtn.onclick = () => {
    currentSong--;
    if (currentSong < 0) currentSong = songs.length - 1;
    playSong(currentSong);
};

// Auto-advance when song ends
audio.addEventListener("ended", () => {
    nextBtn.onclick();
});

audio.addEventListener("play", () => {
    isPlaying = true;
    playBtn.innerHTML = '⏸';
});

audio.addEventListener("pause", () => {
    isPlaying = false;
    playBtn.innerHTML = '▶';
});

// Update progress bar and time display
audio.addEventListener("timeupdate", () => {
    if (audio.duration) {
        progressBar.value = (audio.currentTime / audio.duration) * 100;
        currentTime.textContent = formatTime(audio.currentTime);
        duration.textContent = formatTime(audio.duration);
    }
});

// Seek when progress bar is clicked
progressBar.addEventListener("input", () => {
    if (audio.duration) {
        audio.currentTime = (progressBar.value / 100) * audio.duration;
    }
});

// Volume control
volume.addEventListener("input", () => {
    audio.volume = volume.value;
});

// Live search filtering
search.addEventListener("input", () => {
    const query = search.value.toLowerCase();
    const filtered = songs.filter(
        (s) =>
            s.title.toLowerCase().includes(query) ||
            s.artist.toLowerCase().includes(query)
    );
    displaySongs(filtered);
});

loadSongs();
