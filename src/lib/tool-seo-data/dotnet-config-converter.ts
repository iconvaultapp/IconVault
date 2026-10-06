import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: ".NET Config Converter - Free Online appsettings to env Converter | IconVault",
    metaDescription: "Convert appsettings.json to .env format online. Nested sections become Section__Key pairs, connection strings shown in a table. Free, private, in browser.",
    about: [
      "**IconVault**'s **.NET Config Converter** turns **appsettings.json** into a **.env file** in one click. Nested sections are flattened into the **Section__Key** double-underscore format that .NET's environment variable configuration provider understands, and every entry in **ConnectionStrings** is parsed into a readable **key-value table** so you can inspect servers, databases and credentials at a glance.",
      "The conversion runs **100% in your browser**: your config, including database passwords and API keys, is never uploaded, logged or stored anywhere, making it safe for production settings. Paste or upload your JSON, copy the **.env output** or scan the connection string table, then drop the result into your container or CI pipeline. Visitors get 5 **free** conversions with no signup; **IconVault** Pro ($12/year) unlocks unlimited use of every developer tool.",
    ],
    faqs: [
      {
        q: "How do I convert appsettings.json to .env?",
        a: "Paste your appsettings.json into the tool. Nested sections are flattened to Section__Key pairs instantly, and the .env output is ready to copy with one click.",
      },
      {
        q: "Why double underscores in the output?",
        a: ".NET's configuration provider treats a double underscore in an environment variable name as a section separator, so Logging__LogLevel__Default maps to the Logging:LogLevel:Default JSON path.",
      },
      {
        q: "What happens to ConnectionStrings?",
        a: "Each connection string is kept as its own variable and also parsed into a readable table of key-value pairs (server, database, user id and so on) so you can verify every part.",
      },
      {
        q: "Is it safe to paste production connection strings?",
        a: "Yes. The conversion runs entirely in your browser's JavaScript. Nothing is sent to a server, so secrets stay on your machine.",
      },
      {
        q: "Can I convert .env back to appsettings.json?",
        a: "No. The tool converts in one direction: appsettings.json to .env format, which is the direction needed when containerizing or deploying .NET apps.",
      },
      {
        q: "How many free conversions do I get?",
        a: "Every visitor gets 5 free conversions with no account needed. IconVault Pro ($12/year) gives unlimited use plus unlimited use of all 100+ tools.",
      },
    ],
    tags: [
      "appsettings to env", "appsettings.json to env", "convert appsettings to env",
      "dotnet config converter", ".net config converter", "appsettings converter",
      "appsettings.json converter", "connection string parser",
      "parse connection string", "connectionstrings to env",
      "dotnet env variables", ".net environment variables",
      "section key double underscore", "appsettings.json to .env file",
      "dotnet docker env", ".net docker configuration",
      "appsettings to environment variables", "flatten appsettings.json",
      "appsettings.json flatten", "nested json to env",
      "json to env converter", "json to env online", "json to env file",
      "config to env converter", "dotnet appsettings explained",
      "connection string to key value", "sql connection string parser",
      "parse sql connection string online", "appsettings.json example",
      "dotnet configuration tutorial", "environment variable naming dotnet",
      "double underscore env variable", "logging loglevel default env",
      "appsettings online tool", "free appsettings converter",
      "appsettings to env online free", "dotnet config tool online",
      ".net core configuration converter", "asp.net config converter",
      "appsettings.development.json to env", "kubernetes dotnet env",
      "docker compose dotnet appsettings", "azure app service dotnet env",
      "connection string builder alternative", "inspect connection string",
      "server database userid parser", "dotnet secrets to env",
      "appsettings no signup", "json config to env free",
      "dotnet 8 configuration env", "dotnet 9 configuration env",
      "convert json config online",
    ],
  };

export default seo;
