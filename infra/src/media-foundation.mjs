import { CfnOutput, Duration, RemovalPolicy } from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import { buildResourceName } from "./naming.mjs";

const mediaPrefixes = ["uploads", "wordpress-imports", "book-covers", "project-images", "social-images"];

export class MediaFoundation {
  constructor(scope, environment, securityFoundation) {
    this.environment = environment;
    this.securityFoundation = securityFoundation;
    this.bucket = this.createBucket(scope);
    this.distribution = this.createDistribution(scope);
    this.grantCmsAccess();
    this.addOutputs(scope);
  }

  createBucket(scope) {
    const isProduction = this.environment.id === "prod";

    return new s3.Bucket(scope, "MediaBucket", {
      bucketName: buildResourceName(this.environment.id, "media"),
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: isProduction,
      removalPolicy: isProduction ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: false,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: this.allowedOrigins(),
          allowedHeaders: ["Authorization", "Content-Type"],
          maxAge: 3600
        }
      ],
      lifecycleRules: [
        {
          id: "AbortIncompleteMultipartUploads",
          abortIncompleteMultipartUploadAfter: Duration.days(7)
        }
      ]
    });
  }

  createDistribution(scope) {
    return new cloudfront.Distribution(scope, "MediaDistribution", {
      comment: `Private S3 backed media delivery for ${this.environment.id}.`,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      }
    });
  }

  grantCmsAccess() {
    for (const prefix of mediaPrefixes) {
      this.bucket.grantReadWrite(this.securityFoundation.cmsRuntimeRole, `${prefix}/*`);
    }
  }

  addOutputs(scope) {
    new CfnOutput(scope, "MediaBucketName", {
      value: this.bucket.bucketName,
      description: "Private S3 bucket for CMS-managed media."
    });

    new CfnOutput(scope, "MediaDistributionDomainName", {
      value: this.distribution.distributionDomainName,
      description: "CloudFront domain for public media delivery."
    });

    new CfnOutput(scope, "MediaPrefixStructure", {
      value: mediaPrefixes.map((prefix) => `${prefix}/`).join(","),
      description: "Approved top-level media prefixes."
    });
  }

  allowedOrigins() {
    if (this.environment.id === "prod") {
      return ["https://georgedallas.com", "https://www.georgedallas.com", "https://cms.georgedallas.com"];
    }

    return ["https://dev.georgedallas.com", "https://cms-dev.georgedallas.com"];
  }
}
