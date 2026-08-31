import type { CalculateMetadataFunction } from "remotion";
import { Audio, Video } from "@remotion/media";
import { zColor } from "@remotion/zod-types";
import { z } from "zod";
import {
  AbsoluteFill,
  Easing,
  Img,
  Interactive,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CaptionLayer } from "./CaptionLayer";
import { getVideoDuration, resolveMediaSource } from "./media";
import { useCaptions } from "./use-captions";

export const reelsUnderKeySchema = z.object({
  videoSource: z.string(),
  captionsSource: z.string(),
  musicSource: z.string(),
  logoSource: z.string(),
  eyebrow: z.string(),
  author: z.string(),
  headline: z.string(),
  callout: z.string(),
  cta: z.string(),
  ctaHint: z.string(),
  accentColor: zColor(),
  backgroundColor: zColor(),
  textColor: zColor(),
  fontFamily: z.string(),
  hookStyle: z.enum(["card", "minimal", "kinetic"]),
  captionStyle: z.enum(["karaoke", "boxed", "minimal", "kinetic"]),
  captionBottom: z.number().min(80).max(900),
  captionPosition: z.enum(["bottom", "center", "top"]),
  videoFit: z.enum(["cover", "contain"]),
  blurredBackdrop: z.boolean().default(false),
  focusKeyframes: z
    .array(
      z.object({
        at: z.number().min(0),
        x: z.number().min(0).max(100),
        y: z.number().min(0).max(100),
        scale: z.number().min(0.8).max(2.5),
      }),
    )
    .default([]),
  broll: z
    .array(
      z.object({
        source: z.string(),
        start: z.number().min(0),
        end: z.number().min(0),
        fit: z.enum(["cover", "contain"]),
        kind: z.enum(["video", "image"]),
        label: z.string(),
      }),
    )
    .default([]),
  highlights: z
    .array(
      z.object({
        start: z.number().min(0),
        end: z.number().min(0),
        text: z.string(),
      }),
    )
    .default([]),
  sourceVolume: z.number().min(0).max(1),
  musicVolume: z.number().min(0).max(1),
  musicDuck: z.boolean(),
  musicDuckVolume: z.number().min(0).max(1),
  coverAt: z.number().min(0),
  showCaptions: z.boolean(),
  showProgress: z.boolean(),
  showSafeArea: z.boolean(),
});

export type ReelsUnderKeyProps = z.infer<typeof reelsUnderKeySchema>;

export const calculateReelMetadata: CalculateMetadataFunction<
  ReelsUnderKeyProps
> = async ({ props }) => {
  try {
    const durationInSeconds = await getVideoDuration(props.videoSource);
    return {
      durationInFrames: Math.max(90, Math.ceil(durationInSeconds * 30)),
      defaultOutName: "reel-ready.mp4",
    };
  } catch {
    return {
      durationInFrames: 240,
      defaultOutName: "reel-ready.mp4",
    };
  }
};

