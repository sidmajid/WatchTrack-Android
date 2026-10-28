const TMDB_API = 'https://api.themoviedb.org/3';
const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/w1280';
const TMDB_PROVIDER_IMAGE = 'https://image.tmdb.org/t/p/w92';
const TOKEN_KEY = 'watchtrack-tmdb-token';
const PROVIDER_REGION_KEY = 'watchtrack-provider-region';
const STATE_KEY = 'watchtrack-state-v2';
const LEGACY_STATE_KEY = 'watchtrack-state';
const CACHE_PREFIX = 'watchtrack-tmdb-cache:';
const CACHE_TTL = 6 * 60 * 60 * 1000;
const PLACEHOLDER_POSTER = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750"><rect width="500" height="750" fill="#171d2a"/><circle cx="250" cy="320" r="70" fill="#252d3d"/><path d="M216 275l94 45-94 45z" fill="#C9F36A"/><text x="250" y="445" fill="#9ca6b7" font-family="Arial,sans-serif" text-anchor="middle" font-size="26">No poster</text></svg>`);

const legacyIdMap = {
  'movie-arrival': 329865,
  'movie-dune2': 693134,
  'movie-oppenheimer': 872585,
  'movie-parasite': 496243,
  'tv-severance': 95396,
  'tv-bear': 136315,
  'tv-andor': 83867
};

function defaultState(){
  return { watchedMovies: [], tvProgress: {}, wishlist: [] };
}

function migrateLegacyState(){
  if(localStorage.getItem(STATE_KEY)) return;
  try{
    const legacy = JSON.parse(localStorage.getItem(LEGACY_STATE_KEY) || 'null');
    if(!legacy) return;
    const migrated = defaultState();
    migrated.watchedMovies = (legacy.watchedMovies || [])
      .map(x => ({ id: legacyIdMap[x.id], watchedAt: x.watchedAt }))
      .filter(x => x.id);
    migrated.wishlist = (legacy.wishlist || []).map(id => legacyIdMap[id]).filter(Boolean);
    Object.entries(legacy.tvProgress || {}).forEach(([oldId, p]) => {
      const id = legacyIdMap[oldId];
      if(id) migrated.tvProgress[id] = p;
    });
    localStorage.setItem(STATE_KEY, JSON.stringify(migrated));
  } catch(e){ console.warn('Legacy state migration failed', e); }
}

migrateLegacyState();

function loadState(){
  try { return JSON.parse(localStorage.getItem(STATE_KEY)) || defaultState(); }
  catch { return defaultState(); }
}
function saveState(){ localStorage.setItem(STATE_KEY, JSON.stringify(state)); }
const state = loadState();

