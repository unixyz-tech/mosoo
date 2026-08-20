import type { PublicThreadApiPrewarmThreadResponse } from "@mosoo/contracts/public-api";
import type { PublicThreadId } from "@mosoo/id";

import type { ApiBindings } from "../../platform/cloudflare/worker-types";
import type { PublicApiCaller } from "../auth/application/public-api-caller.service";
import { getAccountViewer } from "../auth/application/public-api-caller.service";
import { scheduleAgentSessionRuntimePrewarm } from "../runtime/application/session-runs/prewarm-agent-session-runtime.service";
import { publicNotFound } from "./public-api-errors";
import { admitPublicSessionCaller } from "./public-thread-session-query.service";

export async function prewarmPublicThread(request: {
  bindings: ApiBindings;
  caller: PublicApiCaller;
  executionContext: Pick<ExecutionContext, "waitUntil"> | null;
  requestUrl: string;
  threadId: PublicThreadId;
}): Promise<PublicThreadApiPrewarmThreadResponse> {
  const admission = await admitPublicSessionCaller(
    request.bindings.DB,
    request.caller.viewer,
    request.threadId,
  );
  const accessViewer = await getAccountViewer(request.bindings.DB, admission.agent.ownerId);

  if (!accessViewer) {
    throw publicNotFound("Agent owner account was not found.");
  }

  const acceptedAt = new Date().toISOString();
  scheduleAgentSessionRuntimePrewarm({
    accessViewer,
    bindings: request.bindings,
    executionContext: request.executionContext,
    requestUrl: request.requestUrl,
    session: {
      id: admission.session.id,
      appId: admission.session.app_id,
    },
    viewer: request.caller.viewer,
  });

  return {
    accepted_at: acceptedAt,
    status: "accepted",
    thread_id: request.threadId,
  };
}
