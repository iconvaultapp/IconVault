import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "DNS Lookup - Free Online DNS Record Checker Tool | IconVault",
    metaDescription: "Check DNS records for any domain instantly. A, AAAA, MX, TXT, CNAME, NS and SOA lookups over encrypted DNS. Free, no signup, runs in your browser.",
    about: [
      "**IconVault**'s **DNS Lookup** checks **DNS records** for any domain right in your browser. Query **A**, **AAAA**, **MX**, **TXT**, **CNAME**, **NS** and **SOA** records and see the **TTL**, record type and value for every answer. It is perfect for verifying **mail server records**, **SPF** and **DMARC** entries, nameserver changes and website migrations.",
      "Queries go straight from your browser to **Cloudflare's encrypted DNS-over-HTTPS** endpoint, so lookups are fast, private and tamper-proof, with no backend server in the middle and nothing logged. The tool is **100% free**, works without an account and runs entirely on your device. Visitors get 5 **free** lookups with no signup; **IconVault** Pro ($12/year) unlocks unlimited use of every tool.",
    ],
    faqs: [
      {
        q: "How do I look up DNS records for a domain?",
        a: "Type the domain (for example example.com), pick a record type like A or MX, and hit Lookup. The records appear with their TTL and values, ready to copy.",
      },
      {
        q: "Which DNS record types are supported?",
        a: "A, AAAA, MX, TXT, CNAME, NS and SOA. These cover website IPs, IPv6, mail servers, SPF and DMARC text records, aliases, nameservers and zone authority info.",
      },
      {
        q: "What does it mean if no records are found?",
        a: "It usually means the domain has no records of that type, the domain does not exist, or the query failed. The tool tells you which of these happened.",
      },
      {
        q: "Is this a DNS propagation checker?",
        a: "No. This tool queries live DNS through Cloudflare's encrypted resolver, so it shows current records as seen by that resolver, not results from many servers around the world.",
      },
      {
        q: "Is my query private?",
        a: "Yes. The lookup goes directly from your browser to Cloudflare's DNS-over-HTTPS endpoint with encryption, and IconVault never sees, stores or logs the domains you look up.",
      },
      {
        q: "How many free DNS lookups do I get?",
        a: "Every visitor gets 5 free lookups with no account needed. IconVault Pro ($12/year) gives unlimited lookups plus unlimited use of all 100+ tools.",
      },
    ],
    tags: [
      "dns lookup", "dns checker", "dns record lookup", "check dns records",
      "dns query online", "free dns lookup", "dns lookup online",
      "domain dns lookup", "mx record lookup", "txt record lookup",
      "a record lookup", "aaaa record lookup", "cname lookup",
      "ns record lookup", "soa record lookup", "spf record lookup",
      "dmarc record lookup", "check mx records", "check txt records",
      "check a records", "check cname records", "find nameservers for domain",
      "nameserver lookup", "check domain nameservers", "dns over https lookup",
      "encrypted dns lookup", "cloudflare dns lookup", "query dns records online",
      "dns records for website", "check dns for domain", "verify dns records",
      "dns troubleshooting tool", "website dns checker", "domain dns records check",
      "dns lookup no signup", "dns lookup tool free", "online dns query tool",
      "what are my dns records", "check ttl of dns record", "dns ttl checker",
      "find mail servers for domain", "check email dns records",
      "dns lookup for website", "a record checker", "cname record checker",
      "txt record checker", "dns analyzer online", "domain record lookup",
      "dig online", "online dig tool", "nslookup online", "free online nslookup",
    ],
  };

export default seo;
