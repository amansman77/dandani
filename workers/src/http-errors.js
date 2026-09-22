export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new HttpError(400, '올바른 JSON 요청이 필요합니다.');
  }
}
