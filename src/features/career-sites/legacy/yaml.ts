// js-yaml's `load`, as the legacy's readers call it, on the `yaml` package this repo reads YAML with.
import { parse } from "yaml";

export const load = (text: string): unknown => parse(text);
export default { load };
