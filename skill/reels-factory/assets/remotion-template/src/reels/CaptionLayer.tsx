import {
  createTikTokStyleCaptions,
  type Caption,
  type TikTokPage,
} from "@remotion/captions";
import { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type CaptionStyle = "karaoke" | "boxed" | "minimal" | "kinetic";
type CaptionPosition = "bottom" | "center" | "top";

const CaptionPage: React.FC<{
  accentColor: string;
  bottomOffset: number;
  fontFamily: string;
  page: TikTokPage;
  position: CaptionPosition;
  styleMode: CaptionStyle;
  textColor: string;
}> = ({ accentColor, bottomOffset, fontFamily, page, position, styleMode, textColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const absoluteTimeMs = page.startMs + (frame / fps) * 1000;

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent:
          position === "top" ? "flex-start" : position === "center" ? "center" : "flex-end",
        padding:
          position === "top"
            ? "300px 84px 0"
            : position === "bottom"
              ? `0 84px ${bottomOffset}px`
              : "0 84px",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          backgroundColor:
            styleMode === "boxed" ? "rgba(7, 8, 12, 0.86)" : "transparent",
          border:
            styleMode === "boxed"
              ? `2px solid ${accentColor}55`
              : "2px solid transparent",
          borderRadius: 30,
          boxShadow:
            styleMode === "boxed"
              ? "0 18px 60px rgba(0,0,0,0.35)"
              : "none",
          color: textColor,
          fontFamily,
          fontSize: styleMode === "minimal" ? 60 : styleMode === "kinetic" ? 86 : 72,
          fontWeight: 900,
          letterSpacing: "-0.04em",
          lineHeight: 1.08,
          maxWidth: 920,
          padding: styleMode === "boxed" ? "22px 30px 26px" : 0,
          textAlign: "center",
          textShadow:
            styleMode === "minimal"
              ? "0 3px 18px rgba(0,0,0,0.95)"
              : "0 4px 0 rgba(0,0,0,0.95), 0 8px 28px rgba(0,0,0,0.8)",
          whiteSpace: "pre-wrap",
        }}
      >
        {page.tokens.map((token, index) => {
          const active =
            token.fromMs <= absoluteTimeMs && token.toMs > absoluteTimeMs;

          return (
            <span
              key={`${token.fromMs}-${index}`}
              style={{
                color:
                  active && styleMode !== "minimal" ? accentColor : textColor,
                display: "inline-block",
                opacity: active || styleMode !== "minimal" ? 1 : 0.82,
                scale:
                  active && styleMode === "kinetic"
                    ? 1.16
                    : active && styleMode === "karaoke"
                      ? 1.08
                      : 1,
                translate:
                  active && styleMode === "kinetic" ? "0px -10px" : "0px 0px",
              }}
            >
              {token.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const CaptionSequence: React.FC<{
  accentColor: string;
  bottomOffset: number;
  durationInFrames: number;
  fontFamily: string;
  page: TikTokPage;
  position: CaptionPosition;
  styleMode: CaptionStyle;
  textColor: string;
}> = ({
  accentColor,
  bottomOffset,
  durationInFrames,
  fontFamily,
  page,
  position,
  styleMode,
  textColor,
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        opacity: interpolate(
          frame,
          [0, 4, Math.max(5, durationInFrames - 4), durationInFrames],
          [0, 1, 1, 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          },
        ),
      }}
    >
      <CaptionPage
        accentColor={accentColor}
        bottomOffset={bottomOffset}
        fontFamily={fontFamily}
        page={page}
        position={position}
        styleMode={styleMode}
        textColor={textColor}
      />
    </AbsoluteFill>
  );
};

export const CaptionLayer: React.FC<{
  accentColor: string;
  bottomOffset: number;
  captions: Caption[];
  fontFamily: string;
  position: CaptionPosition;
  styleMode: CaptionStyle;
  textColor: string;
}> = ({
  accentColor,
  bottomOffset,
  captions,
  fontFamily,
  position,
  styleMode,
  textColor,
}) => {
  const { fps } = useVideoConfig();
  const { pages } = useMemo(
    () =>
      createTikTokStyleCaptions({
        captions,
        combineTokensWithinMilliseconds: 1050,
      }),
    [captions],
  );

  return (
    <AbsoluteFill>
      {pages.map((page, index) => {
        const nextPage = pages[index + 1] ?? null;
        const startFrame = Math.floor((page.startMs / 1000) * fps);
        const endFrame = Math.ceil(
          Math.min(
            nextPage ? (nextPage.startMs / 1000) * fps : Infinity,
            startFrame + (1050 / 1000) * fps,
          ),
        );
        const durationInFrames = endFrame - startFrame;

        if (durationInFrames <= 0) {
          return null;
        }

        return (
          <Sequence
            key={`${page.startMs}-${index}`}
            from={startFrame}
            durationInFrames={durationInFrames}
            name={`Субтитры ${index + 1}`}
          >
            <CaptionSequence
              accentColor={accentColor}
              bottomOffset={bottomOffset}
              durationInFrames={durationInFrames}
              fontFamily={fontFamily}
              page={page}
              position={position}
              styleMode={styleMode}
              textColor={textColor}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
