import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "Docker to Compose - Free Online Docker Run to Compose Converter | IconVault",
    metaDescription: "Convert docker run commands to docker-compose.yml instantly. Paste your command, get clean compose YAML to copy or download. Free, in your browser.",
    about: [
      "**IconVault**'s **Docker to Compose** turns a long **docker run** command into a clean **docker-compose.yml** service. Paste the command and it parses **ports** (-p), **volumes** (-v), **environment variables** (-e), **container name**, **network**, **restart policy** and more, then emits ready-to-run Compose YAML you can copy or download.",
      "The conversion happens **100% client side** in your browser: your commands are never uploaded or logged, which keeps private registry URLs and secrets safe. It is the fastest way to migrate one-off containers into a maintainable **compose stack**. Note that very long or exotic flag combinations may need a quick manual review. Visitors get 5 **free** conversions with no signup; **IconVault** Pro ($12/year) unlocks unlimited use of every tool.",
    ],
    faqs: [
      {
        q: "How do I convert a docker run command to docker compose?",
        a: "Paste your full docker run command into the tool and it instantly generates the equivalent docker-compose.yml service definition, ready to copy or download.",
      },
      {
        q: "Which docker run flags are supported?",
        a: "Common flags including -p (ports), -v (volumes), -e (environment variables), --name, --network, --restart and the image name. Unusual flags may need manual checking in the output.",
      },
      {
        q: "Is the output ready to run?",
        a: "For typical commands, yes: save it as docker-compose.yml and run docker compose up. For very complex commands with rare flags, give the generated YAML a quick review first.",
      },
      {
        q: "Is my docker run command kept private?",
        a: "Yes. Parsing happens entirely in your browser's JavaScript, so commands containing registry URLs, passwords or tokens never leave your machine.",
      },
      {
        q: "Can I convert multiple docker run commands at once?",
        a: "Convert each command separately and combine the resulting services into one compose file, which is how multi-container setups usually migrate from docker run.",
      },
      {
        q: "How many free conversions do I get?",
        a: "Every visitor gets 5 free conversions with no account needed. IconVault Pro ($12/year) gives unlimited conversions plus unlimited use of all 100+ tools.",
      },
    ],
    tags: [
      "docker run to compose", "docker run to docker-compose",
      "convert docker run to compose", "docker run command to compose file",
      "docker run to yaml", "docker compose from docker run",
      "docker run converter", "docker run parser", "parse docker run command",
      "docker run to compose online", "docker run to compose free",
      "docker run to compose online free", "docker run flags to compose",
      "convert docker command to compose", "docker command converter",
      "docker run port to compose", "docker run volume to compose",
      "docker run env to compose", "docker run to docker compose yml",
      "composerize alternative", "composerize online",
      "docker run to compose file generator", "migrate docker run to compose",
      "docker run cheat sheet", "docker compose equivalent of docker run",
      "translate docker run to compose", "docker run to stack",
      "docker compose converter", "docker cli to compose",
      "docker run name network restart to compose", "docker run detach to compose",
      "long docker run command to yaml", "docker compose migration tool",
      "free docker run converter", "docker run to compose no signup",
      "paste docker run get compose", "docker run line to compose service",
      "docker compose from cli command", "docker run options to yaml",
      "docker run to compose copy", "docker run to compose download",
      "docker compose yaml from run command", "docker run --name to compose",
      "docker run -p to compose ports", "docker run -v to compose volumes",
      "docker run -e to compose environment", "docker run --network to compose",
      "docker run --restart to compose",
      "docker run entrypoint to compose", "docker run workdir to compose",
    ],
  };

export default seo;
