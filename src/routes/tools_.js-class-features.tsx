// /tools/js-class-features - Modern JavaScript class features, each with
// editable code that runs in a sandboxed iframe and prints real output.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Braces, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/js-class-features";
import toolSeoMeta from "@/lib/tool-seo-meta-data/js-class-features";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/js-class-features")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/js-class-features";
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
  component: ClassFeaturesTool,
});

/* Sandboxed runner: user code executes inside an iframe (sandbox="allow-scripts",
   no Function constructor, no access to the parent page). console output and
   uncaught errors are posted back. */
const SRCDOC = `<!doctype html><html><body><script>
var logs = [];
function fmt(v){ try { return typeof v === "string" ? v : JSON.stringify(v); } catch (e) { return String(v); } }
["log","info","warn","error"].forEach(function(k){ console[k] = function(){ logs.push(Array.prototype.map.call(arguments, fmt).join(" ")); }; });
var posted = false, curId = 0;
function done(err){ if (posted) return; posted = true; parent.postMessage({ type: "iv-result", id: curId, logs: logs.slice(), error: err || null }, "*"); }
window.addEventListener("error", function(e){
  var stack = e.error && e.error.stack ? String(e.error.stack).split("\\n").slice(0, 6).join("\\n") : e.message;
  done("Uncaught " + stack);
});
window.addEventListener("message", function(e){
  var d = e.data || {};
  if (d.type !== "iv-run" || typeof d.code !== "string") return;
  curId = d.id; posted = false; logs.length = 0;
  var s = document.createElement("script");
  s.textContent = d.code;
  document.body.appendChild(s);
  s.remove();
  setTimeout(function(){ done(null); }, 30);
});
<\/script></body></html>`;

interface RunResult { logs: string[]; error: string | null }

function useSandbox() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pending = useRef(new Map<number, (r: RunResult) => void>());
  const idRef = useRef(0);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { type?: string; id?: number; logs?: string[]; error?: string | null } | null;
      if (!d || d.type !== "iv-result" || typeof d.id !== "number") return;
      const resolve = pending.current.get(d.id);
      if (resolve) {
        pending.current.delete(d.id);
        resolve({ logs: d.logs ?? [], error: d.error ?? null });
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const run = (code: string): Promise<RunResult> =>
    new Promise((resolve) => {
      const id = ++idRef.current;
      pending.current.set(id, resolve);
      iframeRef.current?.contentWindow?.postMessage({ type: "iv-run", id, code }, "*");
      setTimeout(() => {
        if (pending.current.has(id)) {
          pending.current.delete(id);
          resolve({ logs: [], error: "Sandbox timed out." });
        }
      }, 5000);
    });

  return { iframeRef, run };
}

interface Feature {
  id: string;
  name: string;
  blurb: string;
  code: string;
}

