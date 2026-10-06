import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Compression Streams - Free Online Developer Tool | IconVault",
    metaDescription: "Compress text with browser-native gzip and deflate. Hex dump, Base64 output, decompress verification. Free, no upload.",
    about: [
      "**IconVault**'s **Compression Streams** tool compresses your text with the browser's native **CompressionStream API**: **gzip**, **deflate** and **deflate-raw**. See the **original vs compressed size**, the exact **compression ratio**, a byte-level **hex dump**, and the output as **Base64**, ready to copy.",
      "Every run ends with an automatic **round-trip check**: the tool decompresses the output and compares every byte to the input, so you know the data survived. Download the compressed bytes as a file too. Free and runs fully in your browser.",
    ],
    faqs: [
      { q: "Is the compression tool free?", a: "Yes. Guests get free runs per day, Pro users get unlimited. Compression happens natively in your browser." },
      { q: "What formats are supported?", a: "gzip (the HTTP content-encoding), deflate (zlib wrapper) and deflate-raw (raw deflate stream with no header)." },
      { q: "How do I know the data is intact?", a: "The tool decompresses the result and compares it byte-for-byte with your input, showing a verified round-trip badge." },
      { q: "What is the hex dump for?", a: "It shows the first 256 compressed bytes with offsets and ASCII, useful for inspecting headers or debugging binary protocols." },
      { q: "Can I get the output as Base64?", a: "Yes. The compressed bytes are shown as Base64 with one-click copy, handy for embedding in JSON or code." },
      { q: "Can I download the compressed file?", a: "Yes, as a .gz or .bin file depending on the format you chose." },
    ],
    tags: ["compression streams", "gzip online", "compress text online", "deflate online", "gzip compressor", "text compression tool", "compress string online", "gzip encoder", "deflate compressor", "browser compression api", "compressionstream demo", "gzip text", "compress json online", "json gzip size", "check gzip size", "gzip size calculator", "text to gzip", "gzip base64", "compress to base64", "hex dump online", "binary hex viewer", "hex dump generator", "base64 encoder", "decompress gzip online", "gzip decompressor", "deflate decompress", "round trip compression test", "compression ratio calculator", "how much does gzip compress", "gzip vs deflate", "deflate raw", "zlib online", "compression tool free", "online gzip tool", "gzip compressor free", "deflate online free", "compress data in browser", "client side gzip", "javascript compressionstream", "native browser compression", "no upload compression", "private compression tool", "gzip online no signup", "text compressor", "string compressor online", "data compression playground", "compression api tester", "gzip hex", "inspect gzip bytes", "compression visualizer"],
  };

export default seo;
