import { getDailyReportData } from './analytics-service.js';
import { formatDiscordMessage, sendDiscordMessage } from './discord-service.js';
import { handleRequest } from './router.js';

export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  },

  async scheduled(event, env) {
    try {
      console.log('일일 보고서 Cron Job 시작:', new Date().toISOString());

      const reportData = await getDailyReportData(env);
      const discordMessage = formatDiscordMessage(reportData);
      const result = await sendDiscordMessage(env, discordMessage);

      console.log('일일 보고서 전송 완료:', result);
    } catch (error) {
      console.error('일일 보고서 Cron Job 실패:', error);

      try {
        const errorMessage = {
          content: '❌ **단단이 일일 보고서 전송 실패**',
          embeds: [
            {
              title: '❌ 단단이 일일 보고서 전송 실패',
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
  }
};
