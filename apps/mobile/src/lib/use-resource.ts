import { useEffect, useState } from "react";
import { useIsFocused } from "@react-navigation/native";

import { getErrorMessage } from "./errors";

export function useResource<T>(loader: () => Promise<T>) {
  const isFocused = useIsFocused();
  const [reloadToken, setReloadToken] = useState(0);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    let active = true;

    setLoading(true);
    setError(null);

    loader()
      .then((value) => {
        if (!active) {
          return;
        }

        setData(value);
      })
      .catch((nextError) => {
        if (!active) {
          return;
        }

        setData(null);
        setError(getErrorMessage(nextError, "We could not load this data."));
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isFocused, loader, reloadToken]);

  return {
    data,
    error,
    loading,
    reload: async () => {
      setReloadToken((value) => value + 1);
    },
  };
}
