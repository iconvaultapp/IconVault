// Homepage waitlist form (extracted from src/routes/index.tsx, v26
// PERF-M3): lazy-loaded so it stays out of the homepage entry chunk.
import { useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { HoneypotField, isBotSubmission } from "@/components/HoneypotField";

function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [trap, setTrap] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBotSubmission(trap)) {
      // Bot filled the honeypot: silently discard, pretend success.
      setDone(true);
      setEmail("");
      toast.success("You're on the list");
      return;
    }
    if (!email.trim()) return;
    setLoading(true);
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await supabase.from("waitlist").insert({ email: email.trim() });
    setLoading(false);
    if (error) {
      toast.error(
        error.code === "23505" ? "You're already on the list" : "Something went wrong, try again",
      );
      return;
    }
    setDone(true);
    setEmail("");
    toast.success("You're on the list");
  };

  if (done) {
    return (
      <div className="surface-card flex items-center justify-center gap-2 px-6 py-5 text-sm text-primary">
        <Check className="h-4 w-4" /> You're on the list - we'll be in touch.
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex w-full flex-col gap-2.5 sm:flex-row">
      <HoneypotField onFill={setTrap} />
      <input
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@studio.com"
        aria-label="Email address"
        className="focus-ring h-14 w-full min-w-0 flex-1 rounded-full border border-border bg-surface px-6 text-base outline-none placeholder:text-muted-foreground sm:h-12 sm:px-5"
      />
      <button
        type="submit"
        disabled={loading}
        className="focus-ring h-14 w-full shrink-0 rounded-full bg-ink px-8 text-base font-semibold text-background transition-transform hover:scale-[1.03] disabled:opacity-50 sm:h-12 sm:w-auto sm:px-6 sm:text-sm sm:font-medium"
      >
        {loading ? "Adding…" : "Join the list"}
      </button>
    </form>
  );
}

export default WaitlistForm;
