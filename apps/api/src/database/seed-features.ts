import { getDatabase } from "./connection";
import logger from '../utils/logger';
import { 
  securityAlerts,
  securityMetricsHistory,
  revenueMetrics,
  projectRevenue,
  customerHealth,
  satisfactionSurveys,
  financialMetrics,
  projectFinancials,
  roiMetrics,
  automationRules,
  automationExecutions,
  scheduledReports,
  gdprDataRetentionPolicies,
  twoFactorStatus,
} from "./schema-features";

export async function seedFeatures() {
  const db = getDatabase();
  logger.debug("🌱 Seeding feature data...");

  try {
    // ==========================================
    // SECURITY METRICS
    // ==========================================
    logger.debug("  📊 Seeding security metrics history...");
    const securityData = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      securityData.push({
        date,
        totalThreats: Math.floor(Math.random() * 50) + 10,
        resolvedThreats: Math.floor(Math.random() * 45) + 5,
        criticalAlerts: Math.floor(Math.random() * 5),
        highAlerts: Math.floor(Math.random() * 10),
        mediumAlerts: Math.floor(Math.random() * 20),
        lowAlerts: Math.floor(Math.random() * 15),
        failedLogins: Math.floor(Math.random() * 30),
      });
    }
    
    await db.insert(securityMetricsHistory).values(securityData);
    logger.debug(`  ✅ Seeded ${securityData.length} security metric records`);

    // Security Alerts
    logger.debug("  🚨 Seeding security alerts...");
    await db.insert(securityAlerts).values([
      {
        severity: "critical",
        type: "failed_login",
        description: "Multiple failed login attempts from IP 192.168.1.100",
        status: "active",
        metadata: { ip: "192.168.1.100", attempts: 15 },
      },
      {
        severity: "high",
        type: "unauthorized_access",
        description: "Unauthorized API access attempt",
        status: "resolved",
        resolvedAt: new Date(),
        metadata: { endpoint: "/api/admin/users" },
      },
      {
        severity: "medium",
        type: "suspicious_activity",
        description: "Unusual data download pattern detected",
        status: "active",
        metadata: { user: "john.doe", size: "500MB" },
      },
    ]);
    logger.debug("  ✅ Seeded 3 security alerts");

    // GDPR Data Retention Policies
    logger.debug("  📜 Seeding GDPR policies...");
    await db.insert(gdprDataRetentionPolicies).values([
      {
        dataType: "user_data",
        retentionPeriod: 2555, // ~7 years
        description: "User profile and account information",
        isActive: true,
      },
      {
        dataType: "activity_logs",
        retentionPeriod: 365,
        description: "User activity and audit logs",
        isActive: true,
      },
      {
        dataType: "files",
        retentionPeriod: 1825, // ~5 years
        description: "User uploaded files and attachments",
        isActive: true,
      },
    ]);
    logger.debug("  ✅ Seeded 3 GDPR policies");

    // ==========================================
    // REVENUE METRICS
    // ==========================================
    logger.debug("  💰 Seeding revenue metrics...");
    const revenueData = [];
    let mrr = 50000;
    
    for (let i = 12; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      // Simulate realistic growth with some variance
      const growth = 1 + (Math.random() * 0.12 - 0.02); // -2% to +10% growth
      mrr = mrr * growth;
      const arr = mrr * 12;
      const newRevenue = mrr * 0.15;
      const churnRevenue = mrr * 0.05;
      
      revenueData.push({
        date,
        mrr: mrr.toFixed(2),
        arr: arr.toFixed(2),
        newRevenue: newRevenue.toFixed(2),
        churnRevenue: churnRevenue.toFixed(2),
        growthRate: ((growth - 1) * 100).toFixed(2),
      });
    }
    
    await db.insert(revenueMetrics).values(revenueData);
    logger.debug(`  ✅ Seeded ${revenueData.length} revenue metric records`);

    // ==========================================
    // CUSTOMER HEALTH
    // ==========================================
    logger.debug("  💚 Seeding customer health scores...");
    const healthData = [
      {
        customerId: 1,
        healthScore: 92,
        engagementScore: 95,
        satisfactionScore: 90,
        usageScore: 88,
        riskLevel: "healthy",
        lastActivityAt: new Date(),
        notes: "High engagement, excellent retention",
      },
      {
        customerId: 2,
        healthScore: 78,
        engagementScore: 80,
        satisfactionScore: 75,
        usageScore: 78,
        riskLevel: "healthy",
        lastActivityAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        notes: "Moderate engagement, stable",
      },
      {
        customerId: 3,
        healthScore: 45,
        engagementScore: 40,
        satisfactionScore: 50,
        usageScore: 45,
        riskLevel: "at-risk",
        lastActivityAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        notes: "Declining usage, needs attention",
      },
      {
        customerId: 4,
        healthScore: 25,
        engagementScore: 20,
        satisfactionScore: 30,
        usageScore: 25,
        riskLevel: "critical",
        lastActivityAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        notes: "Inactive for 30 days, high churn risk",
      },
    ];
    
    await db.insert(customerHealth).values(healthData);
    logger.debug(`  ✅ Seeded ${healthData.length} customer health records`);

    // ==========================================
    // SATISFACTION SURVEYS
    // ==========================================
    logger.debug("  📊 Seeding satisfaction surveys...");
    const surveyData = [];
    
    // NPS surveys
    for (let i = 0; i < 50; i++) {
      const score = Math.floor(Math.random() * 11); // 0-10
      const category = score >= 9 ? "promoter" : score >= 7 ? "passive" : "detractor";
      
      surveyData.push({
        surveyType: "nps",
        userId: i + 1,
        score,
        category,
        feedback: score >= 9 ? "Great product!" : score >= 7 ? "Good, but could be better" : "Needs improvement",
        respondedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      });
    }
    
    // CSAT surveys
    for (let i = 0; i < 50; i++) {
      const score = Math.floor(Math.random() * 5) + 1; // 1-5
      
      surveyData.push({
        surveyType: "csat",
        userId: i + 51,
        score,
        feedback: score >= 4 ? "Very satisfied" : score >= 3 ? "Satisfied" : "Not satisfied",
        respondedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      });
    }
    
    await db.insert(satisfactionSurveys).values(surveyData);
    logger.debug(`  ✅ Seeded ${surveyData.length} survey responses`);

    // ==========================================
    // FINANCIAL METRICS
    // ==========================================
    logger.debug("  💵 Seeding financial metrics...");
    const financialData = [];
    
    for (let i = 12; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      const budget = 100000;
      const actual = budget * (0.85 + Math.random() * 0.25); // 85-110% of budget
      
      financialData.push({
        date,
        totalBudget: budget.toFixed(2),
        totalActual: actual.toFixed(2),
        variance: (actual - budget).toFixed(2),
        burnRate: (actual / 30).toFixed(2),
        cashInflow: (actual * 1.15).toFixed(2),
        cashOutflow: actual.toFixed(2),
      });
    }
    
    await db.insert(financialMetrics).values(financialData);
    logger.debug(`  ✅ Seeded ${financialData.length} financial metric records`);

    // ==========================================
    // ROI METRICS
    // ==========================================
    logger.debug("  📈 Seeding ROI metrics...");
    await db.insert(roiMetrics).values([
      {
        name: "Marketing Campaign Q1",
        investment: "50000.00",
        returns: "125000.00",
        roi: "150.00",
        period: "quarterly",
        startDate: new Date(2025, 0, 1),
        endDate: new Date(2025, 2, 31),
      },
      {
        name: "Product Development",
        investment: "200000.00",
        returns: "500000.00",
        roi: "150.00",
        period: "yearly",
        startDate: new Date(2024, 0, 1),
        endDate: new Date(2024, 11, 31),
      },
      {
        name: "Sales Team Expansion",
        investment: "100000.00",
        returns: "180000.00",
        roi: "80.00",
        period: "quarterly",
        startDate: new Date(2025, 0, 1),
        endDate: new Date(2025, 2, 31),
      },
    ]);
    logger.debug("  ✅ Seeded 3 ROI metric records");

    // ==========================================
    // AUTOMATION RULES
    // ==========================================
    logger.debug("  ⚙️ Seeding automation rules...");
    await db.insert(automationRules).values([
      {
        name: "Auto-assign tasks to team lead",
        description: "Automatically assign high-priority tasks to team lead",
        trigger: "task_created",
        conditions: { priority: "high" },
        actions: { assign_to: "team_lead", notify: true },
        isActive: true,
        priority: 1,
        createdBy: 1,
      },
      {
        name: "Send completion notification",
        description: "Notify stakeholders when project reaches 100%",
        trigger: "task_completed",
        conditions: { project_completion: 100 },
        actions: { send_email: true, recipients: ["stakeholders"] },
        isActive: true,
        priority: 2,
        createdBy: 1,
      },
      {
        name: "Daily standup reminder",
        description: "Send daily standup meeting reminder at 9 AM",
        trigger: "time_based",
        conditions: { time: "09:00", days: ["monday", "tuesday", "wednesday", "thursday", "friday"] },
        actions: { send_notification: true, message: "Standup in 15 minutes!" },
        isActive: true,
        priority: 3,
        createdBy: 1,
      },
    ]);
    logger.debug("  ✅ Seeded 3 automation rules");

    // ==========================================
    // SCHEDULED REPORTS
    // ==========================================
    logger.debug("  📅 Seeding scheduled reports...");
    await db.insert(scheduledReports).values([
      {
        name: "Weekly Revenue Report",
        reportType: "revenue",
        frequency: "weekly",
        format: "pdf",
        recipients: ["ceo@example.com", "cfo@example.com"],
        filters: { timeRange: "week" },
        isActive: true,
        nextRunAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: 1,
      },
      {
        name: "Monthly Customer Health Report",
        reportType: "customer_health",
        frequency: "monthly",
        format: "excel",
        recipients: ["customer-success@example.com"],
        filters: { riskLevel: "all" },
        isActive: true,
        nextRunAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdBy: 1,
      },
      {
        name: "Daily Security Summary",
        reportType: "security",
        frequency: "daily",
        format: "csv",
        recipients: ["security@example.com"],
        filters: { severity: "high,critical" },
        isActive: true,
        nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdBy: 1,
      },
    ]);
    logger.debug("  ✅ Seeded 3 scheduled reports");

    logger.debug("\n✅ Feature data seeded successfully!");
    logger.debug("\n📊 Summary:");
    logger.debug(`  - ${securityData.length} security metric records`);
    logger.debug(`  - 3 security alerts`);
    logger.debug(`  - 3 GDPR policies`);
    logger.debug(`  - ${revenueData.length} revenue records`);
    logger.debug(`  - ${healthData.length} customer health records`);
    logger.debug(`  - ${surveyData.length} survey responses`);
    logger.debug(`  - ${financialData.length} financial records`);
    logger.debug(`  - 3 ROI records`);
    logger.debug(`  - 3 automation rules`);
    logger.debug(`  - 3 scheduled reports`);
  } catch (error) {
    logger.error("❌ Error seeding feature data:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedFeatures()
    .then(() => {
      logger.debug("\n🎉 Done!");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("\n💥 Failed:", error);
      process.exit(1);
    });
}


