// Illustration packs bundled with IconVault. Every pack is free for
// commercial use; each pack folder carries its own LICENSE.txt.
// - flowbite:      Flowbite Illustrations (MIT) - light + dark variants
// - illlustrations: by Vijay Verma (MIT) - general scenes, original colors
// - gophers:       Free Gophers Pack by Maria Letta (CC0) - Go mascots
// - kawaii:        React Kawaii (MIT) - cute characters, original colors
// - doodles:       Open Doodles (MIT) - sketchy line doodles

export type IllustrationPackId = "flowbite" | "illlustrations" | "gophers" | "kawaii" | "doodles";

export interface IllustrationEntry {
  pack: IllustrationPackId;
  slug: string;
  title: string;
  /** Dark variant exists (Flowbite only). */
  dark?: boolean;
  /** Source file name when it differs from `<slug>.svg` (illlustrations). */
  file?: string;
}

interface RampStop {
  hex: string;
  /** Mix the target colour toward white by this amount (0-1). */
  white?: number;
  /** Mix the target colour toward black by this amount (0-1). */
  black?: number;
}

export interface IllustrationPack {
  id: IllustrationPackId;
  label: string;
  byline: string;
  license: string;
  url: string;
  /** The pack's own primary colour; recolouring starts from here. */
  primary: string;
  /** Colour family swapped on recolour. Absent = original colours only. */
  ramp?: RampStop[];
}

export const ILLUSTRATION_PACKS: IllustrationPack[] = [
  {
    id: "flowbite",
    label: "Flowbite",
    byline: "Flowbite",
    license: "MIT",
    url: "https://flowbite.com/illustrations/",
    primary: "#2563eb",
    ramp: [
      { hex: "#1555e2", black: 0.18 },
      { hex: "#2563eb" },
      { hex: "#9ab7f6", white: 0.58 },
      { hex: "#c8d8fa", white: 0.79 },
      { hex: "#d6e2fb", white: 0.86 },
    ],
  },
  {
    id: "illlustrations",
    label: "Illustrations",
    byline: "Vijay Verma",
    license: "MIT",
    url: "https://illlustrations.co",
    primary: "#1e223b",
  },
  {
    id: "gophers",
    label: "Gophers",
    byline: "Maria Letta",
    license: "CC0",
    url: "https://github.com/MariaLetta/free-gophers-pack",
    primary: "#61e0ee",
    ramp: [
      { hex: "#4fcbe0", black: 0.18 },
      { hex: "#61e0ee" },
      { hex: "#b7f8ff", white: 0.55 },
    ],
  },
  {
    id: "kawaii",
    label: "Kawaii",
    byline: "React Kawaii",
    license: "MIT",
    url: "https://react-kawaii.vercel.app",
    primary: "#a6e191",
  },
  {
    id: "doodles",
    label: "Doodles",
    byline: "Open Doodles",
    license: "MIT",
    url: "https://www.opendoodles.com",
    primary: "#ff5678",
    ramp: [{ hex: "#ff5678" }],
  },
];

export const packOf = (entry: IllustrationEntry): IllustrationPack =>
  ILLUSTRATION_PACKS.find((p) => p.id === entry.pack) as IllustrationPack;

