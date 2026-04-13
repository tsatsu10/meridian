/**
 * @epic-6.1-advanced-analytics - Machine Learning Processor
 * @persona-all - Generate ML-powered insights and predictions
 */
import { getAnalyticsEngine, type AnalyticsEvent, type AnalyticsMetric } from '../AnalyticsEngine';
import { logger } from '../../utils/logger';

export interface MLModel {
  id: string;
  name: string;
  type: 'classification' | 'regression' | 'clustering' | 'anomaly_detection';
  status: 'training' | 'ready' | 'failed';
  accuracy?: number;
  lastTrained: Date;
  version: string;
  features: string[];
  hyperparameters: Record<string, any>;
}

export interface MLPrediction {
  id: string;
  modelId: string;
  input: Record<string, any>;
  output: Record<string, any>;
  confidence: number;
  timestamp: Date;
}

export interface MLInsight {
  id: string;
  type: 'prediction' | 'pattern' | 'anomaly' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  data: Record<string, any>;
  modelId?: string;
  timestamp: Date;
}

export interface MLProcessorConfig {
  enableAutoTraining: boolean;
  trainingInterval: number; // hours
  minDataPoints: number;
  confidenceThreshold: number;
  maxModels: number;
}

export class MLProcessor {
  private analyticsEngine = getAnalyticsEngine();
  private models: Map<string, MLModel> = new Map();
  private predictions: Map<string, MLPrediction> = new Map();
  private insights: MLInsight[] = [];
  private config: MLProcessorConfig;
  private isProcessing: boolean = false;
  private trainingInterval?: NodeJS.Timeout;

  constructor(config: Partial<MLProcessorConfig> = {}) {
    this.config = {
      enableAutoTraining: true,
      trainingInterval: 24, // 24 hours
      minDataPoints: 1000,
      confidenceThreshold: 0.7,
      maxModels: 10,
      ...config
    };

    this.initializeDefaultModels();
  }

  private initializeDefaultModels(): void {
    // User churn prediction model
    this.createModel({
      id: 'user_churn_predictor',
      name: 'User Churn Prediction',
      type: 'classification',
      status: 'ready',
      accuracy: 0.85,
      lastTrained: new Date(),
      version: '1.0.0',
      features: ['session_duration', 'feature_usage', 'last_login', 'task_completion_rate'],
      hyperparameters: { algorithm: 'random_forest', max_depth: 10 }
    });

    // Task completion time prediction
    this.createModel({
      id: 'task_completion_predictor',
      name: 'Task Completion Time Prediction',
      type: 'regression',
      status: 'ready',
      accuracy: 0.78,
      lastTrained: new Date(),
      version: '1.0.0',
      features: ['task_complexity', 'assignee_experience', 'project_type', 'team_size'],
      hyperparameters: { algorithm: 'gradient_boosting', learning_rate: 0.1 }
    });

    // User behavior clustering
    this.createModel({
      id: 'user_behavior_clustering',
      name: 'User Behavior Clustering',
      type: 'clustering',
      status: 'ready',
      accuracy: 0.82,
      lastTrained: new Date(),
      version: '1.0.0',
      features: ['daily_active_time', 'feature_preferences', 'interaction_patterns'],
      hyperparameters: { algorithm: 'kmeans', n_clusters: 5 }
    });

    // Anomaly detection
    this.createModel({
      id: 'anomaly_detector',
      name: 'System Anomaly Detection',
      type: 'anomaly_detection',
      status: 'ready',
      accuracy: 0.91,
      lastTrained: new Date(),
      version: '1.0.0',
      features: ['response_time', 'error_rate', 'cpu_usage', 'memory_usage'],
      hyperparameters: { algorithm: 'isolation_forest', contamination: 0.1 }
    });
  }

  startProcessing(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    if (this.config.enableAutoTraining) {
      this.scheduleAutoTraining();
    }

    logger.info('ML processor started');
  }

  stopProcessing(): void {
    if (!this.isProcessing) return;
    this.isProcessing = false;

    if (this.trainingInterval) {
      clearInterval(this.trainingInterval);
      this.trainingInterval = undefined;
    }

    logger.info('ML processor stopped');
  }

  private scheduleAutoTraining(): void {
    const intervalMs = this.config.trainingInterval * 60 * 60 * 1000; // Convert hours to ms
    
    this.trainingInterval = setInterval(() => {
      this.autoTrainModels();
    }, intervalMs);

    logger.info(`Scheduled auto-training every ${this.config.trainingInterval} hours`);
  }

