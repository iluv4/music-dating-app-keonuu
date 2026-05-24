# 카톡 → GitHub 이슈 브리지 (Windows, UI 자동화)

팀원이 카톡 채팅방에 `수정: 홈 버튼 색 더 진하게` 처럼 보내면 →
이 스크립트가 읽어서 `fix-request` 이슈를 만들고 → 채팅방에 접수 확인을 보냅니다.
이슈는 기존 자동 PR 파이프라인의 인입구입니다.

> ⚠️ **깨지기 쉬운 방식입니다.** 카카오는 공식 읽기 API가 없어 화면/접근성 자동화로만 동작하고,
> 카톡 버전 업데이트로 컨트롤이 바뀌면 멈출 수 있어요. 운영 안정성이 중요하면
> **텔레그램/슬랙 브리지를 권장**합니다(공식 트리거라 안 끊김).

## 준비
```bat
cd tools\kakao-bridge
pip install -r requirements.txt
gh auth login
```
- 카톡 PC 앱이 **로그인 + 실행** 상태여야 하고, 대상 **채팅방 창을 열어두세요.**
- 전용 방(예: "수정요청방")을 하나 파서 거기서만 받는 걸 추천.

## 사용
```bat
:: 1) 채팅방 창의 컨트롤 구조부터 점검 (selector 맞추기 — 거의 필수)
python kakao_bridge.py --room "수정요청방" --inspect

:: 2) 폴링 시작
python kakao_bridge.py --room "수정요청방" --repo iluv4/music-dating-app-keonuu
```

## 동작 / 트리거
- 기본 트리거: 메시지가 **`수정:`** 으로 시작할 때만 처리(노이즈 방지). `kakao_bridge.py`의 `TRIGGER_PREFIX`로 변경.
- 처리 흐름: 새 메시지 감지 → `gh issue create`(라벨 `fix-request`) → 채팅방에 ✅ 확인 전송.

## 깨지면? (adapt 가이드)
카톡 업데이트로 안 읽히거나 전송 안 되면:
1. `--inspect` 로 컨트롤 트리를 출력.
2. 메시지 리스트가 `ListItem`인지 `Text`인지, 입력창이 `Edit`인지 확인.
3. `read_messages()` / `send_message()`의 selector를 거기에 맞춰 좁히기.
4. 그래도 안 되면 **OCR 폴백**(창 스크린샷 → pytesseract) 또는 텔레그램 브리지로 전환.

## 한계
- 한 PC에서 그 카톡 계정으로만 동작(앱이 떠 있어야 함).
- 메시지 텍스트만 다룸(이미지/첨부는 미지원 — 필요시 OCR/저장 로직 추가).
- 카카오 약관 회색지대. 사적 자동화 책임은 사용자에게.
