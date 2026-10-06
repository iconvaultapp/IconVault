import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Prompt Cost Estimator - Free Online Tool | IconVault",
    metaDescription: "Paste any prompt, count tokens with a hand-written tokenizer, and see the cost across 10 LLM providers instantly. Free.",
    about: [
      "**IconVault**'s **Prompt Cost Estimator** tells you what a prompt costs before you send it: paste your text, and a **hand-written approximate tokenizer** (word and punctuation heuristic, about 4 characters per token for English) counts the tokens. Set your expected output length and instantly see the **per-prompt and per-1k-prompt cost across 10 models** from OpenAI, Anthropic, Google, DeepSeek, Meta, Mistral, and xAI.",
      "The **tokenizer preview** shows exactly how your text was split, so long prompts stop being a **billing surprise**. Free and runs fully in your browser; your prompt text **never leaves your device**.",
    ],
    faqs: [
      { q: "Is the prompt cost estimator free?", a: "Yes. Estimate as many prompts as your plan allows. Token counting and pricing all run in your browser." },
      { q: "How accurate is the token count?", a: "It is an approximation, not tiktoken or a model-specific BPE tokenizer. For English prose it usually lands within 10-20% of the real count. Treat it as a budgeting estimate, not a billing figure." },
      { q: "How does the tokenizer work?", a: "A hand-written heuristic: words are split into roughly 4-character chunks, numbers stay whole, and each punctuation mark is its own token. You can see the exact split in the tokenizer preview." },
      { q: "Why does output length matter?", a: "Output tokens are priced higher than input tokens by most providers, so a long completion can cost more than the prompt itself. The slider estimates output as a percentage of input." },
      { q: "Which models are priced?", a: "10 models: GPT-4o, GPT-4o mini, Claude Haiku 3.5, Claude Sonnet 4, Gemini 2.5 Flash and Pro, DeepSeek V3, Llama 3.3 70B, Mistral Large, and Grok 3." },
      { q: "Is my prompt text uploaded anywhere?", a: "No. Everything runs client-side in your browser. Nothing you paste is sent to any server." },
    ],
    tags: ["prompt cost estimator", "ai prompt token counter", "estimate llm prompt cost", "prompt token calculator", "how many tokens is my prompt", "gpt token counter", "claude token counter", "prompt pricing calculator", "llm prompt cost comparison", "tokenizer online", "approximate token counter", "count tokens in text", "prompt length checker", "ai prompt cost per provider", "openai prompt cost", "anthropic prompt cost", "how much does a prompt cost", "prompt token estimator free", "tiktoken alternative online", "token counter no signup", "prompt budget calculator", "ai api prompt pricing", "system prompt token count", "long prompt cost", "chatgpt token calculator", "llm token pricing table", "prompt engineering cost", "reduce prompt tokens", "prompt optimization cost", "tokenizer visualizer", "see how text is tokenized", "bpe tokenizer demo", "words to tokens converter", "characters per token", "prompt cost per 1000", "ai chatbot cost estimator", "llm usage cost predictor", "prompt spend calculator", "openai api cost estimator", "gemini token counter", "deepseek token cost", "mistral token pricing", "grok token cost", "llama token calculator", "compare prompt costs providers", "prompt token math", "free token counter tool", "ai prompt analyzer", "prompt token budget planner", "ai completion cost estimator", "input output token calculator"],
  };

export default seo;
