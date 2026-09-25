import { logPhraseShared } from './analytics';

// 인스타는 웹에서 직접 열 수 없다(메타 문서상 네이티브 전용). 그런데 OS 공유
// 시트에 이미지 '파일'을 넘기면 그 목록에 인스타가 뜬다 — 이미지가 인스타로
// 가는 실질적인 유일한 경로다. 그래서 "인스타 버튼"을 만드는 대신 파일을
// 넘기고, 어디로 보낼지는 OS가 고르게 한다.
//
// 카톡은 넘긴 항목마다 메시지를 하나씩 보낸다. files·text·url을 다 주면 셋으로
// 쪼개져서, text는 뺀다 — 문장은 이미 그림 안에 있어 중복이다. 남는 건 이미지와
// 링크 둘.
export const SHARE_LINK =
  'https://dandani.yetimates.com/?utm_source=card&utm_medium=organic&utm_campaign=phrase_share';

export const canShareImage = (blob) => {
  if (!blob || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files: [new File([blob], 'dandani.png', { type: 'image/png' })] });
  } catch (error) {
    return false;
  }
};

// 돌려주는 값: 'shared' | 'cancelled' | 'unsupported' | 'failed'
// 취소를 실패로 알리면 안 된다 — 마음이 바뀐 것뿐인데 오류처럼 보인다.
export const shareImageFile = async (blob, method) => {
  if (!canShareImage(blob)) return 'unsupported';
  try {
    await navigator.share({
      files: [new File([blob], 'dandani.png', { type: 'image/png' })],
      url: SHARE_LINK,
    });
    logPhraseShared(method);
    return 'shared';
  } catch (error) {
    return error && error.name === 'AbortError' ? 'cancelled' : 'failed';
  }
};
