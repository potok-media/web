import { useCallback, useEffect, useState } from "react";
import { ApiClient } from "../network/ApiClient";
import type { PersonDetails } from "../network/ApiTypes";
import { logger } from "../utils/logger";

interface UseActorDetailsResult {
  actorDetails: PersonDetails | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useActorDetails(actorId: number): UseActorDetailsResult {
  const [actorDetails, setActorDetails] = useState<PersonDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!actorId || Number.isNaN(actorId)) {
      setActorDetails(null);
      setLoading(false);
      setError(new Error("Invalid actor id"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await ApiClient.fetchPersonDetails(actorId);
      setActorDetails(data);
    } catch (err) {
      const normalized =
        err instanceof Error ? err : new Error("Failed to fetch actor details");
      logger.error("Failed to fetch actor details:", normalized);
      setActorDetails(null);
      setError(normalized);
    } finally {
      setLoading(false);
    }
  }, [actorId]);

  useEffect(() => {
    void fetchDetails();
  }, [fetchDetails]);

  return { actorDetails, loading, error, refetch: fetchDetails };
}