function getToken(){ return (localStorage.getItem(TOKEN_KEY) || '').trim(); }
function hasToken(){ return Boolean(getToken()); }
function esc(s=''){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function todayIso(){ return new Date().toISOString().slice(0,10); }
function watchedNowIso(){ return new Date().toISOString(); }
function dateObject(d){
  if(!d) return null;
  const dt = new Date(String(d).includes('T') ? d : `${d}T12:00:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}
function formatDate(d){
  const dt=dateObject(d);
  return dt ? dt.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}) : (d || 'Date unavailable');
}
function formatWatchedAt(d){
  const dt=dateObject(d);
  if(!dt) return d || 'Date unavailable';
  if(!String(d).includes('T')) return dt.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
  return dt.toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
}
function watchSortValue(d){ const dt=dateObject(d); return dt ? dt.getTime() : 0; }
function formatMinutes(n){
  let total=Math.max(0,Math.round(Number(n)||0));
  const monthMinutes=30*24*60;
  const dayMinutes=24*60;
  const months=Math.floor(total/monthMinutes); total%=monthMinutes;
  const days=Math.floor(total/dayMinutes); total%=dayMinutes;
  const hours=Math.floor(total/60);
  const minutes=total%60;
  const parts=[];
  if(months) parts.push(`${months.toLocaleString()} Mo.`);
  if(days) parts.push(`${days} D`);
  if(hours) parts.push(`${hours} Hr.`);
  if(minutes || !parts.length) parts.push(`${minutes} Min.`);
  return parts.join(', ');
}
function detectedRegion(){
  const locale=(navigator.language || '').replace('_','-');
  const parts=locale.split('-');
  const maybe=parts.find((x,i)=>i>0 && /^[A-Za-z]{2}$/.test(x));
  return maybe ? maybe.toUpperCase() : 'US';
}
function getWatchRegion(){
  const saved=(localStorage.getItem(PROVIDER_REGION_KEY)||'').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(saved) ? saved : detectedRegion();
}
function providerLogoUrl(path){ return path ? `${TMDB_PROVIDER_IMAGE}${path}` : ''; }

function posterUrl(path){ return path ? `${TMDB_IMAGE}${path}` : PLACEHOLDER_POSTER; }
function backdropUrl(path){ return path ? `${TMDB_BACKDROP}${path}` : ''; }
function yearFrom(date){ return date ? String(date).slice(0,4) : '—'; }
function mediaTitle(item){ return item.title || item.name || 'Untitled'; }
function mediaDate(item){ return item.release_date || item.first_air_date || ''; }
function mediaType(item){ return item.media_type || (item.title ? 'movie' : 'tv'); }
function runtimeLabel(n){ return Number.isFinite(n) && n > 0 ? `${n} min` : 'Runtime unavailable'; }
function isReleased(date){ return Boolean(date) && date <= todayIso(); }
function setLoading(el, text='Loading from TMDB…'){ if(el) el.innerHTML = `<div class="empty loading-dot">${esc(text)}</div>`; }
function showError(el, msg){ if(el) el.innerHTML = `<div class="empty error-box">${esc(msg)}</div>`; }

function nav(){
  const p=location.pathname.split('/').pop()||'index.html';
  document.querySelectorAll('.nav-links a').forEach(a=>{
    const active=a.getAttribute('href')===p;
    a.classList.toggle('active',active);
    if(active) a.setAttribute('aria-current','page');
    else a.removeAttribute('aria-current');
  });
}
function handleImageFallbacks(){
  document.addEventListener('error',event=>{
    const image=event.target;
    if(!(image instanceof HTMLImageElement)||image.dataset.fallback==='true')return;
    if(image.closest('.poster,.collection-item,.history-item,.modal-head')){image.dataset.fallback='true';image.src=PLACEHOLDER_POSTER;}
  },true);
}

function cacheGet(key){
  try{
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    if(!raw) return null;
    const item = JSON.parse(raw);
    if(Date.now() - item.t > CACHE_TTL){ sessionStorage.removeItem(CACHE_PREFIX + key); return null; }
    return item.v;
  } catch { return null; }
}
function cacheSet(key, value){
  try{ sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify({t:Date.now(),v:value})); } catch{}
}

async function tmdbFetch(path, params={}, {cache=true}={}){
  const token = getToken();
  if(!token) throw new Error('TMDB token is not configured.');
  const url = new URL(`${TMDB_API}${path}`);
  Object.entries(params).forEach(([k,v]) => {
    if(v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  const key = url.toString();
  if(cache){ const cached = cacheGet(key); if(cached) return cached; }
  let response;
  try{
    response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, accept: 'application/json' } });
  } catch(e){
    throw new Error('Could not reach TMDB. If you opened this site directly from a file, try running it through a small local web server.');
  }
  if(response.status === 401) throw new Error('TMDB rejected the token. Open TMDB Setup and paste a valid API Read Access Token.');
  if(!response.ok){
    let detail='';
    try{ detail=(await response.json()).status_message || ''; }catch{}
    throw new Error(detail || `TMDB request failed (${response.status}).`);
  }
  const data = await response.json();
  if(cache) cacheSet(key, data);
  return data;
}

async function validateToken(token){
  const old = getToken();
  localStorage.setItem(TOKEN_KEY, token.trim());
  try{
    await tmdbFetch('/configuration', {}, {cache:false});
    return true;
  } catch(e){
    if(old) localStorage.setItem(TOKEN_KEY, old); else localStorage.removeItem(TOKEN_KEY);
    throw e;
  }
}

let pageScrollLockY = 0;
let pageScrollLockPadding = '';
function lockPageScroll(){
  const body=document.body;
  if(!body || body.classList.contains('page-scroll-locked')) return;
  pageScrollLockY=window.scrollY || window.pageYOffset || 0;
  pageScrollLockPadding=body.style.paddingRight;
  const scrollbarWidth=Math.max(0,window.innerWidth-document.documentElement.clientWidth);
  if(scrollbarWidth) body.style.paddingRight=`${scrollbarWidth}px`;
  body.style.top=`-${pageScrollLockY}px`;
  body.classList.add('page-scroll-locked');
}
function unlockPageScroll(){
  const body=document.body;
  if(!body || !body.classList.contains('page-scroll-locked')) return;
  body.classList.remove('page-scroll-locked');
  body.style.top='';
  body.style.paddingRight=pageScrollLockPadding;
  window.scrollTo(0,pageScrollLockY);
}
function syncPageScrollLock(){
  const overlayOpen=!!document.querySelector('.modal-backdrop.show');
  if(overlayOpen) lockPageScroll(); else unlockPageScroll();
}

function openSettings(){
  const modal=document.getElementById('settingsModal');
  const input=document.getElementById('tmdbTokenInput');
  const status=document.getElementById('tmdbStatus');
  if(input) input.value=getToken();
  const regionInput=document.getElementById('providerRegionInput');
  if(regionInput) regionInput.value=getWatchRegion();
  if(status) status.textContent=hasToken()?'A TMDB token is saved in this browser.':'No TMDB token saved yet.';
  modal?.classList.add('show');
  syncPageScrollLock();
}
function closeSettings(){ document.getElementById('settingsModal')?.classList.remove('show'); syncPageScrollLock(); }
async function saveTmdbToken(){
  const input=document.getElementById('tmdbTokenInput');
  const status=document.getElementById('tmdbStatus');
  const button=document.getElementById('saveTokenButton');
  const token=input?.value.trim();
  const regionInput=document.getElementById('providerRegionInput');
  const region=(regionInput?.value||getWatchRegion()).trim().toUpperCase();
  if(region && !/^[A-Z]{2}$/.test(region)){ if(status) status.textContent='Watch provider region must be a 2-letter country code such as IN, US, or GB.'; return; }
  if(!token){ if(status) status.textContent='Paste your TMDB API Read Access Token first.'; return; }
  if(button){ button.disabled=true; button.textContent='Checking…'; }
  if(status) status.textContent='Validating with TMDB…';
  try{
    await validateToken(token);
    if(region) localStorage.setItem(PROVIDER_REGION_KEY, region);
    sessionStorage.clear();
    if(status) status.textContent='Connected to TMDB successfully.';
    setTimeout(()=>location.reload(),450);
  } catch(e){ if(status) status.textContent=e.message; }
  finally{ if(button){button.disabled=false;button.textContent='Save & connect';} }
}
function clearTmdbToken(){
  localStorage.removeItem(TOKEN_KEY);
  Object.keys(sessionStorage).filter(k=>k.startsWith(CACHE_PREFIX)).forEach(k=>sessionStorage.removeItem(k));
  location.reload();
}

function requireTokenMessage(el){
  if(!el) return;
  el.innerHTML=`<div class="empty setup-empty"><strong>Connect TMDB to load your library.</strong><span>WatchTrack uses TMDB for movie and TV metadata.</span><button class="btn primary" onclick="openSettings()">Configure TMDB</button></div>`;
}

function movieWatched(id){ return state.watchedMovies.find(x=>Number(x.id)===Number(id)); }
function showProgress(id){ return state.tvProgress[String(id)] || state.tvProgress[id]; }
function isWishlisted(id){ return state.wishlist.some(x=>Number(x)===Number(id)); }
function watchedSet(id){ return new Set(showProgress(id)?.watched || []); }

function episodeKey(season, episode){ return `${season}-${episode}`; }
function regularSeasons(show){ return (show.seasons || []).filter(s=>s.season_number > 0); }

async function loadMovie(id){
  return tmdbFetch(`/movie/${id}`, { append_to_response:'credits,release_dates', language:'en-US' });
}

async function loadTvBundle(id){
  const show = await tmdbFetch(`/tv/${id}`, { append_to_response:'aggregate_credits,content_ratings', language:'en-US' });
  const seasonMeta = regularSeasons(show);
  const seasons = await Promise.all(seasonMeta.map(s => tmdbFetch(`/tv/${id}/season/${s.season_number}`, { language:'en-US' })));
  return {...show, seasonData: seasons};
}

async function loadWatchProviders(type,id){
  return tmdbFetch(`/${type}/${id}/watch/providers`);
}

function uniqueProviders(items=[]){
  const seen=new Set();
  return items.filter(p=>{
    const key=p.provider_id ?? p.provider_name;
    if(seen.has(key)) return false;
    seen.add(key); return true;
  });
}
function providerGroup(label,items=[]){
  const providers=uniqueProviders(items);
  if(!providers.length) return '';
  return `<div class="provider-group"><div class="provider-label">${esc(label)}</div><div class="provider-logos">${providers.map(p=>`<div class="provider" title="${esc(p.provider_name||'Streaming provider')}">${p.logo_path?`<img src="${providerLogoUrl(p.logo_path)}" alt="${esc(p.provider_name||'Provider')} logo" loading="lazy">`:`<span>${esc((p.provider_name||'?').slice(0,2))}</span>`}<small>${esc(p.provider_name||'Provider')}</small></div>`).join('')}</div></div>`;
}
function providerSection(data){
  const region=getWatchRegion();
  const info=data?.results?.[region];
  if(!info) return `<section class="provider-section"><div class="provider-title-row"><h3>Where to watch</h3><span class="region-pill">${esc(region)}</span></div><div class="provider-empty">No watch-provider information is currently listed for ${esc(region)}.</div><div class="justwatch">Streaming availability data supplied by JustWatch via TMDB. Change the country code in TMDB Setup if needed.</div></section>`;
  const stream=uniqueProviders([...(info.flatrate||[]),...(info.free||[]),...(info.ads||[])]);
  const html=[providerGroup('Stream',stream),providerGroup('Rent',info.rent||[]),providerGroup('Buy',info.buy||[])].filter(Boolean).join('');
  const link=info.link ? `<a class="provider-link" href="${esc(info.link)}" target="_blank" rel="noreferrer">View availability on TMDB ↗</a>` : '';
  return `<section class="provider-section"><div class="provider-title-row"><h3>Where to watch</h3><span class="region-pill">${esc(region)}</span></div>${html||'<div class="provider-empty">No streaming, rental, or purchase providers are currently listed.</div>'}<div class="provider-foot">${link}<span class="justwatch">Streaming availability data supplied by JustWatch via TMDB.</span></div></section>`;
}

function episodeRuntimeMinutes(ep,show){
  const exact=Number(ep?.runtime);
  if(Number.isFinite(exact) && exact>0) return exact;
  const fallback=(show?.episode_run_time||[]).map(Number).find(n=>Number.isFinite(n)&&n>0);
  return fallback || 0;
}
function movieWatchMinutesFromState(){ return state.watchedMovies.reduce((sum,m)=>sum+(Number(m.runtime)||0),0); }
function tvWatchMinutesFromState(){
  return Object.values(state.tvProgress).reduce((sum,p)=>sum+Object.values(p.runtimes||{}).reduce((a,n)=>a+(Number(n)||0),0),0);
}
function syncMovieRuntime(id,runtime){
  const row=movieWatched(id); const n=Number(runtime);
  if(row && Number.isFinite(n) && n>0 && Number(row.runtime)!==n){ row.runtime=n; return true; }
  return false;
}
function syncTvRuntimes(show){
  const p=showProgress(show.id); if(!p) return false;
  p.runtimes ||= {}; let changed=false;
  const eps=new Map(allEpisodes(show).map(ep=>[ep.key,ep]));
  (p.watched||[]).forEach(key=>{
    const ep=eps.get(key); if(!ep) return;
    const n=episodeRuntimeMinutes(ep,show);
    if(n>0 && Number(p.runtimes[key])!==n){ p.runtimes[key]=n; changed=true; }
  });
  Object.keys(p.runtimes).forEach(key=>{ if(!(p.watched||[]).includes(key)){ delete p.runtimes[key]; changed=true; } });
  return changed;
}
function renderWatchTimeStats(){
  const movie=formatMinutes(movieWatchMinutesFromState());
  const tv=formatMinutes(tvWatchMinutesFromState());
  document.getElementById('statMovieMinutes')&&(document.getElementById('statMovieMinutes').textContent=movie);
  document.getElementById('statTvMinutes')&&(document.getElementById('statTvMinutes').textContent=tv);
  document.getElementById('profileMovieMinutes')&&(document.getElementById('profileMovieMinutes').textContent=movie);
  document.getElementById('profileTvMinutes')&&(document.getElementById('profileTvMinutes').textContent=tv);
}

function allEpisodes(show){
  return (show.seasonData || []).flatMap(s => (s.episodes || []).map(e=>({
    ...e,
    season: e.season_number,
    n: e.episode_number,
    key: episodeKey(e.season_number,e.episode_number),
    released: e.air_date,
    runtime: e.runtime
  }))).sort((a,b)=>a.season-b.season || a.n-b.n);
}
function releasedEpisodes(show){ return allEpisodes(show).filter(e=>isReleased(e.released)); }
function nextEpisode(show){
  const watched=watchedSet(show.id);
  return releasedEpisodes(show).find(ep=>!watched.has(ep.key));
}
function progressPct(show){
  const eps=releasedEpisodes(show);
  if(!eps.length) return 0;
  const watched=watchedSet(show.id);
  return Math.round((eps.filter(e=>watched.has(e.key)).length/eps.length)*100);
}

function certificationMovie(item){
  const results=item.release_dates?.results || [];
  const country = results.find(x=>x.iso_3166_1==='IN') || results.find(x=>x.iso_3166_1==='US');
  return country?.release_dates?.find(x=>x.certification)?.certification || 'Not rated';
}
function certificationTv(item){
  const results=item.content_ratings?.results || [];
  return (results.find(x=>x.iso_3166_1==='IN') || results.find(x=>x.iso_3166_1==='US'))?.rating || 'Not rated';
}
function movieDirectors(item){ return [...new Set((item.credits?.crew||[]).filter(x=>x.job==='Director').map(x=>x.name))]; }
function tvDirectors(item){
  const crew=item.aggregate_credits?.crew || [];
  return [...new Set(crew.filter(p=>(p.jobs||[]).some(j=>j.job==='Director')).map(p=>p.name))];
}
function topCast(item, tv=false){ return ((tv ? item.aggregate_credits?.cast : item.credits?.cast) || []).slice(0,10).map(x=>x.name); }

function detailTileAttrs(type,id,title,classes=''){
  const safeType=type==='tv'?'tv':'movie';
  const safeId=Number(id);
  return `class="${classes} clickable-title" role="link" tabindex="0" aria-label="Open details for ${esc(title)}" onclick="if(event.target.closest('button,a,input,textarea,select,[data-no-details]'))return;openDetails('${safeType}',${safeId})" onkeydown="if(event.target===this&&(event.key==='Enter'||event.key===' ')){event.preventDefault();openDetails('${safeType}',${safeId})}"`;
}

function summaryCard(item, opts={}){
  const type=mediaType(item), id=item.id, show=type==='tv';
  const title=mediaTitle(item), date=mediaDate(item);
  const poster=posterUrl(item.poster_path);
  const rating=Number(item.vote_average||0).toFixed(1);
  const actions=opts.search ? `<div class="actions">${searchActions(type,id)}</div>` : '';
  return `<article ${detailTileAttrs(type,id,title,'card clickable-card')}>
    <div class="poster"><img src="${poster}" alt="${esc(title)} poster" loading="lazy"><span class="badge">${show?'TV':'Movie'}</span></div>
    <div class="card-body">
      <div class="title">${esc(title)}</div>
      <div class="meta"><span>${yearFrom(date)}</span>${Number(item.vote_average)>0?`<span>•</span><span>★ ${rating}</span>`:''}</div>
      ${actions}
    </div>
  </article>`;
}

function trackedCard(show){
  const next=nextEpisode(show);
  const released=releasedEpisodes(show).length;
  const watched=watchedSet(show.id).size;
  return `<article ${detailTileAttrs('tv',show.id,show.name,'card clickable-card')}>
    <div class="poster"><img src="${posterUrl(show.poster_path)}" alt="${esc(show.name)} poster" loading="lazy"><span class="badge">TV</span></div>
    <div class="card-body">
      <div class="title">${esc(show.name)}</div>
      <div class="meta"><span>${yearFrom(show.first_air_date)}</span><span>•</span><span>${watched}/${released} released episodes</span></div>
      <div class="progress"><span style="width:${progressPct(show)}%"></span></div>
      <div class="meta">${next?`Next: S${next.season}E${next.n} · ${esc(next.name)}`:'Caught up with released episodes'}</div>
      ${next?`<div class="actions"><button class="btn primary" onclick="toggleEpisode(${show.id},'${next.key}',false,${episodeRuntimeMinutes(next,show)})">Mark next watched</button></div>`:''}
    </div>
  </article>`;
}

function searchActions(type,id){
  if(type==='movie'){
    const watched=movieWatched(id), wished=isWishlisted(id);
    return `<button class="btn ${watched?'success':''}" onclick="toggleMovieWatched(${id})">${watched?'Watched':'Mark watched'}</button><button class="btn ${wished?'primary':''}" onclick="toggleWishlist(${id})">${wished?'Wishlisted':'Wishlist'}</button>`;
  }
  const tracked=Boolean(showProgress(id));
  return `<button class="btn ${tracked?'success':''}" onclick="toggleTrackShow(${id})">${tracked?'Tracking':'Track show'}</button>`;
}

async function initHome(){
  const watching=document.getElementById('watchingGrid');
  const wishlist=document.getElementById('wishlistGrid');
  renderWatchTimeStats();
  if(!hasToken()){
    [watching,wishlist].forEach(requireTokenMessage);
    updateStats([]);
    
    return;
  }
  setLoading(watching); setLoading(wishlist);
  try{
    const tvIds=Object.keys(state.tvProgress);
    const allMovieIds=[...new Set([...state.wishlist.map(Number),...state.watchedMovies.map(m=>Number(m.id))])];
    const [shows, movieDetails] = await Promise.all([
      Promise.all(tvIds.map(id=>loadTvBundle(id).catch(e=>({id:Number(id),_error:e.message,name:`TV #${id}`,seasonData:[]})))),
      Promise.all(allMovieIds.map(id=>tmdbFetch(`/movie/${id}`,{language:'en-US'}).catch(()=>null)))
    ]);
    const validShows=shows.filter(x=>!x._error);
    const validMovies=movieDetails.filter(Boolean);
    let stateChanged=false;
    validShows.forEach(show=>{ if(syncTvRuntimes(show)) stateChanged=true; });
    validMovies.forEach(movie=>{ if(syncMovieRuntime(movie.id,movie.runtime)) stateChanged=true; });
    if(stateChanged) saveState();
    renderWatchTimeStats();

    watching.innerHTML=validShows.map(trackedCard).join('')||'<div class="empty">No TV shows are being tracked yet. Search for a show to add one.</div>';
    const movieMap=new Map(validMovies.map(m=>[Number(m.id),m]));
    const wishlistMovies=state.wishlist.map(id=>movieMap.get(Number(id))).filter(Boolean);
    wishlist.innerHTML=wishlistMovies.map(x=>summaryCard({...x,media_type:'movie'})).join('')||'<div class="empty">Your movie wishlist is empty.</div>';
    updateStats(validShows);
  }catch(e){
    showError(watching,e.message); showError(wishlist,e.message);
  }
}

