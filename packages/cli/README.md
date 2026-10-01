# @iconvault/cli

Search and download icons from the [IconVault](https://iconvault.site) library without leaving the terminal. Zero dependencies, works on Node 18+.

## Install

```sh
npm i -g @iconvault/cli
# or run it once without installing
npx @iconvault/cli search "shopping cart"
```

## Commands

```sh
# Search: prints one prefix:name per line
iconvault search "shopping cart"
iconvault search arrow --limit 5

# Add: downloads one icon as an optimised SVG
iconvault add mdi:cart
iconvault add lucide:heart --out ./src/icons

# Help and version
iconvault --help
iconvault --version
```

`add` writes the file as `./icons/<prefix>-<name>.svg` (for example `./icons/mdi-cart.svg`) and creates the directory if needed.

## Configuration

| Flag / env       | Purpose                                                        |
| ---------------- | -------------------------------------------------------------- |
| `--api URL`      | API base URL (default `https://iconvault.site`)                 |
| `ICONVAULT_API`  | Same as `--api`                                                |
| `ICONVAULT_KEY`  | Your IconVault API key, sent as the `x-api-key` header         |

Without a key you share the public per-minute IP limits (120 searches, 240 downloads). With a key from [iconvault.site/api-access](https://iconvault.site/api-access) you get 1,000 calls a month and no per-minute cap.

```sh
export ICONVAULT_KEY=ivk_live_your_key_here
iconvault search "arrow"
```

## What the CLI does not do (yet)

This is v0.1: `search` and `add` only. There is no `login`, `init`, `sync`, lockfile or CI mode yet. Those are on the roadmap; the commands documented above are the ones this package actually implements.

## License

MIT
