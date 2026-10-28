# WatchTrack Website

Responsive HTML, CSS, and JavaScript movie/TV tracker. Start a local server from the repository root:

```bash
python -m http.server 8000 --directory web
```

Open http://localhost:8000, choose **TMDB Setup**, and enter your own TMDB API Read Access Token. Tracking data and the token are saved in browser local storage. Do not commit your token. The site uses TMDB but is not endorsed or certified by TMDB.
