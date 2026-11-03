import { useCallback, useEffect, useState } from "react";
import type { ProfileSummary } from "../network/ApiTypes";
import { SyncApiClient } from "../network/SyncApiClient";

export type ProfileSummaryStatus = "loading" | "success" | "error";

export interface ProfileSummaryState {
  status: ProfileSummaryStatus;
  summary: ProfileSummary | null;
  /** Re-runs the fetch after a failure (the chart panel's "Повторить" button). */
  retry: () => void;
}

/**
 * Profile summary (30-day statistics) lifecycle. Guests never fetch (callers hide the section).
 * A failed fetch surfaces as an explicit error state — the section renders a retry action
 * instead of silently disappearing.
 */
export function useProfileSummary(isAuth: boolean): ProfileSummaryState {
  const [state, setState] = useState<{ status: ProfileSummaryStatus; summary: ProfileSummary | null }>({
    status: "loading",
    summary: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isAuth) return;
    let cancelled = false;
    setState({ status: "loading", summary: null });
    SyncApiClient.fetchProfileSummary()
      .then((summary) => {
        if (!cancelled) setState({ status: "success", summary });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", summary: null });
      });
    return () => {
      cancelled = true;
    };
  }, [isAuth, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { ...state, retry };
}
