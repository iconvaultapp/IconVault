// /tools/license-chooser - Compare MIT, Apache-2.0, GPL-3.0, BSD-3-Clause,
// ISC and MPL-2.0 side by side, then generate a ready-to-ship LICENSE file.
// Full legal texts are embedded for MIT / ISC / BSD-3-Clause; Apache-2.0,
// GPL-3.0 and MPL-2.0 are long documents, so those ship with the official
// header notice plus a link to the authoritative full text.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Download, Minus, Scale } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/license-chooser")({
  head: () => {
    const seo = getToolSeoMeta("license-chooser");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: LicenseChooserTool,
});

interface LicenseInfo {
  id: string;
  name: string;
  tagline: string;
  copyleft: string;
  patent: boolean;
  conditions: string[];
  url: string;
  fullText: ((holder: string, year: string) => string) | null;
  noticeText: ((holder: string, year: string) => string) | null;
}

const MIT_TEXT = (holder: string, year: string) => `MIT License

Copyright (c) ${year} ${holder}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

const ISC_TEXT = (holder: string, year: string) => `ISC License

Copyright (c) ${year} ${holder}

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
`;

const BSD_TEXT = (holder: string, year: string) => `BSD 3-Clause License

Copyright (c) ${year}, ${holder}
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
`;

const APACHE_NOTICE = (holder: string, year: string) =>
  `Copyright ${year} ${holder}

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

NOTE: This is the license header notice. The full Apache License 2.0 text
is long and is maintained by the Apache Software Foundation. Get the
official full text at:
http://www.apache.org/licenses/LICENSE-2.0
Save it as LICENSE alongside this notice.
`;

const GPL_NOTICE = (holder: string, year: string) =>
  `Copyright (C) ${year} ${holder}

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

NOTE: This is the recommended program header. The full GPL-3.0 text is
long and is maintained by the Free Software Foundation. Get the official
full text at:
https://www.gnu.org/licenses/gpl-3.0.txt
Save it as LICENSE (or COPYING) in your project root.
`;

const MPL_NOTICE = (holder: string, year: string) =>
  `Copyright (c) ${year} ${holder}

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.

