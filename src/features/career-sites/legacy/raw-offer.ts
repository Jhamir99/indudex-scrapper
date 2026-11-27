// The legacy's RawOffer (builder/normalise.ts) and the PayFields it carries (builder/pay.ts), JustJans/indudex@ec79858:
// the shape its readers give an advert in, before career-sites' family turns it into crawl-core's draft (career sites
// T002).

export type PayFields = {
  min?: unknown;
  max?: unknown;
  currency?: unknown;
  period?: unknown;
  // ➤ The figures were written with cents, though given as numbers («22,00» read as 22).
  cents?: boolean;
  hoursPerWeek?: number;
  partTime?: boolean;
  country?: string;
};

export type RawOffer = {
  title?: string;
  url: string;
  source: string;
  sourceId?: string | number;
  company?: string;
  location?: string;
  city?: string;
  description?: string;
  posted?: string;
  expires?: string;
  first?: string;
  seen?: string;
  country?: string;
  lang?: string;
  contract?: unknown;
  hours?: unknown;
  employmentType?: unknown;
  mode?: string;
  modeTag?: string;
  years?: unknown;
  remote?: boolean;
  pay?: PayFields | null;
  codes?: { isco?: string | number; ssyk?: string };
  languages?: unknown;
  // ➤ A reader's marks of the offer's own page: read (detailed), or read with which of its fields (detail).
  detailed?: number;
  detail?: number;
};

// The legacy's builder/text-pay.ts TextPay: a pay read from a text.
export type TextPay = {
  min: number;
  max: number;
  currency: string;
  period: string;
  cents?: boolean;
};
