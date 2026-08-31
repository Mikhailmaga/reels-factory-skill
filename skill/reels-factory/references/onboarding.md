# Personal onboarding

Ask only for values that are not already supplied. Keep the questionnaire in one message and offer a recommended default when the user is unsure.

## Profile fields

1. Name or brand shown in the Reel.
2. Niche, main audience, and typical Reel objective.
3. Default platforms: Instagram Reels, VK Clips, YouTube Shorts, Telegram, or several.
4. Default duration or range.
5. Creative direction and pacing: expert, dynamic, minimal, premium, documentary, calm, humorous, or a reference.
6. Accent, background, and text colors. Accept HEX values, screenshots, or a brand reference.
7. Font family available on the computer; default to Arial if unknown.
8. Logo path, optional eyebrow label, and author label.
9. Caption mode: karaoke, boxed, or minimal; language; emoji policy; highlighting; approximate bottom position.
10. Video fit: cover or contain; whether a blurred backdrop is allowed.
11. Voice cleanup, music mood, music level, and sound-effect preference.
12. Common CTA and CTA label. “No default CTA” is valid.
13. Default deliverables: MP4, cover, captions file, clean version, alternate hook.
14. Chosen local project folder and privacy constraints.

## Profile card

```text
ЛИЧНЫЙ ПРОФИЛЬ ФАБРИКИ REELS
Имя / бренд:
Ниша / аудитория:
Основная цель:
Площадки:
Длительность:
Стиль / темп:
Цвета:
Шрифт:
Логотип / верхние подписи:
Титры:
Кадрирование / фон:
Звук / музыка:
CTA:
Файлы на выходе:
Рабочая папка:
Ограничения:
```

End with: `Подтверди профиль или внеси правки. До подтверждения не начинаю монтаж, расшифровку и рендер.` Any unambiguous approval is valid; do not require a magic phrase.

Store the approved profile as Markdown with a small YAML header:

```markdown
---
profile_version: 1
profile_status: approved
updated_at: 2026-01-01T12:00:00+03:00
---
```

Below the header, preserve the approved card exactly.
