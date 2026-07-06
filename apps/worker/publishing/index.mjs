// Publishing worker Lambda (GDW-035). The CMS runs in an isolated subnet with
// no internet egress, so it cannot reach GitHub or EventBridge. Instead it drops
// JSON markers in the control S3 bucket. This Lambda — which DOES have internet
// access (it runs outside the VPC) — reacts to those markers and to the one-shot
// EventBridge schedules it creates:
//
//   S3 "rebuild" marker   -> dispatch the rebuild-site GitHub workflow
//   S3 "schedule" marker  -> create/update/delete a one-shot EventBridge schedule
//   EventBridge "publish" -> call the CMS internal endpoint to publish the doc
//
// All three paths are idempotent so retries and double-fires are safe.

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  ConflictException,
  CreateScheduleCommand,
  DeleteScheduleCommand,
  ResourceNotFoundException,
  SchedulerClient,
  UpdateScheduleCommand
} from "@aws-sdk/client-scheduler";
import {
  buildScheduleName,
  publishSignatureHeader,
  serializePublishRequest,
  signPayload,
  toScheduleExpression
} from "@georgedallas/shared/scheduling";

const region = process.env.AWS_REGION;
const s3 = new S3Client({ region });
const scheduler = new SchedulerClient({ region });

const env = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
};

export async function handler(event) {
  if (Array.isArray(event?.Records)) {
    await Promise.all(event.Records.filter((r) => r.eventSource === "aws:s3").map(handleS3Record));
    return { ok: true };
  }

  if (event?.type === "publish") {
    await publishDoc(event.collection, event.id);
    return { ok: true };
  }

  console.warn("Unrecognised event", JSON.stringify(event));
  return { ok: false, reason: "unrecognised_event" };
}

async function handleS3Record(record) {
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
  const marker = await readMarker(bucket, key);
  if (!marker) {
    return;
  }

  if (marker.type === "rebuild") {
    await dispatchRebuild(marker);
  } else if (marker.type === "schedule") {
    await applyScheduleMarker(marker);
  } else {
    console.warn("Unknown marker type", JSON.stringify(marker));
  }
}

async function readMarker(bucket, key) {
  try {
    const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const body = await result.Body.transformToString();
    return JSON.parse(body);
  } catch (error) {
    console.error("Failed to read marker", key, error);
    return null;
  }
}

// Trigger the static site rebuild via the GitHub Actions workflow. The workflow
// itself coalesces rapid triggers (concurrency: cancel-in-progress), so a burst
// of edits collapses into a single final build.
async function dispatchRebuild(marker) {
  const repo = env("GITHUB_REPO");
  const workflow = env("GITHUB_WORKFLOW");
  const ref = env("GITHUB_REF");
  const token = env("GITHUB_TOKEN");

  const response = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "content-type": "application/json",
      "user-agent": "gdw-publishing-worker"
    },
    body: JSON.stringify({ ref, inputs: { reason: `${marker.reason}:${marker.collection}/${marker.id}` } })
  });

  if (!response.ok && response.status !== 204) {
    const detail = await response.text().catch(() => "");
    throw new Error(`GitHub workflow dispatch failed (${response.status}): ${detail}`);
  }
  console.log("Dispatched site rebuild", marker.collection, marker.id, marker.reason);
}

async function applyScheduleMarker(marker) {
  const name = buildScheduleName(env("SCHEDULE_NAME_PREFIX"), marker.collection, marker.id);
  const groupName = process.env.SCHEDULE_GROUP_NAME || "default";

  if (marker.action === "delete") {
    try {
      await scheduler.send(new DeleteScheduleCommand({ Name: name, GroupName: groupName }));
      console.log("Deleted schedule", name);
    } catch (error) {
      if (!(error instanceof ResourceNotFoundException)) {
        throw error;
      }
    }
    return;
  }

  const expression = toScheduleExpression(marker.publishedAt);
  if (!expression) {
    console.error("Invalid publishedAt on schedule marker", JSON.stringify(marker));
    return;
  }

  const input = {
    Name: name,
    GroupName: groupName,
    ScheduleExpression: expression,
    ScheduleExpressionTimezone: "UTC",
    FlexibleTimeWindow: { Mode: "OFF" },
    // One-shot: EventBridge deletes the schedule itself once it has fired.
    ActionAfterCompletion: "DELETE",
    Target: {
      Arn: env("SCHEDULER_TARGET_ARN"),
      RoleArn: env("SCHEDULER_ROLE_ARN"),
      Input: JSON.stringify({ type: "publish", collection: marker.collection, id: marker.id }),
      RetryPolicy: { MaximumRetryAttempts: 3 }
    }
  };

  try {
    await scheduler.send(new CreateScheduleCommand(input));
    console.log("Created schedule", name, "for", expression);
  } catch (error) {
    if (error instanceof ConflictException) {
      await scheduler.send(new UpdateScheduleCommand(input));
      console.log("Updated schedule", name, "for", expression);
    } else {
      throw error;
    }
  }
}

// Call the CMS internal endpoint to flip a due scheduled doc to published. The
// CMS may be cold (Aurora scale-to-zero + Lambda cold start), so retry with
// backoff like the deploy workflow's health check.
async function publishDoc(collection, id) {
  const baseUrl = env("CMS_INTERNAL_URL").replace(/\/+$/, "");
  const secret = env("WEBHOOK_SECRET");
  const url = `${baseUrl}/api/internal/publish-scheduled`;
  const body = serializePublishRequest({ collection, id, requestedAt: Date.now() });
  const signature = signPayload(body, secret);

  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [publishSignatureHeader]: signature,
          "user-agent": "gdw-publishing-worker"
        },
        body
      });
    } catch (error) {
      lastError = error;
    }

    if (response) {
      const text = await response.text().catch(() => "");
      if (response.ok) {
        console.log("Scheduled publish result", collection, id, text);
        return;
      }
      lastError = new Error(`Publish failed (${response.status}): ${text}`);
      // 4xx (bad signature/body) will not improve on retry, so fail
      // immediately — thrown outside the network try/catch so it cannot be
      // swallowed back into the retry loop.
      if (response.status >= 400 && response.status < 500) {
        throw lastError;
      }
    }

    if (attempt < 5) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 3000));
    }
  }

  throw lastError ?? new Error("Scheduled publish failed");
}
