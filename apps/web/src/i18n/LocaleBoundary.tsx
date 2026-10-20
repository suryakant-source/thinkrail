import { Fragment, type ReactNode } from "react";
import { useLocaleSync } from "./useLocaleSync";

export function LocaleBoundary({ children }: { children: ReactNode }) {
	const revision = useLocaleSync();
	return <Fragment key={revision}>{children}</Fragment>;
}