  private async autoTrainModels(): Promise<void> {
    logger.info('Starting auto-training of ML models');

    for (const model of this.models.values()) {
      try {
        await this.trainModel(model.id);
      } catch (error) {
        logger.error(`Failed to auto-train model ${model.name}:`, error);
      }
    }
  }

  createModel(modelData: Omit<MLModel, 'id'> & { id?: string }): string {
    const modelId = modelData.id || `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const model: MLModel = {
      ...modelData,
      id: modelId
    };

    this.models.set(modelId, model);

    // Limit number of models
    if (this.models.size > this.config.maxModels) {
      const oldestModel = Array.from(this.models.values())
        .sort((a, b) => a.lastTrained.getTime() - b.lastTrained.getTime())[0];
      this.models.delete(oldestModel.id);
    }

    logger.info(`Created ML model: ${model.name} (${modelId})`);
    return modelId;
  }

  async trainModel(modelId: string): Promise<boolean> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    try {
      model.status = 'training';
      logger.info(`Training model: ${model.name}`);

      // Simulate training process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update model with new accuracy and training time
      model.accuracy = Math.random() * 0.3 + 0.7; // Random accuracy between 0.7 and 1.0
      model.lastTrained = new Date();
      model.status = 'ready';
      model.version = this.incrementVersion(model.version);

      logger.info(`Model ${model.name} trained successfully with accuracy: ${(model.accuracy * 100).toFixed(1)}%`);
      return true;

    } catch (error) {
      model.status = 'failed';
      logger.error(`Failed to train model ${model.name}:`, error);
      return false;
    }
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2]) + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  async makePrediction(modelId: string, input: Record<string, any>): Promise<MLPrediction | null> {
    const model = this.models.get(modelId);
    if (!model || model.status !== 'ready') {
      throw new Error(`Model ${modelId} is not ready for predictions`);
    }

    const predictionId = `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Validate input features
    const missingFeatures = model.features.filter(feature => !(feature in input));
    if (missingFeatures.length > 0) {
      throw new Error(`Missing required features: ${missingFeatures.join(', ')}`);
    }

    // Generate prediction based on model type
    const output = await this.generatePrediction(model, input);
    const confidence = this.calculateConfidence(model, input);

    const prediction: MLPrediction = {
      id: predictionId,
      modelId,
      input,
      output,
      confidence,
      timestamp: new Date()
    };

    this.predictions.set(predictionId, prediction);

    // Generate insight if confidence is high enough
    if (confidence >= this.config.confidenceThreshold) {
      await this.generatePredictionInsight(prediction, model);
    }

    return prediction;
  }

  private async generatePrediction(model: MLModel, input: Record<string, any>): Promise<Record<string, any>> {
    switch (model.type) {
      case 'classification':
        return this.generateClassificationPrediction(model, input);
      case 'regression':
        return this.generateRegressionPrediction(model, input);
      case 'clustering':
        return this.generateClusteringPrediction(model, input);
      case 'anomaly_detection':
        return this.generateAnomalyPrediction(model, input);
      default:
        throw new Error(`Unsupported model type: ${model.type}`);
    }
  }

  private generateClassificationPrediction(model: MLModel, input: Record<string, any>): Record<string, any> {
    // Simulate classification prediction
    const probabilities = {
      churn: Math.random() * 0.3,
      retain: Math.random() * 0.7
    };
    
    const prediction = probabilities.churn > probabilities.retain ? 'churn' : 'retain';
    
    return {
      prediction,
      probabilities,
      class: prediction
    };
  }

  private generateRegressionPrediction(model: MLModel, input: Record<string, any>): Record<string, any> {
    // Simulate regression prediction
    const baseTime = 1000; // 1 hour base time
    const complexity = input.task_complexity || 1;
    const experience = input.assignee_experience || 1;
    
    const predictedTime = baseTime * complexity / experience + Math.random() * 500;
    
    return {
      predicted_time: Math.round(predictedTime),
      confidence_interval: [predictedTime * 0.8, predictedTime * 1.2]
    };
  }