function updateStats(shows){
  const epCount=Object.values(state.tvProgress).reduce((a,b)=>a+(b.watched?.length||0),0);
  document.getElementById('statShows')&&(document.getElementById('statShows').textContent=shows.length || Object.keys(state.tvProgress).length);
  document.getElementById('statEpisodes')&&(document.getElementById('statEpisodes').textContent=epCount);
  document.getElementById('statMovies')&&(document.getElementById('statMovies').textContent=state.watchedMovies.length);
  document.getElementById('statWishlist')&&(document.getElementById('statWishlist').textContent=state.wishlist.length);
  renderWatchTimeStats();
}

const profileCollectionState = {
  movie: { rows: [] },
  tv: { rows: [] }
};

function profileCollectionIds(type){
  return type==='movie'
    ? {list:'watchedMoviesList',toggle:'moviesListToggle',fullGrid:'allWatchedMoviesGrid',fullCount:'allWatchedMoviesCount',fullSection:'allWatchedMoviesSection',modal:'watchedMoviesModal'}
    : {list:'watchedTvList',toggle:'tvListToggle',fullGrid:'allWatchedTvGrid',fullCount:'allWatchedTvCount',fullSection:'allWatchedTvSection',modal:'watchedTvModal'};
}

function profileCollectionCard(type,row){
  const title=mediaTitle(row.item);
  if(type==='movie'){
    return `<div ${detailTileAttrs('movie',row.item.id,title,'collection-item clickable-row')}><img src="${posterUrl(row.item.poster_path)}" alt="${esc(title)}"><div class="collection-copy"><div class="title">${esc(title)}</div><div class="meta">Movie · ${runtimeLabel(row.item.runtime)}</div><div class="when">${row.when?`Watched ${formatWatchedAt(row.when)}`:'Watch date unavailable'}</div></div></div>`;
  }
  const count=Number(row.episodeCount)||0;
  const latest=row.latestEpisode;
  const latestText=latest?`Latest: S${latest.season}E${latest.n}${latest.name?` · ${latest.name}`:''}`:'Latest episode unavailable';
  return `<div ${detailTileAttrs('tv',row.item.id,title,'collection-item clickable-row')}><img src="${posterUrl(row.item.poster_path)}" alt="${esc(title)}"><div class="collection-copy"><div class="title">${esc(title)}</div><div class="meta">${count.toLocaleString()} episode${count===1?'':'s'} watched</div><div class="meta">${esc(latestText)}</div><div class="when">${row.when?`Last watched ${formatWatchedAt(row.when)}`:'Watch date unavailable'}</div></div></div>`;
}

