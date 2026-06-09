# shadcn/ui - Documentacao para IA

> Referencia completa dos componentes shadcn/ui instalados no projeto.
> Localizacao: `apps/web/src/components/ui/`

## Configuracao

- **Estilo**: new-york
- **Tailwind CSS**: v4
- **RSC**: Habilitado (React Server Components)
- **Icones**: lucide-react
- **Alias de importacao**: `@/components/ui/`

---

## Componentes Disponiveis

### Alert

Exibe mensagens de feedback contextual.

```tsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

<Alert>
  <AlertTitle>Titulo</AlertTitle>
  <AlertDescription>Descricao da mensagem.</AlertDescription>
</Alert>

// Variantes
<Alert variant="default">...</Alert>
<Alert variant="destructive">...</Alert>
```

**Props Alert:**
- `variant`: "default" | "destructive"

---

### AlertDialog

Modal de confirmacao para acoes destrutivas ou importantes.

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Excluir</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Voce tem certeza?</AlertDialogTitle>
      <AlertDialogDescription>
        Esta acao nao pode ser desfeita.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction>Confirmar</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### Avatar

Exibe imagem de perfil do usuario com fallback.

```tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

<Avatar>
  <AvatarImage src="https://github.com/user.png" alt="@usuario" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>

// Tamanhos customizados via className
<Avatar className="h-12 w-12">...</Avatar>
<Avatar className="h-8 w-8">...</Avatar>
```

---

### Badge

Rotulos e tags para categorizar ou destacar informacoes.

```tsx
import { Badge } from "@/components/ui/badge"

<Badge>Padrao</Badge>
<Badge variant="secondary">Secundario</Badge>
<Badge variant="destructive">Destrutivo</Badge>
<Badge variant="outline">Outline</Badge>
```

**Props:**
- `variant`: "default" | "secondary" | "destructive" | "outline"

---

### Breadcrumb

Navegacao hierarquica mostrando o caminho atual.

```tsx
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/produtos">Produtos</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Detalhes</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

---

### Button

Botao principal para acoes do usuario.

```tsx
import { Button } from "@/components/ui/button"

// Variantes
<Button>Padrao</Button>
<Button variant="secondary">Secundario</Button>
<Button variant="destructive">Destrutivo</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Tamanhos
<Button size="default">Padrao</Button>
<Button size="sm">Pequeno</Button>
<Button size="lg">Grande</Button>
<Button size="icon"><IconComponent /></Button>

// Estados
<Button disabled>Desabilitado</Button>
<Button asChild><Link href="/page">Como Link</Link></Button>

// Com icone
import { Loader2 } from "lucide-react"
<Button disabled>
  <Loader2 className="animate-spin" />
  Carregando
</Button>
```

**Props:**
- `variant`: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
- `size`: "default" | "sm" | "lg" | "icon"
- `asChild`: boolean - renderiza como filho (para usar com Link)
- `disabled`: boolean

---

### Calendar

Seletor de datas.

```tsx
"use client"
import { Calendar } from "@/components/ui/calendar"
import { useState } from "react"

function DatePicker() {
  const [date, setDate] = useState<Date | undefined>(new Date())

  return (
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      className="rounded-md border"
    />
  )
}

// Selecao de intervalo
const [dateRange, setDateRange] = useState<DateRange | undefined>()
<Calendar
  mode="range"
  selected={dateRange}
  onSelect={setDateRange}
/>

// Multiplas datas
const [dates, setDates] = useState<Date[] | undefined>()
<Calendar
  mode="multiple"
  selected={dates}
  onSelect={setDates}
/>
```

**Props:**
- `mode`: "single" | "range" | "multiple"
- `selected`: Date | DateRange | Date[]
- `onSelect`: funcao callback
- `disabled`: Date[] | funcao - datas desabilitadas
- `fromDate`: Date - data minima
- `toDate`: Date - data maxima

---

### Card

Container para agrupar conteudo relacionado.

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Titulo do Card</CardTitle>
    <CardDescription>Descricao do card</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Conteudo principal aqui.</p>
  </CardContent>
  <CardFooter>
    <Button>Acao</Button>
  </CardFooter>
</Card>

// Card clicavel
<Card className="cursor-pointer hover:bg-accent">...</Card>
```

---

### Chart

Graficos usando Recharts com tema integrado.

