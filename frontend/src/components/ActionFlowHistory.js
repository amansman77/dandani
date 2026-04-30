import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { styled } from '@mui/material/styles';
import { getUserId } from '../utils/userId';

const API_URL = process.env.REACT_APP_API_URL || 'https://dandani-api.amansman77.workers.dev';

const RESULT_CONFIG = {
  '해냈어': { label: '해냈어', color: 'success' },
  '조금 했어': { label: '조금 했어', color: 'warning' },
  '못했어': { label: '못했어', color: 'default' },
};

const ExpandButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== 'expanded',
})(({ expanded }) => ({
  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
  transition: 'transform 0.2s',
}));

function FlowCard({ flow }) {
  const [expanded, setExpanded] = useState(false);

  const date = new Date(flow.created_at.endsWith('Z') ? flow.created_at : flow.created_at + 'Z');
  const dateStr = date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  const timeStr = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  const resultCfg = RESULT_CONFIG[flow.result] || { label: flow.result, color: 'default' };
  const hasDetail = flow.after_feeling || flow.reflection;

  return (
    <Card variant="outlined" sx={{ mb: 1.5 }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, mr: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {dateStr} {timeStr}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 500 }}>
              {flow.current_state}
            </Typography>
            {flow.suggested_action?.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.8rem' }}>
                💡 {flow.suggested_action.description}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
            <Chip
              label={resultCfg.label}
              color={resultCfg.color}
              size="small"
            />
            {hasDetail && (
              <ExpandButton
                expanded={expanded}
                onClick={() => setExpanded((v) => !v)}
                size="small"
              >
                <ExpandMoreIcon fontSize="small" />
              </ExpandButton>
            )}
          </Box>
        </Box>

        {hasDetail && (
          <Collapse in={expanded}>
            <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
              {flow.after_feeling && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  💬 {flow.after_feeling}
                </Typography>
              )}
              {flow.reflection && (
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                  {flow.reflection}
                </Typography>
              )}
            </Box>
          </Collapse>
        )}
      </CardContent>
    </Card>
  );
}

const ActionFlowHistory = () => {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = getUserId();
    fetch(`${API_URL}/api/action-flow/history`, {
      headers: { 'X-User-ID': userId },
    })
      .then((res) => res.json())
      .then((data) => setFlows(data.flows || []))
      .catch(() => setFlows([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (flows.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="body1" color="text.secondary">
          아직 기록이 없어요.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          "한 걸음" 탭에서 첫 번째 행동을 시작해보세요.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto' }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
        총 {flows.length}개의 기록
      </Typography>
      {flows.map((flow) => (
        <FlowCard key={flow.id} flow={flow} />
      ))}
    </Box>
  );
};

export default ActionFlowHistory;
