import { ALL_FORMATS, Input, UrlSource } from "mediabunny";
import { staticFile } from "remotion";

export const resolveMediaSource = (source: string) => {
  if (!source) {
    return "";
  }

  if (/^https?:\/\//i.test(source)) {
    return source;
  }

  return staticFile(source.replace(/^public[\\/]/, "").replace(/\\/g, "/"));
};

export const getVideoDuration = async (source: string) => {
  const input = new Input({
    formats: ALL_FORMATS,
    source: new UrlSource(resolveMediaSource(source), {
      getRetryDelay: () => null,
    }),
  });

  return input.computeDuration();
};
