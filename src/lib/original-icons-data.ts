// IconVault v55 — ORIGINAL icon collections (metadata only; SVG files live under
// /original-icons/<collection>/<slug>.svg and are served as plain static files).
// Every SVG here was hand-authored for this release (simple geometric stroke shapes).
// They are NOT copied, scraped or traced from any existing set, and they are NOT part
// of the third-party Iconify dataset. Free to browse and download (signup gate applies
// to downloads site-wide, like everything else in v55).

export interface OriginalIcon { slug: string; title: string; keywords: string; file: string; }
export interface OriginalCollection { slug: string; title: string; description: string; icons: OriginalIcon[]; }

export const ORIGINAL_COLLECTIONS: OriginalCollection[] = [
  { slug: "ai-tools", title: "AI Tools", description: "Original icons for AI products: bots, chips, neural nets and prompts.", icons: [
    { slug: "bot", title: "Bot", keywords: "robot,chatbot,assistant,ai", file: "bot.svg" },
    { slug: "chip", title: "Chip", keywords: "processor,hardware,ai chip", file: "chip.svg" },
    { slug: "neural-network", title: "Neural Network", keywords: "neural,network,nodes,machine learning", file: "neural-network.svg" },
    { slug: "sparkles", title: "Sparkles", keywords: "sparkle,magic,generate,ai", file: "sparkles.svg" },
    { slug: "model-cube", title: "Model Cube", keywords: "model,3d,llm", file: "model-cube.svg" },
    { slug: "prompt-terminal", title: "Prompt Terminal", keywords: "prompt,terminal,cli,command", file: "prompt-terminal.svg" },
    { slug: "brain-circuit", title: "Brain Circuit", keywords: "brain,circuit,ai,mind", file: "brain-circuit.svg" },
    { slug: "eye-scan", title: "Eye Scan", keywords: "vision,scan,eye,recognition", file: "eye-scan.svg" },
    { slug: "chat-spark", title: "Chat Spark", keywords: "chat,message,ai chat", file: "chat-spark.svg" },
    { slug: "wand-spark", title: "Wand Spark", keywords: "wand,generate,magic", file: "wand-spark.svg" },
    { slug: "database-brain", title: "Database Brain", keywords: "database,vector,embeddings", file: "database-brain.svg" },
    { slug: "cpu-spark", title: "Cpu Spark", keywords: "cpu,processor,ai", file: "cpu-spark.svg" },
    { slug: "gauge-ai", title: "Gauge Ai", keywords: "gauge,meter,score,confidence", file: "gauge-ai.svg" },
    { slug: "layers-model", title: "Layers Model", keywords: "layers,stack,model", file: "layers-model.svg" },
    { slug: "code-brain", title: "Code Brain", keywords: "code,ai code,copilot", file: "code-brain.svg" },
    { slug: "search-ai", title: "Search Ai", keywords: "search,ai search,find", file: "search-ai.svg" },
    { slug: "image-ai", title: "Image Ai", keywords: "image,generate,art", file: "image-ai.svg" },
    { slug: "voice-wave", title: "Voice Wave", keywords: "voice,audio,speech", file: "voice-wave.svg" },
    { slug: "shield-ai", title: "Shield Ai", keywords: "shield,safety,guardrail", file: "shield-ai.svg" },
    { slug: "data-flow", title: "Data Flow", keywords: "flow,pipeline,data", file: "data-flow.svg" },
  ] },
  { slug: "diwali", title: "Diwali", description: "Original festive icons: diyas, rangoli, fireworks and sweets.", icons: [
    { slug: "diya", title: "Diya", keywords: "diya,lamp,diwali,light", file: "diya.svg" },
    { slug: "diya-flame", title: "Diya Flame", keywords: "flame,fire,light", file: "diya-flame.svg" },
    { slug: "rangoli", title: "Rangoli", keywords: "rangoli,pattern,floor art", file: "rangoli.svg" },
    { slug: "firework", title: "Firework", keywords: "firework,cracker,celebration", file: "firework.svg" },
    { slug: "firework-burst", title: "Firework Burst", keywords: "burst,sparkle,celebration", file: "firework-burst.svg" },
    { slug: "lantern-kandil", title: "Lantern Kandil", keywords: "lantern,kandil,light", file: "lantern-kandil.svg" },
    { slug: "sweets-laddu", title: "Sweets Laddu", keywords: "laddu,sweet,mithai", file: "sweets-laddu.svg" },
    { slug: "sweets-barfi", title: "Sweets Barfi", keywords: "barfi,sweet,mithai", file: "sweets-barfi.svg" },
    { slug: "toran", title: "Toran", keywords: "toran,garland,door", file: "toran.svg" },
    { slug: "marigold", title: "Marigold", keywords: "marigold,flower,garland", file: "marigold.svg" },
    { slug: "sparkler", title: "Sparkler", keywords: "sparkler,phuljhadi,firework", file: "sparkler.svg" },
    { slug: "diya-pair", title: "Diya Pair", keywords: "diyas,lamps,pair", file: "diya-pair.svg" },
    { slug: "kalash", title: "Kalash", keywords: "kalash,pot,puja", file: "kalash.svg" },
    { slug: "lotus", title: "Lotus", keywords: "lotus,flower", file: "lotus.svg" },
    { slug: "mandala", title: "Mandala", keywords: "mandala,pattern,art", file: "mandala.svg" },
    { slug: "gift-box", title: "Gift Box", keywords: "gift,present,box", file: "gift-box.svg" },
    { slug: "candle", title: "Candle", keywords: "candle,light", file: "candle.svg" },
    { slug: "star-burst", title: "Star Burst", keywords: "star,burst,sparkle", file: "star-burst.svg" },
    { slug: "lakshmi-feet", title: "Lakshmi Feet", keywords: "feet,lakshmi,footprints", file: "lakshmi-feet.svg" },
    { slug: "deepam", title: "Deepam", keywords: "deepam,lamp,stand", file: "deepam.svg" },
  ] },
  { slug: "desi-ui", title: "Desi UI", description: "Original everyday-India icons: rupee, chai, auto-rickshaw, cricket and more.", icons: [
    { slug: "rupee", title: "Rupee", keywords: "rupee,inr,money,india", file: "rupee.svg" },
    { slug: "chai-cup", title: "Chai Cup", keywords: "chai,tea,cup", file: "chai-cup.svg" },
    { slug: "chai-kulhad", title: "Chai Kulhad", keywords: "kulhad,chai,clay cup", file: "chai-kulhad.svg" },
    { slug: "auto-rickshaw", title: "Auto Rickshaw", keywords: "auto,rickshaw,tuk-tuk,transport", file: "auto-rickshaw.svg" },
    { slug: "cricket-bat", title: "Cricket Bat", keywords: "cricket,bat,sport", file: "cricket-bat.svg" },
    { slug: "cricket-ball", title: "Cricket Ball", keywords: "cricket,ball,sport", file: "cricket-ball.svg" },
    { slug: "tiffin-box", title: "Tiffin Box", keywords: "tiffin,lunchbox,dabba", file: "tiffin-box.svg" },
    { slug: "mango", title: "Mango", keywords: "mango,fruit", file: "mango.svg" },
    { slug: "truck-india", title: "Truck India", keywords: "truck,transport,lorry", file: "truck-india.svg" },
    { slug: "temple", title: "Temple", keywords: "temple,mandir,holy", file: "temple.svg" },
    { slug: "turban", title: "Turban", keywords: "turban,pagri,headwear", file: "turban.svg" },
    { slug: "jalebi", title: "Jalebi", keywords: "jalebi,sweet,swirl", file: "jalebi.svg" },
    { slug: "samosa", title: "Samosa", keywords: "samosa,snack,food", file: "samosa.svg" },
    { slug: "tabla", title: "Tabla", keywords: "tabla,drum,music", file: "tabla.svg" },
    { slug: "dhol", title: "Dhol", keywords: "dhol,drum,music", file: "dhol.svg" },
    { slug: "kite", title: "Kite", keywords: "kite,patang,festival", file: "kite.svg" },
    { slug: "peacock-feather", title: "Peacock Feather", keywords: "peacock,feather,mor mukut", file: "peacock-feather.svg" },
    { slug: "bangle", title: "Bangle", keywords: "bangle,chudi,jewellery", file: "bangle.svg" },
    { slug: "matka-pot", title: "Matka Pot", keywords: "matka,pot,clay", file: "matka-pot.svg" },
    { slug: "wheat", title: "Wheat", keywords: "wheat,crop,harvest", file: "wheat.svg" },
  ] },
];
export const ORIGINAL_TOTAL = 60;
