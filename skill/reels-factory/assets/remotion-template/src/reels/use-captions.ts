import { parseSrt, type Caption } from "@remotion/captions";
import { useCallback, useEffect, useState } from "react";
import { useDelayRender } from "remotion";
import { resolveMediaSource } from "./media";

const isCaption = (value: unknown): value is Caption => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Partial<Caption>;
  return (
    typeof item.text === "string" &&
    typeof item.startMs === "number" &&
    typeof item.endMs === "number"
  );
};

export const useCaptions = (source: string) => {
  const [captions, setCaptions] = useState<Caption[] | null>(null);
  const { cancelRender, continueRender, delayRender } = useDelayRender();
  const [handle] = useState(() => delayRender("Загрузка субтитров"));

  const loadCaptions = useCallback(async () => {
    try {
      if (!source) {
        setCaptions([]);
        continueRender(handle);
        return;
      }

      const response = await fetch(resolveMediaSource(source));
      if (!response.ok) {
        throw new Error(`Не удалось загрузить субтитры: ${response.status}`);
      }

      if (source.toLowerCase().endsWith(".srt")) {
        const parsed = parseSrt({ input: await response.text() });
        setCaptions(parsed.captions);
      } else {
        const json: unknown = await response.json();
        const values = Array.isArray(json)
          ? json
          : (json as { captions?: unknown }).captions;

        if (!Array.isArray(values) || !values.every(isCaption)) {
          throw new Error("Файл субтитров не соответствует формату Caption[]");
        }

        setCaptions(values);
      }

      continueRender(handle);
    } catch (error) {
      cancelRender(error instanceof Error ? error : new Error(String(error)));
    }
  }, [cancelRender, continueRender, handle, source]);

  useEffect(() => {
    loadCaptions();
  }, [loadCaptions]);

  return captions;
};
