import { adminAuth } from '@/infra/auth/admin-auth';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Curso {
  id: string;
  titulo: string;
  descricao: string | null;
  thumbnailUrl: string | null;
  ordem: number;
  publicado: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CursoDetalhado extends Curso {
  modulos: (Modulo & { aulas: Aula[] })[];
}

export interface Modulo {
  id: string;
  cursoId: string;
  titulo: string;
  ordem: number;
  createdAt: string;
  updatedAt: string;
}

export interface Aula {
  id: string;
  moduloId: string;
  titulo: string;
  descricao: string | null;
  duracao: number;
  hlsUrl: string | null;
  r2KeyBase: string | null;
  thumbnailUrl: string | null;
  ordem: number;
  publicada: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Alternativa {
  id: string;
  perguntaId: string;
  texto: string;
  correta: boolean;
  ordem: number;
}

export interface Pergunta {
  id: string;
  quizId: string;
  enunciado: string;
  ordem: number;
  alternativas: Alternativa[];
}

export interface Quiz {
  id: string;
  aulaId: string;
  titulo: string;
  perguntas: Pergunta[];
}

export interface TreinamentosStats {
  usuariosAtivos: number;
  aulasConcluidas: number;
  mediaAprovacao: number;
  aulasPopulares: { aulaId: string; titulo: string; total: number }[];
  evolucaoSemanal: { semana: string; conclusoes: number }[];
}

export interface TranscodeJob {
  id: string;
  aulaId: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number;
  hlsUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCursoRequest {
  titulo: string;
  descricao?: string;
  thumbnailUrl?: string | null;
  ordem?: number;
  publicado?: boolean;
}

export interface UpdateCursoRequest {
  titulo?: string;
  descricao?: string;
  thumbnailUrl?: string | null;
  ordem?: number;
  publicado?: boolean;
}

export interface CreateModuloRequest {
  cursoId: string;
  titulo: string;
  ordem?: number;
}

export interface UpdateModuloRequest {
  id: string;
  titulo?: string;
  ordem?: number;
}

export interface CreateAulaRequest {
  moduloId: string;
  titulo: string;
  descricao?: string;
  duracao?: number;
  hlsUrl?: string;
  r2KeyBase?: string;
  thumbnailUrl?: string | null;
  ordem?: number;
  publicada?: boolean;
}

export interface UpdateAulaRequest {
  id: string;
  titulo?: string;
  descricao?: string;
  duracao?: number;
  hlsUrl?: string;
  r2KeyBase?: string;
  thumbnailUrl?: string | null;
  ordem?: number;
  publicada?: boolean;
}

export interface CreateQuizRequest {
  aulaId: string;
  titulo: string;
  perguntasList: {
    enunciado: string;
    ordem: number;
    alternativas: { texto: string; correta: boolean; ordem: number }[];
  }[];
}

// ─── Client ───────────────────────────────────────────────────────────────────

class TreinamentosApiClient {
  private readonly baseUrl = '/api/treinamentos';

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = adminAuth.getToken();
    const url = `${this.baseUrl}${endpoint}`;

    const isFormData = options?.body instanceof FormData;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(!isFormData && !options?.method || options?.method === 'GET'
          ? {}
          : !isFormData
          ? { 'Content-Type': 'application/json' }
          : {}),
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || error.message || `Erro na requisição (${response.status})`);
    }

    return response.json();
  }

  // ─── Cursos ──────────────────────────────────────────────────────────────

  async getCursos(): Promise<Curso[]> {
    return this.request<Curso[]>('/cursos');
  }

  async getCurso(cursoId: string): Promise<CursoDetalhado> {
    return this.request<CursoDetalhado>(`/cursos/${cursoId}`);
  }

  async createCurso(data: CreateCursoRequest): Promise<Curso> {
    return this.request<Curso>('/cursos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCurso(cursoId: string, data: UpdateCursoRequest): Promise<Curso> {
    return this.request<Curso>(`/cursos/${cursoId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCurso(cursoId: string): Promise<{ success: true }> {
    return this.request<{ success: true }>(`/cursos/${cursoId}`, {
      method: 'DELETE',
    });
  }

  // ─── Módulos ─────────────────────────────────────────────────────────────

  async createModulo(data: CreateModuloRequest): Promise<Modulo> {
    return this.request<Modulo>('/modulos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateModulo(data: UpdateModuloRequest): Promise<Modulo> {
    return this.request<Modulo>('/modulos', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteModulo(moduloId: string): Promise<{ success: true }> {
    return this.request<{ success: true }>(`/modulos?id=${moduloId}`, {
      method: 'DELETE',
    });
  }

  // ─── Aulas ───────────────────────────────────────────────────────────────

  async createAula(data: CreateAulaRequest): Promise<Aula> {
    return this.request<Aula>('/aulas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAula(data: UpdateAulaRequest): Promise<Aula> {
    return this.request<Aula>('/aulas', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAula(aulaId: string): Promise<{ success: true }> {
    return this.request<{ success: true }>(`/aulas?id=${aulaId}`, {
      method: 'DELETE',
    });
  }

  // ─── Quiz ─────────────────────────────────────────────────────────────────

  async getQuiz(aulaId: string): Promise<Quiz | null> {
    return this.request<Quiz | null>(`/quiz?aulaId=${aulaId}`);
  }

  async createQuiz(data: CreateQuizRequest): Promise<{ quizId: string }> {
    return this.request<{ quizId: string }>('/quiz', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteQuiz(quizId: string): Promise<{ success: true }> {
    return this.request<{ success: true }>(`/quiz?quizId=${quizId}`, {
      method: 'DELETE',
    });
  }

  // ─── Upload ───────────────────────────────────────────────────────────────

  async uploadImagem(file: File, prefix = 'thumbnails'): Promise<{ url: string; key: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('prefix', prefix);
    return this.request<{ url: string; key: string }>('/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async presignVideo(contentType: string): Promise<{ uploadUrl: string; r2Key: string }> {
    return this.request<{ uploadUrl: string; r2Key: string }>('/upload/presign', {
      method: 'POST',
      body: JSON.stringify({ contentType }),
    });
  }

  // ─── Transcode ────────────────────────────────────────────────────────────

  getTranscodeUrl(): string {
    return `${this.baseUrl}/transcode`;
  }

  getTranscodeToken(): string | null {
    return adminAuth.getToken();
  }

  async getTranscodeStatus(params: { jobId?: string; aulaId?: string }): Promise<TranscodeJob | null> {
    const query = new URLSearchParams();
    if (params.jobId) query.set('jobId', params.jobId);
    if (params.aulaId) query.set('aulaId', params.aulaId);
    return this.request<TranscodeJob | null>(`/transcode/status?${query}`);
  }

  // ─── Stats & Relatórios ───────────────────────────────────────────────────

  async getStats(): Promise<TreinamentosStats> {
    return this.request<TreinamentosStats>('/stats');
  }

  async getRelatorio(params: {
    tipo: 'progresso' | 'quizzes';
    dataInicio?: string;
    dataFim?: string;
  }): Promise<Blob> {
    const token = adminAuth.getToken();
    const query = new URLSearchParams({ tipo: params.tipo });
    if (params.dataInicio) query.set('dataInicio', params.dataInicio);
    if (params.dataFim) query.set('dataFim', params.dataFim);

    const response = await fetch(
      `${this.baseUrl}/relatorios?${query}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) throw new Error('Erro ao exportar relatório');
    return response.blob();
  }
}

export const treinamentosApi = new TreinamentosApiClient();
