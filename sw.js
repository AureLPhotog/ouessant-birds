/* Oiseaux d'Ouessant — mode hors ligne.
   Le navigateur garde l'appli, les listes et la carte en mémoire, pour fonctionner sans réseau sur l'île.
   ⚠️ À chaque mise en ligne d'une nouvelle version des fichiers de l'appli (HTML, CSS, JS, images),
   augmente le numéro ci-dessous (v3.2 → v3.3…) : c'est ce qui déclenche la mise à jour chez les utilisateurs.
   Les listes (JSON) n'ont pas besoin de ce changement : elles sont toujours vérifiées en ligne en premier. */
const VERSION = 'v5.24';
const CACHE = 'ouessant-' + VERSION;

// Fichiers gardés dès la première visite
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'css/polices.css', 'css/commun.css', 'css/appli.css',
  'polices/public-sans-latin-400-normal.woff2', 'polices/public-sans-latin-500-normal.woff2', 'polices/public-sans-latin-600-normal.woff2', 'polices/spectral-latin-400-italic.woff2', 'polices/spectral-latin-500-italic.woff2', 'polices/spectral-latin-500-normal.woff2', 'polices/spectral-latin-700-normal.woff2',
  'js/version.js', 'js/textes.js', 'js/carte.js', 'js/recherche.js', 'js/appli.js',
  'ouessant_birds.json', 'lieux_ouessant.json', 'version_listes.json', 'reglages.json',
  'phare_creach.svg', 'phare_creach_eteint.svg', 'qr_ouessant.svg', 'favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png',
  'carte_ouessant.webp', 'oriole_baltimore.webp'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      // chaque fichier séparément : un fichier manquant ne bloque pas les autres
      .then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('ouessant-') && k !== CACHE).map(k => caches.delete(k))))   // y compris l'ancien cache des polices Google
      .then(() => self.clients.claim())
  );
});

// Réseau d'abord (pour avoir la dernière version), mémoire en secours
async function networkFirst(req, cacheName){
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req, { cache: 'no-cache' });
    if (res && res.status === 200) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (_) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    throw _;
  }
}
// Mémoire d'abord (rapide), mise à jour en arrière-plan
async function staleWhileRevalidate(req, cacheName){
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const update = fetch(req).then(res => { if (res && (res.status === 200 || res.type === 'opaque')) cache.put(req, res.clone()).catch(() => {}); return res; }).catch(() => null);
  return hit || update.then(r => r || Response.error());
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;   // les lectures partielles (PDF, médias) passent par le réseau
  const url = new URL(req.url);

  if (url.origin === location.origin){
    // l'éditeur et ses échanges avec GitHub ne passent pas par le cache
    if (/editeur|admin/.test(url.pathname)) return;   // editeur.html, admin.html et leurs scripts / styles : jamais en cache
    // pages et listes : toujours la version en ligne si possible
    if (req.mode === 'navigate' || url.pathname.endsWith('.json')){
      event.respondWith(networkFirst(req, CACHE).catch(() => caches.match('index.html')));
      return;
    }
    // le reste (CSS, JS, images, carte) : depuis la mémoire, mis à jour en arrière-plan
    event.respondWith(staleWhileRevalidate(req, CACHE));
    return;
  }
  // tout le reste (météo, API GitHub…) : réseau normal, jamais gardé
});
