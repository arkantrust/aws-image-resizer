import * as pulumi from "@pulumi/pulumi";
import { ImageBucket } from "./imageBucket";

const config = new pulumi.Config();

const images = new ImageBucket("gallery", {
  allowedOrigins: config.getObject<string[]>("allowedOrigins") ?? ["http://localhost:3000"],
});

export const bucketName = images.bucketName;
export const bucketRegion = images.region;
export const imagesBaseUrl = images.publicUrlBase;
export const s3AccessKeyId = images.accessKeyId;
export const s3SecretAccessKey = images.secretAccessKey;
