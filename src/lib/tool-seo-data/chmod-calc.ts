import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Chmod Calculator - Free Online Tool | IconVault",
    metaDescription: "Click the permission matrix and get the octal number, symbolic string and chmod command instantly. Parses octal and symbolic too. Free.",
    about: [
      "**IconVault**'s **Chmod Calculator** makes Unix permissions visual: click the **owner/group/other read-write-execute matrix** (plus setuid, setgid and sticky bits) and instantly get the **octal number**, the **symbolic string** (like rwxr-xr--), and the ready **chmod command**. It also works in reverse: paste an octal or symbolic value to load it into the matrix.",
      "Handy presets for **755, 644, 700, 600, 777, and 400** come with plain-English explanations of what each one means. Free and runs fully in your browser.",
    ],
    faqs: [
      { q: "Is the chmod calculator free?", a: "Yes. Convert and parse as many permission sets as your plan allows. Everything runs in your browser." },
      { q: "What do the numbers in chmod 755 mean?", a: "Each digit is owner, group, other. 7 = read+write+execute (4+2+1), 5 = read+execute (4+1). So 755 gives the owner full control and everyone else read and execute." },
      { q: "What is the difference between octal and symbolic?", a: "Octal (755) is the compact numeric form used in the chmod command. Symbolic (rwxr-xr--) spells out each permission letter. This tool shows both and converts either way." },
      { q: "What are setuid, setgid and the sticky bit?", a: "Special permission bits: setuid (4) runs a file as its owner, setgid (2) runs as its group, sticky (1) on directories restricts deletion to file owners. Toggle them in the tool to see values like 4755." },
      { q: "What permissions should my files use?", a: "Common safe defaults: 644 for files, 755 for scripts and directories, 600 for secrets and SSH keys. The tool explains each preset in plain English." },
      { q: "Can I paste rwxr-xr-- to get 755?", a: "Yes. Paste any 9-character symbolic string (or 3-4 digit octal) into the parser and the matrix updates to match." },
    ],
    tags: ["chmod calculator", "chmod 755 meaning", "unix permissions calculator", "octal to symbolic", "symbolic to octal", "linux permissions calculator", "chmod command generator", "rwx permissions explained", "chmod 644 vs 755", "file permissions calculator", "chmod number chart", "linux file permissions", "chmod 777 meaning", "chmod 700", "chmod 600", "chmod 400", "setuid setgid sticky bit", "chmod 4755", "chmod 2755", "chmod 1755", "permission matrix", "unix chmod table", "chmod calculator online free", "convert rwxr-xr-- to number", "octal permission chart", "linux chmod guide", "chmod recursive explained", "what is chmod 755", "chmod for wordpress", "chmod for ssh key", "chmod directory vs file", "understand linux permissions", "chmod symbolic notation", "chmod octal notation", "permission bits calculator", "chmod 775", "chmod 664", "chmod 750", "chmod 640", "server file permissions", "ftp permissions calculator", "chmod cheat sheet", "linux permission numbers", "rwx to octal", "octal to rwx", "chmod generator online", "file permission visualizer", "unix permission visualizer", "chmod explained simply", "learn chmod"],
  };

export default seo;
