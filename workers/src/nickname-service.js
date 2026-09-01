const ADJECTIVES = [
  '비행하는', '조용한', '꾸준한', '다정한', '씩씩한', '느긋한', '반짝이는', '포근한',
  '산뜻한', '단단한', '유쾌한', '차분한', '부지런한', '새벽의', '고요한', '따뜻한',
  '작은', '환한', '바람같은', '묵묵한',
];

const ANIMALS = [
  '다람쥐', '고양이', '너구리', '참새', '수달', '토끼', '거북이', '여우',
  '올빼미', '곰', '고래', '펭귄', '사슴', '두더지', '청설모', '오소리',
  '해달', '기러기', '까치', '호랑이',
];

function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getNickname(userId) {
  const hash = hashString(userId);
  const adjIndex = hash % ADJECTIVES.length;
  const animalIndex = Math.floor(hash / ADJECTIVES.length) % ANIMALS.length;
  return `${ADJECTIVES[adjIndex]} ${ANIMALS[animalIndex]}`;
}
