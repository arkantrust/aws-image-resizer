# Image Gallery (AWS + Pulumi + Bun)

A small image gallery: upload a photo from the browser, it lands in S3 via a
presigned URL, the Bun server converts it to WebP and records it in an
`index.txt` manifest, and the gallery reads that manifest to render the grid.

See `CLAUDE.md` for the full architecture and how the pieces fit together.

## Layout

- `infra/` — Pulumi program (TypeScript), its own `Pulumi.yaml`/`package.json`. `index.ts` provisions an `ImageBucket` (`infra/imageBucket.ts`), the S3 bucket + IAM identity.
- `apps/web` — the React/shadcn frontend and Bun backend.
- `apps/resizer` — not wired up yet.

The repo root has no `package.json` of its own — run commands from `infra/`
or `apps/web`.

## Prerequisites

- Pulumi CLI (>= v3): https://www.pulumi.com/docs/get-started/install/
- Bun (>= 1.4): https://bun.com
- AWS credentials configured (e.g., via `aws configure` or environment variables)

## Getting Started

```bash
cd infra
bun install
pulumi preview
pulumi up
bun run sync-env          # writes ../apps/web/.env from the stack outputs
cd ../apps/web && bun install && bun dev
```

When you're finished, tear down the stack (from `infra/`):

```bash
pulumi destroy
```

## Configuration

| Key                        | Description                                          | Default                     |
| --------------------------- | ----------------------------------------------------- | ---------------------------- |
| `aws:region`                | The AWS region to deploy resources into              | `us-east-1`                 |
| `project:allowedOrigins`    | Origins allowed to upload via presigned URL (CORS)   | `["http://localhost:3000"]` |

Use `pulumi config set <key> <value>` to customize configuration.
