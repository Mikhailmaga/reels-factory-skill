# Source analysis and edit planning

Use the source inspection report, every extracted frame, and the verified transcript together. Do not choose moments from transcript wording alone when the visible action changes their meaning.

## Analysis output

Create `ANALYSIS.md` in the job folder with:

- source metadata and orientation;
- scene changes and usable visual sections;
- long silences, repetitions, filler words, false starts, and technical defects;
- strong factual statements with timestamps;
- transcript uncertainties, especially names, brands, numbers, and foreign words;
- subject position at representative timestamps;
- candidate clips that preserve a complete thought;
- risks: bad crop, covered face, illegible text, clipping, noise, black frames, or missing context.

## Selecting a cut

- Preserve semantic completeness. Do not stitch phrases into a claim the speaker did not make.
- Prefer a clear hook, context, useful payoff, and natural CTA over maximum jump-cut density.
- Keep a short breath around cuts unless the approved style requests aggressive pacing.
- Remove only approved filler, silence, errors, repeats, and off-topic material.
- Produce up to three variants only when they offer meaningfully different hooks or lengths.

Store the approved cut as a JSON array:

```json
[
  {"start": 4.2, "end": 14.8, "reason": "hook and problem"},
  {"start": 22.1, "end": 47.0, "reason": "method and payoff"}
]
```

## Dynamic framing

Use `focus-keyframes.json` when a static center crop would lose the subject. Coordinates are percentages inside the source frame; scale `1` means the normal cover/contain size.

```json
[
  {"at": 0, "x": 50, "y": 42, "scale": 1},
  {"at": 12.5, "x": 62, "y": 40, "scale": 1.08}
]
```

Inspect source frames before choosing values. Keep movement smooth and restrained. Never use a circular mask as a fallback for an uncertain crop.

## B-roll

Prefer supplied or local licensed files. B-roll JSON contains local paths and approved timing:

```json
[
  {"start": 8.0, "end": 11.5, "path": "/absolute/path/demo.mp4", "fit": "cover", "label": "product demonstration"}
]
```

Do not generate or download B-roll merely to fill every pause. It must clarify the spoken point or hide an approved cut.
