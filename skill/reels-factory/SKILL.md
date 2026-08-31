---
name: reels-factory
description: Build branded vertical Reels from local footage with a one-time personal profile, a short pre-upload intake, transcript-and-visual analysis, approved edit plan, Codex-first media creation, dynamic reframing, captions, audio cleanup, optional B-roll, proof renders, and QC on Windows or macOS. Use for reusable Reel production or a finished short-form video; do not use for automatic publishing or unrelated long-form editing.
metadata:
  short-description: Codex-first local Reel production with approval gates
---

# Reels Factory 3.1.1

Produce a finished vertical MP4 without guessing the user's brand or spending money before approval. Use local tools and built-in Codex capabilities first. External paid providers are a last-resort adapter, never an automatic fallback.

## State

The default project is `Documents/ReelsFactory` inside the current user's home directory. The approved profile is `<project-root>/PROFILE.md`. Jobs live under `<project-root>/out/jobs/<job-id>`.

Never assume a name, brand, offer, CTA, colors, logo, or source path. Never reuse another person's profile or assets.

## Runtime check and commands

The installer must create `<project-root>/INSTALLATION.json` with `status: ready`, `factoryVersion: 3`, and `factoryRelease: 3.1.1`. At the beginning of a setup, production, or diagnostic request, run:

```text
node scripts/doctor.mjs --project "/absolute/path/ReelsFactory"
```

If the report is missing or the doctor is not ready, tell the user and run the matching installer only after announcing the installation action:

- Windows: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install.ps1`
- macOS: `bash scripts/install.sh`

Recognize these natural-language operations:

- `настрой фабрику` — create the first profile;
- `покажи профиль` — display it without editing;
- `измени профиль` — show a delta and obtain approval before saving;
- `проверь установку` — run the doctor and explain failures;
- `сделай Reels` — start a new job;
- `продолжи <job-id>` — resume from its recorded status.

Do not delete or reset a profile. If the user explicitly requests a reset, preserve a timestamped backup and obtain confirmation immediately before replacing it.

## One-time profile

If `PROFILE.md` is absent, read [references/onboarding.md](references/onboarding.md). Ask one compact grouped questionnaire, show the completed profile card, and stop for approval. Save it only after approval.

On later jobs, use the profile as defaults. Ask about colors, captions, logo, voice, or CTA again only when the user requests a change or the job clearly needs an override.

## Every Reel

### 1. Intake before analysis

Read [references/job-brief.md](references/job-brief.md). Before inspecting or transcribing footage, ask one short message containing only missing job fields and ask the user to attach or identify the local video in the same reply. If the user already supplied both answers and a readable file, continue without repeating questions.

### 2. Local preflight

After footage is supplied, local metadata, frame extraction, scene detection, loudness measurement, silence detection, and local transcription are allowed. They do not alter the source or incur cloud costs.

```text
node scripts/inspect-source.mjs --video "/absolute/path/source.mp4" --output "/absolute/path/job/inspection"
node "/absolute/path/ReelsFactory/tools/transcribe-reel.mjs" "/absolute/path/source.mp4" "/absolute/path/job/captions.json"
```

Read [references/analysis-production.md](references/analysis-production.md). Inspect all representative frames and the verified transcript. Build a factual edit plan with selected timestamps, rejected material, framing keyframes, caption treatment, audio treatment, local B-roll, and up to three hook variants when useful.

### 3. Production card and approval

Create `out/jobs/<job-id>/BRIEF.md` with `approval_status: draft`. Show the production card, including the proposed cut and variants, then stop. No cutting, cleanup, generated assets, proof render, or final render is allowed before approval.

When the user approves, set `approval_status: approved` and add the timestamp. A material change to objective, source, selected moments, platform, duration, creative direction, paid provider, or CTA resets it to `draft` until the changed card is approved.

### 4. Production

1. Build the approved cut with `scripts/build-cut.mjs` when cuts are needed.
2. Derive text only from the approved copy, verified transcript, and visible source. Do not invent claims, names, results, links, offers, or CTA destinations.
3. Read [references/codex-first.md](references/codex-first.md) and prepare every required visual through its ordered capability ladder. Reuse footage and local assets first; create local Remotion/FFmpeg graphics next; use built-in Codex image generation only when it materially improves the approved plan and is actually available.
4. Register every created or imported media asset with `tools/register-media.mjs`. Keep the local file and its provenance sidecar in the current job folder.
5. If the approved result genuinely requires new moving footage that local animation and Codex-created stills cannot provide, follow [references/providers.md](references/providers.md). Never jump to a paid provider merely because built-in image generation is unavailable. Never expose or store keys in the repository, profile, brief, command output, or logs.
6. Run `scripts/run-reel.mjs proof` with the approved treatment. Use focus keyframes for subject placement; do not introduce circular crops unless the approved card explicitly requests one.
7. Inspect every proof frame for the subject, crop, text fit, captions, logo, contrast, B-roll, CTA, and platform-safe zones. Fix defects without changing the approved direction.
8. Run `scripts/run-reel.mjs final`, then inspect the machine QC report and all final QC frames.

Read [references/qc.md](references/qc.md) before accepting a final result.

## Core commands

Use absolute paths. JSON options accept either an absolute JSON path or inline JSON.

```text
node scripts/build-cut.mjs --video "/absolute/path/source.mp4" --segments "/absolute/path/segments.json" --output "/absolute/path/selected.mp4"

node scripts/run-reel.mjs proof --project "/absolute/path/ReelsFactory" --job "job-001" --brief "/absolute/path/ReelsFactory/out/jobs/job-001/BRIEF.md" --video "/absolute/path/selected.mp4" --focus-keyframes "/absolute/path/focus.json" --broll "/absolute/path/broll.json" --audio-cleanup voice

node scripts/run-reel.mjs final --project "/absolute/path/ReelsFactory" --job "job-001" --brief "/absolute/path/ReelsFactory/out/jobs/job-001/BRIEF.md"
```

Useful proof options include `--captions`, `--music`, `--logo`, `--headline`, `--hook-style`, `--cta`, `--accent-color`, `--caption-style`, `--caption-position`, `--cover-at`, `--video-fit`, `--blurred-backdrop`, `--focus-keyframes`, `--broll`, `--audio-cleanup`, `--music-duck`, and `--skip-transcription`.

## Boundaries

- Work locally by default. Never upload, publish, post, message, schedule, or replace a cloud file without a separate explicit request.
- Treat built-in Codex image generation as an optional Codex capability, not as free or unlimited. It may count against the user's Codex usage and may be unavailable for the current plan or workspace. If unavailable, keep working with local graphics and source media.
- Do not use an OpenAI API key as a silent substitute for built-in Codex image generation. API usage is a separate paid external action and needs the same disclosure and explicit approval as any other provider.
- Never start paid generation from a vague request such as “сделай красиво”. Present the provider, model, input, and expected cost when available, then obtain explicit approval for that generation.
- Preserve source footage. Write only inside the chosen project/job folder and approved output paths.
- Proofread captions, especially names, brands, numbers, and foreign terms.
- Support Windows 10/11 x64 or ARM64 and macOS 15 or newer on Apple Silicon or supported Intel hardware. Do not claim physical testing that did not occur.
- If a provider, model, or platform behavior may have changed, verify its current official documentation before using it.
