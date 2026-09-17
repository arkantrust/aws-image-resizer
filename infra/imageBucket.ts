import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export interface ImageBucketArgs {
  /**
   * Origins allowed to PUT/GET via presigned URLs and CORS preflight.
   * Defaults to the local Bun dev server.
   */
  allowedOrigins?: pulumi.Input<pulumi.Input<string>[]>;
  /** Days to keep abandoned raw uploads under `tmp/` before S3 deletes them. */
  tmpUploadExpirationDays?: number;
}

/**
 * S3 bucket + IAM identity backing the gallery app.
 *
 * Layout inside the bucket:
 * - `tmp/<uuid>`   raw browser upload, private, auto-expires (see tmpUploadExpirationDays)
 * - `<uuid>.webp`  server-converted image, publicly readable
 * - `index.txt`    newline-separated list of published uuids, private (read via the app's IAM credentials)
 */
export class ImageBucket extends pulumi.ComponentResource {
  public readonly bucketName: pulumi.Output<string>;
  public readonly bucketArn: pulumi.Output<string>;
  public readonly region: pulumi.Output<string>;
  public readonly publicUrlBase: pulumi.Output<string>;
  public readonly accessKeyId: pulumi.Output<string>;
  public readonly secretAccessKey: pulumi.Output<string>;

  constructor(name: string, args: ImageBucketArgs = {}, opts?: pulumi.ComponentResourceOptions) {
    super("gallery:index:ImageBucket", name, {}, opts);

    const allowedOrigins = args.allowedOrigins ?? ["http://localhost:3000"];
    const tmpExpirationDays = args.tmpUploadExpirationDays ?? 1;

    const bucket = new aws.s3.Bucket(
      `${name}-bucket`,
      {
        forceDestroy: true,
      },
      { parent: this },
    );

    // Only *.webp objects are ever made public (see bucket policy below), so
    // ACLs stay blocked; public access is granted purely through the policy.
    const publicAccessBlock = new aws.s3.BucketPublicAccessBlock(
      `${name}-public-access-block`,
      {
        bucket: bucket.id,
        blockPublicAcls: true,
        ignorePublicAcls: true,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      },
      { parent: this },
    );

    new aws.s3.BucketPolicy(
      `${name}-public-read-webp`,
      {
        bucket: bucket.id,
        // Raw uploads live under tmp/<uuid> with no extension, so this
        // resource pattern can never match them -- only converted images do.
        policy: pulumi.jsonStringify({
          Version: "2012-10-17",
          Statement: [
            {
              Sid: "PublicReadConvertedImages",
              Effect: "Allow",
              Principal: "*",
              Action: "s3:GetObject",
              Resource: pulumi.interpolate`${bucket.arn}/*.webp`,
            },
          ],
        }),
      },
      { parent: this, dependsOn: [publicAccessBlock] },
    );

    new aws.s3.BucketCorsConfiguration(
      `${name}-cors`,
      {
        bucket: bucket.id,
        corsRules: [
          {
            allowedMethods: ["PUT", "GET"],
            allowedOrigins,
            allowedHeaders: ["*"],
            exposeHeaders: ["ETag"],
            maxAgeSeconds: 3000,
          },
        ],
      },
      { parent: this },
    );

    new aws.s3.BucketLifecycleConfiguration(
      `${name}-lifecycle`,
      {
        bucket: bucket.id,
        rules: [
          {
            id: "expire-tmp-uploads",
            status: "Enabled",
            filter: { prefix: "tmp/" },
            expiration: { days: tmpExpirationDays },
          },
        ],
      },
      { parent: this },
    );

    const user = new aws.iam.User(`${name}-app-user`, {}, { parent: this });

    new aws.iam.UserPolicy(
      `${name}-app-policy`,
      {
        user: user.name,
        policy: pulumi.jsonStringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Action: ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
              Resource: pulumi.interpolate`${bucket.arn}/*`,
            },
            {
              Effect: "Allow",
              Action: ["s3:ListBucket"],
              Resource: bucket.arn,
            },
          ],
        }),
      },
      { parent: this },
    );

    const accessKey = new aws.iam.AccessKey(`${name}-app-key`, { user: user.name }, { parent: this });

    const region = aws.getRegionOutput({}, { parent: this }).name;

    this.bucketName = bucket.bucket;
    this.bucketArn = bucket.arn;
    this.region = region;
    this.publicUrlBase = pulumi.interpolate`https://${bucket.bucket}.s3.${region}.amazonaws.com`;
    this.accessKeyId = accessKey.id;
    this.secretAccessKey = pulumi.secret(accessKey.secret);

    this.registerOutputs({
      bucketName: this.bucketName,
      bucketArn: this.bucketArn,
      region: this.region,
      publicUrlBase: this.publicUrlBase,
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
    });
  }
}