function profileBrowserCard(type,row){
  const title=mediaTitle(row.item);
  if(type==='movie'){
    return `<article ${detailTileAttrs('movie',row.item.id,title,'card clickable-card profile-browser-card')}><div class="poster"><img src="${posterUrl(row.item.poster_path)}" alt="${esc(title)}" loading="lazy"><span class="badge">Watched movie</span></div><div class="card-body"><div class="title">${esc(title)}</div><div class="meta">Movie · ${runtimeLabel(row.item.runtime)}</div><div class="library-card-status">${row.when?`Watched ${formatWatchedAt(row.when)}`:'Watch date unavailable'}</div></div></article>`;
  }
  const count=Number(row.episodeCount)||0;
  const latest=row.latestEpisode;
  const latestText=latest?`S${latest.season}E${latest.n}${latest.name?` · ${latest.name}`:''}`:'Latest episode unavailable';
  return `<article ${detailTileAttrs('tv',row.item.id,title,'card clickable-card profile-browser-card')}><div class="poster"><img src="${posterUrl(row.item.poster_path)}" alt="${esc(title)}" loading="lazy"><span class="badge">${count.toLocaleString()} episode${count===1?'':'s'} watched</span></div><div class="card-body"><div class="title">${esc(title)}</div><div class="meta">TV show · ${esc(latestText)}</div><div class="library-card-status">${row.when?`Last watched ${formatWatchedAt(row.when)}`:'Watch date unavailable'}</div></div></article>`;
}

