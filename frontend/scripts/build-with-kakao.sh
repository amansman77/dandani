#!/bin/sh
# CRA는 REACT_APP_* 이름만 번들에 심는다. 카카오 JS 키는 ~/.zshrc.local에
# KAKAO_JAVASCRIPT_KEY로 들어 있어서, 빌드 전에 이름을 바꿔 끼워야 한다.
#
# 문제는 키가 없어도 빌드가 그냥 성공한다는 것이다. isKakaoConfigured()가
# false가 되면서 공유 시트에서 카카오 버튼만 조용히 사라진 채로 배포된다.
# 2026-09-23에 실제로 그렇게 나갔고, 사용자가 화면을 보고 알려줘서야 알았다.
# 대화형 셸이 아닌 곳에서 빌드하면 ~/.zshrc.local이 안 읽혀서 생기는 일이다.
#
# 그래서 여기서 멈춘다. 키 없이 빌드해야 할 때(예: 키를 쓸 수 없는 CI)는
# ALLOW_BUILD_WITHOUT_KAKAO=1을 붙여서 의도를 남긴다.
set -e

if [ -z "$REACT_APP_KAKAO_JS_KEY" ] && [ -n "$KAKAO_JAVASCRIPT_KEY" ]; then
  export REACT_APP_KAKAO_JS_KEY="$KAKAO_JAVASCRIPT_KEY"
fi

# 로그인 셸에서만 키를 export하는 환경이면 여기서 한 번 더 찾아본다.
if [ -z "$REACT_APP_KAKAO_JS_KEY" ] && [ -f "$HOME/.zshrc.local" ]; then
  FOUND=$(. "$HOME/.zshrc.local" >/dev/null 2>&1; printf '%s' "$KAKAO_JAVASCRIPT_KEY")
  [ -n "$FOUND" ] && export REACT_APP_KAKAO_JS_KEY="$FOUND"
fi

if [ -z "$REACT_APP_KAKAO_JS_KEY" ] && [ "$ALLOW_BUILD_WITHOUT_KAKAO" != "1" ]; then
  echo "빌드 중단: 카카오 JS 키를 찾지 못했어요." >&2
  echo "  이대로 빌드하면 공유 시트에서 카카오톡 버튼이 조용히 사라진 채 배포됩니다." >&2
  echo "  KAKAO_JAVASCRIPT_KEY 또는 REACT_APP_KAKAO_JS_KEY를 설정하거나," >&2
  echo "  일부러 빼고 빌드하려면 ALLOW_BUILD_WITHOUT_KAKAO=1 을 붙여주세요." >&2
  exit 1
fi

react-scripts build
