import { myPortalSite } from "../../myportal.js";

// Trentino: the offers of the Province of Trento's job centres on its job portal, the same
// platform as Emilia-Romagna's. The portal links no terms and has no robots.txt; the province
// publishes its sites' content under CC BY 3.0.
export const trento = myPortalSite({
  id: "trento",
  base: "https://www.sil.provincia.tn.it",
  licence: {
    name: "Agenzia del Lavoro, Provincia autonoma di Trento",
    short: "Trentino Lavoro",
    url: "https://www.sil.provincia.tn.it/offerte-lavoro/",
    licence:
      "No terms on the portal; the province publishes its content under CC BY 3.0; each offer links to the portal",
    credit: "Agenzia del Lavoro, Provincia autonoma di Trento",
  },
});
