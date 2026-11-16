import { platformSite } from "../../kuntarekry-platform.js";

// Finland's municipalities and wellbeing services counties.
export const kuntarekry = platformSite({
  id: "kuntarekry",
  base: "https://kuntarekry.fi",
  licence: {
    name: "Kuntarekry, avoimet työpaikat",
    short: "Kuntarekry",
    url: "https://kuntarekry.fi/fi/tyopaikat/",
    licence:
      "Read as its own list shows them; each vacancy links to Kuntarekry",
    credit: "Lähde: Kuntarekry",
  },
});
