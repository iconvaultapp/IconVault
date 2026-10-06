import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Bitwise Calculator - Free Online Bit Operation Tool | IconVault",
    metaDescription: "Free bitwise calculator: AND, OR, XOR, NOT and bit shifts with instant binary, octal, decimal and hex results. Runs in your browser.",
    about: [
      "**IconVault**'s **Bitwise Calculator** performs **AND, OR, XOR, NOT** and **bit shifts** on 32-bit operands and shows every result in **binary, octal, decimal and hex** at once. Type each operand in whatever base you have, binary, octal, decimal or hex, and the calculator handles the conversion, including both **unsigned and signed decimal** results and a full 32-bit binary word grouped in nibbles.",
      "Everything is **free** and runs fully in your **browser**, which makes it handy for **embedded programming, flag math, bitmask design** and interview prep. No sign-up, no uploads: just numbers in and answers out.",
    ],
    faqs: [
      { q: "What bitwise operations are supported?", a: "AND, OR, XOR, unary NOT, left shift, logical right shift and arithmetic (signed) right shift. All operands are treated as 32-bit values, matching how C, Java, JavaScript and most embedded code handle them." },
      { q: "Which number bases can I enter?", a: "Each operand can be typed in binary, octal, decimal or hex, and the result is displayed in every base at once, so converting between bases is automatic." },
      { q: "Why does binary show 32 digits?", a: "Bitwise operators work on fixed-width words, so showing the full 32-bit binary grouped in nibbles makes it easy to see exactly which bits are set or flipped." },
      { q: "What is the difference between the two right shifts?", a: "Logical right shift fills vacated bits with zeros, treating the value as unsigned. Arithmetic (signed) right shift copies the sign bit, preserving negative values in two's complement." },
      { q: "How does the shift amount work?", a: "The shift amount is operand B mod 32, which mirrors hardware behavior where only the low 5 bits of the shift count are used on 32-bit values." },
      { q: "Is the Bitwise Calculator free?", a: "Yes, completely free with no sign-up, and all computation happens in your browser." },
    ],
    tags: [ "bitwise calculator", "bit calculator", "binary calculator", "bitwise and calculator", "bitwise or calculator", "xor calculator", "bit shift calculator", "bitwise operations calculator", "binary and calculator", "binary or calculator", "binary xor calculator", "bitmask calculator", "bitwise not calculator", "left shift calculator", "right shift calculator", "binary to decimal calculator", "binary to hex converter", "decimal to binary calculator", "hex to binary calculator", "octal to binary calculator", "binary to octal converter", "hex calculator", "bitwise operator tool", "online bitwise calculator", "free bitwise calculator", "32 bit bitwise calculator", "binary shift calculator", "logical shift calculator", "arithmetic shift calculator", "bitwise calculator online", "and or xor calculator", "bit manipulation calculator", "programmer calculator online", "twos complement calculator", "signed binary calculator", "unsigned binary calculator", "binary arithmetic calculator", "bit operations practice", "convert number bases calculator", "bin oct dec hex calculator", "number base converter", "binary converter tool", "bitwise calculator no signup", "embedded bit calculator", "flag calculator bits", "set clear toggle bits", "bitfield calculator", "nibble calculator", "binary word calculator", "bit shift left right", "bitwise math tool", "online programmer calculator", "binary calculation tool" ],
  };

export default seo;
