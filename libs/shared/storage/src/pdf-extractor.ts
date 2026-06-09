import { ExtractedPdfData } from './types.js';

// pdf-parse v1.1.1 main entry loads test files on require(), which fails in
// bundled/production environments. Use the library directly to skip that.
let pdfParse: ((buffer: Buffer, options?: object) => Promise<any>) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('pdf-parse/lib/pdf-parse.js');
  const fn = typeof mod === 'function' ? mod : (mod?.default ?? null);
  pdfParse = typeof fn === 'function' ? fn : null;
} catch {
  pdfParse = null;
}

export class PdfExtractor {
  /**
   * Extrair texto e metadata de um PDF
   */
  async extract(buffer: Buffer): Promise<ExtractedPdfData> {
    if (typeof pdfParse !== 'function') {
      throw new Error('pdf-parse não disponível neste ambiente');
    }
    try {
      const data = await pdfParse(buffer);

      return {
        text: data.text,
        metadata: {
          totalPages: data.numpages,
          author: data.info?.Author,
          title: data.info?.Title,
          creationDate: data.info?.CreationDate
            ? new Date(data.info.CreationDate)
            : undefined,
        },
      };
    } catch (error) {
      console.error('Erro ao extrair PDF:', error);
      throw new Error('Falha ao extrair texto do PDF');
    }
  }

  /**
   * Extrair campos específicos usando regex patterns
   * (usado para import de PDFs legados)
   */
  extractFields(text: string): Record<string, string | null> {
    const patterns = {
      numeroCotacao: /cota[çc][aã]o\s*n[°º]?\s*:?\s*(\d+[-\/]\d+)/i,
      numeroProsposta: /proposta\s*n[°º]?\s*:?\s*(\d+[-\/]\d+)/i,
      valor: /(?:valor|pr[êe]mio)\s*:?\s*r?\$?\s*([\d.,]+)/i,
      vigenciaInicio: /vig[êe]ncia\s*:?\s*(?:de\s*)?(\d{2}\/\d{2}\/\d{4})/i,
      vigenciaFim: /(?:at[ée]\s*|a\s*)(\d{2}\/\d{2}\/\d{4})/i,
      segurado: /segurado\s*:?\s*([^\n]+)/i,
      cnpjCpf: /(?:cnpj|cpf)\s*:?\s*([\d./-]+)/i,
    };

    const extracted: Record<string, string | null> = {};

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      extracted[key] = match ? match[1].trim() : null;
    }

    return extracted;
  }

  /**
   * Limpar texto extraído (remover caracteres especiais, espaços extras)
   */
  cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Múltiplos espaços -> 1 espaço
      .replace(/\n{3,}/g, '\n\n') // Múltiplas quebras -> 2 quebras
      .trim();
  }
}
