import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "IPv6 ULA Generator - Free Online IPv6 Tool | IconVault",
    metaDescription: "Generate random RFC 4193 IPv6 unique local address prefixes (fd00::/8) for labs and home networks. Free, runs in your browser.",
    about: [
      "**IconVault**'s **IPv6 ULA Generator** creates random **RFC 4193 unique local address** prefixes for your private networks. Each prefix starts with **fd** (the fd00::/8 block), gets a **random 40-bit global ID** from your browser's secure random generator, and includes a random **16-bit subnet ID**, formatted as a /64.",
      "It is built for **homelabbers**, **network engineers**, and students who need private, **non-routable IPv6** space that will not collide with anyone else's. Generate 1, 5, 10, or 20 prefixes at once and copy them all with one click. Free and runs fully in your browser.",
    ],
    faqs: [
      { q: "Is the IPv6 ULA generator free?", a: "Yes. Generate as many prefixes as you like with no account and no cost." },
      { q: "What is an IPv6 ULA?", a: "A unique local address (RFC 4193) is IPv6's equivalent of private IPv4 space like 192.168.x.x. ULAs start with fd00::/8, are not routable on the public internet, and are meant for local networks." },
      { q: "Are the generated prefixes really unique?", a: "The 40-bit global ID is drawn from your browser's cryptographically secure random generator, so the chance of two people generating the same prefix is effectively zero." },
      { q: "What is the difference between fc00::/7 and fd00::/8?", a: "The L bit decides it: fc00::/8 is reserved for centrally assigned prefixes (never used in practice) while fd00::/8 is for locally generated ones. This tool always generates fd prefixes, which is the correct choice for self-assigned networks." },
      { q: "Can I use these in my router?", a: "Yes. Paste a generated /64 into your router's IPv6 LAN settings (pfSense, OPNsense, OpenWrt, MikroTik, and UniFi all accept ULA prefixes), or use them in Docker, Kubernetes, and lab topologies." },
      { q: "Does my data leave my browser?", a: "No. Generation happens locally with crypto.getRandomValues, so nothing is sent to any server." },
    ],
    tags: ["ipv6 ula generator", "ipv6 unique local address generator", "rfc 4193 ula generator", "generate ula prefix", "fd00 prefix generator", "random ipv6 ula", "ipv6 ula address generator", "unique local ipv6 prefix", "ipv6 private address generator", "fd00::/8 generator", "ipv6 local address", "ula ipv6 address", "ipv6 ula subnet", "ipv6 ula range", "what is ipv6 ula", "rfc 4193 explained", "ipv6 unique local", "ipv6 private network", "generate ipv6 address", "random ipv6 generator", "ipv6 subnet generator", "ipv6 /64 generator", "ipv6 address generator online", "ipv6 ula vs global unicast", "ipv6 site local", "ipv6 link local vs ula", "ula prefix calculator", "ipv6 ula global id", "fd00 global id random", "ipv6 ula generator online", "ipv6 address maker", "private ipv6 generator", "ipv6 lab addressing", "homelab ipv6 addressing", "pfsense ipv6 ula", "opnsense ula prefix", "mikrotik ipv6 ula", "ubiquiti ipv6 ula", "openwrt ipv6 ula", "ipv6 ula dns", "ipv6 ula for docker", "kubernetes ipv6 ula", "ipv6 ula fd prefix", "ipv6 fc00 vs fd00", "ula prefix length", "ipv6 ula example", "fd00 ula example prefix", "ipv6 ula planning", "enterprise ipv6 ula", "ipv6 ula best practices", "rfc 4193 generator", "ipv6 ula tool", "free ipv6 ula generator", "ipv6 local prefix tool", "unique local address generator", "ipv6 addressing tool"],
  };

export default seo;
