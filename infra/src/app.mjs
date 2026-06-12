import { App, Stack, Tags } from "aws-cdk-lib";
import { Construct } from "constructs";
import { projectEnvironments } from "./environments.mjs";
import { buildStackName, standardTags } from "./naming.mjs";
import { DatabaseFoundation } from "./database-foundation.mjs";
import { MediaFoundation } from "./media-foundation.mjs";
import { SecurityFoundation } from "./security-foundation.mjs";

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

    // The GitHub Actions OIDC identity provider is an account-level singleton
    // (IAM allows one per provider URL) and already exists in this shared AWS
    // account, so the deploy roles reference it instead of creating one.
    const githubOidcProviderArn = `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`;

    new Construct(this, "FoundationBoundary");
    const securityFoundation = new SecurityFoundation(this, props.environment, githubOidcProviderArn);
    new DatabaseFoundation(this, props.environment, securityFoundation);
    new MediaFoundation(this, props.environment, securityFoundation);
  }
}

const app = new App();

for (const environment of projectEnvironments) {
  new FoundationStack(app, `${environment.id}-foundation`, {
    environment,
    environmentName: environment.id,
    awsEnv: environment.awsEnv
  });
}
