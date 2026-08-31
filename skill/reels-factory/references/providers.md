# Last-resort external providers

The factory must remain fully usable without API keys. External providers are not part of the default pipeline. They add genuinely new generated video or another capability that the local engine and built-in Codex capabilities cannot supply.

Before opening this file, exhaust levels 1–4 in `codex-first.md`. A missing Codex image-generation capability is not sufficient reason to use a provider: local graphics and source media remain the fallback.

## Provider rules

1. Verify the provider's current official documentation, model ID, pricing, rights, and input limits before use.
2. Explain what will leave the computer.
3. Show the provider, model, prompt/input, expected number of generations, and expected cost when it can be determined.
4. Obtain explicit approval for that exact paid generation.
5. Read credentials only from environment variables. Never ask the user to paste a secret into chat, write it to `PROFILE.md` or `BRIEF.md`, commit it, or echo it.
6. Save downloaded outputs locally and register them with `tools/register-media.mjs`: origin `external-provider`, provider/model in the purpose or model field, request ID when available, and prompt file. Never store the credential or a temporary signed source URL in provenance.

## fal.ai adapter

- Environment variable: `FAL_KEY`.
- The adapter must be invoked with `--approved-paid-generation` after approval.
- Use an official `fal-ai/*` endpoint and an input JSON file.
- Treat the returned URL as temporary: download the result into the current job folder.

Example after approval:

```text
node tools/generate-fal-media.mjs --model "fal-ai/approved-model" --input "/absolute/path/input.json" --output "/absolute/path/job/broll/generated.mp4" --purpose "approved moving B-roll" --approved-paid-generation
```

If the key is missing, report only `FAL_KEY: not configured`. Do not print its value.