function renderFullProfileCollection(type){
  const cfg=profileCollectionState[type];
  const ids=profileCollectionIds(type);
  const grid=document.getElementById(ids.fullGrid);
  const count=document.getElementById(ids.fullCount);
  if(grid){
    const emptyText=type==='movie'?'No watched movies yet.':'No watched TV shows yet.';
    grid.innerHTML=cfg.rows.map(row=>profileBrowserCard(type,row)).join('')||`<div class="empty profile-browser-empty">${emptyText}</div>`;
  }
  if(count){
    const total=cfg.rows.length;
    const noun=type==='movie'?(total===1?'movie':'movies'):(total===1?'show':'shows');
    count.textContent=`${total.toLocaleString()} ${noun}`;
  }
}

function renderProfileCollection(type){
  const cfg=profileCollectionState[type];
  const ids=profileCollectionIds(type);
  const list=document.getElementById(ids.list);
  const toggle=document.getElementById(ids.toggle);
  if(!list) return;
  const rows=cfg.rows.slice(0,3);
  const emptyText=type==='movie'?'No watched movies yet.':'No watched TV shows yet.';
  list.innerHTML=rows.map(row=>profileCollectionCard(type,row)).join('')||`<div class="empty compact-empty">${emptyText}</div>`;
  if(toggle){
    if(cfg.rows.length<=3){
      toggle.hidden=true;
      toggle.setAttribute('aria-expanded','false');
    }else{
      toggle.hidden=false;
      toggle.textContent=`View all ${cfg.rows.length}`;
      toggle.setAttribute('aria-expanded','false');
      toggle.setAttribute('aria-controls',ids.modal);
    }
  }
  renderFullProfileCollection(type);
}

function openProfileCollection(type){
  const cfg=profileCollectionState[type];
  if(!cfg) return;
  const ids=profileCollectionIds(type);
  const browser=document.getElementById(ids.modal);
  const section=document.getElementById(ids.fullSection);
  const modal=browser?.querySelector('.library-modal');
  if(!browser || !section || !modal) return;
  closeProfileLibrary(type==='movie'?'tv':'movie',false);
  renderFullProfileCollection(type);
  browser.classList.add('show');
  document.getElementById(type==='movie'?'moviesListToggle':'tvListToggle')?.setAttribute('aria-expanded','true');
  syncPageScrollLock();
  requestAnimationFrame(()=>{
    modal.scrollTop=0;
    section.focus({preventScroll:true});
  });
}

function closeProfileLibrary(type, sync=true){
  const types=type?[type]:['movie','tv'];
  types.forEach(kind=>{
    const ids=profileCollectionIds(kind);
    document.getElementById(ids.modal)?.classList.remove('show');
    document.getElementById(kind==='movie'?'moviesListToggle':'tvListToggle')?.setAttribute('aria-expanded','false');
  });
  if(sync) syncPageScrollLock();
}