const FEATURES: Feature[] = [
  {
    id: "private-fields",
    name: "Private fields",
    blurb: "Fields declared with # are truly private: invisible to subclasses, destructuring and JSON.",
    code: `class BankAccount {
  #balance = 0;               // private field
  #pin;

  constructor(pin) {
    this.#pin = pin;
  }

  deposit(amount) {
    if (amount > 0) this.#balance += amount;
  }

  getBalance(pin) {
    return pin === this.#pin ? this.#balance : "wrong pin";
  }
}

const acct = new BankAccount("1234");
acct.deposit(250);
console.log("balance:", acct.getBalance("1234"));
console.log("wrong pin:", acct.getBalance("0000"));
console.log("Object.keys:", Object.keys(acct)); // #fields are hidden
try {
  console.log(acct.#balance); // SyntaxError outside the class
} catch (e) {
  console.log("direct access:", e.constructor.name);
}`,
  },
  {
    id: "private-methods",
    name: "Private methods",
    blurb: "Methods can be private too. Subclasses cannot see or override them.",
    code: `class Validator {
  #errors = [];

  #record(field, msg) {
    this.#errors.push(field + ": " + msg);
  }

  checkEmail(email) {
    if (!email.includes("@")) this.#record("email", "missing @");
    return this.#errors.length === 0;
  }

  get errors() {
    return [...this.#errors];
  }
}

const v = new Validator();
console.log("valid?", v.checkEmail("not-an-email"));
console.log("errors:", v.errors);
console.log("valid?", v.checkEmail("ava@site.com"));`,
  },
  {
    id: "static-blocks",
    name: "Static blocks",
    blurb: "static { } runs once when the class is defined: perfect for complex static setup.",
    code: `class Config {
  static apiUrl;
  static retries;
  static features = new Set();

  static {
    const env = "production";
    Config.apiUrl = env === "production"
      ? "https://api.example.com"
      : "http://localhost:3000";
    Config.retries = 3;
    Config.features.add("caching").add("metrics");
    console.log("static block ran once at class definition");
  }
}

console.log("apiUrl:", Config.apiUrl);
console.log("retries:", Config.retries);
console.log("features:", [...Config.features]);`,
  },
  {
    id: "accessors",
    name: "Getters, setters, statics",
    blurb: "Computed properties with validation, plus static fields shared across instances.",
    code: `class Temperature {
  static instances = 0;

  #celsius;

  constructor(c) {
    this.celsius = c; // goes through the setter
    Temperature.instances++;
  }

  get celsius() { return this.#celsius; }

  set celsius(v) {
    if (v < -273.15) throw new RangeError("below absolute zero");
    this.#celsius = v;
  }

  get fahrenheit() { return this.#celsius * 9 / 5 + 32; }
}

const t = new Temperature(25);
console.log("25C in F:", t.fahrenheit);
t.celsius = 100;
console.log("100C in F:", t.fahrenheit);
console.log("instances:", Temperature.instances);
try { new Temperature(-300); }
catch (e) { console.log("setter guard:", e.message); }`,
  },
  {
    id: "inheritance",
    name: "Inheritance",
    blurb: "extends and super, with private fields staying private to the class that declares them.",
    code: `class Animal {
  #heartbeat = true;

  constructor(name) {
    this.name = name;
  }

  speak() {
    return this.name + " makes a sound";
  }

  alive() {
    return this.#heartbeat;
  }
}

class Dog extends Animal {
  // #heartbeat is NOT visible here - privacy is per-class

  constructor(name, breed) {
    super(name); // must call before touching this
    this.breed = breed;
  }

  speak() {
    return super.speak() + ": woof";
  }
}

const d = new Dog("Rex", "Labrador");
console.log(d.speak());
console.log("alive?", d.alive());
console.log("instanceof Animal?", d instanceof Animal);`,
  },
  {
    id: "in-operator",
    name: "#brand checks",
    blurb: "The ergonomic brand check: #field in obj tests for a private field without throwing.",
    code: `class Circle {
  #radius;
  constructor(r) { this.#radius = r; }
  static isCircle(obj) {
    return #radius in obj; // true only for real Circle instances
  }
  area() { return Math.PI * this.#radius ** 2; }
}

class FakeCircle {
  area() { return 999; } // impostor with the same method
}

const real = new Circle(2);
const fake = new FakeCircle();
console.log("real is circle?", Circle.isCircle(real));
console.log("fake is circle?", Circle.isCircle(fake));
console.log("area:", real.area().toFixed(2));`,
  },
];

function ClassFeaturesTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("js-class-features", isPro);
  const seo = toolSeo;

  const [active, setActive] = useState(FEATURES[0]!);
  const [code, setCode] = useState(FEATURES[0]!.code);
  const [output, setOutput] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const { iframeRef, run } = useSandbox();

  const pick = (f: Feature) => {
    setActive(f);
    setCode(f.code);
    setOutput(null);
  };

  const runCode = async () => {
    if (running || !trial.canUse) return;
    setRunning(true);
    try {
      const res = await run(code);
      setOutput(res);
      trial.recordUse();
    } finally {
      setRunning(false);
    }
  };

  return (
    <ToolPageShell toolId="js-class-features" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JS Class Features" left={trial.left} />
      <iframe ref={iframeRef} sandbox="allow-scripts" srcDoc={SRCDOC} title="code sandbox" className="hidden" />

      <div className="mb-5 flex flex-wrap gap-2">
        {FEATURES.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => pick(f)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-bold transition",
              active.id === f.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40",
            )}
          >
            {f.name}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center gap-2">
            <Braces className="h-4 w-4 text-primary" />
            <h2 className="font-extrabold">{active.name}</h2>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">{active.blurb}</p>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={20}
            spellCheck={false}
            className="w-full rounded-xl border border-border bg-zinc-950 p-3 font-mono text-[12.5px] leading-relaxed text-zinc-200"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <ActionButton busy={running} disabled={!trial.canUse} onClick={runCode}>
              <Play className="h-4 w-4" /> {running ? "Running…" : "Run in sandbox"}
            </ActionButton>
            <button
              type="button"
              onClick={() => { setCode(active.code); setOutput(null); }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/40"
            >
              <RotateCcw className="h-4 w-4" /> Reset example
            </button>
            {!isPro && (
              <p className="text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free runs left.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 font-extrabold">Console output</h2>
          {!output ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <Play className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-semibold">No output yet</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Press "Run in sandbox". Code executes in an isolated iframe, never touching this page.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {output.error && (
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-red-500/10 p-3 font-mono text-xs text-red-500">
                  {output.error}
                </pre>
              )}
              {output.logs.map((line, i) => (
                <pre key={i} className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-zinc-950 p-3 font-mono text-xs text-zinc-200">
                  {line}
                </pre>
              ))}
              {output.logs.length === 0 && !output.error && (
                <p className="py-6 text-center text-sm text-muted-foreground">Ran with no console output.</p>
              )}
            </div>
          )}
          <div className="mt-4 rounded-xl bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Sandbox notes:</strong> the runner uses a
            <code className="rounded bg-muted px-1 font-mono">sandbox="allow-scripts"</code> iframe with no
            Function constructor and no access to your page, cookies or network. Edit the code freely.
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
