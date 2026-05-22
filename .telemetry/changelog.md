# Tracking Plan Changelog

## [1.0.0] - 2026-05-22

### Added (target plan 신규 설계)
- 전체 트래킹 플랜 초안 생성 (`tracking-plan.yaml`) — 14개 이벤트 + user 트레잇 12개.
- lifecycle: `user.signed_up`, `user.logged_in`, `profile.step_completed`, `profile.completed`
- core_value: `genre.selected`, `song.added`, `song.removed`, `match.search_started`, `match.created`, `match.search_no_result`, `message.sent`, `match.ended`
- navigation: `notification.opened`, `discover.viewed`
- identify + user 트레잇 (PII는 name만, traits_only 정책)

### Changed (기존 코드 이벤트 → 컨벤션 정렬, 아직 코드 미반영)
- `match_search_clicked` → `match.search_started`
- `message_sent` → `message.sent` (+ `length_bucket` 옵션)

### Notes
- 현재 코드엔 `match_search_clicked`, `message_sent`, `$pageview`만 존재.
- identify 호출 전무 → 최우선 갭.
- 구현: `implementation-guide.md` 참조. 코드 생성은 product-tracking-implement-tracking 스킬.
</content>