```tsx
"use client"
import { Bar, BarChart, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"

const chartData = [
  { month: "Jan", vendas: 186, meta: 200 },
  { month: "Fev", vendas: 305, meta: 200 },
]

const chartConfig = {
  vendas: {
    label: "Vendas",
    color: "hsl(var(--chart-1))",
  },
  meta: {
    label: "Meta",
    color: "hsl(var(--chart-2))",
  },
}

<ChartContainer config={chartConfig} className="h-[300px]">
  <BarChart data={chartData}>
    <XAxis dataKey="month" />
    <YAxis />
    <ChartTooltip content={<ChartTooltipContent />} />
    <ChartLegend content={<ChartLegendContent />} />
    <Bar dataKey="vendas" fill="var(--color-vendas)" radius={4} />
    <Bar dataKey="meta" fill="var(--color-meta)" radius={4} />
  </BarChart>
</ChartContainer>
```

**Cores disponiveis:** --chart-1 ate --chart-5

---

### Collapsible

Conteudo expansivel/colapsavel.

```tsx
"use client"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useState } from "react"

function CollapsibleDemo() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost">
          {isOpen ? "Fechar" : "Abrir"}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        Conteudo expansivel aqui.
      </CollapsibleContent>
    </Collapsible>
  )
}
```

---

### ContextMenu

Menu de contexto (clique direito).

```tsx
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu"

<ContextMenu>
  <ContextMenuTrigger className="h-32 w-full border">
    Clique direito aqui
  </ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem>
      Copiar <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
    </ContextMenuItem>
    <ContextMenuItem>
      Colar <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
    </ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuSub>
      <ContextMenuSubTrigger>Mais opcoes</ContextMenuSubTrigger>
      <ContextMenuSubContent>
        <ContextMenuItem>Opcao 1</ContextMenuItem>
        <ContextMenuItem>Opcao 2</ContextMenuItem>
      </ContextMenuSubContent>
    </ContextMenuSub>
  </ContextMenuContent>
</ContextMenu>
```

---

### Dialog

Modal para conteudo interativo.

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger asChild>
    <Button>Abrir Modal</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Titulo do Modal</DialogTitle>
      <DialogDescription>
        Descricao ou instrucoes aqui.
      </DialogDescription>
    </DialogHeader>
    <div className="py-4">
      Conteudo do modal
    </div>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Cancelar</Button>
      </DialogClose>
      <Button>Salvar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// Controlado programaticamente
const [open, setOpen] = useState(false)
<Dialog open={open} onOpenChange={setOpen}>...</Dialog>
```

---

### DropdownMenu

Menu suspenso para acoes.

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuShortcut,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Menu</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuGroup>
      <DropdownMenuItem>
        Perfil <DropdownMenuShortcut>Ctrl+P</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem>Configuracoes</DropdownMenuItem>
    </DropdownMenuGroup>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive">
      Sair
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

// Com checkbox
<DropdownMenuCheckboxItem checked={checked} onCheckedChange={setChecked}>
  Mostrar barra
</DropdownMenuCheckboxItem>

// Com radio
<DropdownMenuRadioGroup value={position} onValueChange={setPosition}>
  <DropdownMenuRadioItem value="top">Topo</DropdownMenuRadioItem>
  <DropdownMenuRadioItem value="bottom">Baixo</DropdownMenuRadioItem>
</DropdownMenuRadioGroup>
```

**Props DropdownMenuContent:**
- `align`: "start" | "center" | "end"
- `side`: "top" | "right" | "bottom" | "left"

---

### HoverCard

Card que aparece ao passar o mouse.

```tsx
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

<HoverCard>
  <HoverCardTrigger asChild>
    <Button variant="link">@usuario</Button>
  </HoverCardTrigger>
  <HoverCardContent className="w-80">
    <div className="flex space-x-4">
      <Avatar>
        <AvatarImage src="/avatar.png" />
        <AvatarFallback>US</AvatarFallback>
      </Avatar>
      <div>
        <h4 className="text-sm font-semibold">@usuario</h4>
        <p className="text-sm text-muted-foreground">
          Descricao do usuario.
        </p>
      </div>
    </div>
  </HoverCardContent>
</HoverCard>
```

---

### Input

Campo de entrada de texto.

```tsx
import { Input } from "@/components/ui/input"

<Input type="text" placeholder="Digite aqui..." />
<Input type="email" placeholder="email@exemplo.com" />
<Input type="password" />
<Input type="number" min={0} max={100} />
<Input type="file" />
<Input disabled placeholder="Desabilitado" />

// Com label
import { Label } from "@/components/ui/label"
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="email@exemplo.com" />
</div>

// Com icone
<div className="relative">
  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
  <Input placeholder="Buscar..." className="pl-8" />
</div>
```

---

### InputOTP

Campo para entrada de codigo OTP.

