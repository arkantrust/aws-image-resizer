#!/usr/bin/env bun
// Writes apps/web/.env from the current Pulumi stack's outputs, so the Bun
// server can talk to the real bucket without anyone pasting keys by hand.
// Paths are resolved from this file's location, not process.cwd(), so this
// still works if it's ever invoked from somewhere other than infra/.
import { $ } from "bun";
import path from "node:path";

const infraDir = path.join(import.meta.dir, "..");
const envPath = path.join(infraDir, "../apps/web/.env");

const outputs = await $`pulumi stack output --json --show-secrets`.cwd(infraDir).json();

const required = ["bucketName", "bucketRegion", "s3AccessKeyId", "s3SecretAccessKey"] as const;
for (const key of required) {
  if (!outputs[key]) {
    console.error(`Missing stack output "${key}". Run "pulumi up" first.`);
    process.exit(1);
  }
}

const contents = [
  `AWS_REGION=${outputs.bucketRegion}`,
  `AWS_BUCKET=${outputs.bucketName}`,
  `AWS_ACCESS_KEY_ID=${outputs.s3AccessKeyId}`,
  `AWS_SECRET_ACCESS_KEY=${outputs.s3SecretAccessKey}`,
  "",
].join("\n");

await Bun.write(envPath, contents);
const stackName = (await $`pulumi stack --show-name`.cwd(infraDir).text()).trim();
console.log(`Wrote ${path.relative(process.cwd(), envPath)} from stack "${stackName}"`);
