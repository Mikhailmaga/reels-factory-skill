# Reel job brief

Use `PROFILE.md` as defaults, not as an excuse to skip job-specific intent. Ask only about missing values or deliberate overrides.

## Required job fields

1. Source footage and any moments that must remain or be removed.
2. Topic, one main idea, objective, and audience.
3. Platform, aspect ratio, target duration, and number of versions.
4. Opening hook and CTA. If absent, propose them after transcription without inventing claims.
5. Style and pace overrides from the profile.
6. Captions, picture treatment, B-roll, screenshots, transitions, and music.
7. Deliverables, deadline, must-keep details, and forbidden edits.

## BRIEF.md template

```markdown
---
brief_version: 1
approval_status: draft
approved_at:
job_id:
---

# ПРОИЗВОДСТВЕННАЯ КАРТОЧКА

Источник:
Тема:
Цель:
Аудитория:
Площадка / формат:
Длительность / версии:
Главная мысль / хук:
Стиль / темп:
Цвета / шрифты / бренд:
Монтаж и кадрирование:
Титры:
Звук / музыка:
CTA:
Результаты на выходе:
Обязательно сохранить:
Нельзя делать:
```

End the displayed card with: `Подтверди карточку или внеси правки. До подтверждения монтаж, расшифровку и рендер не начинаю.`

After approval, change only the YAML status and timestamp. Preserve the approved wording. If the content changes later, increment `brief_version`, reset the status to `draft`, and show the delta for approval.
