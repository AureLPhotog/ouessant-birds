/* Oiseaux d'Ouessant — envoie les réponses du formulaire à la page « Tri des propositions » (admin.html).
   À coller dans la feuille Google des réponses : Extensions → Apps Script (voir README, « Récupération automatique »).
   Le script ne répond qu'avec le code secret, rangé dans les propriétés du script (CODE) : jamais dans le code ni dans le dépôt. */

function doGet(e) {
  var attendu = PropertiesService.getScriptProperties().getProperty('CODE');
  var recu = e && e.parameter ? e.parameter.code : '';
  if (!attendu || attendu.length < 16 || !recu || recu !== attendu) return reponse({ ok: false, erreur: 'code' });
  // première feuille du classeur = les réponses du formulaire (ou celle nommée dans la propriété FEUILLE, si besoin)
  var nom = PropertiesService.getScriptProperties().getProperty('FEUILLE');
  var classeur = SpreadsheetApp.getActiveSpreadsheet();
  var feuille = (nom && classeur.getSheetByName(nom)) || classeur.getSheets()[0];
  return reponse({ ok: true, lignes: feuille.getDataRange().getDisplayValues() });
}

function reponse(objet) {
  return ContentService.createTextOutput(JSON.stringify(objet)).setMimeType(ContentService.MimeType.JSON);
}
