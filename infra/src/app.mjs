import { App, Stack, Tags } from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";
import { certificateRegion, hostedZone, projectEnvironments } from "./environments.mjs";
import { buildStackName, standardTags } from "./naming.mjs";
import { CmsService } from "./cms-service.mjs";
import { DatabaseFoundation } from "./database-foundation.mjs";
import { MediaFoundation } from "./media-foundation.mjs";
import { SecurityFoundation } from "./security-foundation.mjs";

function applyStandardTags(stack, environmentName) {
  for (const [key, value] of Object.entries(standardTags(environmentName))) {
    Tags.of(stack).add(key, value);
  }
}

class FoundationStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, {
      stackName: buildStackName(props.environmentName, "foundation"),
      description: `George Dallas website ${props.environmentName} foundation stack.`,
      env: props.awsEnv,
      crossRegionReferences: true
    });

    applyStandardTags(this, props.environmentName);

    // The GitHub Actions OIDC identity provider is an account-level singleton
    // (IAM allows one per provider URL) and already exists in this shared AWS
    // account, so the deploy roles reference it instead of creating one.
    const githubOidcProviderArn = `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`;

    new Construct(this, "FoundationBoundary");
    this.security = new SecurityFoundation(this, props.environment, githubOidcProviderArn);
    this.database = new DatabaseFoundation(this, props.environment, this.security);
    this.media = new MediaFoundation(this, props.environment, this.security);
  }
}

class CmsCertificateStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, {
      stackName: buildStackName(props.environmentName, "cms-cert"),
      description: `ACM certificate (us-east-1, for CloudFront) for the ${props.environmentName} CMS domain.`,
      env: {
        account: props.environment.awsEnv.account,
        region: certificateRegion
      },
      crossRegionReferences: true
    });

    applyStandardTags(this, props.environmentName);

    const zone = route53.HostedZone.fromHostedZoneAttributes(this, "Zone", {
      hostedZoneId: hostedZone.id,
      zoneName: hostedZone.name
    });

    this.certificate = new acm.Certificate(this, "CmsCertificate", {
      domainName: props.environment.cmsDomain,
      validation: acm.CertificateValidation.fromDns(zone)
    });
  }
}

class CmsStack extends Stack {
  constructor(scope, id, props) {
    super(scope, id, {
      stackName: buildStackName(props.environmentName, "cms"),
      description: `George Dallas website ${props.environmentName} CMS service stack.`,
      env: props.awsEnv,
      crossRegionReferences: true
    });

    applyStandardTags(this, props.environmentName);

    new CmsService(this, props.environment, props.foundation, props.certificate);
  }
}

const app = new App();

for (const environment of projectEnvironments) {
  const foundation = new FoundationStack(app, `${environment.id}-foundation`, {
    environment,
    environmentName: environment.id,
    awsEnv: environment.awsEnv
  });

  const certificateStack = new CmsCertificateStack(app, `${environment.id}-cms-cert`, {
    environment,
    environmentName: environment.id
  });

  const cmsStack = new CmsStack(app, `${environment.id}-cms`, {
    environment,
    environmentName: environment.id,
    awsEnv: environment.awsEnv,
    foundation,
    certificate: certificateStack.certificate
  });

  cmsStack.addDependency(foundation);
  cmsStack.addDependency(certificateStack);
}
