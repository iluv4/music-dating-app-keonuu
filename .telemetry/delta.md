# Delta: Current → Target

현재 상태(`current-state.yaml`)에서 목표(`tracking-plan.yaml`)로 가는 구현 백로그.

## 요약
- 목표 이벤트: **14개**
- 현재 추적 중(커스텀): 2개 (`match_search_clicked`, `message_sent`) + `$pageview`(autocapture)
- identify/traits: **전무** → 가입 퍼널·리텐션·세그먼트 분석 불가 (최우선 갭)

## Rename (이름만 변경 — 컨벤션 정렬)
| 현재 | 목표 | 비고 |
|------|------|------|
| `match_search_clicked` | `match.search_started` | object.action snake_case |
| `message_sent` | `message.sent` | + `length_bucket` 옵션 프로퍼티 추가 |

## Add (미추적 → 신규)
| 이벤트 | 카테고리 | 이유 |
|--------|----------|------|
| `user.signed_up` | lifecycle | 가입 추적 부재 — 퍼널 시작점 |
| `user.logged_in` | lifecycle | 리텐션/재방문 |
| `profile.step_completed` | configuration | 퍼널 단계별 이탈 분석 |
| `profile.completed` | lifecycle | 활성화 직전(승인 대기 진입) |
| `genre.selected` | core_value | 취향 신호 |
| `song.added` | core_value | 핵심 루프 입력 |
| `song.removed` | core_value | 곡 선택 이탈 |
| `match.created` | core_value | **PRIMARY VALUE** — 현재 미추적(redirect라 누락) |
| `match.search_no_result` | core_value | 매칭 풀 부족 진단 (후보 없음률) |
| `match.ended` | core_value | 채팅 이탈 |
| `notification.opened` | navigation | 알림 효과 측정 |
| `discover.viewed` | navigation | 탐색 기능 사용 |

## Keep (변경 없음)
| 현재 | 목표 |
|------|------|
| `$pageview` (autocapture) | 유지 — posthog capture_pageview |

## Identity / Traits (신규 — 최우선)
- `posthog.identify(user_id, {...traits})` 호출이 **전혀 없음**. 익명 수집만 됨.
- 승인 직후 또는 /music 진입 시 identify 호출 추가 필요 (서버 로더에서 user 정보 → 클라 전달 → identify).
- 스냅샷 트레잇(songs_selected_count, matches_count, has_active_match)은 daily 동기화 (서버 cron 또는 PostHog group sync 대체 — B2C라 user trait sync).

## 검증
ADD(12) + RENAME(2) + KEEP(1) = 15 ≈ 목표 14 이벤트 + $pageview. ✅
(match_search_clicked/message_sent는 rename으로 카운트, 신규 12개가 목표의 나머지)

## 다음 단계
`implementation-guide.md` 참조 — posthog-js 호출 위치/코드. 코드 생성은 product-tracking-implement-tracking 스킬.
</content>
