import { Duration } from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as actions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import { buildResourceName } from "./naming.mjs";

// Minimal alerting floor (GDW-051): email George when the CMS or the
// publishing worker Lambda errors. Both alarms and the SNS email subscription
// sit inside AWS's always-free tier, so this adds no standing cost
// (cost-controls.md). The email subscription must be confirmed once from the
// inbox after the first deploy.
const alertEmail = "george.m.dallas@gmail.com";

export class Observability {
  constructor(scope, environment, lambdas) {
    this.environment = environment;
    this.topic = new sns.Topic(scope, "AlertsTopic", {
      topicName: buildResourceName(environment.id, "alerts"),
      displayName: `George Dallas website ${environment.id} alerts`
    });
    this.topic.addSubscription(new subscriptions.EmailSubscription(alertEmail));

    for (const [componentName, fn] of Object.entries(lambdas)) {
      this.addErrorAlarm(scope, componentName, fn);
    }
  }

  // Any Lambda error within a 15-minute window alarms once. Missing data is
  // healthy: with scale-to-zero these functions are usually idle.
  addErrorAlarm(scope, componentName, fn) {
    const alarm = fn
      .metricErrors({ period: Duration.minutes(15), statistic: "Sum" })
      .createAlarm(scope, `${pascalCase(componentName)}ErrorsAlarm`, {
        alarmName: buildResourceName(this.environment.id, `${componentName}-errors`),
        alarmDescription: `${componentName} Lambda reported errors in ${this.environment.id}; check its CloudWatch logs.`,
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
      });

    alarm.addAlarmAction(new actions.SnsAction(this.topic));
    return alarm;
  }
}

function pascalCase(value) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");
}
