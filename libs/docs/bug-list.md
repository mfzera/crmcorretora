# Ajustes e Melhorias – CRM / Seguros

## 1. Criação de novo seguro
1.1 Tornar o campo **Produto** obrigatório  
1.2 Melhorar o componente de **Calendário** (UX e usabilidade)  
1.3 Impedir criação de seguro sem produto definido  

---

## 2. Modal de Cotação – Informações Gerais
2.1 Corrigir bug no ui bloco **Informações Gerais**  
2.2 Revisar estados, validações e renderização do modal  

---

## 3. Modal de Cotação – Regras e Visual
3.1 Tornar obrigatórios:
- Produto  
- Seguradora  
- Valores  

3.2 Remover o campo **Prêmio estimado**  
3.3 Melhorar o layout visual do modal (organização e clareza)  

---

## 4. Rascunho vs Confirmação de Venda
4.1 **Salvar rascunho**:
- Permitir salvar mesmo com campos obrigatórios ausentes  

4.2 **Confirmar venda**:
- Validar todos os campos obrigatórios  
- Caso falte algo:
  - Exibir **Sonner** listando exatamente os campos pendentes  
  - Bloquear a confirmação até correção  

---

## 5. Vendedor Secundário
5.1 Tornar o visual do **vendedor secundário** igual ao do principal  
5.2 Padronizar estilos e hierarquia visual  

---

## 6. Convertidos
6.1 Exibir o **usuário que aprovou** no cadastro do convertido  
6.2 Garantir rastreabilidade da aprovação  

---

## 7. Kanban
7.1 Definir prioridade dos cards por **data**  
7.2 Permitir controle dessa ordenação pelo **Gestão CRM**  
7.3 Evitar regras hardcoded  

---

## 8. Calendários do CRM
8.1 Padronizar todos os calendários usando componentes do **shadcn/ui**  
8.2 Garantir consistência visual em todo o CRM  

---

## 9. Importar Renovações
9.1 Corrigir a **Combobox de Vendedor Responsável**  
9.2 Ajustar trigger/binding para permitir abertura e seleção  

---

## 10. Cores de Cargos
10.1 Implementar cores para cada cargo  
10.2 Aplicar as mesmas cores no **chat**  
10.3 Garantir consistência visual entre módulos  

---

## 11. Performance (/performance)
11.1 Em modo tela cheia:
- Ocultar visualmente o **período de análise**
- Manter o funcionamento interno ativo  

11.2 Cards de estatísticas:
- Tornar mais compactos  
- Melhorar legibilidade  

11.3 Lista do quadro:
- Melhorar hierarquia visual  
- Layout mais limpo e organizado

---

## 12. Perfil (/perfil)
12.1 Senha nao troca:
