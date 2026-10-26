/**
 * Disposable / temporary-mail guard.
 *
 * A temp-mail inbox (mailinator, yopmail, guerrillamail, 10-minute mails
 * ...) lets one person mint unlimited throwaway accounts, which defeats
 * the per-account free trial on the tools. This list blocks the well-known
 * providers at both sign-up and sign-in, so accounts made before this
 * check also cannot log in with a throwaway inbox.
 *
 * Deliberately NOT listed: real providers (Gmail, Outlook, Yahoo, iCloud,
 * Proton, Zoho ...) and privacy relays that forward to a real inbox
 * (Apple Hide My Email, Firefox Relay, DuckDuckGo) - blocking those would
 * lock out genuine users.
 *
 * The list is curated, not exhaustive: new temp providers appear all the
 * time. Add a domain here when a new one shows up in abuse reports.
 * Subdomains are covered automatically (mail.example.com matches
 * example.com), so providers that rotate subdomains are caught too.
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  // The big three
  "mailinator.com",
  "mailinator.net",
  "mailinator.org",
  "mailinator2.com",
  "mailinater.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamail.info",
  "guerrillamail.biz",
  "guerrillamail.de",
  "guerrillamailblock.com",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "yopmail.org",
  "yopmail.info",
  // 10-minute / temp-mail family
  "10minutemail.com",
  "10minutemail.net",
  "10minutemail.org",
  "10minutemail.co.za",
  "10minutemail.co.uk",
  "10minutemail.de",
  "20minutemail.com",
  "temp-mail.org",
  // temp-mail.org rotating domain - proven 2026-10-26: it generated a
  // gecof52338@goldvester.com inbox that received IconVault confirmations.
  "goldvester.com",
  "temp-mail.io",
  "temp-mail.com",
  "temp-mail.de",
  "temp-mail.net",
  "tempmail.com",
  "tempmail.net",
  "tempmail.org",
  "tempmail.eu",
  "tempmail.fr",
  "tempmail.plus",
  "tempmailaddress.com",
  "tempmailer.com",
  "tempmailer.net",
  "tempmail.de",
  "tempmailo.com",
  "tempail.com",
  "tempemail.com",
  "tempemail.net",
  "tempemail.org",
  "tempemails.com",
  "tempemails.net",
  "tempemailaddress.com",
  "tempinbox.com",
  "tempinbox.co.uk",
  "tempinbox.net",
  "tempr.email",
  "tempr.net",
  "tempomail.com",
  "tempomail.fr",
  "mytemp.email",
  "mytempemail.com",
  "mail-temp.com",
  "mailtemp.net",
  "mailtm.com",
  "mail.tm",
  // Trash / throwaway family
  "trashmail.com",
  "trashmail.me",
  "trashmail.net",
  "trashmail.org",
  "trashmail.io",
  "trashmail.ws",
  "trashmail.de",
  "trashmail.fr",
  "trashmail.at",
  "trash-mail.com",
  "trash-mail.de",
  "mytrashmail.com",
  "mytrashmail.net",
  "throwawaymail.com",
  "throwawaymail.org",
  "throwawaymail.net",
  // Assorted well-known providers
  "mohmal.com",
  "mohmal.in",
  "mohmal.im",
  "fakeinbox.com",
  "fakeinbox.net",
  "fakeinbox.org",
  "fake-mail.com",
  "fake-mail.net",
  "fakemail.com",
  "fakemail.net",
  "emailfake.com",
  "emailfake.net",
  "getnada.com",
  "getnada.net",
  "dispostable.com",
  "disposablemail.com",
  "disposableemail.com",
  "disposableemailaddresses.com",
  "sharklasers.com",
  "grr.la",
  "spamgourmet.com",
  "spamgourmet.net",
  "spamgourmet.org",
  "maildrop.cc",
  "maildrop.cf",
  "maildrop.ga",
  "maildrop.gq",
  "maildrop.ml",
  "emailondeck.com",
  "mintemail.com",
  "mailnesia.com",
  "spam4.me",
  "moakt.com",
  "incognitomail.com",
  "incognitomail.net",
  "incognitomail.org",
  "anonymbox.com",
  "bustemp.com",
  "dropmail.me",
  "spambox.us",
  "spambox.me",
  "spambox.org",
  "spambog.com",
  "spambog.net",
  "spambog.ru",
  "spamfree24.com",
  "spamfree24.net",
  "spamfree24.org",
  "spamfree24.de",
  "spamfree24.eu",
  "mailforspam.com",
  "mailforspam.net",
  "mailforspam.org",
  "mailcatch.com",
  "mailmetrash.com",
  "mailmetrash.net",
  "mailme24.com",
  "mailme24.net",
  "mailme24.org",
  "mailme24.de",
  "mailsucker.com",
  "mailsucker.net",
  "mailsucker.org",
  "mailzilla.com",
  "mailzilla.net",
  "mailzilla.org",
  "filzmail.com",
  "filzmail.net",
  "filzmail.org",
  "e4ward.com",
  "deadaddress.com",
  "deadaddress.net",
  "deadaddress.org",
  "objectmail.com",
  "proxymail.eu",
  "rcpt.at",
  "selfdestructingmail.com",
  "sendspam.org",
  "shortmail.net",
  "harakirimail.com",
  "jetable.org",
  "jetable.com",
  "jetable.net",
  "pokemail.net",
  "inboxbear.com",
  "getairmail.com",
  "tmail.com",
  "tmail.ws",
]);

/** True when the address belongs to a known temporary-mail provider. */
export function isDisposableEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at === -1) return false;
  let domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain) return false;
  // Walk up through parent domains so subdomains are caught too:
  // sub.mailinator.com -> mailinator.com.
  while (domain) {
    if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;
    const dot = domain.indexOf(".");
    if (dot === -1) break;
    domain = domain.slice(dot + 1);
  }
  return false;
}

export const DISPOSABLE_EMAIL_MESSAGE =
  "Temporary email addresses are not allowed. Please use a permanent email address.";
