// /tools/port-reference - Reference of 130 well-known and registered ports:
// port, protocol, service, security note. Search, click to copy. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Plug, Search } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/port-reference";
import toolSeoMeta from "@/lib/tool-seo-meta-data/port-reference";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/port-reference")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/port-reference";
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
  component: PortReferenceTool,
});

interface PortRow { port: number; proto: string; service: string; note: string }

const PORTS: PortRow[] = [
  { port: 20, proto: "TCP", service: "FTP data", note: "Plaintext file transfer; prefer SFTP/SCP." },
  { port: 21, proto: "TCP", service: "FTP control", note: "Credentials sent in cleartext; avoid on public nets." },
  { port: 22, proto: "TCP", service: "SSH", note: "Keep patched, use keys, rate-limit brute force attempts." },
  { port: 23, proto: "TCP", service: "Telnet", note: "Legacy and fully plaintext; disable, use SSH." },
  { port: 25, proto: "TCP", service: "SMTP", note: "Watch for open relay; most providers block outbound 25." },
  { port: 49, proto: "TCP/UDP", service: "TACACS+", note: "Device authentication; keep off public internet." },
  { port: 53, proto: "TCP/UDP", service: "DNS", note: "Common for amplification attacks; restrict recursion." },
  { port: 67, proto: "UDP", service: "DHCP server", note: "Rogue DHCP servers enable MITM; use snooping." },
  { port: 68, proto: "UDP", service: "DHCP client", note: "Client-side only; no inbound rule needed." },
  { port: 69, proto: "UDP", service: "TFTP", note: "No authentication at all; never expose publicly." },
  { port: 79, proto: "TCP", service: "Finger", note: "Leaks user info; almost always disabled today." },
  { port: 80, proto: "TCP", service: "HTTP", note: "Plaintext web; redirect everything to 443." },
  { port: 88, proto: "TCP/UDP", service: "Kerberos", note: "Windows/AD auth; restrict to domain network." },
  { port: 110, proto: "TCP", service: "POP3", note: "Plaintext mail retrieval; prefer 995." },
  { port: 111, proto: "TCP/UDP", service: "RPCbind", note: "Frequent attack target; firewall aggressively." },
  { port: 113, proto: "TCP", service: "Ident", note: "Legacy user lookup; usually safe to drop." },
  { port: 119, proto: "TCP", service: "NNTP", note: "Usenet news; plaintext." },
  { port: 123, proto: "UDP", service: "NTP", note: "Used in reflection attacks; use authenticated NTP." },
  { port: 135, proto: "TCP", service: "MS RPC", note: "Windows RPC endpoint mapper; never expose to internet." },
  { port: 137, proto: "UDP", service: "NetBIOS Name", note: "Leaks machine info; block at perimeter." },
  { port: 138, proto: "UDP", service: "NetBIOS Datagram", note: "Legacy Windows networking; disable with 137/139." },
  { port: 139, proto: "TCP", service: "NetBIOS Session", note: "Old SMB over NetBIOS; prefer SMB3 on 445." },
  { port: 143, proto: "TCP", service: "IMAP", note: "Plaintext mail access; prefer 993." },
  { port: 161, proto: "UDP", service: "SNMP", note: "Change default community strings; prefer SNMPv3." },
  { port: 162, proto: "UDP", service: "SNMP trap", note: "Inbound traps; whitelist senders." },
  { port: 179, proto: "TCP", service: "BGP", note: "Router peering; authenticate sessions." },
  { port: 194, proto: "TCP", service: "IRC", note: "Chat relay; plaintext, historically botnet C2." },
  { port: 389, proto: "TCP/UDP", service: "LDAP", note: "Directory lookups; prefer LDAPS on 636." },
  { port: 427, proto: "TCP/UDP", service: "SLP", note: "Service discovery; can leak device details." },
  { port: 443, proto: "TCP", service: "HTTPS", note: "Encrypted web; keep TLS configs current." },
  { port: 445, proto: "TCP", service: "SMB", note: "Ransomware favorite; never expose to internet." },
  { port: 465, proto: "TCP", service: "SMTPS", note: "Legacy implicit TLS mail submission." },
  { port: 500, proto: "UDP", service: "IKE (IPsec)", note: "VPN key exchange; restrict to VPN endpoints." },
  { port: 512, proto: "TCP", service: "rexec", note: "Legacy remote exec; disable." },
  { port: 513, proto: "TCP", service: "rlogin", note: "Legacy, trusts hosts; disable, use SSH." },
  { port: 514, proto: "UDP", service: "Syslog", note: "Plaintext logs in transit; prefer TLS syslog." },
  { port: 515, proto: "TCP", service: "LPD print", note: "Printer protocol; restrict to LAN." },
  { port: 520, proto: "UDP", service: "RIP", note: "Legacy routing protocol; authenticate if used." },
  { port: 546, proto: "UDP", service: "DHCPv6 client", note: "Client-side only." },
  { port: 547, proto: "UDP", service: "DHCPv6 server", note: "Restrict like DHCPv4." },
  { port: 548, proto: "TCP", service: "AFP", note: "Apple file sharing; largely replaced by SMB." },
  { port: 554, proto: "TCP", service: "RTSP", note: "Camera/stream control; often weak default creds." },
  { port: 587, proto: "TCP", service: "SMTP submission", note: "Authenticated mail send with STARTTLS." },
  { port: 593, proto: "TCP", service: "HTTP RPC", note: "Windows RPC over HTTP; restrict." },
  { port: 623, proto: "UDP", service: "IPMI", note: "Out-of-band management; isolate on mgmt VLAN." },
  { port: 631, proto: "TCP", service: "IPP / CUPS", note: "Printing; expose only where needed." },
  { port: 636, proto: "TCP", service: "LDAPS", note: "LDAP over TLS; preferred over 389." },
  { port: 646, proto: "TCP", service: "LDP", note: "MPLS label distribution; carrier networks." },
  { port: 989, proto: "TCP", service: "FTPS data", note: "FTP over TLS data channel." },
  { port: 990, proto: "TCP", service: "FTPS control", note: "FTP over TLS control channel." },
  { port: 993, proto: "TCP", service: "IMAPS", note: "IMAP over TLS; preferred over 143." },
  { port: 995, proto: "TCP", service: "POP3S", note: "POP3 over TLS; preferred over 110." },
  { port: 1080, proto: "TCP", service: "SOCKS proxy", note: "Often abused as open proxy; authenticate." },
  { port: 1099, proto: "TCP", service: "RMI registry", note: "Java RMI; restrict, deserialization attacks." },
  { port: 1194, proto: "TCP/UDP", service: "OpenVPN", note: "VPN default; keep server updated." },
  { port: 1241, proto: "TCP", service: "Nessus", note: "Vulnerability scanner console; restrict access." },
  { port: 1311, proto: "TCP", service: "Dell OpenManage", note: "Server management UI; isolate." },
  { port: 1433, proto: "TCP", service: "SQL Server", note: "Prime brute-force target; never expose directly." },
  { port: 1434, proto: "UDP", service: "SQL Server Browser", note: "Used in reflection attacks; block externally." },
  { port: 1521, proto: "TCP", service: "Oracle DB", note: "Restrict to app servers; audit listeners." },
  { port: 1701, proto: "UDP", service: "L2TP", note: "Usually paired with IPsec." },
  { port: 1720, proto: "TCP", service: "H.323", note: "VoIP signaling; restrict to voice VLAN." },
  { port: 1723, proto: "TCP", service: "PPTP", note: "Broken crypto; do not use for VPN anymore." },
  { port: 1812, proto: "UDP", service: "RADIUS auth", note: "Network auth; protect shared secrets." },
  { port: 1813, proto: "UDP", service: "RADIUS accounting", note: "Usage records; protect like 1812." },
  { port: 1900, proto: "UDP", service: "SSDP", note: "UPnP discovery; reflection abuse, disable if unused." },
  { port: 2049, proto: "TCP", service: "NFS", note: "Restrict exports; v4 with Kerberos preferred." },
  { port: 2082, proto: "TCP", service: "cPanel", note: "Hosting panel; enforce 2FA." },
  { port: 2083, proto: "TCP", service: "cPanel HTTPS", note: "Secure cPanel; still enforce 2FA." },
  { port: 2086, proto: "TCP", service: "WHM", note: "Hosting admin; restrict by IP." },
  { port: 2087, proto: "TCP", service: "WHM HTTPS", note: "Secure WHM; restrict by IP." },
  { port: 2095, proto: "TCP", service: "cPanel webmail", note: "Prefer the HTTPS variant 2096." },
  { port: 2096, proto: "TCP", service: "cPanel webmail HTTPS", note: "Encrypted webmail access." },
  { port: 2181, proto: "TCP", service: "ZooKeeper", note: "No auth by default; bind to localhost/cluster." },
  { port: 2375, proto: "TCP", service: "Docker API", note: "Unauthenticated root access; NEVER expose." },
  { port: 2376, proto: "TCP", service: "Docker API TLS", note: "TLS-protected Docker; use mutual TLS." },
  { port: 2379, proto: "TCP", service: "etcd client", note: "K8s data store; restrict to cluster." },
  { port: 2380, proto: "TCP", service: "etcd peer", note: "Cluster-only traffic." },
  { port: 3000, proto: "TCP", service: "Dev servers", note: "Node/Rails dev default; not for production." },
  { port: 3268, proto: "TCP", service: "AD Global Catalog", note: "Domain-joined networks only." },
  { port: 3306, proto: "TCP", service: "MySQL/MariaDB", note: "Brute-force target; bind to app hosts only." },
  { port: 3389, proto: "TCP", service: "RDP", note: "Top ransomware vector; use VPN + MFA." },
  { port: 3493, proto: "TCP", service: "NUT UPS", note: "UPS monitoring; LAN only." },
  { port: 3690, proto: "TCP", service: "Subversion", note: "Version control; prefer SSH transport." },
  { port: 4369, proto: "TCP", service: "EPMD (Erlang)", note: "RabbitMQ/Elixir node discovery; restrict." },
  { port: 4500, proto: "UDP", service: "IPsec NAT-T", note: "VPN traversal; pair with 500." },
  { port: 4789, proto: "UDP", service: "VXLAN", note: "Overlay networking; data-center fabric only." },
  { port: 47808, proto: "UDP", service: "BACnet", note: "Building automation; isolate OT networks." },
  { port: 5000, proto: "TCP", service: "Flask / dev", note: "Dev default; debug mode is remote code exec." },
  { port: 5060, proto: "TCP/UDP", service: "SIP", note: "VoIP signaling; toll-fraud target." },
  { port: 5061, proto: "TCP", service: "SIPS", note: "SIP over TLS; preferred over 5060." },
  { port: 5353, proto: "UDP", service: "mDNS", note: "Local discovery; can leak hostnames." },
  { port: 5432, proto: "TCP", service: "PostgreSQL", note: "Restrict to app servers; strong passwords." },
  { port: 5601, proto: "TCP", service: "Kibana", note: "ES dashboard; enable auth + TLS." },
  { port: 5672, proto: "TCP", service: "AMQP (RabbitMQ)", note: "Message broker; restrict to producers." },
  { port: 5900, proto: "TCP", service: "VNC", note: "Weak auth historically; tunnel over SSH." },
  { port: 5984, proto: "TCP", service: "CouchDB", note: "Enable admin party off; require auth." },
  { port: 5985, proto: "TCP", service: "WinRM HTTP", note: "Windows remote mgmt; prefer 5986." },
  { port: 5986, proto: "TCP", service: "WinRM HTTPS", note: "Encrypted WinRM; still restrict." },
  { port: 6379, proto: "TCP", service: "Redis", note: "No auth by default; bind to localhost." },
  { port: 6443, proto: "TCP", service: "Kubernetes API", note: "Cluster crown jewels; RBAC + TLS." },
  { port: 6667, proto: "TCP", service: "IRC", note: "Chat; plaintext, botnet C2 history." },
  { port: 7000, proto: "TCP", service: "Cassandra", note: "Inter-node gossip; cluster only." },
  { port: 8000, proto: "TCP", service: "Alt HTTP", note: "Common dev/alt web port." },
  { port: 8008, proto: "TCP", service: "Alt HTTP", note: "Proxy/alt web traffic." },
  { port: 8009, proto: "TCP", service: "Tomcat AJP", note: "Ghostcat CVE-2020-1938; update/disable." },
  { port: 8020, proto: "TCP", service: "HDFS NameNode", note: "Hadoop internals; cluster only." },
  { port: 8080, proto: "TCP", service: "HTTP proxy / alt", note: "Often admin UIs; authenticate." },
  { port: 8088, proto: "TCP", service: "Hadoop YARN", note: "Cluster only; RCE history." },
  { port: 830, proto: "TCP", service: "NETCONF", note: "Network device config over SSH." },
  { port: 8443, proto: "TCP", service: "HTTPS alt", note: "Alt TLS web; same hardening as 443." },
  { port: 9000, proto: "TCP", service: "PHP-FPM / SonarQube", note: "Restrict; debug endpoints leak." },
  { port: 9042, proto: "TCP", service: "Cassandra CQL", note: "Client queries; authenticate." },
  { port: 9092, proto: "TCP", service: "Kafka", note: "Broker; enable SASL/TLS." },
  { port: 9200, proto: "TCP", service: "Elasticsearch", note: "No auth by default; bind to localhost." },
  { port: 9300, proto: "TCP", service: "ES transport", note: "Cluster traffic only." },
  { port: 9870, proto: "TCP", service: "HDFS web UI", note: "Hadoop UI; restrict." },
  { port: 9987, proto: "UDP", service: "TeamSpeak", note: "Voice server default." },
  { port: 10000, proto: "TCP", service: "Webmin", note: "Server admin UI; restrict + 2FA." },
  { port: 10250, proto: "TCP", service: "kubelet", note: "K8s node agent; restrict." },
  { port: 10251, proto: "TCP", service: "kube-scheduler", note: "K8s internals; cluster only." },
  { port: 10252, proto: "TCP", service: "kube-controller", note: "K8s internals; cluster only." },
  { port: 11211, proto: "TCP/UDP", service: "Memcached", note: "UDP reflection abuse; disable UDP, bind local." },
  { port: 15672, proto: "TCP", service: "RabbitMQ mgmt", note: "Change default guest creds." },
  { port: 25565, proto: "TCP", service: "Minecraft", note: "Game server default." },
  { port: 27015, proto: "TCP/UDP", service: "Source games", note: "Valve game server default." },
  { port: 27017, proto: "TCP", service: "MongoDB", note: "Ransomware wiped open DBs; enable auth." },
  { port: 32400, proto: "TCP", service: "Plex", note: "Media server; use Plex auth." },
  { port: 61616, proto: "TCP", service: "ActiveMQ", note: "Message broker; restrict console." },
  { port: 64738, proto: "TCP/UDP", service: "Mumble", note: "Voice chat server." },
];

