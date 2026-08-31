---
name: reels-factory
description: Configure a personal brand profile and turn local footage into a finished vertical Reel through a mandatory brief, explicit approval, transcription, edit planning, proof frames, rendering, and QC on Windows or macOS. Use when the user wants a reusable personal Reel workflow or asks to produce a Reel from supplied footage. Do not use for automatic publishing or unrelated long-form editing.
---

# Reels Factory

Create a finished local vertical MP4 while preventing expensive work before the user approves the direction. Keep each person's branding and files local.

## State and project

The default working project is `Documents/ReelsFactory` inside the current user's home directory. A user may choose another absolute folder during onboarding. The approved personal settings live in `PROFILE.md` at that project root; each job lives under `out/jobs/<job-id>`.

Never assume another person's name, colors, logo, offer, CTA, or paths. Do not reuse values from examples or prior users.

## Installed runtime

The distributed installer must create `<project-root>/INSTALLATION.json` with `status: ready`. It installs Node.js, FFmpeg/FFprobe, the Remotion project, its browser engine, and local Whisper before the skill is used.

If that report is missing or not ready, explain that the local video set is incomplete and run the matching package installer:

- Windows: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install.ps1`
- macOS: `bash scripts/install.sh`

Tell the user before an installer action. The operating system may request administrator permission, the Mac password, or Command Line Tools confirmation. Stop on installation failure; do not pretend the factory is ready.

## First run

If `PROFILE.md` does not exist:

1. Read [references/onboarding.md](references/onboarding.md).
2. Ask one compact numbered questionnaire containing only missing profile fields.
3. Present the personal profile card and stop for explicit approval.
4. After approval, write the approved settings to `<project-root>/PROFILE.md`. Preserve supplied names and copy verbatim.

On later runs, read `PROFILE.md` and ask only about job-specific differences. If the user asks to reconfigure the factory, update the profile only after showing the changed profile card and obtaining approval.

## Every Reel

### Phase A: brief and approval

1. Resolve the exact local footage path. If it is missing or unreadable, ask for the file.
2. Run `node scripts/inspect-source.mjs` for metadata and representative frames. This is allowed before approval. Do not run full transcription, asset generation, editing, or rendering yet.
3. Read [references/job-brief.md](references/job-brief.md). Combine the source facts, `PROFILE.md`, and the current request. Ask one compact set of questions only for missing or overridden values.
4. Create `out/jobs/<job-id>/BRIEF.md` with `approval_status: draft`, show the production card, and stop.
5. When the user clearly approves the current card, change it to `approval_status: approved` and add the approval timestamp. Any material change to topic, platform, duration, creative direction, or CTA resets the status to `draft` until the changed card is approved.

### Phase B: production

1. Read the approved brief and source. If cuts are needed, create a segment JSON file and use `node scripts/build-cut.mjs`. Transcribe the final selected footage, not discarded material.
2. Derive overlays only from the approved copy, verified transcript, and visible source. Do not invent names, claims, offers, results, links, or CTA destinations.
3. Run `node scripts/run-reel.mjs proof` with the profile and approved parameters. It prepares media, captions, props, and three proof frames without a full render.
4. Inspect every proof frame. Check subject position, cropping, logo, contrast, text overflow, captions, CTA, and platform-safe zones. Fix defects without changing the approved direction.
5. Run `node scripts/run-reel.mjs final`. It renders the MP4, performs a full decode check, and extracts final QC frames.
6. Inspect the final QC frames and return the local MP4 path, duration, dimensions, and a concise production summary.

## Command patterns

Use absolute paths. The same Node commands work in PowerShell, Terminal, and Codex shell.

Inspect source before the brief:

```text
node scripts/inspect-source.mjs --video "/absolute/path/source.mp4" --output "/absolute/path/job/inspection"
```

Build an approved cut:

```text
node scripts/build-cut.mjs --video "/absolute/path/source.mp4" --segments "/absolute/path/segments.json" --output "/absolute/path/selected.mp4"
```

Prepare proof frames after approval:

```text
node scripts/run-reel.mjs proof --project "/absolute/path/ReelsFactory" --job "expert-tip-001" --brief "/absolute/path/ReelsFactory/out/jobs/expert-tip-001/BRIEF.md" --video "/absolute/path/source.mp4"
```

Render only after proof inspection:

```text
node scripts/run-reel.mjs final --project "/absolute/path/ReelsFactory" --job "expert-tip-001" --brief "/absolute/path/ReelsFactory/out/jobs/expert-tip-001/BRIEF.md"
```

Optional proof flags include `--captions`, `--music`, `--logo`, `--headline`, `--cta`, `--accent-color`, `--caption-style`, `--video-fit`, `--blurred-backdrop`, and `--skip-transcription`.

## Boundaries

- Work locally by default. Never upload, publish, post, message, or replace a cloud file without a separate explicit request.
- Never skip the approved brief or proof-frame inspection, including when the request says only “сделай красиво”. That request allows proposing a treatment, not starting production.
- Proofread captions, especially names, brands, numbers, and foreign terms.
- Keep source footage and personal brand assets out of the skill folder. Store them only in the user's chosen project or job folder.
- Do not expose paths, profile details, or footage belonging to another user.
- Support Windows 10/11 x64 or ARM64 and current supported macOS on Apple Silicon or Intel. Do not claim a platform was physically tested when it was only syntax-checked.
