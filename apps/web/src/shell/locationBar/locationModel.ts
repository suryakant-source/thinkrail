import type { OpenBranchReview } from "@thinkrail/contracts";
import { type Translator, t } from "@thinkrail/locales/react";
import { isOpenBranchReview } from "../../panels/useOpenBranchReview";

export interface RemoteCounts {
	unpushed: number;
	behind: number;
}

export function remoteCounts(
	review: OpenBranchReview | null,
	detailsKnown = true,
): RemoteCounts | "unknown" | null {
	if (!review || !isOpenBranchReview(review)) return null;
	if (!detailsKnown) return "unknown";
	const unpushed = review.unpushedCommits ?? 0;
	const behind = review.behindCommits ?? 0;
	return unpushed > 0 || behind > 0 ? { unpushed, behind } : null;
}

export type ReviewTone = "success" | "info" | "neutral";

export function reviewTone(review: OpenBranchReview): ReviewTone {
	return review.state === "merged" ? "info" : review.state === "closed" ? "neutral" : "success";
}

export function reviewStateLabel(t: Translator, review: OpenBranchReview): string {
	return review.state === "merged"
		? t("shell.location.review.merged")
		: review.state === "closed"
			? t("shell.location.review.closed")
			: t("shell.location.review.open");
}

/** `PR #12` while open; `Merged #12` / `Closed #12` afterwards (MRs keep their `!`). */
export function reviewChipLabel(t: Translator, review: OpenBranchReview): string {
	const ref = `${review.kind === "pull-request" ? "#" : "!"}${review.number}`;
	if (isOpenBranchReview(review)) {
		return review.kind === "pull-request"
			? t("shell.location.review.chipPr", { ref })
			: t("shell.location.review.chipMr", { ref });
	}
	return review.state === "merged"
		? t("shell.location.review.chipMerged", { ref })
		: t("shell.location.review.chipClosed", { ref });
}

export function projectInitial(name: string): string {
	const first = [...name.trim()][0];
	return first ? first.toLocaleUpperCase() : "?";
}

export function pluralCommits(count: number): string {
	return t("shell.location.commits", { count });
}
