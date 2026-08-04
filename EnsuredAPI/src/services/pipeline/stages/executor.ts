import { OcrService } from '../ocr/service';
import { SubmissionTypeService } from '../submissionType/service';
import { ClassificationService } from '../classification/service';
import { AssignmentService } from '../assignment/service';
import { ExtractionService } from '../extraction/service';
import { InsuredSubjectService } from '../insuredSubject/service';
import { LocationDiscoveryService } from '../locationDiscovery/service';
import { NormalizationService } from '../normalization/service';
import { ValidationService } from '../validation/service';
import { SchemaGenerationService } from '../schemaGeneration/service';
import { WorkflowService } from '../workflow/service';
import { PreRatingService } from '../preRating/service';
import { CapacityMatchService } from '../capacity/service';
import { OracleAttestationService } from '../oracleAttestation/service';
import { RiskComputeService } from '../riskCompute/service';
import { PreBindComplianceService } from '../preBindCompliance/service';
import { persistOcrResult } from '../ocr/persistOcrResult';

export type StageExecutor = (payload: unknown) => Promise<Record<string, unknown>>;

/**
 * Composition root for concrete stage services. It is intentionally the only
 * pipeline module that constructs stage implementations; commands depend on this
 * narrow executor port instead of every individual service.
 */
export function createStageExecutors(): Readonly<Record<string, StageExecutor>> {
  return {
    ocr: (payload) => new OcrService().process(payload, { onSuccess: persistOcrResult }),
    submissionType: (payload) => new SubmissionTypeService().process(payload),
    classification: (payload) => new ClassificationService().process(payload),
    assignment: (payload) => new AssignmentService().process(payload),
    extraction: (payload) => new ExtractionService().process(payload),
    insuredSubject: (payload) => new InsuredSubjectService().process(payload),
    locationDiscovery: (payload) => new LocationDiscoveryService().process(payload),
    normalization: (payload) => new NormalizationService().process(payload),
    validation: (payload) => new ValidationService().process(payload),
    schemaGeneration: (payload) => new SchemaGenerationService().process(payload),
    preRating: (payload) => new PreRatingService().process(payload),
    capacity: (payload) => new CapacityMatchService().process(payload),
    oracleAttestation: (payload) => new OracleAttestationService().process(payload),
    workflow: (payload) => new WorkflowService().process(payload),
    riskCompute: (payload) => new RiskComputeService().process(payload),
    preBindCompliance: (payload) => new PreBindComplianceService().process(payload),
  };
}
