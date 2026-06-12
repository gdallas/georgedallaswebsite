// Pinned region: George's other AWS workloads run in ca-central-1, and the
// region must not silently follow the local CLI default.
export const projectRegion = "ca-central-1";

export const projectEnvironments = [
  {
    id: "dev",
    githubEnvironment: "development",
    deployBranch: "develop",
    awsEnv: {
      region: projectRegion
    }
  },
  {
    id: "prod",
    githubEnvironment: "production",
    deployBranch: "main",
    awsEnv: {
      region: projectRegion
    }
  }
];
