// 카카오톡 공유.
//
// 카카오는 웹에서 쓸 수 있는 공개 URL 스킴이 없어서, 카톡으로 "바로" 보내려면
// 카카오 JS SDK를 거쳐야 한다. 그래서 세 가지가 미리 준비돼 있어야 한다:
//   1. developers.kakao.com 앱 등록
//   2. JavaScript 키  → REACT_APP_KAKAO_JS_KEY
//   3. 플랫폼 설정에 dandani.yetimates.com을 JS SDK 도메인으로 등록
// 셋 중 하나라도 없으면 isKakaoConfigured()가 false가 되고, 공유 시트는
// 카카오 줄 없이 예전처럼 동작한다(= OS 공유 시트로 카톡에 보내는 길).
//
// SDK는 index.html에 박지 않고 필요할 때 불러온다. 대부분의 방문자는 공유를
// 안 누르는데, 87KB짜리 외부 스크립트를 매 방문 렌더 경로에 얹을 이유가 없다
// (구글 폰트 링크를 걷어낸 것과 같은 이유).

const SDK_VERSION = '2.8.3';
const SDK_SRC = `https://t1.kakaocdn.net/kakao_js_sdk/${SDK_VERSION}/kakao.min.js`;
// 실제 배포 파일에서 직접 계산한 값. CDN이 파일을 바꿔치면 로드가 실패한다.
const SDK_INTEGRITY = 'sha384-oroumrnFVE0xtgqyDZJARgERibXg2C28380uaUZz2kHDS5CR7tu20eGiOU6GkTpy';

const JS_KEY = process.env.REACT_APP_KAKAO_JS_KEY;

export const isKakaoConfigured = () => Boolean(JS_KEY);

let loadPromise = null;

const loadSdk = () => {
  if (window.Kakao) return Promise.resolve(window.Kakao);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SDK_SRC;
    script.integrity = SDK_INTEGRITY;
    script.crossOrigin = 'anonymous';
    script.async = true;
    script.onload = () => (window.Kakao ? resolve(window.Kakao) : reject(new Error('kakao sdk missing')));
    script.onerror = () => {
      // 다음에 다시 시도할 수 있도록 실패한 약속은 버린다.
      loadPromise = null;
      reject(new Error('kakao sdk load failed'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
};

const getKakao = async () => {
  const Kakao = await loadSdk();
  // init을 두 번 부르면 예외가 난다.
  if (!Kakao.isInitialized()) Kakao.init(JS_KEY);
  return Kakao;
};

// 카톡 대화창에 뜨는 카드. 문장이 제목이고, 기록이 그 아래 한 줄.
export const shareToKakao = async ({ phrase, visitDays, link, imageUrl }) => {
  const Kakao = await getKakao();
  const linkPair = { mobileWebUrl: link, webUrl: link };

  Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: `“${phrase}”`,
      description: visitDays ? `${visitDays}번째 아침 · 단단이` : '단단이',
      imageUrl,
      link: linkPair,
    },
    buttons: [{ title: '나도 한 문장 적어보기', link: linkPair }],
  });
};
