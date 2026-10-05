// Users never contact each other directly on Reallow — only Reallow contacts users. Any
// free text one user writes that another user can read (listing descriptions, "about me",
// reviews…) is checked for phone numbers, emails, links and social handles: rejected on
// save, and redacted on display for anything saved before this check existed.

const SEP = "[\\s\\-.()]*";
// Nigerian mobile numbers: 0XXXXXXXXXX or +234XXXXXXXXXX (070/080/081/090/091…), with any
// spacing or punctuation between digits.
const PHONE = new RegExp(`(?:\\+?${SEP}2${SEP}3${SEP}4${SEP}(?:\\(0\\))?|0)${SEP}[789]${SEP}[01](?:${SEP}\\d){8}`, "g");
const EMAIL = /[\w.+-]+\s*(?:@|\(at\)|\[at\])\s*[\w-]+\s*(?:\.|\(dot\)|\[dot\])\s*[a-z]{2,}/gi;
const LINK = /\b(?:https?:\/\/|www\.)\S+|\b(?:wa\.me|t\.me|bit\.ly|instagram\.com|facebook\.com|fb\.com|tiktok\.com|x\.com|twitter\.com)\/?\S*/gi;
const HANDLE = /(?:^|\s)@[a-z0-9_.]{3,}/gi;
const CONTACT_WORDS = /\b(?:whats\s?app|telegram|signal\s+me|call\s+me|text\s+me|dm\s+me|my\s+(?:number|line|phone|email))\b/gi;

const PATTERNS = [PHONE, EMAIL, LINK, HANDLE, CONTACT_WORDS];

export const CONTACT_INFO_ERROR =
  "For everyone's safety, don't include phone numbers, emails, links, or social handles — Reallow handles all contact between users.";

export function containsContactInfo(text: string | undefined | null): boolean {
  if (!text) return false;
  return PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
}

export function redactContactInfo<T extends string | undefined | null>(text: T): T {
  if (!text) return text;
  let result: string = text;
  for (const pattern of PATTERNS) result = result.replace(pattern, (match) => (match.startsWith(" ") ? " " : "") + "[removed]");
  return result as T;
}

// For zod `.refine` on any user-to-user visible text field.
export const noContactInfo = (value: string | undefined) => !containsContactInfo(value);
