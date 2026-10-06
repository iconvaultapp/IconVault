// /tools/qr-generator - QR codes for URLs, text, contacts (vCard), Wi-Fi,
// SMS, email and phone - with 22 fancy designs (free + Pro), custom colors,
// brand-logo overlay and PNG/SVG export. Rendered from the QR module matrix
// on a canvas - 100% in-browser.

import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Copy,
  Crown,
  Download,
  ImagePlus,
  Link2,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  QrCode,
  Type,
  User,
  Wifi,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/qr-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/qr-generator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { cn } from "@/lib/utils";
import {
  QR_DESIGNS,
  getDesign,
  renderQrToCanvas,
  renderQrPreview,
  type QrDesign,
} from "@/lib/qr-designs";

export const Route = createFileRoute("/tools_/qr-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/qr-generator";
    return {
      meta: [
        { title: seo.title },
        { name: "description", content: seo.metaDescription },
        { property: "og:title", content: seo.title },
        { property: "og:description", content: seo.metaDescription },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: seo.title },
        { name: "twitter:description", content: seo.metaDescription },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: QrTool,
});

const SIZES = [256, 512, 1024] as const;

const EC_LEVELS = [
  { id: "L", label: "L · 7%" },
  { id: "M", label: "M · 15%" },
  { id: "Q", label: "Q · 25%" },
  { id: "H", label: "H · 30%" },
] as const;

