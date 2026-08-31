# Codex-first media routing

Use this ordered ladder for every visual or media need. Stop at the first level that can produce the approved result. Do not escalate because a higher level looks more fashionable.

## Capability ladder

1. **Source and approved local assets.** Reuse the user's footage, clean frame grabs, supplied images, logo, brand shapes, and previously approved job assets.
2. **Local construction.** Use transcript reasoning, FFmpeg, Remotion, CSS, SVG, gradients, masks, diagrams, text cards, kinetic typography, freeze frames, crop/reframe, parallax, Ken Burns motion, color treatment, sound cleanup, and local caption generation.
3. **Built-in Codex image generation.** If the current Codex session exposes the `imagegen` skill or image-generation tool, it may create or edit still images for a cover, background, insert, illustration, texture, product mockup, or static B-roll. It does not require asking the user for an API key, but availability and usage limits depend on the user's plan and workspace.
4. **Local animation of stills.** Turn approved stills into motion with controlled zoom, pan, depth, masks, overlays, transitions, and typography in Remotion. Do not describe this as generated video footage.
5. **External paid generation.** Only propose this when the production card requires genuinely new moving footage or another capability that levels 1–4 cannot provide. Follow `providers.md` and wait for separate approval.

If built-in image generation is absent or fails, return to levels 1–2. Never automatically continue to level 5.

## Built-in image generation procedure

1. Verify that image generation is actually available in the current Codex session. Never claim availability from the presence of this skill alone.
2. Use the approved production card to write a precise prompt. Preserve requested identity, palette, mood, framing, aspect ratio, negative constraints, and factual boundaries. Avoid generated text and logos unless the user explicitly requested them; add exact typography locally instead.
3. Generate the minimum useful number of stills. This uses the user's Codex allowance and is not described as free or unlimited.
4. Inspect the result visually. Reject identity drift, unreadable text, extra limbs, false product details, unwanted logos, unsafe content, or anything that contradicts the source.
5. Save or export the accepted result to an absolute local path inside `out/jobs/<job-id>/media/codex/`. If the interface does not expose a local file, tell the user exactly what must be saved; never invent a path or pretend that the asset is local.
6. Register the file before using it:

```text
node tools/register-media.mjs --source "/absolute/path/generated.png" --output "/absolute/path/job/media/codex/scene-01.png" --origin codex-imagegen --purpose "approved illustrative B-roll" --prompt-file "/absolute/path/job/media/codex/scene-01.prompt.txt" --model "gpt-image-2"
```

Use the exact model reported by the generation result. Omit `--model` when it is unknown; never guess it.

## Production-card routing block

Before approval, show this block even when no generated media is needed:

```text
Медиаплан Codex-first:
- Берём из исходника / локальных материалов:
- Codex делает локально:
- Codex генерирует встроенными возможностями:
- Внешний платный провайдер: не нужен / обоснование
- Что покинет компьютер:
- Дополнительные расходы: нет / точная оценка
```

“Codex делает локально” includes reasoning, edit decisions, captions, graphics, effects, and animation executed on the user's machine. “Codex генерирует” includes only a capability actually invoked in the current session. Keep the distinction factual.