async function doCopy(port: number, trial: { canUse: boolean; recordUse: () => void }) {
  if (!trial.canUse) return;
  try {
    await navigator.clipboard.writeText(String(port));
    toast.success(`Port ${port} copied`);
    trial.recordUse();
  } catch {
    toast.error("Copy failed");
  }
}

function PortReferenceTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("port-reference", isPro);
  const seo = toolSeo;

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PORTS;
    return PORTS.filter(
      (p) =>
        String(p.port).includes(q) ||
        p.service.toLowerCase().includes(q) ||
        p.proto.toLowerCase().includes(q) ||
        p.note.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <ToolPageShell toolId="port-reference" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Port Reference" left={trial.left} />

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by port, service or protocol, e.g. 443 or mysql"
            className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
            <Plug className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-semibold">No ports match</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different port number or service name.</p>
          </div>
        ) : (
          <div className="max-h-[560px] overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Port</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Proto</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Service</th>
                  <th className="hidden px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground md:table-cell">Security note</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.port}
                    onClick={() => doCopy(p.port, trial)}
                    className="cursor-pointer border-t border-border/60 hover:bg-primary/5"
                    title={`Copy port ${p.port}`}
                  >
                    <td className="px-4 py-2.5 font-mono font-extrabold">{p.port}</td>
                    <td className="px-4 py-2.5 font-mono text-[13px] text-muted-foreground">{p.proto}</td>
                    <td className="px-4 py-2.5 font-semibold">{p.service}</td>
                    <td className="hidden px-4 py-2.5 text-[13px] text-muted-foreground md:table-cell">{p.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Copy className="h-3 w-3" /> Click any row to copy the port number. {PORTS.length} ports listed.
        </p>
      </div>
    </ToolPageShell>
  );
}
