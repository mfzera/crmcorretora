import { adminAuth } from '@/infra/auth/admin-auth';

interface GlobalStats {
  totalTenants: number;
  totalUsers: number;
  totalClientes: number;
  totalArquivos: number;
  totalStorage: number;
  activeBackups: number;
}

interface UsageHistory {
  date: string;
  storage: number;
  requests: number;
}

export interface TenantSummary {
  id: string;
  nome: string;
  clienteCount: number;
  userCount: number;
}

export interface HttpMetricsHour {
  hour: string;
  s2xx: number;
  s4xx: number;
  s5xx: number;
}

export interface HttpMetricsResponse {
  available: boolean;
  last24h: {
    total: number;
    s2xx: number;
    s4xx: number;
    s5xx: number;
    errorRate: number | null;
  } | null;
  hourly: HttpMetricsHour[];
}

export interface ChartsMonthlyRevenue {
  month: string;
  total: number;
  count: number;
}

export interface ChartsMonthlyPremium {
  month: string;
  total: number;
  count: number;
}

export interface ChartsDailyBackup {
  day: string;
  concluido: number;
  falhou: number;
  em_progresso: number;
  bytes: number;
  duration: number;
}

export interface ChartsDailyAnomaly {
  day: string;
  count: number;
}

export interface DashboardCharts {
  monthlyRevenue: ChartsMonthlyRevenue[];
  monthlyPremium: ChartsMonthlyPremium[];
  dailyBackups: ChartsDailyBackup[];
  dailyAnomalies: ChartsDailyAnomaly[];
}

interface Tenant {
  id: string;
  nome: string;
  cnpj: string | null;
  createdAt: string;
  usage: {
    totalFiles: number;
    totalBytes: number;
    totalBytesCotacoes: number;
    totalBytesDocumentos: number;
    totalBytesChat: number;
  };
  limits: {
    bytesUsed: number;
    bytesLimit: number | null;
    filesUsed: number;
    filesLimit: number | null;
    percentUsed: number;
    shouldAlert: boolean;
    shouldBlock: boolean;
  };
}

interface TenantLimits {
  limiteBytes?: number | null;
  limiteArquivos?: number | null;
}

interface Backup {
  id: string;
  corretoraId: string | null;
  tenantName: string | null;
  tipo: 'completo' | 'incremental';
  status: 'em_progresso' | 'concluido' | 'falhou';
  totalArquivos: number;
  totalBytes: number;
  arquivosNovos: number;
  backupBucket: string;
  backupPrefix: string;
  checksumMD5: string | null;
  verificado: boolean;
  verificadoEm: string | null;
  iniciadoEm: string;
  finalizadoEm: string | null;
  duracaoSegundos: number | null;
  logs: string[];
  erro: string | null;
}

interface BackupSummaryItem {
  id: string;
  status: 'em_progresso' | 'concluido' | 'falhou';
  iniciadoEm: string;
  finalizadoEm: string | null;
  totalArquivos: number;
  totalBytes: number;
  duracaoSegundos: number | null;
  erro: string | null;
}

interface BackupStats {
  ultimoIncremental: BackupSummaryItem | null;
  ultimoCompleto: BackupSummaryItem | null;
  falhas7d: number;
  totalBytesBackup: number;
  proximoIncremental: string;
  proximoCompleto: string;
}

interface NeonBranch {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  logicalSize: number;
}

interface NeonBranchesResponse {
  branches: NeonBranch[];
  configured: boolean;
  error?: string;
}

interface CreateBackupRequest {
  corretoraId?: string;
  tipo: 'completo' | 'incremental';
}

interface RestoreBackupRequest {
  targetCorretoraId?: string;
}

interface AuditLog {
  id: string;
  adminId: string;
  acao: string;
  entidadeTipo?: string;
  entidadeId?: string;
  detalhes: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  timestamp: string;
  adminName?: string;
  adminEmail?: string;
}

interface AuditLogsFilters {
  corretoraId?: string;
  usuarioId?: string;
  acao?: string;
  dataInicio?: string;
  dataFim?: string;
}

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImageUrl: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

interface CreateBlogPostRequest {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImageUrl?: string | null;
}

