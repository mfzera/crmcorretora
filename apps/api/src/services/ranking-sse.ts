import type { ServerResponse } from 'http';

class RankingSSEManager {
  private connections = new Map<string, Set<ServerResponse>>();

  add(corretoraId: string, res: ServerResponse): void {
    if (!this.connections.has(corretoraId)) {
      this.connections.set(corretoraId, new Set());
    }
    this.connections.get(corretoraId)!.add(res);
  }

  remove(corretoraId: string, res: ServerResponse): void {
    this.connections.get(corretoraId)?.delete(res);
  }

  emit(corretoraId: string, event: string): void {
    const conns = this.connections.get(corretoraId);
    if (!conns?.size) return;
    const payload = `event: ${event}\ndata: {}\n\n`;
    for (const res of conns) {
      try {
        res.write(payload);
      } catch {
        conns.delete(res);
      }
    }
  }
}

export const rankingSSE = new RankingSSEManager();
