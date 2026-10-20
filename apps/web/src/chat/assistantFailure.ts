import type { StopReason } from "@thinkrail/contracts";
import { t } from "@thinkrail/locales/react";

interface AssistantTerminal {
	stopReason: StopReason;
	errorMessage?: string;
}

export function assistantFailureText(
	terminal: AssistantTerminal | null | undefined,
): string | null {
	if (terminal?.stopReason === "error") {
		return terminal.errorMessage || t("chat.failure.error");
	}
	if (terminal?.stopReason === "length") {
		return t("chat.failure.truncated");
	}
	return null;
}
