// Legacy builder/mt/jobdash-fr.ts (JustJans/indudex@b0cd182), word for word but for types, lint and paths.
// The French case of jobdash.mjs: "Ingénieur Systèmes", "Architecte Segment Sol", "Technicien Maintenance".
// French puts adjectives after the job too ("Ingénieur commercial", "Technicien polyvalent"), so the dash
// goes in only before a word written with a capital that is not one of the usual adjectives.
const JOB =
  /^(?:ingénieur|technicien|architecte|chef|responsable|conducteur|dessinateur|projeteur|monteur|mécanicien|électricien|électromécanicien|automaticien|soudeur|opérateur|agent|chargé|consultant|développeur|analyste|gestionnaire|directeur|coordinateur|contrôleur|superviseur|inspecteur|expert|spécialiste|administrateur|programmeur|frigoriste|chauffagiste|plombier|tuyauteur|chaudronnier|usineur|tourneur|fraiseur|régleur|préparateur|acheteur|métreur|géomètre)$/i;
const ADJECTIVE = new Set(
  "commercial commerciale principal principale senior junior confirmé confirmée expérimenté expérimentée polyvalent polyvalente supérieur supérieure qualifié qualifiée spécialisé spécialisée industriel industrielle électrique electrique électronique electronique mécanique mecanique civil civile chimique informatique logiciel technique financier juridique administratif logistique nucléaire aéronautique ferroviaire naval navale maritime hydraulique thermique itinérant itinérante sédentaire automobile auto transverse full-stack fullstack front-end frontend back-end backend".split(
    " ",
  ),
);
// And the usual endings of French adjectives ("Fonctionnel", "Transversal", "Expérimenté"), but not the
// nouns in -ité ("Qualité", "Sécurité"), which name a field.
const ADJECTIVE_ENDING =
  /(?:el|elle|al|ale|ique|if|ive|aire|eux|euse|ant|ante|ée|(?<!it)é)s?$/i;
export function jobDashFr(title: string): string {
  const m = title.match(/^(\S+)\s+(\S+)/u);
  if (!m || !JOB.test(m[1])) return title;
  const next = m[2];
  if (
    /^(?:d['’]|de$|du$|des$|en$|et$|à$|au$|aux$|pour$|sur$|la$|le$|les$)/iu.test(
      next,
    )
  )
    return title;
  if (
    !/^\p{Lu}/u.test(next) ||
    ADJECTIVE.has(next.toLowerCase()) ||
    ADJECTIVE_ENDING.test(next) ||
    next === next.toUpperCase()
  )
    return title;
  return m[1] + " – " + title.slice(m[1].length).trimStart();
}
