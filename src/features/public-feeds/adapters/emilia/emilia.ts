import { myPortalSite } from "../../myportal.js";

// Emilia-Romagna: the offers of the region's job centres and of the firms that publish on "Lavoro
// per Te". The regional labour agency's legal notice gives its content under CC BY 4.0, "per
// qualsiasi fine, anche commerciale" (read by the legacy on 10 October 2026); robots.txt closes
// only a sign-up page.
export const emilia = myPortalSite({
  id: "emilia",
  base: "https://lavoroperte.regione.emilia-romagna.it",
  licence: {
    name: "Agenzia regionale per il lavoro Emilia-Romagna, Lavoro per Te",
    short: "Lavoro per Te",
    url: "https://lavoroperte.regione.emilia-romagna.it/offerte-lavoro/",
    licence:
      "CC BY 4.0 (the agency's legal notice); each offer links to Lavoro per Te",
    credit: "Agenzia regionale per il lavoro Emilia-Romagna, CC BY 4.0",
  },
});
