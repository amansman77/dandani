export function formatDiscordMessage(reportData) {
  const { date, retention_metrics, event_stats, data_consistency } = reportData;

  const getStatusEmoji = (status) => {
    switch (status) {
      case 'good': return '✅';
      case 'needs_improvement': return '⚠️';
      default: return '❌';
    }
  };

  const retentionSummary = Object.entries(retention_metrics.metrics)
    .map(([key, metric]) => {
      const emoji = getStatusEmoji(metric.status);
      const target = metric.target;
      const value = metric.value.toFixed(1);
      return `${emoji} ${key.replace(/_/g, ' ').toUpperCase()}: ${value}% (목표: ${target}%)`;
    })
    .join('\n');

  const embed = {
    title: `📊 단단이 일일 보고서 - ${date}`,
    color: 0x00ff00,
    fields: [
      {
        name: '📈 리텐션 지표 (30일 기준)',
        value: retentionSummary,
        inline: false
      },
      {
        name: `📊 일일 활동 통계 (${date})`,
        value: `• 활성 사용자: ${event_stats.page_visits?.unique_users || 0}명\n• 챌린지 선택: ${event_stats.challenge_selected?.unique_users || 0}명\n• 실천 완료: ${event_stats.practice_completes?.unique_users || 0}명\n• 피드백 제출: ${event_stats.feedback_submits?.unique_users || 0}명\n• AI 상담 이용: ${event_stats.ai_chat_starts?.unique_users || 0}명`,
        inline: true
      },
      {
        name: `📈 이벤트 통계 (${date})`,
        value: `• 챌린지 선택: ${event_stats.challenge_selected?.count || 0}회 (${event_stats.challenge_selected?.unique_users || 0}명)\n• 실천 완료: ${event_stats.practice_completes?.count || 0}회 (${event_stats.practice_completes?.unique_users || 0}명)\n• AI 상담 시작: ${event_stats.ai_chat_starts?.count || 0}회 (${event_stats.ai_chat_starts?.unique_users || 0}명)\n• 피드백 제출: ${event_stats.feedback_submits?.count || 0}회 (${event_stats.feedback_submits?.unique_users || 0}명)\n• 페이지 방문: ${event_stats.page_visits?.count || 0}회 (${event_stats.page_visits?.unique_users || 0}명)\n• 온보딩 완료: ${event_stats.onboarding_completes?.count || 0}회 (${event_stats.onboarding_completes?.unique_users || 0}명)`,
        inline: true
      },
      {
        name: '📈 30일간 일별 활성 사용자 트렌드',
        value: `• 최근 7일 평균: ${reportData.daily_trend?.last_7_days_avg || 0}명\n• 최근 30일 평균: ${reportData.daily_trend?.last_30_days_avg || 0}명\n• 최고 활성일: ${reportData.daily_trend?.peak_day || 'N/A'} (${reportData.daily_trend?.peak_users || 0}명)\n• 최저 활성일: ${reportData.daily_trend?.lowest_day || 'N/A'} (${reportData.daily_trend?.lowest_users || 0}명)`,
        inline: false
      }
    ],
    footer: {
      text: `📅 생성 시간: ${new Date().toISOString()}`
    },
    timestamp: new Date().toISOString()
  };

  if (data_consistency && !data_consistency.is_consistent) {
    embed.fields.push({
      name: '⚠️ 데이터 일관성 경고',
      value: `• 문제 발견: ${data_consistency.issues.length}개\n• 상세: ${data_consistency.issues.join(', ')}`,
      inline: false
    });
    embed.color = 0xff9900;
  }

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