const TABS = [
  { id: "url", label: "URL", icon: Link2, heading: "Redirect to an existing web URL" },
  { id: "text", label: "Plain Text", icon: Type, heading: "Show plain text when scanned" },
  { id: "contact", label: "Contact", icon: User, heading: "Share a contact card (vCard)" },
  { id: "wifi", label: "Wi-Fi", icon: Wifi, heading: "Let guests join your Wi-Fi instantly" },
  { id: "sms", label: "SMS", icon: MessageSquare, heading: "Open an SMS with a pre-filled message" },
  { id: "email", label: "Email", icon: Mail, heading: "Open an email draft when scanned" },
  { id: "phone", label: "Phone", icon: Phone, heading: "Start a phone call when scanned" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Escape the four characters that are special inside a Wi-Fi QR payload. */
function escapeWifi(v: string): string {
  return v.replace(/([\\;,":])/g, "\\$1");
}

interface QrFields {
  url: string;
  text: string;
  firstName: string;
  lastName: string;
  org: string;
  title: string;
  phone: string;
  email: string;
  site: string;
  address: string;
  ssid: string;
  password: string;
  encryption: string;
  hidden: string;
  message: string;
  to: string;
  subject: string;
  body: string;
}

function buildPayload(tab: TabId, f: QrFields): { value: string; error: string | null } {
  const need = (v: string, msg: string) => (v.trim() ? null : msg);
  switch (tab) {
    case "url": {
      const raw = f.url.trim();
      const err = need(raw, "Enter a URL first.");
      if (err) return { value: "", error: err };
      const value = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
      return { value, error: null };
    }
    case "text": {
      const err = need(f.text, "Enter some text first.");
      return err ? { value: "", error: err } : { value: f.text.trim(), error: null };
    }
    case "contact": {
      const err = need(f.firstName + f.lastName, "Enter at least a first or last name.");
      if (err) return { value: "", error: err };
      const clean = (v: string) => v.replace(/[\r\n]+/g, " ").trim();
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${clean(f.lastName)};${clean(f.firstName)};;;`,
        `FN:${clean(`${f.firstName} ${f.lastName}`.trim())}`,
      ];
      if (f.org.trim()) lines.push(`ORG:${clean(f.org)}`);
      if (f.title.trim()) lines.push(`TITLE:${clean(f.title)}`);
      if (f.phone.trim()) lines.push(`TEL;TYPE=CELL:${clean(f.phone)}`);
      if (f.email.trim()) lines.push(`EMAIL:${clean(f.email)}`);
      if (f.site.trim()) lines.push(`URL:${clean(f.site)}`);
      if (f.address.trim()) lines.push(`ADR:;;${clean(f.address)};;;;`);
      lines.push("END:VCARD");
      return { value: lines.join("\n"), error: null };
    }
    case "wifi": {
      const err = need(f.ssid, "Enter the Wi-Fi network name (SSID).");
      if (err) return { value: "", error: err };
      const enc = f.encryption === "nopass" ? "nopass" : f.encryption || "WPA";
      let value = `WIFI:T:${enc};S:${escapeWifi(f.ssid.trim())};`;
      if (enc !== "nopass") value += `P:${escapeWifi(f.password)};`;
      if (f.hidden === "1") value += "H:true;";
      return { value: value + ";", error: null };
    }
    case "sms": {
      const err = need(f.phone, "Enter a phone number first.");
      if (err) return { value: "", error: err };
      return { value: `SMSTO:${f.phone.trim()}:${f.message.trim()}`, error: null };
    }
    case "email": {
      const err = need(f.to, "Enter an email address first.");
      if (err) return { value: "", error: err };
      const params = new URLSearchParams();
      if (f.subject.trim()) params.set("subject", f.subject.trim());
      if (f.body.trim()) params.set("body", f.body.trim());
      const qs = params.toString();
      return { value: `mailto:${f.to.trim()}${qs ? `?${qs}` : ""}`, error: null };
    }
    case "phone": {
      const err = need(f.phone, "Enter a phone number first.");
      if (err) return { value: "", error: err };
      return { value: `tel:${f.phone.trim().replace(/[\s()-]/g, "")}`, error: null };
    }
  }
}

/** WCAG relative luminance + contrast ratio, for the low-contrast warning. */
function luminanceOf(hex: string): number {
  const h = hex.replace(/^#/, "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(a: string, b: string): number {
  const l1 = luminanceOf(a);
  const l2 = luminanceOf(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function loadLogoImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that logo image."));
    };
    img.src = url;
  });
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary";
const labelCls = "mb-1.5 block text-[13px] font-medium text-foreground/80";

const EMPTY_FIELDS: QrFields = {
  url: "",
  text: "",
  firstName: "",
  lastName: "",
  org: "",
  title: "",
  phone: "",
  email: "",
  site: "",
  address: "",
  ssid: "",
  password: "",
  encryption: "WPA",
  hidden: "0",
  message: "",
  to: "",
  subject: "",
  body: "",
};

/** One design thumbnail in the picker grid (tiny live-rendered preview). */
function DesignThumb({
  design,
  active,
  locked,
  onPick,
}: {
  design: QrDesign;
  active: boolean;
  locked: boolean;
  onPick: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) renderQrPreview(ref.current, design);
  }, [design]);
  return (
    <button
      type="button"
      onClick={onPick}
      title={design.name + (locked ? " · Pro" : "")}
      aria-label={`QR style: ${design.name}${locked ? " (Pro)" : ""}`}
      className={cn(
        "relative overflow-hidden rounded-xl border-2 transition",
        active ? "border-primary" : "border-border hover:border-primary/40",
      )}
    >
      <canvas ref={ref} width={96} height={96} className="h-auto w-full" />
      {locked && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/45">
          <Crown className="h-4 w-4 text-amber-300" />
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1 py-0.5 text-center text-[10px] font-bold text-white">
        {design.name}
      </span>
    </button>
  );
}

function QrTool() {
  const { isPro } = usePlan();
  const { requireAuth } = useRequireAuth();
  const trial = useToolTrial("qr-generator", isPro);
  const seo = toolSeo;

  const [tab, setTab] = useState<TabId>("url");
  const [fields, setFields] = useState<QrFields>(EMPTY_FIELDS);
  const set = (k: keyof QrFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFields((p) => ({ ...p, [k]: e.target.value }));

  const [size, setSize] = useState<number>(512);
  const [ecLevel, setEcLevel] = useState<"L" | "M" | "Q" | "H">("M");
  const [fg, setFg] = useState("#111111");
  const [bg, setBg] = useState("#ffffff");
  const [margin, setMargin] = useState(2);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [logoName, setLogoName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Active fancy design + optional user color overrides (overrides clear the
  // design's gradient so the picked color wins).
  const [designId, setDesignId] = useState("classic");
  const [customFg, setCustomFg] = useState<string | null>(null);
  const [customBg, setCustomBg] = useState<string | null>(null);

  const payload = useMemo(() => buildPayload(tab, fields), [tab, fields]);

  /** Live contrast between the chosen code and background colors. */
  const qrContrast = useMemo(() => contrastRatio(fg, bg), [fg, bg]);

  type QrOpts = {
    ec: "L" | "M" | "Q" | "H";
    margin: number;
    size: number;
    logo: HTMLImageElement | null;
    designId: string;
    fg: string | null;
    bg: string | null;
  };
  const optsOf = (patch: Partial<QrOpts> = {}): QrOpts => ({
    ec: logo ? "H" : ecLevel,
    margin, size, logo, designId,
    fg: customFg,
    bg: customBg,
    ...patch,
  });

  const paintNow = (o: QrOpts, value: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderQrToCanvas(canvas, value, getDesign(o.designId), {
      size: o.size,
      margin: o.margin,
      ec: o.ec,
      logo: o.logo,
      fg: o.fg ?? undefined,
      bg: o.bg ?? undefined,
    });
  };

  const generate = () => {
    if (payload.error) {
      toast.error(payload.error);
      return;
    }
    if (busy || !trial.canUse || !canvasRef.current) return;
    setBusy(true);
    setError(null);
    try {
      paintNow(optsOf(), payload.value);
      setRendered(true);
      trial.recordUse();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate a QR code for that input.");
    } finally {
      setBusy(false);
    }
  };

  const restyle = (patch: Partial<QrOpts> = {}) => {
    // Live-update the code when styling changes after a successful generate.
    if (rendered && !payload.error) {
      try {
        paintNow(optsOf(patch), payload.value);
      } catch {
        // Keep the last good render.
      }
    }
  };

  const pickDesign = (d: QrDesign) => {
    if (d.pro && !isPro) {
      if (!requireAuth("unlock the pro QR styles")) return;
      toast.error("That style is Pro - $11/mo or $29 once, yours forever.");
      return;
    }
    setDesignId(d.id);
    setFg(d.fg);
    setBg(d.bg);
    setCustomFg(null);
    setCustomBg(null);
    restyle({ designId: d.id, fg: null, bg: null });
    if (!rendered) toast.success(`Style "${d.name}" selected - hit Generate.`);
  };

  const onColorPick = (which: "fg" | "bg", v: string) => {
    if (which === "fg") {
      setFg(v);
      setCustomFg(v);
      restyle({ fg: v });
    } else {
      setBg(v);
      setCustomBg(v);
      restyle({ bg: v });
    }
  };

  const onLogoFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const img = await loadLogoImage(f);
      setLogo(img);
      setLogoName(f.name);
      restyle({ logo: img, ec: "H" });
      toast.success("Logo added - error correction set to H.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that logo.");
    }
  };

  const clearLogo = () => {
    setLogo(null);
    setLogoName(null);
    restyle({ logo: null });
  };

  const download = () => {
    canvasRef.current?.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `qr-code-${size}px.png`);
        toast.success("QR code downloaded");
      } else {
        toast.error("Could not export the PNG.");
      }
    }, "image/png");
  };

  const copyPng = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !rendered) return;
    try {
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("export failed");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast.success("QR code copied to clipboard.");
    } catch {
      toast.error("Copy not supported in this browser - use Download PNG instead.");
    }
  };

  const downloadSvg = () => {
    const canvas = canvasRef.current;
    if (!rendered || !canvas) {
      toast.error("Generate the QR code first.");
      return;
    }
    if (!trial.canUse) return;
    // Embed the rendered (fancy-styled) PNG inside the SVG so the design is
    // preserved exactly - pure-vector tracing would lose the styles.
    const dataUrl = canvas.toDataURL("image/png");
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
      `<image href="${dataUrl}" x="0" y="0" width="${size}" height="${size}"/></svg>`;
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), "qr-code.svg");
    trial.recordUse();
    toast.success("QR SVG downloaded");
  };

  const activeTab = TABS.find((t) => t.id === tab)!;

  return (
    <ToolPageShell toolId="qr-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="QR Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div ref={formRef} className="scroll-mt-24 space-y-5 rounded-2xl border border-border bg-card p-5">
          {/* Content-type tabs - all visible, no dragging needed */}
          <div className="flex flex-wrap gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[13px] font-bold transition",
                  tab === t.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          <div>
            <p className="mb-3 text-[15px] font-bold">{activeTab.heading}</p>

            {tab === "url" && (
              <label className="block">
                <span className={labelCls}>Website URL</span>
                <input value={fields.url} onChange={set("url")} placeholder="https://example.com" inputMode="url" className={inputCls} />
              </label>
            )}

            {tab === "text" && (
              <label className="block">
                <span className={labelCls}>Text</span>
                <textarea value={fields.text} onChange={set("text")} rows={4} placeholder="Type anything - a message, a coupon code, an address…" className={cn(inputCls, "resize-y")} />
              </label>
            )}

            {tab === "contact" && (
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className={labelCls}>First name *</span><input value={fields.firstName} onChange={set("firstName")} placeholder="Aarav" className={inputCls} /></label>
                <label className="block"><span className={labelCls}>Last name</span><input value={fields.lastName} onChange={set("lastName")} placeholder="Sharma" className={inputCls} /></label>
                <label className="block"><span className={labelCls}>Phone</span><input value={fields.phone} onChange={set("phone")} placeholder="+91 98765 43210" inputMode="tel" className={inputCls} /></label>
                <label className="block"><span className={labelCls}>Email</span><input value={fields.email} onChange={set("email")} placeholder="name@company.com" inputMode="email" className={inputCls} /></label>
                <label className="block"><span className={labelCls}>Organization</span><input value={fields.org} onChange={set("org")} placeholder="Company" className={inputCls} /></label>
                <label className="block"><span className={labelCls}>Title</span><input value={fields.title} onChange={set("title")} placeholder="Founder" className={inputCls} /></label>
                <label className="block"><span className={labelCls}>Website</span><input value={fields.site} onChange={set("site")} placeholder="https://…" inputMode="url" className={inputCls} /></label>
                <label className="block"><span className={labelCls}>Address</span><input value={fields.address} onChange={set("address")} placeholder="Street, City" className={inputCls} /></label>
              </div>
            )}

            {tab === "wifi" && (
              <div className="space-y-3">
                <label className="block"><span className={labelCls}>Network name (SSID) *</span><input value={fields.ssid} onChange={set("ssid")} placeholder="MyHomeWiFi" className={inputCls} /></label>
                <label className="block"><span className={labelCls}>Password</span><input value={fields.password} onChange={set("password")} placeholder="••••••••" className={inputCls} /></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className={labelCls}>Security</span>
                    <select value={fields.encryption} onChange={set("encryption")} className={inputCls}>
                      <option value="WPA">WPA / WPA2</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">None (open)</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className={labelCls}>Hidden network</span>
                    <select value={fields.hidden} onChange={set("hidden")} className={inputCls}>
                      <option value="0">No</option>
                      <option value="1">Yes</option>
                    </select>
                  </label>
                </div>
              </div>
            )}

            {tab === "sms" && (
              <div className="space-y-3">
                <label className="block"><span className={labelCls}>Phone number *</span><input value={fields.phone} onChange={set("phone")} placeholder="+91 98765 43210" inputMode="tel" className={inputCls} /></label>
                <label className="block"><span className={labelCls}>Message</span><textarea value={fields.message} onChange={set("message")} rows={3} placeholder="Pre-filled message…" className={cn(inputCls, "resize-y")} /></label>
              </div>
            )}

            {tab === "email" && (
              <div className="space-y-3">
                <label className="block"><span className={labelCls}>To *</span><input value={fields.to} onChange={set("to")} placeholder="hello@example.com" inputMode="email" className={inputCls} /></label>
                <label className="block"><span className={labelCls}>Subject</span><input value={fields.subject} onChange={set("subject")} placeholder="Subject line" className={inputCls} /></label>
                <label className="block"><span className={labelCls}>Body</span><textarea value={fields.body} onChange={set("body")} rows={3} placeholder="Email body…" className={cn(inputCls, "resize-y")} /></label>
              </div>
            )}

            {tab === "phone" && (
              <label className="block">
                <span className={labelCls}>Phone number *</span>
                <input value={fields.phone} onChange={set("phone")} placeholder="+91 98765 43210" inputMode="tel" className={inputCls} />
              </label>
            )}
          </div>

          {/* Fancy design picker - 22 styles, pro ones visible but locked */}
          <div>
            <span className={cn(labelCls, "flex items-center justify-between")}>
              QR style
              <span className="font-normal text-muted-foreground">
                {QR_DESIGNS.filter((d) => !d.pro).length} free ·{" "}
                {QR_DESIGNS.filter((d) => d.pro).length}{" "}
                <Crown className="inline h-3 w-3 text-amber-500" /> Pro
              </span>
            </span>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {QR_DESIGNS.map((d) => (
                <DesignThumb
                  key={d.id}
                  design={d}
                  active={d.id === designId}
                  locked={d.pro && !isPro}
                  onPick={() => pickDesign(d)}
                />
              ))}
            </div>
          </div>

          {/* Design controls */}
          <details className="group rounded-2xl border border-border">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <span className="transition group-open:rotate-90">▶</span> Customize design
              </span>
            </summary>
            <div className="space-y-4 border-t border-border p-4">
              <label className="block">
                <span className={labelCls}>Export size</span>
                <select value={size} onChange={(e) => { const v = Number(e.target.value); setSize(v); restyle({ size: v }); }} className={inputCls}>
                  {SIZES.map((s) => (
                    <option key={s} value={s}>{s} × {s} px</option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={labelCls}>Error correction{logo ? " · H (logo)" : ""}</span>
                  <select
                    value={ecLevel}
                    disabled={!!logo}
                    onChange={(e) => { const v = e.target.value as "L" | "M" | "Q" | "H"; setEcLevel(v); restyle({ ec: v }); }}
                    className={cn(inputCls, "disabled:opacity-60")}
                  >
                    {EC_LEVELS.map((l) => (
                      <option key={l.id} value={l.id}>{l.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={cn(labelCls, "flex items-center justify-between")}>
                    Quiet-zone margin <span className="tabular-nums text-muted-foreground">{margin}</span>
                  </span>
                  <input
                    type="range" min={0} max={8} step={1} value={margin}
                    onChange={(e) => { const v = Number(e.target.value); setMargin(v); restyle({ margin: v }); }}
                    className="mt-3 w-full accent-primary"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                  <span className="text-[13px] font-medium text-foreground/80">Code color</span>
                  <input type="color" value={fg} onChange={(e) => onColorPick("fg", e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-border bg-background" />
                </label>
                <label className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
                  <span className="text-[13px] font-medium text-foreground/80">Background</span>
                  <input type="color" value={bg} onChange={(e) => onColorPick("bg", e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-border bg-background" />
                </label>
              </div>

              {qrContrast < 2 && (
                <div className="rounded-xl border border-amber-400/50 bg-amber-50 px-3.5 py-2.5 text-[13px] font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-200" role="alert">
                  Low contrast between QR and background - the code may not scan reliably.
                </div>
              )}

              <div>
                <span className={labelCls}>Center logo <span className="font-normal text-muted-foreground">(optional)</span></span>
                {logoName ? (
                  <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2">
                    <span className="max-w-[220px] truncate text-sm font-medium">{logoName}</span>
                    <button type="button" onClick={clearLogo} className="rounded-lg p-1.5 text-muted-foreground hover:bg-background hover:text-foreground" aria-label="Remove logo">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button" onClick={() => logoRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-3 py-3 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                  >
                    <ImagePlus className="h-4 w-4" /> Upload logo (PNG/JPG)
                  </button>
                )}
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onLogoFile(e.target.files?.[0]); e.target.value = ""; }} />
              </div>
            </div>
          </details>

          <ActionButton busy={busy} disabled={!trial.canUse} onClick={generate}>
            <QrCode className="h-4 w-4" /> {busy ? "Generating…" : "Generate QR code"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free generations left - codes are created on your device.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-5">
            <div className={rendered ? "rounded-xl border border-border bg-white p-4" : "hidden"}>
              <canvas ref={canvasRef} width={size} height={size} className="max-h-[320px] max-w-full" />
            </div>
            {rendered ? (
              <>
                <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2">
                  <p className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground" title={payload.value}>
                    {payload.value}
                  </p>
                  <button
                    type="button"
                    onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold hover:border-primary/50"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit details
                  </button>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button" onClick={download}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
                >
                  <Download className="h-4 w-4" /> Save PNG ({size}px)
                </button>
                <button
                  type="button" onClick={copyPng}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-bold hover:border-primary/50"
                >
                  <Copy className="h-4 w-4" /> Copy
                </button>
                <button
                  type="button" onClick={downloadSvg} disabled={!trial.canUse}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-bold hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" /> SVG
                </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <QrCode className="mb-1 h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">Your QR code appears here</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Pick a content type above - URL, contact card, Wi-Fi, SMS, email or phone -
                  choose one of the {QR_DESIGNS.length} styles, then export up to 1024px.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
