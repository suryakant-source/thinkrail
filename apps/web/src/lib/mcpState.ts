import type { McpServerState } from "@thinkrail/contracts";
import type { MessageKey } from "@thinkrail/locales";
import { t } from "@thinkrail/locales/react";

export type McpStateTone = "success" | "working" | "warning" | "error" | "info" | "neutral";

const MCP_STATE_KEY = {
	starting: "lib.mcpState.starting",
	connected: "lib.mcpState.connected",
	"needs-sign-in": "lib.mcpState.needsSignIn",
	failed: "lib.mcpState.failed",
	disconnected: "lib.mcpState.disconnected",
	disabled: "lib.mcpState.disabled",
	"disabled-in-project": "lib.mcpState.disabledInProject",
	"disabled-in-chat": "lib.mcpState.disabledInChat",
	"pending-approval": "lib.mcpState.pendingApproval",
	"invalid-config": "lib.mcpState.invalidConfig",
	"pending-reload": "lib.mcpState.pendingReload",
	"not-running": "lib.mcpState.notRunning",
	"handled-elsewhere": "lib.mcpState.handledElsewhere",
	unknown: "common.unknown",
} satisfies Record<McpServerState, MessageKey>;

export const MCP_STATE_LABEL: Readonly<Record<McpServerState, string>> = Object.defineProperties(
	{} as Record<McpServerState, string>,
	Object.fromEntries(
		Object.entries(MCP_STATE_KEY).map(([state, key]) => [
			state,
			{ enumerable: true, get: () => t(key) },
		]),
	),
);

const MCP_STATE_TONE: Readonly<Record<McpServerState, McpStateTone>> = {
	starting: "working",
	connected: "success",
	"needs-sign-in": "warning",
	failed: "error",
	disconnected: "warning",
	disabled: "neutral",
	"disabled-in-project": "neutral",
	"disabled-in-chat": "neutral",
	"pending-approval": "warning",
	"invalid-config": "error",
	"pending-reload": "info",
	"not-running": "neutral",
	"handled-elsewhere": "neutral",
	unknown: "neutral",
};

export function mcpStateTone(state: McpServerState, toolCount?: number): McpStateTone {
	return state === "connected" && toolCount === 0 ? "warning" : MCP_STATE_TONE[state];
}

export function isMcpAttentionState(state: McpServerState): boolean {
	return state === "needs-sign-in" || state === "failed" || state === "pending-approval";
}

export function isMcpActiveState(state: McpServerState): boolean {
	return state === "connected" || state === "starting";
}

export function mcpToolCountLabel(count: number): string {
	return t("lib.mcpState.toolCount", { count });
}

export function mcpStatusLabel(state: McpServerState, toolCount?: number): string {
	return state === "connected" && toolCount !== undefined
		? t("lib.mcpState.connectedWithTools", { count: toolCount })
		: MCP_STATE_LABEL[state];
}
