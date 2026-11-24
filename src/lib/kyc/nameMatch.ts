// Fuzzy name comparison for Indian names across Aadhaar / PAN / application form.
// Handles case, spacing, titles, initials ("A KUMAR" vs "ASHISH KUMAR") and
// common short forms ("KR" = KUMAR, "MD" = MOHAMMAD).

const TITLES = new Set(["MR", "MRS", "MS", "MISS", "DR", "SHRI", "SRI", "SMT", "KUMARI", "KM", "LATE", "M/S"]);
const ABBREVIATIONS: Record<string, string> = {
  KR: "KUMAR",
  KUM: "KUMAR",
  MD: "MOHAMMAD",
  MOHD: "MOHAMMAD",
  MOHAMMED: "MOHAMMAD",
  MUHAMMAD: "MOHAMMAD",
  PD: "PRASAD",
  PRASHAD: "PRASAD",
  CH: "CHAND",
  BHAI: "BHAI",
};

export function normalizeName(name: string | undefined | null): string[] {
  if (!name) return [];
  return name
    .toUpperCase()
    .replace(/[^A-Z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter(t => !TITLES.has(t))
    .map(t => ABBREVIATIONS[t] || t);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

function similarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  return max === 0 ? 1 : 1 - levenshtein(a, b) / max;
}

function tokenScore(a: string, b: string): number {
  if (a === b) return 1;
  // Initial matches full word ("A" vs "ASHISH")
  if ((a.length === 1 && b.startsWith(a)) || (b.length === 1 && a.startsWith(b))) return 0.9;
  const s = similarity(a, b);
  return s >= 0.75 ? s : 0;
}

/**
 * Returns 0-100. Every word of the SHORTER name must find a matching word in the
 * longer name (order-independent), so "ASHISH KUMAR" vs "ASHISH KUMAR SHARMA" scores high,
 * while "ASHISH KUMAR" vs "RAHUL KUMAR" scores low.
 */
export function nameMatchScore(nameA?: string | null, nameB?: string | null): number {
  const a = normalizeName(nameA);
  const b = normalizeName(nameB);
  if (!a.length || !b.length) return 0;

  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  const used = new Set<number>();
  let total = 0;
  for (const token of shorter) {
    let best = 0;
    let bestIdx = -1;
    longer.forEach((candidate, idx) => {
      if (used.has(idx)) return;
      const score = tokenScore(token, candidate);
      if (score > best) { best = score; bestIdx = idx; }
    });
    if (bestIdx >= 0) used.add(bestIdx);
    total += best;
  }
  const tokenAvg = total / shorter.length;

  // Small penalty when the longer name has extra words (middle name / surname missing).
  const coverage = shorter.length / longer.length;
  const tokenBased = tokenAvg * (0.85 + 0.15 * coverage);

  const wholeString = similarity(a.join(" "), b.join(" "));
  return Math.round(Math.max(tokenBased, wholeString) * 100);
}

/** Normalises DD-MM-YYYY / DD/MM/YYYY / YYYY-MM-DD to YYYY-MM-DD. */
export function normalizeDob(dob?: string | null): string {
  if (!dob) return "";
  const s = String(dob).trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return "";
}
