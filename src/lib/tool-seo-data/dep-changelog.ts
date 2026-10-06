import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Dep Changelog - Free Online Developer Tool | IconVault",
    metaDescription: "See what changed between npm versions: version timeline plus GitHub release notes matched to your range. Free.",
    about: [
      "**IconVault**'s **Dep Changelog** answers the upgrade question: enter a package and two versions to see every **version published** in between, with **publish dates** from the npm registry. It then matches **GitHub releases** to those versions and shows their **release notes** inline.",
      "Get direct links to the **repository** and a **GitHub compare view** for the range, with an honest fallback: if GitHub is rate-limited or unreachable, the **npm version timeline** is still shown. Free and runs fully in your browser.",
    ],
    faqs: [
      { q: "Is the changelog tool free?", a: "Yes. Guests get free lookups per day, Pro users get unlimited. Data comes live from npm and GitHub." },
      { q: "Where do the release notes come from?", a: "From the package's GitHub releases, matched to npm versions by tag name. If the project does not use GitHub releases, only the version timeline is shown." },
      { q: "What if GitHub is rate limited?", a: "Anonymous GitHub API calls allow 60 per hour. When the limit hits, the tool says so and still shows the full npm version timeline." },
      { q: "Can I see the actual code diff?", a: "Yes, the GitHub compare link opens the diff between the two version tags when the project tags releases on GitHub." },
      { q: "What if the versions are in reverse order?", a: "The tool handles it: it orders the range by publish date automatically." },
      { q: "What if a version does not exist?", a: "You get a clear error naming the missing version, since typos in version numbers are the most common cause." },
    ],
    tags: ["dep changelog", "npm changelog", "package changelog", "npm version history", "see what changed npm", "dependency changelog", "npm release notes", "package release notes", "github releases npm", "npm versions between", "compare npm versions", "npm diff versions", "what changed in update", "should i upgrade npm package", "npm upgrade checker", "dependency update checker", "npm version timeline", "package version timeline", "npm publish history", "when was version published", "npm breaking changes", "check breaking changes npm", "npm migration guide", "package upgrade guide", "review dependency update", "npm update review", "changelog generator npm", "view changelog online", "npm package history", "version history viewer", "github compare npm", "compare tags github", "release notes viewer", "github release notes", "npm to github releases", "match versions to releases", "dependency management tool", "npm maintenance", "keep dependencies updated", "npm audit updates", "package update workflow", "javascript dependency updates", "node dependency changelog", "free changelog tool", "online changelog viewer", "npm tools", "dev dependency helper", "npm version lookup", "npm package versions", "list npm versions"],
  };

export default seo;
