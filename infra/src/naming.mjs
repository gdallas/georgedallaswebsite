export const projectId = "georgedallaswebsite";
export const owner = "George Dallas";

export function buildResourceName(environmentName, componentName) {
  return `${projectId}-${environmentName}-${componentName}`;
}

export function buildStackName(environmentName, componentName) {
  return buildResourceName(environmentName, componentName);
}

export function standardTags(environmentName) {
  return {
    project: projectId,
    environment: environmentName,
    owner,
    "managed-by": "aws-cdk"
  };
}

export function buildSecretName(environmentName, componentName) {
  return `/${projectId}/${environmentName}/${componentName}`;
}
