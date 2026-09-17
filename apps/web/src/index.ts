import { S3Client } from "bun";
import index from "./index.html";

const TMP_PREFIX = "tmp/";
const INDEX_KEY = "index.txt";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRESIGN_EXPIRES_SECONDS = 300;

const bucketName = process.env.AWS_BUCKET;
const region = process.env.AWS_REGION ?? "us-east-1";

if (!bucketName) {
  throw new Error(
    "AWS_BUCKET is not set. Run `pulumi up` then `bun run sync-env` from the repo root to populate apps/web/.env.",
  );
}

const s3 = new S3Client({ bucket: bucketName, region });

function publicImageUrl(uuid: string) {
  return `https://${bucketName}.s3.${region}.amazonaws.com/${uuid}.webp`;
}

async function readIndex(): Promise<string[]> {
  const file = s3.file(INDEX_KEY);
  if (!(await file.exists())) return [];
  const text = await file.text();
  return text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);
}

async function appendToIndex(uuid: string) {
  const existing = await readIndex();
  if (existing.includes(uuid)) return;
  existing.push(uuid);
  await s3.write(INDEX_KEY, existing.join("\n") + "\n", { type: "text/plain" });
}

const server = Bun.serve({
  routes: {
    "/*": index,

    "/api/images": {
      async GET() {
        const uuids = await readIndex();
        return Response.json({
          images: uuids.map(uuid => ({ uuid, url: publicImageUrl(uuid) })),
        });
      },
    },

    "/api/uploads/presign": {
      async POST(req) {
        const body = await req.json().catch(() => null);
        const contentType = body && typeof body.contentType === "string" ? body.contentType : "";
        if (!contentType.startsWith("image/")) {
          return Response.json({ error: "contentType must be an image/* MIME type" }, { status: 400 });
        }

        const uuid = crypto.randomUUID();
        const uploadUrl = s3.presign(`${TMP_PREFIX}${uuid}`, {
          method: "PUT",
          expiresIn: PRESIGN_EXPIRES_SECONDS,
          type: contentType,
        });

        return Response.json({ uuid, uploadUrl });
      },
    },

    "/api/uploads/:uuid/complete": {
      async POST(req) {
        const { uuid } = req.params;
        if (!UUID_RE.test(uuid)) {
          return Response.json({ error: "invalid uuid" }, { status: 400 });
        }

        const rawFile = s3.file(`${TMP_PREFIX}${uuid}`);
        if (!(await rawFile.exists())) {
          return Response.json({ error: "no upload found for this uuid" }, { status: 404 });
        }

        try {
          await rawFile.image().webp({ quality: 82 }).write(s3.file(`${uuid}.webp`));
        } catch (err) {
          console.error(`webp conversion failed for ${uuid}:`, err);
          return Response.json({ error: "could not process image" }, { status: 422 });
        }

        await rawFile.delete();
        await appendToIndex(uuid);

        return Response.json({ uuid, url: publicImageUrl(uuid) });
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
