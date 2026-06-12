import { App, Stack, Tags } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { projectEnvironments } from "./environments.mjs";
import { buildStackName, standardTags } from "./naming.mjs";
import { DatabaseFoundation } from "./database-foundation.mjs";
import { SecurityFoundation } from "./security-foundation.mjs";

class GitHubOidcStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, {
      stackName: buildStackName("shared", "github-oidc"),
      description: "GitHub Actions OIDC identity provider for George Dallas website deployments.",
      env: props.awsEnv
    });

    for (const [key, value] of Object.entries(standardTags("shared"))) {
      Tags.of(this).add(key, value);
    }

    this.provider = new iam.OpenIdConnectProvider(this, "GitHubActionsOidcProvider", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"]
    });
  }
}

class FoundationStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, {
      stackName: buildStackName(props.environmentName, "foundation"),
      description: `George Dallas website ${props.environmentName} foundation stack.`,
      env: props.awsEnv
    });

    for (const [key, value] of Object.entries(standardTags(props.environmentName))) {
      Tags.of(this).add(key, value);
    }

    new Construct(this, "FoundationBoundary");
    const securityFoundation = new SecurityFoundation(this, props.environment, props.githubOidcProviderArn);
    new DatabaseFoundation(this, props.environment, securityFoundation);
  }
}

const app = new App();
const githubOidc = new GitHubOidcStack(app, "shared-github-oidc", {
  awsEnv: projectEnvironments[0].awsEnv
});

for (const environment of projectEnvironments) {
  const stack = new FoundationStack(app, `${environment.id}-foundation`, {
    environment,
    environmentName: environment.id,
    awsEnv: environment.awsEnv,
    githubOidcProviderArn: githubOidc.provider.openIdConnectProviderArn
  });
  stack.addDependency(githubOidc);
}
