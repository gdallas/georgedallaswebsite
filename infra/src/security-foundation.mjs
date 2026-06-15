import { Duration, RemovalPolicy } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { buildResourceName, buildSecretName, projectId } from "./naming.mjs";

const githubRepo = "gdallas/georgedallaswebsite";

export class SecurityFoundation {
  constructor(scope, environment, githubOidcProviderArn) {
    this.environment = environment;
    this.githubOidcProviderArn = githubOidcProviderArn;
    this.key = this.createEnvironmentKey(scope);
    this.secrets = this.createSecretPlaceholders(scope);
    this.githubDeployRole = this.createGitHubDeployRole(scope);
    this.cmsRuntimeRole = this.createRuntimeRole(scope, "cms-runtime", "CMS runtime role");
    this.jobsRuntimeRole = this.createRuntimeRole(scope, "jobs-runtime", "Background jobs runtime role");

    // The CMS runs as a Lambda container (see the CMS Lambda hosting ADR), so
    // its runtime role needs the Lambda VPC execution basics for logs and ENIs.
    this.cmsRuntimeRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole")
    );

    // The publishing worker is an ordinary (non-VPC) Lambda, so its role just
    // needs CloudWatch Logs from the basic execution policy.
    this.jobsRuntimeRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
    );

    this.schedulerExecutionRole = this.createSchedulerExecutionRole(scope);

    this.grantRuntimeSecretAccess();
    this.grantPublishingAccess();
  }

  createEnvironmentKey(scope) {
    const key = new kms.Key(scope, "EnvironmentKey", {
      alias: `alias/${buildResourceName(this.environment.id, "app-key")}`,
      description: `KMS key for ${projectId} ${this.environment.id} application secrets and encrypted resources.`,
      enableKeyRotation: true,
      removalPolicy: this.environment.id === "prod" ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      pendingWindow: Duration.days(30)
    });

    return key;
  }

  createSecretPlaceholders(scope) {
    const secretDefinitions = [
      ["payload-secret", "Payload CMS application secret."],
      ["session-secret", "CMS session signing secret."],
      ["origin-verify", "Header value CloudFront injects so the CMS only serves CDN traffic."],
      ["webhook-secret", "Build and publish webhook signing secret."],
      ["github-token", "Fine-grained GitHub PAT (actions:write) the publishing worker uses to trigger site rebuilds."],
      ["email-config", "Amazon SES sender and notification configuration."],
      ["external-api-keys", "Optional third-party API keys for import, ISBN, analytics, or integrations."]
    ];

    return Object.fromEntries(
      secretDefinitions.map(([name, description]) => {
        const secret = new secretsmanager.Secret(scope, pascalCase(`${name}-secret`), {
          secretName: buildSecretName(this.environment.id, name),
          description,
          encryptionKey: this.key,
          generateSecretString: {
            secretStringTemplate: JSON.stringify({ managedBy: "aws-cdk", environment: this.environment.id }),
            generateStringKey: "placeholder",
            excludePunctuation: true,
            passwordLength: 32
          }
        });
        return [name, secret];
      })
    );
  }

  createGitHubDeployRole(scope) {
    const principal = new iam.WebIdentityPrincipal(this.githubOidcProviderArn, {
      StringEquals: {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        "token.actions.githubusercontent.com:sub": `repo:${githubRepo}:environment:${this.environment.githubEnvironment}`
      }
    });

    const role = new iam.Role(scope, "GitHubDeployRole", {
      roleName: buildResourceName(this.environment.id, "github-deploy"),
      description: `GitHub Actions deploy role for ${projectId} ${this.environment.id}.`,
      assumedBy: principal,
      maxSessionDuration: Duration.hours(1)
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "AllowCdkBootstrapLookup",
        actions: ["sts:GetCallerIdentity", "cloudformation:DescribeStacks", "cloudformation:ListStacks"],
        resources: ["*"]
      })
    );

    // Deployments run `cdk deploy` from GitHub Actions, which works by
    // assuming the scoped CDK bootstrap roles (deploy, file/image publishing,
    // lookup). Actual resource permissions live on those bootstrap roles.
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "AllowAssumeCdkBootstrapRoles",
        actions: ["sts:AssumeRole"],
        resources: [`arn:aws:iam::${this.environment.awsEnv.account}:role/cdk-*`]
      })
    );

    // The CDK CLI verifies the bootstrap stack version through this SSM
    // parameter with the caller's own credentials before assuming roles.
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "AllowReadCdkBootstrapVersion",
        actions: ["ssm:GetParameter"],
        resources: [`arn:aws:ssm:*:${this.environment.awsEnv.account}:parameter/cdk-bootstrap/*`]
      })
    );

    // After `cdk deploy`, the workflow syncs the Astro build to the site bucket
    // and invalidates the CloudFront cache directly as this role (not through
    // the CDK bootstrap roles). The bucket name is deterministic, so it is
    // referenced by ARN string here to avoid a cross-stack dependency on the
    // site stack (which already depends on the foundation outputs).
    const siteBucketArn = `arn:aws:s3:::${buildResourceName(this.environment.id, "site")}`;
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "AllowPublishStaticSite",
        actions: ["s3:ListBucket", "s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
        resources: [siteBucketArn, `${siteBucketArn}/*`]
      })
    );

    // The distribution id is generated at deploy time, so invalidation is
    // scoped to any distribution in this account rather than a specific ARN.
    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "AllowInvalidateSiteCdn",
        actions: ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"],
        resources: [`arn:aws:cloudfront::${this.environment.awsEnv.account}:distribution/*`]
      })
    );

    return role;
  }

  createRuntimeRole(scope, componentName, description) {
    return new iam.Role(scope, pascalCase(componentName), {
      roleName: buildResourceName(this.environment.id, componentName),
      description: `${description} for ${projectId} ${this.environment.id}.`,
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
        new iam.ServicePrincipal("lambda.amazonaws.com")
      )
    });
  }

  grantRuntimeSecretAccess() {
    for (const secret of Object.values(this.secrets)) {
      secret.grantRead(this.cmsRuntimeRole);
    }

    this.secrets["webhook-secret"].grantRead(this.jobsRuntimeRole);
    this.secrets["github-token"].grantRead(this.jobsRuntimeRole);
    this.secrets["email-config"].grantRead(this.jobsRuntimeRole);
    this.secrets["external-api-keys"].grantRead(this.jobsRuntimeRole);
  }

  // EventBridge Scheduler assumes this role when a one-shot publish schedule
  // fires, so it can invoke the publishing worker. Referenced by deterministic
  // ARN string (not construct) to avoid a circular dependency on the CMS stack
  // where the worker lives.
  createSchedulerExecutionRole(scope) {
    const { account, region } = this.environment.awsEnv;
    const workerArn = `arn:aws:lambda:${region}:${account}:function:${buildResourceName(this.environment.id, "publish-worker")}`;

    const role = new iam.Role(scope, "SchedulerExecutionRole", {
      roleName: buildResourceName(this.environment.id, "scheduler"),
      description: `EventBridge Scheduler execution role for ${projectId} ${this.environment.id} publishing.`,
      assumedBy: new iam.ServicePrincipal("scheduler.amazonaws.com")
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        sid: "AllowInvokePublishingWorker",
        actions: ["lambda:InvokeFunction"],
        resources: [workerArn]
      })
    );

    return role;
  }

  // Wire up the S3 "control plane" the VPC-isolated CMS uses to signal the
  // internet-capable publishing worker (GDW-035). Both the control bucket and
  // the schedules are referenced by deterministic ARN strings to keep the
  // foundation stack free of dependencies on the CMS stack.
  grantPublishingAccess() {
    const { account, region } = this.environment.awsEnv;
    const controlBucketArn = `arn:aws:s3:::${buildResourceName(this.environment.id, "publish-control")}`;
    const scheduleArn = `arn:aws:scheduler:${region}:${account}:schedule/default/${this.environment.id}-pub-*`;

    // The CMS writes publish/schedule markers.
    this.cmsRuntimeRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "AllowWritePublishMarkers",
        actions: ["s3:PutObject"],
        resources: [`${controlBucketArn}/*`]
      })
    );

    // The worker reads markers, manages one-shot schedules, and passes the
    // scheduler execution role when creating them.
    this.jobsRuntimeRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "AllowReadPublishMarkers",
        actions: ["s3:GetObject"],
        resources: [`${controlBucketArn}/*`]
      })
    );

    this.jobsRuntimeRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "AllowManagePublishSchedules",
        actions: [
          "scheduler:CreateSchedule",
          "scheduler:UpdateSchedule",
          "scheduler:DeleteSchedule",
          "scheduler:GetSchedule"
        ],
        resources: [scheduleArn]
      })
    );

    this.jobsRuntimeRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "AllowPassSchedulerRole",
        actions: ["iam:PassRole"],
        resources: [this.schedulerExecutionRole.roleArn]
      })
    );
  }
}

function pascalCase(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");
}
