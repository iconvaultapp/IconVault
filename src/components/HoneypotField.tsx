/**
 * Honeypot spam trap for public forms.
 *
 * Renders a text field positioned far off-screen (never display:none, so naive
 * bots still see and fill it) that real users never see, tab to, or autofill.
 * The field must stay empty on submit; a filled value means a bot.
 *
 * On the server side there is no handler to check (forms post via Supabase),
 * so each form checks `isBotSubmission()` in its submit handler and silently
 * discards the submission while pretending it succeeded.
 */
export function HoneypotField({
  name = "website",
  onFill,
}: {
  name?: string;
  onFill: (value: string) => void;
}) {
  return (
    <input
      type="text"
      name={name}
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      onChange={(e) => onFill(e.target.value)}
      className="hp-trap"
    />
  );
}

/** True when the honeypot value indicates a bot filled it. */
export function isBotSubmission(value: string): boolean {
  return value.trim().length > 0;
}
