import { CfnOutput, Duration, RemovalPolicy } from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import { buildResourceName } from "./naming.mjs";
import { hostedZone } from "./environments.mjs";

// Static-first public site (CODEX_RULESET.md section 13): the Astro build is
// synced to a private S3 bucket and served through CloudFront with an ACM
// certificate in us-east-1. There is no always-on compute, so idle cost is
// effectively zero (see docs/runbooks/cost-controls.md).
export class SiteHosting {
  constructor(scope, environment, certificate) {
    this.environment = environment;
    this.certificate = certificate;
    this.bucket = this.createBucket(scope);
    this.urlRewriteFunction = this.createUrlRewriteFunction(scope);
    this.distribution = this.createDistribution(scope);
    this.createDnsRecords(scope);
    this.addOutputs(scope);
  }

  createBucket(scope) {
    const isProduction = this.environment.id === "prod";

    // Private bucket: CloudFront reaches it through Origin Access Control, and
    // the GitHub deploy role writes to it during deployment. No public access.
    return new s3.Bucket(scope, "SiteBucket", {
      bucketName: buildResourceName(this.environment.id, "site"),
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: isProduction,
      removalPolicy: isProduction ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: false
    });
  }

  // An S3 REST origin behind OAC serves objects by exact key and does not do
  // directory index resolution, but Astro emits pages as `<route>/index.html`.
  // This viewer-request function rewrites "directory" URIs to the underlying
  // index document so clean URLs like `/writing` resolve.
  createUrlRewriteFunction(scope) {
    return new cloudfront.Function(scope, "SiteUrlRewrite", {
      functionName: buildResourceName(this.environment.id, "site-url-rewrite"),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      comment: `Append index.html to directory URIs for ${this.environment.id}.`,
      code: cloudfront.FunctionCode.fromInline(
        [
          "function handler(event) {",
          "  var request = event.request;",
          "  var uri = request.uri;",
          "  if (uri.endsWith('/')) {",
          "    request.uri = uri + 'index.html';",
          "  } else if (!uri.split('/').pop().includes('.')) {",
          "    request.uri = uri + '/index.html';",
          "  }",
          "  return request;",
          "}"
        ].join("\n")
      )
    });
  }

  createDistribution(scope) {
    return new cloudfront.Distribution(scope, "SiteDistribution", {
      comment: `Public static site for ${this.environment.id}.`,
      certificate: this.certificate,
      domainNames: this.environment.siteDomains,
      defaultRootObject: "index.html",
      // North America + Europe edges only — cheapest tier that covers the
      // expected audience for a personal site (cost-controls.md).
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [
          {
            function: this.urlRewriteFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST
          }
        ]
      },
      // The Astro build emits a custom 404 page (GDW-042). A private S3 REST
      // origin behind OAC answers 403 (not 404) for missing keys because the
      // OAC grant is GetObject-only, so both statuses map to the 404 page.
      errorResponses: [403, 404].map((httpStatus) => ({
        httpStatus,
        responseHttpStatus: 404,
        responsePagePath: "/404.html",
        ttl: Duration.minutes(5)
      }))
    });
  }

  createDnsRecords(scope) {
    const zone = route53.HostedZone.fromHostedZoneAttributes(scope, "SiteHostedZone", {
      hostedZoneId: hostedZone.id,
      zoneName: hostedZone.name
    });
    const target = route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution));

    this.environment.siteDomains.forEach((domain, index) => {
      new route53.ARecord(scope, `SiteAliasRecord${index}`, {
        zone,
        recordName: domain,
        target
      });

      new route53.AaaaRecord(scope, `SiteAliasRecordIpv6${index}`, {
        zone,
        recordName: domain,
        target
      });
    });
  }

  addOutputs(scope) {
    new CfnOutput(scope, "SiteBucketName", {
      value: this.bucket.bucketName,
      description: "S3 bucket the public site build is synced to."
    });

    new CfnOutput(scope, "SiteDistributionId", {
      value: this.distribution.distributionId,
      description: "CloudFront distribution id, used for cache invalidation on deploy."
    });

    new CfnOutput(scope, "SiteDistributionDomainName", {
      value: this.distribution.distributionDomainName,
      description: "CloudFront domain in front of the public site bucket."
    });

    new CfnOutput(scope, "SiteUrl", {
      value: `https://${this.environment.siteDomains[0]}`,
      description: "Primary public site URL."
    });
  }
}
