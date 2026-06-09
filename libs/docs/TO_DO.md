# LISTA DE TAREFAS RESTANTES

## BUGS E ERROS A RESOLVER

### em **/kanban**

```
## Error Type
Console TypeError

## Error Message
Cannot read properties of undefined (reading 'id')


    at useUpdateOportunidade.useMutation [as onSuccess] (file:///home/mf/Área de trabalho/ecotech/ecotech-sys/apps/web/.next/dev/static/chunks/apps_web_src_386973c1._.js:142:61)
    at Mutation.execute (file:///home/mf/Área de trabalho/ecotech/ecotech-sys/apps/web/.next/dev/static/chunks/node_modules__pnpm_437fa239._.js:1819:43)
    at async onSubmit (file:///home/mf/Área de trabalho/ecotech/ecotech-sys/apps/web/.next/dev/static/chunks/apps_web_src_a57e8333._.js?id=%255Bproject%255D%252Fapps%252Fweb%252Fsrc%252Fcomponents%252Fkanban%252Feditar-oportunidade-dialog.tsx+%255Bapp-client%255D+%2528ecmascript%2529:112:13)
    at async (file:///home/mf/Área de trabalho/ecotech/ecotech-sys/apps/web/.next/dev/static/chunks/node_modules__pnpm_42b9f6ff._.js:6947:21)

Next.js version: 16.1.1 (Turbopack)
```

### em **/kanban**
- ao editar oportunidade, especficamente observacoes

```
Erro ao atualizar oportunidade: TypeError: Cannot read properties of undefined (reading 'id')
    at useUpdateOportunidade.useMutation [as onSuccess] (kanban.ts:103:49)
    at Mutation.execute (mutation.ts:244:26)
    at async onSubmit (editar-oportunidade-dialog.tsx:118:7)
    at async createFormControl.ts:1295:11
```

### em **/kanban**
- erro de optimizacao de componentes

```
installHook.js:1 Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.

installHook.js:1 Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.
installHook.js:1 Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.
installHook.js:1 Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.
```

### em **/kanban**

- ao tentar mover uma oportunidade e vamo supor, segurei e arrastei para cima de outra oportunidade ele da erro

```
:3001/api/oportunidades/f43e194d-7897-4e6c-b9b0-231ed36b4b34/mover:1  Failed to load resource: the server responded with a status of 500 (Internal Server Error)Understand this error
installHook.js:1 Erro ao mover oportunidade: ApiError: invalid input value for enum oportunidade_status: "9ee3c65a-707a-49aa-bd2b-5da1fab43969"
    at request (api.ts:146:13)
    at async useMoverOportunidade.useMutation [as mutationFn] (kanban.ts:121:24)
```

### em **/chat**

- quando entro em /chat, ele conecta e desconecta em loop infinito

```
Connecting to WebSocket: ws://localhost:3001/api/chat/ws?token=***
installHook.js:1 ❌ WebSocket error: Event {isTrusted: true, type: 'error', target: WebSocket, currentTarget: WebSocket, eventPhase: 2, …}
overrideMethod @ installHook.js:1
error @ intercept-console-error.ts:42
useChatWebSocket.useCallback[connect] @ use-chat-websocket.ts:210Understand this error
use-chat-websocket.ts:215 🔌 WebSocket desconectado {code: 1006, reason: ''}
use-chat-websocket.ts:121 ✅ WebSocket conectado com sucesso
use-chat-websocket.ts:115 Connecting to WebSocket: ws://localhost:3001/api/chat/ws?token=***
use-chat-websocket.ts:215 🔌 WebSocket desconectado {code: 1005, reason: ''}
```

- qual a possibilidade da causa desse erro>?

- useEffect / Hook criando multiplas conexoes
```
useEffect(() => {
  connect()
}, [messages, state, algumaCoisa])
```
