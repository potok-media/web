import { useMediaDetailsHistoryActions } from "./useMediaDetailsHistoryActions";
import { useMediaDetailsSocialActions } from "./useMediaDetailsSocialActions";
import type { UseMediaDetailsActionsParams } from "./mediaDetailsTypes";

export function useMediaDetailsActions(params: UseMediaDetailsActionsParams) {
  const social = useMediaDetailsSocialActions(params);
  const history = useMediaDetailsHistoryActions(params);

  return {
    ...social,
    ...history,
  };
}