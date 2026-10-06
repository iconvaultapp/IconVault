import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "FormData Inspector - Free Online Tool | IconVault",
    metaDescription: "Build FormData field by field and preview the exact multipart body with boundaries, as the server receives it. Free.",
    about: [
      "**IconVault**'s **FormData Inspector** lets you assemble a **FormData** object field by field, text fields and file uploads alike, then reveals the exact **multipart/form-data body** it would send: boundaries, **Content-Disposition** headers, filenames and **Content-Type** per part. Completely **free** and runs fully in your browser.",
      "See an entries table with types and sizes, the **estimated request size**, and the raw wire-format body you can download. It is the fastest way to debug file uploads, check what your fetch call really sends, or learn the multipart format hands on.",
    ],
    faqs: [
      { q: "Is the FormData Inspector free?", a: "Yes. Free in your browser with a daily quota for guests and unlimited use for Pro users." },
      { q: "Do my files get uploaded anywhere?", a: "No. Files stay on your device. The tool only reads names, sizes and types to render the preview; byte content is never transmitted." },
      { q: "What is multipart/form-data?", a: "It is the encoding browsers use for form submissions that include files. Each field becomes a body part separated by a boundary string, with headers describing the field name, filename and content type." },
      { q: "Why does the preview show a placeholder for file bytes?", a: "To keep the preview readable and fast. The boundary markers, headers and structure are exact; only the raw file bytes are summarized as their byte size." },
      { q: "Can I download the generated body?", a: "Yes. Use the download button to save the wire-format preview as a .txt file for debugging or documentation." },
      { q: "How is the request size estimated?", a: "The tool adds the exact header and boundary text length to the real byte size of each attached file, so the estimate matches what the browser would send." },
    ],
    tags: ["formdata inspector", "formdata", "multipart form data", "multipart body preview", "form-data debugger", "inspect formdata javascript", "formdata entries", "multipart/form-data example", "form data boundary", "content-disposition form-data", "debug file upload", "fetch formdata example", "formdata append file", "javascript formdata tutorial", "what does formdata send", "multipart request inspector", "formdata to string", "view formdata contents", "formdata console log", "how to inspect formdata", "formdata file upload example", "multipart form data boundary example", "formdata content type header", "ajax file upload debug", "fetch multipart form data", "formdata get all entries", "formdata filename", "html form enctype multipart", "formdata vs json", "upload file javascript fetch", "formdata empty file", "multipart body generator", "formdata wire format", "http multipart explained", "form-data postman alternative", "test file upload online", "formdata size calculator", "request payload inspector", "formdata browser tool", "multipart parser online", "formdata entries foreach", "new formdata example", "formdata multiple files", "formdata text fields", "debug multipart request", "formdata content-length", "xhr formdata", "formdata mdn", "learn multipart forms", "form encoding types"],
  };

export default seo;
