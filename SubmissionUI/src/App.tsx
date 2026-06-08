import { useEffect, useMemo, useRef, useState } from 'react';

type Mode = 'board-snapshot' | 'board-config' | 'status-update' | 'custom-payload';
type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type DraftState = {
  apiOrigin: string;
  authToken: string;
  mode: Mode;
  boardConfigJson: string;
  submissionId: string;
  nextStatus: string;
  customMethod: RequestMethod;
  customPath: string;
  customBody: string;
  templateId: string;
  rabbitQueue: string;
};

type UploadedAttachment = {
  id: string;
  file: File;
  path: string;
  size: number;
};

type AttachmentPreview = {
  path: string;
  size: number;
  type: string;
  modifiedAt: number;
};

type TemplateDefinition = {
  id: string;
  label: string;
  description: string;
  body: Record<string, unknown>;
};

type BuiltRequest = {
  title: string;
  method: RequestMethod;
  url: string;
  headers: Record<string, string>;
  body: BodyInit | null;
  bodyText: string | null;
  multipartPayloadText: string | null;
  multipart: boolean;
  formFields: Record<string, string>;
  attachments: UploadedAttachment[];
  error: string | null;
};

type ResponseRecord = {
  at: string;
  mode: Mode;
  method: RequestMethod;
  url: string;
  status?: number;
  statusText?: string;
  body: unknown;
  error?: string;
};

const STORAGE_KEY = 'submission-ui-draft-v1';
const DEFAULT_API_ORIGIN = 'http://localhost:3001';
const DASHBOARD_PATH = '/api/underwriting/submissions';
const BOARD_CONFIG_PATH = '/api/underwriting/submissions/config';
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const DEFAULT_RABBITMQ_RELAY_ORIGIN = 'http://localhost:30026';
const DEFAULT_RABBITMQ_QUEUE = 'ingest_submissions';
const RABBITMQ_PUBLISH_PATH = '/publish';
const DEFAULT_SUBMISSION_PATH = '/api/submissions';

const DEFAULT_BOARD_CONFIG = {
  eyebrow: 'Submission lab',
  title: 'Configured Live Queue',
  description: 'SubmissionUI generated queue configuration for the underwriting API.',
  header: {
    titleFieldKey: 'submissionNumber',
    subtitleFieldKey: 'cedent',
    badgeFieldKey: 'priority',
  },
  stages: [
    {
      key: 'intake',
      label: 'Intake',
      statuses: ['draft', 'submitted'],
      accent: '#4b8eff',
      background: 'rgba(75, 142, 255, 0.12)',
      border: 'rgba(75, 142, 255, 0.28)',
      description: 'Fresh submissions entering the pipeline.',
      emptyState: 'No intake submissions yet.',
    },
    {
      key: 'analysis',
      label: 'Analysis',
      statuses: ['modeling'],
      accent: '#f59e0b',
      background: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.28)',
      description: 'Modeling, validation, and underwriting review.',
      emptyState: 'No submissions in analysis yet.',
    },
    {
      key: 'pricing',
      label: 'Pricing',
      statuses: ['priced'],
      accent: '#22c55e',
      background: 'rgba(34, 197, 94, 0.12)',
      border: 'rgba(34, 197, 94, 0.28)',
      description: 'Pricing and terms are being finalized.',
      emptyState: 'No submissions in pricing yet.',
    },
    {
      key: 'closed',
      label: 'Closed',
      statuses: ['approved', 'rejected'],
      accent: '#a78bfa',
      background: 'rgba(167, 139, 250, 0.12)',
      border: 'rgba(167, 139, 250, 0.28)',
      description: 'Approved and declined submissions ready for downstream action.',
      emptyState: 'No closed submissions yet.',
    },
  ],
};

