export type PipelineTransformation = {
  process?: string;
  stage?: string;
  testName?: string;
  description?: string;
  before?: unknown;
  after?: unknown;
  recordedAt?: string;
};

export type PipelineProcessReport = {
  process: string;
  generatedAt?: string;
  transformationCount: number;
  transformations: PipelineTransformation[];
};

export type BaseLifecycleReport = {
  generatedAt?: string;
  testFile?: string;
  submissionId?: number | string;
  transformationCount: number;
  transformations: PipelineTransformation[];
};

export type PipelineProcessesRouteOptions = {
  reportDir?: string;
  baseReportPath?: string;
};

export type PipelineLifecycleSubscriptionResponse = {
  eventKey: string;
  organizationId: number;
  process: string;
  stage: string;
  enabled: boolean;
};
