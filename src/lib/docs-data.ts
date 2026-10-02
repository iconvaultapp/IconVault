/** Docs content for the /docs section. Single source of truth for the help center. */

export type DocBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "code"; label?: string; code: string }
  | { type: "tip"; text: string }
  | { type: "h"; text: string };

export interface DocSection {
  id: string;
  title: string;
  blocks: DocBlock[];
}

export const DOC_SECTIONS: DocSection[] = [
  {
    id: "getting-started",
    title: "Getting started",
    blocks: [
      {
        type: "p",
        text: "IconVault is a free library of 421,020 icons across 239 collections - every set from Material Symbols and Lucide to brand logos, emoji and flags, plus our exclusive in-house IconVault Originals set. Everything is served from our own edge network, so icons load instantly with no rate limits on browsing.",
      },
      {
        type: "list",
        items: [
          "Browse all sets on the App page - scroll, or jump to any collection from the sidebar.",
          "Search 421,020 icons by keyword, or use AI search to describe what you need in plain words.",
          "Click any icon for a detail view with copy-ready code in every format.",
          "Build a full logo + favicon kit in the Logo Builder tool.",
        ],
      },
      {
        type: "tip",
        text: "No account needed to browse, search and copy icons. Sign in only unlocks cloud collections, favourites and Pro features.",
      },
    ],
  },
  {
    id: "search",
    title: "Search & AI search",
    blocks: [
      {
        type: "p",
        text: "The search box searches icon names across all 239 collections at once. Results stream in as you type, ranked by relevance.",
      },
      { type: "h", text: "AI search" },
      {
        type: "p",
        text: "Describe the icon you need instead of guessing its name - e.g. “a dog wagging its tail” or “download arrow in a circle”. AI search understands intent, style and context, then returns the closest matches from the library.",
      },
      {
        type: "list",
        items: [
          "Works in plain English - no keyword guessing.",
          "Great for abstract concepts: “teamwork”, “fast delivery”, “secure payment”.",
          "Combine with collection filters to stay inside one icon family.",
        ],
      },
    ],
  },
  {
    id: "icon-detail",
    title: "Icon detail & export formats",
    blocks: [
      {
        type: "p",
        text: "Click any icon to open its detail modal. From there you can preview it at any size, on light and dark backgrounds, and copy production-ready code in one click.",
      },
      { type: "h", text: "Formats" },
      {
        type: "list",
        items: [
          "SVG - clean vector markup, ready to paste anywhere.",
          "React / Vue - framework components with props for size and color.",
          "Tailwind - utility-class snippet using currentColor.",
          "PNG - raster export at any size for docs and decks.",
          "Data URI - embed tiny icons directly in CSS.",
        ],
      },
      {
        type: "tip",
        text: "Most icons use currentColor, so they automatically inherit your text color - set the color once on a parent element.",
      },
    ],
  },
  {
    id: "collections",
    title: "Collections",
    blocks: [
      {
        type: "p",
        text: "Collections group icons into named packs per project: a brand kit, a dashboard set, a marketing pack. They sync across your devices when you are signed in, and you can export the whole set as SVG in one download.",
      },
      { type: "h", text: "Workflow" },
      {
        type: "list",
        items: [
          "Open the Collections page and create a collection with a name.",
          "Add icons from anywhere: the multi-select toggle on the icon browser, or the add button on an icon's detail view.",
          "Open a collection to preview every icon together, remove ones you don't need, and download the full set as a ZIP of SVGs.",
        ],
      },
      {
        type: "tip",
        text: "Name collections after the project, not the style - \"acme-dashboard\" stays useful long after you forget which icons felt right in October.",
      },
    ],
  },
  {
    id: "compare",
    title: "Compare icons",
    blocks: [
      {
        type: "p",
        text: "Choosing between three similar arrows? The Compare page puts candidate icons next to each other at real sizes, on light and dark surfaces, so you can judge them the way users will actually see them.",
      },
      {
        type: "list",
        items: [
          "Add icons to the comparison from the icon browser or a detail view.",
          "Toggle sizes and backgrounds to see how each candidate holds up at 16px in a tab versus 48px on a landing page.",
          "Pick the winner and copy its code straight from the comparison.",
        ],
      },
    ],
  },
  {
    id: "upload",
    title: "Upload custom icons",
    blocks: [
      {
        type: "p",
        text: "Bring your own SVGs into the same workspace as the open sets. Uploaded icons are cleaned, previewed at real sizes, and ready to export or share with your team - your private icons sit alongside the library without mixing into it.",
      },
      {
        type: "list",
        items: [
          "Open the Upload page and drop your .svg files.",
          "Each file is validated and cleaned on import, then previewed at multiple sizes so you can spot broken paths before you use them.",
          "Your uploads appear in your own private section and export exactly like library icons.",
        ],
      },
      {
        type: "tip",
        text: "Uploads are tied to your account, so sign in first - anonymous uploads cannot be recovered on another device.",
      },
    ],
  },
  {
    id: "design-tokens",
    title: "Design tokens",
    blocks: [
      {
        type: "p",
        text: "Design Tokens turns a saved icon set into tokens your codebase can consume directly: CSS custom properties, a JSON manifest, a Tailwind plugin, or typed TypeScript constants.",
      },
      {
        type: "list",
        items: [
          "Build a collection of the icons your project uses.",
          "Open Design Tokens, pick the collection and the output format.",
          "Copy the tokens into your project - CSS variables for stylesheets, the Tailwind plugin for utility classes, or TypeScript constants for component libraries.",
        ],
      },
      {
        type: "tip",
        text: "Regenerate tokens whenever the collection changes. Keeping the collection as the source of truth means icons and code never drift apart.",
      },
    ],
  },
  {
    id: "request",
    title: "Request an icon",
    blocks: [
      {
        type: "p",
        text: "Searched everything and the icon you need does not exist? Tell us what it should look like. We track requests, point you at the closest existing matches, and push popular ones upstream to the icon sets.",
      },
      {
        type: "list",
        items: [
          "Open the Request page and describe the icon: what it depicts, where you will use it, and any style notes.",
          "Check the near matches we suggest first - the icon you want may already exist under a different name.",
          "Popular requests get priority, and Pro members' requests jump the queue.",
        ],
      },
    ],
  },
  {
    id: "image-to-svg",
    title: "Image to SVG",
    blocks: [
      {
        type: "p",
        text: "Drop a PNG, JPG, WebP or GIF and get a true vector SVG back - shapes are traced and curves fitted in your browser, so nothing is uploaded. You see an interactive preview before downloading.",
      },
      { type: "h", text: "Controls" },
      {
        type: "list",
        items: [
          "Colors (2–16): fewer colors = cleaner, smaller SVGs. Pro unlocks up to 16.",
          "Detail slider: higher detail keeps fine edges but grows the file.",
          "Remove background: drops white/transparent backdrops for clean logo traces.",
        ],
      },
      {
        type: "tip",
        text: "Flat graphics, logos and illustrations trace beautifully. Photographs work but produce large, complex SVGs - lower the color count first.",
      },
      { type: "h", text: "Limits" },
      {
        type: "p",
        text: "5 free conversions per visitor, no account needed. Pro ($12/year) unlocks unlimited conversions, 16-color traces and batch ZIP export of up to 10 images.",
      },
    ],
  },
  {
    id: "og-image-generator",
    title: "OG Image Generator",
    blocks: [
      {
        type: "p",
        text: "Design the social preview cards shown when your links are shared on X, LinkedIn, Facebook, Slack and Discord. Presets: 1200×630 Open Graph, 1200×600 X card, 1200×627 LinkedIn, 1080×1080 square, 1080×1350 portrait, 1080×1920 story.",
      },
      { type: "h", text: "Workflow" },
      {
        type: "list",
        items: [
          "Type your headline and subheadline - text auto-shrinks and wraps to fit.",
          "Pick a Google Font, a gradient/solid/photo background, and an optional pattern overlay.",
          "Add a badge pill, upload your logo, and drop any of 421,020 icons onto the card.",
          "Export crisp PNG or JPG at 1x or retina 2x - or copy the image to your clipboard.",
        ],
      },
      {
        type: "tip",
        text: "Upload the PNG to your site and reference it with og:image + twitter:card meta tags. A sharp card can double click-through from shares.",
      },
      { type: "h", text: "Limits" },
      {
        type: "p",
        text: "5 free PNG exports per visitor. Pro unlocks unlimited exports and every template.",
      },
    ],
  },
  {
    id: "website-screenshot",
    title: "Website Screenshot",
    blocks: [
      {
        type: "p",
        text: "Capture pixel-perfect screenshots of any public URL - desktop (1280×800), laptop (1440×900), tablet (768×1024) and mobile (390×844) viewports. No extension or install needed.",
      },
      {
        type: "list",
        items: [
          "Paste the URL, pick a viewport, hit Capture - PNG in seconds.",
          "Use it for portfolios, competitor teardowns, bug reports and documentation.",
          "Only publicly reachable URLs can be captured (no localhost or login-walled pages).",
        ],
      },
      { type: "h", text: "Scroll Video" },
      {
        type: "p",
        text: "The Scroll Video tab records a real 5-second scrolling video of any page. Pick a format - MP4, WebM or GIF - and an aspect ratio: vertical 9:16 for Reels/Stories, square 1:1 for feeds, horizontal 16:9 for YouTube.",
      },
      {
        type: "list",
        items: [
          "The page pre-scrolls twice before recording, so lazy-loaded images and sections appear fully loaded.",
          "One smooth ease-in-out glide from top to bottom - preview in-page, then download.",
          "WebM and GIF are converted privately in your browser; the MP4 comes straight from the recording.",
        ],
      },
      { type: "h", text: "Limits" },
      {
        type: "p",
        text: "5 free captures per visitor (including 2 free full-page captures) plus 5 free scroll videos. Pro unlocks unlimited captures, unlimited videos, unlimited full-page screenshots and HD retina output.",
      },
    ],
  },
  {
    id: "image-compressor",
    title: "Image Compressor",
    blocks: [
      {
        type: "p",
        text: "Shrink PNG, JPG and WebP images by up to 80% - entirely in your browser. Your files are never uploaded, so client work stays private.",
      },
      { type: "h", text: "Workflow" },
      {
        type: "list",
        items: [
          "Drop up to 20 images at once.",
          "One click - the tool automatically picks the smallest format: transparent images become WebP, everything else becomes JPEG. Original dimensions are always kept.",
          "Drag the quality slider if you want smaller files or higher fidelity.",
          "Every file shows before/after size and % saved; download individually or as one ZIP.",
        ],
      },
      {
        type: "tip",
        text: "Compressed images are the fastest page-speed win there is - they directly improve Core Web Vitals and image SEO.",
      },
      { type: "h", text: "Limits" },
      {
        type: "p",
        text: "5 free compression runs per visitor. Pro unlocks unlimited runs and batch ZIP downloads.",
      },
    ],
  },
  {
    id: "thumbnail-maker",
    title: "Thumbnail Maker",
    blocks: [
      {
        type: "p",
        text: "Design 1280×720 YouTube thumbnails that get clicked: bold stroked headline text, a badge pill, high-contrast gradient or photo backgrounds, and stickers from the full icon library.",
      },
      {
        type: "list",
        items: [
          "Keep headlines to 3–5 words - text auto-sizes and wraps to 3 lines max.",
          "Drop any of 421,020 icons onto the canvas as a sticker, left or right.",
          "Tune text and stroke colors, then export a crisp PNG ready for YouTube Studio.",
        ],
      },
      {
        type: "tip",
        text: "The same 1280×720 canvas works for course covers, Twitch panels and podcast artwork.",
      },
      { type: "h", text: "Limits" },
      {
        type: "p",
        text: "5 free thumbnail exports per visitor. Pro unlocks unlimited exports and every template.",
      },
    ],
  },
  {
    id: "tools-hub",
    title: "Tools hub",
    blocks: [
      {
        type: "p",
        text: "The Tools hub is home to 579 free online tools across 17 categories: image tools, developer utilities, text tools, converters, generators and more. Every tool runs in your browser, so your files never leave your device.",
      },
      { type: "h", text: "Finding a tool" },
      {
        type: "list",
        items: [
          "Use the big search bar at the top of the Tools page - it filters all 579 tools as you type.",
          "Browse by category: click any of the 17 category chips, or open a category page to see every tool inside it.",
          "Deep links work too: a search like /tools?q=qr jumps straight to matching tools.",
        ],
      },
      { type: "h", text: "How tools work" },
      {
        type: "list",
        items: [
          "Each tool page has the same layout: the tool itself up top, then About, FAQs and related tags below.",
          "Free visitors get 5 uses per tool, no account needed. Usage is tracked per tool on your device.",
          "Pro ($12/year) unlocks unlimited runs of every tool.",
          "Tags under each tool are clickable - they lead to related tools and icon searches.",
        ],
      },
      {
        type: "tip",
        text: "This documentation covers the most popular tools in detail. Every other tool follows the same 5-free-uses pattern, with its own About section and FAQs on its page.",
      },
    ],
  },
  {
    id: "logo-builder",
    title: "Logo Builder",
    blocks: [
      {
        type: "p",
        text: "The Logo Builder turns any library icon into a complete brand mark: pick an icon, style the tile, add a wordmark, then export everything you need to ship.",
      },
      { type: "h", text: "Workflow" },
      {
        type: "list",
        items: [
          "1. Search the icon panel and click an icon to place it on the canvas.",
          "2. Pick a style preset - or tune background, gradient angle, corner radius, rotation and opacity yourself.",
          "3. Add effects: drop shadow, border stroke, and an optional wordmark underneath.",
          "4. Hit Shuffle for instant inspiration.",
          "5. Export PNG (1024px) or SVG free - or grab the full logo kit.",
        ],
      },
      { type: "h", text: "Full logo kit (Pro)" },
      {
        type: "p",
        text: "The ZIP kit includes favicon-16/32, apple-touch-icon (180), Android icons (192/512), the vector SVG, a ready site.webmanifest and an HTML <head> snippet - everything a developer needs to install your logo in one go.",
      },
    ],
  },
  {
    id: "batch-download",
    title: "Batch download",
    blocks: [
      {
        type: "p",
        text: "Select multiple icons anywhere in the app (use the multi-select toggle) and download them together as a ZIP of SVGs - or add PNG renders at 64, 256 and 1024px.",
      },
      {
        type: "list",
        items: [
          "Free accounts get 7 bulk downloads - plenty to try the workflow.",
          "Pro ($12/year) unlocks unlimited bulk downloads.",
          "ZIPs are generated in your browser; your selections never leave your device.",
        ],
      },
    ],
  },
  {
    id: "api",
    title: "REST API & API keys",
    blocks: [
      {
        type: "p",
        text: "Every icon is reachable over a simple REST API - perfect for scripts, build tools and internal dashboards. You can start without any account: keyless calls work under per-minute IP limits.",
      },
      {
        type: "code",
        label: "Search icons (no key needed)",
        code: "curl 'https://iconvault.site/api/iconify/search?query=shopping%20cart&limit=5'",
      },
      {
        type: "code",
        label: "Get one icon as SVG (no key needed)",
        code: "curl 'https://iconvault.site/api/icon/mdi/cart.svg'",
      },
      {
        type: "code",
        label: "Batch: many icons in one request",
        code: "curl -X POST 'https://iconvault.site/api/icons' \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"icons\": [\"mdi:cart\", \"lucide:heart\"]}'",
      },
      {
        type: "code",
        label: "List collections",
        code: "curl 'https://iconvault.site/api/iconify/collections'",
      },
      { type: "h", text: "Getting an API key" },
      {
        type: "list",
        items: [
          "Go to the API Access page and sign in.",
          "Give your key a name (e.g. \"my-build-script\") and click Generate.",
          "Copy the key immediately - it is shown only once. Store it somewhere safe, like an environment variable.",
          "You can revoke a key any time from the same page; revoking takes effect instantly.",
        ],
      },
      { type: "h", text: "Using your key" },
      {
        type: "p",
        text: "Send the key as the x-api-key header (or as an Authorization: Bearer token). One JSON request with your key counts as one unit against that key's monthly quota.",
      },
      {
        type: "code",
        label: "Search with your key",
        code: "curl 'https://iconvault.site/api/iconify/search?query=arrow&limit=20' \\\n  -H 'x-api-key: YOUR_KEY_HERE'",
      },
      { type: "h", text: "Limits and errors" },
      {
        type: "list",
        items: [
          "Keyless: 120 searches, 240 single-icon fetches and 120 batch calls per minute per IP.",
          "Keyed: 1,000 calls per 30-day window per key, with no per-minute cap. Repeat SVG fetches served from the edge cache are free and do not count.",
          "401 Invalid API key: the key is wrong, revoked, or missing where one is required. Check for typos and extra spaces.",
          "429 Too many requests: you hit a per-minute IP limit (keyless) or your key's monthly quota is exhausted. Wait a minute, or generate a fresh key next month.",
        ],
      },
      {
        type: "tip",
        text: "For production apps, pin the icon SVG in your own repo or CDN - the API is for discovery, not hot-linking at scale.",
      },
    ],
  },
  {
    id: "cli",
    title: "Command-line interface (CLI)",
    blocks: [
      {
        type: "p",
        text: "The IconVault CLI brings the icon library into your terminal: search 421,020 icons and download them as optimized SVGs without leaving your workflow. It is free, open source, and has zero dependencies (Node 18+ only).",
      },
      {
        type: "code",
        label: "Install once",
        code: "npm install -g @iconvault/cli",
      },
      {
        type: "code",
        label: "Or run without installing",
        code: "npx @iconvault/cli search \"shopping cart\"",
      },
      { type: "h", text: "Commands" },
      {
        type: "code",
        label: "Search: prints one prefix:name per line",
        code: "iconvault search \"shopping cart\"\niconvault search arrow --limit 5",
      },
      {
        type: "code",
        label: "Add: download one icon as an SVG",
        code: "iconvault add mdi:cart\niconvault add lucide:heart --out ./src/icons",
      },
      {
        type: "code",
        label: "Help and version",
        code: "iconvault --help\niconvault --version",
      },
      { type: "h", text: "Options" },
      {
        type: "list",
        items: [
          "--limit N: number of search results (default 20, max 999).",
          "--out DIR: output directory for add (default ./icons, created if missing).",
          "--api URL: point at a different API base (default https://iconvault.site).",
        ],
      },
      { type: "h", text: "Using an API key (optional)" },
      {
        type: "p",
        text: "Without a key you share the public per-minute IP limits. Set your key once and the CLI sends it automatically, giving you 1,000 calls a month with no per-minute cap.",
      },
      {
        type: "code",
        label: "Set your key for this shell",
        code: "export ICONVAULT_KEY=YOUR_KEY_HERE\niconvault search \"arrow\"",
      },
      {
        type: "tip",
        text: "Pipe search into add for quick sets: iconvault search \"arrow\" --limit 3 gives you names you can feed straight to iconvault add. Full reference lives on the CLI page.",
      },
    ],
  },
  {
    id: "embed-widget",
    title: "Embed widget",
    blocks: [
      {
        type: "p",
        text: "If your own product lets users pick icons (a dashboard, a CMS, a docs site), you do not have to build search and previews yourself. Paste one script tag and a live IconVault picker appears on your page.",
      },
      {
        type: "code",
        label: "html - paste where you want the picker",
        code: "<div data-iconvault-picker data-theme=\"light\"></div>\n<script src=\"https://iconvault.site/embed/v1.js\" defer></script>",
      },
      { type: "h", text: "Options" },
      {
        type: "code",
        label: "html - configure with data attributes",
        code: "<div\n  data-iconvault-picker\n  data-theme=\"dark\"\n  data-limit=\"24\"\n  data-query=\"arrow\"\n></div>",
      },
      {
        type: "list",
        items: [
          "data-theme: light or dark (default light).",
          "data-limit: results per search, 1 to 48.",
          "data-query: run this search as soon as the widget loads.",
        ],
      },
      {
        type: "tip",
        text: "The widget is vanilla JavaScript with no dependencies, so it works inside React, Vue, plain HTML, or any CMS that allows script tags. See it running live on the Embed page.",
      },
    ],
  },
  {
    id: "profile",
    title: "Your profile",
    blocks: [
      {
        type: "p",
        text: "Your profile page is mission control for your account: manage your display name, review saved icons and collections, check your plan, and copy your API key.",
      },
      { type: "h", text: "What lives here" },
      {
        type: "list",
        items: [
          "Plan status card: see whether you are on Free or Pro, with an upgrade button when you are not.",
          "Trial usage: a per-tool summary of your 5 free uses, read from your device.",
          "Quick picks: shortcuts back into your recent work.",
          "API key: copy your existing key without visiting the API Access page.",
        ],
      },
      { type: "h", text: "Leave a review" },
      {
        type: "p",
        text: "Signed-in users can publish a review from their profile. Reviews go into a moderation queue and appear on the homepage once approved - you will see your submission marked as pending until then.",
      },
    ],
  },
  {
    id: "history",
    title: "History",
    blocks: [
      {
        type: "p",
        text: "The History page keeps your search and icon trail: every query you typed and every icon you opened, newest first. Signed in, it follows you across devices; signed out, it stays on the device.",
      },
      {
        type: "list",
        items: [
          "Click any past search to re-run it instantly.",
          "Click any icon to jump back to its detail view.",
          "Clear history any time from the page - deletion is immediate and permanent.",
        ],
      },
    ],
  },
  {
    id: "pro",
    title: "Pro & billing",
    blocks: [
      {
        type: "p",
        text: "IconVault Pro is $12 per year: one plan that unlocks unlimited runs of every tool, unlimited bulk ZIP downloads, the full Logo Builder kit, and a 1,000-call monthly API quota with no per-minute cap.",
      },
      {
        type: "list",
        items: [
          "Unlimited runs of all 579 tools (free visitors get 5 uses per tool).",
          "Unlimited bulk ZIP downloads.",
          "Full Logo Builder kit export (favicons, app icons, manifest).",
          "API key with 1,000 calls/month and no per-minute limits.",
          "Priority for new collections and icon requests.",
        ],
      },
      {
        type: "p",
        text: "Payments are processed securely by Dodo Payments on a hosted checkout page. After payment you return to the site and your plan activates automatically - if it doesn't show within a minute, sign out and back in. Cancel any time from your profile page; you keep Pro access until the end of the billing period.",
      },
      {
        type: "tip",
        text: "Your receipts and current plan status live on your profile page under the plan card.",
      },
    ],
  },
  {
    id: "account",
    title: "Account: collections & favourites",
    blocks: [
      {
        type: "p",
        text: "Sign in (Google or email) to sync your stuff across devices.",
      },
      {
        type: "list",
        items: [
          "Favourites - heart any icon to keep it one click away.",
          "Collections - group icons into named sets for a project or brand.",
          "Recently viewed & search history - pick up exactly where you left off.",
          "Your plan status and billing receipts live in account settings.",
        ],
      },
    ],
  },
  {
    id: "roadmap",
    title: "Roadmap",
    blocks: [
      {
        type: "p",
        text: "Where IconVault is heading next - vote with your usage, we build what gets used.",
      },
      { type: "h", text: "In development" },
      {
        type: "list",
        items: [
          "VS Code extension - insert icons as you code, with inline previews.",
          "Figma plugin - search and drop 421,020 icons without leaving Figma.",
          "Chrome extension - find and copy icons from the toolbar.",
        ],
      },
      { type: "h", text: "Recently shipped" },
      {
        type: "list",
        items: [
          "CLI - npm install -g @iconvault/cli to search and download icons from your terminal.",
          "Embed widget - one script tag puts a live icon picker inside your product.",
          "API keys - generate a key on the API Access page for 1,000 calls/month.",
        ],
      },
      { type: "h", text: "Exploring" },
      {
        type: "list",
        items: [
          "AI icon generator - describe a brand-new icon, get original SVG.",
          "Team workspaces - shared collections, brand kits and roles.",
          "Icon audit for codebases - find unused or duplicated icons via MCP.",
        ],
      },
    ],
  },
  {
    id: "changelog",
    title: "Changelog",
    blocks: [
      {
        type: "p",
        text: "The Changelog page lists what shipped and when: new icon sets, new tools, API changes and fixes. Check it after an update if something looks different - breaking changes are called out explicitly.",
      },
      {
        type: "list",
        items: [
          "New collections and icon count updates.",
          "New tools added to the hub.",
          "API, CLI and widget changes with migration notes.",
          "Bug fixes worth knowing about.",
        ],
      },
    ],
  },
  {
    id: "faq",
    title: "FAQ",
    blocks: [
      { type: "h", text: "Is IconVault really free?" },
      {
        type: "p",
        text: "Yes - browsing, searching, copying and single downloads are free forever, and every tool gives you 5 free uses. Pro is an optional $12/year plan that unlocks unlimited everything.",
      },
      { type: "h", text: "Can I use the icons commercially?" },
      {
        type: "p",
        text: "Every collection keeps its original open-source license (MIT, Apache 2.0, CC0 and similar). The license is shown on each collection page - brand logos additionally carry trademark restrictions, so check before using those in a product.",
      },
      { type: "h", text: "Why do I need an account for the logo kit?" },
      {
        type: "p",
        text: "The kit is a Pro feature tied to your $12/year plan, so we need to know who you are. Browsing and single exports never need an account.",
      },
      { type: "h", text: "Do you add new icon sets?" },
      {
        type: "p",
        text: "Yes - the library tracks Iconify releases, so new collections and icon updates flow in regularly. Pro members can request priority additions.",
      },
    ],
  },
{
    id: "tool-svg-to-png",
    title: "SVG to PNG Converter",
    blocks: [
      {
        type: "p",
        text: "The SVG to PNG Converter rasterizes any SVG into a crisp PNG at 256, 512, 1024 or 2048px on the longest edge, or exports all four sizes as one ZIP. Everything happens in your browser - the SVG is drawn to a canvas locally and never uploaded anywhere.",
      },
      { type: "h", text: "How to use" },
      {
        type: "list",
        items: [
          "Paste your SVG markup into the text area, or upload an .svg file.",
          "Pick an output size - 256, 512, 1024 or 2048px. The aspect ratio is read from the SVG's viewBox so icons keep their proportions.",
          "Click Convert to PNG to render a live preview, then download that size.",
          "Need every size? Click All sizes ZIP to export 256 → 2048px in one download - ideal for favicon and app-icon sets.",
          "Use the 1x–4x scale presets, type a custom W×H, or pick a background: Transparent (default), White, Black, or any custom color for slide/print-safe exports.",
        ],
      },
      {
        type: "tip",
        text: "Transparency is preserved: transparent areas of the SVG stay transparent in the PNG, so the output works as overlays and logos on any background.",
      },
      {
        type: "p",
        text: "Free plan: 5 conversions per tool, no account needed. Pro ($12/year) unlocks unlimited conversions across all tools.",
      },
    ],
  },
  {
    id: "tool-svg-optimizer",
    title: "SVG Optimizer",
    blocks: [
      {
        type: "p",
        text: "The SVG Optimizer trims bloat from SVG files - comments, redundant whitespace and excess decimal precision - so they load faster. Design-tool exports from Illustrator, Figma and Inkscape typically shrink 20–60% with zero visual change.",
      },
      { type: "h", text: "How to use" },
      {
        type: "list",
        items: [
          "Paste your SVG markup into the text area.",
          "Pick your options: decimal precision (0–4 places), strip metadata/title/desc, remove empty or hidden elements, drop unused IDs and data-* attributes. Then click Optimize SVG.",
          "Check the before/after byte counts and the percentage saved.",
          "Copy the optimized markup or download it as an .svg file.",
        ],
      },
      {
        type: "tip",
        text: "Optimization is lossless for rendering: it only removes non-visual data. If your file is already clean, the tool tells you honestly that there's nothing to shrink.",
      },
      {
        type: "p",
        text: "Free plan: 5 optimizations per tool, no account needed. Pro ($12/year) unlocks unlimited runs across all tools.",
      },
    ],
  },
  {
    id: "tool-svg-to-jsx",
    title: "SVG to JSX Converter",
    blocks: [
      {
        type: "p",
        text: "The SVG to JSX Converter turns raw SVG markup into framework-ready components: JSX, typed TSX, Vue or Svelte. Kebab-case attributes are mapped to camelCase (stroke-width → strokeWidth, class → className) and tags are self-closed, fixing the two things that break SVGs pasted straight into React.",
      },
      { type: "h", text: "How to use" },
      {
        type: "list",
        items: [
          "Paste your SVG markup (it must contain an <svg> tag).",
          "Pick the output tab: JSX, TSX, Vue or Svelte.",
          "Click Convert - switching tabs re-converts instantly from the same input.",
          "Copy the code and paste it into your project. The TSX output spreads props onto the root element, so className, style and onClick work out of the box.",
          "Extras: a TypeScript toggle for typed props, Icon mode (strips width/height → 1em sizing so icons scale with font-size), an editable component name, and a {...props} spread toggle.",
        ],
      },
      {
        type: "tip",
        text: "Seeing 'Invalid DOM property' warnings in React? That's almost always a kebab-case attribute like stroke-width - paste the SVG through this converter and they're fixed automatically.",
      },
      {
        type: "p",
        text: "Free plan: 5 conversions per tool, no account needed. Pro ($12/year) unlocks unlimited conversions across all tools.",
      },
    ],
  },
  {
    id: "tool-svg-to-data-uri",
    title: "SVG to Data URI",
    blocks: [
      {
        type: "p",
        text: "The SVG to Data URI generator encodes your SVG into a data:image/svg+xml URI for use as a CSS background-image or an HTML <img> src. The output is URL-encoded, so # in fill colors becomes %23 - the fix for the most common reason hand-made SVG data URIs fail in Firefox.",
      },
      { type: "h", text: "How to use" },
      {
        type: "list",
        items: [
          "Paste your SVG markup into the text area.",
          "Click Generate data URI.",
          "Copy the CSS background-image rule or the HTML embed snippet - both are ready to paste. The format selector also gives you the raw URI or a CSS mask pair.",
          "Decode mode reverses it: paste any data URI (base64 or URL-encoded) and get the original SVG back - handy when debugging someone else\u2019s CSS.",
          "Check the data URI byte length to decide whether a data URI or a separate file is the better choice for that graphic.",
        ],
      },
      {
        type: "tip",
        text: "Use data URIs for small decorative graphics like icons and patterns - they save an HTTP request. For large or heavily reused SVGs, a separate cached file or an SVG sprite is usually better.",
      },
      {
        type: "p",
        text: "Free plan: 5 generations per tool, no account needed. Pro ($12/year) unlocks unlimited runs across all tools.",
      },
    ],
  },
  {
    id: "tool-svg-sprite-generator",
    title: "SVG Sprite Generator",
    blocks: [
      {
        type: "p",
        text: "The SVG Sprite Generator merges multiple SVGs into one sprite.svg file, where each icon becomes a <symbol> with its own id and viewBox. One cached file then serves your whole icon set, referenced anywhere with <svg><use href=\"sprite.svg#icon-name\"></use></svg>.",
      },
      { type: "h", text: "How to use" },
      {
        type: "list",
        items: [
          "Add an entry per SVG: give it a name (this becomes the symbol id) and paste its markup.",
          "Use Add another SVG for as many icons as you need; remove entries you don't want.",
          "Click Generate sprite. Each SVG needs a viewBox - entries without one are skipped with a warning.",
          "Download sprite.svg, or copy the sprite markup. Every symbol now has its own Copy-usage button with a ready <svg><use href=\"#id\"/></svg> snippet - and a currentColor toggle makes the whole sprite recolorable via CSS.",
        ],
      },
      {
        type: "tip",
        text: "Keep fills out of your symbol markup and style with fill: currentColor - your icons then inherit the surrounding text color, the standard technique for themable icon systems.",
      },
      {
        type: "p",
        text: "Free plan: 5 sprite generations per tool, no account needed. Pro ($12/year) unlocks unlimited runs across all tools.",
      },
    ],
  },
{
    id: "image-resizer",
    title: "Image Resizer",
    blocks: [
      {
        type: "p",
        text: "The Image Resizer changes the pixel dimensions of up to 10 images at once, entirely in your browser. Scale by percentage, type exact dimensions, or lock the aspect ratio - then export to PNG, JPG or WebP and download individually or as a ZIP.",
      },
      { type: "h", text: "How to resize" },
      {
        type: "list",
        items: [
          "Drop up to 10 images onto the upload zone (PNG, JPG, WebP).",
          "Drag the scale slider, or type an exact width × height to override it.",
          "Keep “lock aspect ratio” checked and fill only one side to scale proportionally.",
          "Choose the output format and click Resize, then download each file or the ZIP.",
        ],
      },
      {
        type: "tip",
        text: "For crisp results, always resize from the largest source you have. Downscaling keeps detail; upscaling a small image will look soft.",
      },
      {
        type: "p",
        text: "Limits: 10 images per run, 8192px max per side. Every visitor gets 5 free resizing runs - IconVault Pro ($12/year) unlocks unlimited runs of every tool. Your files never leave your device.",
      },
    ],
  },
  {
    id: "favicon-generator",
    title: "Favicon Generator",
    blocks: [
      {
        type: "p",
        text: "The Favicon Generator renders all five standard favicon sizes - 16, 32, 180, 192 and 512px - from any of 421,020 library icons or an image you upload. Every individual PNG download is free.",
      },
      { type: "h", text: "How to generate favicons" },
      {
        type: "list",
        items: [
          "Search the library and pick an icon, or upload your own image.",
          "Click “Generate favicons” - all five sizes render instantly in your browser.",
          "Download any PNG free, or grab the full favicon kit ZIP (Pro) with all PNGs plus a site.webmanifest.",
          "Reference the files in your HTML head with <link rel=\"icon\"> tags.",
        ],
      },
      {
        type: "tip",
        text: "At 16px, fine detail disappears. A single bold glyph from the icon library stays recognizable in a browser tab where a detailed logo turns to mush.",
      },
      {
        type: "p",
        text: "Limits: 5 free generations per visitor; individual PNGs are always free. The full kit ZIP is a Pro feature - IconVault Pro is $12/year, with unlimited runs of every tool.",
      },
    ],
  },
  {
    id: "png-to-ico",
    title: "PNG to ICO Converter",
    blocks: [
      {
        type: "p",
        text: "The PNG to ICO Converter builds a real, standards-compliant Windows .ico file from your PNG - header, per-size directory entries and PNG-compressed image data - so it works as favicon.ico and as a Windows shortcut or taskbar icon.",
      },
      { type: "h", text: "How to convert" },
      {
        type: "list",
        items: [
          "Drop a square PNG (simple design, transparent background works best).",
          "Choose which sizes to include - 16, 32 and 48 are selected by default.",
          "Click “Download .ico”. The file is built locally and downloads instantly.",
          "Place it at your site root as /favicon.ico, or use it as a Windows app icon.",
        ],
      },
      {
        type: "tip",
        text: "Include all three sizes. Windows and browsers automatically pick the sharpest entry for each context - a 16px-only ICO looks blurry on high-DPI displays.",
      },
      {
        type: "p",
        text: "Limits: 5 free conversions per visitor, no account needed. IconVault Pro ($12/year) unlocks unlimited conversions and unlimited runs of every tool. Files never leave your device.",
      },
    ],
  },
  {
    id: "qr-generator",
    title: "QR Code Generator",
    blocks: [
      {
        type: "p",
        text: "The QR Code Generator turns URLs, text, Wi-Fi credentials and contact snippets into scannable QR codes. Export crisp black-on-white PNGs at 256, 512 or 1024px - sharp enough for cards, posters and packaging.",
      },
      { type: "h", text: "How to generate" },
      {
        type: "list",
        items: [
          "Type or paste your content - a URL, plain text, or Wi-Fi in the form WIFI:T:WPA;S:Name;P:Password;;",
          "Pick an export size: 1024px for print, 512px for screens.",
          "Style it: set error-correction (L/M/Q/H), QR and background colors, quiet-zone margin, or upload a center logo (auto-switches to H correction).",
          "Click “Generate QR code”, scan it with your phone to verify, then download the PNG.",
        ],
      },
      {
        type: "tip",
        text: "These are static codes: the content is encoded directly in the pattern, so they never expire, need no account, and are never tracked.",
      },
      {
        type: "p",
        text: "Limits: 5 free generations per visitor. IconVault Pro ($12/year) unlocks unlimited QR codes plus unlimited runs of every tool. Everything is generated on your device.",
      },
    ],
  },
  {
    id: "gradient-generator",
    title: "Gradient Generator",
    blocks: [
      {
        type: "p",
        text: "The Gradient Generator is a visual builder for CSS gradients. Set the angle, stack unlimited color stops with per-stop position sliders, toggle linear or radial, and copy clean CSS while a live preview updates in real time.",
      },
      { type: "h", text: "How to build a gradient" },
      {
        type: "list",
        items: [
          "Start from one of 12 curated presets (Sunset, Ocean, Neon…) or choose linear/radial and build from scratch.",
          "For linear, drag the angle slider (0–360°).",
          "Add color stops, pick each color, and drag position sliders to shape the blend.",
          "Click “Copy CSS” and paste the linear-gradient() or radial-gradient() declaration into your stylesheet.",
        ],
      },
      {
        type: "tip",
        text: "In Tailwind, paste the value as an arbitrary property - bg-[linear-gradient(135deg,#7c3aed_0%,#ec4899_100%)] - using underscores instead of spaces.",
      },
      {
        type: "p",
        text: "Limits: 5 free CSS copies per visitor. IconVault Pro ($12/year) unlocks unlimited copies and unlimited runs of every tool. No account needed to experiment.",
      },
    ],
  },
{
    id: "tool-color-converter",
    title: "Color Converter",
    blocks: [
      {
        type: "p",
        text: "The Color Converter translates any color between HEX, RGB, HSL, HSV, HWB, CMYK, CIE-LAB and LCH in real time - plus 100+ named colors. Type a value in any field, use the visual picker, or search a name, and every other format updates instantly.",
      },
      { type: "h", text: "Workflow" },
      {
        type: "list",
        items: [
          "1. Pick a color, type a HEX/RGB/HSL/HSV/CMYK/HWB value, or search a named color.",
          "2. All fields sync both ways - edit RGB and every format updates live.",
          "3. Explore harmonies (complementary, triadic, tetradic…) and shades/tints - tap any swatch to use it.",
          "4. Check WCAG contrast against black/white, then hit Copy on any format or export CSS variables.",
        ],
      },
      { type: "tip", text: "Use HSL when you want to nudge a color's lightness or saturation without changing its hue - much easier than editing RGB channels." },
      {
        type: "p",
        text: "5 free copies per visitor. Pro ($12/year) unlocks unlimited conversions across all tools. Everything runs in your browser - nothing is uploaded.",
      },
    ],
  },
  {
    id: "tool-contrast-checker",
    title: "Contrast Checker",
    blocks: [
      {
        type: "p",
        text: "The Contrast Checker computes the WCAG 2.1 contrast ratio between a text color and a background color, renders a live preview of your exact pairing, and scores it against all four bars: AA normal, AA large, AAA normal and AAA large.",
      },
      { type: "h", text: "Workflow" },
      {
        type: "list",
        items: [
          "1. Enter or pick the text (foreground) color and the background color.",
          "2. Press Check contrast - the ratio (e.g. 4.52:1) appears instantly.",
          "3. Read the pass/fail pills: green means the pairing meets that WCAG bar.",
          "4. Adjust the darker or lighter color until AA normal (≥ 4.5:1) passes - or hit Suggest AA fix to auto-nudge the text color to the nearest passing shade.",
          "5. Use Swap colors to flip foreground and background in one click.",
        ],
      },
      { type: "tip", text: "Light gray text on white almost always fails AA - e.g. #9ca3af on white is only ~3.5:1. Darken the text until the badge turns green." },
      {
        type: "p",
        text: "5 free checks per visitor. Pro ($12/year) unlocks unlimited checks. The math runs entirely in your browser - nothing is uploaded.",
      },
    ],
  },
  {
    id: "tool-box-shadow-generator",
    title: "Box Shadow Generator",
    blocks: [
      {
        type: "p",
        text: "The Box Shadow Generator designs CSS box-shadows visually: sliders for X/Y offset, blur and spread, a color picker with opacity control, and an inset toggle - with a live preview on a real card and one-click CSS copy.",
      },
      { type: "h", text: "Workflow" },
      {
        type: "list",
        items: [
          "1. Start from a preset (Soft card, Floating, Glow, Neumorphic…) or drag the offset, blur and spread sliders while watching the live preview.",
          "2. Pick a shadow color and set opacity - soft realistic shadows use black at 10–35% opacity.",
          "3. Tick Inset for pressed-button or inner-glow effects.",
          "4. Copy the generated box-shadow declaration into your stylesheet.",
        ],
      },
      { type: "tip", text: "Blur softens the edge, spread changes the size. For crisp tight shadows, keep blur low and spread slightly negative." },
      {
        type: "p",
        text: "5 free copies per visitor. Pro ($12/year) unlocks unlimited copies across all tools. Everything runs in your browser - nothing is uploaded.",
      },
    ],
  },
  {
    id: "tool-json-formatter",
    title: "JSON Formatter",
    blocks: [
      {
        type: "p",
        text: "The JSON Formatter pretty-prints messy JSON with 2-space indentation, minifies it for production, and validates it with plain-English error messages. Upload .json files straight from your computer.",
      },
      { type: "h", text: "Workflow" },
      {
        type: "list",
        items: [
          "1. Paste JSON or upload a .json file (or try Load sample).",
          "2. Press Format (2-space) for readable output, Minify for the smallest valid string, or Validate for a quick pass/fail. Tick Sort keys to alphabetize object keys recursively.",
          "3. Invalid JSON shows the exact parse error and its position - usually a trailing comma, single quotes or unquoted keys.",
          "4. Copy the output or download it as formatted.json.",
        ],
      },
      { type: "tip", text: "Parsing happens with your browser's own JSON.parse - safe for API keys and private payloads, since the data never leaves your device." },
      {
        type: "p",
        text: "5 free format/minify runs per visitor; validation is unlimited. Pro ($12/year) unlocks unlimited runs across all tools.",
      },
    ],
  },
  {
    id: "tool-base64",
    title: "Base64 Encoder / Decoder",
    blocks: [
      {
        type: "p",
        text: "Encode any text to Base64 and decode Base64 back to text - fully Unicode-safe, so emoji and non-Latin scripts round-trip correctly. The File tab converts any file into a Base64 data URL for inlining images, fonts and assets into HTML, CSS or JSON.",
      },
      { type: "h", text: "Workflow" },
      {
        type: "list",
        items: [
          "1. Text tab: paste text and press Encode, or paste Base64 and press Decode. The tool auto-detects the direction on paste, and a Standard / URL-safe toggle handles base64url (as used in JWTs).",
          "2. File tab: choose a file to get a data URL like data:image/png;base64,....",
          "3. Copy the result - the character count is shown so you can judge payload size.",
          "4. Paste data URLs straight into <img src>, CSS backgrounds or JSON payloads.",
        ],
      },
      { type: "tip", text: "Base64 is an encoding, not encryption - never use it to hide secrets. It's for transporting binary data through text-only channels." },
      {
        type: "p",
        text: "5 free conversions per visitor. Pro ($12/year) unlocks unlimited conversions across all tools. Encoding runs locally in your browser - nothing is uploaded.",
      },
    ],
  },
{
    id: "jwt-decoder",
    title: "JWT Decoder",
    blocks: [
      {
        type: "p",
        text: "The JWT Decoder turns a compact auth token into readable JSON - header, payload, expiry and raw signature - entirely in your browser. Nothing you paste ever leaves your machine.",
      },
      { type: "h", text: "How to use it" },
      {
        type: "list",
        items: [
          "Copy the full token (header.payload.signature) from your app, DevTools or API response.",
          "Paste it into the decoder and hit Decode token.",
          "Optional: enter the HMAC secret to verify the signature (HS256/HS384/HS512) - the secret never leaves your browser.",
          "Read the header (algorithm, type) and payload (claims) as formatted JSON - copy either with one click.",
          "Check the expiry badge: green means valid, red shows how long ago it expired.",
          "Remember: this tool only decodes - it never verifies the signature. Verify tokens on your server.",
        ],
      },
      {
        type: "tip",
        text: "Debugging an “invalid token” error? Compare the alg in the header with what your server expects, and check iat/nbf/exp against your server clock - clock skew causes most failures.",
      },
      {
        type: "p",
        text: "Free plan: 5 decodes per tool. IconVault Pro ($12/year) unlocks unlimited decodes and every other developer tool.",
      },
    ],
  },
  {
    id: "regex-tester",
    title: "Regex Tester",
    blocks: [
      {
        type: "p",
        text: "The Regex Tester is a live workbench for JavaScript regular expressions: type a pattern, toggle flags, paste a test string, and see matches highlighted with capture groups listed - all in your browser.",
      },
      { type: "h", text: "How to use it" },
      {
        type: "list",
        items: [
          "Type your pattern in the pattern field (no slashes needed).",
          "Toggle flags: g (global), i (ignore case), m (multiline), s (dotall), u (unicode), y (sticky).",
          "Paste a test string and hit Test - matches are highlighted inline, with index and groups under Match details.",
          "If the pattern is invalid, the red error shows the engine's exact complaint - fix it and re-test.",
          "Use Copy /pattern/flags to drop the literal straight into your JavaScript.",
          "Try the Replace panel: enter a replacement with $1-style backreferences and preview the result before touching your code.",
        ],
      },
      {
        type: "tip",
        text: "It uses your browser's real RegExp engine, so behavior matches your code exactly. All matches are shown even without the g flag - enable it anyway before copying the pattern into production code.",
      },
      {
        type: "p",
        text: "Free plan: 5 tests per tool. IconVault Pro ($12/year) unlocks unlimited tests and every other developer tool.",
      },
    ],
  },
  {
    id: "timestamp-converter",
    title: "Timestamp Converter",
    blocks: [
      {
        type: "p",
        text: "The Timestamp Converter translates Unix epoch values into human-readable dates - and back. It handles both seconds and milliseconds, shows UTC, local time and relative time, and runs fully client-side.",
      },
      { type: "h", text: "How to use it" },
      {
        type: "list",
        items: [
          "Epoch → date: paste the number - seconds, milliseconds, microseconds and nanoseconds are auto-detected by digit length (a “detected: …” label confirms it). You get UTC ISO, local time and a relative phrase.",
          "The duration calculator converts seconds to and from 1d 2h 3m 4s notation, both ways, live - handy for TTL and cache debugging.",
          "Date → epoch: pick a date/time and hit Convert to epoch - you get both epoch seconds (most APIs) and milliseconds (JavaScript).",
          "Use the Now button to fill the current time instantly.",
          "Click any UTC or Local result to copy it.",
        ],
      },
      {
        type: "tip",
        text: "A timestamp that lands in 1970 means you fed seconds where milliseconds were expected (or vice versa). 10 digits = seconds, 13 digits = milliseconds - flip the unit toggle.",
      },
      {
        type: "p",
        text: "Free plan: 5 conversions per tool. IconVault Pro ($12/year) unlocks unlimited conversions and every other developer tool.",
      },
    ],
  },
  {
    id: "url-encoder",
    title: "URL Encoder / Decoder",
    blocks: [
      {
        type: "p",
        text: "The URL Encoder / Decoder handles percent-encoding the way browsers do: encodeURIComponent for single query values, encodeURI for full URLs, and a smart decode mode - all in your browser.",
      },
      { type: "h", text: "How to use it" },
      {
        type: "list",
        items: [
          "Pick a mode: encodeURIComponent (query param) encodes everything unsafe; encodeURI (full URL) keeps : / ? & = # intact; Decode reverses %XX sequences.",
          "Paste your text and hit Encode/Decode - the output appears with a Copy button.",
          "Use “Use as input” to move the output back and round-trip the conversion.",
          "The char counter shows how much the string grew - useful for spotting double-encoding.",
        ],
      },
      {
        type: "tip",
        text: "Double-encoded %2520 (a % that got encoded again) is the most common URL bug. If you see %25 in output where you expected plain text, decode once more.",
      },
      {
        type: "p",
        text: "Free plan: 5 encodes/decodes per tool. IconVault Pro ($12/year) unlocks unlimited use and every other developer tool.",
      },
    ],
  },
  {
    id: "uuid-generator",
    title: "UUID Generator",
    blocks: [
      {
        type: "p",
        text: "The UUID Generator creates cryptographically secure version 4 UUIDs with the browser's built-in crypto.randomUUID() - 1, 10, 50 or 100 at a time, with per-item and batch copy. Nothing is sent anywhere.",
      },
      { type: "h", text: "How to use it" },
      {
        type: "list",
        items: [
          "Choose how many UUIDs you need: 1, 10, 50 or 100 - in v4 or time-ordered v7 (RFC 9562, the modern default for database keys), with uppercase and no-dashes format options.",
          "Hit Generate - the batch appears instantly.",
          "Click the copy icon next to any UUID, or Copy all for the whole batch as newline-separated text.",
          "Paste straight into database seeds, API keys, config files or test fixtures.",
        ],
      },
      {
        type: "tip",
        text: "These are v4 (random) UUIDs - ideal for distributed IDs. If your database expects a specific format (no dashes, uppercase), transform the copied batch in any editor; the randomness is what matters.",
      },
      {
        type: "p",
        text: "Free plan: 5 generations per tool. IconVault Pro ($12/year) unlocks unlimited generations and every other developer tool.",
      },
    ],
  },
{
    id: "tool-password-generator",
    title: "Password Generator",
    blocks: [
      {
        type: "p",
        text: "The Password Generator creates cryptographically secure random passwords with your browser's built-in random number generator. Nothing is sent to a server or stored - the password exists only in your tab.",
      },
      { type: "h", text: "How to use it" },
      {
        type: "list",
        items: [
          "Drag the length slider (8–64 characters) - 16+ is recommended for important accounts.",
          "Toggle lowercase, uppercase, digits and symbols to shape the character set - or exclude ambiguous characters (l, 1, I, 0, O).",
          "Switch to the Passphrase tab for memorable multi-word passwords: 3–12 words, your choice of separator, optional capitalization and a trailing number.",
          "Hit Generate password and watch the live entropy meter - aim for 80+ bits (Strong).",
          "Copy the result into your password manager.",
        ],
      },
      {
        type: "tip",
        text: "Generate one unique password per account and store them in a password manager. Reusing one strong password everywhere is worse than unique weaker ones.",
      },
      {
        type: "p",
        text: "Limits: 5 free generations per visitor, no account needed. IconVault Pro ($12/year) unlocks unlimited generations.",
      },
    ],
  },
  {
    id: "tool-diff-checker",
    title: "Diff Checker",
    blocks: [
      {
        type: "p",
        text: "The Diff Checker compares two pieces of text line by line and highlights every change - red for removed lines, green for added lines - with a count of additions and deletions.",
      },
      { type: "h", text: "How to use it" },
      {
        type: "list",
        items: [
          "Paste the original text into the left box and the modified text into the right box.",
          "Hit Compare - the diff renders below with line numbers, and changed characters inside modified lines are highlighted inline.",
          "Red lines with − exist only in the original; green lines with + exist only in the modified text.",
          "Dim lines are unchanged and shown for context.",
        ],
      },
      {
        type: "tip",
        text: "Works on any plain text: essays, code, JSON, YAML, CSV and configs. Keep each side under ~3,000 lines for instant results.",
      },
      {
        type: "p",
        text: "Limits: 5 free comparisons per visitor, no account needed. IconVault Pro ($12/year) unlocks unlimited comparisons.",
      },
    ],
  },
  {
    id: "tool-hash-generator",
    title: "Hash Generator",
    blocks: [
      {
        type: "p",
        text: "The Hash Generator computes MD5, SHA-1, SHA-256, SHA-384 and SHA-512 digests of any text, all at once. SHA hashes use your browser's WebCrypto; MD5 uses a standards-compliant inline implementation.",
      },
      { type: "h", text: "How to use it" },
      {
        type: "list",
        items: [
          "Paste or type any text into the input box.",
          "Hit Generate hashes - all five digests appear instantly.",
          "Use the copy button on any row to copy that hash.",
          "SHA-256 is the safe default for checksums and integrity checks.",
          "HMAC mode signs text with your secret key (HMAC-SHA-256/512) - handy for debugging webhook signatures. Paste an expected hash to get a green Match / red Mismatch verdict.",
        ],
      },
      {
        type: "tip",
        text: "Hashes are one-way: great for checksums, cache keys and Gravatar URLs. Never store passwords as fast hashes - use bcrypt, scrypt or Argon2 instead.",
      },
      {
        type: "p",
        text: "Limits: 5 free generations per visitor, no account needed. IconVault Pro ($12/year) unlocks unlimited hashing.",
      },
    ],
  },
  {
    id: "tool-markdown-preview",
    title: "Markdown Preview",
    blocks: [
      {
        type: "p",
        text: "Markdown Preview is a live two-pane editor: write Markdown on the left, see styled HTML on the right. Script tags and event handlers are stripped so the output is safe to embed.",
      },
      { type: "h", text: "How to use it" },
      {
        type: "list",
        items: [
          "Type or paste Markdown in the left pane - the preview updates live.",
          "Supports headings, bold/italic, lists, links, images, blockquotes, syntax-highlighted code blocks and tables.",
          "Hit Copy HTML to grab clean, embed-ready markup for your site, CMS or newsletter.",
        ],
      },
      {
        type: "tip",
        text: "Previewing is unlimited and free forever - only copying the HTML counts as a use.",
      },
      {
        type: "p",
        text: "Limits: 5 free HTML copies per visitor, no account needed. IconVault Pro ($12/year) unlocks unlimited copies.",
      },
    ],
  },
  {
    id: "tool-lorem-ipsum",
    title: "Lorem Ipsum Generator",
    blocks: [
      {
        type: "p",
        text: "The Lorem Ipsum Generator produces classic placeholder text for mockups, wireframes and font previews - starting with the authentic “Lorem ipsum dolor sit amet…” passage.",
      },
      { type: "h", text: "How to use it" },
      {
        type: "list",
        items: [
          "Choose paragraphs, sentences or words from the dropdown.",
          "Set a count between 1 and 50.",
          "Hit Generate text, then Copy text to paste it into your design.",
          "Output format selector: plain text, HTML paragraphs, or an HTML bullet list - the format applies without regenerating.",
        ],
      },
      {
        type: "tip",
        text: "Use \"words\" for character-limited UI copy and \"paragraphs\" for full layout drafts. Replace placeholder text with real copy before launch.",
      },
      {
        type: "p",
        text: "Limits: 5 free generations per visitor, no account needed. IconVault Pro ($12/year) unlocks unlimited generations.",
      },
    ],
  },
];
