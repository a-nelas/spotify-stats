/* Spotify Song Stats — static client for the Spotify Web API.
 * Credentials live in localStorage only; the token is fetched with the
 * Client Credentials flow directly from the browser (Spotify's token
 * endpoint allows CORS). */

const STORAGE_KEYS = {
  clientId: "spotify_client_id",
  clientSecret: "spotify_client_secret",
  token: "spotify_token",
  tokenExpiry: "spotify_token_expiry",
};

const els = {
  settingsPanel: document.getElementById("settings-panel"),
  settingsBtn: document.getElementById("settings-btn"),
  clientId: document.getElementById("client-id"),
  clientSecret: document.getElementById("client-secret"),
  saveCredentials: document.getElementById("save-credentials"),
  clearCredentials: document.getElementById("clear-credentials"),
  form: document.getElementById("search-form"),
  input: document.getElementById("track-input"),
  status: document.getElementById("status"),
  results: document.getElementById("results"),
};

/* ---------- credentials ---------- */

function getCredentials() {
  const id = localStorage.getItem(STORAGE_KEYS.clientId);
  const secret = localStorage.getItem(STORAGE_KEYS.clientSecret);
  return id && secret ? { id, secret } : null;
}

function hasCredentials() {
  return getCredentials() !== null;
}

els.settingsBtn.addEventListener("click", () => {
  els.settingsPanel.classList.toggle("hidden");
  els.clientId.value = localStorage.getItem(STORAGE_KEYS.clientId) || "";
  els.clientSecret.value = localStorage.getItem(STORAGE_KEYS.clientSecret) || "";
});

els.saveCredentials.addEventListener("click", () => {
  const id = els.clientId.value.trim();
  const secret = els.clientSecret.value.trim();
  if (!id || !secret) {
    showStatus("Both Client ID and Client Secret are required.", "error");
    return;
  }
  localStorage.setItem(STORAGE_KEYS.clientId, id);
  localStorage.setItem(STORAGE_KEYS.clientSecret, secret);
  invalidateToken();
  els.settingsPanel.classList.add("hidden");
  showStatus("Credentials saved in this browser.", "info");
});

els.clearCredentials.addEventListener("click", () => {
  Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  els.clientId.value = "";
  els.clientSecret.value = "";
  showStatus("Credentials cleared.", "info");
});

/* ---------- auth ---------- */

function invalidateToken() {
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.tokenExpiry);
}

async function getToken() {
  const cached = localStorage.getItem(STORAGE_KEYS.token);
  const expiry = Number(localStorage.getItem(STORAGE_KEYS.tokenExpiry) || 0);
  if (cached && Date.now() < expiry - 60_000) return cached;

  const { id, secret } = getCredentials();

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(`${id}:${secret}`),
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    invalidateToken();
    throw new Error(
      res.status === 400 || res.status === 401
        ? "Spotify rejected the credentials. Check your Client ID and Secret (⚙️)."
        : `Token request failed (HTTP ${res.status}).`
    );
  }

  const data = await res.json();
  localStorage.setItem(STORAGE_KEYS.token, data.access_token);
  localStorage.setItem(
    STORAGE_KEYS.tokenExpiry,
    String(Date.now() + data.expires_in * 1000)
  );
  return data.access_token;
}