```tsx
"use client"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp"

<InputOTP maxLength={6}>
  <InputOTPGroup>
    <InputOTPSlot index={0} />
    <InputOTPSlot index={1} />
    <InputOTPSlot index={2} />
  </InputOTPGroup>
  <InputOTPSeparator />
  <InputOTPGroup>
    <InputOTPSlot index={3} />
    <InputOTPSlot index={4} />
    <InputOTPSlot index={5} />
  </InputOTPGroup>
</InputOTP>

// Controlado
const [value, setValue] = useState("")
<InputOTP value={value} onChange={setValue} maxLength={6}>...</InputOTP>
```

---

### Pagination

Navegacao entre paginas de dados.

```tsx
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

<Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationPrevious href="#" />
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#">1</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#" isActive>2</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#">3</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationEllipsis />
    </PaginationItem>
    <PaginationItem>
      <PaginationNext href="#" />
    </PaginationItem>
  </PaginationContent>
</Pagination>
```

---

### Progress

Barra de progresso.

```tsx
import { Progress } from "@/components/ui/progress"

<Progress value={33} />
<Progress value={66} className="h-2" />

// Animado
const [progress, setProgress] = useState(0)
useEffect(() => {
  const timer = setTimeout(() => setProgress(66), 500)
  return () => clearTimeout(timer)
}, [])
<Progress value={progress} />
```

**Props:**
- `value`: number (0-100)

---

### Select

Dropdown para selecao de opcoes.

```tsx
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

<Select>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Selecione..." />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Frutas</SelectLabel>
      <SelectItem value="apple">Maca</SelectItem>
      <SelectItem value="banana">Banana</SelectItem>
      <SelectItem value="orange">Laranja</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>

// Controlado
const [value, setValue] = useState("")
<Select value={value} onValueChange={setValue}>...</Select>

// Desabilitado
<Select disabled>...</Select>
<SelectItem value="x" disabled>Indisponivel</SelectItem>
```

---

### Separator

Linha divisoria entre conteudos.

```tsx
import { Separator } from "@/components/ui/separator"

<Separator /> {/* horizontal */}
<Separator orientation="vertical" className="h-4" />

// Exemplo de uso
<div>
  <h4>Titulo</h4>
  <Separator className="my-4" />
  <p>Conteudo abaixo do separador</p>
</div>
```

---

### Sheet

Painel lateral deslizante.

```tsx
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline">Abrir Menu</Button>
  </SheetTrigger>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Menu Lateral</SheetTitle>
      <SheetDescription>
        Configuracoes e opcoes aqui.
      </SheetDescription>
    </SheetHeader>
    <div className="py-4">
      Conteudo do sheet
    </div>
    <SheetFooter>
      <SheetClose asChild>
        <Button>Fechar</Button>
      </SheetClose>
    </SheetFooter>
  </SheetContent>
</Sheet>

// Diferentes lados
<SheetContent side="left">...</SheetContent>
<SheetContent side="right">...</SheetContent>
<SheetContent side="top">...</SheetContent>
<SheetContent side="bottom">...</SheetContent>
```

**Props SheetContent:**
- `side`: "top" | "right" | "bottom" | "left" (default: "right")

---

### Sidebar

Navegacao lateral completa com estado persistente.

```tsx
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"

// No layout principal
export default function Layout({ children }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  )
}

// Componente Sidebar
function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <h2>Logo</h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/dashboard">
                    <Home className="h-4 w-4" />
                    <span>Dashboard</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/clientes">
                    <Users className="h-4 w-4" />
                    <span>Clientes</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  )
}

// Hook para controlar sidebar
function Component() {
  const { open, setOpen, toggleSidebar } = useSidebar()
  return <Button onClick={toggleSidebar}>Toggle</Button>
}
```

---

### Skeleton

Placeholder de carregamento.

```tsx
import { Skeleton } from "@/components/ui/skeleton"

// Formas basicas
<Skeleton className="h-4 w-[250px]" />
<Skeleton className="h-12 w-12 rounded-full" />

// Card skeleton
<div className="flex items-center space-x-4">
  <Skeleton className="h-12 w-12 rounded-full" />
  <div className="space-y-2">
    <Skeleton className="h-4 w-[250px]" />
    <Skeleton className="h-4 w-[200px]" />
  </div>
</div>

// Tabela skeleton
<div className="space-y-2">
  {Array.from({ length: 5 }).map((_, i) => (
    <Skeleton key={i} className="h-12 w-full" />
  ))}
</div>
```

---

### Sonner (Toast)

Notificacoes toast.

