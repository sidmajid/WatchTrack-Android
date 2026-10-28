# WatchTrack Android

Android WebView wrapper for WatchTrack. Website files are bundled in `app/src/main/assets/www/`.

## Build
Requirements: Java 17, Android SDK platform 35, Gradle 8.9.

```bash
gradle assembleDebug
```

Output: `app/build/outputs/apk/debug/app-debug.apk`.

## First launch
Open **TMDB Setup**, enter your own TMDB API Read Access Token, set a 2-letter provider country code such as `IN`, and save. No API token should be bundled with the app. Token and tracking data use the app's local WebView storage.

This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability is supplied by JustWatch via TMDB.
