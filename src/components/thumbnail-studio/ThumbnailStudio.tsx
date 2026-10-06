// IconVault Thumbnail Studio - gallery + Canva-style editor shell.
// Editor engine: Fabric.js (MIT).

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, Lock } from "lucide-react";
import TemplateGallery from "./TemplateGallery";
import CanvaEditor from "./CanvaEditor";
import type { TrialState } from "@/lib/tool-trial";

export default function ThumbnailStudio({ isPro, trial }: { isPro: boolean; trial: TrialState }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showPro, setShowPro] = useState(false);

  return (
    <div>
      {activeId ? (
        <CanvaEditor
          key={activeId}
          templateId={activeId}
          isPro={isPro}
          trial={trial}
          onBack={() => setActiveId(null)}
          onProNeeded={() => setShowPro(true)}
        />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold sm:text-2xl">Pick a template to start editing</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                650 editable designs across 15 categories - click any template to open the editor.
                Double-click text to edit, drag to move, export HD PNG, JPG, WebP or PDF.
              </p>
            </div>
            {!isPro && (
              <button
                onClick={() => setShowPro(true)}
                className="flex items-center gap-1.5 rounded-xl bg-amber-100 px-4 py-2 text-sm font-bold text-amber-800 hover:bg-amber-200"
              >
                <Crown className="h-4 w-4" /> 240 free - unlock all 650
              </button>
            )}
          </div>
          <TemplateGallery
            isPro={isPro}
            onOpen={(id) => setActiveId(id)}
            onProNeeded={() => setShowPro(true)}
          />
        </>
      )}

      {showPro && (
        <div className="fixed inset-0 z-[200] grid place-items-center bg-black/60 p-4" onClick={() => setShowPro(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-background p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <Crown className="mx-auto mb-3 h-10 w-10 text-amber-500" />
            <h3 className="text-lg font-extrabold">Unlock all 650 templates</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Pro members get every template, unlimited HD exports and all 33 IconVault tools.
            </p>
            <Link
              to="/pro"
              className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white hover:opacity-90"
            >
              <Crown className="h-4 w-4" /> Get Pro - from $19/yr
            </Link>
            <button onClick={() => setShowPro(false)} className="mt-3 text-sm font-semibold text-muted-foreground hover:text-foreground">
              Keep editing free templates
            </button>
            <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" /> 240 templates are free forever
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