  private generateClusteringPrediction(model: MLModel, input: Record<string, any>): Record<string, any> {
    // Simulate clustering prediction
    const cluster = Math.floor(Math.random() * 5);
    const clusterNames = ['Power User', 'Regular User', 'Occasional User', 'New User', 'Inactive User'];
    
    return {
      cluster_id: cluster,
      cluster_name: clusterNames[cluster],
      distance_to_center: Math.random() * 0.5
    };
  }

  private generateAnomalyPrediction(model: MLModel, input: Record<string, any>): Record<string, any> {
    // Simulate anomaly detection
    const isAnomaly = Math.random() < 0.1; // 10% chance of anomaly
    
    return {
      is_anomaly: isAnomaly,
      anomaly_score: Math.random(),
      severity: isAnomaly ? (Math.random() > 0.5 ? 'high' : 'medium') : 'low'
    };
  }

  private calculateConfidence(model: MLModel, input: Record<string, any>): number {
    // Simulate confidence calculation based on model accuracy and input quality
    const baseConfidence = model.accuracy || 0.8;
    const inputQuality = this.calculateInputQuality(input);
    return Math.min(1.0, baseConfidence * inputQuality);
  }

  private calculateInputQuality(input: Record<string, any>): number {
    // Calculate input quality based on completeness and value ranges
    const values = Object.values(input);
    const validValues = values.filter(v => v !== null && v !== undefined && v !== '');
    return validValues.length / values.length;
  }

  private async generatePredictionInsight(prediction: MLPrediction, model: MLModel): Promise<void> {
    const insight: MLInsight = {
      id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'prediction',
      title: `ML Prediction: ${model.name}`,
      description: this.generateInsightDescription(prediction, model),
      confidence: prediction.confidence,
      data: {
        modelId: model.id,
        modelName: model.name,
        prediction: prediction.output,
        input: prediction.input
      },
      modelId: model.id,
      timestamp: new Date()
    };

    this.insights.push(insight);
    this.analyticsEngine.emit('ml_insight', insight);
  }

  private generateInsightDescription(prediction: MLPrediction, model: MLModel): string {
    switch (model.type) {
      case 'classification':
        const classPrediction = prediction.output.prediction;
        return `Model predicts user will ${classPrediction} with ${(prediction.confidence * 100).toFixed(1)}% confidence`;
      
      case 'regression':
        const predictedTime = prediction.output.predicted_time;
        return `Model predicts task completion time of ${predictedTime} minutes with ${(prediction.confidence * 100).toFixed(1)}% confidence`;
      
      case 'clustering':
        const clusterName = prediction.output.cluster_name;
        return `User behavior classified as "${clusterName}" with ${(prediction.confidence * 100).toFixed(1)}% confidence`;
      
      case 'anomaly_detection':
        const isAnomaly = prediction.output.is_anomaly;
        return `System ${isAnomaly ? 'anomaly detected' : 'operating normally'} with ${(prediction.confidence * 100).toFixed(1)}% confidence`;
      
      default:
        return `ML model generated prediction with ${(prediction.confidence * 100).toFixed(1)}% confidence`;
    }
  }

  async detectPatterns(data: Array<{ timestamp: Date; [key: string]: any }>): Promise<MLInsight[]> {
    const patterns: MLInsight[] = [];

    // Time-based patterns
    const timePatterns = this.detectTimePatterns(data);
    patterns.push(...timePatterns);

    // Behavioral patterns
    const behaviorPatterns = this.detectBehaviorPatterns(data);
    patterns.push(...behaviorPatterns);

    // Sequential patterns
    const sequentialPatterns = this.detectSequentialPatterns(data);
    patterns.push(...sequentialPatterns);

    return patterns;
  }

  private detectTimePatterns(data: Array<{ timestamp: Date; [key: string]: any }>): MLInsight[] {
    const patterns: MLInsight[] = [];

    // Detect peak usage hours
    const hourlyActivity: Record<number, number> = {};
    for (const record of data) {
      const hour = record.timestamp.getHours();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    }

    const peakHour = Object.entries(hourlyActivity)
      .sort(([,a], [,b]) => b - a)[0];

    if (peakHour) {
      patterns.push({
        id: `time_pattern_${Date.now()}`,
        type: 'pattern',
        title: 'Peak Activity Time Detected',
        description: `Peak activity occurs at ${peakHour[0]}:00 with ${peakHour[1]} events`,
        confidence: 0.9,
        data: { peakHour: parseInt(peakHour[0]), eventCount: peakHour[1] },
        timestamp: new Date()
      });
    }

    return patterns;
  }

