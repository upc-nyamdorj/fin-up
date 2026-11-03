// Content from "Landing page.docx". Store URLs and the YouTube guide link are not in the doc yet.

export const stores = [
  {
    label: "App Store-с татах",
    href: "#",
    icon: "M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9s-2-.9-3.4-.9C5.9 6.8 4.2 7.8 3.3 9.4c-1.9 3.3-.5 8.1 1.3 10.8.9 1.3 2 2.7 3.3 2.7 1.3-.1 1.8-.9 3.4-.9s2 .9 3.4.8c1.4 0 2.3-1.3 3.2-2.6 1-1.5 1.4-2.9 1.4-3-.1 0-2.8-1.1-2.9-4.6zM13.9 4.9c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.2 1.1.1 2.3-.6 3-1.5z",
  },
  {
    label: "Play Store-с татах",
    href: "#",
    icon: "M3.6 1.8c-.3.3-.4.7-.4 1.2v18c0 .5.1.9.4 1.2l10-10.2zM17 15.6 14.3 12.9 3.9 23.3c.4.2 1 .1 1.5-.2zM17 8.4 5.4.9C4.9.6 4.3.5 3.9.7l10.4 10.4zm4 2.2-3-1.8-2.9 2.9 2.9 2.9 3-1.8c.9-.5.9-1.7 0-2.2z",
  },
];

export const products = [
  {
    key: "short",
    name: "Богино хугацаат зээл",
    min: 100_000,
    max: 5_000_000,
    step: 100_000,
    terms: [1, 2, 3],
    rate: 4.4,
    fee: 1,
  },
  {
    key: "long",
    name: "Урт хугацаат зээл",
    min: 500_000,
    max: 20_000_000,
    step: 500_000,
    terms: [6, 9, 12],
    rate: 3.5,
    fee: 1,
  },
] as const;

export const youtubeGuide = "#";

export const contact = {
  facebook: "https://www.facebook.com/FinUpapp/",
  messenger: "https://m.me/FinUpapp",
  instagram: "https://www.instagram.com/finup.mn/",
  email: "info@finup.mn",
  phone: "7772-5511",
  address: "Улаанбаатар хот, Хан-Уул дүүрэг, 18-р хороо, Их Монгол Улс гудамж, Моннис Бьюлдинг, 3 давхарт",
};

export const fmt = (n: number) => n.toLocaleString("en-US") + "₮";
