# Setup and troubleshooting

## What the installer provides

- Windows 10/11 x64 or ARM64, or a Homebrew-supported macOS on Apple Silicon or Intel.
- Node.js 22 with npm.
- FFmpeg and FFprobe in `PATH`.
- Remotion dependencies and its local browser engine.
- Local Whisper.cpp and the Russian-capable `base` model.
- Several gigabytes of local space for dependencies, caches, sources, and renders.

The package installer is authorized to install these prerequisites because installing the complete factory is the user's explicit action. Do not add unrelated packages.

## Recovery

- `INSTALLATION.json` missing: rerun the platform installer from the package root.
- Windows says `winget` is missing: the installer automatically uses its official-download fallback.
- Windows installs a dependency but cannot see it: close PowerShell, open it again, and rerun `scripts/install.ps1`.
- macOS asks for a password or Command Line Tools: let the user complete the system prompt, then the installer continues.
- macOS says `brew` is not found after installation: start a new Terminal and rerun `bash ./scripts/install.sh`.
- Download interrupted: rerun the same installer. npm, Remotion, Homebrew, and Whisper reuse completed downloads where possible.
- `PROFILE.md` missing: run personal onboarding; do not use generic branding silently.
- Brief is not approved: stop and show the current production card.
- Whisper fails for one job: retain the recoverable job and allow an imported SRT or JSON captions file.
- Framing is wrong: fix props or composition and regenerate proof frames before another full render.
- FFmpeg decode fails: do not deliver the MP4; rerender or repair it first.

## Read-only checks

On either platform:

```text
node --version
npm --version
ffmpeg -version
ffprobe -version
```

The project report at `Documents/ReelsFactory/INSTALLATION.json` must contain `"status": "ready"`.
