# WatchTrack — TMDB edition

A three-page movie and TV tracking website powered by **The Movie Database (TMDB)** for its media catalog and metadata.

## What TMDB supplies
- Movie and TV search results
- Posters, backdrops, titles, release/air dates, genres and ratings
- Movie runtime, cast, crew and directors
- TV cast, creators/directors, seasons, episode titles, air dates and episode runtimes
- Smooth single-open TV-season accordion: opening one season closes the previous season
- Trending titles shown before a search is entered
- Region-specific movie and TV watch-provider availability and provider logos

Watch-provider availability is supplied through TMDB's JustWatch-powered provider data. The title detail view shows streaming, rental, and purchase providers separately where TMDB has data for the selected country.

Your personal tracking data remains local to your browser using `localStorage`.

## Watch-time tracking
WatchTrack now keeps two independent totals:
- **Total movie time watched** — sums the TMDB runtime of every movie marked watched.
- **Total TV time watched** — sums the runtime of every episode marked watched.

The totals are shown separately on the Home dashboard and Profile page. When an individual TV episode does not have a runtime in TMDB, WatchTrack falls back to the show's listed typical episode runtime when available.

Runtime snapshots are saved into the local tracking state. Existing WatchTrack data from the prior TMDB version is compatible; when the site next loads the associated titles from TMDB, it automatically backfills missing runtime information.

## Profile watched-library sections
The Profile page keeps the two compact latest-three panels above the detailed event history:
- **Watched movies** — each movie appears once, with the latest 3 shown in the compact panel.
- **Watched TV shows** — each series appears once, positioned by its most recently watched episode, with the latest 3 shown in the compact panel.

**View all** no longer expands either compact panel. It opens a dedicated library pop-up styled like the Search page, with separate full-width sections for **All watched movies** and **All watched TV shows**. Each section uses poster tiles and remains sorted newest watched first.

## Watch history order
The detailed Profile history underneath the grouped lists is sorted **newest watched to oldest watched** and keeps every individual movie/episode watch event. New watch actions store a timestamp, which also gives reliable ordering for multiple items watched on the same day. Older saved entries that only contain a date remain supported.

## Watch-provider country
Streaming services vary by country. In **TMDB Setup**, set the 2-letter country code used for provider availability (for example `IN`, `US`, or `GB`). If no country has been saved, WatchTrack attempts to derive one from the browser locale.

## Pages
- `index.html` — continue watching, newly released unwatched episodes, separate movie/TV watch-time totals, statistics, and movie wishlist
- `profile.html` — latest-three movie/TV previews, dedicated poster-grid sections for the full watched movie and TV libraries, newest-first detailed watch history, separate movie/TV watch-time totals, and detailed title information
- `search.html` — live TMDB search with Movie / TV filters and tracking controls

## First-time setup
1. Create/log in to a TMDB account.
2. In TMDB account settings, open **API** and obtain an **API Read Access Token**.
3. Open WatchTrack and click **TMDB Setup**.
4. Paste the token.
5. Set your watch-provider country code.
6. Choose **Save & connect**.

The token is stored in that browser's local storage. It is not included in these project files.

## Running the site
You can try opening `index.html` directly. If your browser blocks cross-origin API requests from a `file://` page, serve the folder locally instead:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deployment note
This static prototype sends the user's configured Read Access Token from the browser directly to TMDB. For a public production deployment, put TMDB requests behind a backend/serverless proxy so application credentials are not exposed to site visitors.

## Attribution
This product uses the TMDB API but is not endorsed or certified by TMDB.

Watch-provider availability data is supplied by JustWatch through TMDB. WatchTrack displays JustWatch attribution alongside provider information.

- Movie and TV title tiles are fully clickable throughout Home, Profile, and Search; action buttons remain independent.

- **Catch-up episode marking:** when you mark a later released episode watched while earlier released episodes are still unwatched, WatchTrack asks whether to mark all missing previous episodes too. Choosing No marks only the selected episode.

## Interaction updates

- Details overlays lock the page behind them and contain scrolling at the top and bottom of the panel.

## Profile library pop-ups

The Profile page keeps Movies and TV Shows separate. Each compact latest-three panel has its own **View all** action, which opens a dedicated modal for that media type only. The movie modal contains all watched movies; the TV modal contains all watched shows. Both use the poster-grid library view, sort newest watched first, lock background scrolling, and close independently.


## Latest interface updates
- Home dashboard copy has been simplified to **Dashboard**, **Welcome Back!**, **Continue Watching**, and **Up Next.**
- The Home page now focuses on Continue Watching and the Movie Wishlist; the New & Unwatched section has been removed.
- Watch-time totals use compact labels: **Mo.**, **D**, **Hr.**, and **Min.**, with movie and TV totals still calculated separately.
- **Clear Tracking Data** has moved to the bottom of the Profile page and uses red warning styling.