const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  {
    id: 'broker-csv',
    label: 'Broker CSV upload',
    description: 'Matches the documented pipeline shape with raw rows and column transforms.',
    body: {
      submissionId: 'sub-2026-05-14-0001',
      receivedAt: '2026-05-14T14:12:00Z',
      sourceTitle: 'Broker CSV Upload',
      sourceType: 'csv',
      sourceLocation: 's3://ensured-bucket/uploads/broker-2026-05-14.csv',
      rawData: [
        { policy_no: 'P-1001', premium_amt: '1000.00', insured_name: 'Acme Co' },
        { policy_no: 'P-1002', premium_amt: '2500', insured_name: 'Beta LLC' },
      ],
      columns: [
        {
          name: 'policy_id',
          originalName: 'policy_no',
          dataType: 'string',
          isKey: true,
          isSensitive: false,
          rawSampleValues: ['P-1001', 'P-1002'],
          transformations: [
            {
              name: 'trim_whitespace',
              type: 'cleanse',
              description: 'Trim leading and trailing whitespace.',
              appliedBy: 'submission-ui',
              appliedAt: '2026-05-14T14:12:05Z',
              outputName: 'policy_id',
              outputType: 'string',
            },
          ],
        },
        {
          name: 'premium',
          originalName: 'premium_amt',
          dataType: 'number',
          isKey: false,
          isSensitive: false,
          rawSampleValues: ['1000.00', '2500'],
          transformations: [
            {
              name: 'cast_to_number',
              type: 'cast',
              description: 'Cast string values to decimal.',
              parameters: { scale: 2 },
              appliedBy: 'submission-ui',
              appliedAt: '2026-05-14T14:12:20Z',
              outputName: 'premium',
              outputType: 'number',
            },
          ],
        },
      ],
      pipeline: [
        { step: 'ingest', status: 'completed', startedAt: '2026-05-14T14:12:00Z', completedAt: '2026-05-14T14:12:06Z' },
        {
          step: 'validate',
          status: 'completed',
          startedAt: '2026-05-14T14:12:06Z',
          completedAt: '2026-05-14T14:12:10Z',
          details: 'All rows passed basic schema validation.',
        },
        { step: 'transform', status: 'completed', startedAt: '2026-05-14T14:12:10Z', completedAt: '2026-05-14T14:12:25Z' },
        { step: 'load', status: 'pending' },
      ],
      schemaVersion: '1.0',
      pipelineVersion: '2026-05-lab',
    },
  },
  {
    id: 'bordereaux',
    label: 'Reinsurance bordereaux',
    description: 'A denser payload with treaty details and aggregated financial facts.',
    body: {
      submissionId: 'sub-2026-05-14-0002',
      receivedAt: '2026-05-14T15:04:00Z',
      sourceTitle: 'Reinsurance Bordereaux',
      sourceType: 'xlsx',
      sourceLocation: 's3://ensured-bucket/uploads/reinsurance-bordereaux.xlsx',
      insuredParty: 'Northshore Manufacturing',
      treaty: '2026 Excess of Loss',
      currency: 'USD',
      metrics: {
        grossWrittenPremium: 12450000,
        exposure: 182000000,
        attachmentPoint: 2500000,
        layers: 4,
      },
      rawData: [
        { risk_id: 'R-001', premium: '320000', loss_ratio: '0.14' },
        { risk_id: 'R-002', premium: '420000', loss_ratio: '0.19' },
      ],
      pipeline: [
        { step: 'ingest', status: 'completed', startedAt: '2026-05-14T15:04:00Z', completedAt: '2026-05-14T15:04:03Z' },
        { step: 'normalize', status: 'completed', startedAt: '2026-05-14T15:04:03Z', completedAt: '2026-05-14T15:04:12Z' },
        { step: 'load', status: 'queued' },
      ],
      schemaVersion: '1.0',
      pipelineVersion: '2026-05-lab',
    },
  },
  {
    id: 'renewal-pack',
    label: 'Renewal pack',
    description: 'A compact packet with attachments and underwriting notes.',
    body: {
      submissionId: 'sub-2026-05-14-0003',
      receivedAt: '2026-05-14T16:25:00Z',
      sourceTitle: 'Renewal Submission Pack',
      sourceType: 'json',
      sourceLocation: 'https://api.ensured.local/uploads/renewal-pack.json',
      insuredName: 'Continental Logistics',
      renewalYear: 2027,
      attachments: [
        { fileName: 'loss-runs.pdf', contentType: 'application/pdf', pages: 18 },
        { fileName: 'statement-of-values.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', rows: 142 },
      ],
      underwritingNotes: [
        'Client wants broader catastrophe coverage.',
        'Mid-term endorsements should remain visible to underwriters.',
      ],
      pipeline: [
        { step: 'ingest', status: 'completed', startedAt: '2026-05-14T16:25:00Z', completedAt: '2026-05-14T16:25:05Z' },
        { step: 'validate', status: 'completed', startedAt: '2026-05-14T16:25:05Z', completedAt: '2026-05-14T16:25:14Z' },
        { step: 'enrich', status: 'running', startedAt: '2026-05-14T16:25:14Z' },
      ],
      schemaVersion: '1.0',
      pipelineVersion: '2026-05-lab',
    },
  },
];

