import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "CSR Generator - Free Online Certificate Request Tool | IconVault",
    metaDescription: "Generate a PKCS#10 Certificate Signing Request and private key in your browser with WebCrypto RSA. Copy or download the PEM files. Free.",
    about: [
      "**IconVault**'s **CSR Generator** creates a real **PKCS#10 Certificate Signing Request** plus its **2048-bit RSA private key** without leaving your browser. Fill in the **subject fields**: Common Name (usually your domain), Organization, Organizational Unit, City, State, Country and email. A hand-written **DER encoder** builds the request and **WebCrypto** signs it with SHA-256, outputting standard **PEM** blocks.",
      "The security model is the point: the **private key is generated in your browser's memory and never uploaded**, so only you ever hold it. Copy or **download** both files, then send only the **CSR to your certificate authority**; never share the private key. **Free**, no account, no OpenSSL needed.",
    ],
    faqs: [
      { q: "Is the CSR generator free?", a: "Yes. Generating the CSR and private key, and copying or downloading the PEM files, are all free with no signup." },
      { q: "What is a CSR?", a: "A Certificate Signing Request is a signed block of data you send to a certificate authority. It contains your public key and identity details; the CA verifies them and issues your SSL or TLS certificate." },
      { q: "Which fields do I need to fill in?", a: "Common Name is required and should be your fully qualified domain name, like example.com. Organization, unit, city, state, two-letter country code and email are optional but commonly requested by CAs." },
      { q: "Is my private key safe?", a: "It never leaves your browser. The key pair is generated with the Web Crypto API in local memory, and only the CSR is meant to be shared. Save the private key securely; losing it means reissuing the certificate." },
      { q: "What key size and algorithm are used?", a: "2048-bit RSA with SHA-256 signatures, the standard choice accepted by every major certificate authority." },
      { q: "What do I do with the CSR?", a: "Paste the PEM block starting with BEGIN CERTIFICATE REQUEST into your certificate authority's order form. Keep the private key file on the server that will serve the certificate." },
    ],
    tags: ["csr generator", "certificate signing request generator", "generate csr online", "csr request tool", "create csr online", "free csr generator", "online csr generator", "pkcs10 generator", "generate certificate request", "ssl csr generator", "tls csr generator", "csr and private key", "generate private key online", "rsa key generator", "webcrypto rsa", "csr pem download", "csr file generator", "openssl alternative online", "csr without openssl", "make csr in browser", "csr common name", "csr organization fields", "csr generator windows", "csr generator linux", "iis csr generator", "apache csr", "nginx csr", "ssl certificate request", "buy ssl csr", "submit csr to ca", "csr for ssl certificate", "wildcard csr generator", "san csr", "multi domain csr", "2048 bit csr", "4096 bit csr", "csr decoder", "check csr online", "verify csr", "csr private key match", "keep private key safe", "csr subject fields", "csr country code", "generate csr for domain", "ssl cert request online", "tls certificate request", "csr pem format", "begin certificate request", "csr online no install", "browser csr tool", "free ssl tools"],
  };

export default seo;
