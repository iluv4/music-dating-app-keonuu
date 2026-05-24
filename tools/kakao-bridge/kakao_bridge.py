"""
카톡 PC 앱 ↔ GitHub 이슈 브리지 (Windows 전용, 깨지기 쉬운 UI 자동화).

동작:
  - 지정한 카톡 채팅방 창을 열어두면, 새 메시지를 폴링으로 읽는다.
  - 트리거(기본: 메시지가 "수정:" 으로 시작)인 메시지를 fix-request 이슈로 만든다(gh).
  - 이슈가 만들어지면 채팅방에 확인 메시지를 보낸다.

⚠️ 한계(꼭 읽기):
  - 카카오는 공식 읽기 API가 없어 "화면/접근성 자동화"로만 가능 → 카톡 버전 업데이트로
    컨트롤 구조가 바뀌면 멈출 수 있다. 그때는 --inspect 로 구조를 다시 보고 SELECTOR를 고친다.
  - 카톡 PC 앱이 로그인된 채 실행 중이어야 하고, 해당 채팅방 창이 열려 있어야 한다.
  - 약관 회색지대. 운영 안정성이 중요하면 텔레그램/슬랙 브리지를 권장.

사전 준비:
  pip install -r requirements.txt
  gh auth login            # GitHub CLI 인증 (이슈 생성에 사용)

사용:
  # 1) 먼저 채팅방 창의 컨트롤 구조 점검 (셀렉터 맞추기)
  python kakao_bridge.py --room "수정요청방" --inspect
  # 2) 실제 폴링 시작
  python kakao_bridge.py --room "수정요청방" --repo iluv4/music-dating-app-keonuu
"""
from __future__ import annotations

import argparse
import subprocess
import sys
import time

try:
    import pyperclip
    from pywinauto import Desktop
    from pywinauto.keyboard import send_keys
except ImportError:
    print("의존성 누락: pip install -r requirements.txt 를 먼저 실행하세요.")
    sys.exit(1)

TRIGGER_PREFIX = "수정:"  # 이 접두로 시작하는 메시지만 처리(노이즈 방지). 필요시 변경.
POLL_SEC = 5


def get_room_window(room: str):
    """제목이 채팅방 이름인 카톡 채팅방 창을 찾는다(각 방은 별도 top-level 창)."""
    try:
        return Desktop(backend="uia").window(title_re=f".*{room}.*")
    except Exception as e:  # noqa: BLE001
        print(f"[err] 창을 못 찾음: {e}")
        return None


def inspect(room: str) -> None:
    """창 컨트롤 트리를 출력 → 메시지 리스트/입력창의 실제 selector를 찾는 용도."""
    win = get_room_window(room)
    if not win:
        return
    win.set_focus()
    print("=== 컨트롤 트리 (이 중 메시지 리스트/입력창을 찾아 read_messages/send에 반영) ===")
    win.print_control_identifiers(depth=8)


def read_messages(win) -> list[str]:
    """
    채팅 영역의 메시지 텍스트들을 읽는다.
    ⚠️ ADAPT: 카톡 버전마다 컨트롤이 달라 휴리스틱으로 ListItem/Text 의 name을 긁는다.
    --inspect 로 본 실제 컨트롤 타입에 맞춰 좁히면 더 정확해진다.
    """
    texts: list[str] = []
    try:
        for ctrl in win.descendants():
            try:
                ctype = ctrl.element_info.control_type
            except Exception:  # noqa: BLE001
                continue
            if ctype in ("ListItem", "Text"):
                name = (ctrl.window_text() or "").strip()
                if name:
                    texts.append(name)
    except Exception as e:  # noqa: BLE001
        print(f"[err] 메시지 읽기 실패: {e}")
    return texts


def send_message(win, text: str) -> None:
    """입력창에 클립보드로 붙여넣고 Enter (클립보드 방식이 한글/이모지에 가장 안정적)."""
    try:
        win.set_focus()
        edit = win.child_window(control_type="Edit")
        edit.click_input()
        pyperclip.copy(text)
        send_keys("^v")
        time.sleep(0.2)
        send_keys("{ENTER}")
    except Exception as e:  # noqa: BLE001
        print(f"[err] 메시지 전송 실패(입력창 selector 확인): {e}")


def create_issue(repo: str, title: str, body: str) -> bool:
    """gh CLI 로 fix-request 이슈 생성."""
    try:
        subprocess.run(
            [
                "gh", "issue", "create",
                "--repo", repo,
                "--title", title[:70],
                "--body", body,
                "--label", "fix-request",
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        return True
    except subprocess.CalledProcessError as e:
        print(f"[err] gh issue 생성 실패: {e.stderr}")
        return False


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--room", required=True, help="카톡 채팅방 이름(창 제목)")
    ap.add_argument("--repo", default="iluv4/music-dating-app-keonuu")
    ap.add_argument("--inspect", action="store_true", help="컨트롤 트리만 출력하고 종료")
    args = ap.parse_args()

    if args.inspect:
        inspect(args.room)
        return

    win = get_room_window(args.room)
    if not win:
        print("채팅방 창을 못 찾음. 카톡에서 해당 방을 열어두세요.")
        return

    print(f"[start] '{args.room}' 폴링 시작 (트리거 접두='{TRIGGER_PREFIX}', {POLL_SEC}s)")
    seen = set(read_messages(win))  # 시작 시점 이전 메시지는 무시

    while True:
        time.sleep(POLL_SEC)
        for msg in read_messages(win):
            if msg in seen:
                continue
            seen.add(msg)
            if not msg.startswith(TRIGGER_PREFIX):
                continue
            content = msg[len(TRIGGER_PREFIX):].strip()
            if not content:
                continue
            print(f"[fix-request] {content}")
            ok = create_issue(
                args.repo,
                title=content,
                body=f"카톡 자동수집\n\n> {content}\n\n(자동 생성 — fix-request 파이프라인)",
            )
            send_message(
                win,
                "✅ 수정요청 접수했어요! 이슈로 등록했고 곧 PR이 올라올 거예요."
                if ok else "⚠️ 이슈 등록 실패. 잠시 후 다시 보내주세요.",
            )


if __name__ == "__main__":
    main()