export const ILLUSTRATIONS: IllustrationEntry[] = [
 {
  "pack": "flowbite",
  "slug": "404-not-found-shopping",
  "title": "404 Not Found Shopping",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "404-not-found-smiley",
  "title": "404 Not Found Smiley",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "authentication-form-fields",
  "title": "Authentication Form Fields",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "balloon-package-flying",
  "title": "Balloon Package Flying",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "couple-dancing-music",
  "title": "Couple Dancing Music",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "credit-card-payment-receipt",
  "title": "Credit Card Payment Receipt",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "document-folders",
  "title": "Document Folders",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "employees-working-charts",
  "title": "Employees Working Charts",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "employees-working-office",
  "title": "Employees Working Office",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "gaming-controller-ghosts",
  "title": "Gaming Controller Ghosts",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "group-brainstorming",
  "title": "Group Brainstorming",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "laptop-404-not-found-error",
  "title": "Laptop 404 Not Found Error",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "laptop-server-error",
  "title": "Laptop Server Error",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "man-adjusting-settings",
  "title": "Man Adjusting Settings",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "man-car-service-repairing",
  "title": "Man Car Service Repairing",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "man-clock-shopping-charts",
  "title": "Man Clock Shopping Charts",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "man-credit-card",
  "title": "Man Credit Card",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "man-drawing",
  "title": "Man Drawing",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "man-pointing-smartphone",
  "title": "Man Pointing Smartphone",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "man-question-marks",
  "title": "Man Question Marks",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "man-repairing",
  "title": "Man Repairing",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "man-review-stars",
  "title": "Man Review Stars",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "man-vr-headset",
  "title": "Man Vr Headset",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "man-working-programs",
  "title": "Man Working Programs",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "man-working-question-mark",
  "title": "Man Working Question Mark",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "password-lock-key",
  "title": "Password Lock Key",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "people-connecting",
  "title": "People Connecting",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "smartphone-application-features",
  "title": "Smartphone Application Features",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "smartphone-charts",
  "title": "Smartphone Charts",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "smartphone-crypto-charts",
  "title": "Smartphone Crypto Charts",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "store-discount-open",
  "title": "Store Discount Open",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "wallet-money",
  "title": "Wallet Money",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "woman-cooking-kitchen",
  "title": "Woman Cooking Kitchen",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "woman-cyber-security",
  "title": "Woman Cyber Security",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "woman-earth-hugging",
  "title": "Woman Earth Hugging",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "woman-exchanging-money",
  "title": "Woman Exchanging Money",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "woman-fitness-gym",
  "title": "Woman Fitness Gym",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "woman-laptop-chart",
  "title": "Woman Laptop Chart",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "woman-laptop-chatting",
  "title": "Woman Laptop Chatting",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "woman-laptop-sitting",
  "title": "Woman Laptop Sitting",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "woman-laptop-standing",
  "title": "Woman Laptop Standing",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "woman-map",
  "title": "Woman Map",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "woman-mindfulness-yoga",
  "title": "Woman Mindfulness Yoga",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "woman-reading-paper-receipt",
  "title": "Woman Reading Paper Receipt",
  "dark": false
 },
 {
  "pack": "flowbite",
  "slug": "woman-real-estate-selling",
  "title": "Woman Real Estate Selling",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "woman-rocket-flying",
  "title": "Woman Rocket Flying",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "woman-scooter-transporting",
  "title": "Woman Scooter Transporting",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "woman-shopping-cart",
  "title": "Woman Shopping Cart",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "woman-shopping-discount",
  "title": "Woman Shopping Discount",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "woman-shopping-online",
  "title": "Woman Shopping Online",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "woman-shopping-window",
  "title": "Woman Shopping Window",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "woman-tutoring-classroom",
  "title": "Woman Tutoring Classroom",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "woman-vr-headset",
  "title": "Woman Vr Headset",
  "dark": true
 },
 {
  "pack": "flowbite",
  "slug": "woman-working-servers",
  "title": "Woman Working Servers",
  "dark": true
 },
 {
  "pack": "illlustrations",
  "slug": "gym-guy",
  "title": "Gym Guy",
  "file": "101-gym-guy.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "gym-cycle",
  "title": "Gym Cycle",
  "file": "102-gym-cycle.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "gym-time",
  "title": "Gym Time",
  "file": "103-gym-time.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "dumbbell",
  "title": "Dumbbell",
  "file": "104-dumbbell.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "freelancer",
  "title": "Freelancer",
  "file": "105-freelancer.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "italy",
  "title": "Italy",
  "file": "106-italy.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "healthy",
  "title": "Healthy",
  "file": "107-healthy.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "forget-password",
  "title": "Forget Password",
  "file": "108-forget-password.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "map-location",
  "title": "Map Location",
  "file": "109-map-location.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "sega-megdrive",
  "title": "Sega Megdrive",
  "file": "110-sega-megdrive.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "coding",
  "title": "Coding",
  "file": "111-coding.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "installing",
  "title": "Installing",
  "file": "112-installing.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "workstation",
  "title": "Workstation",
  "file": "113-workstation.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "retro-tv",
  "title": "Retro Tv",
  "file": "114-retro-tv.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "eiffel-tower",
  "title": "Eiffel Tower",
  "file": "115-eiffel-tower.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "gameboy",
  "title": "Gameboy",
  "file": "116-gameboy.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "ironman",
  "title": "Ironman",
  "file": "117-ironman.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "macbook",
  "title": "Macbook",
  "file": "118-macbook.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "working",
  "title": "Working",
  "file": "119-working.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "power-of-pen",
  "title": "Power Of Pen",
  "file": "120-power-of-pen.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "work-from-home-1",
  "title": "Work From Home 1",
  "file": "121-work-from-home-1.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "work-from-home-2",
  "title": "Work From Home 2",
  "file": "122-work-from-home-2.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "temprature-meter",
  "title": "Temprature Meter",
  "file": "123-temprature-meter.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "sanitizer",
  "title": "Sanitizer",
  "file": "124-sanitizer.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "wash-hand",
  "title": "Wash Hand",
  "file": "125-wash-hand.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "namaste-no-hand-shake",
  "title": "Namaste No Hand Shake",
  "file": "126-namaste-no-hand-shake.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "sick-sneezing",
  "title": "Sick Sneezing",
  "file": "127-sick-sneezing.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "forehead-tester",
  "title": "Forehead Tester",
  "file": "128-forehead-tester.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "wear-mask",
  "title": "Wear Mask",
  "file": "129-wear-mask.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "COVID-Virus",
  "title": "Covid Virus",
  "file": "130-COVID-Virus.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day1-ipod",
  "title": "Day1 Ipod",
  "file": "day1-ipod.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day10-canvas-stand",
  "title": "Day10 Canvas Stand",
  "file": "day10-canvas-stand.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day100-the-snail",
  "title": "Day100 The Snail",
  "file": "day100-the-snail.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day11-blackboard",
  "title": "Day11 Blackboard",
  "file": "day11-blackboard.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day12-bed",
  "title": "Day12 Bed",
  "file": "day12-bed.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day13-it-girl",
  "title": "Day13 It Girl",
  "file": "day13-it-girl.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day14-forklift",
  "title": "Day14 Forklift",
  "file": "day14-forklift.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day15-color-tool",
  "title": "Day15 Color Tool",
  "file": "day15-color-tool.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day16-retro-cassette",
  "title": "Day16 Retro Cassette",
  "file": "day16-retro-cassette.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day17-walkie-talkie",
  "title": "Day17 Walkie Talkie",
  "file": "day17-walkie-talkie.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day18-floppy",
  "title": "Day18 Floppy",
  "file": "day18-floppy.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day19-apple-watch",
  "title": "Day19 Apple Watch",
  "file": "day19-apple-watch.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day2-gaming-console",
  "title": "Day2 Gaming Console",
  "file": "day2-gaming-console.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day20-rocket",
  "title": "Day20 Rocket",
  "file": "day20-rocket.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day21-Lantern",
  "title": "Day21 Lantern",
  "file": "day21-Lantern.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day22-owl",
  "title": "Day22 Owl",
  "file": "day22-owl.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day23-radio",
  "title": "Day23 Radio",
  "file": "day23-radio.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day24-e-scooter",
  "title": "Day24 E Scooter",
  "file": "day24-e-scooter.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day25-sport-bicycle",
  "title": "Day25 Sport Bicycle",
  "file": "day25-sport-bicycle.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day26-rainbow",
  "title": "Day26 Rainbow",
  "file": "day26-rainbow.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day27-my-robot",
  "title": "Day27 My Robot",
  "file": "day27-my-robot.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day28-selfi-girl",
  "title": "Day28 Selfi Girl",
  "file": "day28-selfi-girl.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day29-selfie-boy",
  "title": "Day29 Selfie Boy",
  "file": "day29-selfie-boy.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day3-gaming-mouse",
  "title": "Day3 Gaming Mouse",
  "file": "day3-gaming-mouse.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day30-cafe",
  "title": "Day30 Cafe",
  "file": "day30-cafe.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day31-sweet-home",
  "title": "Day31 Sweet Home",
  "file": "day31-sweet-home.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day32-frankenstein",
  "title": "Day32 Frankenstein",
  "file": "day32-frankenstein.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day33-pumpkin",
  "title": "Day33 Pumpkin",
  "file": "day33-pumpkin.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day34-ticket",
  "title": "Day34 Ticket",
  "file": "day34-ticket.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day35-firework",
  "title": "Day35 Firework",
  "file": "day35-firework.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day36-abacus",
  "title": "Day36 Abacus",
  "file": "day36-abacus.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day37-calculator",
  "title": "Day37 Calculator",
  "file": "day37-calculator.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day38-macintosh",
  "title": "Day38 Macintosh",
  "file": "day38-macintosh.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day39-pc",
  "title": "Day39 Pc",
  "file": "day39-pc.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day4-polariod",
  "title": "Day4 Polariod",
  "file": "day4-polariod.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day40-powerbook-100",
  "title": "Day40 Powerbook 100",
  "file": "day40-powerbook-100.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day41-desktop",
  "title": "Day41 Desktop",
  "file": "day41-desktop.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day42-imac",
  "title": "Day42 Imac",
  "file": "day42-imac.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day43-ram",
  "title": "Day43 Ram",
  "file": "day43-ram.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day44-hdd",
  "title": "Day44 Hdd",
  "file": "day44-hdd.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day45-gpu-ati",
  "title": "Day45 Gpu Ati",
  "file": "day45-gpu-ati.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day46-experiment-lab",
  "title": "Day46 Experiment Lab",
  "file": "day46-experiment-lab.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day47-chemistry-lab",
  "title": "Day47 Chemistry Lab",
  "file": "day47-chemistry-lab.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day48-medical-lab",
  "title": "Day48 Medical Lab",
  "file": "day48-medical-lab.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day49-angler-fish",
  "title": "Day49 Angler Fish",
  "file": "day49-angler-fish.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day5-vault",
  "title": "Day5 Vault",
  "file": "day5-vault.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day50-pirahna",
  "title": "Day50 Pirahna",
  "file": "day50-pirahna.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day51-whale",
  "title": "Day51 Whale",
  "file": "day51-whale.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day52-auntum",
  "title": "Day52 Auntum",
  "file": "day52-auntum.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day53-farm",
  "title": "Day53 Farm",
  "file": "day53-farm.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day54-building",
  "title": "Day54 Building",
  "file": "day54-building.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day55-living-room-interior",
  "title": "Day55 Living Room Interior",
  "file": "day55-living-room-interior.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day56-tv-room",
  "title": "Day56 Tv Room",
  "file": "day56-tv-room.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day57-reading-room",
  "title": "Day57 Reading Room",
  "file": "day57-reading-room.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day58-bedroom",
  "title": "Day58 Bedroom",
  "file": "day58-bedroom.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day59-kitchen",
  "title": "Day59 Kitchen",
  "file": "day59-kitchen.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day6-open-vault",
  "title": "Day6 Open Vault",
  "file": "day6-open-vault.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day60-bathroom",
  "title": "Day60 Bathroom",
  "file": "day60-bathroom.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day61-travel-bag",
  "title": "Day61 Travel Bag",
  "file": "day61-travel-bag.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day62-office-bag",
  "title": "Day62 Office Bag",
  "file": "day62-office-bag.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day63-school-bag",
  "title": "Day63 School Bag",
  "file": "day63-school-bag.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day64-followers",
  "title": "Day64 Followers",
  "file": "day64-followers.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day65-city-road",
  "title": "Day65 City Road",
  "file": "day65-city-road.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day66-travel",
  "title": "Day66 Travel",
  "file": "day66-travel.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day67-dog",
  "title": "Day67 Dog",
  "file": "day67-dog.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day68-happy-cat",
  "title": "Day68 Happy Cat",
  "file": "day68-happy-cat.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day69-dotted-notebook",
  "title": "Day69 Dotted Notebook",
  "file": "day69-dotted-notebook.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day7-vintage-camera",
  "title": "Day7 Vintage Camera",
  "file": "day7-vintage-camera.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day70-designer-fav-tool-wacom",
  "title": "Day70 Designer Fav Tool Wacom",
  "file": "day70-designer-fav-tool-wacom.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day71-designer-tool-essential",
  "title": "Day71 Designer Tool Essential",
  "file": "day71-designer-tool-essential.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day72-designer-tool-war",
  "title": "Day72 Designer Tool War",
  "file": "day72-designer-tool-war.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day73-writing-tool",
  "title": "Day73 Writing Tool",
  "file": "day73-writing-tool.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day74-stationary-set",
  "title": "Day74 Stationary Set",
  "file": "day74-stationary-set.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day75-stationary-set-2",
  "title": "Day75 Stationary Set 2",
  "file": "day75-stationary-set-2.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day76-watch-spectacle",
  "title": "Day76 Watch Spectacle",
  "file": "day76-watch-spectacle.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day77-pocket-knief",
  "title": "Day77 Pocket Knief",
  "file": "day77-pocket-knief.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day78-wallet",
  "title": "Day78 Wallet",
  "file": "day78-wallet.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day79-coffee",
  "title": "Day79 Coffee",
  "file": "day79-coffee.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day8-printer",
  "title": "Day8 Printer",
  "file": "day8-printer.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day80-tea",
  "title": "Day80 Tea",
  "file": "day80-tea.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day81-ice-cream",
  "title": "Day81 Ice Cream",
  "file": "day81-ice-cream.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day82-burger",
  "title": "Day82 Burger",
  "file": "day82-burger.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day83-snowman",
  "title": "Day83 Snowman",
  "file": "day83-snowman.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day84-reindeer",
  "title": "Day84 Reindeer",
  "file": "day84-reindeer.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day85-socks",
  "title": "Day85 Socks",
  "file": "day85-socks.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day86-candle",
  "title": "Day86 Candle",
  "file": "day86-candle.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day87-chritmas-ball",
  "title": "Day87 Chritmas Ball",
  "file": "day87-chritmas-ball.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day88-jingle-bell",
  "title": "Day88 Jingle Bell",
  "file": "day88-jingle-bell.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day89-christmas-gift",
  "title": "Day89 Christmas Gift",
  "file": "day89-christmas-gift.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day9-toolbox",
  "title": "Day9 Toolbox",
  "file": "day9-toolbox.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day90-santa",
  "title": "Day90 Santa",
  "file": "day90-santa.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day91-merry-christmas",
  "title": "Day91 Merry Christmas",
  "file": "day91-merry-christmas.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day92-freelancing",
  "title": "Day92 Freelancing",
  "file": "day92-freelancing.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day93-programing",
  "title": "Day93 Programing",
  "file": "day93-programing.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day94-ui-ux",
  "title": "Day94 Ui Ux",
  "file": "day94-ui-ux.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day95-app-development",
  "title": "Day95 App Development",
  "file": "day95-app-development.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day96-camping",
  "title": "Day96 Camping",
  "file": "day96-camping.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day97-champagne",
  "title": "Day97 Champagne",
  "file": "day97-champagne.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day98-junk-boat",
  "title": "Day98 Junk Boat",
  "file": "day98-junk-boat.svg"
 },
 {
  "pack": "illlustrations",
  "slug": "day99-pirate-boat",
  "title": "Day99 Pirate Boat",
  "file": "day99-pirate-boat.svg"
 },
 {
  "pack": "gophers",
  "slug": "character-1",
  "title": "Gopher Character 1"
 },
 {
  "pack": "gophers",
  "slug": "character-2",
  "title": "Gopher Character 2"
 },
 {
  "pack": "gophers",
  "slug": "character-3",
  "title": "Gopher Character 3"
 },
 {
  "pack": "gophers",
  "slug": "character-4",
  "title": "Gopher Character 4"
 },
 {
  "pack": "gophers",
  "slug": "character-5",
  "title": "Gopher Character 5"
 },
 {
  "pack": "gophers",
  "slug": "character-6",
  "title": "Gopher Character 6"
 },
 {
  "pack": "gophers",
  "slug": "character-7",
  "title": "Gopher Character 7"
 },
 {
  "pack": "gophers",
  "slug": "character-8",
  "title": "Gopher Character 8"
 },
 {
  "pack": "gophers",
  "slug": "character-9",
  "title": "Gopher Character 9"
 },
 {
  "pack": "gophers",
  "slug": "character-10",
  "title": "Gopher Character 10"
 },
 {
  "pack": "gophers",
  "slug": "character-11",
  "title": "Gopher Character 11"
 },
 {
  "pack": "gophers",
  "slug": "character-12",
  "title": "Gopher Character 12"
 },
 {
  "pack": "gophers",
  "slug": "character-13",
  "title": "Gopher Character 13"
 },
 {
  "pack": "gophers",
  "slug": "character-14",
  "title": "Gopher Character 14"
 },
 {
  "pack": "gophers",
  "slug": "character-15",
  "title": "Gopher Character 15"
 },
 {
  "pack": "gophers",
  "slug": "character-16",
  "title": "Gopher Character 16"
 },
 {
  "pack": "gophers",
  "slug": "character-17",
  "title": "Gopher Character 17"
 },
 {
  "pack": "gophers",
  "slug": "character-18",
  "title": "Gopher Character 18"
 },
 {
  "pack": "gophers",
  "slug": "character-19",
  "title": "Gopher Character 19"
 },
 {
  "pack": "gophers",
  "slug": "character-20",
  "title": "Gopher Character 20"
 },
 {
  "pack": "gophers",
  "slug": "character-21",
  "title": "Gopher Character 21"
 },
 {
  "pack": "gophers",
  "slug": "character-22",
  "title": "Gopher Character 22"
 },
 {
  "pack": "gophers",
  "slug": "character-23",
  "title": "Gopher Character 23"
 },
 {
  "pack": "gophers",
  "slug": "character-24",
  "title": "Gopher Character 24"
 },
 {
  "pack": "gophers",
  "slug": "character-25",
  "title": "Gopher Character 25"
 },
 {
  "pack": "gophers",
  "slug": "character-26",
  "title": "Gopher Character 26"
 },
 {
  "pack": "gophers",
  "slug": "character-27",
  "title": "Gopher Character 27"
 },
 {
  "pack": "gophers",
  "slug": "character-28",
  "title": "Gopher Character 28"
 },
 {
  "pack": "gophers",
  "slug": "character-29",
  "title": "Gopher Character 29"
 },
 {
  "pack": "gophers",
  "slug": "character-30",
  "title": "Gopher Character 30"
 },
 {
  "pack": "gophers",
  "slug": "character-31",
  "title": "Gopher Character 31"
 },
 {
  "pack": "gophers",
  "slug": "character-32",
  "title": "Gopher Character 32"
 },
 {
  "pack": "gophers",
  "slug": "character-33",
  "title": "Gopher Character 33"
 },
 {
  "pack": "gophers",
  "slug": "character-34",
  "title": "Gopher Character 34"
 },
 {
  "pack": "gophers",
  "slug": "character-35",
  "title": "Gopher Character 35"
 },
 {
  "pack": "gophers",
  "slug": "character-36",
  "title": "Gopher Character 36"
 },
 {
  "pack": "gophers",
  "slug": "character-37",
  "title": "Gopher Character 37"
 },
 {
  "pack": "gophers",
  "slug": "character-38",
  "title": "Gopher Character 38"
 },
 {
  "pack": "gophers",
  "slug": "character-39",
  "title": "Gopher Character 39"
 },
 {
  "pack": "gophers",
  "slug": "character-40",
  "title": "Gopher Character 40"
 },
 {
  "pack": "gophers",
  "slug": "character-41",
  "title": "Gopher Character 41"
 },
 {
  "pack": "gophers",
  "slug": "character-42",
  "title": "Gopher Character 42"
 },
 {
  "pack": "gophers",
  "slug": "character-43",
  "title": "Gopher Character 43"
 },
 {
  "pack": "gophers",
  "slug": "character-44",
  "title": "Gopher Character 44"
 },
 {
  "pack": "gophers",
  "slug": "character-45",
  "title": "Gopher Character 45"
 },
 {
  "pack": "gophers",
  "slug": "character-46",
  "title": "Gopher Character 46"
 },
 {
  "pack": "gophers",
  "slug": "character-47",
  "title": "Gopher Character 47"
 },
 {
  "pack": "gophers",
  "slug": "character-48",
  "title": "Gopher Character 48"
 },
 {
  "pack": "gophers",
  "slug": "character-49",
  "title": "Gopher Character 49"
 },
 {
  "pack": "gophers",
  "slug": "character-50",
  "title": "Gopher Character 50"
 },
 {
  "pack": "gophers",
  "slug": "character-51",
  "title": "Gopher Character 51"
 },
 {
  "pack": "gophers",
  "slug": "character-52",
  "title": "Gopher Character 52"
 },
 {
  "pack": "gophers",
  "slug": "character-53",
  "title": "Gopher Character 53"
 },
 {
  "pack": "gophers",
  "slug": "character-54",
  "title": "Gopher Character 54"
 },
 {
  "pack": "gophers",
  "slug": "character-55",
  "title": "Gopher Character 55"
 },
 {
  "pack": "gophers",
  "slug": "character-56",
  "title": "Gopher Character 56"
 },
 {
  "pack": "gophers",
  "slug": "character-57",
  "title": "Gopher Character 57"
 },
 {
  "pack": "gophers",
  "slug": "character-58",
  "title": "Gopher Character 58"
 },
 {
  "pack": "gophers",
  "slug": "character-59",
  "title": "Gopher Character 59"
 },
 {
  "pack": "gophers",
  "slug": "character-60",
  "title": "Gopher Character 60"
 },
 {
  "pack": "gophers",
  "slug": "character-61",
  "title": "Gopher Character 61"
 },
 {
  "pack": "gophers",
  "slug": "character-62",
  "title": "Gopher Character 62"
 },
 {
  "pack": "gophers",
  "slug": "character-63",
  "title": "Gopher Character 63"
 },
 {
  "pack": "gophers",
  "slug": "character-64",
  "title": "Gopher Character 64"
 },
 {
  "pack": "gophers",
  "slug": "character-65",
  "title": "Gopher Character 65"
 },
 {
  "pack": "gophers",
  "slug": "character-66",
  "title": "Gopher Character 66"
 },
 {
  "pack": "gophers",
  "slug": "character-67",
  "title": "Gopher Character 67"
 },
 {
  "pack": "gophers",
  "slug": "character-68",
  "title": "Gopher Character 68"
 },
 {
  "pack": "gophers",
  "slug": "character-69",
  "title": "Gopher Character 69"
 },
 {
  "pack": "gophers",
  "slug": "character-70",
  "title": "Gopher Character 70"
 },
 {
  "pack": "gophers",
  "slug": "character-71",
  "title": "Gopher Character 71"
 },
 {
  "pack": "gophers",
  "slug": "character-72",
  "title": "Gopher Character 72"
 },
 {
  "pack": "gophers",
  "slug": "character-73",
  "title": "Gopher Character 73"
 },
 {
  "pack": "gophers",
  "slug": "character-74",
  "title": "Gopher Character 74"
 },
 {
  "pack": "gophers",
  "slug": "character-75",
  "title": "Gopher Character 75"
 },
 {
  "pack": "gophers",
  "slug": "character-76",
  "title": "Gopher Character 76"
 },
 {
  "pack": "gophers",
  "slug": "character-77",
  "title": "Gopher Character 77"
 },
 {
  "pack": "gophers",
  "slug": "character-78",
  "title": "Gopher Character 78"
 },
 {
  "pack": "gophers",
  "slug": "christmas-1",
  "title": "Christmas Gopher 1"
 },
 {
  "pack": "gophers",
  "slug": "christmas-2",
  "title": "Christmas Gopher 2"
 },
 {
  "pack": "gophers",
  "slug": "christmas-3",
  "title": "Christmas Gopher 3"
 },
 {
  "pack": "gophers",
  "slug": "christmas-4",
  "title": "Christmas Gopher 4"
 },
 {
  "pack": "gophers",
  "slug": "christmas-5",
  "title": "Christmas Gopher 5"
 },
 {
  "pack": "gophers",
  "slug": "christmas-6",
  "title": "Christmas Gopher 6"
 },
 {
  "pack": "gophers",
  "slug": "christmas-7",
  "title": "Christmas Gopher 7"
 },
 {
  "pack": "gophers",
  "slug": "christmas-8",
  "title": "Christmas Gopher 8"
 },
 {
  "pack": "gophers",
  "slug": "christmas-9",
  "title": "Christmas Gopher 9"
 },
 {
  "pack": "gophers",
  "slug": "christmas-10",
  "title": "Christmas Gopher 10"
 },
 {
  "pack": "gophers",
  "slug": "christmas-11",
  "title": "Christmas Gopher 11"
 },
 {
  "pack": "gophers",
  "slug": "christmas-12",
  "title": "Christmas Gopher 12"
 },
 {
  "pack": "gophers",
  "slug": "goroutine-1",
  "title": "Goroutine 1"
 },
 {
  "pack": "gophers",
  "slug": "goroutine-2",
  "title": "Goroutine 2"
 },
 {
  "pack": "gophers",
  "slug": "goroutine-3",
  "title": "Goroutine 3"
 },
 {
  "pack": "gophers",
  "slug": "goroutine-4",
  "title": "Goroutine 4"
 },
 {
  "pack": "gophers",
  "slug": "goroutine-5",
  "title": "Goroutine 5"
 },
 {
  "pack": "gophers",
  "slug": "goroutine-6",
  "title": "Goroutine 6"
 },
 {
  "pack": "gophers",
  "slug": "goroutine-7",
  "title": "Goroutine 7"
 },
 {
  "pack": "gophers",
  "slug": "goroutine-8",
  "title": "Goroutine 8"
 },
 {
  "pack": "gophers",
  "slug": "goroutine-9",
  "title": "Goroutine 9"
 },
 {
  "pack": "gophers",
  "slug": "goroutine-10",
  "title": "Goroutine 10"
 },
 {
  "pack": "gophers",
  "slug": "goroutine-11",
  "title": "Goroutine 11"
 },
 {
  "pack": "gophers",
  "slug": "goroutine-12",
  "title": "Goroutine 12"
 },
 {
  "pack": "gophers",
  "slug": "goroutine-13",
  "title": "Goroutine 13"
 },
 {
  "pack": "gophers",
  "slug": "goroutine-14",
  "title": "Goroutine 14"
 },
 {
  "pack": "gophers",
  "slug": "goroutine-15",
  "title": "Goroutine 15"
 },
 {
  "pack": "gophers",
  "slug": "goroutine-16",
  "title": "Goroutine 16"
 },
 {
  "pack": "gophers",
  "slug": "goroutine-17",
  "title": "Goroutine 17"
 },
 {
  "pack": "gophers",
  "slug": "scene-1",
  "title": "Gopher Scene 1"
 },
 {
  "pack": "gophers",
  "slug": "scene-2",
  "title": "Gopher Scene 2"
 },
 {
  "pack": "gophers",
  "slug": "scene-3",
  "title": "Gopher Scene 3"
 },
 {
  "pack": "gophers",
  "slug": "scene-4",
  "title": "Gopher Scene 4"
 },
 {
  "pack": "gophers",
  "slug": "scene-5",
  "title": "Gopher Scene 5"
 },
 {
  "pack": "gophers",
  "slug": "scene-6",
  "title": "Gopher Scene 6"
 },
 {
  "pack": "gophers",
  "slug": "scene-7",
  "title": "Gopher Scene 7"
 },
 {
  "pack": "gophers",
  "slug": "scene-8",
  "title": "Gopher Scene 8"
 },
 {
  "pack": "gophers",
  "slug": "scene-9",
  "title": "Gopher Scene 9"
 },
 {
  "pack": "gophers",
  "slug": "scene-10",
  "title": "Gopher Scene 10"
 },
 {
  "pack": "gophers",
  "slug": "scene-11",
  "title": "Gopher Scene 11"
 },
 {
  "pack": "gophers",
  "slug": "scene-12",
  "title": "Gopher Scene 12"
 },
 {
  "pack": "gophers",
  "slug": "scene-13",
  "title": "Gopher Scene 13"
 },
 {
  "pack": "gophers",
  "slug": "scene-14",
  "title": "Gopher Scene 14"
 },
 {
  "pack": "gophers",
  "slug": "scene-15",
  "title": "Gopher Scene 15"
 },
 {
  "pack": "gophers",
  "slug": "scene-16",
  "title": "Gopher Scene 16"
 },
 {
  "pack": "gophers",
  "slug": "scene-17",
  "title": "Gopher Scene 17"
 },
 {
  "pack": "gophers",
  "slug": "scene-18",
  "title": "Gopher Scene 18"
 },
 {
  "pack": "gophers",
  "slug": "scene-19",
  "title": "Gopher Scene 19"
 },
 {
  "pack": "gophers",
  "slug": "scene-20",
  "title": "Gopher Scene 20"
 },
 {
  "pack": "gophers",
  "slug": "scene-21",
  "title": "Gopher Scene 21"
 },
 {
  "pack": "gophers",
  "slug": "scene-22",
  "title": "Gopher Scene 22"
 },
 {
  "pack": "gophers",
  "slug": "scene-23",
  "title": "Gopher Scene 23"
 },
 {
  "pack": "gophers",
  "slug": "scene-24",
  "title": "Gopher Scene 24"
 },
 {
  "pack": "gophers",
  "slug": "scene-25",
  "title": "Gopher Scene 25"
 },
 {
  "pack": "gophers",
  "slug": "scene-26",
  "title": "Gopher Scene 26"
 },
 {
  "pack": "gophers",
  "slug": "scene-27",
  "title": "Gopher Scene 27"
 },
 {
  "pack": "gophers",
  "slug": "scene-28",
  "title": "Gopher Scene 28"
 },
 {
  "pack": "gophers",
  "slug": "scene-29",
  "title": "Gopher Scene 29"
 },
 {
  "pack": "gophers",
  "slug": "scene-30",
  "title": "Gopher Scene 30"
 },
 {
  "pack": "gophers",
  "slug": "scene-31",
  "title": "Gopher Scene 31"
 },
 {
  "pack": "gophers",
  "slug": "scene-32",
  "title": "Gopher Scene 32"
 },
 {
  "pack": "gophers",
  "slug": "scene-33",
  "title": "Gopher Scene 33"
 },
 {
  "pack": "gophers",
  "slug": "scene-34",
  "title": "Gopher Scene 34"
 },
 {
  "pack": "gophers",
  "slug": "scene-35",
  "title": "Gopher Scene 35"
 },
 {
  "pack": "gophers",
  "slug": "scene-36",
  "title": "Gopher Scene 36"
 },
 {
  "pack": "gophers",
  "slug": "scene-37",
  "title": "Gopher Scene 37"
 },
 {
  "pack": "gophers",
  "slug": "scene-38",
  "title": "Gopher Scene 38"
 },
 {
  "pack": "gophers",
  "slug": "scene-39",
  "title": "Gopher Scene 39"
 },
 {
  "pack": "gophers",
  "slug": "scene-40",
  "title": "Gopher Scene 40"
 },
 {
  "pack": "gophers",
  "slug": "scene-41",
  "title": "Gopher Scene 41"
 },
 {
  "pack": "gophers",
  "slug": "scene-42",
  "title": "Gopher Scene 42"
 },
 {
  "pack": "gophers",
  "slug": "scene-43",
  "title": "Gopher Scene 43"
 },
 {
  "pack": "gophers",
  "slug": "scene-44",
  "title": "Gopher Scene 44"
 },
 {
  "pack": "gophers",
  "slug": "scene-45",
  "title": "Gopher Scene 45"
 },
 {
  "pack": "gophers",
  "slug": "scene-46",
  "title": "Gopher Scene 46"
 },
 {
  "pack": "kawaii",
  "slug": "astronaut",
  "title": "Astronaut"
 },
 {
  "pack": "kawaii",
  "slug": "backpack",
  "title": "Backpack"
 },
 {
  "pack": "kawaii",
  "slug": "browser",
  "title": "Browser"
 },
 {
  "pack": "kawaii",
  "slug": "cat",
  "title": "Cat"
 },
 {
  "pack": "kawaii",
  "slug": "chocolate",
  "title": "Chocolate"
 },
 {
  "pack": "kawaii",
  "slug": "credit-card",
  "title": "Credit Card"
 },
 {
  "pack": "kawaii",
  "slug": "cyborg",
  "title": "Cyborg"
 },
 {
  "pack": "kawaii",
  "slug": "file",
  "title": "File"
 },
 {
  "pack": "kawaii",
  "slug": "folder",
  "title": "Folder"
 },
 {
  "pack": "kawaii",
  "slug": "ghost",
  "title": "Ghost"
 },
 {
  "pack": "kawaii",
  "slug": "human-cat",
  "title": "Human Cat"
 },
 {
  "pack": "kawaii",
  "slug": "human-dinosaur",
  "title": "Human Dinosaur"
 },
 {
  "pack": "kawaii",
  "slug": "ice-cream",
  "title": "Ice Cream"
 },
 {
  "pack": "kawaii",
  "slug": "mug",
  "title": "Mug"
 },
 {
  "pack": "kawaii",
  "slug": "planet",
  "title": "Planet"
 },
 {
  "pack": "kawaii",
  "slug": "speech-bubble",
  "title": "Speech Bubble"
 },
 {
  "pack": "doodles",
  "slug": "ballet",
  "title": "Ballet"
 },
 {
  "pack": "doodles",
  "slug": "bikini",
  "title": "Bikini"
 },
 {
  "pack": "doodles",
  "slug": "chilling",
  "title": "Chilling"
 },
 {
  "pack": "doodles",
  "slug": "clumsy",
  "title": "Clumsy"
 },
 {
  "pack": "doodles",
  "slug": "coffee",
  "title": "Coffee"
 },
 {
  "pack": "doodles",
  "slug": "dancing",
  "title": "Dancing"
 },
 {
  "pack": "doodles",
  "slug": "dog-jump",
  "title": "Dog Jump"
 },
 {
  "pack": "doodles",
  "slug": "doggie",
  "title": "Doggie"
 },
 {
  "pack": "doodles",
  "slug": "float",
  "title": "Float"
 },
 {
  "pack": "doodles",
  "slug": "groovy",
  "title": "Groovy"
 },
 {
  "pack": "doodles",
  "slug": "ice-cream",
  "title": "Ice Cream"
 },
 {
  "pack": "doodles",
  "slug": "jumping",
  "title": "Jumping"
 },
 {
  "pack": "doodles",
  "slug": "laying",
  "title": "Laying"
 },
 {
  "pack": "doodles",
  "slug": "levitate",
  "title": "Levitate"
 },
 {
  "pack": "doodles",
  "slug": "loving",
  "title": "Loving"
 },
 {
  "pack": "doodles",
  "slug": "meditating",
  "title": "Meditating"
 },
 {
  "pack": "doodles",
  "slug": "moshing",
  "title": "Moshing"
 },
 {
  "pack": "doodles",
  "slug": "petting",
  "title": "Petting"
 },
 {
  "pack": "doodles",
  "slug": "plant",
  "title": "Plant"
 },
 {
  "pack": "doodles",
  "slug": "reading-side",
  "title": "Reading Side"
 },
 {
  "pack": "doodles",
  "slug": "reading",
  "title": "Reading"
 },
 {
  "pack": "doodles",
  "slug": "roller-skating",
  "title": "Roller Skating"
 },
 {
  "pack": "doodles",
  "slug": "rolling",
  "title": "Rolling"
 },
 {
  "pack": "doodles",
  "slug": "running",
  "title": "Running"
 },
 {
  "pack": "doodles",
  "slug": "selfie",
  "title": "Selfie"
 },
 {
  "pack": "doodles",
  "slug": "sitting-reading",
  "title": "Sitting Reading"
 },
 {
  "pack": "doodles",
  "slug": "sitting",
  "title": "Sitting"
 },
 {
  "pack": "doodles",
  "slug": "sleek",
  "title": "Sleek"
 },
 {
  "pack": "doodles",
  "slug": "sprinting",
  "title": "Sprinting"
 },
 {
  "pack": "doodles",
  "slug": "strolling",
  "title": "Strolling"
 },
 {
  "pack": "doodles",
  "slug": "swinging",
  "title": "Swinging"
 },
 {
  "pack": "doodles",
  "slug": "unboxing",
  "title": "Unboxing"
 },
 {
  "pack": "doodles",
  "slug": "zombieing",
  "title": "Zombieing"
 }
];

