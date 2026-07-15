import { getUTCDate } from './core.js';
import { getDailyReportData } from './analytics-service.js';
import { formatDiscordMessage, sendDiscordMessage } from './discord-service.js';
import { generateDailyInsight, formatInsightMessage } from './insight-service.js';
import { handleRequest } from './router.js';

// 계정 전체 cron trigger 한도(5개)를 다른 프로젝트가 이미 다 쓰고 있어서
// "0,30 9,22 * * *" 한 슬롯으로 4번 트리거되고, 시/분으로 실제 작업을 분기한다.
const REPORT_UTC_HOUR = 9;
const REPORT_UTC_MINUTE = 0;
const INSIGHT_UTC_HOUR = 22;
const INSIGHT_UTC_MINUTE = 30;

async function sendErrorToDiscord(env, title, error) {
  try {
    const errorMessage = {
      content: `❌ **${title}**`,
      embeds: [
        {
          title: `❌ ${title}`,
          color: 0xff0000,
          fields: [
            {
              name: '에러 메시지',
              value: `\`\`\`${error.message}\`\`\``,
              inline: false
            },
            {
              name: '발생 시간',
              value: new Date().toISOString(),
              inline: false
            }
          ],
          timestamp: new Date().toISOString()
        }
      ]
    };

    await sendDiscordMessage(env, errorMessage);
  } catch (discordError) {
    console.error('에러 메시지 전송도 실패:', discordError);
  }
}

async function runDailyReport(env) {
  try {
    console.log('일일 보고서 Cron Job 시작:', new Date().toISOString());

    const reportData = await getDailyReportData(env);
    const discordMessage = formatDiscordMessage(reportData);
    const result = await sendDiscordMessage(env, discordMessage);

    console.log('일일 보고서 전송 완료:', result);
  } catch (error) {
    console.error('일일 보고서 Cron Job 실패:', error);
    await sendErrorToDiscord(env, '단단이 일일 보고서 전송 실패', error);
  }
}

async function runDailyInsight(env) {
  try {
    console.log('일일 인사이트 Cron Job 시작:', new Date().toISOString());

    const insight = await generateDailyInsight(env);
    if (!insight) {
      console.log('오늘은 UX 관찰 차례 — 로컬 Playwright 자동화가 처리하므로 Worker는 스킵');
      return;
    }
    const discordMessage = formatInsightMessage(insight.category, insight.insightText, getUTCDate());
    const result = await sendDiscordMessage(env, discordMessage);

    console.log('일일 인사이트 전송 완료:', result);
  } catch (error) {
    console.error('일일 인사이트 Cron Job 실패:', error);
    await sendErrorToDiscord(env, '단단이 일일 인사이트 전송 실패', error);
  }
}

export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  },

  async scheduled(event, env) {
    const scheduled = new Date(event.scheduledTime);
    const hour = scheduled.getUTCHours();
    const minute = scheduled.getUTCMinutes();

    if (hour === INSIGHT_UTC_HOUR && minute === INSIGHT_UTC_MINUTE) {
      await runDailyInsight(env);
      return;
    }
    if (hour === REPORT_UTC_HOUR && minute === REPORT_UTC_MINUTE) {
      await runDailyReport(env);
      return;
    }
    console.log('해당 시각엔 예약된 작업 없음 (no-op):', scheduled.toISOString());
  }
};