  private detectBehaviorPatterns(data: Array<{ timestamp: Date; [key: string]: any }>): MLInsight[] {
    const patterns: MLInsight[] = [];

    // Detect repeated actions
    const actionCounts: Record<string, number> = {};
    for (const record of data) {
      if (record.action) {
        actionCounts[record.action] = (actionCounts[record.action] || 0) + 1;
      }
    }

    const mostFrequentAction = Object.entries(actionCounts)
      .sort(([,a], [,b]) => b - a)[0];

    if (mostFrequentAction && mostFrequentAction[1] > 10) {
      patterns.push({
        id: `behavior_pattern_${Date.now()}`,
        type: 'pattern',
        title: 'Frequent Action Pattern',
        description: `Action "${mostFrequentAction[0]}" is performed ${mostFrequentAction[1]} times`,
        confidence: 0.85,
        data: { action: mostFrequentAction[0], count: mostFrequentAction[1] },
        timestamp: new Date()
      });
    }

    return patterns;
  }

  private detectSequentialPatterns(data: Array<{ timestamp: Date; [key: string]: any }>): MLInsight[] {
    const patterns: MLInsight[] = [];

    // Detect action sequences
    const sequences: Record<string, number> = {};
    for (let i = 0; i < data.length - 1; i++) {
      const current = data[i];
      const next = data[i + 1];
      
      if (current.action && next.action) {
        const sequence = `${current.action} -> ${next.action}`;
        sequences[sequence] = (sequences[sequence] || 0) + 1;
      }
    }

    const mostFrequentSequence = Object.entries(sequences)
      .sort(([,a], [,b]) => b - a)[0];

    if (mostFrequentSequence && mostFrequentSequence[1] > 5) {
      patterns.push({
        id: `sequence_pattern_${Date.now()}`,
        type: 'pattern',
        title: 'Action Sequence Pattern',
        description: `Users frequently perform "${mostFrequentSequence[0]}" (${mostFrequentSequence[1]} times)`,
        confidence: 0.8,
        data: { sequence: mostFrequentSequence[0], count: mostFrequentSequence[1] },
        timestamp: new Date()
      });
    }

    return patterns;
  }

  getModel(modelId: string): MLModel | null {
    return this.models.get(modelId) || null;
  }

  getAllModels(): MLModel[] {
    return Array.from(this.models.values());
  }

  getModelsByType(type: MLModel['type']): MLModel[] {
    return this.getAllModels().filter(model => model.type === type);
  }

  getPrediction(predictionId: string): MLPrediction | null {
    return this.predictions.get(predictionId) || null;
  }

  getPredictionsForModel(modelId: string): MLPrediction[] {
    return Array.from(this.predictions.values()).filter(p => p.modelId === modelId);
  }

  getAllPredictions(): MLPrediction[] {
    return Array.from(this.predictions.values());
  }

  getInsights(): MLInsight[] {
    return this.insights;
  }

  getInsightsByType(type: MLInsight['type']): MLInsight[] {
    return this.insights.filter(insight => insight.type === type);
  }

  deleteModel(modelId: string): boolean {
    const model = this.models.get(modelId);
    if (!model) return false;

    this.models.delete(modelId);
    
    // Delete associated predictions
    const predictions = this.getPredictionsForModel(modelId);
    for (const prediction of predictions) {
      this.predictions.delete(prediction.id);
    }

    logger.info(`Deleted ML model: ${model.name}`);
    return true;
  }

  updateConfig(newConfig: Partial<MLProcessorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Updated ML processor configuration');
  }

  getStats(): {
    totalModels: number;
    readyModels: number;
    trainingModels: number;
    failedModels: number;
    totalPredictions: number;
    totalInsights: number;
    averageConfidence: number;
  } {
    const models = this.getAllModels();
    const predictions = this.getAllPredictions();
    
    const averageConfidence = predictions.length > 0 
      ? predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length 
      : 0;

    return {
      totalModels: models.length,
      readyModels: models.filter(m => m.status === 'ready').length,
      trainingModels: models.filter(m => m.status === 'training').length,
      failedModels: models.filter(m => m.status === 'failed').length,
      totalPredictions: predictions.length,
      totalInsights: this.insights.length,
      averageConfidence
    };
  }
}

export const getMLProcessor = (config?: Partial<MLProcessorConfig>): MLProcessor => {
  return new MLProcessor(config);
}; 