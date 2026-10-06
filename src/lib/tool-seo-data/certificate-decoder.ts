import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Certificate Decoder - Free Online SSL Certificate Tool | IconVault",
    metaDescription: "Free X.509 certificate decoder: inspect SSL certificates and CSRs with a hand-written ASN.1 parser. No uploads, everything runs locally.",
    about: [
      "**IconVault**'s **Certificate Decoder** reads **X.509 certificates and CSRs** with a hand-written **ASN.1/DER parser**, no dependencies, no uploads. Paste a **PEM** block or upload the file and get the **subject and issuer, validity dates, serial number, signature algorithm, public key type and size, SANs, key usage and extensions** in a clean readable view.",
      "Everything is **free** and runs fully in your **browser**, which matters for certificates: pasting a cert into a random website is risky, so local-only decoding keeps your data on your machine. Honest note: it decodes structure only. It does not validate the trust chain or check live servers.",
    ],
    faqs: [
      { q: "What certificate formats does it decode?", a: "PEM-encoded X.509 certificates and certificate signing requests (CSRs), parsed from the DER bytes underneath. Just paste the -----BEGIN CERTIFICATE----- block or upload the file." },
      { q: "What details does it show?", a: "Subject and issuer distinguished names, validity period, serial number, signature algorithm (for example sha256WithRSAEncryption), public key algorithm and key size, subject alternative names, key usage, extended key usage and other extensions." },
      { q: "Is it safe to paste my certificate?", a: "Yes here, because decoding happens entirely in your browser with a local parser and nothing is uploaded. As a rule, never paste certificates into tools that send them to a server, and never share private keys anywhere." },
      { q: "Can it decode a CSR?", a: "Yes. Certificate signing requests decode the same way, showing the requested subject, public key and any requested extensions." },
      { q: "Does it validate the certificate chain?", a: "No. It decodes and displays the structure of a single certificate or CSR. Chain validation against trust stores is not included." },
      { q: "Is the Certificate Decoder free?", a: "Yes, completely free with no sign-up." },
    ],
    tags: [ "certificate decoder", "ssl certificate decoder", "x509 certificate decoder", "decode certificate online", "csr decoder", "decode csr online", "pem decoder online", "asn1 decoder online", "der decoder", "certificate parser", "online certificate parser", "read certificate online", "view certificate details", "ssl certificate details", "certificate subject issuer", "check certificate validity dates", "certificate expiry date checker", "certificate serial number lookup", "signature algorithm checker", "sha256 certificate check", "public key size checker", "rsa key size certificate", "san list viewer", "subject alternative names list", "key usage decoder", "extended key usage viewer", "certificate extensions viewer", "openssl decode certificate online", "openssl x509 text online", "decode pem without openssl", "certificate inspector online", "tls certificate decoder", "ssl cert info", "certificate text dump", "parse der certificate", "x509 viewer online", "free certificate decoder", "certificate decoder no signup", "decode certificate in browser", "csr info viewer", "check csr details", "what is in my certificate", "inspect ssl certificate", "certificate analyzer online", "ssl certificate analyzer", "certificate decoder free online", "read pem file online", "x509 certificate viewer", "decode ssl certificate", "certificate information tool" ],
  };

export default seo;
