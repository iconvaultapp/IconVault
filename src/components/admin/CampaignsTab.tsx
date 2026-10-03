import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Info, Loader2, Mail, Save } from "lucide-react";
import { toast } from "sonner";
import {
  listCampaigns,
  createCampaign,
  getNewsletterCount,
  type CampaignRow,
} from "@/lib/admin.tabs.functions";
import { StatCard } from "@/components/dashboard/StatCard";
import { DataTable } from "@/components/dashboard/DataTable";
import { cn } from "@/lib/utils";

function fmtDateTime(iso: string): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

const inputCls =
  "rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary/50";

/** Newsletter campaigns: draft subjects and bodies for later sending. */
export function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAll = useServerFn(listCampaigns);
  const fetchCount = useServerFn(getNewsletterCount);
  const createFn = useServerFn(createCampaign);

  const load = async () => {
    setLoading(true);
    try {
      const [{ campaigns }, { count }] = await Promise.all([
        fetchAll({ data: undefined }),
        fetchCount({ data: undefined }),
      ]);
      setCampaigns(campaigns);
      setCount(count);
    } catch {
      toast.error("Could not load campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveDraft = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and body are required");
      return;
    }
    setSaving(true);
    try {
      const { ok } = await createFn({ data: { subject: subject.trim(), body: body.trim() } });
      if (ok) {
        toast.success("Draft saved");
        setSubject("");
        setBody("");
        await load();
      } else toast.error("Could not save draft");
    } catch {
      toast.error("Could not save draft");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading campaigns…
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Newsletter emails" value={count} icon={Mail} />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold">New campaign draft</h3>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="October product update"
              maxLength={200}
              className={inputCls}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Body</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="Write the email content…"
              className={cn(inputCls, "resize-y")}
            />
          </label>
          <div>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveDraft()}
              className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save as draft
            </button>
          </div>
        </div>
      </div>

      <h3 className="mt-8 mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Campaigns ({campaigns.length})
      </h3>
      <DataTable<CampaignRow>
        minWidth={640}
        emptyText="No campaigns yet. Draft your first one above."
        columns={[
          {
            key: "subject",
            header: "Subject",
            render: (c) => <span className="font-medium">{c.subject}</span>,
          },
          {
            key: "status",
            header: "Status",
            render: (c) => (
              <span className="inline-block whitespace-nowrap rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold capitalize text-muted-foreground">
                {c.status}
              </span>
            ),
          },
          { key: "date", header: "Created", render: (c) => fmtDateTime(c.created_at) },
        ]}
        rows={campaigns}
      />

      <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Drafts only, connect an email provider to send.
      </p>
    </div>
  );
}