async function initProfile(){
  const list=document.getElementById('historyList');
  const movieList=document.getElementById('watchedMoviesList');
  const tvList=document.getElementById('watchedTvList');
  renderWatchTimeStats();
  if(!hasToken()){
    requireTokenMessage(movieList || list);
    if(tvList) tvList.innerHTML='<div class="empty compact-empty">Connect TMDB to load watched TV shows.</div>';
    if(list) list.innerHTML='<div class="empty compact-empty">Connect TMDB to load watch history.</div>';
    
    return;
  }
  setLoading(movieList,'Loading watched movies from TMDB…');
  setLoading(tvList,'Loading watched TV shows from TMDB…');
  if(list) setLoading(list,'Loading your watch history from TMDB…');
  try{
    let seq=0, stateChanged=false;
    const movieRows=await Promise.all(state.watchedMovies.map(async m=>{
      const order=seq++;
      try{
        const item=await tmdbFetch(`/movie/${m.id}`,{language:'en-US'});
        if(syncMovieRuntime(item.id,item.runtime)) stateChanged=true;
        return {type:'movie',item,when:m.watchedAt||'',label:`Movie watched · ${runtimeLabel(item.runtime)}`,order};
      }catch{return null;}
    }));
    const tvRows=[];
    const tvSummaryRows=[];
    for(const [id,p] of Object.entries(state.tvProgress)){
      const watchedKeys=Array.isArray(p.watched)?p.watched:[];
      if(!watchedKeys.length) continue;
      try{
        const show=await loadTvBundle(id);
        if(syncTvRuntimes(show)) stateChanged=true;
        const eps=allEpisodes(show);
        const eventRows=[];
        watchedKeys.forEach(key=>{
          const ep=eps.find(e=>e.key===key);
          if(!ep) return;
          const date=(p.watchedAt||{})[key]||'';
          const row={type:'tv',item:show,when:date,label:`S${ep.season}E${ep.n} · ${ep.name} · ${runtimeLabel(episodeRuntimeMinutes(ep,show))}`,order:seq++,episode:ep};
          eventRows.push(row);
          if(date) tvRows.push(row);
        });
        const latest=[...eventRows].sort((a,b)=>{
          const delta=watchSortValue(b.when)-watchSortValue(a.when);
          return delta || (b.order-a.order);
        })[0] || null;
        tvSummaryRows.push({
          type:'tv',
          item:show,
          when:latest?.when||'',
          order:latest?.order ?? seq++,
          episodeCount:watchedKeys.length,
          latestEpisode:latest?.episode||null
        });
      }catch{}
    }
    if(stateChanged) saveState();
    renderWatchTimeStats();

    const sortNewest=(a,b)=>{
      const delta=watchSortValue(b.when)-watchSortValue(a.when);
      return delta || (b.order-a.order);
    };
    const sortedMovies=movieRows.filter(Boolean).sort(sortNewest);
    const sortedShows=tvSummaryRows.sort(sortNewest);
    profileCollectionState.movie.rows=sortedMovies;
    profileCollectionState.tv.rows=sortedShows;
    renderProfileCollection('movie');
    renderProfileCollection('tv');

    if(list){
      const history=[...sortedMovies,...tvRows].sort(sortNewest);
      list.innerHTML=history.map(h=>`<div ${detailTileAttrs(h.type,h.item.id,mediaTitle(h.item),'history-item clickable-row')}><img src="${posterUrl(h.item.poster_path)}" alt="${esc(mediaTitle(h.item))}"><div><div class="title">${esc(mediaTitle(h.item))}</div><div class="meta">${esc(h.label)}</div><div class="when">Watched ${formatWatchedAt(h.when)}</div></div></div>`).join('')||'<div class="empty">No dated watch history yet. Mark a movie or episode as watched and it will appear here.</div>';
    }
  }catch(e){
    showError(movieList,e.message);
    showError(tvList,e.message);
    if(list) showError(list,e.message);
  }
}

let currentFilter='all';
let searchTimer=null;
function initSearch(){
  const input=document.getElementById('searchInput');
  document.querySelectorAll('.chip').forEach(c=>c.addEventListener('click',()=>{
    document.querySelectorAll('.chip').forEach(x=>{const active=x===c;x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active));});
    currentFilter=c.dataset.filter; renderSearch();
  }));
  input?.addEventListener('input',()=>{ clearTimeout(searchTimer); searchTimer=setTimeout(renderSearch,320); });
  if(!hasToken()){ requireTokenMessage(document.getElementById('resultsGrid'));  return; }
  renderSearch();
}

async function renderSearch(){
  const grid=document.getElementById('resultsGrid');
  if(!grid) return;
  if(!hasToken()){ requireTokenMessage(grid); return; }
  const q=(document.getElementById('searchInput')?.value||'').trim();
  setLoading(grid,q?`Searching TMDB for “${q}”…`:'Loading popular titles from TMDB…');
  try{
    let results;
    if(q){
      const data=await tmdbFetch('/search/multi',{query:q,include_adult:false,language:'en-US',page:1},{cache:false});
      results=(data.results||[]).filter(x=>['movie','tv'].includes(x.media_type));
    }else{
      const data=await tmdbFetch('/trending/all/day',{language:'en-US'});
      results=(data.results||[]).filter(x=>['movie','tv'].includes(x.media_type));
    }
    results=results.filter(x=>currentFilter==='all'||x.media_type===currentFilter).slice(0,24);
    grid.innerHTML=results.map(x=>summaryCard(x,{search:true})).join('')||'<div class="empty">No movies or TV shows matched your search.</div>';
  }catch(e){ showError(grid,e.message); }
}

