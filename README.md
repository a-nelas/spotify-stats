# Spotify Song Stats

A static website (GitHub Pages–ready) that takes a Spotify track link and shows stats for the song: audio features, artist info, album details, and popularity.

**Live site:** https://a-nelas.github.io/spotify-stats/

## Setup

1. Create a Spotify app at the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) to get a **Client ID** and **Client Secret**.
2. Provide the credentials one of two ways:
   - **GitHub Secrets (baked in at deploy):** add `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` as repository secrets. The deploy workflow writes them into `js/config.js` at build time, so visitors don't need to enter anything. ⚠️ Because GitHub Pages is a static site, the injected credentials are visible to anyone who views the deployed site's source — acceptable for a hobby app reading public data (worst case someone uses your rate limit), but don't reuse a secret you care about.
   - **In the browser:** click ⚙️ on the site and paste credentials. Stored only in your browser's localStorage; overrides any baked-in values.
3. Paste any Spotify track link (`https://open.spotify.com/track/…`, `spotify:track:…`, or a bare track ID) and hit **Get Stats**.

## What it shows

- **Track** — duration, explicit flag, track/disc number, market count, and Spotify's **popularity score** (0–100). Exact play counts are not exposed by the official Web API; popularity is Spotify's play-count-derived metric.
- **Audio features** — danceability, energy, valence, acousticness, instrumentalness, liveness, speechiness, tempo, key, time signature, loudness. ⚠️ Spotify [deprecated this endpoint](https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api) for apps created after Nov 27, 2024; when it returns 403 the site automatically falls back to the free [ReccoBeats API](https://reccobeats.com), which serves the same metrics for Spotify track IDs (minus time signature).
- **Artists** — followers, popularity, genres, profile image.
- **Album** — release date, label, track count, popularity.

## Deploying to GitHub Pages

1. On GitHub: **Settings → Secrets and variables → Actions → New repository secret** — add `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`.
2. **Settings → Pages → Source: GitHub Actions** (not "Deploy from a branch" — the workflow in `.github/workflows/deploy.yml` handles the build).
3. Push to GitHub: `git push -u origin main`. Every push to `main` redeploys.
4. The site goes live at `https://a-nelas.github.io/spotify-stats/` within a minute or two.

## Tech

Plain HTML/CSS/JS — no build step, no dependencies. Auth uses the [Client Credentials flow](https://developer.spotify.com/documentation/web-api/tutorials/client-credentials-flow) directly from the browser.
