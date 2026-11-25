import { factsOfPage } from "../features/advert-facts/index.js";
import type { PageFacts } from "../features/crawl-core/page-facts.js";
import { payOfText } from "../features/pay/index.js";
import { deadlineInText } from "../features/publication/index.js";
import { statedPay } from "../shared/kit/stated-pay.js";

// The crawl's reader of a vacancy page's labelled facts (job portals FR-3; the legacy's `withLabels`): advert-facts'
// labelled and lone fields, pay's reading of a labelled pay, the publication's of a last day. Composed here, where an
// entry point may import any feature, and handed to the sources through crawl-core.
export function readPageFacts(html: string): PageFacts {
  const { fields, ...facts } = factsOfPage(html);
  const textPay = payOfText("", fields);
  const pay = textPay
    ? statedPay({
        min: textPay.min,
        max: textPay.max,
        currency: textPay.currency,
        period: textPay.period,
      })
    : undefined;
  const expires = deadlineInText(fields);
  return {
    ...facts,
    ...(pay ? { pay } : {}),
    ...(expires ? { expires } : {}),
  };
}