async function apiGet(path) {
  const token = await getToken();
  const res = await fetch(`https://api.spotify.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = new Error(`Spotify API error (HTTP ${res.status}) on ${path}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/* Fallback for apps without access to Spotify's deprecated audio-features
 * endpoint: ReccoBeats serves the same metrics for Spotify track IDs
 * (free, no auth, CORS-enabled). It lacks time_signature. */
async function fetchReccoBeatsFeatures(trackId) {
  try {
    const res = await fetch(
      `https://api.reccobeats.com/v1/audio-features?ids=${trackId}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const features = data.content?.[0];
    if (!features) return null;
    return { ...features, source: "ReccoBeats" };
  } catch {
    return null;
  }
}

/* ---------- link parsing ---------- */

function parseTrackId(raw) {
  const input = raw.trim();
  // spotify:track:ID
  let m = input.match(/^spotify:track:([A-Za-z0-9]{22})/);
  if (m) return m[1];
  // https://open.spotify.com/track/ID or /intl-xx/track/ID
  m = input.match(/open\.spotify\.com\/(?:[a-z-]+\/)?track\/([A-Za-z0-9]{22})/);
  if (m) return m[1];
  // bare 22-char id
  m = input.match(/^([A-Za-z0-9]{22})$/);
  if (m) return m[1];
  return null;
}

/* ---------- UI helpers ---------- */

function showStatus(msg, kind) {
  els.status.textContent = msg;
  els.status.className = `status ${kind}`;
}

function hideStatus() {
  els.status.className = "status hidden";
}

function fmtDuration(ms) {
  const total = Math.round(ms / 1000);
  const min = Math.floor(total / 60);
  const sec = String(total % 60).padStart(2, "0");
  return `${min}:${sec}`;
}

function fmtNumber(n) {
  return new Intl.NumberFormat().format(n);
}

function statBox(label, value) {
  const div = document.createElement("div");
  div.className = "stat";
  const l = document.createElement("span");
  l.className = "label";
  l.textContent = label;
  const v = document.createElement("span");
  v.className = "value";
  v.textContent = value;
  div.append(l, v);
  return div;
}

function featureBar(label, fraction, displayValue) {
  const row = document.createElement("div");
  row.className = "feature-row";
  const labelWrap = document.createElement("div");
  labelWrap.className = "feature-label";
  const name = document.createElement("span");
  name.textContent = label;
  const val = document.createElement("span");
  val.textContent = displayValue;
  labelWrap.append(name, val);
  const bar = document.createElement("div");
  bar.className = "bar";
  const fill = document.createElement("div");
  fill.className = "bar-fill";
  bar.append(fill);
  row.append(labelWrap, bar);
  requestAnimationFrame(() => {
    fill.style.width = `${Math.round(fraction * 100)}%`;
  });
  return row;
}

/* ---------- rendering ---------- */

const KEYS = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];

function renderTrack(track) {
  document.getElementById("album-art").src =
    track.album.images[0]?.url || "";
  document.getElementById("track-name").textContent = track.name;
  document.getElementById("track-artists").textContent = track.artists
    .map((a) => a.name)
    .join(", ");
  document.getElementById("track-album").textContent =
    `${track.album.name} · ${track.album.release_date?.slice(0, 4) || ""}`;
  document.getElementById("track-link").href = track.external_urls.spotify;

  const grid = document.getElementById("track-stats");
  grid.replaceChildren(
    statBox("Duration", fmtDuration(track.duration_ms)),
    statBox("Explicit", track.explicit ? "Yes" : "No"),
    statBox("Track #", `${track.track_number} of ${track.album.total_tracks}`),
    statBox("Disc", String(track.disc_number)),
    statBox("Markets", fmtNumber(track.available_markets?.length ?? 0))
  );

  document.getElementById("popularity-value").textContent =
    `${track.popularity} / 100`;
  const bar = document.getElementById("popularity-bar");
  bar.style.width = "0";
  requestAnimationFrame(() => {
    bar.style.width = `${track.popularity}%`;
  });
}

function renderAudioFeatures(features) {
  const wrap = document.getElementById("audio-features");
  wrap.replaceChildren();

  if (!features) {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent =
      "Audio features are unavailable for this track — Spotify deprecated the endpoint for newer API apps, and the ReccoBeats fallback has no data for it.";
    wrap.append(p);
    return;
  }

  const pct = (v) => `${Math.round(v * 100)}%`;
  wrap.append(
    featureBar("Danceability", features.danceability, pct(features.danceability)),
    featureBar("Energy", features.energy, pct(features.energy)),
    featureBar("Valence (positivity)", features.valence, pct(features.valence)),
    featureBar("Acousticness", features.acousticness, pct(features.acousticness)),
    featureBar("Instrumentalness", features.instrumentalness, pct(features.instrumentalness)),
    featureBar("Liveness", features.liveness, pct(features.liveness)),
    featureBar("Speechiness", features.speechiness, pct(features.speechiness))
  );

  const grid = document.createElement("div");
  grid.className = "stat-grid";
  grid.style.marginTop = "16px";
  const key =
    features.key >= 0
      ? `${KEYS[features.key]} ${features.mode === 1 ? "major" : "minor"}`
      : "Unknown";
  grid.append(
    statBox("Tempo", `${Math.round(features.tempo)} BPM`),
    statBox("Key", key),
    statBox("Loudness", `${features.loudness.toFixed(1)} dB`)
  );
  if (Number.isFinite(features.time_signature)) {
    grid.append(statBox("Time signature", `${features.time_signature}/4`));
  }
  wrap.append(grid);

  if (features.source) {
    const credit = document.createElement("p");
    credit.className = "hint";
    credit.textContent =
      `Provided by ${features.source} (Spotify's audio-features endpoint is unavailable for this app).`;
    wrap.append(credit);
  }
}

function renderArtists(artists) {
  document.getElementById("artist-plural").textContent =
    artists.length > 1 ? "s" : "";
  const wrap = document.getElementById("artist-cards");
  wrap.replaceChildren();

  for (const artist of artists) {
    const card = document.createElement("div");
    card.className = "artist-card";

    const img = document.createElement("img");
    img.src = artist.images?.[0]?.url || "";
    img.alt = artist.name;

    const info = document.createElement("div");
    const name = document.createElement("a");
    name.className = "artist-name";
    name.textContent = artist.name;
    name.href = artist.external_urls.spotify;
    name.target = "_blank";
    name.rel = "noopener";

    const meta = document.createElement("div");
    meta.className = "artist-meta";
    meta.textContent =
      `${fmtNumber(artist.followers.total)} followers · popularity ${artist.popularity}/100`;

    info.append(name, meta);

    if (artist.genres?.length) {
      const genres = document.createElement("div");
      genres.className = "genres";
      for (const g of artist.genres) {
        const tag = document.createElement("span");
        tag.className = "genre-tag";
        tag.textContent = g;
        genres.append(tag);
      }
      info.append(genres);
    }

    card.append(img, info);
    wrap.append(card);
  }
}

function renderAlbum(album) {
  const grid = document.getElementById("album-stats");
  grid.replaceChildren(
    statBox("Name", album.name),
    statBox("Released", album.release_date),
    statBox("Tracks", String(album.total_tracks)),
    statBox("Label", album.label || "—"),
    statBox("Popularity", `${album.popularity}/100`)
  );
}

/* ---------- main flow ---------- */

els.form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!hasCredentials()) {
    els.settingsPanel.classList.remove("hidden");
    showStatus("Enter your Spotify API credentials first (⚙️).", "error");
    return;
  }

  const trackId = parseTrackId(els.input.value);
  if (!trackId) {
    showStatus(
      "That doesn't look like a Spotify track link. Expected something like https://open.spotify.com/track/…",
      "error"
    );
    return;
  }

  showStatus("Fetching stats…", "info");
  els.results.classList.add("hidden");

  try {
    const track = await apiGet(`tracks/${trackId}`);

    const artistIds = track.artists.map((a) => a.id).join(",");
    const [artistsData, album, features] = await Promise.all([
      apiGet(`artists?ids=${artistIds}`),
      apiGet(`albums/${track.album.id}`),
      apiGet(`audio-features/${trackId}`).catch((err) => {
        if (err.status === 403 || err.status === 404) {
          return fetchReccoBeatsFeatures(trackId);
        }
        throw err;
      }),
    ]);

    renderTrack(track);
    renderAudioFeatures(features);
    renderArtists(artistsData.artists);
    renderAlbum(album);

    hideStatus();
    els.results.classList.remove("hidden");
  } catch (err) {
    showStatus(err.message, "error");
  }
});

// Prompt for credentials on first visit
if (!hasCredentials()) {
  els.settingsPanel.classList.remove("hidden");
}
