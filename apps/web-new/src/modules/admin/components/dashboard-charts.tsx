
import {
  Bar, BarChart, Line, LineChart, CartesianGrid,
  ResponsiveContainer, Cell, XAxis, YAxis, Tooltip, ReferenceArea,
} from 'recharts';

const NEON_FILTER = (
  <defs>
    <filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
);

// ─── Tiny sparkline ───────────────────────────────────────────────────────────

export function Spark({ data, color = '#4C9AFF', neon = false }: { data: { v: number }[]; color?: string; neon?: boolean }) {
  const max = Math.max(...data.map((d) => d.v), 1);
  const hexColor = color.replace('#', '');
  const r = parseInt(hexColor.slice(0, 2), 16);
  const g = parseInt(hexColor.slice(2, 4), 16);
  const b = parseInt(hexColor.slice(4, 6), 16);
  return (
    <div style={neon ? { filter: `drop-shadow(0 0 3px rgba(${r},${g},${b},0.55))` } : undefined}>
      <ResponsiveContainer width="100%" height={28}>
        <BarChart data={data} barSize={2} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          {neon && NEON_FILTER}
          <Bar dataKey="v" isAnimationActive={false} radius={1}>
            {data.map((e, i) => (
              <Cell key={i} fill={color} fillOpacity={0.3 + 0.7 * (e.v / max)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Sparkline with time axis ─────────────────────────────────────────────────

export function SparkTime({
  data, color = '#4C9AFF', label = 'Valor', unit = '',
}: {
  data: { v: number; ts: number }[];
  color?: string;
  label?: string;
  unit?: string;
}) {
  const max = Math.max(...data.map((d) => d.v), 1);
  const tick = { fill: 'rgba(242,243,245,0.25)', fontSize: 8, fontFamily: 'monospace' };

  function fmtTs(ts: number) {
    const d = new Date(ts * 1000);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  const tickInterval = data.length > 8 ? Math.ceil(data.length / 5) - 1 : 'preserveStartEnd';

  const hexColor = color.replace('#', '');
  const r = parseInt(hexColor.slice(0, 2), 16);
  const g = parseInt(hexColor.slice(2, 4), 16);
  const b = parseInt(hexColor.slice(4, 6), 16);

  return (
    <div style={{ filter: `drop-shadow(0 0 2.5px rgba(${r},${g},${b},0.5))` }}>
      <ResponsiveContainer width="100%" height={44}>
        <BarChart data={data} barSize={2} margin={{ top: 0, right: 14, bottom: 0, left: 14 }}>
          {NEON_FILTER}
          <XAxis
            dataKey="ts"
            tickFormatter={fmtTs}
            tick={tick}
            tickLine={false}
            axisLine={false}
            interval={tickInterval}
            height={14}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const pt = payload[0].payload as { v: number; ts: number };
              return (
                <div className="rounded border border-border/60 bg-[#1a1e24] px-2 py-1.5 shadow-xl text-[10px] pointer-events-none">
                  <p className="font-mono text-muted-foreground mb-0.5">{fmtTs(pt.ts)}</p>
                  <p className="font-semibold tabular-nums" style={{ color }}>
                    {label}: {pt.v.toFixed(2)}{unit}
                  </p>
                </div>
              );
            }}
            cursor={{ fill: 'rgba(255,255,255,0.06)' }}
          />
          <Bar dataKey="v" isAnimationActive={false} radius={1}>
            {data.map((e, i) => (
              <Cell key={i} fill={color} fillOpacity={0.25 + 0.75 * (e.v / max)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── HTTP hourly sparkline with stacked bars + tooltip ────────────────────────

type HttpHourPoint = { hour: string; s2xx: number; s4xx: number; s5xx: number };

export function SparkHttp({ data }: { data: HttpHourPoint[] }) {
  function fmtHour(h: string) {
    // backend returns "HH:00" directly; fallback for ISO strings
    if (/^\d{1,2}:\d{2}/.test(h)) return h.slice(0, 5);
    const d = new Date(h);
    return isNaN(d.getTime()) ? h : `${String(d.getHours()).padStart(2, '0')}:00`;
  }

  const hasErrors = data.some((d) => d.s4xx > 0 || d.s5xx > 0);

  return (
    <div style={{ filter: `drop-shadow(0 0 3px rgba(52,211,153,${hasErrors ? '0.25' : '0.4'}))` }}>
      <ResponsiveContainer width="100%" height={72}>
        <BarChart data={data} barSize={5} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          {NEON_FILTER}
          <XAxis
            dataKey="hour"
            tickFormatter={fmtHour}
            tick={{ fill: 'rgba(242,243,245,0.25)', fontSize: 8, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            height={16}
          />
          <Tooltip
            position={{ y: -120 }}
            allowEscapeViewBox={{ x: false, y: true }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as HttpHourPoint;
              const total = p.s2xx + p.s4xx + p.s5xx;
              const errRate = total > 0 ? ((p.s4xx + p.s5xx) / total * 100).toFixed(1) : null;
              const errPct = errRate ? parseFloat(errRate) : 0;
              return (
                <div className="rounded border border-border/60 bg-[#1a1e24] px-2.5 py-2 shadow-xl text-[10px] min-w-[130px] pointer-events-none">
                  <p className="font-mono text-muted-foreground/60 mb-1.5">{fmtHour(p.hour)}</p>
                  <div className="space-y-0.5">
                    <div className="flex justify-between gap-4">
                      <span style={{ color: '#34d399' }}>2xx</span>
                      <span className="font-semibold tabular-nums text-foreground">{p.s2xx.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span style={{ color: '#fbbf24' }}>4xx</span>
                      <span className="font-semibold tabular-nums text-foreground">{p.s4xx.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span style={{ color: '#f87171' }}>5xx</span>
                      <span className="font-semibold tabular-nums text-foreground">{p.s5xx.toLocaleString('pt-BR')}</span>
                    </div>
                    {errRate !== null && (
                      <div className="flex justify-between gap-4 pt-1 border-t border-border/30 mt-0.5">
                        <span className="text-muted-foreground">err%</span>
                        <span className="font-semibold tabular-nums" style={{
                          color: errPct > 5 ? '#f87171' : errPct > 1 ? '#fbbf24' : '#34d399',
                        }}>{errRate}%</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          <Bar dataKey="s2xx" stackId="a" fill="#34d399" fillOpacity={0.7} isAnimationActive={false} radius={0} />
          <Bar dataKey="s4xx" stackId="a" fill="#fbbf24" fillOpacity={0.9} isAnimationActive={false} radius={0} />
          <Bar dataKey="s5xx" stackId="a" fill="#f87171" fillOpacity={0.9} isAnimationActive={false} radius={[1, 1, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Neon Rows inline chart (reference-style) ────────────────────────────────

export type NeonRowPoint = { timestamp: string; inserted: number; updated: number; deleted: number };

export function NeonRowsInlineChart({ series }: { series: NeonRowPoint[] }) {
  if (!series.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px] gap-2">
        <span className="text-[10px] text-muted-foreground/30 font-mono uppercase tracking-wider">
          Aguardando amostras
        </span>
        <span className="text-[9px] text-muted-foreground/20 font-mono">
          O histórico acumula a cada 5 min de atividade
        </span>
      </div>
    );
  }

  const inactiveZones: Array<{ x1: string; x2: string }> = [];
  let zoneStart: string | null = null;
  let zeroCount = 0;
  for (let i = 0; i < series.length; i++) {
    const p = series[i];
    const isZero = p.inserted === 0 && p.updated === 0 && p.deleted === 0;
    if (isZero) {
      if (!zoneStart) { zoneStart = p.timestamp; zeroCount = 1; }
      else zeroCount++;
    } else {
      if (zoneStart && zeroCount >= 3) inactiveZones.push({ x1: zoneStart, x2: series[i - 1].timestamp });
      zoneStart = null; zeroCount = 0;
    }
  }
  if (zoneStart && zeroCount >= 3) inactiveZones.push({ x1: zoneStart, x2: series[series.length - 1].timestamp });

  function fmtTime(ts: string) {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function fmtTimeFull(ts: string) {
    const d = new Date(ts);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${h}:${m}:${s}`;
  }

  const yMax = Math.max(...series.flatMap((p) => [p.inserted, p.updated, p.deleted]), 5);
  const yDomain: [number, number] = [0, Math.ceil(yMax * 1.2)];
  const colIns = '#34d399', colUpd = '#4CC9F0', colDel = '#6b7280';

  return (
    <div>
      <div className="flex items-center gap-4 px-4 pt-3 pb-1 flex-wrap">
        <span className="text-[11px] font-semibold text-foreground/70">Rows</span>
        <div className="flex items-center gap-3 text-[8px] font-mono text-muted-foreground/40 uppercase tracking-wider">
          <span>Count</span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-2.5 border border-muted-foreground/20 shrink-0"
              style={{ backgroundImage: 'repeating-linear-gradient(-45deg, rgba(255,255,255,0.10), rgba(255,255,255,0.10) 1px, transparent 1px, transparent 5px)' }}
            />
            Endpoint Inactive
          </span>
          {[
            { col: colIns, label: 'Inserted' },
            { col: colUpd, label: 'Updated' },
            { col: colDel, label: 'Deleted' },
          ].map(({ col, label }) => (
            <span key={label} className="flex items-center gap-1">
              <span className="inline-block w-4 border-t-2 shrink-0" style={{ borderColor: col }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={190}>
        <LineChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
          <defs>
            <pattern id="neon-inactive" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(-45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.09)" strokeWidth="2.5" />
            </pattern>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
          {inactiveZones.map((z, i) => (
            <ReferenceArea key={i} x1={z.x1} x2={z.x2} fill="url(#neon-inactive)" strokeOpacity={0} />
          ))}
          <XAxis
            dataKey="timestamp"
            tickFormatter={fmtTime}
            tick={{ fill: 'rgba(242,243,245,0.28)', fontSize: 9, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'rgba(242,243,245,0.28)', fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            width={28}
            domain={yDomain}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-lg border border-border/60 bg-[#1a1e24] px-3 py-2.5 shadow-xl text-xs min-w-[190px]">
                  <p className="font-mono text-muted-foreground/70 mb-2 text-[10px]">{fmtTimeFull(label as string)}</p>
                  {(['deleted', 'updated', 'inserted'] as const).map((key) => {
                    const entry = payload.find((p) => p.dataKey === key);
                    if (!entry) return null;
                    return (
                      <div key={key} className="flex items-center justify-between gap-8 py-0.5">
                        <span className="capitalize" style={{ color: entry.color as string }}>{entry.name}:</span>
                        <span className="font-semibold tabular-nums text-foreground">{entry.value}</span>
                      </div>
                    );
                  })}
                </div>
              );
            }}
            cursor={{ stroke: 'rgba(255,255,255,0.14)', strokeWidth: 1 }}
          />
          <Line isAnimationActive={false} type="monotone" dataKey="inserted" name="Inserted" stroke={colIns} strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: colIns, strokeWidth: 0 }} />
          <Line isAnimationActive={false} type="monotone" dataKey="updated"  name="Updated"  stroke={colUpd} strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: colUpd, strokeWidth: 0 }} />
          <Line isAnimationActive={false} type="monotone" dataKey="deleted"  name="Deleted"  stroke={colDel} strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: colDel, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
