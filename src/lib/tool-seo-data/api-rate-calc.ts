import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "API Rate Calculator - Free Online Tool | IconVault",
    metaDescription: "Rate-limit math made easy: daily capacity, burst planning, headroom check, token bucket vs sliding window, plus copy-paste limiter code. Free.",
    about: [
      "**IconVault**'s **API Rate Calculator** does the rate-limit math for you: enter your **limit and period**, pick **token bucket or sliding window**, add your expected traffic, and get **requests/day capacity**, **utilization**, **headroom**, a **burst verdict**, and a tier-planning checklist. It even generates a **copy-paste token-bucket implementation** filled with your exact numbers.",
      "Whether you are designing **API pricing tiers** or just trying not to get **429s**, the calculator shows where your limit breaks before your users do. Free and runs fully in your browser.",
    ],
    faqs: [
      { q: "Is the API rate calculator free?", a: "Yes. Calculate as many rate plans as your plan allows, and copy the generated limiter code freely." },
      { q: "What is the difference between token bucket and sliding window?", a: "Token bucket refills steadily and absorbs bursts up to the bucket size. Sliding window smooths traffic over a rolling window and is stricter on spikes. The tool explains which fits your traffic." },
      { q: "How is daily capacity calculated?", a: "Your limit divided by its period gives requests per second, multiplied by 86,400 seconds per day. That is the theoretical maximum if traffic were perfectly even." },
      { q: "How much headroom should I keep?", a: "Aim for at least 20% unused capacity at average traffic. The tier planner flags utilization above 80% so growth does not push you into 429s." },
      { q: "What size should my burst bucket be?", a: "At least your expected burst size, ideally 20% more. The tool compares your burst input against the bucket and tells you the minimum safe size." },
      { q: "Can I use the generated code in production?", a: "It is a correct in-memory token bucket for a single process. For distributed systems you need a shared store like Redis, but the math (capacity, refill rate) transfers directly." },
    ],
    tags: ["api rate limit calculator", "rate limit math", "token bucket calculator", "sliding window rate limit", "api requests per day calculator", "rate limiter planner", "api tier planner", "429 rate limit calculator", "api throttling calculator", "requests per second calculator", "api quota calculator", "rate limit headroom", "token bucket vs sliding window", "api pricing tier calculator", "rate limit burst calculator", "api capacity planning", "how to calculate rate limits", "rest api rate limiting guide", "token bucket algorithm example", "sliding window algorithm", "leaky bucket vs token bucket", "api rate limit best practices", "design api rate limits", "rate limiter code javascript", "token bucket implementation", "api gateway rate limit", "requests per minute to per day", "api usage calculator", "rate limit utilization", "api plan comparison tool", "free api rate calculator", "api rate limit formula", "calculate api throughput", "api concurrent requests calculator", "rate limit refill calculator", "bucket size calculator api", "api traffic estimator", "peak vs average api traffic", "api rate limit testing", "http 429 calculator", "retry after calculator", "api cost per request tier", "saas api limits planner", "developer api quota tool", "api rate limit dashboard math", "token bucket refill rate", "api limit upgrade calculator", "when to raise api limits", "api rate limiting explained", "api rate limit simulator", "rate limiter design tool"],
  };

export default seo;