const MODE_DEFINITIONS: Record<Mode, { label: string; title: string; description: string; helper: string }> = {
  'board-snapshot': {
    label: 'Queue snapshot',
    title: 'Pull the live underwriting board',
    description: 'GET the current live queue state and inspect the rendered board config.',
    helper: 'Use this when you want a clean read of the board without altering the backend.',
  },
  'board-config': {
    label: 'Board config',
    title: 'Update the board configuration',
    description: 'PUT a custom board definition to exercise the backend-configured layout.',
    helper: 'This targets the real underwriting board config endpoint and accepts arbitrary JSON.',
  },
  'status-update': {
    label: 'Status advance',
    title: 'Move a submission to a new status',
    description: 'PATCH a single submission and advance it through the configured lifecycle.',
    helper: 'Point the submission id at a real record and choose a status allowed by the backend.',
  },
  'custom-payload': {
    label: 'RabbitMQ station',
    title: 'Publish a submission bundle to RabbitMQ',
    description: 'POST the composed payload bundle to the local relay, which forwards it to the queue.',
    helper: 'Use this for raw submission payloads and uploads without changing EnsuredAPI.',
  },
};

const DEFAULT_DRAFT: DraftState = {
  apiOrigin: DEFAULT_API_ORIGIN,
  authToken: '',
  mode: 'board-config',
  boardConfigJson: JSON.stringify(DEFAULT_BOARD_CONFIG, null, 2),
  submissionId: '1',
  nextStatus: 'modeling',
  customMethod: 'POST',
  customPath: DEFAULT_SUBMISSION_PATH,
  customBody: JSON.stringify(TEMPLATE_DEFINITIONS[0].body, null, 2),
  templateId: TEMPLATE_DEFINITIONS[0].id,
  rabbitQueue: DEFAULT_RABBITMQ_QUEUE,
};

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? '';
}

