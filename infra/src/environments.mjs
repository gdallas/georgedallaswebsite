export const projectEnvironments = [
  {
    id: "dev",
    githubEnvironment: "development",
    deployBranch: "develop",
    awsEnv: {
      region: process.env.CDK_DEFAULT_REGION ?? "us-east-1"
    }
  },
  {
    id: "prod",
    githubEnvironment: "production",
    deployBranch: "main",
    awsEnv: {
      region: process.env.CDK_DEFAULT_REGION ?? "us-east-1"
    }
  }
];