async function openDetails(type,id){
  const modal=document.getElementById('detailsModal');
  const body=document.getElementById('modalBody');
  if(!modal||!body) return;
  modal.classList.add('show');
  syncPageScrollLock();
  body.innerHTML='<div class="modal-loading">Loading details from TMDB…</div>';
  try{
    if(type==='movie'){
      const [item,providers]=await Promise.all([loadMovie(id),loadWatchProviders('movie',id).catch(()=>null)]);
      if(syncMovieRuntime(id,item.runtime)){ saveState(); renderWatchTimeStats(); }
      const watched=movieWatched(id), directors=movieDirectors(item), cast=topCast(item,false);
      const bg=backdropUrl(item.backdrop_path);
      body.innerHTML=`<div class="modal-hero" ${bg?`style="background-image:linear-gradient(90deg,#11151A 15%,rgba(17,21,26,.88),rgba(17,21,26,.38)),url('${bg}')"`:''}><div class="modal-head"><img src="${posterUrl(item.poster_path)}" alt="${esc(item.title)} poster"><div><div class="eyebrow">Movie</div><h2>${esc(item.title)}</h2><div class="meta">${yearFrom(item.release_date)} · ${esc(certificationMovie(item))} · ${(item.genres||[]).map(g=>esc(g.name)).join(' · ')}</div><p>${esc(item.overview||'No overview available.')}</p><p><strong>Cast:</strong> ${cast.length?esc(cast.join(', ')):'Not available'}</p></div></div></div><div class="modal-content"><div class="info-grid"><div class="info-box"><small>Runtime</small>${runtimeLabel(item.runtime)}</div><div class="info-box"><small>Director${directors.length===1?'':'s'}</small>${directors.length?esc(directors.join(', ')):'Not available'}</div><div class="info-box"><small>Your status</small>${watched?`Watched ${formatWatchedAt(watched.watchedAt)}`:'Not watched'}</div></div>${providerSection(providers)}<div class="actions"><button class="btn ${watched?'success':''}" onclick="toggleMovieWatched(${id},true,${Number(item.runtime)||0})">${watched?'Remove watched status':'Mark watched'}</button><button class="btn ${isWishlisted(id)?'primary':''}" onclick="toggleWishlist(${id},true)">${isWishlisted(id)?'Remove from wishlist':'Add to wishlist'}</button></div></div>`;
    }else{
      const [item,providers]=await Promise.all([loadTvBundle(id),loadWatchProviders('tv',id).catch(()=>null)]);
      if(syncTvRuntimes(item)){ saveState(); renderWatchTimeStats(); }
      const set=watchedSet(id), directors=tvDirectors(item), cast=topCast(item,true), creators=(item.created_by||[]).map(x=>x.name);
      const bg=backdropUrl(item.backdrop_path);
      const seasons=item.seasonData||[];
      const preferredSeason=Number(window.watchTrackPreferredSeason?.[id]) || 1;
      const initialSeason=seasons.some(s=>s.season_number===preferredSeason) ? preferredSeason : seasons[0]?.season_number;
      const episodeHtml=seasons.map(season=>{
        const seasonNumber=season.season_number;
        const isOpen=seasonNumber===initialSeason;
        const panelId=`season-${id}-${seasonNumber}`;
        return `<section class="season ${isOpen?'is-open':''}" data-season="${seasonNumber}"><button class="season-summary" type="button" aria-expanded="${isOpen?'true':'false'}" aria-controls="${panelId}" onclick="toggleSeasonAccordion(this)"><span>Season ${seasonNumber}</span><span class="season-summary-meta"><span>${(season.episodes||[]).length} episodes</span><span class="season-chevron" aria-hidden="true">⌄</span></span></button><div class="season-panel" id="${panelId}"><div class="season-panel-inner"><div class="episodes">${(season.episodes||[]).map(ep=>{
          const key=episodeKey(ep.season_number,ep.episode_number), seen=set.has(key), future=ep.air_date&&!isReleased(ep.air_date), mins=episodeRuntimeMinutes(ep,item);
          return `<div class="episode"><div class="epno">S${ep.season_number}E${ep.episode_number}</div><div><strong>${esc(ep.name||'Untitled episode')}</strong><div class="meta">${ep.air_date?`Aired ${formatDate(ep.air_date)}`:'Air date unavailable'}</div></div><div><div class="runtime">${runtimeLabel(mins)}</div><button class="btn ${seen?'success':''}" ${future?'disabled title="This episode has not aired yet"':''} onclick="toggleEpisode(${id},'${key}',true,${mins})">${seen?'Watched ✓':future?'Not released':'Mark watched'}</button></div></div>`;
        }).join('')}</div></div></div></section>`;
      }).join('');
      body.innerHTML=`<div class="modal-hero" ${bg?`style="background-image:linear-gradient(90deg,#11151A 15%,rgba(17,21,26,.88),rgba(17,21,26,.38)),url('${bg}')"`:''}><div class="modal-head"><img src="${posterUrl(item.poster_path)}" alt="${esc(item.name)} poster"><div><div class="eyebrow">TV series</div><h2>${esc(item.name)}</h2><div class="meta">${yearFrom(item.first_air_date)} · ${esc(certificationTv(item))} · ${(item.genres||[]).map(g=>esc(g.name)).join(' · ')}</div><p>${esc(item.overview||'No overview available.')}</p><p><strong>Cast:</strong> ${cast.length?esc(cast.join(', ')):'Not available'}</p></div></div></div><div class="modal-content"><div class="info-grid"><div class="info-box"><small>Regular seasons</small>${regularSeasons(item).length}</div><div class="info-box"><small>Created by</small>${creators.length?esc(creators.join(', ')):'Not available'}</div><div class="info-box"><small>Directors</small>${directors.length?esc(directors.slice(0,8).join(', ')):'Varies by episode'}</div></div>${providerSection(providers)}<div class="actions"><button class="btn ${showProgress(id)?'success':''}" onclick="toggleTrackShow(${id},true)">${showProgress(id)?'Stop tracking':'Track show'}</button></div><h3>Episodes</h3>${episodeHtml||'<div class="empty">No regular-season episode data is available.</div>'}</div>`;
    }
  }catch(e){ body.innerHTML=`<div class="modal-loading error-box">${esc(e.message)}</div>`; }
}

window.watchTrackPreferredSeason = window.watchTrackPreferredSeason || {};
let seasonAccordionTimer = null;
function toggleSeasonAccordion(button){
  const season=button?.closest('.season');
  const modal=button?.closest('.modal-content');
  if(!season || !modal) return;
  const wasOpen=season.classList.contains('is-open');
  const current=modal.querySelector('.season.is-open');
  if(seasonAccordionTimer){ clearTimeout(seasonAccordionTimer); seasonAccordionTimer=null; }

  if(wasOpen){
    season.classList.remove('is-open');
    button.setAttribute('aria-expanded','false');
    return;
  }

  const openTarget=()=>{
    modal.querySelectorAll('.season').forEach(row=>{
      const isTarget=row===season;
      row.classList.toggle('is-open',isTarget);
      row.querySelector('.season-summary')?.setAttribute('aria-expanded',isTarget?'true':'false');
    });
  };

  if(current && current!==season){
    current.classList.remove('is-open');
    current.querySelector('.season-summary')?.setAttribute('aria-expanded','false');
    seasonAccordionTimer=setTimeout(()=>{ openTarget(); seasonAccordionTimer=null; },300);
  }else openTarget();
}

function closeDetails(){ document.getElementById('detailsModal')?.classList.remove('show'); syncPageScrollLock(); }

