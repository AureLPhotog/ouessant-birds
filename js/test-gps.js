/* MODE TEST (branche test-gps uniquement, ne jamais fusionner dans main).
   Simule une position GPS sur l'île d'Ouessant pour tester les alertes et « Où suis-je ? » depuis n'importe où.
   Autre position : ajouter ?lat=48.4502&lon=-5.139 à l'adresse. */
(function(){
  const q = new URLSearchParams(location.search);
  const lat = parseFloat(q.get('lat')) || 48.4502, lon = parseFloat(q.get('lon')) || -5.139;
  const fake = () => ({ coords: { latitude: lat, longitude: lon, accuracy: 15 }, timestamp: Date.now() });
  const geo = { getCurrentPosition: (ok) => setTimeout(() => ok(fake()), 400), watchPosition: (ok) => { setTimeout(() => ok(fake()), 400); return 0; }, clearWatch: () => {} };
  try { Object.defineProperty(navigator, 'geolocation', { value: geo, configurable: true }); } catch (_) { navigator.geolocation = geo; }
  document.addEventListener('DOMContentLoaded', () => {
    const b = document.createElement('div');
    b.textContent = `MODE TEST : position simulée (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
    b.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99;background:#D62828;color:#fff;font:600 13px system-ui,sans-serif;text-align:center;padding:6px 8px;padding-bottom:calc(6px + env(safe-area-inset-bottom,0px))';
    document.body.appendChild(b);
  });
})();
