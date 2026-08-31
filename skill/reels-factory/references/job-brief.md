# Reel intake and production card

Use `PROFILE.md` as defaults. Before requesting the video, ask one compact message containing only missing answers from this intake:

1. Platform and target duration.
2. Objective, audience, and the one idea the viewer should remember.
3. Moments or wording that must remain or be removed.
4. Use the saved style or apply a job-specific change.
5. CTA or “without CTA”.
6. Number of versions and deadline, if relevant.
7. Attach the video or provide its exact local path.

If the user says “choose it yourself”, propose a treatment based on the profile and source; do not invent factual claims.

## Required production facts after preflight

- exact source and verified duration;
- transcript path and uncertain words requiring review;
- selected timestamps and resulting target duration;
- excluded pauses, repetitions, mistakes, or off-topic material;
- selected hook and any alternate variants;
- frame treatment and subject focus path;
- captions, overlays, B-roll, transitions, audio cleanup, music and ducking;
- CTA, deliverables, must-keep details, forbidden edits;
- Codex-first media routing: source/local reuse, local Codex construction, built-in Codex generation, and whether an external provider is genuinely unavoidable;
- what leaves the computer, expected additional cost, provider, and paid-generation approval status, if any.

## BRIEF.md template

```markdown
---
brief_version: 2
approval_status: draft
approved_at:
factory_version: 3
job_id:
---

# ПРОИЗВОДСТВЕННАЯ КАРТОЧКА REELS 3

Источник / длительность:
Площадка / формат:
Цель / аудитория:
Главная мысль:
Целевая длительность / версии:
Выбранные фрагменты:
Что исключаем:
Хук основной / альтернативы:
Стиль / темп:
Цвета / шрифты / бренд:
Кадрирование / движение фокуса:
Титры / плашки:
B-roll / переходы:
Очистка голоса / музыка / ducking / SFX:
CTA:
Результаты на выходе:
Обязательно сохранить:
Нельзя делать:
Медиаплан — исходник / локальные материалы:
Медиаплан — Codex делает локально:
Медиаплан — Codex генерирует встроенными возможностями:
Внешний платный провайдер / обоснование:
Что покинет компьютер / дополнительные расходы:
```

End with: `Подтверди карточку или внеси правки. До подтверждения монтаж, генерацию, очистку и рендер не запускаю.`

After approval, change only YAML status and timestamp. If content later changes, increment `brief_version`, reset it to `draft`, show the delta, and wait for approval.
