import { CfnOutput, Duration, RemovalPolicy } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildResourceName } from "./naming.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const markerPrefix = "publish/";

// The publishing worker (GDW-035). The CMS runs in an isolated subnet with no
// internet egress, so it drops JSON markers in this control bucket; an S3 event
// triggers this Lambda — which runs OUTSIDE the VPC and therefore can reach
// GitHub and the EventBridge Scheduler API. It dispatches site rebuilds and
// creates/cancels the one-shot schedules that auto-publish scheduled content.
export class PublishingWorker {
  constructor(scope, environment, foundation) {
    this.environment = environment;
    this.foundation = foundation;
    this.controlBucket = this.createControlBucket(scope);
    this.function = this.createFunction(scope);
    this.controlBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(this.function),
      { prefix: markerPrefix }
    );
    this.addOutputs(scope);
  }

  createControlBucket(scope) {
    const isProduction = this.environment.id === "prod";
    return new s3.Bucket(scope, "PublishControlBucket", {
      bucketName: buildResourceName(this.environment.id, "publish-control"),
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      // Markers are ephemeral signals; expire them so the bucket stays empty.
      lifecycleRules: [{ expiration: Duration.days(1) }],
      removalPolicy: isProduction ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProduction
    });
  }

  createFunction(scope) {
    const { security } = this.foundation;
    const { account, region } = this.environment.awsEnv;
    const githubRef = this.environment.id === "prod" ? "main" : "develop";
    const functionName = buildResourceName(this.environment.id, "publish-worker");
    // The one-shot schedules target this same function. Reference its ARN as a
    // deterministic string rather than `fn.functionArn` (an Fn::GetAtt on the
    // function itself) — putting that self-reference in the function's own
    // environment creates a CloudFormation circular dependency.
    const workerArn = `arn:aws:lambda:${region}:${account}:function:${functionName}`;
    const unwrap = (name) =>
      security.secrets[name].secretValueFromJson("placeholder").unsafeUnwrap();

    const fn = new nodejs.NodejsFunction(scope, "PublishingWorkerFunction", {
      functionName,
      description: `Triggers site rebuilds and one-shot publish schedules for ${this.environment.id}.`,
      entry: path.join(repoRoot, "apps", "worker", "publishing", "index.mjs"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 256,
      timeout: Duration.seconds(60),
      role: security.jobsRuntimeRole,
      logGroup: new logs.LogGroup(scope, "PublishingWorkerLogGroup", {
        logGroupName: `/aws/lambda/${buildResourceName(this.environment.id, "publish-worker")}`,
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: RemovalPolicy.DESTROY
      }),
      bundling: {
        // Bundle everything (including the AWS SDK clients) so the function is
        // self-contained regardless of what the managed runtime ships.
        externalModules: [],
        target: "node20",
        format: nodejs.OutputFormat.ESM
      },
      environment: {
        CMS_INTERNAL_URL: `https://${this.environment.cmsDomain}`,
        WEBHOOK_SECRET: unwrap("webhook-secret"),
        GITHUB_TOKEN: unwrap("github-token"),
        GITHUB_REPO: "gdallas/georgedallaswebsite",
        GITHUB_WORKFLOW: "rebuild-site.yml",
        GITHUB_REF: githubRef,
        SCHEDULE_NAME_PREFIX: `${this.environment.id}-pub-`,
        SCHEDULE_GROUP_NAME: "default",
        SCHEDULER_ROLE_ARN: security.schedulerExecutionRole.roleArn,
        SCHEDULER_TARGET_ARN: workerArn
      }
    });

    return fn;
  }

  addOutputs(scope) {
    new CfnOutput(scope, "PublishControlBucketName", {
      value: this.controlBucket.bucketName,
      description: "Control bucket the CMS writes publishing markers to."
    });
    new CfnOutput(scope, "PublishingWorkerFunctionName", {
      value: this.function.functionName,
      description: "Lambda that dispatches rebuilds and manages publish schedules."
    });
  }
}
