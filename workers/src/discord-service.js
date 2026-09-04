const MAX_CAMPAIGN_ROWS = 8;

function formatCampaignLine(c) {
  const label = c.utm_campaign === '(캠페인 없음)' ? c.utm_source : `${c.utm_source}/${c.utm_campaign}`;
  return `• ${label}: 방문 ${c.visitors} → 작성 ${c.activated} (${c.activation_rate}%) → 지속 ${c.retained_2plus} (${c.retention_rate}%)`;
}

function formatCampaignBreakdown(campaigns) {
  if (!campaigns || campaigns.length === 0) {
    return '아직 방문 기록이 없어요.';
  }
  const shown = campaigns.slice(0, MAX_CAMPAIGN_ROWS).map(formatCampaignLine).join('\n');
  const rest = campaigns.length - MAX_CAMPAIGN_ROWS;
  return rest > 0 ? `${shown}\n… 외 ${rest}개` : shown;
}

export function formatDiscordMessage(reportData) {
  const { date, daily_snapshot, funnel_30d, campaign_breakdown, daily_trend } = reportData;

  const embed = {
    title: `📊 단단이 일일 보고서 - ${date}`,
    color: 0x00ff00,
    fields: [
      {
        name: `📅 어제 스냅샷 (${date})`,
        value: `• 방문자: ${daily_snapshot.visitors}명\n• 문장 새로 작성: ${daily_snapshot.phrases_started}명\n• 되새기기 실행: ${daily_snapshot.phrases_logged_users}명\n• 문구 포기: ${daily_snapshot.phrases_retired}명`,
        inline: false
      },
      {
        name: `🔻 유입 → 작성 → 지속 퍼널 (최근 30일, ${funnel_30d.period.start} ~ ${funnel_30d.period.end})`,
        value: `방문 ${funnel_30d.visitors}명\n→ 문장 작성 ${funnel_30d.activated}명 (${funnel_30d.activation_rate}%)\n→ 당일 되새김 ${funnel_30d.day1_logged}명 (${funnel_30d.day1_log_rate}%)\n→ 2일 이상 지속 ${funnel_30d.retained_2plus}명 (${funnel_30d.retention_rate}%)\n포기 ${funnel_30d.retired}명 (${funnel_30d.retired_rate}%)`,
        inline: false
      },
      {
        name: '📣 캠페인별 성과 (최근 30일)',
        value: formatCampaignBreakdown(campaign_breakdown),
        inline: false
      },
      {
        name: '📈 30일간 일별 활성 사용자 트렌드',
        value: `• 최근 7일 평균: ${daily_trend?.last_7_days_avg || 0}명\n• 최근 30일 평균: ${daily_trend?.last_30_days_avg || 0}명\n• 최고 활성일: ${daily_trend?.peak_day || 'N/A'} (${daily_trend?.peak_users || 0}명)\n• 최저 활성일: ${daily_trend?.lowest_day || 'N/A'} (${daily_trend?.lowest_users || 0}명)`,
        inline: false
      }
    ],
    footer: {
      text: `📅 생성 시간: ${new Date().toISOString()}`
    },
    timestamp: new Date().toISOString()
  };

  return {
    content: `📊 **단단이 일일 보고서** - ${date}`,
    embeds: [embed]
  };
}

export async function sendDiscordMessage(env, message) {
  const discordWebhookUrl = env.DISCORD_WEBHOOK_URL;
  if (!discordWebhookUrl) {
    throw new Error('DISCORD_WEBHOOK_URL 환경변수가 설정되지 않았습니다.');
  }

  const response = await fetch(discordWebhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message)
  });

  if (!response.ok) {
    throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
  }

  return {
    success: true,
    message: '디스코드 메시지가 성공적으로 전송되었습니다.'
  };
}
