// English is the default and the fallback: any key missing from another language shows in
// English. Translations below are first drafts and should be reviewed by native speakers
// before launch — Urhobo in particular is still waiting on a translator, so it currently
// falls back to English for everything.

export const LOCALES = [
  { code: "en", label: "English", htmlLang: "en" },
  { code: "yo", label: "Yorùbá", htmlLang: "yo" },
  { code: "ha", label: "Hausa", htmlLang: "ha" },
  { code: "ig", label: "Igbo", htmlLang: "ig" },
  { code: "pcm", label: "Naijá (Pidgin)", htmlLang: "pcm" },
  { code: "urh", label: "Urhobo", htmlLang: "urh" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "reallow-lang";

export function isLocale(value: unknown): value is Locale {
  return LOCALES.some((l) => l.code === value);
}

const en = {
  "nav.home": "Home",
  "nav.listings": "Listings",
  "nav.contact": "Contact",
  "dash.saved": "Saved for later",
  "nav.about": "About",
  "nav.help": "Help",
  "nav.dashboard": "Dashboard",
  "nav.login": "Log in",
  "nav.listProperty": "List your property",
  "menu.settings": "Settings",
  "menu.logout": "Log out",
  "notif.title": "Notifications",
  "notif.seeAll": "See all",
  "notif.empty": "You're all caught up.",
  "dash.welcome": "Welcome back",
  "dash.referralCode": "Referral code",
  "dash.copyLink": "Copy invite link",
  "dash.meetings": "Meetings",
  "dash.transactions": "Transaction history",
  "dash.wallet": "Wallet",
  "dash.verify": "Verify your identity",
  "dash.verifyHint": "Needed to apply for properties, book inspections, and get your listings published.",
  "dash.completeProfile": "Complete your profile",
  "dash.completeProfileHint": "Add your photo and details.",
  "dash.yourProperties": "Your properties",
  "dash.browse": "Browse properties",
  "dash.applications": "Applications",
  "dash.agreements": "Agreements",
  "dash.messages": "Messages to Reallow",
  "settings.title": "Settings",
  "settings.profile": "Profile",
  "settings.contact": "Contact",
  "settings.security": "Security",
  "settings.language": "Language",
  "settings.languageHint": "Choose the language Reallow shows in. English is the default.",
} as const;

export type MessageKey = keyof typeof en;
type Dictionary = Partial<Record<MessageKey, string>>;

const yo: Dictionary = {
  "nav.home": "Ilé",
  "nav.contact": "Kàn sí wa",
  "dash.saved": "Tí a fi pamọ́",
  "nav.help": "Ìrànlọ́wọ́",
  "nav.listings": "Àwọn ilé",
  "nav.about": "Nípa wa",
  "nav.dashboard": "Ojú-ìwé mi",
  "nav.login": "Wọlé",
  "nav.listProperty": "Fi ilé rẹ sílẹ̀",
  "menu.settings": "Ètò",
  "menu.logout": "Jáde",
  "notif.title": "Ìfitónilétí",
  "notif.seeAll": "Wo gbogbo rẹ̀",
  "notif.empty": "Kò sí ohun tuntun.",
  "dash.welcome": "Ẹ káàbọ̀ padà",
  "dash.referralCode": "Kóòdù ìtọ́kasí",
  "dash.copyLink": "Da ọ̀nà ìpè kọ",
  "dash.meetings": "Ìpàdé",
  "dash.transactions": "Ìtàn ìsanwó",
  "dash.wallet": "Àpò owó",
  "dash.verify": "Jẹ́rìí ìdánimọ̀ rẹ",
  "dash.verifyHint": "Ó pọndandan láti béèrè fún ilé, láti ṣètò àyẹ̀wò, àti láti gbé ilé rẹ jáde.",
  "dash.completeProfile": "Parí àkọsílẹ̀ rẹ",
  "dash.completeProfileHint": "Fi àwòrán àti àlàyé rẹ kún un.",
  "dash.yourProperties": "Àwọn ilé rẹ",
  "dash.browse": "Wo àwọn ilé",
  "dash.applications": "Àwọn ìbéèrè",
  "dash.agreements": "Àwọn àdéhùn",
  "dash.messages": "Ìfiránṣẹ́ sí Reallow",
  "settings.title": "Ètò",
  "settings.profile": "Àkọsílẹ̀",
  "settings.contact": "Ìkànsí",
  "settings.security": "Ààbò",
  "settings.language": "Èdè",
  "settings.languageHint": "Yan èdè tí Reallow yóò máa lò. Gẹ̀ẹ́sì ni àkọ́kọ́.",
};

const ha: Dictionary = {
  "nav.home": "Gida",
  "nav.contact": "Tuntuɓe mu",
  "dash.saved": "Abubuwan da aka ajiye",
  "nav.help": "Taimako",
  "nav.listings": "Gidaje",
  "nav.about": "Game da mu",
  "nav.dashboard": "Shafina",
  "nav.login": "Shiga",
  "nav.listProperty": "Saka gidanka",
  "menu.settings": "Saituna",
  "menu.logout": "Fita",
  "notif.title": "Sanarwa",
  "notif.seeAll": "Duba duka",
  "notif.empty": "Babu sabon abu.",
  "dash.welcome": "Barka da dawowa",
  "dash.referralCode": "Lambar gayyata",
  "dash.copyLink": "Kwafi hanyar gayyata",
  "dash.meetings": "Taruka",
  "dash.transactions": "Tarihin kuɗi",
  "dash.wallet": "Walat",
  "dash.verify": "Tabbatar da kai",
  "dash.verifyHint": "Ana buƙata don neman gida, shirya dubawa, da wallafa gidajenka.",
  "dash.completeProfile": "Kammala bayananka",
  "dash.completeProfileHint": "Ƙara hotonka da bayananka.",
  "dash.yourProperties": "Gidajenka",
  "dash.browse": "Duba gidaje",
  "dash.applications": "Buƙatu",
  "dash.agreements": "Yarjejeniyoyi",
  "dash.messages": "Saƙonni zuwa Reallow",
  "settings.title": "Saituna",
  "settings.profile": "Bayanai",
  "settings.contact": "Tuntuɓa",
  "settings.security": "Tsaro",
  "settings.language": "Harshe",
  "settings.languageHint": "Zaɓi harshen da Reallow zai nuna. Turanci ne na asali.",
};

const ig: Dictionary = {
  "nav.home": "Ụlọ mbụ",
  "nav.contact": "Kpọtụrụ anyị",
  "dash.saved": "Echekwara maka emesịa",
  "nav.help": "Enyemaka",
  "nav.listings": "Ụlọ",
  "nav.about": "Maka anyị",
  "nav.dashboard": "Peeji m",
  "nav.login": "Banye",
  "nav.listProperty": "Tinye ụlọ gị",
  "menu.settings": "Ntọala",
  "menu.logout": "Pụọ",
  "notif.title": "Ọkwa",
  "notif.seeAll": "Hụ ha niile",
  "notif.empty": "Ọ dịghị ihe ọhụrụ.",
  "dash.welcome": "Nnọọ ọzọ",
  "dash.referralCode": "Koodu ntụaka",
  "dash.copyLink": "Detuo njikọ òkù",
  "dash.meetings": "Nzukọ",
  "dash.transactions": "Akụkọ ego",
  "dash.wallet": "Akpa ego",
  "dash.verify": "Kwado onye ị bụ",
  "dash.verifyHint": "Ọ dị mkpa iji rịọ maka ụlọ, hazie nlele, ma bipụta ụlọ gị.",
  "dash.completeProfile": "Mezue profaịlụ gị",
  "dash.completeProfileHint": "Tinye foto gị na nkọwa gị.",
  "dash.yourProperties": "Ụlọ gị",
  "dash.browse": "Lelee ụlọ",
  "dash.applications": "Arịrịọ",
  "dash.agreements": "Nkwekọrịta",
  "dash.messages": "Ozi gaa Reallow",
  "settings.title": "Ntọala",
  "settings.profile": "Profaịlụ",
  "settings.contact": "Kpọtụrụ",
  "settings.security": "Nchekwa",
  "settings.language": "Asụsụ",
  "settings.languageHint": "Họrọ asụsụ Reallow ga-eji. Bekee bụ nke mbụ.",
};

const pcm: Dictionary = {
  "nav.home": "Home",
  "nav.contact": "Contact us",
  "dash.saved": "Wetin you save",
  "nav.help": "Help",
  "nav.listings": "Houses",
  "nav.about": "About us",
  "nav.dashboard": "My dashboard",
  "nav.login": "Log in",
  "nav.listProperty": "Put your house for market",
  "menu.settings": "Settings",
  "menu.logout": "Comot",
  "notif.title": "Notifications",
  "notif.seeAll": "See everything",
  "notif.empty": "Nothing new for now.",
  "dash.welcome": "Welcome back o",
  "dash.referralCode": "Referral code",
  "dash.copyLink": "Copy invite link",
  "dash.meetings": "Meetings",
  "dash.transactions": "Money history",
  "dash.wallet": "Wallet",
  "dash.verify": "Confirm say na you",
  "dash.verifyHint": "You need am to apply for house, book inspection, and make your house show for market.",
  "dash.completeProfile": "Finish your profile",
  "dash.completeProfileHint": "Put your picture and your details.",
  "dash.yourProperties": "Your houses",
  "dash.browse": "Check houses",
  "dash.applications": "Applications",
  "dash.agreements": "Agreements",
  "dash.messages": "Message Reallow",
  "settings.title": "Settings",
  "settings.language": "Language",
  "settings.languageHint": "Choose the language wey Reallow go dey show. English na the default.",
};

// Awaiting a translator — falls back to English.
const urh: Dictionary = {};

const DICTIONARIES: Record<Locale, Dictionary> = { en, yo, ha, ig, pcm, urh };

export type Translator = (key: MessageKey) => string;

export function translator(locale: Locale): Translator {
  const dictionary = DICTIONARIES[locale];
  return (key) => dictionary[key] ?? en[key];
}

// Only the strings a client component needs, resolved for one locale.
export function clientMessages(locale: Locale): Record<MessageKey, string> {
  const t = translator(locale);
  return Object.fromEntries((Object.keys(en) as MessageKey[]).map((key) => [key, t(key)])) as Record<
    MessageKey,
    string
  >;
}
