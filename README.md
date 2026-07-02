# Spotify Song Stats

A static website (GitHub Pages–ready) that takes a Spotify track link and shows stats for the song: audio features, artist info, album details, and popularity.

**Live site:** https://a-nelas.github.io/spotify-stats/

## Setup

1. Create a Spotify app at the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) to get a **Client ID** and **Client Secret**.
2. Open the site, click ⚙️, and paste your credentials. They are stored only in your browser's localStorage and sent only to Spotify's token endpoint — never committed to this repo or any server.
3. Paste any Spotify track link (`https://open.spotify.com/track/…`, `spotify:track:…`, or a bare track ID) and hit **Get Stats**.

## What it shows

- **Track** — duration, explicit flag, track/disc number, market count, and Spotify's **popularity score** (0–100). Exact play counts are not exposed by the official Web API; popularity is Spotify's play-count-derived metric.
- **Audio features** — danceability, energy, valence, acousticness, instrumentalness, liveness, speechiness, tempo, key, time signature, loudness. ⚠️ Spotify [deprecated this endpoint](https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api) for apps created after Nov 27, 2024; when it returns 403 the site automatically falls back to the free [ReccoBeats API](https://reccobeats.com), which serves the same metrics for Spotify track IDs (minus time signature).
- **Artists** — followers, popularity, genres, profile image.
- **Album** — release date, label, track count, popularity.

## Deploying to GitHub Pages

1. **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`** → Save.
2. Push to GitHub: `git push -u origin main`. Every push to `main` redeploys.
3. The site goes live at `https://a-nelas.github.io/spotify-stats/` within a minute or two.

## Tech

Plain HTML/CSS/JS — no build step, no dependencies. Auth uses the [Client Credentials flow](https://developer.spotify.com/documentation/web-api/tutorials/client-credentials-flow) directly from the browser.
