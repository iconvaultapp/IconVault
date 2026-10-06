import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Float Visualizer - Free Online IEEE 754 Tool | IconVault",
    metaDescription: "Explore IEEE 754 floats bit by bit: click sign, exponent and mantissa bits of doubles and floats. Includes the 0.1 + 0.2 demo. Free.",
    about: [
      "**IconVault**'s **Float Visualizer** opens up **IEEE 754 floating point** at the bit level: click any **sign**, **exponent**, or **mantissa** bit of a **binary64 (double)** or **binary32 (float)** and instantly see the exact **decimal value**, the neighboring values, and the unbiased exponent. Switch between hex, binary, and decimal views.",
      "It ships with the famous **0.1 + 0.2** demo so you can see exactly which bits make the sum not quite 0.3. Built for students, game developers, and anyone burned by rounding errors. Free and runs fully in your browser.",
    ],
    faqs: [
      { q: "Is the float visualizer free?", a: "Yes. Flip bits and explore as much as you like with no account." },
      { q: "Why does 0.1 + 0.2 not equal 0.3 in JavaScript?", a: "Because 0.1 and 0.2 cannot be represented exactly in binary floating point, so they are stored as the nearest representable values. Their sum is 0.30000000000000004. The demo shows the exact bits involved." },
      { q: "What is the difference between float32 and float64?", a: "Float32 uses 32 bits (1 sign, 8 exponent, 23 mantissa) and float64 uses 64 bits (1 sign, 11 exponent, 52 mantissa). Float64 has far more precision and range, which is why JavaScript uses it for all numbers." },
      { q: "What are NaN and Infinity in IEEE 754?", a: "Special bit patterns: an all-ones exponent with a nonzero mantissa means NaN (not a number), while an all-ones exponent with a zero mantissa means Infinity. You can build both by clicking bits in the tool." },
      { q: "What is a subnormal number?", a: "A number with an all-zero exponent but nonzero mantissa, used to represent values smaller than the smallest normal number, at reduced precision." },
      { q: "Does my input leave my browser?", a: "No. All bit manipulation and conversions happen locally." },
    ],
    tags: ["float visualizer", "ieee 754 visualizer", "floating point visualizer", "ieee 754 converter", "binary64 visualizer", "binary32 visualizer", "double precision bits", "float bits explained", "0.1 + 0.2 javascript", "why 0.1+0.2 is not 0.3", "floating point error", "ieee 754 explained", "sign exponent mantissa", "floating point representation", "double to binary", "float to binary", "binary to float", "ieee 754 calculator", "float converter online", "decimal to ieee 754", "ieee 754 double converter", "64 bit float", "32 bit float", "mantissa bits", "exponent bias", "normalized vs subnormal", "nan infinity float", "floating point rounding", "epsilon javascript", "number.epsilon", "float precision", "decimal vs binary floating point", "big decimal javascript", "floating point arithmetic", "learn floating point", "floating point for beginners", "float visualizer online", "free ieee 754 tool", "bit level float explorer", "click bits float", "float neighbors", "ulp floating point", "machine epsilon", "float rounding modes", "binary fraction", "hex float converter", "float hex representation", "float32 vs float64", "javascript number precision", "safe integer javascript"],
  };

export default seo;