type UpdateBlogPostRequest = Partial<CreateBlogPostRequest>;

interface ChangelogItem {
  id: string;
  changelogId: string;
  type:
    | 'feature'
    | 'bugfix'
    | 'improvement'
    | 'breaking'
    | 'security'
    | 'documentation';
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  order: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

interface Changelog {
  id: string;
  version: string;
  title: string;
  description?: string;
  releaseDate: string;
  isPublished: boolean;
  publishedAt?: string;
  publishedBy?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  items?: ChangelogItem[];
}

interface CreateChangelogRequest {
  version: string;
  title: string;
  description?: string;
  releaseDate: string;
  isPublished?: boolean;
}

interface UpdateChangelogRequest {
  title?: string;
  description?: string;
  releaseDate?: string;
}

interface CreateChangelogItemRequest {
  type:
    | 'feature'
    | 'bugfix'
    | 'improvement'
    | 'breaking'
    | 'security'
    | 'documentation';
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  order?: string;
}

interface UpdateChangelogItemRequest {
  type?:
    | 'feature'
    | 'bugfix'
    | 'improvement'
    | 'breaking'
    | 'security'
    | 'documentation';
  title?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  order?: string;
}

interface RoadmapItem {
  id: string;
  phaseId: string;
  title: string;
  description?: string | null;
  status: 'done' | 'in_progress' | 'planned';
  order: string;
  createdAt: string;
  updatedAt: string;
}

interface RoadmapPhase {
  id: string;
  name: string;
  estimatedDate: string;
  isPublished: boolean;
  publishedAt?: string | null;
  publishedBy?: string | null;
  order: string;
  createdAt: string;
  updatedAt: string;
  items?: RoadmapItem[];
}

interface CreateRoadmapPhaseRequest {
  name: string;
  estimatedDate: string;
  isPublished?: boolean;
  order?: string;
}

interface UpdateRoadmapPhaseRequest {
  name?: string;
  estimatedDate?: string;
  order?: string;
}

interface CreateRoadmapItemRequest {
  title: string;
  description?: string;
  status?: 'done' | 'in_progress' | 'planned';
  order?: string;
}

interface UpdateRoadmapItemRequest {
  title?: string;
  description?: string;
  status?: 'done' | 'in_progress' | 'planned';
  order?: string;
}

interface R2Bucket {
  name: string;
  creation_date: string;
}

interface R2OperationGroup {
  dimensions: {
    actionType: string;
    bucketName: string;
    date: string;
  };
  sum: {
    requests: number;
    responseObjectSize: number;
  };
}

interface R2OperationsResponse {
  available: boolean;
  message?: string;
  data: R2OperationGroup[];
  meta: {
    dateFrom: string;
    dateTo: string;
    bucketName: string;
    totalRecords: number;
  };
}

interface R2BucketStorage {
  objectCount: number | null;
  payloadSize: number | null;
  metadataSize: number | null;
  uploadCount: number | null;
}

interface R2BucketMetricsResponse {
  available: boolean;
  message?: string;
  bucket: string;
  storage: R2BucketStorage | null;
}

export interface NeonRowsPoint {
  timestamp: string;
  inserted: number;
  updated: number;
  deleted: number;
}

export interface NeonMetricsTimeseriesResponse {
  available: boolean;
  message?: string;
  from: string;
  to: string;
  series: NeonRowsPoint[];
}

export interface NeonDbTableStat {
  tableName: string;
  liveRows: number;
  deadRows: number;
  inserts: number;
  updates: number;
  deletes: number;
  tableSizeBytes: number;
  totalSizeBytes: number;
}

export interface NeonDbStatsResponse {
  dbSizeBytes: number;
  totalLiveRows: number;
  totalDeadRows: number;
  totalInserts: number;
  totalUpdates: number;
  totalDeletes: number;
  tables: NeonDbTableStat[];
}

interface NeonProject {
  id: string;
  name: string;
  region_id: string;
  pg_version: number;
  created_at: string;
  updated_at: string;
  cpu_used_sec: number;
  active_time_seconds: number;
  data_storage_bytes_hour: number;
  data_transfer_bytes: number;
  written_data_bytes: number;
  branch_logical_size_limit_bytes: number;
}

interface NeonProjectsResponse {
  available: boolean;
  message?: string;
  projects: NeonProject[];
}

interface NeonConsumptionPeriod {
  period_start: string;
  compute_unit_seconds: number;
  written_data_bytes: number;
  data_transfer_bytes: number;
  data_storage_bytes_hour: number;
}

interface NeonProjectConsumption {
  project_id: string;
  project_name: string;
  subscription_type?: string;
  consumption_period_start?: string;
  consumption_period_end?: string;
  synthetic_storage_size?: number;
  periods: NeonConsumptionPeriod[];
}

interface NeonConsumptionResponse {
  available: boolean;
  message?: string;
  mode: 'org' | 'project' | 'dev';
  data: NeonProjectConsumption[];
  meta: {
    from: string;
    to: string;
    totalProjects: number;
    mode: string;
    note?: string;
  };
}

interface RailwayService {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface RailwayEnvironment {
  id: string;
  name: string;
}

interface RailwayDeployment {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  serviceId: string;
  environmentId: string;
  staticUrl: string | null;
}

interface RailwayProjectResponse {
  available: boolean;
  message?: string;
  project: {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  services: RailwayService[];
  environments: RailwayEnvironment[];
  deployments: RailwayDeployment[];
}

interface RailwayMetricValue {
  ts: number; // Unix timestamp em segundos
  value: number;
}

interface RailwayMetric {
  measurement: string;
  tags: {
    serviceId?: string;
    environmentId?: string;
    projectId?: string;
  };
  values: RailwayMetricValue[];
}

interface RailwayMetricsResponse {
  available: boolean;
  message?: string;
  metrics: RailwayMetric[];
  meta: {
    serviceId: string | null;
    startDate: string;
    endDate: string;
  };
}

interface RailwayUsageBreakdown {
  cpuMinutes: number;
  memoryGBMinutes: number;
  networkTxGB: number;
  networkRxGB: number;
}

interface RailwayUsageResponse {
  available: boolean;
  message?: string;
  actual: RailwayUsageBreakdown | null;
  estimated: RailwayUsageBreakdown | null;
}

// ─── Redis Analytics ──────────────────────────────────────────────────────────

interface RedisServerInfo {
  version: string;
  mode: string;
  os: string;
  uptimeSeconds: number;
  uptimeDays: number;
  hz: number;
  role: string;
  connectedSlaves: number;
}

interface RedisMemoryInfo {
  usedBytes: number;
  usedHuman: string;
  peakBytes: number;
  peakHuman: string;
  rssBytes: number;
  rssHuman: string;
  maxmemoryBytes: number;
  maxmemoryHuman: string;
  maxmemoryPolicy: string;
  fragRatio: number;
  luaBytes: number;
}

interface RedisClientsInfo {
  connected: number;
  blocked: number;
  tracking: number;
  maxInputLen: number;
}

interface RedisStatsInfo {
  totalCommandsProcessed: number;
  totalConnectionsReceived: number;
  instantaneousOpsPerSec: number;
  keyspaceHits: number;
  keyspaceMisses: number;
  expiredKeys: number;
  evictedKeys: number;
  netInputBytes: number;
  netOutputBytes: number;
  rejectedConnections: number;
}

interface RedisKeyspaceDB {
  keys: number;
  expires: number;
  avg_ttl: number;
}

interface RedisPersistence {
  rdbLastSaveTime: number;
  rdbLastBgSaveStatus: string;
  aofEnabled: boolean;
  loadingRdb: boolean;
}

interface RedisInfoResponse {
  available: boolean;
  message?: string;
  server: RedisServerInfo;
  memory: RedisMemoryInfo;
  clients: RedisClientsInfo;
  stats: RedisStatsInfo;
  keyspace: Record<string, RedisKeyspaceDB>;
  totalKeys: number;
  persistence: RedisPersistence;
}

interface RedisQueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

interface RedisQueuesResponse {
  available: boolean;
  message?: string;
  queues: RedisQueueStats[];
}

// ─── Subscriptions (Asaas Billing) ────────────────────────────────────────────

export interface AdminSubscription {
  id: string;
  corretoraId: string;
  corretoraRazaoSocial: string;
  corretoraCnpj: string | null;
  planoNome: string;
  planCycle: string;
  status: string;
  asaasCustomerId: string | null;
  asaasSubscriptionId: string | null;
  asaasPaymentId: string | null;
  seatsIncluded: number | null;
  seatsUsed: number | null;
  seatsAdditional: number | null;
  seatsCourtesy: number;
  basePrice: string;
  pricePerSeat: string;
  totalMonthly: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean | null;
  canceledAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SubscriptionInvoice {
  id: string;
  source: 'local' | 'asaas';
  asaasPaymentId: string | null;
  status: string;
  total: string;
  dueDate: string | null;
  paidAt: string | null;
  invoicePdfUrl: string | null;
}

// ─── Vercel Analytics ─────────────────────────────────────────────────────────

interface VercelProjectLink {
  type: string;
  repo?: string;
  repoId?: number;
  org?: string;
  defaultBranch?: string;
}

interface VercelProject {
  id: string;
  name: string;
  framework: string | null;
  nodeVersion: string | null;
  createdAt: number;
  updatedAt: number;
  link?: VercelProjectLink;
}

interface VercelProjectResponse {
  available: boolean;
  message?: string;
  project: VercelProject;
}

interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  state: string;
  created: number;
  ready: number | null;
  buildingAt: number | null;
  buildDuration: number | null;
  source: string | null;
  commitMessage: string | null;
  commitRef: string | null;
  commitSha: string | null;
  commitAuthor: string | null;
  creator: string | null;
}

interface VercelDeploymentsResponse {
  available: boolean;
  message?: string;
  deployments: VercelDeployment[];
}

export interface DashboardInitResponse {
  stats: {
    totalTenants: number;
    totalUsers: number;
    totalClientes: number;
    totalArquivos: number;
    totalStorage: number;
    activeBackups: number;
  } | null;
  tenantsSummary: TenantSummary[];
  httpMetrics: HttpMetricsResponse;
  r2DefaultBucket: string | null;
}

class AdminApiClient {
  private baseUrl = (() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    // Se já termina com /api, não adicionar novamente
    return apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;
  })();

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<T> {
    const token = adminAuth.getToken();
    const url = `${this.baseUrl}${endpoint}`;

    const isGet = !options?.method || options.method === 'GET';
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(isGet ? {} : { 'Content-Type': 'application/json' }),
        Authorization: `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        adminAuth.logout();
        window.location.href = '/admin/login';
        throw new Error('Não autorizado');
      }

      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || 'Erro na requisição');
    }

    const data = await response.json();
    return data;
  }

  // Dashboard & Stats
  async getDashboardInit(): Promise<DashboardInitResponse> {
    return this.request<DashboardInitResponse>('/admin/stats/dashboard-init');
  }

  async getGlobalStats(): Promise<GlobalStats> {
    return this.request<GlobalStats>('/admin/stats');
  }

  async getUsageHistory(days = 30): Promise<UsageHistory[]> {
    return this.request<UsageHistory[]>(`/admin/stats/usage?days=${days}`);
  }

  async getHttpMetrics(): Promise<HttpMetricsResponse> {
    return this.request<HttpMetricsResponse>('/admin/stats/http-metrics');
  }

  async getTenantsSummary(): Promise<TenantSummary[]> {
    return this.request<TenantSummary[]>('/admin/stats/tenants-summary');
  }

  async getDashboardCharts(): Promise<DashboardCharts> {
    return this.request<DashboardCharts>('/admin/stats/charts');
  }

  // Tenants Management
  async getTenants(): Promise<Tenant[]> {
    const data = await this.request<{ tenants: Tenant[]; totalTenants: number }>('/admin/tenants');
    return data.tenants;
  }

  async getTenant(id: string): Promise<Tenant> {
    return this.request<Tenant>(`/admin/tenants/${id}`);
  }

  async updateTenantLimits(id: string, limits: TenantLimits): Promise<void> {
    return this.request<void>(`/admin/tenants/${id}/limits`, {
      method: 'PUT',
      body: JSON.stringify(limits),
    });
  }

  // Backups Management
  async getBackups(params?: { tipo?: string; status?: string; limit?: number }): Promise<{ backups: Backup[]; total: number }> {
    const qs = new URLSearchParams();
    if (params?.tipo) qs.set('tipo', params.tipo);
    if (params?.status) qs.set('status', params.status);
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString() ? `?${qs}` : '';
    return this.request<{ backups: Backup[]; total: number }>(`/admin/backups${query}`);
  }

  async getBackup(id: string): Promise<Backup> {
    return this.request<Backup>(`/admin/backups/${id}`);
  }

  async getBackupStats(): Promise<BackupStats> {
    return this.request<BackupStats>('/admin/backups/stats');
  }

  async getNeonBranches(): Promise<NeonBranchesResponse> {
    return this.request<NeonBranchesResponse>('/admin/backups/neon-branches');
  }

  async createBackup(data: CreateBackupRequest): Promise<{ backup: unknown; message: string }> {
    return this.request<{ backup: unknown; message: string }>('/admin/backups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyBackup(id: string): Promise<{ backupId: string; isValid: boolean; message: string }> {
    return this.request<{ backupId: string; isValid: boolean; message: string }>(`/admin/backups/${id}/verify`, {
      method: 'POST',
    });
  }

  async restoreBackup(id: string, data: RestoreBackupRequest): Promise<void> {
    return this.request<void>(`/admin/backups/${id}/restore`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteBackup(id: string): Promise<void> {
    return this.request<void>(`/admin/backups/${id}`, { method: 'DELETE' });
  }

  // Audit Logs
  async getAuditLogs(filters?: AuditLogsFilters): Promise<AuditLog[]> {
    const params = new URLSearchParams(filters as Record<string, string>);
    const response = await this.request<{
      logs: AuditLog[];
      total: number;
      limit: number;
      offset: number;
    }>(`/admin/audit-logs?${params}`);
    return response.logs;
  }

  // Changelog Management
  async getChangelogs(): Promise<{ changelogs: Changelog[]; total: number }> {
    return this.request<{ changelogs: Changelog[]; total: number }>(
      '/admin/changelogs',
    );
  }

  async getChangelog(id: string): Promise<Changelog> {
    return this.request<Changelog>(`/admin/changelogs/${id}`);
  }

  async createChangelog(
    data: CreateChangelogRequest,
  ): Promise<{ changelog: Changelog; message: string }> {
    return this.request<{ changelog: Changelog; message: string }>(
      '/admin/changelogs',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  }

  async updateChangelog(
    id: string,
    data: UpdateChangelogRequest,
  ): Promise<{ changelog: Changelog; message: string }> {
    return this.request<{ changelog: Changelog; message: string }>(
      `/admin/changelogs/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
    );
  }