function askToMarkPreviousEpisodes(show,targetEpisode,missingEpisodes){
  return new Promise(resolve=>{
    document.getElementById('catchupPrompt')?.remove();
    const count=missingEpisodes.length;
    const targetLabel=targetEpisode ? `S${targetEpisode.season}E${targetEpisode.n}` : 'this episode';
    const showName=show?.name || 'this show';
    const backdrop=document.createElement('div');
    backdrop.id='catchupPrompt';
    backdrop.className='catchup-backdrop';
    backdrop.innerHTML=`<div class="catchup-dialog" role="dialog" aria-modal="true" aria-labelledby="catchupTitle" aria-describedby="catchupCopy"><div class="eyebrow">Catch up progress</div><h3 id="catchupTitle">Mark previous episodes too?</h3><p id="catchupCopy">You are marking <strong>${esc(showName)} · ${esc(targetLabel)}</strong> as watched, but ${count.toLocaleString()} earlier released episode${count===1?' is':'s are'} still unwatched.</p><p class="catchup-note">Would you like WatchTrack to mark ${count===1?'that episode':'all of those episodes'} as watched as well?</p><div class="catchup-actions"><button class="btn primary" type="button" data-catchup="yes">Yes, mark previous</button><button class="btn ghost" type="button" data-catchup="no">No, only ${esc(targetLabel)}</button></div></div>`;
    document.body.appendChild(backdrop);
    let settled=false;
    const finish=value=>{
      if(settled) return;
      settled=true;
      document.removeEventListener('keydown',onKey);
      backdrop.classList.remove('show');
      setTimeout(()=>backdrop.remove(),180);
      resolve(value);
    };
    const onKey=e=>{ if(e.key==='Escape'){ e.preventDefault(); finish(false); } };
    document.addEventListener('keydown',onKey);
    backdrop.addEventListener('click',e=>{
      if(e.target===backdrop) finish(false);
      else if(e.target.closest('[data-catchup="yes"]')) finish(true);
      else if(e.target.closest('[data-catchup="no"]')) finish(false);
    });
    requestAnimationFrame(()=>{ backdrop.classList.add('show'); backdrop.querySelector('[data-catchup="yes"]')?.focus(); });
  });
}

async function toggleEpisode(id,key,reopen=false,runtime=0){
  const sid=String(id);
  if(reopen){ const seasonNumber=Number(String(key).split('-')[0]); if(seasonNumber>0) window.watchTrackPreferredSeason[id]=seasonNumber; }
  state.tvProgress[sid] ||= {watched:[],watchedAt:{},runtimes:{}};
  const p=state.tvProgress[sid]; p.watched ||= []; p.watchedAt ||= {}; p.runtimes ||= {};
  const index=p.watched.indexOf(key);

  if(index>=0){
    p.watched.splice(index,1); delete p.watchedAt[key]; delete p.runtimes[key];
  }else{
    let targetRuntime=Number(runtime)||0;
    let previousToMark=[];
    let loadedShow=null;

    if(hasToken()){
      try{
        const show=await loadTvBundle(id);
        loadedShow=show;
        const episodes=allEpisodes(show);
        const targetIndex=episodes.findIndex(ep=>ep.key===key);
        if(targetIndex>=0){
          const targetEpisode=episodes[targetIndex];
          targetRuntime=episodeRuntimeMinutes(targetEpisode,show) || targetRuntime;
          const alreadyWatched=new Set(p.watched);
          const missingPrevious=episodes.slice(0,targetIndex).filter(ep=>(!ep.released || isReleased(ep.released)) && !alreadyWatched.has(ep.key));
          if(missingPrevious.length){
            const markPrevious=await askToMarkPreviousEpisodes(show,targetEpisode,missingPrevious);
            if(markPrevious) previousToMark=missingPrevious;
          }
        }
      }catch(e){
        console.warn('Could not check earlier episodes; marking only the selected episode.',e);
      }
    }

    previousToMark.forEach(ep=>{
      if(p.watched.includes(ep.key)) return;
      p.watched.push(ep.key);
      p.watchedAt[ep.key]=watchedNowIso();
      const mins=episodeRuntimeMinutes(ep);
      const n=Number(mins);
      if(Number.isFinite(n)&&n>0) p.runtimes[ep.key]=n;
    });

    if(!p.watched.includes(key)){
      p.watched.push(key);
      p.watchedAt[key]=watchedNowIso();
      const n=Number(targetRuntime);
      if(Number.isFinite(n)&&n>0) p.runtimes[key]=n;
    }

    if(previousToMark.length && loadedShow){
      previousToMark.forEach(ep=>{
        const n=episodeRuntimeMinutes(ep,loadedShow);
        if(Number.isFinite(n)&&n>0) p.runtimes[ep.key]=n;
      });
    }
  }
  saveState(); renderWatchTimeStats();
  if(reopen){ if(document.getElementById('watchedMoviesList')) initProfile(); await openDetails('tv',id); } else refreshPage();
}
async function toggleMovieWatched(id,reopen=false,runtime=0){
  const i=state.watchedMovies.findIndex(x=>Number(x.id)===Number(id));
  if(i>=0) state.watchedMovies.splice(i,1);
  else{
    let n=Number(runtime)||0;
    if(!n && hasToken()){
      try{ const item=await tmdbFetch(`/movie/${id}`,{language:'en-US'}); n=Number(item.runtime)||0; }catch{}
    }
    state.watchedMovies.push({id:Number(id),watchedAt:watchedNowIso(),runtime:n});
  }
  saveState(); renderWatchTimeStats(); if(reopen){ if(document.getElementById('watchedMoviesList')) initProfile(); openDetails('movie',id); } else refreshPage();
}

function toggleWishlist(id,reopen=false){
  const i=state.wishlist.findIndex(x=>Number(x)===Number(id));
  if(i>=0) state.wishlist.splice(i,1); else state.wishlist.push(Number(id));
  saveState(); if(reopen) openDetails('movie',id); else refreshPage();
}
function toggleTrackShow(id,reopen=false){
  const sid=String(id);
  if(state.tvProgress[sid]) delete state.tvProgress[sid]; else state.tvProgress[sid]={watched:[],watchedAt:{},runtimes:{}};
  saveState(); if(reopen) openDetails('tv',id); else refreshPage();
}

function resetTrackingData(){
  if(!confirm('Clear your WatchTrack history, TV progress, and wishlist? Your TMDB token will be kept.')) return;
  localStorage.setItem(STATE_KEY,JSON.stringify(defaultState())); location.reload();
}
function refreshPage(){
  if(document.getElementById('watchingGrid')) initHome();
  if(document.getElementById('watchedMoviesList')) initProfile();
  if(document.getElementById('resultsGrid')) renderSearch();
}

function bindModals(){
  ['detailsModal','settingsModal','watchedMoviesModal','watchedTvModal'].forEach(id=>document.getElementById(id)?.addEventListener('click',e=>{
    if(e.target.id!==id) return;
    if(id==='detailsModal') closeDetails();
    else if(id==='settingsModal') closeSettings();
    else if(id==='watchedMoviesModal') closeProfileLibrary('movie');
    else closeProfileLibrary('tv');
  }));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDetails();closeSettings();closeProfileLibrary();}});
}

document.addEventListener('DOMContentLoaded',()=>{
  nav(); bindModals(); handleImageFallbacks();
  if(document.getElementById('watchingGrid')) initHome();
  if(document.getElementById('watchedMoviesList')) initProfile();
  if(document.getElementById('resultsGrid')) initSearch();
});