export const getIllustration = (pack: IllustrationPackId, slug: string): IllustrationEntry =>
  ILLUSTRATIONS.find((e) => e.pack === pack && e.slug === slug) as IllustrationEntry;

export const illustrationUrl = (entry: IllustrationEntry, theme: "light" | "dark"): string =>
  entry.pack === "flowbite"
    ? `/illustrations/${theme}/${encodeURIComponent(entry.slug)}.svg`
    : `/illustrations/packs/${entry.pack}/${encodeURIComponent(entry.file ?? `${entry.slug}.svg`)}`;

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (r: number, g: number, b: number): string =>
  "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mixWhite = (hex: string, amt: number): string => {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
};
const mixBlack = (hex: string, amt: number): string => {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amt), g * (1 - amt), b * (1 - amt));
};

/** Swap a pack's colour family for the same family built from `color`.
 *  Packs without a ramp (or when color == the pack primary) pass through. */
export const recolorSvg = (entry: IllustrationEntry, svg: string, color: string): string => {
  const pack = packOf(entry);
  const target = color.toLowerCase();
  if (!pack.ramp || !/^#[0-9a-f]{6}$/.test(target) || target === pack.primary) return svg;
  let out = svg;
  for (const stop of pack.ramp) {
    const to = stop.white !== undefined
      ? mixWhite(target, stop.white)
      : stop.black !== undefined
        ? mixBlack(target, stop.black)
        : target;
    out = out.replace(new RegExp(stop.hex, "gi"), to);
  }
  return out;
};

const rawCache = new Map<string, Promise<string>>();

/** Fetch one illustration's raw SVG markup (session-cached). */
export const loadIllustrationSvg = (entry: IllustrationEntry, theme: "light" | "dark"): Promise<string> => {
  const key = `${entry.pack}:${theme}:${entry.slug}`;
  const hit = rawCache.get(key);
  if (hit) return hit;
  const promise = fetch(illustrationUrl(entry, theme)).then((res) => {
    if (!res.ok) throw new Error(`Illustration missing: ${key}`);
    return res.text();
  });
  rawCache.set(key, promise);
  return promise;
};

/** Set explicit width/height on the root <svg> for downloads. */
export const sizeSvg = (svg: string, px: number): string =>
  svg.replace(/<svg([^>]*)>/i, (_m, attrs: string) => {
    const cleaned = String(attrs).replace(/\s(width|height)="[^"]*"/gi, "");
    return `<svg${cleaned} width="${px}" height="${px}">`;
  });
