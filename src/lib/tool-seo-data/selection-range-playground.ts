import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Selection and Range Playground - Interactive Lab | IconVault",
    metaDescription: "Debug the Selection and Range APIs visually: container paths, offsets and rect overlays. Free, runs fully in your browser.",
    about: [
      "**IconVault**'s **Selection and Range Playground** turns text selection into something you can see: select text in the sample article, then inspect the live Selection and every Range with container paths, offsets, the common ancestor and screen rects drawn as overlays. It is free to use and runs fully in your browser with nothing uploaded.",
      "How to use: drag across bold and italic text, press Inspect selection, and read each range's start and end containers. Try select-all, collapse and expand-to-word to see how offsets behave. Perfect for **developers** building editors, annotations and custom selection UIs.",
    ],
    faqs: [
      { q: "Is Selection and Range Playground free to use?", a: "Yes. Selection and Range Playground is free to use with a generous free trial, no account needed. Pro unlocks unlimited use." },
      { q: "What is the difference between Selection and Range?", a: "A Selection is what the user has highlighted (anchor and focus); it contains one or more Range objects, each with a start and end container plus offsets." },
      { q: "What does an offset mean?", a: "Inside a text node it is a character index; inside an element it is a child index. The debugger shows which node type each offset belongs to." },
      { q: "Why draw the rects as overlays?", a: "getClientRects() returns one rectangle per rendered line of the range, so the overlay shows exactly how a multi-line selection is laid out." },
      { q: "Can I make selections with code?", a: "Yes. The tool demonstrates selectNodeContents, collapseToStart and modify('extend', ..., 'word'), and the cheat sheet is copyable." },
      { q: "Is my selected text uploaded?", a: "No. Everything runs in your browser; the selection never leaves the page." },
    ],
    tags: [ "selection api", "range api javascript", "window.getselection", "document.createRange", "range debugger", "selection anchor focus", "range startcontainer", "range startoffset", "getclientrects range", "commonancestorcontainer", "collapsed range", "select text programmatically", "selection.modify", "extend selection word", "collapsetostart", "selectnodecontents", "addrange javascript", "removeallranges", "selection rangecount", "multiple ranges selection", "firefox multi range", "range tostring", "range surroundcontents", "extractcontents range", "clonecontents", "deletecontents range", "compareboundarypoints", "range intersectsnode", "selection direction", "backward selection js", "text selection javascript", "learn selection api", "range api tutorial", "dom range explained", "selection api mdn", "range api mdn", "caret position javascript", "get caret offset", "selectionchange event", "highlight selected text", "custom text selection", "selection api browser support", "contenteditable selection", "save restore selection", "selection api react", "range api examples", "text fragment selection", "selection playground", "dom selection lab", "javascript text range" ],
  };

export default seo;
