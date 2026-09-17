# web

The gallery app: a React + shadcn/ui frontend served by a Bun backend that
uploads images to S3 via presigned URLs and converts them to WebP with
`Bun.Image`. See the repo root `CLAUDE.md` for the full architecture.

This app needs AWS credentials for a real S3 bucket, provisioned by the
Pulumi program in `../../infra`. After `pulumi up` there:

```bash
cd ../../infra && bun run sync-env   # writes ../apps/web/.env from the stack outputs
```

To install dependencies:

```bash
bun install
```

To start a development server:

```bash
bun dev
```

To run for production:

```bash
bun start
```

This project was created using `bun init` in bun v1.4.2. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
