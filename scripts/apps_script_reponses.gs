/* Oiseaux d'Ouessant — relie la feuille des réponses du formulaire à la page « Administration » (admin.html).
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

/* ---------- Alertes par mail (facultatif) ----------
   Réglages dans les propriétés du script (Paramètres du projet → Propriétés du script), modifiables à tout moment :
   - ALERTE_NB    : Y → un mail toutes les Y nouvelles réponses reçues (comptées depuis le dernier mail de ce type) ;
   - ALERTE_JOURS : X → chaque matin, un rappel si la plus ancienne réponse non traitée a plus de X jours ;
   - ALERTE_MAIL  : adresse qui reçoit les mails (facultatif ; par défaut, le compte Google du script).
   Vide ou 0 = alerte coupée. « Non traitée » = colonne « Traitée » vide (bouton « Marquer… » de la page Administration, en mode automatique).
   À activer une fois : dans la barre d'Apps Script, choisir la fonction installerAlertes → Exécuter → autoriser.
   Pour tout arrêter : exécuter couperAlertes. */
var PAGE_TRI = 'https://aurelphotog.github.io/ouessant-birds/admin.html';
var GESTIONNAIRES = ['alerteNouvelleReponse', 'alerteQuotidienne'];

function installerAlertes() {
  couperAlertes();
  ScriptApp.newTrigger('alerteNouvelleReponse').forSpreadsheet(SpreadsheetApp.getActive()).onFormSubmit().create();
  ScriptApp.newTrigger('alerteQuotidienne').timeBased().everyDays(1).atHour(8).create();   // vers 8 h (heure du script)
  alerteQuotidienne();   // première vérification tout de suite
}

function couperAlertes() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (GESTIONNAIRES.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
}

function alerteNouvelleReponse() { verifierNombre(etatDesReponses()); }
function alerteQuotidienne() { var etat = etatDesReponses(); verifierNombre(etat); verifierDelai(etat); }

function reglage(nom) {
  var v = Number(PropertiesService.getScriptProperties().getProperty(nom));
  return v > 0 ? v : 0;
}

// réponses reçues (total), non traitées (nb) et date de la plus ancienne non traitée (1re colonne = horodatage du formulaire)
function etatDesReponses() {
  var valeurs = feuilleDesReponses().getDataRange().getValues();
  var col = (valeurs[0] || []).indexOf('Traitée');
  var total = 0, nb = 0, plusAncienne = null;
  for (var i = 1; i < valeurs.length; i++) {
    var l = valeurs[i];
    if (!l.some(function (v) { return String(v).trim(); })) continue;   // ligne vide
    total++;
    if (col >= 0 && String(l[col]).trim()) continue;                     // déjà traitée
    nb++;
    if (l[0] instanceof Date && (!plusAncienne || l[0] < plusAncienne)) plusAncienne = l[0];
  }
  return { total: total, nb: nb, plusAncienne: plusAncienne };
}

// « toutes les Y réponses » : on retient le nombre total de réponses au dernier mail (ALERTE_NB_VU)
function verifierNombre(etat) {
  var verrou = LockService.getScriptLock();
  verrou.waitLock(20000);
  try {
    var props = PropertiesService.getScriptProperties(), y = reglage('ALERTE_NB');
    var vu = Number(props.getProperty('ALERTE_NB_VU')) || 0;
    if (etat.total < vu) vu = etat.total;   // des lignes ont été effacées de la feuille : on recompte à partir d'ici
    if (y && etat.total - vu >= y) {
      envoyer((etat.total - vu) + ' nouvelle(s) proposition(s) reçue(s)', etat);
      vu = etat.total;
    }
    props.setProperty('ALERTE_NB_VU', String(vu));
  } finally {
    verrou.releaseLock();
  }
}

function verifierDelai(etat) {
  var x = reglage('ALERTE_JOURS');
  if (!x || !etat.plusAncienne) return;
  var ecart = Date.now() - etat.plusAncienne.getTime();
  if (ecart > x * 864e5) envoyer('des propositions attendent depuis ' + Math.floor(ecart / 864e5) + ' jours', etat);
}

function envoyer(sujet, etat) {
  var a = String(PropertiesService.getScriptProperties().getProperty('ALERTE_MAIL') || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a)) a = Session.getEffectiveUser().getEmail();
  if (!a) return;
  var depuis = etat.plusAncienne ? ', la plus ancienne du ' + Utilities.formatDate(etat.plusAncienne, Session.getScriptTimeZone(), 'dd/MM/yyyy') : '';
  MailApp.sendEmail(a, "Oiseaux d'Ouessant : " + sujet,
    etat.nb + ' réponse(s) du formulaire non traitée(s)' + depuis + '.\n\n' +
    'Pour les trier : ' + PAGE_TRI + '\n\n' +
    '(Mail envoyé par le script de la feuille des réponses. Réglages : propriétés ALERTE_NB, ALERTE_JOURS et ALERTE_MAIL ; ' +
    'pour arrêter : exécuter couperAlertes dans Apps Script.)');
}
