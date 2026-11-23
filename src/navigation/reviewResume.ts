/** Brings back a review that stepped aside for a Look Up page, once that page is left */
let resume: (() => void) | null = null;

export function setReviewResume(fn: (() => void) | null) {
  resume = fn;
}

export function resumeReview() {
  const fn = resume;
  resume = null;
  fn?.();
}
