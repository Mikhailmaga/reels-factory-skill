# Personal onboarding

Ask only for missing values. Keep the first-run experience to six grouped questions in one message and give recommended defaults when the user is unsure.

## Six setup groups

1. **Brand:** displayed name or brand, niche, audience, and typical objective.
2. **Formats:** default platforms, duration range, number of versions, style, pace, and optional reference.
3. **Identity:** accent/background/text colors, installed font, logo path, eyebrow label, and author label.
4. **Captions and framing:** language, caption style (`karaoke`, `boxed`, `minimal`, `kinetic`), emoji/highlight policy, caption position, video fit, blurred backdrop permission, and default subject position.
5. **Sound:** voice cleanup (`off`, `light`, `voice`), loudness target, music mood and level, automatic music ducking, and sound-effect preference.
6. **Finish:** common CTA or no default CTA, deliverables, project folder, privacy constraints, and whether optional paid providers may ever be proposed.

Do not ask the user to supply API keys during onboarding. Provider configuration is a separate opt-in action.

## Profile card

```text
ЛИЧНЫЙ ПРОФИЛЬ ФАБРИКИ REELS 3
Имя / бренд:
Ниша / аудитория:
Основная цель:
Площадки / длительность / версии:
Стиль / темп / референс:
Цвета / шрифт:
Логотип / верхние подписи:
Титры:
Кадрирование / положение героя / фон:
Очистка голоса / музыка / ducking / SFX:
CTA:
Файлы на выходе:
Рабочая папка:
Облачные плагины:
Ограничения:
```

End with: `Подтверди профиль или внеси правки. До подтверждения профиль не сохраняю и производство не запускаю.` Any unambiguous approval is valid.

Store the approved profile as Markdown:

```markdown
---
profile_version: 2
profile_status: approved
factory_version: 3
updated_at: 2026-01-01T12:00:00+03:00
---
```

Preserve the approved card exactly below the header. On changes, show only the proposed delta plus the resulting full card before writing it.
