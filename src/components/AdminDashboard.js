import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  TrendingDown,
  CheckCircle,
  Warning
} from '@mui/icons-material';

const AdminDashboard = () => {
  const [retentionMetrics, setRetentionMetrics] = useState(null);
  const [activityStats, setActivityStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDays, setSelectedDays] = useState(30);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8787';

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 리텐션 지표 조회
      const retentionResponse = await fetch(`${API_BASE_URL}/api/analytics/retention`);
      if (!retentionResponse.ok) {
        throw new Error('리텐션 지표 조회 실패');
      }
      const retentionData = await retentionResponse.json();
      setRetentionMetrics(retentionData);

      // 활동 통계 조회
      const activityResponse = await fetch(`${API_BASE_URL}/api/analytics/activity?days=${selectedDays}`);
      if (!activityResponse.ok) {
        throw new Error('활동 통계 조회 실패');
      }
      const activityData = await activityResponse.json();
      setActivityStats(activityData);

    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDays]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'good':
        return <CheckCircle color="success" />;
      case 'needs_improvement':
        return <Warning color="warning" />;
      default:
        return <TrendingDown color="error" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'good':
        return 'success';
      case 'needs_improvement':
        return 'warning';
      default:
        return 'error';
    }
  };

  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <Button color="inherit" size="small" onClick={fetchData}>
          다시 시도
        </Button>
      }>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        단단이 관리자 대시보드
      </Typography>
      
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>기간</InputLabel>
          <Select
            value={selectedDays}
            label="기간"
            onChange={(e) => setSelectedDays(e.target.value)}
          >
            <MenuItem value={7}>7일</MenuItem>
            <MenuItem value={30}>30일</MenuItem>
            <MenuItem value={90}>90일</MenuItem>
          </Select>
        </FormControl>
        <Button variant="outlined" onClick={fetchData}>
          새로고침
        </Button>
      </Box>

      {/* 리텐션 지표 카드 */}
      {retentionMetrics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {Object.entries(retentionMetrics.metrics).map(([key, metric]) => (
            <Grid item xs={12} sm={6} md={2.4} key={key}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    {getStatusIcon(metric.status)}
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      {formatPercentage(metric.value)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {key.replace(/_/g, ' ').toUpperCase()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    목표: {metric.target}%
                  </Typography>
                  <Chip
                    label={metric.status === 'good' ? '양호' : '개선 필요'}
                    color={getStatusColor(metric.status)}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* 활동 통계 */}
      {activityStats && (
        <Grid container spacing={3}>
          {/* 일별 활성 사용자 차트 */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  일별 활성 사용자 ({selectedDays}일)
                </Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>날짜</TableCell>
                        <TableCell align="right">활성 사용자</TableCell>
                        <TableCell align="right">실천 완료</TableCell>
                        <TableCell align="right">피드백 제출</TableCell>
                        <TableCell align="right">AI 상담</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activityStats.daily_active_users.slice(0, 10).map((day) => (
                        <TableRow key={day.activity_date}>
                          <TableCell>{day.activity_date}</TableCell>
                          <TableCell align="right">{day.active_users}</TableCell>
                          <TableCell align="right">{day.practice_users}</TableCell>
                          <TableCell align="right">{day.feedback_users}</TableCell>
                          <TableCell align="right">{day.ai_chat_users}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* 이벤트 통계 */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  이벤트 통계
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>이벤트 타입</TableCell>
                        <TableCell align="right">횟수</TableCell>
                        <TableCell align="right">사용자</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activityStats.event_statistics.map((event) => (
                        <TableRow key={event.event_type}>
                          <TableCell>{event.event_type}</TableCell>
                          <TableCell align="right">{event.count}</TableCell>
                          <TableCell align="right">{event.unique_users}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* 세션 통계 */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  세션 통계
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="primary">
                        {activityStats.session_statistics.total_sessions}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        총 세션
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="primary">
                        {activityStats.session_statistics.unique_users}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        고유 사용자
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="primary">
                        {activityStats.session_statistics.avg_visits_per_session?.toFixed(1)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        평균 방문/세션
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="primary">
                        {activityStats.session_statistics.avg_events_per_session?.toFixed(1)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        평균 이벤트/세션
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default AdminDashboard;
