import { titleCase } from "../../shared/kit/text.js";

// A Spanish town as the portals write it, in capitals, sometimes with its article after a comma
// ("LINEA DE LA CONCEPCION, LA"): "La Linea de la Concepcion"; "SAN LORENZO DE EL ESCORIAL" is
// "San Lorenzo de El Escorial" ("El" after "de" is part of the name).
export function townName(text: string): string {
  const trailing = /^(.*),\s*(LA|EL|LOS|LAS)$/i.exec(text.trim());
  return titleCase(trailing ? `${trailing[2]} ${trailing[1]}` : text.trim())
    .replace(/(?<= )(De|Del|La|Las|Los|El|Y)(?= )/g, (word) =>
      word.toLowerCase(),
    )
    .replace(/\bde el /g, "de El ");
}
