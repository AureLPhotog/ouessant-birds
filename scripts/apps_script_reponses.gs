/* Oiseaux d'Ouessant — relie la feuille des réponses du formulaire à la page « Tri des propositions » (admin.html).
   À coller dans la feuille Google des réponses : Extensions → Apps Script (voir README, « Récupération automatique »).
   Le script ne répond qu'avec le code secret, rangé dans les propriétés du script (CODE) : jamais dans le code ni dans le dépôt.
   - lire (par défaut) : renvoie toutes les lignes de la feuille (la première = titres des colonnes) ;
   - marquer : écrit la date dans la colonne « Traitée » des lignes indiquées (créée si besoin, à droite des réponses),
     pour que la page ne les propose plus au prochain tri. Les réponses ne sont jamais effacées. */

function doGet(e) {
  var p = (e && e.parameter) || {};
  var attendu = PropertiesService.getScriptProperties().getProperty('CODE');
  if (!attendu || attendu.length < 16 || !p.code || p.code !== attendu) return reponse({ ok: false, erreur: 'code' });
  var feuille = feuilleDesReponses();
  if (p.action === 'marquer') return reponse(marquer(feuille, String(p.lignes || '')));
  return reponse({ ok: true, lignes: feuille.getDataRange().getDisplayValues() });
}

// première feuille du classeur = les réponses du formulaire (ou celle nommée dans la propriété FEUILLE, si besoin)
function feuilleDesReponses() {
  var nom = PropertiesService.getScriptProperties().getProperty('FEUILLE');
  var classeur = SpreadsheetApp.getActiveSpreadsheet();
  return (nom && classeur.getSheetByName(nom)) || classeur.getSheets()[0];
}

function marquer(feuille, liste) {
  var verrou = LockService.getScriptLock();
  verrou.waitLock(20000);
  try {
    var derniere = feuille.getLastRow();
    var numeros = liste.split(',').map(Number).filter(function (n) { return n >= 2 && n <= derniere && Math.floor(n) === n; });
    if (!numeros.length) return { ok: true, marquees: 0 };
    var titres = feuille.getRange(1, 1, 1, feuille.getLastColumn()).getValues()[0];
    var col = titres.indexOf('Traitée') + 1;
    if (!col) { col = titres.length + 1; feuille.getRange(1, col).setValue('Traitée'); }
    var quand = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    numeros.forEach(function (n) { feuille.getRange(n, col).setValue('oui, le ' + quand); });
    return { ok: true, marquees: numeros.length };
  } finally {
    verrou.releaseLock();
  }
}

function reponse(objet) {
  return ContentService.createTextOutput(JSON.stringify(objet)).setMimeType(ContentService.MimeType.JSON);
}
