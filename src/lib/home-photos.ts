// "Reallow is for everyone" photography, served from /public/home. The Wikimedia Commons
// photos are CC BY-SA 4.0, which requires crediting each photographer — the home page does
// in its "Photo credits" line (only CC photos are listed there). The Unsplash photos are
// under the Unsplash License, which needs no credit; their source is kept here anyway.
export interface HomePhoto {
  id: string;
  src: string;
  alt: string;
  position?: string;
  credit: { author: string; source: string; license: string };
}

const CC = "CC BY-SA 4.0";
export const UNSPLASH = "Unsplash License";

export const PEOPLE_PHOTOS: HomePhoto[] = [
  {
    src: "/home/family.jpg",
    alt: "A smiling Nigerian family — mother, father and two young children — at home",
    id: "family",
    position: "50% 35%",
    credit: { author: "Trust Katsande", source: "https://unsplash.com/photos/a-man-woman-and-child-are-posing-for-a-picture", license: UNSPLASH },
  },
  {
    src: "/home/library.jpg",
    alt: "A student reading a book between library shelves",
    id: "library",
    position: "50% 30%",
    credit: { author: "Shalom Ejiofor", source: "https://unsplash.com/photos/a-woman-reading-a-book-in-a-library", license: UNSPLASH },
  },
  {
    src: "/home/office.jpg",
    alt: "A professional woman working at a tablet in a modern office",
    id: "office",
    position: "50% 30%",
    credit: { author: "Francis Odeyemi", source: "https://unsplash.com/photos/a-woman-sitting-at-a-table-with-a-laptop-Xq-RY9z8VY4", license: UNSPLASH },
  },
  {
    src: "/home/land.jpg",
    alt: "A woman standing on an open plot of land",
    id: "land",
    position: "70% 45%",
    credit: { author: "Tomiwa Ogunmodede", source: "https://unsplash.com/photos/woman-in-white-and-teal-polo-shirt-standing-near-open-field-jcKbKG8P_6U", license: UNSPLASH },
  },
  {
    src: "/home/construction.jpg",
    alt: "Two builders in work uniforms on a construction site",
    id: "construction",
    position: "50% 30%",
    credit: { author: "Divaris Shirichena", source: "https://unsplash.com/photos/men-in-blue-work-uniforms-ndR5lv2aK10", license: UNSPLASH },
  },
  {
    src: "/home/church.jpg",
    alt: "Clergy in robes during a church service",
    id: "church",
    position: "50% 40%",
    credit: { author: "Emmanuel Ikwuegbu", source: "https://unsplash.com/photos/c0dY7uTsBJE", license: UNSPLASH },
  },
  {
    src: "/home/lounge.jpg",
    alt: "Two friends laughing together at a café table",
    id: "lounge",
    position: "50% 40%",
    credit: { author: "Praise Judah", source: "https://unsplash.com/photos/two-women-smiling-and-talking-at-a-table-LXJ5RfH73ls", license: UNSPLASH },
  },
  {
    src: "/home/market-woman.jpg",
    alt: "A smiling market woman at her stall in Kakuri market, Kaduna",
    id: "trader",
    position: "50% 35%",
    credit: { author: "Kambai Akau", source: "https://commons.wikimedia.org/wiki/File:A_smiling_market_woman_at_the_Monday_Market_in_Kakuri,_Kaduna_01.jpg", license: CC },
  },
  {
    src: "/home/professionals.jpg",
    alt: "Young Nigerian professionals in a meeting around a table",
    id: "professional",
    position: "50% 40%",
    credit: { author: "Inyor4mr", source: "https://commons.wikimedia.org/wiki/File:Wiki_SDGs_Campus_Tour_2.0,_Northern_Nigeria_A.B.U,_Zaira_4.jpg", license: CC },
  },
  {
    src: "/home/mechanic.jpg",
    alt: "Mechanics repairing cars at a roadside workshop in Epe, Lagos",
    id: "mechanic",
    position: "50% 60%",
    credit: { author: "Sodiq Jimoh", source: "https://commons.wikimedia.org/wiki/File:Local_mechanic_workshop_in_Epe_Nigeria.jpg", license: CC },
  },
  {
    src: "/home/students.jpg",
    alt: "Smiling university students together on campus",
    id: "student",
    position: "50% 25%",
    credit: { author: "ObetaBuzor", source: "https://commons.wikimedia.org/wiki/File:Student_of_the_University_of_Nigeria,_Enugu_Campus_after_Sunday_Mass.jpg", license: CC },
  },
  {
    src: "/home/tailor.jpg",
    alt: "A tailor cutting fabric at his sewing machine with ankara prints behind him",
    id: "artisan",
    position: "50% 45%",
    credit: { author: "Okunola Femi", source: "https://commons.wikimedia.org/wiki/File:A_Nigerian_tailor_at_work.jpg", license: CC },
  },
  {
    src: "/home/market-stall.jpg",
    alt: "A woman arranging peppers at her market stall",
    id: "landlord",
    position: "40% 50%",
    credit: { author: "TopmanJnr1", source: "https://commons.wikimedia.org/wiki/File:Market_woman_arranging_peppers_at_stall.jpg", license: CC },
  },
];
