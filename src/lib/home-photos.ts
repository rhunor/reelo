// Home-page photography, served from /public/home. All from Wikimedia Commons under
// CC BY-SA 4.0 — the licence requires crediting each photographer, which the home page
// does in its "Photo credits" line. Keep that line in sync if you swap any of these.
export interface HomePhoto {
  src: string;
  alt: string;
  caption: string;
  detail: string;
  position?: string;
  credit: { author: string; source: string; license: string };
}

const CC = "CC BY-SA 4.0";

export const PEOPLE_PHOTOS: HomePhoto[] = [
  {
    src: "/home/market-woman.jpg",
    alt: "A smiling market woman at her stall in Kakuri market, Kaduna",
    caption: "For the market trader",
    detail: "Find a shop-front flat or a room close to the market — with every cost spelled out before you pay.",
    position: "50% 35%",
    credit: { author: "Kambai Akau", source: "https://commons.wikimedia.org/wiki/File:A_smiling_market_woman_at_the_Monday_Market_in_Kakuri,_Kaduna_01.jpg", license: CC },
  },
  {
    src: "/home/professionals.jpg",
    alt: "Young Nigerian professionals in a meeting around a table",
    caption: "For the young professional",
    detail: "Move closer to work without paying an agent a year's commission for the privilege.",
    position: "50% 40%",
    credit: { author: "Inyor4mr", source: "https://commons.wikimedia.org/wiki/File:Wiki_SDGs_Campus_Tour_2.0,_Northern_Nigeria_A.B.U,_Zaira_4.jpg", license: CC },
  },
  {
    src: "/home/mechanic.jpg",
    alt: "Mechanics repairing cars at a roadside workshop in Epe, Lagos",
    caption: "For the mechanic",
    detail: "A verified home for your family, booked and paid for safely — no running around with cash.",
    position: "50% 60%",
    credit: { author: "Sodiq Jimoh", source: "https://commons.wikimedia.org/wiki/File:Local_mechanic_workshop_in_Epe_Nigeria.jpg", license: CC },
  },
  {
    src: "/home/students.jpg",
    alt: "Smiling university students together on campus",
    caption: "For the student",
    detail: "Lodges and shared apartments near campus, inspected in person so what you see is what you get.",
    position: "50% 25%",
    credit: { author: "ObetaBuzor", source: "https://commons.wikimedia.org/wiki/File:Student_of_the_University_of_Nigeria,_Enugu_Campus_after_Sunday_Mass.jpg", license: CC },
  },
  {
    src: "/home/tailor.jpg",
    alt: "A tailor cutting fabric at his sewing machine with ankara prints behind him",
    caption: "For the artisan",
    detail: "Whether you need a home, a shop, or both — Reallow handles the paperwork and payments.",
    position: "50% 45%",
    credit: { author: "Okunola Femi", source: "https://commons.wikimedia.org/wiki/File:A_Nigerian_tailor_at_work.jpg", license: CC },
  },
  {
    src: "/home/market-stall.jpg",
    alt: "A woman arranging peppers at her market stall",
    caption: "For the landlord next door",
    detail: "Have a room, flat, or house to let? List it free and let Reallow find you a verified tenant.",
    position: "40% 50%",
    credit: { author: "TopmanJnr1", source: "https://commons.wikimedia.org/wiki/File:Market_woman_arranging_peppers_at_stall.jpg", license: CC },
  },
];