function parseJson(text: string): { value: unknown; error: string | null } {
  try {
    return { value: JSON.parse(text), error: null };
  } catch (error) {
    return { value: null, error: error instanceof Error ? error.message : 'Invalid JSON' };
  }
}

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, '');
}

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    return '/';
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function buildUrl(origin: string, path: string): string {
  return `${normalizeOrigin(origin)}${normalizePath(path)}`;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const decimals = unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

function attachmentPath(file: File): string {
  return file.webkitRelativePath?.trim() || file.name;
}

function attachmentSignature(file: File): string {
  return `${attachmentPath(file)}::${file.size}::${file.lastModified}`;
}

function buildAttachmentPreview(attachments: UploadedAttachment[]): { uploadType: string; totalBytes: number; attachments: AttachmentPreview[] } {
  return {
    uploadType: 'multipart/form-data',
    totalBytes: attachments.reduce((sum, item) => sum + item.size, 0),
    attachments: attachments.map((item) => ({
      path: item.path,
      size: item.size,
      type: item.file.type || 'application/octet-stream',
      modifiedAt: item.file.lastModified,
    })),
  };
}

function buildRabbitMqEnvelope(draft: DraftState, attachments: UploadedAttachment[], payload: unknown) {
  const attachmentPreview = buildAttachmentPreview(attachments);

  return {
    transport: 'submission-ui',
    queue: draft.rabbitQueue.trim() || DEFAULT_RABBITMQ_QUEUE,
    sourceMethod: draft.customMethod,
    sourcePath: normalizePath(draft.customPath),
    templateId: draft.templateId,
    payload,
    attachments: attachmentPreview.attachments,
  };
}

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function buildCurl(request: BuiltRequest): string {
  const parts = [`curl -X ${request.method} ${shellEscape(request.url)}`];

  Object.entries(request.headers).forEach(([name, value]) => {
    parts.push(`-H ${shellEscape(`${name}: ${value}`)}`);
  });

  if (request.multipart) {
    Object.entries(request.formFields).forEach(([name, value]) => {
      parts.push(`-F ${shellEscape(`${name}=${value}`)}`);
    });

    if (request.multipartPayloadText) {
      parts.push(`-F ${shellEscape(`payload=${request.multipartPayloadText}`)}`);
    }

    request.attachments.forEach((attachment) => {
      const typeSuffix = attachment.file.type ? `;type=${attachment.file.type}` : '';
      parts.push(`-F ${shellEscape(`files=@${attachment.path}${typeSuffix}`)}`);
    });

    return parts.join(' \\\n+  ');
  }

  if (request.bodyText) {
    parts.push(`--data-raw ${shellEscape(request.bodyText)}`);
  }

  return parts.join(' \\\n+  ');
}

function loadDraft(): DraftState {
  if (typeof window === 'undefined') {
    return DEFAULT_DRAFT;
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return DEFAULT_DRAFT;
  }

  try {
    const parsed = JSON.parse(saved) as Partial<DraftState>;
    return {
      ...DEFAULT_DRAFT,
      ...parsed,
      apiOrigin: typeof parsed.apiOrigin === 'string' && parsed.apiOrigin.trim() ? parsed.apiOrigin : DEFAULT_DRAFT.apiOrigin,
      authToken: typeof parsed.authToken === 'string' ? parsed.authToken : DEFAULT_DRAFT.authToken,
      mode: parsed.mode === 'board-snapshot' || parsed.mode === 'board-config' || parsed.mode === 'status-update' || parsed.mode === 'custom-payload' ? parsed.mode : DEFAULT_DRAFT.mode,
      boardConfigJson: typeof parsed.boardConfigJson === 'string' && parsed.boardConfigJson.trim() ? parsed.boardConfigJson : DEFAULT_DRAFT.boardConfigJson,
      submissionId: typeof parsed.submissionId === 'string' && parsed.submissionId.trim() ? parsed.submissionId : DEFAULT_DRAFT.submissionId,
      nextStatus: typeof parsed.nextStatus === 'string' && parsed.nextStatus.trim() ? parsed.nextStatus : DEFAULT_DRAFT.nextStatus,
      customMethod: parsed.customMethod === 'GET' || parsed.customMethod === 'POST' || parsed.customMethod === 'PUT' || parsed.customMethod === 'PATCH' || parsed.customMethod === 'DELETE' ? parsed.customMethod : DEFAULT_DRAFT.customMethod,
      customPath: typeof parsed.customPath === 'string' && parsed.customPath.trim() ? parsed.customPath : DEFAULT_DRAFT.customPath,
      customBody: typeof parsed.customBody === 'string' && parsed.customBody.trim() ? parsed.customBody : DEFAULT_DRAFT.customBody,
      templateId: TEMPLATE_DEFINITIONS.some((template) => template.id === parsed.templateId) ? String(parsed.templateId) : DEFAULT_DRAFT.templateId,
      rabbitQueue: typeof parsed.rabbitQueue === 'string' && parsed.rabbitQueue.trim() ? parsed.rabbitQueue : DEFAULT_DRAFT.rabbitQueue,
    };
  } catch {
    return DEFAULT_DRAFT;
  }
}

function buildRequest(draft: DraftState, attachments: UploadedAttachment[]): BuiltRequest {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  const token = draft.authToken.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (draft.mode === 'board-snapshot') {
    return {
      title: 'Queue snapshot',
      method: 'GET',
      url: buildUrl(draft.apiOrigin, DASHBOARD_PATH),
      headers,
      body: null,
      bodyText: null,
      multipartPayloadText: null,
      multipart: false,
      formFields: {},
      attachments: [],
      error: null,
    };
  }

  if (draft.mode === 'board-config') {
    const parsed = parseJson(draft.boardConfigJson);
    return {
      title: 'Board configuration',
      method: 'PUT',
      url: buildUrl(draft.apiOrigin, BOARD_CONFIG_PATH),
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: parsed.error ? null : prettyJson(parsed.value),
      bodyText: parsed.error ? null : prettyJson(parsed.value),
      multipartPayloadText: null,
      multipart: false,
      formFields: {},
      attachments: [],
      error: parsed.error,
    };
  }

  if (draft.mode === 'status-update') {
    return {
      title: 'Status update',
      method: 'PATCH',
      url: buildUrl(draft.apiOrigin, `${DASHBOARD_PATH}/${draft.submissionId}/status`),
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: prettyJson({ status: draft.nextStatus }),
      bodyText: prettyJson({ status: draft.nextStatus }),
      multipartPayloadText: null,
      multipart: false,
      formFields: {},
      attachments: [],
      error: null,
    };
  }

  const parsed = parseJson(draft.customBody);
  const publishUrl = buildUrl(DEFAULT_RABBITMQ_RELAY_ORIGIN, RABBITMQ_PUBLISH_PATH);
  if (parsed.error) {
    return {
      title: 'RabbitMQ publish',
      method: 'POST',
      url: publishUrl,
      headers: {
        Accept: 'application/json',
      },
      body: null,
      bodyText: null,
      multipartPayloadText: null,
      multipart: false,
      formFields: {},
      attachments: [],
      error: parsed.error,
    };
  }

  const envelope = buildRabbitMqEnvelope(draft, attachments, parsed.value);
  const formFields = {
    transport: envelope.transport,
    queue: envelope.queue,
    sourceMethod: envelope.sourceMethod,
    sourcePath: envelope.sourcePath,
    templateId: envelope.templateId,
  };

  if (attachments.length > 0) {
    const multipartPayloadText = prettyJson(parsed.value);
    const formData = new FormData();
    Object.entries(formFields).forEach(([name, value]) => {
      formData.append(name, value);
    });
    formData.append('payload', multipartPayloadText);

    attachments.forEach((attachment) => {
      formData.append('files', attachment.file, attachment.path);
    });

    return {
      title: 'RabbitMQ upload bundle',
      method: 'POST',
      url: publishUrl,
      headers: {
        Accept: 'application/json',
      },
      body: formData,
      bodyText: prettyJson(envelope),
      multipartPayloadText,
      multipart: true,
      formFields,
      attachments,
      error: null,
    };
  }

  return {
    title: 'RabbitMQ publish',
    method: 'POST',
    url: publishUrl,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: prettyJson(envelope),
    bodyText: prettyJson(envelope),
    multipartPayloadText: null,
    multipart: false,
    formFields: {},
    attachments: [],
    error: parsed.error,
  };
}

function renderBody(body: unknown): string {
  if (body === null || typeof body === 'undefined') {
    return 'No response body.';
  }

  if (typeof body === 'string') {
    return body;
  }

  return prettyJson(body);
}

function App() {
  const [draft, setDraft] = useState<DraftState>(loadDraft);
  const [lastResponse, setLastResponse] = useState<ResponseRecord | null>(null);
  const [history, setHistory] = useState<ResponseRecord[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [attachmentNotice, setAttachmentNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  const template = useMemo(
    () => TEMPLATE_DEFINITIONS.find((entry) => entry.id === draft.templateId) ?? TEMPLATE_DEFINITIONS[0],
    [draft.templateId],
  );

  const attachmentTotalBytes = useMemo(() => attachments.reduce((sum, item) => sum + item.size, 0), [attachments]);
  const request = useMemo(() => buildRequest(draft, attachments), [attachments, draft]);
  const modeDefinition = MODE_DEFINITIONS[draft.mode];

  function updateAttachmentNotice(nextAdded: number, nextSkipped: number) {
    if (nextAdded === 0 && nextSkipped === 0) {
      setAttachmentNotice(null);
      return;
    }

    if (nextSkipped > 0 && nextAdded > 0) {
      setAttachmentNotice(`Added ${nextAdded} item${nextAdded === 1 ? '' : 's'} and skipped ${nextSkipped} item${nextSkipped === 1 ? '' : 's'} to stay within the 50 MB limit.`);
      return;
    }

    if (nextSkipped > 0) {
      setAttachmentNotice(`No items were added because the selected files would exceed the 50 MB limit.`);
      return;
    }

    setAttachmentNotice(`Added ${nextAdded} item${nextAdded === 1 ? '' : 's'} to the upload bundle.`);
  }

  function addAttachments(files: File[]) {
    if (files.length === 0) {
      return;
    }

    const existingKeys = new Set(attachments.map((item) => item.id));
    const nextAttachments = [...attachments];
    let nextTotalBytes = attachmentTotalBytes;
    let nextAdded = 0;
    let nextSkipped = 0;

    files.forEach((file) => {
      const path = attachmentPath(file);
      const id = attachmentSignature(file);

      if (existingKeys.has(id)) {
        return;
      }

      if (file.size > MAX_UPLOAD_BYTES || nextTotalBytes + file.size > MAX_UPLOAD_BYTES) {
        nextSkipped += 1;
        return;
      }

      nextAttachments.push({
        id,
        file,
        path,
        size: file.size,
      });
      existingKeys.add(id);
      nextTotalBytes += file.size;
      nextAdded += 1;
    });

    if (nextAdded > 0) {
      setAttachments(nextAttachments);
    }

    updateAttachmentNotice(nextAdded, nextSkipped);
  }

  function handleAttachmentSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    addAttachments(selectedFiles);
    event.target.value = '';
  }

  function clearAttachments() {
    setAttachments([]);
    setAttachmentNotice(null);
  }

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((item) => item.id !== id));
    setAttachmentNotice(null);
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function openFolderPicker() {
    folderInputRef.current?.click();
  }

  async function handleCopy(text: string) {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(text);
  }

  async function handleSend() {
    if (request.error) {
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body ?? undefined,
      });

      const responseText = await response.text();
      let parsedBody: unknown = responseText;
      if (responseText.trim()) {
        try {
          parsedBody = JSON.parse(responseText) as unknown;
        } catch {
          parsedBody = responseText;
        }
      } else {
        parsedBody = null;
      }

      const record: ResponseRecord = {
        at: new Date().toISOString(),
        mode: draft.mode,
        method: request.method,
        url: request.url,
        status: response.status,
        statusText: response.statusText,
        body: parsedBody,
      };

      setLastResponse(record);
      setHistory((current) => [record, ...current].slice(0, 5));
    } catch (error) {
      const record: ResponseRecord = {
        at: new Date().toISOString(),
        mode: draft.mode,
        method: request.method,
        url: request.url,
        error: error instanceof Error ? error.message : 'Request failed',
        body: null,
      };

      setLastResponse(record);
      setHistory((current) => [record, ...current].slice(0, 5));
    } finally {
      setIsSending(false);
    }
  }

  function setMode(nextMode: Mode) {
    setDraft((current) => {
      if (nextMode === 'board-snapshot') {
        return { ...current, mode: nextMode };
      }

      if (nextMode === 'board-config') {
        return { ...current, mode: nextMode, customMethod: 'PUT', customPath: BOARD_CONFIG_PATH };
      }

      if (nextMode === 'status-update') {
        return { ...current, mode: nextMode, customMethod: 'PATCH', customPath: `${DASHBOARD_PATH}/${current.submissionId}/status` };
      }

      return { ...current, mode: nextMode, customMethod: 'POST', customPath: DEFAULT_SUBMISSION_PATH };
    });
  }

  function applyTemplate(templateId: string) {
    const nextTemplate = TEMPLATE_DEFINITIONS.find((entry) => entry.id === templateId) ?? TEMPLATE_DEFINITIONS[0];
    setDraft((current) => ({
      ...current,
      templateId: nextTemplate.id,
      customBody: prettyJson(nextTemplate.body),
    }));
  }

  return (
    <div className="app-shell">
      <div className="shell">
        <header className="hero fade-in">
          <section className="hero-copy">
            <p className="eyebrow">SubmissionUI / root frontend</p>
            <h1>Build, shape, and publish submission payloads against the marketplace stack.</h1>
            <p>
              This standalone React app lives at the project root so you can exercise different request shapes without touching EnsuredUI or EnsuredAPI.
              Queue snapshots, board config updates, and status changes still hit the API, while custom payloads publish to RabbitMQ through a local relay.
            </p>
            <div className="badge-row">
              <div className="badge">
                API origin <strong>{draft.apiOrigin}</strong>
              </div>
              <div className="badge">
                Mode <strong>{modeDefinition.label}</strong>
              </div>
              <div className="badge">
                Template <strong>{template.label}</strong>
              </div>
              <div className="badge">
                Queue <strong>{draft.rabbitQueue || DEFAULT_RABBITMQ_QUEUE}</strong>
              </div>
            </div>
          </section>
          <aside className="hero-panel">
            <div>
              <p className="eyebrow">Target</p>
              <div className="status-line">
                <span className={`pill ${request.error ? 'warn' : 'ok'}`}>{request.method}</span>
                <span className="pill">{request.url}</span>
              </div>
              <p className="footer-note">Default API origin is `http://localhost:3001`. Custom payloads publish through the local relay at `http://localhost:30026/publish`.</p>
              <p className="footer-note">Add a bearer token when the endpoint requires organization-scoped access.</p>
            </div>
            <div className="preview-stack">
              <div className="history-item">
                <strong>{history.length} recorded responses</strong>
                <span>{lastResponse ? `Last reply ${lastResponse.status ?? 'error'} from ${lastResponse.url}` : 'No request has been sent yet.'}</span>
              </div>
              <div className="history-item">
                <strong>{modeDefinition.title}</strong>
                <span>{modeDefinition.description}</span>
              </div>
            </div>
          </aside>
        </header>

        <main className="dashboard">
          <section className="section panel">
            <div className="preview-head">
              <div>
                <p className="eyebrow">Request builder</p>
                <h2>Compose the payload from the form</h2>
              </div>
            </div>

            <div className="field-grid">
              <label className="field">
                <span>API origin</span>
                <input
                  className="input"
                  value={draft.apiOrigin}
                  onChange={(event) => setDraft((current) => ({ ...current, apiOrigin: event.target.value }))}
                  placeholder="http://localhost:3001"
                />
              </label>

              <label className="field">
                <span>Bearer token</span>
                <input
                  className="input"
                  value={draft.authToken}
                  onChange={(event) => setDraft((current) => ({ ...current, authToken: event.target.value }))}
                  placeholder="JWT with userId claim"
                />
              </label>

              <div className="field">
                <span>Request mode</span>
                <div className="tab-row">
                  {(Object.keys(MODE_DEFINITIONS) as Mode[]).map((mode) => (
                    <button key={mode} type="button" className="tab" data-active={draft.mode === mode} onClick={() => setMode(mode)}>
                      {MODE_DEFINITIONS[mode].label}
                    </button>
                  ))}
                </div>
                <p className="mini-note">{modeDefinition.helper}</p>
              </div>

              {draft.mode === 'board-snapshot' ? (
                <div className="history-item">
                  <strong>Queue snapshot</strong>
                  <span>This request has no body. It reads the live underwriting board and returns the backend-configured layout and items.</span>
                </div>
              ) : null}

              {draft.mode === 'board-config' ? (
                <>
                  <label className="field">
                    <span>Board config JSON</span>
                    <textarea
                      className="textarea"
                      value={draft.boardConfigJson}
                      onChange={(event) => setDraft((current) => ({ ...current, boardConfigJson: event.target.value }))}
                    />
                  </label>
                  <div className="toolbar">
                    <button type="button" className="button ghost" onClick={() => setDraft((current) => ({ ...current, boardConfigJson: JSON.stringify(DEFAULT_BOARD_CONFIG, null, 2) }))}>
                      Reset config
                    </button>
                    <button type="button" className="button ghost" onClick={() => setDraft((current) => ({ ...current, boardConfigJson: JSON.stringify({ ...DEFAULT_BOARD_CONFIG, title: 'Configured Live Queue - lab' }, null, 2) }))}>
                      Load variant
                    </button>
                  </div>
                </>
              ) : null}

              {draft.mode === 'status-update' ? (
                <>
                  <label className="field">
                    <span>Submission id</span>
                    <input
                      className="input"
                      value={draft.submissionId}
                      onChange={(event) => setDraft((current) => ({ ...current, submissionId: event.target.value }))}
                      placeholder="1"
                    />
                  </label>

                  <label className="field">
                    <span>New status</span>
                    <input
                      className="input"
                      value={draft.nextStatus}
                      onChange={(event) => setDraft((current) => ({ ...current, nextStatus: event.target.value }))}
                      placeholder="modeling"
                    />
                  </label>
                </>
              ) : null}

              {draft.mode === 'custom-payload' ? (
                <>
                  <div className="history-item">
                    <strong>RabbitMQ station</strong>
                    <span>The fields below become message metadata. The browser posts them to the local relay, which publishes the payload bundle and any uploads to the queue.</span>
                  </div>

                  <div className="field">
                    <span>Templates</span>
                    <div className="template-grid">
                      {TEMPLATE_DEFINITIONS.map((entry) => (
                        <button key={entry.id} type="button" className="template-card" onClick={() => applyTemplate(entry.id)}>
                          <div className="title">
                            <span>{entry.label}</span>
                            {draft.templateId === entry.id ? <span className="pill ok">Selected</span> : <span className="pill">Load</span>}
                          </div>
                          <p>{entry.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="field-grid">
                    <label className="field">
                      <span>Queue</span>
                      <input
                        className="input"
                        value={draft.rabbitQueue}
                        onChange={(event) => setDraft((current) => ({ ...current, rabbitQueue: event.target.value }))}
                        placeholder={DEFAULT_RABBITMQ_QUEUE}
                      />
                    </label>

                    <label className="field">
                      <span>Source method</span>
                      <select
                        className="select"
                        value={draft.customMethod}
                        onChange={(event) => setDraft((current) => ({ ...current, customMethod: event.target.value as RequestMethod }))}
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="PATCH">PATCH</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </label>

                    <label className="field">
                      <span>Source path</span>
                      <input
                        className="input"
                        value={draft.customPath}
                        onChange={(event) => setDraft((current) => ({ ...current, customPath: event.target.value }))}
                        placeholder="/api/submissions"
                      />
                    </label>
                  </div>

                  <label className="field">
                    <span>Payload JSON</span>
                    <textarea
                      className="textarea"
                      value={draft.customBody}
                      onChange={(event) => setDraft((current) => ({ ...current, customBody: event.target.value }))}
                    />
                    <p className="mini-note">The relay wraps this payload together with the queue and source metadata before publishing it to RabbitMQ.</p>
                  </label>
                </>
              ) : null}

              <div className="field upload-panel">
                <div className="upload-header">
                  <div>
                    <span>Files &amp; folders</span>
                    <p className="mini-note">Upload files or a folder tree up to 50 MB total. Attachments are sent to the RabbitMQ relay alongside the JSON payload.</p>
                  </div>
                  <div className="toolbar upload-actions">
                    <button type="button" className="button ghost" onClick={openFilePicker}>Add files</button>
                    <button type="button" className="button ghost" onClick={openFolderPicker}>Add folder</button>
                    <button type="button" className="button ghost" onClick={clearAttachments} disabled={attachments.length === 0}>Clear uploads</button>
                  </div>
                </div>

                <input ref={fileInputRef} className="upload-input" type="file" multiple onChange={handleAttachmentSelection} aria-label="Add files" />
                <input
                  ref={(node) => {
                    folderInputRef.current = node;
                    if (node) {
                      node.setAttribute('webkitdirectory', 'true');
                      node.setAttribute('directory', 'true');
                    }
                  }}
                  className="upload-input"
                  type="file"
                  multiple
                  onChange={handleAttachmentSelection}
                  aria-label="Add folder"
                />

                <div className="upload-summary">
                  <div className="upload-meter" aria-hidden="true">
                    <div className="upload-meter-fill" style={{ width: `${Math.min(100, (attachmentTotalBytes / MAX_UPLOAD_BYTES) * 100)}%` }} />
                  </div>
                  <div className="upload-summary-row">
                    <span>{attachments.length} item{attachments.length === 1 ? '' : 's'} selected</span>
                    <span>{formatBytes(attachmentTotalBytes)} / 50 MB</span>
                  </div>
                </div>

                {attachmentNotice ? (
                  <div className="history-item upload-message">
                    <strong>Upload status</strong>
                    <span>{attachmentNotice}</span>
                  </div>
                ) : null}

                <div className="upload-list">
                  {attachments.length > 0 ? (
                    attachments.map((item) => (
                      <div key={item.id} className="upload-item history-item">
                        <div className="upload-item-main">
                          <strong>{item.path}</strong>
                          <span>
                            {formatBytes(item.size)} · {item.file.type || 'application/octet-stream'}
                          </span>
                        </div>
                        <button type="button" className="button ghost danger upload-remove" onClick={() => removeAttachment(item.id)}>
                          Remove
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="upload-empty history-item">
                      <strong>No files selected</strong>
                      <span>Add one or more files, or pick a folder to include its contents and relative paths.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="section">
            <section className="panel preview">
              <div className="preview-head">
                <div>
                  <p className="eyebrow">Request preview</p>
                  <h2>{request.title}</h2>
                </div>
                <span className={`pill ${request.error ? 'warn' : 'ok'}`}>{request.method}</span>
              </div>

              {request.error ? <div className="history-item"><strong>Invalid JSON</strong><span>{request.error}</span></div> : null}

              <div className="preview-row">
                <div className="preview-block">
                  <h3>URL</h3>
                  <pre>{request.url}</pre>
                </div>

                <div className="preview-block">
                  <h3>Headers</h3>
                  <pre>{prettyJson(request.headers)}</pre>
                </div>
              </div>

              <div className="preview-block">
                <h3>{draft.mode === 'custom-payload' ? (request.multipart ? 'Multipart publish preview' : 'RabbitMQ message') : request.multipart ? 'Multipart payload preview' : 'Body'}</h3>
                <pre>{request.bodyText ?? 'No request body.'}</pre>
              </div>

              {request.multipart ? (
                <div className="history-item">
                  <strong>Multipart upload</strong>
                  <span>The browser will send the JSON payload plus each selected file or folder item to the local relay, which forwards them to RabbitMQ.</span>
                </div>
              ) : null}

              <div className="toolbar">
                <button type="button" className="button ghost" onClick={() => {
                  if (request.bodyText) {
                    void handleCopy(request.bodyText);
                  }
                }} disabled={!request.bodyText}>
                  Copy body
                </button>
                <button type="button" className="button ghost" onClick={() => void handleCopy(buildCurl(request))}>
                  Copy cURL
                </button>
                <button type="button" className="button primary" onClick={() => void handleSend()} disabled={Boolean(request.error) || isSending}>
                  {isSending ? 'Sending...' : 'Send request'}
                </button>
              </div>
            </section>

            <section className="panel preview">
              <div className="preview-head">
                <div>
                  <p className="eyebrow">Response</p>
                  <h2>{lastResponse ? (lastResponse.error ? 'Request failed' : `${lastResponse.status} ${lastResponse.statusText ?? ''}`.trim()) : 'Waiting for a response'}</h2>
                </div>
                {lastResponse ? <span className="pill">{new Date(lastResponse.at).toLocaleTimeString()}</span> : null}
              </div>

              {lastResponse ? (
                <>
                  <div className="preview-row">
                    <div className="preview-block">
                      <h3>Request</h3>
                      <pre>{`${lastResponse.method} ${lastResponse.url}`}</pre>
                    </div>
                    <div className="preview-block">
                      <h3>Mode</h3>
                      <pre>{MODE_DEFINITIONS[lastResponse.mode].label}</pre>
                    </div>
                  </div>

                  <div className="preview-block">
                    <h3>Body</h3>
                    <pre>{lastResponse.error ? lastResponse.error : renderBody(lastResponse.body)}</pre>
                  </div>
                </>
              ) : (
                <p className="mini-note">Send a request to capture the API reply here. Successful responses are saved in a small local history below.</p>
              )}

              <div className="history">
                {history.map((entry) => (
                  <div key={`${entry.at}-${entry.url}`} className="history-item">
                    <strong>{entry.error ? 'Failed request' : `${entry.status} ${entry.statusText ?? ''}`.trim()}</strong>
                    <span>
                      {MODE_DEFINITIONS[entry.mode].label} · {entry.method} · {new Date(entry.at).toLocaleString()}
                    </span>
                    <span>{entry.url}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;