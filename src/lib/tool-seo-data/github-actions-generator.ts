import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Actions Generator - Free Online GitHub Actions Tool | IconVault",
    metaDescription: "Generate GitHub Actions CI workflows for Node, Python, Go or Docker: triggers, matrix builds, caching, and deploy steps. Free YAML export.",
    about: [
      "**IconVault**'s **Actions Generator** builds **GitHub Actions workflows** without hand-writing YAML. Pick **Node.js, Python, Go, or Docker**, set versions and install/test/build commands, and it generates a complete .github/workflows YAML with checkout, **dependency caching**, and best-practice action versions.",
      "Add **push, pull request, scheduled cron, and manual triggers**, multi-version **matrix builds**, and optional **Docker Hub login and push** steps. Everything is **free and runs fully in your browser**: copy the YAML or download the workflow file and drop it into your repo.",
    ],
    faqs: [
      { q: "What languages are supported?", a: "Node.js, Python, Go, and Docker. Each gets its setup action with version selection, plus optional matrix builds across versions." },
      { q: "Can I trigger on a schedule?", a: "Yes. Enable the schedule trigger and set a cron expression (a preset like 0 6 * * 1 is included) alongside push, pull request, and manual workflow_dispatch triggers." },
      { q: "Does it support matrix builds?", a: "Yes. Turn on the matrix option and list versions (for example 20, 22) to run the same job across every version." },
      { q: "Can it build and push Docker images?", a: "Yes. Enable Docker push and the workflow adds Docker Hub login via secrets plus a build-push step with your image tag." },
      { q: "Where do I put the generated file?", a: "Save it under .github/workflows/ in your repo, for example .github/workflows/ci.yml. GitHub picks it up automatically." },
      { q: "Is Actions Generator free?", a: "Yes. Generating, copying, and downloading workflows are free. Everything runs in your browser." },
    ],
    tags: ["github actions generator", "github actions workflow generator", "ci workflow generator", "github actions yaml generator", "actions workflow builder", "github ci generator", "create github actions workflow", "github actions template", "ci cd workflow generator", "github actions for node", "github actions node js ci", "github actions python ci", "github actions go ci", "github actions docker build", "github actions matrix build", "github actions cron schedule", "github actions triggers", "workflow dispatch generator", "github actions cache npm", "github actions setup node", "github actions checkout v4", "docker hub github actions", "build and push docker github actions", "github actions yaml template", "ci pipeline generator", "github workflow file generator", "actions generator online free", "github actions beginner", "generate ci.yml", "github actions test workflow", "github actions build workflow", "node ci pipeline github", "python ci pipeline github", "go ci pipeline github", "docker ci github actions", "github actions secrets docker", "github actions on push", "github actions on pull request", "github actions scheduled workflow", "github actions manual trigger", "matrix strategy github actions", "multi version ci github actions", "github actions best practices", "free github actions generator", "github workflow builder online", "ci yaml generator", "devops workflow generator", "github actions config generator", "setup python github actions", "setup go github actions", "github actions tutorial generator", "github actions no signup"],
  };

export default seo;
