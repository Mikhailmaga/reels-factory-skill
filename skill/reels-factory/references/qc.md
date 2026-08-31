# Final quality control

The final command creates `QC-REPORT.json` and nine representative frames. A technically decodable MP4 is not enough; inspect both the report and every frame.

## Required checks

- H.264 MP4 decodes completely and has an audio stream when the source requires one.
- Dimensions and aspect match the approved platform, normally 1080×1920.
- Duration matches the approved card within a small encoding tolerance.
- No unexpected black frames, frozen sections, clipped speech, severe loudness error, or missing media.
- The subject is naturally framed throughout; no accidental circle, duplicated face, or abrupt focus jump.
- Hook, captions, labels, logo, B-roll, and CTA remain inside safe zones and do not cover the eyes or mouth.
- Text fits, uses the approved spelling, and stays readable on mobile.
- Music does not compete with speech and fades cleanly.
- CTA and claims exactly match the approved card.

## Acceptance

Do not report completion while the QC report has a failed technical check. Warnings require visual or audible review and a concise decision. If a defect is found, fix it and rerun proof or final as appropriate.

Return the absolute MP4 path, duration, dimensions, variant name, QC result, and any remaining warning. Never call an unreviewed output final.
