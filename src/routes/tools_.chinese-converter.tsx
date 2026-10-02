// /tools/chinese-converter - convert between Simplified and Traditional
// Chinese with a built-in common-character table. 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Check, Copy, Languages } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/chinese-converter")({
  head: () => {
    const seo = getToolSeoMeta("chinese-converter");
    const canonical = "https://iconvault.site/tools/chinese-converter";
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
  component: ChineseConverterTool,
});

/**
 * Common-character pairs: simplified char followed by its traditional form.
 * Covers frequent characters only; rare characters pass through unchanged.
 */
const PAIRS =
  "汉漢语語爱愛国國学學对對来來飞飛关關发發现現门門问問见見车車马馬电電話話线線头頭岁歲时時間間经經读讀认認让讓运運过過进進还還这這個個够夠为為东東优優会會传傳伤傷价價伦倫伟偉众眾从從云雲产產亿億亩畝买買卖賣亏虧乐樂义義乌烏丝絲丽麗乡鄉书書亲親仅僅仓倉们們仪儀备備侧側侦偵杰傑储儲儿兒兑兌党黨兰蘭兴興养養兽獸冈岡写寫军軍农農冯馮冲衝决決凤鳳凯凱击擊刘劉剂劑剑劍劝勸办辦务務动動励勵劲勁劳勞势勢勋勛医醫华華协協单單卢盧卤鹵卧臥卫衛厂廠厅廳历歷厉厲压壓厌厭厕廁厢廂厦廈厨廚县縣参參双雙变變叙敘叠疊叶葉号號叹嘆后後吗嗎听聽启啟吴吳员員呕嘔团團围圍园園圆圓图圖圣聖坏壞块塊坚堅坛壇坝壩坞塢坟墳坠墜垄壟垦墾垫墊垩堊涂塗壳殼壶壺处處复複夺奪奋奮奖獎奥奧娄婁娇嬌娱娛网網纲綱纪紀约約红紅纤纖纵縱练練组組绅紳细細织織终終绊絆绍紹绎繹绑綁绒絨结結绕繞绘繪给給绚絢绛絳络絡绝絕绞絞统統绢絹绣繡继繼绷繃续續绽綻绾綰绿綠缀綴缄緘缅緬缆纜缇緹缉緝缎緞缒縋缓緩缔締缕縷编編缘緣缙縉缚縛缝縫缟縞缠纏缢縊缤繽缥縹缨纓缩縮缪繆缭繚缮繕缰韁缴繳缵纘见見观觀规規觅覓视視览覽觉覺觊覬贡貢财財责責贤賢败敗账賬货貨质質贩販贪貪贫貧贬貶购購贮貯贯貫贰貳贱賤贴貼贵貴贷貸贸貿费費贺賀贻貽贼賊贾賈贿賄赁賃赂賂赃贓资資赅賅赈賑赊賒赋賦赌賭赎贖赏賞赐賜赔賠赖賴赞贊赠贈赡贍赢贏轩軒轴軸轶軼轿轎较較辄輒辅輔辆輛辇輦辈輩辉輝辍輟辐輻辑輯输輸辔轡辕轅辖轄辗輾辘轆辙轍辩辯辫辮轻輕载載鱼魚鸟鳥龟龜龙龍虫蟲虾蝦蚁蟻蚕蠶蜗蝸蝇蠅蝎蠍蛊蠱蛮蠻蜕蛻蝉蟬饼餅饺餃饭飯饮飲饱飽饿餓馋饞馆館馒饅钱錢银銀铜銅铅鉛铺鋪销銷锁鎖镜鏡钟鐘链鏈镇鎮错錯键鍵识識记記讲講课課调調谈談论論证證访訪设設许許词詞译譯诗詩诚誠误誤说說请請诸諸诺諾谓謂谁誰恋戀怀懷忧憂忆憶怜憐恳懇恶惡恼惱脑腦惧懼悬懸悯憫悦悅惨慘惭慚惊驚愿願应應怂慫怄慪怅悵";

