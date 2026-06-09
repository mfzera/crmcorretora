
import { useState } from 'react';
import { Swords, Calendar, ChevronRight, Megaphone, Target } from 'lucide-react';
import { Progress } from '@/core/ui/progress';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from '@/core/ui/sidebar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/core/ui/sheet';
import { MissaoCard } from '@/modules/gamificacao/components/MissaoCard';
import { CampanhaCard } from '@/modules/gamificacao/components/CampanhaCard';
import { MetaProgressCard } from '@/modules/gamificacao/components/MetaProgressCard';
import {
  useMissoesAtivas,
  useCampanhasAtivas,
  useMetasAtivas,
} from '@/modules/gamificacao/http';

function diasRestantes(prazo: string): number {
  const fim = new Date(prazo);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

export function SidebarMissoesPanel() {
  const { data: missoes = [] } = useMissoesAtivas();
  const { data: campanhas = [] } = useCampanhasAtivas();
  const { data: metas = [] } = useMetasAtivas();

  const [openMissoes, setOpenMissoes] = useState(false);
  const [openCampanhas, setOpenCampanhas] = useState(false);
  const [openMetas, setOpenMetas] = useState(false);

  const missoesAtivas = missoes.filter(
    (m: any) => m.status === 'PENDENTE' || m.status === 'EM_ANDAMENTO',
  );

  const campanhasAtivas = campanhas.filter((c: any) => {
    const hoje = new Date().toISOString().split('T')[0];
    return c.ativa && c.dataInicio <= hoje && c.dataFim >= hoje;
  });

  const metasAtivas = metas.filter((m: any) => m.status === 'ATIVA');

  return (
    <>
      {/* Missões */}
      {missoesAtivas.length > 0 && (
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel
            className="flex items-center justify-between gap-1.5 text-xs text-muted-foreground px-2 cursor-pointer hover:text-foreground transition-colors"
            onClick={() => setOpenMissoes(true)}
          >
            <span className="flex items-center gap-1.5">
              <Swords className="h-3 w-3 text-orange-500" />
              Missões
            </span>
            <ChevronRight className="h-3 w-3" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2 space-y-2">
              {missoesAtivas.map((missao: any) => {
                const dias = diasRestantes(missao.prazo);
                return (
                  <div
                    key={missao.id}
                    className="space-y-1 cursor-pointer"
                    onClick={() => setOpenMissoes(true)}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-medium truncate leading-tight flex-1">
                        {missao.titulo}
                      </p>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {missao.percentual}%
                      </span>
                    </div>
                    <Progress value={missao.percentual} className="h-1.5" />
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-2.5 w-2.5" />
                      <span>{dias > 0 ? `${dias}d` : 'Prazo encerrado'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      )}

      {/* Campanhas */}
      {campanhasAtivas.length > 0 && (
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel
            className="flex items-center justify-between gap-1.5 text-xs text-muted-foreground px-2 cursor-pointer hover:text-foreground transition-colors"
            onClick={() => setOpenCampanhas(true)}
          >
            <span className="flex items-center gap-1.5">
              <Megaphone className="h-3 w-3 text-emerald-500" />
              Campanhas
            </span>
            <ChevronRight className="h-3 w-3" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2 space-y-2">
              {campanhasAtivas.map((campanha: any) => {
                const dias = diasRestantes(campanha.dataFim);
                return (
                  <div
                    key={campanha.id}
                    className="space-y-1 cursor-pointer"
                    onClick={() => setOpenCampanhas(true)}
                  >
                    <p className="text-xs font-medium truncate leading-tight">
                      {campanha.titulo}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-2.5 w-2.5" />
                      <span>{dias > 0 ? `${dias}d` : 'Encerrada'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      )}

      {/* Metas */}
      {metasAtivas.length > 0 && (
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel
            className="flex items-center justify-between gap-1.5 text-xs text-muted-foreground px-2 cursor-pointer hover:text-foreground transition-colors"
            onClick={() => setOpenMetas(true)}
          >
            <span className="flex items-center gap-1.5">
              <Target className="h-3 w-3 text-blue-500" />
              Metas
            </span>
            <ChevronRight className="h-3 w-3" />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2 space-y-2">
              {metasAtivas.map((meta: any) => {
                const dias = diasRestantes(meta.dataFim);
                return (
                  <div
                    key={meta.id}
                    className="space-y-1 cursor-pointer"
                    onClick={() => setOpenMetas(true)}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-medium truncate leading-tight flex-1">
                        {meta.titulo}
                      </p>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {meta.percentual}%
                      </span>
                    </div>
                    <Progress value={meta.percentual} className="h-1.5" />
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-2.5 w-2.5" />
                      <span>{dias > 0 ? `${dias}d` : 'Prazo encerrado'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      )}

      {/* Sheet Missões */}
      <Sheet open={openMissoes} onOpenChange={setOpenMissoes}>
        <SheetContent side="left" className="w-80 sm:w-96 overflow-y-auto dark:bg-zinc-900">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Swords className="h-4 w-4 text-orange-500" />
              Missões
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3 px-1">
            {missoes
              .filter((m: any) => m.status !== 'CANCELADA')
              .map((missao: any) => (
                <MissaoCard key={missao.id} missao={missao} />
              ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet Campanhas */}
      <Sheet open={openCampanhas} onOpenChange={setOpenCampanhas}>
        <SheetContent side="left" className="w-80 sm:w-96 overflow-y-auto dark:bg-zinc-900">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-emerald-500" />
              Campanhas
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3 px-1">
            {campanhas
              .filter((c: any) => c.ativa)
              .map((campanha: any) => (
                <CampanhaCard key={campanha.id} campanha={campanha} />
              ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet Metas */}
      <Sheet open={openMetas} onOpenChange={setOpenMetas}>
        <SheetContent side="left" className="w-80 sm:w-96 overflow-y-auto dark:bg-zinc-900">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              Metas
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-3 px-1">
            {metas
              .filter((m: any) => m.status !== 'CANCELADA')
              .map((meta: any) => (
                <MetaProgressCard key={meta.id} meta={meta} />
              ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
