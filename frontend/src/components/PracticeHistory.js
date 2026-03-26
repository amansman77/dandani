import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import PracticeCalendar from './PracticeCalendar';
import { getUserId } from '../utils/userId';
import { addStartedAtHeader, parseDatabaseDate } from '../utils/challengeDay';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
}));

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

const PracticeHistory = ({ challengeId, onViewRecord }) => {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!challengeId) {
        setRecords([]);
        return;
      }

      try {
        const userId = getUserId();
        const headers = addStartedAtHeader({
          'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
          'X-Client-Time': new Date().toISOString(),
          'X-User-ID': userId
        }, challengeId);

        const response = await fetch(`${API_URL}/api/feedback/history?challengeId=${challengeId}`, {
          headers
        });

        if (!response.ok) {
          setRecords([]);
          return;
        }

        const history = await response.json();
        setRecords(Array.isArray(history) ? history : []);
      } catch (error) {
        console.warn('Failed to fetch growth logs:', error);
        setRecords([]);
      }
    };

    fetchHistory();
  }, [challengeId]);

  const latestGrowthLogs = useMemo(() => {
    return [...records]
      .filter((record) => record?.practice_description)
      .sort((a, b) => {
        const aTime = parseDatabaseDate(a.created_at)?.getTime() || 0;
        const bTime = parseDatabaseDate(b.created_at)?.getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, 7);
  }, [records]);

  const formatDate = (dateValue) => {
    const parsed = parseDatabaseDate(dateValue);
    if (!parsed) {
      return '';
    }
    return parsed.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const handleDateSelect = (date, dateRecords) => {
    // 달력에서 날짜 선택 시 처리
    console.log('Selected date:', date, 'Records:', dateRecords);
    if (onViewRecord && dateRecords && dateRecords.length > 0) {
      // 첫 번째 기록을 상세 보기로 전달
      onViewRecord(dateRecords[0]);
    }
  };


  if (!challengeId) {
    return (
      <StyledPaper>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            챌린지를 선택해주세요
          </Typography>
          <Typography variant="body2" color="text.secondary" component="span">
            달력을 보려면 먼저 챌린지를 선택해주세요.
          </Typography>
        </Box>
      </StyledPaper>
    );
  }

  return (
    <Box>
      <StyledPaper sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          성장 기록
        </Typography>
        {latestGrowthLogs.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            아직 저장된 성장 기록이 없습니다.
          </Typography>
        ) : (
          latestGrowthLogs.map((record, index) => (
            <Box key={record.id || `${record.created_at}-${index}`} sx={{ py: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {formatDate(record.created_at)}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                {record.practice_description}
              </Typography>
              {index < latestGrowthLogs.length - 1 && <Divider sx={{ mt: 1.5 }} />}
            </Box>
          ))
        )}
      </StyledPaper>

      <PracticeCalendar
        challengeId={challengeId}
        onDateSelect={handleDateSelect}
      />
    </Box>
  );
};

export default PracticeHistory;