const SIMP_TO_TRAD = new Map<string, string>();
const TRAD_TO_SIMP = new Map<string, string>();
for (let i = 0; i + 1 < PAIRS.length; i += 2) {
  const s = PAIRS.substring(i, i + 1);
  const t = PAIRS.substring(i + 2 - 1, i + 2);
  if (!SIMP_TO_TRAD.has(s)) SIMP_TO_TRAD.set(s, t);
  if (!TRAD_TO_SIMP.has(t)) TRAD_TO_SIMP.set(t, s);
}

function convert(text: string, toTrad: boolean): { out: string; changed: number; skipped: number } {
  const map = toTrad ? SIMP_TO_TRAD : TRAD_TO_SIMP;
  let changed = 0;
  let skipped = 0;
  const out = [...text]
    .map((ch) => {
      const m = map.get(ch);
      if (m) {
        changed++;
        return m;
      }
      if (/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(ch)) skipped++;
      return ch;
    })
    .join("");
  return { out, changed, skipped };
}

function ChineseConverterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("chinese-converter", isPro);
  const seo = getToolSeo("chinese-converter");

  const [toTrad, setToTrad] = useState(true);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [stats, setStats] = useState<{ changed: number; skipped: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const doConvert = () => {
    if (!input.trim() || !trial.canUse) return;
    const { out, changed, skipped } = convert(input, toTrad);
    setOutput(out);
    setStats({ changed, skipped });
    setCopied(false);
    trial.recordUse();
    toast.success("Text converted");
  };

  const copy = () => {
    if (!output) return;
    navigator.clipboard
      .writeText(output)
      .then(() => {
        setCopied(true);
        toast.success("Converted text copied");
      })
      .catch(() => toast.error("Copy failed"));
  };

  const flip = () => {
    setToTrad(!toTrad);
    setOutput("");
    setStats(null);
    setCopied(false);
  };

  return (
    <ToolPageShell toolId="chinese-converter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Trad/Simp Converter" left={trial.left} />

      <div className="mb-6 flex items-center gap-3">
        <div className="inline-flex items-center gap-1 rounded-xl bg-muted p-1">
          <button
            type="button"
            onClick={() => setToTrad(true)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-bold transition",
              toTrad ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Simplified to Traditional
          </button>
          <button
            type="button"
            onClick={() => setToTrad(false)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-bold transition",
              !toTrad ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Traditional to Simplified
          </button>
        </div>
        <button
          type="button"
          onClick={flip}
          title="Swap direction"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-bold transition hover:border-primary/40"
        >
          <ArrowLeftRight className="h-4 w-4" /> Swap
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <label className="block rounded-2xl border border-border bg-card p-4">
          <span className="mb-2 block text-sm font-bold">
            {toTrad ? "Simplified Chinese" : "Traditional Chinese"}
          </span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={toTrad ? "输入简体中文..." : "輸入繁體中文..."}
            spellCheck={false}
            className="h-60 w-full resize-y rounded-xl border border-border bg-background p-3 text-[15px] leading-relaxed outline-none focus:border-primary"
          />
        </label>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-bold">
              {toTrad ? "Traditional Chinese" : "Simplified Chinese"}
              {stats && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                  {stats.changed} converted{stats.skipped > 0 ? `, ${stats.skipped} unchanged` : ""}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={copy}
              disabled={!output}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          {output ? (
            <textarea
              value={output}
              readOnly
              spellCheck={false}
              className="h-60 w-full resize-y rounded-xl border border-border bg-background p-3 text-[15px] leading-relaxed outline-none"
            />
          ) : (
            <div className="flex h-60 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
              <Languages className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="px-6 text-sm font-semibold text-muted-foreground">
                Your converted text appears here
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <ActionButton disabled={!input.trim() || !trial.canUse} onClick={doConvert}>
          Convert {toTrad ? "to Traditional" : "to Simplified"}
        </ActionButton>
        {!isPro && (
          <p className="text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left - runs fully in your browser.
          </p>
        )}
      </div>

      <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">
        The built-in table covers common characters; rare characters may pass through unchanged. A few
        simplified characters have more than one traditional form depending on meaning (发 can be 發 or 髮,
        干 can be 乾, 幹 or 干), so double-check names and formal text before publishing.
      </p>
    </ToolPageShell>
  );
}
