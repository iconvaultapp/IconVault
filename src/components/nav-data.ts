import {
  BookOpen,
  FolderOpen,
  Upload,
  Code2,
  Sparkles,
  GitCompare,
  Clock,
  BarChart2,
  Lightbulb,
  Bell,
  Key,
  Terminal,
  Crown,
  Users,
  Zap,
  Palette,
  Wrench,
  Shapes,
  Image as ImageIcon,
  Camera,
  Minimize2,
  Youtube,
  Type,
  Calculator,
  ShieldCheck,
  Globe,
  Gamepad2,
  Film,
  GraduationCap,
  Search,
  Brush,
  FileCheck2,
  EyeOff,
  Wand2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  desc?: string;
}

export interface NavSection {
  label: string;
  links: NavItem[];
}

export const navSections: NavSection[] = [
  {
    label: "Collections",
    links: [
      { icon: FolderOpen, label: "My Collections", path: "/collections", desc: "Organise icons into sets" },
      { icon: Upload, label: "Upload Custom Icons", path: "/upload", desc: "Bring your own SVGs" },
      { icon: Code2, label: "Export Design Tokens", path: "/design-tokens", desc: "CSS, JSON, Tailwind" },
    ],
  },
  {
    label: "Tools",
    links: [
      { icon: Wrench, label: "All Tools", path: "/tools", desc: "Every tool in one place" },
      { icon: ImageIcon, label: "Image tools", path: "/tools?category=image", desc: "Convert, compress & inspect" },
      { icon: Shapes, label: "SVG tools", path: "/tools?category=svg", desc: "Optimize vector graphics" },
      { icon: Palette, label: "Logo & codes", path: "/tools?category=brand", desc: "Brand marks, QR & barcodes" },
      { icon: Brush, label: "Color & style", path: "/tools?category=style", desc: "Colors, gradients, contrast" },
      { icon: Search, label: "SEO tools", path: "/tools?category=seo", desc: "Meta tags & sitemaps" },
      { icon: Type, label: "Text tools", path: "/tools?category=text", desc: "Count, convert & compare" },
      { icon: Code2, label: "Developer tools", path: "/tools?category=dev", desc: "Encoders & formatters" },
      { icon: Film, label: "GIF & video", path: "/tools?category=gif", desc: "Make & compress GIFs" },
      { icon: EyeOff, label: "Privacy & watermark", path: "/tools?category=privacy", desc: "EXIF, blur & watermarks" },
      { icon: FileCheck2, label: "Exam forms", path: "/tools?category=exam", desc: "Photo & signature tools" },
      { icon: ShieldCheck, label: "Security", path: "/tools?category=security", desc: "Encryption & hashing" },
      { icon: Calculator, label: "Calculators", path: "/tools?category=calculators", desc: "ROI, pricing & math" },
      { icon: GraduationCap, label: "Learn & playgrounds", path: "/tools?category=learn", desc: "Web API playgrounds" },
      { icon: Wand2, label: "Generators", path: "/tools?category=generators", desc: "Mock data & prompts" },
      { icon: Globe, label: "Network", path: "/tools?category=network", desc: "HTTP & connectivity" },
      { icon: Gamepad2, label: "Fun", path: "/tools?category=fun", desc: "Toys & experiments" },
    ],
  },
  {
    label: "Developers",
    links: [
      { icon: Key, label: "API Access", path: "/api-access", desc: "REST endpoints & keys" },
      { icon: Terminal, label: "CLI Tool", path: "/cli", desc: "Pull icons from the terminal" },
      { icon: Code2, label: "Embed Widget", path: "/embed", desc: "Icon picker for your app" },
    ],
  },
  {
    label: "Account",
    links: [
      { icon: Crown, label: "Upgrade to Pro", path: "/pro", desc: "Unlimited everything" },
      { icon: Users, label: "Team Workspace", path: "/team", desc: "Shared libraries" },
      { icon: Zap, label: "What's New", path: "/changelog", desc: "Latest releases" },
    ],
  },
];