NOTE: This is the per-file header notice recommended by the MPL. The full
Mozilla Public License 2.0 text is maintained by Mozilla. Get the official
full text at:
https://www.mozilla.org/en-US/MPL/2.0/
Save it as LICENSE in your project root.
`;

const LICENSES: LicenseInfo[] = [
  {
    id: "mit",
    name: "MIT",
    tagline: "The default for most open source. Do almost anything, keep the notice.",
    copyleft: "None",
    patent: false,
    conditions: ["Include license + copyright"],
    url: "https://opensource.org/licenses/MIT",
    fullText: MIT_TEXT,
    noticeText: null,
  },
  {
    id: "apache-2.0",
    name: "Apache-2.0",
    tagline: "Like MIT but with an explicit patent grant. Common for big projects.",
    copyleft: "None",
    patent: true,
    conditions: ["Include license + copyright", "State changes"],
    url: "http://www.apache.org/licenses/LICENSE-2.0",
    fullText: null,
    noticeText: APACHE_NOTICE,
  },
  {
    id: "gpl-3.0",
    name: "GPL-3.0",
    tagline: "Strong copyleft. Derivatives must stay open source under GPL.",
    copyleft: "Strong",
    patent: true,
    conditions: ["Include license + copyright", "State changes", "Disclose source", "Same license"],
    url: "https://www.gnu.org/licenses/gpl-3.0.txt",
    fullText: null,
    noticeText: GPL_NOTICE,
  },
  {
    id: "bsd-3-clause",
    name: "BSD-3-Clause",
    tagline: "MIT-like with an extra no-endorsement clause. Academic favourite.",
    copyleft: "None",
    patent: false,
    conditions: ["Include license + copyright"],
    url: "https://opensource.org/licenses/BSD-3-Clause",
    fullText: BSD_TEXT,
    noticeText: null,
  },
  {
    id: "isc",
    name: "ISC",
    tagline: "The shortest permissive license. Same spirit as MIT, fewer words.",
    copyleft: "None",
    patent: false,
    conditions: ["Include license + copyright"],
    url: "https://opensource.org/licenses/ISC",
    fullText: ISC_TEXT,
    noticeText: null,
  },
  {
    id: "mpl-2.0",
    name: "MPL-2.0",
    tagline: "Weak copyleft. Changed files stay open, your own files stay yours.",
    copyleft: "Weak (file-level)",
    patent: true,
    conditions: ["Include license + copyright", "Disclose source (changed files)", "Same license (changed files)"],
    url: "https://www.mozilla.org/en-US/MPL/2.0/",
    fullText: null,
    noticeText: MPL_NOTICE,
  },
];

function Cell({ ok }: { ok: boolean }) {
  return ok ? (
    <Check className="mx-auto h-4 w-4 text-emerald-500" aria-label="yes" />
  ) : (
    <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" aria-label="no" />
  );
}

function LicenseChooserTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("license-chooser", isPro);
  const seo = getToolSeo("license-chooser");

  const [picked, setPicked] = useState("mit");
  const [holder, setHolder] = useState("");
  const [year, setYear] = useState(() => String(new Date().getFullYear()));

  const active = LICENSES.find((l) => l.id === picked)!;
  const safeHolder = holder.trim() || "[fullname]";
  const safeYear = year.trim() || "[year]";

  const output = useMemo(() => {
    if (active.fullText) return active.fullText(safeHolder, safeYear);
    return active.noticeText!(safeHolder, safeYear);
  }, [active, safeHolder, safeYear]);

  const copyText = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(output);
      trial.recordUse();
      toast.success("LICENSE copied to clipboard");
    } catch {
      toast.error("Copy failed, select the text manually.");
    }
  };

  const download = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([output], { type: "text/plain" }), "LICENSE");
    trial.recordUse();
    toast.success("LICENSE downloaded");
  };

  return (
    <ToolPageShell toolId="license-chooser" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="License Chooser" left={trial.left} />

      {/* Comparison table */}
      <div className="mb-6 overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left font-semibold">License</th>
              <th className="px-4 py-3 text-left font-semibold">Copyleft</th>
              <th className="px-4 py-3 text-center font-semibold">Commercial use</th>
              <th className="px-4 py-3 text-center font-semibold">Modify + share</th>
              <th className="px-4 py-3 text-center font-semibold">Patent grant</th>
              <th className="px-4 py-3 text-center font-semibold">Disclose source</th>
              <th className="px-4 py-3 text-center font-semibold">Same license</th>
            </tr>
          </thead>
          <tbody>
            {LICENSES.map((l) => {
              const disclose = l.conditions.some((c) => c.startsWith("Disclose"));
              const same = l.conditions.some((c) => c.startsWith("Same"));
              return (
                <tr
                  key={l.id}
                  onClick={() => setPicked(l.id)}
                  className={cn(
                    "cursor-pointer border-b border-border/60 transition last:border-0 hover:bg-muted/30",
                    picked === l.id && "bg-primary/5",
                  )}
                >
                  <td className="px-4 py-3">
                    <span className="font-bold">{l.name}</span>
                    <span className="mt-0.5 block max-w-[220px] text-xs text-muted-foreground">{l.tagline}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{l.copyleft}</td>
                  <td className="px-2 py-3"><Cell ok /></td>
                  <td className="px-2 py-3"><Cell ok /></td>
                  <td className="px-2 py-3"><Cell ok={l.patent} /></td>
                  <td className="px-2 py-3"><Cell ok={disclose} /></td>
                  <td className="px-2 py-3"><Cell ok={same} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[13px] font-medium text-foreground/80">
              <Scale className="h-4 w-4" /> Choose a license
            </p>
            <div className="grid grid-cols-2 gap-2">
              {LICENSES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setPicked(l.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left transition",
                    picked === l.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <span className="block text-sm font-bold">{l.name}</span>
                  <span className="block text-[11px] text-muted-foreground">{l.copyleft}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="lc-holder">
              Copyright holder
            </label>
            <input
              id="lc-holder"
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              placeholder="e.g. Sameer Khan"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="lc-year">
              Year
            </label>
            <input
              id="lc-year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2026"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground/80">{active.name} conditions</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {active.conditions.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <a href={active.url} target="_blank" rel="noreferrer" className="mt-2 inline-block font-semibold text-primary hover:underline">
              Official license page
            </a>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionButton disabled={!trial.canUse} onClick={download}>
              <Download className="h-4 w-4" /> Download LICENSE
            </ActionButton>
            <button
              type="button"
              disabled={!trial.canUse}
              onClick={copyText}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy className="h-4 w-4" /> Copy
            </button>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">Files never leave your device. This is not legal advice.</p>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border bg-muted/40 px-5 py-3">
            <p className="text-sm font-bold">LICENSE preview <span className="font-normal text-muted-foreground">- {active.name}</span></p>
            {!active.fullText && (
              <p className="mt-1 text-xs text-muted-foreground">
                The full {active.name} text is a long official document, so this generates the standard header notice plus the link to the authoritative full text.
              </p>
            )}
          </div>
          <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap p-5 font-mono text-[13px] leading-relaxed">{output}</pre>
        </div>
      </div>
    </ToolPageShell>
  );
}
