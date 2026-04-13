# Risk Detection System

## Overview

The Risk Detection System provides real-time analysis of project risks and automatically generates alerts based on actual project data.

## Features

### 🚨 Real-Time Risk Analysis
- **Overdue Tasks Detection**: Identifies tasks past their due dates
- **Resource Conflict Analysis**: Detects team members with excessive workloads (>8 tasks)
- **Deadline Risk Assessment**: Predicts projects at risk of missing deadlines
- **Dependency Chain Analysis**: Identifies blocked tasks (when dependencies are available)
- **Quality Risk Monitoring**: Detects patterns indicating potential quality issues

### 📊 Risk Metrics
- Overall risk score (0-100)
- Risk level classification (low/medium/high/critical)
- Affected tasks and projects count
- Risk trends over time

### 🔔 Automated Notifications
- High and critical risk alerts automatically added to notification system
- Duplicate prevention for risk notifications
- Rich notification data including affected tasks and projects

## API Endpoints

The system integrates with the following backend endpoints:

- `GET /api/risk-detection/analysis/:workspaceId` - Comprehensive risk analysis
- `GET /api/risk-detection/alerts/:workspaceId` - Active risk alerts only
- `GET /api/risk-detection/metrics/:workspaceId` - Risk metrics and KPIs
- `GET /api/risk-detection/trends/:workspaceId` - Risk trends over time
- `PATCH /api/risk-detection/alerts/:alertId` - Update alert status

## Usage

### Basic Risk Detection
```typescript
import { useRiskDetection } from '@/hooks/queries/risk/use-risk-detection';

function MyComponent() {
  const { data, isLoading, error } = useRiskDetection(workspaceId, "30d");
  
  if (data) {
    console.log(`Risk Score: ${data.overallRiskScore}`);
    console.log(`Alerts: ${data.alerts.length}`);
  }
}
```

### Enhanced Risk Monitoring
```typescript
import { useRiskMonitor } from '@/hooks/queries/risk/use-risk-detection';

function RiskDashboard() {
  const riskData = useRiskMonitor(workspaceId, "30d");
  
  return (
    <div>
      <p>Critical Risks: {riskData.criticalRisks.length}</p>
      <p>Affected Tasks: {riskData.totalAffectedTasks}</p>
      <p>Affected Projects: {riskData.totalAffectedProjects}</p>
      
      {riskData.hasHighRisk && (
        <div>⚠️ High priority risks detected!</div>
      )}
    </div>
  );
}
```

### Specific Risk Alerts
```typescript
import { useRiskAlerts } from '@/hooks/queries/risk/use-risk-detection';

function CriticalAlertsOnly() {
  const { data: alerts } = useRiskAlerts(workspaceId, {
    severity: 'critical',
    limit: 5
  });
  
  return (
    <div>
      {alerts?.map(alert => (
        <div key={alert.id}>
          <h3>{alert.title}</h3>
          <p>{alert.description}</p>
        </div>
      ))}
    </div>
  );
}
```

### Risk Metrics
```typescript
import { useRiskMetrics } from '@/hooks/queries/risk/use-risk-detection';

function RiskMetricsDisplay() {
  const { data: metrics } = useRiskMetrics(workspaceId, "30d");
  
  // Display KPIs and metrics
}
```

## Testing

You can test the risk detection system in the browser console:

```javascript
// Test all risk detection endpoints
await window.testRiskDetection('your-workspace-id');
```

## Configuration

### Update Frequencies
- **Risk Analysis**: Updates every 5 minutes, cached for 3 minutes
- **Risk Alerts**: Updates every 3 minutes, cached for 2 minutes  
- **Risk Metrics**: Updates every 15 minutes, cached for 10 minutes

### Risk Scoring
- **Overdue tasks**: 10 points per day overdue + 5 points per task
- **Resource conflicts**: 5 points per overloaded task
- **Deadline risks**: 10 points per day of estimated delay
- **Overall score**: Average of all alert scores (0-100)

### Risk Levels
- **Low**: Score 0-25, no high/critical alerts
- **Medium**: Score 26-50, or has medium alerts
- **High**: Score 51-70, or has high alerts
- **Critical**: Score 71-100, or has critical alerts

## Error Handling

The system includes robust error handling:

1. **API Failures**: Graceful degradation with empty data structure
2. **Development Mode**: Falls back to mock data for testing
3. **Production Mode**: Returns minimal real data structure
4. **Retry Logic**: Smart retry with exponential backoff
5. **Auth Errors**: No retry for 401/403 errors

## Integration

The risk detection system is integrated into:

- 📊 **Dashboard**: Risk score, alerts, and system health indicators
- 🔔 **Notifications**: Automatic high/critical risk notifications
- 📈 **Analytics**: Risk trends and metrics visualization
- ⚙️ **Settings**: Risk detection configuration options