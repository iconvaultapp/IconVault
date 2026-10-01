// /tools/credential-management-playground - Real Credential Management API lab:
// support matrix, password credential retrieval, passkey creation and preventSilentAccess.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Fingerprint, KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/credential-management-playground")({
  head: () => {
    const seo = getToolSeoMeta("credential-management-playground");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: CredentialTool,
});

type LogEntry = { t: string; kind: "info" | "ok" | "err"; text: string };

function now(): string {
  return new Date().toLocaleTimeString();
}

function bufToB64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randBytes(n: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(new ArrayBuffer(n));
  crypto.getRandomValues(b);
  return b;
}

type Support = {
  checked: boolean;
  credentials: boolean;
  publicKeyCredential: boolean;
  platformAuth: boolean | null;
  conditionalMediation: boolean | null;
};

const MEDIATIONS = ["optional", "required", "silent"] as const;

function CredentialTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("credential-management-playground", isPro);
  const seo = getToolSeo("credential-management-playground");

  const [support, setSupport] = useState<Support>({
    checked: false,
    credentials: false,
    publicKeyCredential: false,
    platformAuth: null,
    conditionalMediation: null,
  });
  const [mediation, setMediation] = useState<(typeof MEDIATIONS)[number]>("optional");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [lastResult, setLastResult] = useState<string>("");
  const logRef = useRef<HTMLDivElement>(null);

  const push = useCallback((kind: LogEntry["kind"], text: string) => {
    setLog((p) => [...p.slice(-80), { t: now(), kind, text }]);
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  const checkSupport = useCallback(async () => {
    const creds = "credentials" in navigator;
    const pkc = typeof PublicKeyCredential !== "undefined";
    let platformAuth: boolean | null = null;
    let conditionalMediation: boolean | null = null;
    if (pkc) {
      try {
        platformAuth = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch { platformAuth = null; }
      try {
        conditionalMediation =
          await PublicKeyCredential.isConditionalMediationAvailable();
      } catch { conditionalMediation = null; }
    }
    setSupport({ checked: true, credentials: creds, publicKeyCredential: pkc, platformAuth, conditionalMediation });
    push("info", `Support check: credentials=${creds}, PublicKeyCredential=${pkc}, platformAuth=${platformAuth}, conditionalMediation=${conditionalMediation}`);
  }, [push]);

  useEffect(() => {
    void checkSupport();
  }, [checkSupport]);

  const getPasswordCredential = useCallback(async () => {
    if (!trial.canUse || busy) return;
    if (!("credentials" in navigator)) {
      push("err", "navigator.credentials is not available in this browser.");
      return;
    }
    setBusy(true);
    push("info", `navigator.credentials.get({ password: true, mediation: "${mediation}" })`);
    try {
      const cred = (await navigator.credentials.get({
        password: true,
        mediation,
      } as CredentialRequestOptions)) as (Credential & { name?: string; iconURL?: string; password?: string }) | null;
      trial.recordUse();
      if (!cred) {
        push("ok", "Returned null: no stored password credential for this site (expected on a fresh browser).");
        setLastResult("null (no stored credential)");
        return;
      }
      push("ok", `Got credential: type=${cred.type}, id=${cred.id}, name=${cred.name}`);
      setLastResult(JSON.stringify({ type: cred.type, id: cred.id, name: cred.name, iconURL: cred.iconURL }, null, 2));
    } catch (e) {
      push("err", `get() threw: ${e instanceof Error ? e.message : String(e)}`);
      setLastResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }, [trial, busy, mediation, push]);

  const createPasskey = useCallback(async () => {
    if (!trial.canUse || busy) return;
    if (typeof PublicKeyCredential === "undefined") {
      push("err", "WebAuthn is not available in this browser.");
      return;
    }
    setBusy(true);
    push("info", "navigator.credentials.create({ publicKey }) - invoking the real platform authenticator...");
    try {
      const rpId = window.location.hostname;
      const createOptions: PublicKeyCredentialCreationOptions = {
        challenge: randBytes(32),
        rp: { name: "IconVault Demo", id: rpId },
        user: {
          id: randBytes(32),
          name: "demo@example.com",
          displayName: "Demo User",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: { userVerification: "discouraged" },
        timeout: 60000,
        attestation: "none",
        excludeCredentials: [],
      };
      const cred = (await navigator.credentials.create({
        publicKey: createOptions,
      })) as PublicKeyCredential | null;
      trial.recordUse();
      if (!cred) {
        push("err", "create() returned null.");
        setLastResult("null");
        return;
      }
      const resp = cred.response as AuthenticatorAttestationResponse;
      const clientData = JSON.parse(new TextDecoder().decode(resp.clientDataJSON)) as { type: string; origin: string };
      push("ok", `Passkey created: id=${cred.id.slice(0, 24)}..., clientData type=${clientData.type}, origin=${clientData.origin}`);
      setLastResult(
        JSON.stringify(
          {
            id: cred.id,
            type: cred.type,
            rpId,
            clientDataType: clientData.type,
            clientDataOrigin: clientData.origin,
            attestationObjectBytes: resp.attestationObject.byteLength,
          },
          null,
          2,
        ),
      );
      toast.success("Passkey created with the real authenticator");
    } catch (e) {
      push("err", `create() threw: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`);
      setLastResult(`Error: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`);
    } finally {
      setBusy(false);
    }
  }, [trial, busy, push]);

  const preventSilent = useCallback(async () => {
    if (!("credentials" in navigator)) {
      push("err", "navigator.credentials is not available.");
      return;
    }
    try {
      await navigator.credentials.preventSilentAccess();
      push("ok", "preventSilentAccess() resolved: silent credential access is now blocked until the user signs in again.");
    } catch (e) {
      push("err", `preventSilentAccess() threw: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [push]);

  const row = (label: string, value: boolean | null) => (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-bold", value === true ? "text-emerald-500" : value === false ? "text-red-500" : "text-muted-foreground")}>
        {value === null ? "unknown" : value ? "yes" : "no"}
      </span>
    </div>
  );

  return (
    <ToolPageShell toolId="credential-management-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Credential Management" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <div className="space-y-2 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Support matrix</h3>
              <ActionButton onClick={() => void checkSupport()}>
                <ShieldCheck className="h-4 w-4" /> Re-check
              </ActionButton>
            </div>
            {row("navigator.credentials", support.credentials)}
            {row("PublicKeyCredential (WebAuthn)", support.publicKeyCredential)}
            {row("Platform authenticator", support.platformAuth)}
            {row("Conditional mediation", support.conditionalMediation)}
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">Password credential flow</p>
              <div className="flex gap-2">
                {MEDIATIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMediation(m)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm font-bold transition",
                      mediation === m
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <ActionButton busy={busy} disabled={!trial.canUse || !support.credentials} onClick={() => void getPasswordCredential()}>
              <KeyRound className="h-4 w-4" /> {busy ? "Requesting..." : "Request credential"}
            </ActionButton>
            <ActionButton busy={busy} disabled={!trial.canUse || !support.publicKeyCredential} onClick={() => void createPasskey()}>
              <Fingerprint className="h-4 w-4" /> {busy ? "Waiting for authenticator..." : "Create demo passkey"}
            </ActionButton>
            <button
              type="button"
              onClick={() => void preventSilent()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-bold transition hover:border-primary/40"
            >
              <ShieldCheck className="h-4 w-4" /> preventSilentAccess()
            </button>
            {!isPro && (
              <p className="text-xs text-muted-foreground">
                {trial.left} of 5 free runs left. Everything happens on this device, nothing is sent anywhere.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">API log</h3>
              <button
                type="button"
                onClick={() => setLog([])}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
            <div ref={logRef} className="h-56 space-y-1.5 overflow-y-auto rounded-xl bg-background p-3 font-mono text-xs">
              {log.length === 0 && <p className="text-muted-foreground">Run a flow on the left to see real API calls and results here.</p>}
              {log.map((e, i) => (
                <p key={i} className={cn(e.kind === "err" ? "text-red-500" : e.kind === "ok" ? "text-emerald-500" : "text-foreground/80")}>
                  <span className="text-muted-foreground">[{e.t}]</span> {e.text}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-bold">Last result</h3>
            <pre className="max-h-64 overflow-auto rounded-xl bg-background p-4 font-mono text-xs text-foreground/90">
              {lastResult || "No result yet."}
            </pre>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p><strong className="text-foreground">optional</strong> returns a stored credential silently when there is exactly one, <strong className="text-foreground">required</strong> always shows the account chooser, <strong className="text-foreground">silent</strong> never shows UI and returns null instead.</p>
              <p>The passkey button calls the real platform authenticator (Touch ID, Windows Hello, or a security key). On a fresh profile you will see the native prompt; canceling it is a normal, honest result and is logged above.</p>
            </div>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
