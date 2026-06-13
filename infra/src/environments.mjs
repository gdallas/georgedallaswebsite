// Pinned region: George's other AWS workloads run in ca-central-1, and the
// region must not silently follow the local CLI default.
export const projectRegion = "ca-central-1";

// CloudFront only accepts ACM certificates issued in us-east-1.
export const certificateRegion = "us-east-1";

// The account ID is required for cross-region certificate references and is
// not sensitive.
export const projectAccount = "833090513890";

// Existing public hosted zone for georgedallas.com in this account.
export const hostedZone = {
  id: "Z047607521KPBZN7E60GU",
  name: "georgedallas.com"
};

export const projectEnvironments = [
  {
    id: "dev",
    githubEnvironment: "development",
    deployBranch: "develop",
    cmsDomain: "cms-dev.georgedallas.com",
    publicSiteUrl: "https://dev.georgedallas.com",
    siteDomains: ["dev.georgedallas.com"],
    awsEnv: {
      account: projectAccount,
      region: projectRegion
    }
  },
  {
    id: "prod",
    githubEnvironment: "production",
    deployBranch: "main",
    cmsDomain: "cms.georgedallas.com",
    publicSiteUrl: "https://georgedallas.com",
    siteDomains: ["georgedallas.com", "www.georgedallas.com"],
    awsEnv: {
      account: projectAccount,
      region: projectRegion
    }
  }
];
