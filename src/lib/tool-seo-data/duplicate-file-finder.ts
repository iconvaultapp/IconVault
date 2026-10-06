import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Duplicate Finder - Free Online Duplicate File Finder Tool | IconVault",
    metaDescription: "Find duplicate files by SHA-256 content hash. Groups identical files and totals wasted space. 100% private, files never leave your device. Free.",
    about: [
      "**IconVault**'s **Duplicate Finder** finds **duplicate files** by content, not by name. It hashes every file with **SHA-256** and groups files with **identical hashes** together, so renamed copies, repeated downloads and forgotten backups are all caught. Each group shows the **wasted bytes** it costs you, with a running total across the whole scan.",
      "Everything happens **100% in your browser**: file contents are hashed locally and **never uploaded**, so the tool is safe for private photos, documents and work files. On supported browsers you can scan a whole **folder** at once via the File System Access API; everywhere else you can select multiple files. Visitors get 5 **free** scans with no signup; **IconVault** Pro ($12/year) unlocks unlimited use of every tool.",
    ],
    faqs: [
      {
        q: "How do I find duplicate files?",
        a: "Pick a folder (on supported browsers) or select multiple files, and the tool hashes each file with SHA-256. Files with identical hashes are grouped as duplicates with their wasted space shown.",
      },
      {
        q: "Does it compare file names or file contents?",
        a: "Contents. Two files with different names but the same bytes have the same SHA-256 hash and are flagged as duplicates. Same name with different contents is not flagged.",
      },
      {
        q: "Are my files uploaded anywhere?",
        a: "No. Hashing happens entirely in your browser using the Web Crypto API. File contents never leave your device, so the tool is safe for private files.",
      },
      {
        q: "Can I scan a whole folder at once?",
        a: "Yes, in browsers that support the File System Access API (like Chrome and Edge) you can pick a directory and scan it recursively. Other browsers let you select multiple files manually.",
      },
      {
        q: "Does the tool delete duplicates for me?",
        a: "No. It shows you the duplicate groups and how much space they waste, and you decide what to delete yourself, which keeps the tool safe to run.",
      },
      {
        q: "How many free scans do I get?",
        a: "Every visitor gets 5 free scans with no account needed. IconVault Pro ($12/year) gives unlimited use plus unlimited use of all 100+ tools.",
      },
    ],
    tags: [
      "duplicate file finder", "find duplicate files", "duplicate file finder online",
      "find duplicates online", "free duplicate file finder",
      "duplicate files finder", "find duplicate files free",
      "duplicate file checker", "check for duplicate files",
      "find identical files", "identical file finder",
      "duplicate photo finder online", "duplicate image finder online",
      "find duplicate photos", "find duplicate images",
      "sha256 file hash", "hash files online", "file hash checker",
      "compare files by content", "find files with same content",
      "wasted disk space finder", "find wasted disk space",
      "disk space duplicate files", "clean duplicate files",
      "remove duplicate files online", "delete duplicate files tool",
      "duplicate download finder", "find repeated downloads",
      "folder duplicate scanner", "scan folder for duplicates",
      "duplicate files in folder", "private duplicate file finder",
      "secure duplicate file finder", "duplicate finder no upload",
      "duplicate file finder no signup", "browser duplicate file finder",
      "in browser duplicate finder", "client side duplicate finder",
      "duplicate file finder free online", "best free duplicate file finder",
      "find duplicate documents", "find duplicate videos",
      "duplicate file finder windows alternative", "duplicate file finder mac alternative",
      "large file duplicate checker", "find big duplicate files",
      "file deduplication tool", "dedupe files online",
      "content based duplicate detection", "sha256 duplicate detection",
      "group identical files", "duplicate file report",
    ],
  };

export default seo;
