import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "HTTP/3 and QUIC Visualizer - Animated Explainer | IconVault",
    metaDescription: "Watch QUIC beat TCP: animated handshake RTT race, 0-RTT resumption, multiplexing without head-of-line blocking, connection migration. Free.",
    about: [
      "**IconVault**'s **HTTP/3 and QUIC Visualizer** makes the internet's newest transport protocol visible. Press play on the **handshake race** and watch TCP+TLS take two round trips while QUIC finishes in one, and **0-RTT** sends data in the very first packet. Then see **multiplexing** survive packet loss that freezes HTTP/2, and watch a **connection migration** keep streaming while TCP dies on a Wi-Fi to cellular handoff.",
      "Every scene is **animated step by step** with plain-English narration, and you can export a **key-takeaways** note for study or slides. Everything is **free** and runs fully in your browser: no signup, no server, just the protocol brought to life.",
    ],
    faqs: [
      {
        q: "What is QUIC and how is it different from TCP?",
        a: "QUIC is a transport protocol that runs over UDP and folds the TLS 1.3 handshake, congestion control and loss recovery into one layer. Unlike TCP, it multiplexes independent streams, so one lost packet stalls only its own stream instead of everything.",
      },
      {
        q: "What does 0-RTT mean in QUIC?",
        a: "On a repeat visit to a server, QUIC can send encrypted application data in the very first packet, using session parameters cached from the previous connection. That is zero round trips before data flows, versus two for a fresh TCP+TLS handshake.",
      },
      {
        q: "What is head-of-line blocking?",
        a: "In HTTP/2 over TCP, all streams share one byte stream. If a single TCP packet is lost, every stream waits for its retransmit, even streams whose data already arrived. QUIC numbers packets per stream, so only the damaged stream pauses.",
      },
      {
        q: "How does QUIC connection migration work?",
        a: "TCP identifies a connection by the 4-tuple of source and destination IPs and ports, so changing networks kills it. QUIC identifies connections by a connection ID, so when your IP changes the session continues on the new path after a quick validation.",
      },
      {
        q: "Is the HTTP/3 visualizer free?",
        a: "Yes. All three animated scenes are free in your browser. Exporting the key-takeaways note uses one of 5 free runs per tool; Pro members get unlimited runs.",
      },
      {
        q: "Does this tool make real network connections?",
        a: "No. The animations are faithful simulations of the protocol behavior, computed entirely client-side. No packets leave your browser.",
      },
    ],
    tags: [
      "http3", "quic", "http/3 explained", "quic protocol",
      "http3 vs http2", "quic vs tcp", "http3 visualizer",
      "quic handshake", "0-rtt", "zero rtt", "quic 0-rtt",
      "head of line blocking", "http2 head of line blocking",
      "quic multiplexing", "http3 multiplexing", "connection migration quic",
      "quic connection id", "tls 1.3 handshake", "tcp handshake",
      "how does http3 work", "http3 tutorial", "learn quic",
      "quic animation", "http3 performance", "why http3 is faster",
      "quic udp", "http3 over udp", "quic streams",
      "http3 benefits", "should i enable http3", "http3 latency",
      "quic packet loss", "http3 packet loss", "tcp vs quic latency",
      "http3 round trips", "quic 1-rtt handshake", "tls handshake round trips",
      "http3 interview questions", "networking interview quic",
      "quic explained simply", "http3 explained simply", "web performance http3",
      "http3 adoption", "quic rfc 9000", "http3 rfc 9114",
      "quic congestion control", "quic encryption", "http3 security",
      "mobile network quic", "wifi to cellular handoff", "quic nat rebinding",
      "http2 vs http3 speed test", "quic real world performance",
      "learn http3 interactive", "http3 diagram", "quic handshake diagram",
    ],
  };

export default seo;
