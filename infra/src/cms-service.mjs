import { CfnOutput, Duration, RemovalPolicy } from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildResourceName } from "./naming.mjs";
import { hostedZone } from "./environments.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export class CmsService {
  constructor(scope, environment, foundation, certificate) {
    this.environment = environment;
    this.foundation = foundation;
    this.certificate = certificate;
    this.function = this.createFunction(scope);
    this.functionUrl = this.function.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM
    });
    this.distribution = this.createDistribution(scope);
    this.createDnsRecords(scope);
    this.addOutputs(scope);
  }

  createFunction(scope) {
    const { database, security } = this.foundation;
    const databaseSecret = database.database.secret;
    const isProduction = this.environment.id === "prod";

    // Secrets are injected as CloudFormation dynamic references: resolved by
    // CloudFormation at deploy time, never stored in the template or repo.
    const databaseUrl = [
      "postgres://payload_cms:",
      databaseSecret.secretValueFromJson("password").unsafeUnwrap(),
      `@${database.database.clusterEndpoint.hostname}:5432/georgedallas`
    ].join("");

    return new lambda.DockerImageFunction(scope, "CmsFunction", {
      functionName: buildResourceName(this.environment.id, "cms"),
      description: `Payload CMS for ${this.environment.id}, behind CloudFront.`,
      code: lambda.DockerImageCode.fromImageAsset(repoRoot, {
        file: "apps/cms/Dockerfile",
        // Keep the asset hash stable across unrelated repo changes.
        exclude: ["infra/cdk.out", ".git", "node_modules", "**/node_modules", "**/.next"]
      }),
      architecture: lambda.Architecture.X86_64,
      memorySize: 1536,
      timeout: Duration.seconds(55),
      role: security.cmsRuntimeRole,
      vpc: database.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      },
      securityGroups: [database.cmsSecurityGroup],
      logGroup: new logs.LogGroup(scope, "CmsLogGroup", {
        logGroupName: `/aws/lambda/${buildResourceName(this.environment.id, "cms")}`,
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: RemovalPolicy.DESTROY
      }),
      environment: {
        APP_ENV: isProduction ? "production" : "development",
        PUBLIC_SITE_URL: this.environment.publicSiteUrl,
        CMS_PUBLIC_URL: `https://${this.environment.cmsDomain}`,
        DATABASE_URL: databaseUrl,
        S3_REGION: this.environment.awsEnv.region,
        S3_BUCKET: this.foundation.media.bucket.bucketName,
        MEDIA_PUBLIC_URL: `https://${this.foundation.media.distribution.distributionDomainName}`,
        PAYLOAD_SECRET: security.secrets["payload-secret"].secretValueFromJson("placeholder").unsafeUnwrap(),
        SESSION_SECRET: security.secrets["session-secret"].secretValueFromJson("placeholder").unsafeUnwrap()
      }
    });
  }

  createDistribution(scope) {
    return new cloudfront.Distribution(scope, "CmsDistribution", {
      comment: `Payload CMS admin/API for ${this.environment.id}.`,
      certificate: this.certificate,
      domainNames: [this.environment.cmsDomain],
      defaultBehavior: {
        origin: origins.FunctionUrlOrigin.withOriginAccessControl(this.functionUrl, {
          readTimeout: Duration.seconds(60)
        }),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      }
    });
  }

  createDnsRecords(scope) {
    const zone = route53.HostedZone.fromHostedZoneAttributes(scope, "CmsHostedZone", {
      hostedZoneId: hostedZone.id,
      zoneName: hostedZone.name
    });
    const target = route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution));
    const recordName = this.environment.cmsDomain;

    new route53.ARecord(scope, "CmsAliasRecord", {
      zone,
      recordName,
      target
    });

    new route53.AaaaRecord(scope, "CmsAliasRecordIpv6", {
      zone,
      recordName,
      target
    });
  }

  addOutputs(scope) {
    new CfnOutput(scope, "CmsUrl", {
      value: `https://${this.environment.cmsDomain}`,
      description: "CMS admin and API URL."
    });

    new CfnOutput(scope, "CmsDistributionDomainName", {
      value: this.distribution.distributionDomainName,
      description: "CloudFront domain in front of the CMS Lambda."
    });
  }
}