```tsx
// Em providers/index.tsx ou layout.tsx
import { Toaster } from "@/components/ui/sonner"

export function Providers({ children }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}

// Uso em componentes
import { toast } from "sonner"

// Toast simples
toast("Evento criado com sucesso")

// Com descricao
toast("Evento criado", {
  description: "Sexta-feira, 10 de Janeiro de 2025",
})

// Tipos
toast.success("Salvo com sucesso!")
toast.error("Erro ao salvar")
toast.warning("Atencao!")
toast.info("Informacao importante")

// Com acao
toast("Arquivo deletado", {
  action: {
    label: "Desfazer",
    onClick: () => console.log("Desfazer"),
  },
})

// Promise toast
toast.promise(saveData(), {
  loading: "Salvando...",
  success: "Dados salvos!",
  error: "Erro ao salvar",
})

// Posicao
<Toaster position="top-right" />
<Toaster position="bottom-center" />
```

---

### Tabs

Navegacao por abas.

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

<Tabs defaultValue="conta" className="w-[400px]">
  <TabsList>
    <TabsTrigger value="conta">Conta</TabsTrigger>
    <TabsTrigger value="senha">Senha</TabsTrigger>
  </TabsList>
  <TabsContent value="conta">
    <Card>
      <CardHeader>
        <CardTitle>Conta</CardTitle>
      </CardHeader>
      <CardContent>
        Configuracoes da conta aqui.
      </CardContent>
    </Card>
  </TabsContent>
  <TabsContent value="senha">
    <Card>
      <CardHeader>
        <CardTitle>Senha</CardTitle>
      </CardHeader>
      <CardContent>
        Alterar senha aqui.
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>

// Controlado
const [tab, setTab] = useState("conta")
<Tabs value={tab} onValueChange={setTab}>...</Tabs>
```

---

### Textarea

Campo de texto multi-linha.

```tsx
import { Textarea } from "@/components/ui/textarea"

<Textarea placeholder="Digite sua mensagem..." />
<Textarea disabled />

// Com label
<div className="space-y-2">
  <Label htmlFor="message">Mensagem</Label>
  <Textarea id="message" placeholder="Digite aqui..." />
</div>

// Tamanho fixo
<Textarea className="resize-none" rows={5} />
```

---

### Tooltip

Dica ao passar o mouse.

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Envolver app com TooltipProvider (uma vez no layout)
<TooltipProvider>
  {children}
</TooltipProvider>

// Uso
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="outline" size="icon">
      <Info className="h-4 w-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>Informacao adicional</p>
  </TooltipContent>
</Tooltip>

// Posicao
<TooltipContent side="right">...</TooltipContent>
<TooltipContent side="bottom">...</TooltipContent>
```

---

## Utilitarios

### cn() - Class Names

Funcao para mesclar classes Tailwind.

```tsx
import { cn } from "@/lib/utils"

// Uso basico
<div className={cn("flex items-center", className)} />

// Condicional
<div className={cn(
  "base-class",
  isActive && "active-class",
  isDisabled && "opacity-50 cursor-not-allowed"
)} />
```

---

## Hooks

### useMobile

Detecta se esta em dispositivo movel.

```tsx
import { useIsMobile } from "@/hooks/use-mobile"

function Component() {
  const isMobile = useIsMobile()
  
  return isMobile ? <MobileView /> : <DesktopView />
}
```

### useMounted

Verifica se o componente foi montado (util para SSR).

```tsx
import { useMounted } from "@/hooks/use-mounted"

function Component() {
  const mounted = useMounted()
  
  if (!mounted) return null
  
  return <ClientOnlyContent />
}
```

---

## Padroes de Uso

### Formularios

```tsx
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

<form className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="nome">Nome</Label>
    <Input id="nome" placeholder="Seu nome" />
  </div>
  
  <div className="space-y-2">
    <Label htmlFor="tipo">Tipo</Label>
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Selecione..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="a">Opcao A</SelectItem>
        <SelectItem value="b">Opcao B</SelectItem>
      </SelectContent>
    </Select>
  </div>
  
  <Button type="submit">Enviar</Button>
</form>
```

### Tabelas com Acoes

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Nome</TableHead>
      <TableHead>Status</TableHead>
      <TableHead className="text-right">Acoes</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.map((item) => (
      <TableRow key={item.id}>
        <TableCell>{item.nome}</TableCell>
        <TableCell>
          <Badge variant={item.ativo ? "default" : "secondary"}>
            {item.ativo ? "Ativo" : "Inativo"}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Editar</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Loading States

```tsx
// Botao com loading
const [loading, setLoading] = useState(false)

<Button disabled={loading}>
  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {loading ? "Salvando..." : "Salvar"}
</Button>

// Skeleton durante carregamento
{isLoading ? (
  <div className="space-y-2">
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
  </div>
) : (
  <Content />
)}
```

---

## Adicionar Novos Componentes

```bash
cd apps/web && pnpm dlx shadcn@latest add <nome-componente>
```

Componentes disponiveis: https://ui.shadcn.com/docs/components
