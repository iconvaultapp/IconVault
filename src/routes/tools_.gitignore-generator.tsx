// /tools/gitignore-generator - Pick from 150+ curated .gitignore templates
// (languages, frameworks, tools, OS, IDEs), merge them into one clean file
// with deduped lines. Live preview, copy + download. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Download, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/tools_/gitignore-generator")({
  head: () => {
    const seo = getToolSeoMeta("gitignore-generator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: GitignoreGeneratorTool,
});

// Curated template set: [id, label, category, patterns]
const T: [string, string, string, string][] = [
["node","Node.js","Language","node_modules/\nnpm-debug.log*\nyarn-debug.log*\nyarn-error.log*\n.pnp\n.pnp.js\n.yarn/cache\n.yarn/unplugged\n.yarn/build-state.yml"],
["python","Python","Language","__pycache__/\n*.py[cod]\n*$py.class\n*.so\n.Python\nbuild/\ndist/\neggs/\n.eggs/\n*.egg-info/\n.venv\nvenv/\nENV/\n.env\n.pytest_cache/\n.coverage\nhtmlcov/"],
["java","Java","Language","*.class\n*.jar\n*.war\n*.ear\n*.nar\ntarget/\nbuild/\n.gradle/\nout/\n*.log"],
["go","Go","Language","*.exe\n*.exe~\n*.dll\n*.so\n*.dylib\n*.test\n*.out\n/bin/\n/dist/"],
["rust","Rust","Language","/target\n**/*.rs.bk\nCargo.lock"],
["ruby","Ruby","Language","*.gem\n*.rbc\n/.config\n/coverage/\n/InstalledFiles\n/pkg/\n/spec/reports/\n/test/tmp/\n/test/version_tmp/\n/tmp/\n.bundle/\nvendor/bundle\nlog/*.log\ntmp/"],
["php","PHP","Language","*.log\n/vendor/\ncomposer.phar"],
["c","C","Language","*.o\n*.ko\n*.obj\n*.elf\n*.ilk\n*.map\n*.exp\n*.gch\n*.pch\n*.lib\n*.a\n*.la\n*.lo\n*.slo\n*.dylib\n*.so\n*.dSYM/"],
["cpp","C++","Language","*.o\n*.obj\n*.exe\n*.out\n*.app\n*.i*86\n*.x86_64\n*.hex\n*.dSYM/\n/build/"],
["csharp","C#","Language","[Dd]ebug/\n[Rr]elease/\nx64/\nx86/\n[Aa][Rr][Mm]/\n[Aa][Rr][Mm]64/\nbld/\n[Bb]in/\n[Oo]bj/\n[Ll]og/\n[Ll]ogs/\n*.user\n*.suo\n.vs/"],
["swift","Swift","Language","build/\n*.o\n*.d\n*.swp\n.DS_Store\nxcuserdata/\n*.xcworkspace/xcuserdata/"],
["kotlin","Kotlin","Language","*.class\nbuild/\nout/\n.gradle/"],
["dart","Dart","Language",".dart_tool/\n.packages\nbuild/\n*.dart.js"],
["scala","Scala","Language","*.class\n*.log\ntarget/\nproject/boot/\nproject/plugins/project/\n.worksheet"],
["clojure","Clojure","Language","/classes\n/checkouts\npom.xml\npom.xml.asc\n*.jar\n*.class\n/.lein-*\n/.nrepl-port\ntarget/"],
["elixir","Elixir","Language","/_build/\n/cover/\n/deps/\n/doc/\n/.fetch\n*.ez\n*.beam\nerl_crash.dump\n*.plt"],
["erlang","Erlang","Language","*.beam\nerl_crash.dump\n/_build/\n/deps/"],
["haskell","Haskell","Language","dist/\ndist-newstyle/\n.stack-work/\n*.hi\n*.o\n*.dyn_hi\n*.dyn_o\ncabal.sandbox.config"],
["lua","Lua","Language","luac.out"],
["perl","Perl","Language","*.o\n*.pm.tdy\nblib/\n_build/\nBuild\nMYMETA.*\nMakefile\npm_to_blib\n*.bak"],
["r","R","Language",".Rproj.user\n.Rhistory\n.RData\n.Ruserdata\n*-Ex.R\n/*.tar.gz\n/*.Rcheck/\n.Rbuildignore\n.vignettes/.install_extras"],
["julia","Julia","Language","*.jl.cov\n*.jl.*.cov\n*.jl.mem\n/docs/build/\n/docs/site/\n/Manifest.toml"],
["groovy","Groovy","Language","*.class\ntarget/\n.gradle/"],
["typescript","TypeScript","Language","*.js.map\n*.d.ts\nnode_modules/\ndist/\nbuild/"],
["javascript","JavaScript","Language","node_modules/\ndist/\nbuild/\n*.log\ncoverage/"],
["objectivec","Objective-C","Language","build/\n*.o\n*.d\nDerivedData/\nxcuserdata/"],
["fsharp","F#","Language","[Dd]ebug/\n[Rr]elease/\n[Bb]in/\n[Oo]bj/\n*.user\n.vs/"],
["visualbasic","Visual Basic","Language","[Dd]ebug/\n[Rr]elease/\n[Bb]in/\n[Oo]bj/\n*.user\n.vs/"],
["ocaml","OCaml","Language","*.cmo\n*.cmi\n*.cma\n*.cmx\n*.cmxa\n*.o\n_build/"],
["crystal","Crystal","Language","/bin/\n/.shards/\n/lib/\n*.dwarf"],
["nim","Nim","Language","nimcache/\n*.exe"],
["zig","Zig","Language","zig-cache/\nzig-out/"],
["vlang","V","Language","*.c\n.v/"],
["dlang","D","Language","*.o\n*.obj\n*.a\n*.lib\n*.so\n*.dll\n*.exe\ndocs/\n.dub/"],
["coffeescript","CoffeeScript","Language","node_modules/\nlib-cov/\n*.seed\n*.log\n*.csv\n*.dat"],
["fortran","Fortran","Language","*.o\n*.mod\n*.smod"],
["ada","Ada","Language","*.o\n*.ali\n*.ads.adb~"],
["matlab","MATLAB","Language","*.asv\n*.m~"],
["powershell","PowerShell","Language","*.log"],
["shell","Shell","Language","*.log"],
["assembly","Assembly","Language","*.o\n*.obj\n*.exe"],
["react","React","Framework","node_modules/\n/build\n/dist\n.env.local\n.env.development.local\n.env.test.local\n.env.production.local\nnpm-debug.log*\nyarn-debug.log*"],
["nextjs","Next.js","Framework","node_modules/\n/.next/\n/out/\n/build\n.env*.local\n.vercel\n*.tsbuildinfo\nnext-env.d.ts"],
["vue","Vue","Framework","node_modules/\n/dist\n/dist-ssr\n*.local\n.DS_Store\ncoverage/"],
["nuxt","Nuxt","Framework","node_modules\n.output\n.nuxt\n.nitro\ndist\n.env"],
["angular","Angular","Framework","node_modules/\n/dist\n/tmp\n/out-tsc\n/bazel-out\n*.log\n.angular/cache"],
["svelte","Svelte","Framework","node_modules/\n/build\n/.svelte-kit\npackage\n*.local"],
["sveltekit","SvelteKit","Framework","node_modules/\n/.svelte-kit\n/build\n.env\n.env.*\n.vercel\n.output"],
["astro","Astro","Framework","node_modules/\n/dist/\n/.astro/"],
["remix","Remix","Framework","node_modules/\n/build\n/public/build\n.env"],
["gatsby","Gatsby","Framework","node_modules/\n.cache/\n/public\n*.log"],
["solidjs","SolidJS","Framework","node_modules/\n/dist\n/.solid"],
["qwik","Qwik","Framework","node_modules/\n/dist\n/server\n/tmp"],
["preact","Preact","Framework","node_modules/\n/build\n/dist"],
["ember","Ember","Framework","dist/\ntmp/\nnode_modules/\nbower_components/"],
["django","Django","Framework","*.log\n*.pot\n*.pyc\n__pycache__/\nlocal_settings.py\ndb.sqlite3\ndb.sqlite3-journal\nmedia\nstaticfiles/"],
["flask","Flask","Framework","*.pyc\n__pycache__/\ninstance/\n.webassets-cache"],
["fastapi","FastAPI","Framework","__pycache__/\n*.pyc\n.venv/\n.env"],
["rails","Rails","Framework","*.rbc\ncapybara-*.html\n.rspec\n/log/\n/tmp/\n/storage/\n/public/assets\n.byebug_history\n.env"],
["laravel","Laravel","Framework","/node_modules\n/public/hot\n/public/storage\n/storage/*.key\n/vendor\n.env\n.env.backup\n.phpunit.result.cache\nhomestead.yaml\nhomestead.json"],
["symfony","Symfony","Framework","/.env.local\n/.env.local.php\n/.env.*.local\n/config/secrets/prod/prod.decrypt.private.php\n/public/bundles/\n/var/\n/vendor/"],
["spring","Spring","Framework","target/\n!.mvn/wrapper/maven-wrapper.jar\n!**/src/main/**/target/\n!**/src/test/**/target/"],
["express","Express","Framework","node_modules/\n.env\n*.log\ndist/"],
["nestjs","NestJS","Framework","node_modules/\n/dist\n.env\ncoverage/"],
["strapi","Strapi","Framework","node_modules/\n/build\n/dist\n/.cache\n/.tmp\n.env"],
["wordpress","WordPress","Framework","wp-config.php\nwp-content/advanced-cache.php\nwp-content/backup-db/\nwp-content/backups/\nwp-content/blogs.dir/\nwp-content/cache/\nwp-content/upgrade/\nwp-content/uploads/\n/.htaccess\n/license.txt\n/readme.html\n/wp-admin/\n/wp-includes/"],
["drupal","Drupal","Framework",".htaccess\n/sites/*/files\n/sites/*/private\n/sites/default/settings*.php\n/sites/default/files"],
["hugo","Hugo","Framework","/public/\n/resources/_gen/\n/assets/jsconfig.json\nhugo_stats.json\n/.hugo_build.lock"],
["jekyll","Jekyll","Framework","_site/\n.sass-cache/\n.jekyll-cache/\n.jekyll-metadata"],
["eleventy","Eleventy","Framework","_site/\nnode_modules/"],
["docusaurus","Docusaurus","Framework",".docusaurus\nbuild/\nnode_modules/"],
["gradle","Gradle","Framework",".gradle\nbuild/\n!gradle/wrapper/gradle-wrapper.jar\n!**/src/main/**/build/\n!**/src/test/**/build/"],
["maven","Maven","Framework","target/\npom.xml.tag\npom.xml.releaseBackup\npom.xml.versionsBackup\npom.xml.next\nrelease.properties\ndependency-reduced-pom.xml\nbuildNumber.properties\n.mvn/timing.properties"],
["flutter","Flutter","Framework",".dart_tool/\n.flutter-plugins\n.flutter-plugins-dependencies\n.packages\nbuild/\n*.log\n.idea/\n*.iml"],
["reactnative","React Native","Framework","node_modules/\n/exponent*\n/ios/build\n/android/build\n/android/app/build\n*.jks\n*.keystore"],
["electron","Electron","Framework","node_modules/\ndist/\nout/\n*.log"],
["tauri","Tauri","Framework","node_modules/\n/src-tauri/target/\n/dist"],
["unity","Unity","Framework","[Ll]ibrary/\n[Tt]emp/\n[Oo]bj/\n[Bb]uild/\n[Bb]uilds/\n[Ll]ogs/\n[Mm]emoryCaptures/\n*.csproj\n*.unityproj\n*.sln\n*.suo\n*.tmp\n*.user\n*.pidb\n*.booproj\n*.svd\n*.pdb\n*.mdb\n*.opendb\n*.VC.db\n*.pidb.meta\nsysinfo.txt\n*.apk\n*.aab\n*.unitypackage"],
["unreal","Unreal Engine","Framework","Binaries/\nBuild/\nDerivedDataCache/\nIntermediate/\nSaved/\n*.sln\n.vs/"],
["godot","Godot","Framework",".godot/\n/imported/\n/export_presets.cfg"],
["qt","Qt","Framework","*.pro.user\n*.pro.user.*\n*.qbs.user\n*.qbs.user.*\n*-build-*\n*.o\nmoc_*.cpp\nui_*.h\nqrc_*.cpp"],
["docker","Docker","Tool","*.log\ndocker-compose.override.yml"],
["terraform","Terraform","Tool",".terraform/\n*.tfstate\n*.tfstate.*\n*.tfvars\n.terraform.lock.hcl\ncrash.log\ncrash.*.log\noverride.tf\noverride.tf.json\n*_override.tf\n*_override.tf.json"],
["ansible","Ansible","Tool","*.retry\n.vault_pass"],
["kubernetes","Kubernetes","Tool","*.log"],
["helm","Helm","Tool","*.tgz"],
["vagrant","Vagrant","Tool",".vagrant/"],
["jenkins","Jenkins","Tool","*.log"],
["gitlab","GitLab","Tool","*.log"],
["github","GitHub Actions","Tool","*.log"],
["bazel","Bazel","Tool","/bazel-*"],
["cmake","CMake","Tool","CMakeCache.txt\nCMakeFiles/\ncmake_install.cmake\ninstall_manifest.txt\ncompile_commands.json\nCTestTestfile.cmake\n_deps\n*.o"],
["make","Make","Tool","*.o\n*.a\n*.so"],
["webpack","Webpack","Tool","/dist\n/node_modules\n*.log"],
["vite","Vite","Tool","node_modules\n/dist\n*.local"],
["babel","Babel","Tool","lib/\n*.log"],
["eslint","ESLint","Tool",".eslintcache"],
["jest","Jest","Tool","/coverage\n/.nyc_output"],
["cypress","Cypress","Tool","/cypress/videos\n/cypress/screenshots\n/cypress/downloads"],
["playwright","Playwright","Tool","/test-results\n/playwright-report\n/playwright/.cache"],
["storybook","Storybook","Tool","/storybook-static"],
["firebase","Firebase","Tool",".firebase/\n.firebase/\n.firebaserc\nfirebase-debug.log\nfirestore-debug.log\nui-debug.log"],
["supabase","Supabase","Tool",".branches\n.temp"],
["netlify","Netlify","Tool",".netlify"],
["vercel","Vercel","Tool",".vercel"],
["serverless","Serverless","Tool",".serverless/"],
["pulumi","Pulumi","Tool",".pulumi/*"],
["aws","AWS","Tool","*.pem\n*.key\n.aws/credentials"],
["azure","Azure","Tool","*.publishsettings"],
["gcp","GCP","Tool","*.json.key"],
["prometheus","Prometheus","Tool","data/"],
["elasticsearch","Elasticsearch","Tool","data/"],
["mongodb","MongoDB","Tool","data/db/"],
["mysql","MySQL","Tool","*.ibd\n*.frm"],
["postgres","PostgreSQL","Tool","*.log\npgdata/"],
["redis","Redis","Tool","dump.rdb"],
["sqlite","SQLite","Tool","*.db\n*.db-shm\n*.db-wal\n*.sqlite\n*.sqlite3"],
["kafka","Kafka","Tool","/tmp/kafka-logs"],
["nginx","Nginx","Tool","*.log\nnginx.pid"],
["latex","LaTeX","Tool","*.aux\n*.lof\n*.lot\n*.fls\n*.out\n*.toc\n*.fmt\n*.fot\n*.cb\n*.cb2\n.*.lb\n*.dvi\n*.xdv\n*.pdf\n*.bbl\n*.bcf\n*.blg\n*.run.xml"],
["jupyter","Jupyter","Tool",".ipynb_checkpoints\n*/.ipynb_checkpoints/*"],
["sphinx","Sphinx","Tool","_build/"],
["obsidian","Obsidian","Tool",".obsidian/workspace.json\n.obsidian/hotkeys.json"],
["linux","Linux","OS","*~\n.fuse_hidden*\n.directory\n.Trash-*\n.nfs*"],
["macos","macOS","OS",".DS_Store\n.AppleDouble\n.LSOverride\n._*\n.DocumentRevisions-V100\n.fseventsd\n.Spotlight-V100\n.TemporaryItems\n.Trashes\n.VolumeIcon.icns\n.com.apple.timemachine.donotpresent\n.AppleDB\n.AppleDesktop\nNetwork Trash Folder\nTemporary Items\n.apdisk"],
["windows","Windows","OS","Thumbs.db\nThumbs.db:encryptable\nehthumbs.db\nehthumbs_vista.db\n*.stackdump\n[Dd]esktop.ini\n$RECYCLE.BIN/\n*.cab\n*.msi\n*.msix\n*.msm\n*.msp\n*.lnk"],
["vscode","VS Code","IDE",".vscode/*\n!.vscode/settings.json\n!.vscode/tasks.json\n!.vscode/launch.json\n!.vscode/extensions.json\n*.code-workspace"],
["jetbrains","JetBrains","IDE",".idea/\n*.iml\n*.iws\n*.ipr\nout/"],
["vim","Vim","IDE","*.swp\n*.swo\n*~\n.netrwhist"],
["emacs","Emacs","IDE","*~\n\\#*\\#\n/.emacs.desktop\n/.emacs.desktop.lock\n*.elc\nauto-save-list\ntramp\n.\\#*"],
["sublime","Sublime Text","IDE","*.sublime-project\n*.sublime-workspace"],
["eclipse","Eclipse","IDE",".metadata\nbin/\ntmp/\n*.tmp\n*.bak\n*.swp\n*~.nib\nlocal.properties\n.settings/\n.loadpath\n.recommenders\n.project\n.classpath\n.factorypath"],
["visualstudio","Visual Studio","IDE","[Dd]ebug/\n[Rr]elease/\n[Bb]in/\n[Oo]bj/\n*.user\n*.suo\n.vs/\n*.VC.db\n*.VC.opendb"],
["netbeans","NetBeans","IDE","nbproject/private/\nnbbuild/\ndist/\nnbdist/\n.nb-gradle/"],
["xcode","Xcode","IDE","build/\n*.pbxuser\n!default.pbxuser\n*.mode1v3\n!default.mode1v3\n*.mode2v3\n!default.mode2v3\n*.perspectivev3\n!default.perspectivev3\nxcuserdata/\n*.xccheckout\n*.moved-aside\nDerivedData\n*.hmap\n*.ipa\n*.dSYM.zip\n*.dSYM"],
["androidstudio","Android Studio","IDE","*.iml\n.gradle\n/local.properties\n/.idea\n.DS_Store\n/build\n/captures\nexternalNativeBuild\n.cxx\n*.apk\n*.aab"],
["atom","Atom","IDE",".atom/"],
];

