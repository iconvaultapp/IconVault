import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Streams API - Interactive Lab | IconVault",
    metaDescription: "Learn ReadableStream, WritableStream and TransformStream with live demos and a chunk log. Free, runs in your browser.",
    about: [ "**IconVault**'s **Streams API** playground makes streaming data click. Run live **ReadableStream**, **WritableStream** and **TransformStream** demos, watch chunks arrive in a timestamped **chunk log**, and read the exact code behind every demo. The full pipeline demo chains read, transform and write exactly like a real download pipeline.", "Everything is **free** and runs **fully in your browser**, with zero setup. Backpressure is the key idea: the reader pulls, the writer waits for readiness, and `pipeTo` wires producers to consumers without ever buffering the whole file in memory." ],
    faqs: [
      { q: "What is the Streams API?", a: "A browser API for processing data chunk by chunk instead of loading it all at once. ReadableStream produces data, WritableStream consumes it, and TransformStream modifies data as it flows through." },
      { q: "What is backpressure?", a: "Backpressure is the stream slowing the producer down when the consumer cannot keep up. The writer signals readiness, so a fast producer never overwhelms a slow consumer or blows up memory." },
      { q: "When would I use streams in real code?", a: "Streaming fetch responses, large file downloads and uploads, video processing, decompression with DecompressionStream, and parsing big JSON or CSV files line by line." },
      { q: "What does pipeThrough do?", a: "pipeThrough connects a ReadableStream to a TransformStream and returns the transformed readable side. Chaining pipeThrough and pipeTo builds a full processing pipeline in a few lines." },
      { q: "Which browsers support the Streams API?", a: "All modern browsers: Chrome, Edge, Firefox and Safari support ReadableStream, WritableStream and TransformStream. Very old browsers do not, so check support for legacy projects." },
      { q: "Is this playground free?", a: "Yes. It runs entirely in your browser with no signup and no network calls." },
    ],
    tags: ["streams api", "streams api tutorial", "readablestream", "writablestream", "transformstream", "javascript streams", "what is readablestream", "readablestream example", "writablestream example", "transformstream example", "pipethrough", "pipeto", "stream pipe javascript", "backpressure", "what is backpressure", "backpressure streams", "streaming fetch", "fetch streaming response", "read fetch stream chunks", "process large file javascript", "stream large csv browser", "decompressionstream", "compressionstream", "textdecoderstream", "textencoderstream", "stream reader", "getreader", "stream chunks", "javascript chunk processing", "streams api browser support", "streams api example code", "learn streams api", "streams api playground", "streams api demo", "readable stream tutorial", "writable stream tutorial", "transform stream tutorial", "stream pipeline javascript", "pipe chain streams", "async iteration stream", "for await stream", "stream controller enqueue", "stream tee", "readablestream tee", "cancel stream", "abort stream", "stream error handling", "javascript streams explained", "streams vs promises", "when to use streams", "stream large download", "stream file upload javascript", "free streams tutorial"],
  };

export default seo;