  async publishChangelog(
    id: string,
  ): Promise<{ changelog: Changelog; message: string }> {
    return this.request<{ changelog: Changelog; message: string }>(
      `/admin/changelogs/${id}/publish`,
      {
        method: 'POST',
      },
    );
  }

  async unpublishChangelog(
    id: string,
  ): Promise<{ changelog: Changelog; message: string }> {
    return this.request<{ changelog: Changelog; message: string }>(
      `/admin/changelogs/${id}/unpublish`,
      {
        method: 'POST',
      },
    );
  }

  async deleteChangelog(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/admin/changelogs/${id}`, {
      method: 'DELETE',
    });
  }

  // Changelog Items Management
  async createChangelogItem(
    changelogId: string,
    data: CreateChangelogItemRequest,
  ): Promise<{ item: ChangelogItem; message: string }> {
    return this.request<{ item: ChangelogItem; message: string }>(
      `/admin/changelogs/${changelogId}/items`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  }

  async updateChangelogItem(
    id: string,
    data: UpdateChangelogItemRequest,
  ): Promise<{ item: ChangelogItem; message: string }> {
    return this.request<{ item: ChangelogItem; message: string }>(
      `/admin/changelog-items/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
    );
  }

  async deleteChangelogItem(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/admin/changelog-items/${id}`, {
      method: 'DELETE',
    });
  }

  // Blog Management
  async getBlogPosts(): Promise<{ posts: BlogPost[]; total: number }> {
    return this.request<{ posts: BlogPost[]; total: number }>('/admin/blog/posts');
  }

  async createBlogPost(data: CreateBlogPostRequest): Promise<{ post: BlogPost; message: string }> {
    return this.request<{ post: BlogPost; message: string }>('/admin/blog/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBlogPost(id: string, data: UpdateBlogPostRequest): Promise<{ post: BlogPost; message: string }> {
    return this.request<{ post: BlogPost; message: string }>(`/admin/blog/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async publishBlogPost(id: string): Promise<{ post: BlogPost; message: string }> {
    return this.request<{ post: BlogPost; message: string }>(`/admin/blog/posts/${id}/publish`, {
      method: 'POST',
    });
  }

  async unpublishBlogPost(id: string): Promise<{ post: BlogPost; message: string }> {
    return this.request<{ post: BlogPost; message: string }>(`/admin/blog/posts/${id}/unpublish`, {
      method: 'POST',
    });
  }

  async deleteBlogPost(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/admin/blog/posts/${id}`, {
      method: 'DELETE',
    });
  }

  // Roadmap Management
  async getRoadmapPhases(): Promise<{ phases: RoadmapPhase[]; total: number }> {
    return this.request<{ phases: RoadmapPhase[]; total: number }>(
      '/admin/roadmap/phases',
    );
  }

  async getRoadmapPhase(id: string): Promise<RoadmapPhase> {
    return this.request<RoadmapPhase>(`/admin/roadmap/phases/${id}`);
  }

  async createRoadmapPhase(
    data: CreateRoadmapPhaseRequest,
  ): Promise<{ phase: RoadmapPhase; message: string }> {
    return this.request<{ phase: RoadmapPhase; message: string }>(
      '/admin/roadmap/phases',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  }

  async updateRoadmapPhase(
    id: string,
    data: UpdateRoadmapPhaseRequest,
  ): Promise<{ phase: RoadmapPhase; message: string }> {
    return this.request<{ phase: RoadmapPhase; message: string }>(
      `/admin/roadmap/phases/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
    );
  }

