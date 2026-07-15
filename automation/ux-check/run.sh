#!/bin/bash
set -euo pipefail
export PATH="/Users/hosung/.local/bin:$PATH"
cd "$(dirname "$0")"

# Same rotation formula as workers/src/insight-service.js — must stay in sync.
CATEGORY=$(node -e "console.log(['data','ux','growth','interview'][Math.floor(Date.now()/86400000)%4])")

if [ "$CATEGORY" != "ux" ]; then
  echo "오늘은 ux 차례가 아님 ($CATEGORY) — 스킵"
  exit 0
fi

source .env
DATE=$(date -u +%Y-%m-%d)
OUT_DIR="$(pwd)/out"
MSG_FILE="$OUT_DIR/last-message.txt"
rm -f "$MSG_FILE"

npm run check --silent > "$OUT_DIR/last-run.json"

PROMPT="너는 '단단이'라는 습관/챌린지 동반자 앱의 프로덕트 기획자야. 방금 Playwright로 실제 배포된 사이트(https://dandani.yetimates.com)를 방문해서 스크린샷을 찍었어.

아래 스크린샷들을 Read 도구로 열어서 실제로 봐:
- ${OUT_DIR}/1-home.png (첫 진입 화면 / 온보딩)
- ${OUT_DIR}/2-after-challenge-select.png (챌린지 선택 직후)
- ${OUT_DIR}/3-tab-0.png, 3-tab-1.png, 3-tab-2.png (오늘의 챌린지 / 챌린지 도우미 / 내 기록 탭)

그리고 콘솔 에러·페이지 에러·실패한 네트워크 응답 로그도 확인해: ${OUT_DIR}/last-run.json

이 스크린샷과 로그를 실제로 보고, 사용자 이탈이나 마찰을 만들 만한 구체적인 지점 하나와 개선 아이디어를 짚어. 화면에서 실제로 확인되는 것만 근거로 삼고, 안 보이는 걸 지어내지 마. 특별한 문제가 없으면 없다고 솔직히 말해. 반말로 3~4문장 이내.

이 관찰 문장만 (다른 설명이나 머리말 없이) Write 도구로 ${MSG_FILE} 파일에 그대로 저장해."

claude -p "$PROMPT" \
  --allowedTools "Read Write" \
  --model claude-sonnet-5

if [ ! -s "$MSG_FILE" ]; then
  echo "인사이트 파일이 비어있음 — 게시 중단" >&2
  exit 1
fi

# JSON 인코딩과 실제 게시는 LLM이 아니라 여기서 결정적으로 처리 (따옴표/이스케이프 오류 방지)
node -e "
const fs = require('fs');
const text = fs.readFileSync(process.argv[1], 'utf8').trim();
const payload = { content: '🧭 UX 관찰 (Playwright 실사용 확인) · ' + process.argv[2] + '\n' + text };
fs.writeFileSync(process.argv[3], JSON.stringify(payload));
" "$MSG_FILE" "$DATE" "$OUT_DIR/last-payload.json"

HTTP_CODE=$(curl -s -o "$OUT_DIR/last-response.txt" -w "%{http_code}" \
  -H 'Content-Type: application/json' \
  -d @"$OUT_DIR/last-payload.json" \
  "$DISCORD_WEBHOOK_URL")

echo "Discord 응답 코드: $HTTP_CODE"
if [ "$HTTP_CODE" != "204" ]; then
  cat "$OUT_DIR/last-response.txt"
  exit 1
fi