function buildGitignore(ids: string[]): string {
  const L: string[] = [];
  L.push("# Generated by IconVault Gitignore Generator");
  const seen = new Set<string>();
  for (const id of ids) {
    const t = T.find((x) => x[0] === id);
    if (!t) continue;
    L.push("");
    L.push(`########## ${t[1]} ##########`);
    for (const line of t[3].split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (seen.has(trimmed)) continue;
      seen.add(trimmed);
      L.push(trimmed);
    }
  }
  L.push("");
  return L.join("\n");
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const CATS = ["Language", "Framework", "Tool", "OS", "IDE"];

function GitignoreGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("gitignore-generator", isPro);
  const seo = getToolSeo("gitignore-generator");

  const [selected, setSelected] = useState<string[]>(["node", "macos", "windows", "vscode"]);
  const [query, setQuery] = useState("");

  const toggle = (id: string) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return T;
    return T.filter(([id, label, cat]) => id.includes(q) || label.toLowerCase().includes(q) || cat.toLowerCase().includes(q));
  }, [query]);

  const out = useMemo(() => buildGitignore(selected), [selected]);

  const copy = async () => {
    if (!trial.canUse || selected.length === 0) return;
    const ok = await copyToClipboard(out);
    if (ok) {
      trial.recordUse();
      toast.success(".gitignore copied.");
    } else toast.error("Could not copy to clipboard.");
  };

  const download = () => {
    if (!trial.canUse || selected.length === 0) return;
    downloadBlob(new Blob([out], { type: "text/plain" }), ".gitignore");
    trial.recordUse();
    toast.success(".gitignore downloaded.");
  };

  return (
    <ToolPageShell toolId="gitignore-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Gitignore Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <Label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Templates ({selected.length} selected)</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search 150+ templates..." className="pl-9" />
            </div>
          </div>
          <div className="max-h-[460px] space-y-4 overflow-y-auto pr-1">
            {CATS.map((cat) => {
              const items = filtered.filter((t) => t[2] === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">{cat}s</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {items.map(([id, label]) => {
                      const on = selected.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggle(id)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition",
                            on
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                          )}
                        >
                          <span className={cn("flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border", on ? "border-primary bg-primary text-white" : "border-border")}>
                            {on && <Check className="h-2.5 w-2.5" />}
                          </span>
                          <span className="truncate">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground">No templates match.</p>}
          </div>
          <p className="text-xs text-muted-foreground">
            A curated set of {T.length} hand-checked templates. Selected templates merge into one file with duplicate lines removed.
          </p>
          <ActionButton busy={false} disabled={!trial.canUse || selected.length === 0} onClick={download}>
            <Download className="h-4 w-4" /> Download .gitignore
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free generations left - runs fully in your browser, nothing is uploaded.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-medium text-foreground/80">Live preview: .gitignore</p>
            <button
              type="button"
              onClick={copy}
              disabled={!trial.canUse || selected.length === 0}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground",
                (!trial.canUse || selected.length === 0) && "cursor-not-allowed opacity-50",
              )}
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>
          {selected.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Select at least one template to build your .gitignore.
            </p>
          ) : (
            <pre className="max-h-[640px] overflow-auto whitespace-pre rounded-xl bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-100">
              {out}
            </pre>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