const HookCard: React.FC<{
  accentColor: string;
  durationInFrames: number;
  headline: string;
  hookStyle: "card" | "minimal" | "kinetic";
  textColor: string;
}> = ({ accentColor, durationInFrames, headline, hookStyle, textColor }) => {
  const frame = useCurrentFrame();

  return (
    <Interactive.Div
      name="Главный заголовок"
      style={{
        position: "absolute",
        left: 80,
        right: 80,
        top: hookStyle === "minimal" ? 250 : 280,
        backgroundColor:
          hookStyle === "card" ? "rgba(8,9,14,0.86)" : "rgba(8,9,14,0.34)",
        border: hookStyle === "card" ? `3px solid ${accentColor}` : "3px solid transparent",
        borderRadius: hookStyle === "kinetic" ? 0 : 34,
        boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
        color: textColor,
        fontSize: headline.length > 55 ? 58 : headline.length > 32 ? 70 : 84,
        fontWeight: 900,
        letterSpacing: "-0.055em",
        lineHeight: 0.98,
        padding: hookStyle === "minimal" ? "18px 20px 24px" : "34px 38px 42px",
        opacity: interpolate(
          frame,
          [
            0,
            10,
            Math.max(11, durationInFrames - 14),
            durationInFrames,
          ],
          [0, 1, 1, 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          },
        ),
        translate: interpolate(frame, [0, 14], ["0px 48px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
        scale: interpolate(frame, [0, 14], [hookStyle === "kinetic" ? 0.78 : 0.96, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          output: "perceptual-scale",
        }),
        rotate: interpolate(frame, [0, 14], [hookStyle === "kinetic" ? "-3deg" : "0deg", "0deg"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      }}
    >
      {headline}
    </Interactive.Div>
  );
};

const CalloutCard: React.FC<{
  accentColor: string;
  callout: string;
  durationInFrames: number;
}> = ({ accentColor, callout, durationInFrames }) => {
  const frame = useCurrentFrame();

  return (
    <Interactive.Div
      name="Текст подсказки"
      style={{
        position: "absolute",
        left: 96,
        right: 96,
        top: 360,
        backgroundColor: accentColor,
        borderRadius: 28,
        color: "#090A0F",
        fontSize: 48,
        fontWeight: 900,
        lineHeight: 1.05,
        padding: "25px 30px 30px",
        textAlign: "center",
        opacity: interpolate(
          frame,
          [0, 8, Math.max(9, durationInFrames - 10), durationInFrames],
          [0, 1, 1, 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          },
        ),
        scale: interpolate(frame, [0, 10], [0.92, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          output: "perceptual-scale",
        }),
      }}
    >
      {callout}
    </Interactive.Div>
  );
};

const HighlightCard: React.FC<{
  accentColor: string;
  durationInFrames: number;
  text: string;
  textColor: string;
}> = ({ accentColor, durationInFrames, text, textColor }) => {
  const frame = useCurrentFrame();

  return (
    <Interactive.Div
      name="Ключевая мысль"
      style={{
        position: "absolute",
        left: 80,
        right: 80,
        top: 270,
        backgroundColor: "rgba(7, 8, 12, 0.9)",
        border: `2px solid ${accentColor}88`,
        borderLeft: `8px solid ${accentColor}`,
        borderRadius: 26,
        boxShadow: "0 18px 60px rgba(0,0,0,0.32)",
        color: textColor,
        fontSize: 48,
        fontWeight: 900,
        letterSpacing: "-0.035em",
        lineHeight: 1.04,
        padding: "22px 30px 27px",
        textAlign: "center",
        opacity: interpolate(
          frame,
          [0, 8, Math.max(9, durationInFrames - 8), durationInFrames],
          [0, 1, 1, 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          },
        ),
        translate: interpolate(frame, [0, 10], ["0px 30px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      }}
    >
      {text}
    </Interactive.Div>
  );
};

const CtaCard: React.FC<{
  accentColor: string;
  cta: string;
  ctaHint: string;
  textColor: string;
}> = ({ accentColor, cta, ctaHint, textColor }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "rgba(7,8,12,0.88)",
        justifyContent: "flex-end",
        padding: "0 80px 330px",
        opacity: interpolate(frame, [0, 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    >
      <Interactive.Div
        name="CTA"
        style={{
          borderLeft: `8px solid ${accentColor}`,
          borderRadius: 26,
          backgroundColor: "rgba(255,255,255,0.07)",
          padding: "34px 38px 40px",
          translate: interpolate(frame, [0, 16], ["0px 60px", "0px 0px"], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        <div
          style={{
            color: accentColor,
            fontSize: 34,
            fontWeight: 900,
            letterSpacing: "0.07em",
            marginBottom: 14,
            textTransform: "uppercase",
          }}
        >
          {ctaHint}
        </div>
        <div
          style={{
            color: textColor,
            fontSize: 70,
            fontWeight: 900,
            letterSpacing: "-0.05em",
            lineHeight: 1,
          }}
        >
          {cta}
        </div>
      </Interactive.Div>
    </AbsoluteFill>
  );
};

const valueAtTime = (
  keyframes: ReelsUnderKeyProps["focusKeyframes"],
  time: number,
  field: "x" | "y" | "scale",
  fallback: number,
) => {
  if (keyframes.length === 0) return fallback;
  if (keyframes.length === 1) return keyframes[0][field];
  return interpolate(
    time,
    keyframes.map((item) => item.at),
    keyframes.map((item) => item[field]),
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
};

const BrollItem: React.FC<{
  durationInFrames: number;
  item: ReelsUnderKeyProps["broll"][number];
}> = ({ durationInFrames, item }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, Math.min(8, durationInFrames / 3), Math.max(9, durationInFrames - 8), durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const style = {
    position: "absolute" as const,
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: item.fit,
    opacity,
  };

  return item.kind === "image" ? (
    <Img name={item.label || "B-roll image"} src={resolveMediaSource(item.source)} style={style} />
  ) : (
    <Video
      name={item.label || "B-roll video"}
      src={resolveMediaSource(item.source)}
      volume={0}
      style={style}
    />
  );
};

const BrollLayer: React.FC<{ broll: ReelsUnderKeyProps["broll"] }> = ({ broll }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      {broll.map((item, index) => {
        const startFrame = Math.max(0, Math.floor(item.start * fps));
        const durationInFrames = Math.max(1, Math.ceil((item.end - item.start) * fps));
        return (
          <Sequence
            key={`${item.source}-${index}`}
            from={startFrame}
            durationInFrames={durationInFrames}
            name={item.label || `B-roll ${index + 1}`}
          >
            <BrollItem durationInFrames={durationInFrames} item={item} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const ReelsUnderKey: React.FC<ReelsUnderKeyProps> = ({
  videoSource,
  captionsSource,
  musicSource,
  logoSource,
  eyebrow,
  author,
  headline,
  callout,
  cta,
  ctaHint,
  accentColor,
  backgroundColor,
  textColor,
  fontFamily,
  hookStyle,
  captionStyle,
  captionBottom,
  captionPosition,
  videoFit,
  blurredBackdrop,
  focusKeyframes,
  broll,
  highlights,
  sourceVolume,
  musicVolume,
  musicDuck,
  musicDuckVolume,
  showCaptions,
  showProgress,
  showSafeArea,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const captions = useCaptions(showCaptions ? captionsSource : "");
  const hookDuration = Math.min(88, durationInFrames);
  const ctaDuration = Math.min(75, Math.floor(durationInFrames * 0.18));
  const ctaStart = Math.max(0, durationInFrames - ctaDuration);
  const calloutStart = Math.floor(durationInFrames * 0.48);
  const calloutDuration = Math.min(72, Math.floor(durationInFrames * 0.24));
  const focusTime = frame / fps;
  const focusX = valueAtTime(focusKeyframes, focusTime, "x", 50);
  const focusY = valueAtTime(focusKeyframes, focusTime, "y", 50);
  const focusScale = valueAtTime(focusKeyframes, focusTime, "scale", 1);

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        color: textColor,
        fontFamily,
        overflow: "hidden",
      }}
    >
      {blurredBackdrop ? (
        <Video
          name="Размытый фон"
          src={resolveMediaSource(videoSource)}
          objectFit="cover"
          volume={0}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            filter: "blur(34px) brightness(0.48) saturate(1.1)",
            scale: 1.18,
          }}
        />
      ) : null}

      <Video
        name="Исходное видео"
        src={resolveMediaSource(videoSource)}
        objectFit={videoFit}
        volume={sourceVolume}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectPosition: `${focusX}% ${focusY}%`,
          transformOrigin: `${focusX}% ${focusY}%`,
          scale: focusScale,
        }}
      />

      {broll.length ? <BrollLayer broll={broll} /> : null}

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(4,5,9,0.72) 0%, rgba(4,5,9,0.02) 28%, rgba(4,5,9,0.05) 58%, rgba(4,5,9,0.78) 100%)",
        }}
      />

      {logoSource || eyebrow || author ? (
        <div
          style={{
            position: "absolute",
            left: 80,
            right: 80,
            top: 104,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            opacity: interpolate(frame, [0, 10], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          {logoSource ? (
            <Img
              name="Логотип"
              src={resolveMediaSource(logoSource)}
              style={{
                height: 72,
                maxWidth: 260,
                objectFit: "contain",
                objectPosition: "left center",
              }}
            />
          ) : eyebrow ? (
            <div
              style={{
                backgroundColor: accentColor,
                borderRadius: 999,
                color: "#090A0F",
                fontSize: 30,
                fontWeight: 900,
                letterSpacing: "0.08em",
                padding: "14px 22px",
              }}
            >
              {eyebrow}
            </div>
          ) : null}
          {author ? (
            <div
              style={{
                fontSize: 30,
                fontWeight: 700,
                textShadow: "0 2px 14px rgba(0,0,0,0.8)",
              }}
            >
              {author}
            </div>
          ) : null}
        </div>
      ) : null}

      {headline ? (
        <Sequence durationInFrames={hookDuration} name="Хук">
          <HookCard
            accentColor={accentColor}
            durationInFrames={hookDuration}
            headline={headline}
            hookStyle={hookStyle}
            textColor={textColor}
          />
        </Sequence>
      ) : null}

      {callout ? (
        <Sequence
          from={calloutStart}
          durationInFrames={calloutDuration}
          name="Плашка-подсказка"
        >
          <CalloutCard
            accentColor={accentColor}
            callout={callout}
            durationInFrames={calloutDuration}
          />
        </Sequence>
      ) : null}

      {highlights.map((highlight, index) => {
        const startFrame = Math.max(0, Math.floor(highlight.start * fps));
        const endFrame = Math.min(
          durationInFrames,
          Math.ceil(highlight.end * fps),
        );
        const highlightDuration = endFrame - startFrame;

        if (!highlight.text || highlightDuration <= 0) {
          return null;
        }

        return (
          <Sequence
            key={`${highlight.start}-${highlight.end}-${index}`}
            from={startFrame}
            durationInFrames={highlightDuration}
            name={`Ключевая мысль ${index + 1}`}
          >
            <HighlightCard
              accentColor={accentColor}
              durationInFrames={highlightDuration}
              text={highlight.text}
              textColor={textColor}
            />
          </Sequence>
        );
      })}

      {showCaptions && captions ? (
        <Sequence durationInFrames={cta ? ctaStart : durationInFrames} name="Субтитры">
          <CaptionLayer
            accentColor={accentColor}
            bottomOffset={captionBottom}
            captions={captions}
            fontFamily={fontFamily}
            position={captionPosition}
            styleMode={captionStyle}
            textColor={textColor}
          />
        </Sequence>
      ) : null}

      {cta ? (
        <Sequence
          from={ctaStart}
          durationInFrames={ctaDuration}
          name="Финальный CTA"
        >
          <CtaCard
            accentColor={accentColor}
            cta={cta}
            ctaHint={ctaHint}
            textColor={textColor}
          />
        </Sequence>
      ) : null}

      {musicSource ? (
        <Audio
          name="Фоновая музыка"
          src={resolveMediaSource(musicSource)}
          loop
          volume={(audioFrame) => {
            const timeMs = (audioFrame / fps) * 1000;
            const speechActive = Boolean(
              captions?.some(
                (caption) => caption.startMs <= timeMs && caption.endMs > timeMs,
              ),
            );
            const target = musicDuck && speechActive ? musicDuckVolume : musicVolume;
            return interpolate(
              audioFrame,
              [0, fps, durationInFrames - fps, durationInFrames],
              [0, target, target, 0],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              },
            );
          }}
        />
      ) : null}

      {showProgress ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            height: 14,
            width: `${interpolate(
              frame,
              [0, durationInFrames - 1],
              [0, 100],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              },
            )}%`,
            backgroundColor: accentColor,
            boxShadow: `0 0 30px ${accentColor}`,
          }}
        />
      ) : null}

      {showSafeArea ? (
        <div
          style={{
            position: "absolute",
            inset: "100px 80px",
            border: "3px dashed rgba(255,255,255,0.55)",
            borderRadius: 24,
            pointerEvents: "none",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};