  async publishRoadmapPhase(
    id: string,
  ): Promise<{ phase: RoadmapPhase; message: string }> {
    return this.request<{ phase: RoadmapPhase; message: string }>(
      `/admin/roadmap/phases/${id}/publish`,
      { method: 'POST' },
    );
  }

  async unpublishRoadmapPhase(
    id: string,
  ): Promise<{ phase: RoadmapPhase; message: string }> {
    return this.request<{ phase: RoadmapPhase; message: string }>(
      `/admin/roadmap/phases/${id}/unpublish`,
      { method: 'POST' },
    );
  }

  async deleteRoadmapPhase(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/admin/roadmap/phases/${id}`,
      { method: 'DELETE' },
    );
  }

  async createRoadmapItem(
    phaseId: string,
    data: CreateRoadmapItemRequest,
  ): Promise<{ item: RoadmapItem; message: string }> {
    return this.request<{ item: RoadmapItem; message: string }>(
      `/admin/roadmap/phases/${phaseId}/items`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  }

  async updateRoadmapItem(
    id: string,
    data: UpdateRoadmapItemRequest,
  ): Promise<{ item: RoadmapItem; message: string }> {
    return this.request<{ item: RoadmapItem; message: string }>(
      `/admin/roadmap/items/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
    );
  }

  async deleteRoadmapItem(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/admin/roadmap/items/${id}`,
      { method: 'DELETE' },
    );
  }

  // R2 Analytics
  async getR2Buckets(): Promise<{ available: boolean; message?: string; buckets: R2Bucket[] }> {
    return this.request('/admin/r2/buckets');
  }

  async getR2Operations(params: {
    bucketName?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }): Promise<R2OperationsResponse> {
    const query = new URLSearchParams();
    if (params.bucketName) query.set('bucketName', params.bucketName);
    if (params.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params.dateTo) query.set('dateTo', params.dateTo);
    if (params.limit) query.set('limit', String(params.limit));
    return this.request(`/admin/r2/analytics/operations?${query}`);
  }

  async getR2BucketMetrics(
    bucketName: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<R2BucketMetricsResponse> {
    const query = new URLSearchParams({ bucketName });
    if (dateFrom) query.set('dateFrom', dateFrom);
    if (dateTo) query.set('dateTo', dateTo);
    return this.request(`/admin/r2/analytics/bucket-metrics?${query}`);
  }

  // Neon Analytics
  async getNeonProjects(): Promise<NeonProjectsResponse> {
    return this.request('/admin/neon/projects');
  }

  async getNeonMetricsTimeseries(params?: { from?: string; to?: string }): Promise<NeonMetricsTimeseriesResponse> {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to)   query.set('to',   params.to);
    return this.request(`/admin/neon/analytics/metrics-timeseries?${query}`);
  }

  async getNeonDbStats(): Promise<NeonDbStatsResponse> {
    return this.request('/admin/neon/analytics/db-stats');
  }

  async getNeonRowsSample(): Promise<NeonMetricsTimeseriesResponse> {
    return this.request('/admin/neon/analytics/rows-sample');
  }

  async getNeonConsumption(params?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<NeonConsumptionResponse> {
    const query = new URLSearchParams();
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    return this.request(`/admin/neon/analytics/consumption?${query}`);
  }

  // Railway Analytics
  async getRailwayProject(): Promise<RailwayProjectResponse> {
    return this.request('/admin/railway/project');
  }

  async getRailwayUsage(): Promise<RailwayUsageResponse> {
    return this.request('/admin/railway/usage');
  }

  async getRailwayMetrics(params?: {
    serviceId?: string;
    startDate?: string;
    endDate?: string;
    sampleRateSeconds?: number;
  }): Promise<RailwayMetricsResponse> {
    const query = new URLSearchParams();
    if (params?.serviceId) query.set('serviceId', params.serviceId);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.sampleRateSeconds) query.set('sampleRateSeconds', String(params.sampleRateSeconds));
    return this.request(`/admin/railway/metrics?${query}`);
  }

  // Vercel Analytics
  async getVercelProject(): Promise<VercelProjectResponse> {
    return this.request('/admin/vercel/project');
  }

  async getVercelDeployments(params?: {
    limit?: number;
    since?: number;
    until?: number;
  }): Promise<VercelDeploymentsResponse> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.since) query.set('since', String(params.since));
    if (params?.until) query.set('until', String(params.until));
    return this.request(`/admin/vercel/deployments?${query}`);
  }

  // Redis Analytics
  async getRedisInfo(): Promise<RedisInfoResponse> {
    return this.request('/admin/redis/info');
  }

  async getRedisQueues(): Promise<RedisQueuesResponse> {
    return this.request('/admin/redis/queues');
  }

  // Subscriptions (Asaas Billing)
  async getSubscriptions(): Promise<{ subscriptions: AdminSubscription[]; total: number }> {
    const data = await this.request<{ success: boolean; data: { subscriptions: AdminSubscription[]; total: number } }>('/admin/subscriptions');
    return data.data;
  }

  async getSubscription(corretoraId: string): Promise<{
    subscription: AdminSubscription;
    asaasSubscription: unknown;
    asaasCustomer: unknown;
    currentActiveUsers: number;
  }> {
    const data = await this.request<{ success: boolean; data: { subscription: AdminSubscription; asaasSubscription: unknown; asaasCustomer: unknown; currentActiveUsers: number } }>(`/admin/subscriptions/${corretoraId}`);
    return data.data;
  }

  async getSubscriptionInvoices(corretoraId: string, params?: { limit?: number; offset?: number }): Promise<{ invoices: SubscriptionInvoice[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const data = await this.request<{ success: boolean; data: { invoices: SubscriptionInvoice[]; total: number } }>(`/admin/subscriptions/${corretoraId}/invoices?${query}`);
    return data.data;
  }

  async setCourtesySeats(corretoraId: string, body: { courtesySeats: number; reason?: string }): Promise<{ seatsCourtesy: number; totalMonthly: number }> {
    const data = await this.request<{ success: boolean; data: { seatsCourtesy: number; totalMonthly: number } }>(`/admin/subscriptions/${corretoraId}/courtesy-seats`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return data.data;
  }

  async pauseSubscription(corretoraId: string): Promise<void> {
    await this.request(`/admin/subscriptions/${corretoraId}/pause`, { method: 'POST', body: '{}' });
  }

  async resumeSubscriptionAdmin(corretoraId: string): Promise<void> {
    await this.request(`/admin/subscriptions/${corretoraId}/resume`, { method: 'POST', body: '{}' });
  }

  async cancelSubscriptionAdmin(corretoraId: string, body: { immediately?: boolean }): Promise<void> {
    await this.request(`/admin/subscriptions/${corretoraId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async overrideSubscriptionPlan(corretoraId: string, body: { planCycle?: string; newValue?: number; reason?: string }): Promise<AdminSubscription> {
    const data = await this.request<{ success: boolean; data: AdminSubscription }>(`/admin/subscriptions/${corretoraId}/override-plan`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return data.data;
  }

  async extendSubscriptionTrial(corretoraId: string, body: { trialEndDate: string }): Promise<void> {
    await this.request(`/admin/subscriptions/${corretoraId}/extend-trial`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  // Profile
  async updateProfile(data: {
    nome?: string;
    senhaAtual?: string;
    novaSenha?: string;
  }): Promise<{ admin: { id: string; email: string; nome: string; permissoes: string[] }; message: string }> {
    return this.request('/admin/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // 2FA
  async get2faStatus(): Promise<{ enabled: boolean }> {
    return this.request('/admin/auth/2fa/status');
  }

  async setup2fa(): Promise<{ secret: string; qrCode: string }> {
    return this.request('/admin/auth/2fa/setup', {
      method: 'POST',
      body: '{}',
    });
  }

  async enable2fa(code: string): Promise<{ message: string }> {
    return this.request('/admin/auth/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async disable2fa(code: string): Promise<{ message: string }> {
    return this.request('/admin/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  // Avatar
  async uploadAdminAvatar(file: File): Promise<{ avatarUrl: string }> {
    const token = adminAuth.getToken();
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${this.baseUrl}/admin/auth/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Erro ao enviar foto' }));
      throw new Error(err.error || 'Erro ao enviar foto');
    }
    return response.json();
  }

  async deleteAdminAvatar(): Promise<{ message: string }> {
    return this.request('/admin/auth/avatar', { method: 'DELETE' });
  }
}

export const adminApi = new AdminApiClient();
export type {
  GlobalStats,
  UsageHistory,
  Tenant,
  TenantLimits,
  Backup,
  BackupStats,
  BackupSummaryItem,
  NeonBranch,
  NeonBranchesResponse,
  CreateBackupRequest,
  RestoreBackupRequest,
  AuditLog,
  AuditLogsFilters,
  BlogPost,
  CreateBlogPostRequest,
  UpdateBlogPostRequest,
  Changelog,
  ChangelogItem,
  CreateChangelogRequest,
  UpdateChangelogRequest,
  CreateChangelogItemRequest,
  UpdateChangelogItemRequest,
  RoadmapPhase,
  RoadmapItem,
  CreateRoadmapPhaseRequest,
  UpdateRoadmapPhaseRequest,
  CreateRoadmapItemRequest,
  UpdateRoadmapItemRequest,
  R2Bucket,
  R2OperationGroup,
  R2OperationsResponse,
  R2BucketStorage,
  R2BucketMetricsResponse,
  NeonProject,
  NeonProjectsResponse,
  NeonConsumptionPeriod,
  NeonProjectConsumption,
  NeonConsumptionResponse,
  RailwayService,
  RailwayEnvironment,
  RailwayDeployment,
  RailwayProjectResponse,
  RailwayMetricValue,
  RailwayMetric,
  RailwayMetricsResponse,
  RailwayUsageBreakdown,
  RailwayUsageResponse,
  RedisServerInfo,
  RedisMemoryInfo,
  RedisClientsInfo,
  RedisStatsInfo,
  RedisKeyspaceDB,
  RedisPersistence,
  RedisInfoResponse,
  RedisQueueStats,
  RedisQueuesResponse,
  VercelProjectLink,
  VercelProject,
  VercelProjectResponse,
  VercelDeployment,
  VercelDeploymentsResponse,
};
