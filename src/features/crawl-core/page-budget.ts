// The pages a run may read across its sources (job portals FR-5): one counter the run's sources draw from, so a run of
// many portals stays bounded however many are due (the legacy's 30,000 portal pages a run).
export interface PageBudget {
  // Takes one page; false once none is left.
  take(): boolean;
  readonly left: number;
}

export function pageBudget(pages: number): PageBudget {
  let left = pages;
  return {
    take() {
      if (left <= 0) return false;
      left--;
      return true;
    },
    get left() {
      return left;
    },
  };
}

export const UNLIMITED: PageBudget = {
  take: () => true,
  left: Number.POSITIVE_INFINITY,
};
