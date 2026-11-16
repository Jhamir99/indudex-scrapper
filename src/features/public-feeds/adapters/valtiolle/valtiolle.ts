import { platformSite } from "../../kuntarekry-platform.js";

// Finland's State: the vacancies of its agencies, courts and police, on the same platform as
// Kuntarekry.
export const valtiolle = platformSite({
  id: "valtiolle",
  base: "https://valtiolle.fi",
  licence: {
    name: "Valtiolle.fi, avoimet työpaikat",
    short: "Valtiolle.fi",
    url: "https://valtiolle.fi/fi/tyopaikat/",
    licence:
      "Read as its own list shows them; each vacancy links to Valtiolle.fi",
    credit: "Lähde: Valtiolle.fi",
  },
});
