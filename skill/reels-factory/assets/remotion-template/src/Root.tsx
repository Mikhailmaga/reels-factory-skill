import "./index.css";
import { Composition } from "remotion";
import {
  calculateReelMetadata,
  ReelsUnderKey,
  reelsUnderKeySchema,
} from "./reels/ReelsUnderKey";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="ReelsUnderKey"
      component={ReelsUnderKey}
      durationInFrames={240}
      fps={30}
      width={1080}
      height={1920}
      schema={reelsUnderKeySchema}
      calculateMetadata={calculateReelMetadata}
      defaultProps={{
        videoSource: "media/video/source.mp4",
        captionsSource: "media/captions/captions.json",
        musicSource: "",
        logoSource: "",
        eyebrow: "",
        author: "",
        headline: "",
        callout: "",
        cta: "",
        ctaHint: "Дальше",
        accentColor: "#7C3AED",
        backgroundColor: "#0B1020",
        textColor: "#FFFFFF",
        fontFamily: "Arial, Helvetica, sans-serif",
        captionStyle: "karaoke",
        captionBottom: 430,
        videoFit: "cover",
        blurredBackdrop: false,
        highlights: [],
        sourceVolume: 1,
        musicVolume: 0.12,
        showCaptions: true,
        showProgress: true,
        showSafeArea: false,
      }}
    />
  );
};
