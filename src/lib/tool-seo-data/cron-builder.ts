import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Cron Builder - Free Online Cron Expression Tool | IconVault",
    metaDescription: "Build cron expressions visually: minute, hour, day, month and weekday fields, presets, a plain-English explanation and next run times. Free, in your browser.",
    about: [
      "**IconVault**'s **Cron Builder** lets you assemble a **cron expression** without memorizing the syntax. Each of the five fields, **minute, hour, day of month, month and day of week**, gets its own control with **every, list, step and range** modes, plus month and weekday name pickers. **One-click presets** cover the classics: every minute, hourly, daily, weekly and more.",
      "As you build, the tool shows a **plain-English explanation** of the schedule and the actual **next run times** computed with a real cron parser, so you can verify before you deploy. The finished expression is one click away with a **copy button**. It is **free** and runs **fully in your browser**; nothing is uploaded.",
    ],
    faqs: [
      { q: "Is the cron builder free?", a: "Yes. Building expressions, presets, explanations and next-run previews are all free and run entirely in your browser." },
      { q: "What cron format does it use?", a: "The standard five-field format: minute, hour, day of month, month, day of week. There is no seconds field, which matches classic crontab and most schedulers." },
      { q: "How do I run something every 5 minutes?", a: "Set the minute field to step mode with a step of 5, which produces */5 * * * *. The plain-English panel will read it back to confirm." },
      { q: "Are the next run times real?", a: "Yes. They are computed with a real cron parsing library against your current clock, not guessed, so you can see exactly when the job will fire." },
      { q: "Does it work for GitHub Actions or Kubernetes?", a: "Yes. Both use the same five-field cron syntax, so expressions built here paste straight into workflow schedules and CronJob manifests." },
      { q: "What do the field modes mean?", a: "Every means all values, list picks specific values, step means every Nth value, and range means a contiguous span. Each field shows its allowed minimum and maximum." },
    ],
    tags: ["cron builder", "cron expression builder", "cron generator", "cron job builder", "build cron expression", "cron schedule builder", "cron syntax builder", "visual cron", "cron maker online", "online cron builder", "free cron builder", "cron expression generator", "cron job generator", "cron tab generator", "crontab generator", "crontab builder", "linux cron builder", "cron schedule generator", "every minute cron", "hourly cron expression", "daily cron expression", "weekly cron expression", "monthly cron", "cron every 5 minutes", "cron every hour", "cron at midnight", "cron weekdays only", "cron expression explained", "cron in plain english", "cron translator", "parse cron expression", "understand cron", "cron next run time", "when will cron run", "cron schedule preview", "cron validator", "check cron expression", "cron syntax checker", "cron expression tester", "cron job scheduler", "schedule task cron", "server cron job", "wordpress cron expression", "kubernetes cronjob schedule", "github actions cron", "cron field order", "minute hour day month weekday", "cron step syntax", "cron range syntax", "cron list syntax", "cron examples"],
  };

export default seo;
