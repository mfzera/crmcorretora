import { db, googleCalendarTokens } from '@ecotech/shared/database';
import { eq } from 'drizzle-orm';
import { env } from '@ecotech/shared/utils/env';

async function refreshAccessToken(usuarioId: string, refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
      }),
    });

    const data = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };

    if (!res.ok || !data.access_token) {
      return null;
    }

    await db
      .update(googleCalendarTokens)
      .set({
        accessToken: data.access_token,
        expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
        updatedAt: new Date(),
      })
      .where(eq(googleCalendarTokens.usuarioId, usuarioId));

    return data.access_token;
  } catch {
    return null;
  }
}

async function getAccessToken(usuarioId: string): Promise<string | null> {
  const record = await db.query.googleCalendarTokens.findFirst({
    where: eq(googleCalendarTokens.usuarioId, usuarioId),
  });

  if (!record) return null;

  if (record.expiresAt > new Date()) {
    return record.accessToken;
  }

  return refreshAccessToken(usuarioId, record.refreshToken);
}

export interface GoogleCalendarioEvento {
  id: string;
  tipo: 'google';
  titulo: string;
  data: string;
  meta: {
    descricao?: string;
    hangoutLink?: string;
    htmlLink?: string;
    horaInicio?: string;
    horaFim?: string;
    diaTodo: boolean;
  };
}

type GoogleEventItem = {
  id: string;
  summary?: string;
  description?: string;
  hangoutLink?: string;
  htmlLink?: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
};

async function fetchEventsFromCalendar(
  calendarId: string,
  accessToken: string,
  dataInicio: Date,
  dataFim: Date,
): Promise<GoogleEventItem[]> {
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
  );
  url.searchParams.set('timeMin', dataInicio.toISOString());
  url.searchParams.set('timeMax', dataFim.toISOString());
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '250');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as { items?: GoogleEventItem[] };
  return data.items ?? [];
}

export async function fetchGoogleCalendarEvents(
  usuarioId: string,
  dataInicio: Date,
  dataFim: Date,
): Promise<GoogleCalendarioEvento[]> {
  const accessToken = await getAccessToken(usuarioId);
  if (!accessToken) return [];

  try {
    // Buscar lista de todos os calendários do usuário
    const calListRes = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    let calendarIds: string[] = ['primary'];

    if (calListRes.ok) {
      const calList = (await calListRes.json()) as {
        items?: Array<{ id: string; accessRole: string; selected?: boolean }>;
      };
      // Incluir todos os calendários onde o usuário tem acesso de leitura e está selecionado
      calendarIds = (calList.items ?? [])
        .filter((c) => c.selected !== false && c.accessRole !== 'none')
        .map((c) => c.id);
    }

    // Buscar eventos de todos os calendários em paralelo
    const allItems = (
      await Promise.all(
        calendarIds.map((id) => fetchEventsFromCalendar(id, accessToken, dataInicio, dataFim)),
      )
    ).flat();

    // Deduplicar por id do evento
    const seen = new Set<string>();
    const unique = allItems.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    return unique.map((item) => {
      const diaTodo = !!item.start.date;
      const dataStr = (item.start.date ?? item.start.dateTime ?? '').slice(0, 10);

      return {
        id: `google-${item.id}`,
        tipo: 'google' as const,
        titulo: item.summary ?? '(sem título)',
        data: dataStr,
        meta: {
          descricao: item.description,
          hangoutLink: item.hangoutLink,
          htmlLink: item.htmlLink,
          horaInicio: item.start.dateTime,
          horaFim: item.end.dateTime,
          diaTodo,
        },
      };
    });
  } catch {
    return [];
  }
}

export interface GoogleTarefaEvento {
  id: string;
  tipo: 'google';
  titulo: string;
  data: string;
  meta: {
    descricao?: string;
    concluida?: boolean;
    htmlLink?: string;
    diaTodo: boolean;
    isTarefa: boolean;
  };
}

export async function fetchGoogleTasksEvents(
  usuarioId: string,
  dataInicio: Date,
  dataFim: Date,
): Promise<GoogleTarefaEvento[]> {
  const accessToken = await getAccessToken(usuarioId);
  if (!accessToken) return [];

  try {
    // Buscar listas de tarefas
    const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listsRes.ok) return [];

    const lists = (await listsRes.json()) as { items?: Array<{ id: string; title: string }> };

    const allTasks = (
      await Promise.all(
        (lists.items ?? []).map(async (list) => {
          const url = new URL(`https://tasks.googleapis.com/tasks/v1/lists/${list.id}/tasks`);
          url.searchParams.set('showCompleted', 'false');
          url.searchParams.set('showHidden', 'false');
          url.searchParams.set('dueMin', dataInicio.toISOString());
          url.searchParams.set('dueMax', dataFim.toISOString());
          url.searchParams.set('maxResults', '100');

          const res = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!res.ok) return [];

          const data = (await res.json()) as {
            items?: Array<{
              id: string;
              title?: string;
              notes?: string;
              status?: string;
              due?: string;
              webViewLink?: string;
            }>;
          };

          return (data.items ?? []);
        }),
      )
    ).flat();

    return allTasks
      .filter((task) => task.due)
      .map((task) => {
        const dataStr = task.due!.slice(0, 10);
        return {
          id: `google-task-${task.id}`,
          tipo: 'google' as const,
          titulo: task.title ?? '(sem título)',
          data: dataStr,
          meta: {
            descricao: task.notes,
            concluida: task.status === 'completed',
            htmlLink: task.webViewLink,
            diaTodo: true,
            isTarefa: true,
          },
        };
      });
  } catch {
    return [];
  }
}

export async function createGoogleTask(
  usuarioId: string,
  task: { titulo: string; descricao?: string | null; dataVencimento?: Date | null },
): Promise<string | null> {
  const accessToken = await getAccessToken(usuarioId);
  if (!accessToken) return null;

  try {
    // Garantir que existe uma lista padrão
    const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listsRes.ok) return null;

    const lists = (await listsRes.json()) as { items?: Array<{ id: string }> };
    const listId = lists.items?.[0]?.id;
    if (!listId) return null;

    const body: Record<string, string> = { title: task.titulo };
    if (task.descricao) body.notes = task.descricao;
    if (task.dataVencimento) body.due = task.dataVencimento.toISOString();

    const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) return null;
    const created = (await res.json()) as { id: string };
    return created.id;
  } catch {
    return null;
  }
}

export async function createGoogleCalendarEvent(
  usuarioId: string,
  event: { titulo: string; descricao?: string | null; inicio: Date; fim?: Date },
): Promise<string | null> {
  const accessToken = await getAccessToken(usuarioId);
  if (!accessToken) return null;

  try {
    const fim = event.fim ?? new Date(event.inicio.getTime() + 60 * 60 * 1000); // +1h padrão

    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: event.titulo,
          description: event.descricao ?? undefined,
          start: { dateTime: event.inicio.toISOString() },
          end: { dateTime: fim.toISOString() },
        }),
      },
    );

    if (!res.ok) return null;
    const created = (await res.json()) as { id: string };
    return created.id;
  } catch {
    return null;
  }
}

export async function isGoogleCalendarConnected(usuarioId: string): Promise<boolean> {
  const record = await db.query.googleCalendarTokens.findFirst({
    where: eq(googleCalendarTokens.usuarioId, usuarioId),
  });
  return !!record;
}
