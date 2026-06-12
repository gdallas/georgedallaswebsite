import { CfnOutput, Duration, RemovalPolicy } from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import { buildResourceName, buildSecretName } from "./naming.mjs";

export class DatabaseFoundation {
  constructor(scope, environment, securityFoundation) {
    this.environment = environment;
    this.securityFoundation = securityFoundation;
    this.vpc = this.createVpc(scope);
    this.cmsSecurityGroup = this.createCmsSecurityGroup(scope);
    this.databaseSecurityGroup = this.createDatabaseSecurityGroup(scope);
    this.database = this.createDatabase(scope);
    this.grantRuntimeAccess();
    this.addOutputs(scope);
  }

  createVpc(scope) {
    return new ec2.Vpc(scope, "ApplicationVpc", {
      vpcName: buildResourceName(this.environment.id, "vpc"),
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC
        },
        {
          cidrMask: 24,
          name: "database",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED
        }
      ]
    });
  }

  createCmsSecurityGroup(scope) {
    return new ec2.SecurityGroup(scope, "CmsServiceSecurityGroup", {
      vpc: this.vpc,
      securityGroupName: buildResourceName(this.environment.id, "cms-sg"),
      description: `CMS service security group for ${this.environment.id}.`,
      allowAllOutbound: true
    });
  }

  createDatabaseSecurityGroup(scope) {
    const databaseSecurityGroup = new ec2.SecurityGroup(scope, "DatabaseSecurityGroup", {
      vpc: this.vpc,
      securityGroupName: buildResourceName(this.environment.id, "database-sg"),
      description: `PostgreSQL security group for ${this.environment.id}.`,
      allowAllOutbound: false
    });

    databaseSecurityGroup.addIngressRule(
      this.cmsSecurityGroup,
      ec2.Port.tcp(5432),
      "Allow PostgreSQL access only from the CMS service security group."
    );

    return databaseSecurityGroup;
  }

  createDatabase(scope) {
    const isProduction = this.environment.id === "prod";

    return new rds.DatabaseInstance(scope, "PostgresDatabase", {
      instanceIdentifier: buildResourceName(this.environment.id, "postgres"),
      databaseName: "georgedallas",
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_9
      }),
      credentials: rds.Credentials.fromGeneratedSecret("payload_cms", {
        secretName: buildSecretName(this.environment.id, "database-credentials"),
        encryptionKey: this.securityFoundation.key
      }),
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      },
      securityGroups: [this.databaseSecurityGroup],
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      allocatedStorage: 20,
      maxAllocatedStorage: isProduction ? 100 : 50,
      storageEncrypted: true,
      storageEncryptionKey: this.securityFoundation.key,
      backupRetention: Duration.days(isProduction ? 30 : 7),
      deletionProtection: isProduction,
      publiclyAccessible: false,
      multiAz: false,
      autoMinorVersionUpgrade: true,
      removalPolicy: isProduction ? RemovalPolicy.SNAPSHOT : RemovalPolicy.DESTROY
    });
  }

  grantRuntimeAccess() {
    if (this.database.secret) {
      this.database.secret.grantRead(this.securityFoundation.cmsRuntimeRole);
    }
  }

  addOutputs(scope) {
    new CfnOutput(scope, "DatabaseEndpointAddress", {
      value: this.database.dbInstanceEndpointAddress,
      description: "Private PostgreSQL endpoint address."
    });

    new CfnOutput(scope, "DatabaseCredentialsSecretName", {
      value: buildSecretName(this.environment.id, "database-credentials"),
      description: "Secrets Manager secret name for database credentials."
    });

    new CfnOutput(scope, "CmsServiceSecurityGroupId", {
      value: this.cmsSecurityGroup.securityGroupId,
      description: "Security group that future CMS services must use to reach PostgreSQL."
    });
  }
}
