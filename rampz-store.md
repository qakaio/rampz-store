# Rampz Store 🧪

> Loja fictícia de equipamentos de laboratório, criada **exclusivamente como alvo de testes automatizados** para portfólio de QA Engineer.

Nenhum produto, pagamento ou pedido é real. O objetivo é oferecer uma aplicação com fluxos realistas de e-commerce, regras de negócio variadas e pontos estratégicos para exercitar diferentes tipos de teste (UI, API, integração, performance, acessibilidade e segurança básica).

---

## 1. Visão Geral

| Item | Descrição |
|---|---|
| **Nome** | Rampz Store |
| **Segmento** | E-commerce B2C/B2B de vidrarias e equipamentos de laboratório |
| **Público-alvo** | Estudantes, escolas técnicas, laboratórios e pesquisadores |
| **Idioma** | English |
| **Moeda** | Real brasileiro (BRL, R$) |
| **Finalidade** | Portfólio de QA: automação E2E, API, performance e acessibilidade |

---

## 2. Stack Sugerida

A aplicação em si deve ser simples; o foco é o teste. Sugestões:

**Aplicação**
- **Front-end:** React + Vite (ou Next.js) / alternativa: HTML + JS puro
- **Back-end:** Node.js + Express (ou NestJS) / alternativa: JSON Server
- **Banco de dados:** SQLite ou arquivos JSON (seed reproduzível)
- **Docs da API:** OpenAPI/Swagger

**Testes (para o portfólio)**
- **E2E / UI:** Playwright ou Cypress
- **API:** Playwright API / Postman + Newman / REST Assured / Supertest
- **Performance:** k6 ou JMeter
- **Acessibilidade:** axe-core
- **Visual:** Playwright screenshots
- **CI/CD:** GitHub Actions
- **Relatórios:** Allure ou Playwright HTML Report

---

## 3. Estrutura de Páginas

| Rota | Página | Descrição |
|---|---|---|
| `/` | Home | Banner, categorias em destaque, produtos em promoção |
| `/produtos` | Listagem | Grade de produtos com filtros, busca e ordenação |
| `/produtos/:id` | Detalhe | Descrição, especificações, estoque, avaliações |
| `/carrinho` | Carrinho | Itens, quantidades, cupom, cálculo de frete |
| `/checkout` | Checkout | Endereço, frete, pagamento e revisão |
| `/pedido/:id` | Confirmação | Resumo do pedido finalizado |
| `/login` | Login | Autenticação |
| `/cadastro` | Cadastro | Criação de conta |
| `/minha-conta` | Área do cliente | Dados, endereços e histórico de pedidos |
| `/contato` | Contato | Formulário de contato |
| `/admin` | Painel admin | CRUD de produtos e gestão de pedidos (perfil admin) |
| `*` | 404 | Página não encontrada |

---

## 4. Catálogo de Produtos (Seed)

### Categorias
1. Vidrarias
2. Equipamentos
3. Reagentes e Soluções (apenas itens inofensivos/educacionais)
4. EPIs (Equipamentos de Proteção Individual)
5. Utensílios e Acessórios
6. Kits Educacionais

### Produtos de exemplo

| ID | Nome | Categoria | Preço (R$) | Estoque | Observação |
|---|---|---|---|---|---|
| 1 | Tubo de Ensaio 15x150mm (pacote c/ 10) | Vidrarias | 29,90 | 120 | Produto principal para testes |
| 2 | Tubo de Ensaio com Tampa Rosqueável 16x100mm | Vidrarias | 39,90 | 80 | |
| 3 | Béquer de Vidro 250ml | Vidrarias | 18,50 | 200 | |
| 4 | Erlenmeyer 500ml | Vidrarias | 34,00 | 75 | |
| 5 | Proveta Graduada 100ml | Vidrarias | 42,90 | 60 | |
| 6 | Balão Volumétrico 250ml | Vidrarias | 56,00 | 40 | |
| 7 | Pipeta Graduada 10ml | Vidrarias | 12,90 | 150 | |
| 8 | Suporte para Tubos de Ensaio (12 posições) | Utensílios | 24,90 | 90 | |
| 9 | Bico de Bunsen | Equipamentos | 89,90 | 25 | |
| 10 | Balança de Precisão 0,01g | Equipamentos | 349,00 | 15 | Preço alto (testa parcelamento) |
| 11 | Microscópio Biológico 1000x | Equipamentos | 1.299,00 | 8 | Frete diferenciado |
| 12 | Agitador Magnético com Aquecimento | Equipamentos | 899,00 | 0 | **Sem estoque** (testa indisponibilidade) |
| 13 | Centrífuga de Bancada 6 Tubos | Equipamentos | 1.890,00 | 3 | Estoque baixo |
| 14 | Óculos de Proteção Incolor | EPIs | 15,90 | 300 | |
| 15 | Jaleco Branco de Algodão (P/M/G) | EPIs | 79,90 | 100 | Produto com variação |
| 16 | Luvas de Nitrilo (caixa c/ 100) | EPIs | 49,90 | 250 | |
| 17 | Papel Indicador de pH (rolo) | Reagentes | 9,90 | 500 | |
| 18 | Kit Química Básica Escolar | Kits | 199,00 | 30 | Kit composto por vários itens |
| 19 | Pinça de Madeira para Tubo de Ensaio | Utensílios | 7,50 | 180 | |
| 20 | Termômetro de Laboratório -10 a 110°C | Equipamentos | 22,00 | 110 | |

> 💡 O seed deve ser **determinístico** e restaurável por um endpoint/script (`POST /api/test/reset`) para garantir testes repetíveis.

---

## 5. Funcionalidades e Regras de Negócio

### 5.1 Cadastro e Autenticação
- Cadastro com: nome, e-mail, CPF, telefone, senha e confirmação de senha.
- E-mail deve ser único.
- CPF deve ser válido (validação de dígitos verificadores).
- Senha: mínimo 8 caracteres, ao menos 1 maiúscula, 1 número e 1 caractere especial.
- Login com e-mail e senha.
- Bloqueio temporário após **5 tentativas inválidas** (15 minutos).
- Recuperação de senha (simulada, com token exibido na tela/mock de e-mail).
- Sessão com expiração (ex.: 30 min de inatividade).
- Logout invalida o token.

### 5.2 Catálogo e Busca
- Busca por nome (parcial e sem diferenciar maiúsculas/minúsculas).
- Filtros: categoria, faixa de preço, disponibilidade em estoque.
- Ordenação: menor preço, maior preço, nome (A-Z), mais recentes.
- Paginação: 12 produtos por página.
- Mensagem amigável quando a busca não retorna resultados.
- Produtos sem estoque exibem selo "Indisponível" e botão de compra desabilitado.

### 5.3 Carrinho
- Adicionar, remover e alterar quantidade de itens.
- Quantidade mínima: 1. Máxima: o menor valor entre o estoque e **10 unidades** por item.
- Carrinho persiste para usuário logado (e em `localStorage` para visitante).
- Subtotal, desconto e total recalculados a cada alteração.
- Cálculo de frete por CEP (simulado).

### 5.4 Cupons de Desconto

| Cupom | Regra |
|---|---|
| `BEMVINDO10` | 10% de desconto na primeira compra |
| `LAB20` | 20% para compras acima de R$ 300,00 |
| `FRETEGRATIS` | Frete grátis em compras acima de R$ 150,00 |
| `EXPIRADO` | Cupom expirado (deve ser rejeitado) |
| `INVALIDO` | Cupom inexistente (deve ser rejeitado) |

- Apenas **um cupom** por pedido.
- Cupons são case-insensitive.

### 5.5 Frete (simulado)

| Região (prefixo do CEP) | Valor | Prazo |
|---|---|---|
| Sul (`8`, `9`) | R$ 15,00 | 3 dias úteis |
| Sudeste (`0`–`3`) | R$ 20,00 | 5 dias úteis |
| Demais regiões | R$ 35,00 | 8 dias úteis |

- Frete grátis para pedidos acima de **R$ 500,00** ou com o cupom `FRETEGRATIS`.
- CEP inválido (formato incorreto) bloqueia o cálculo.

### 5.6 Checkout e Pagamento (100% simulado)
- Etapas: **Endereço → Frete → Pagamento → Revisão**.
- Formas de pagamento:
  - **Cartão de crédito** (parcelamento em até 6x sem juros, parcela mínima de R$ 50,00)
  - **Pix** (5% de desconto, QR Code fictício)
  - **Boleto** (código de barras fictício)
- Cartões de teste:

| Número | Resultado |
|---|---|
| `4111 1111 1111 1111` | Aprovado |
| `4000 0000 0000 0002` | Recusado |
| `4000 0000 0000 0119` | Erro de processamento (timeout simulado) |

- Estoque é abatido apenas após pagamento aprovado.
- Pedido recebe número único (ex.: `RMP-2026-000123`).

### 5.7 Pedidos
- Status: `AGUARDANDO_PAGAMENTO` → `PAGO` → `EM_SEPARACAO` → `ENVIADO` → `ENTREGUE`
- Também possível: `CANCELADO`.
- Cliente pode cancelar pedidos até o status `PAGO`.
- Histórico de pedidos listado na área do cliente.

### 5.8 Painel Admin
- Acesso apenas para perfil `ADMIN` (usuário comum recebe 403).
- CRUD de produtos (nome, descrição, preço, estoque, categoria, imagem).
- Alteração de status de pedidos.
- Listagem de usuários.

### 5.9 Avaliações
- Apenas usuários logados que compraram o produto podem avaliar.
- Nota de 1 a 5 e comentário opcional (máx. 500 caracteres).

### 5.10 Contato
- Campos: nome, e-mail, assunto, mensagem.
- Todos obrigatórios; e-mail com formato válido; mensagem com mínimo de 20 caracteres.

---

## 6. Usuários de Teste

| Perfil | E-mail | Senha | Observação |
|---|---|---|---|
| Cliente padrão | `cliente@rampz.test` | `Teste@1234` | Possui histórico de pedidos |
| Cliente novo | `novo@rampz.test` | `Teste@1234` | Sem pedidos (elegível a `BEMVINDO10`) |
| Admin | `admin@rampz.test` | `Admin@1234` | Acesso ao `/admin` |
| Bloqueado | `bloqueado@rampz.test` | `Teste@1234` | Conta bloqueada por tentativas |
| Inativo | `inativo@rampz.test` | `Teste@1234` | Conta desativada |

---

## 7. API REST (Proposta)

Base URL: `/api/v1`

### Autenticação
| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/auth/register` | Cria conta |
| POST | `/auth/login` | Retorna token JWT |
| POST | `/auth/logout` | Invalida sessão |
| POST | `/auth/forgot-password` | Solicita recuperação |
| GET | `/auth/me` | Dados do usuário logado |

### Produtos
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/products` | Lista (query: `q`, `category`, `minPrice`, `maxPrice`, `inStock`, `sort`, `page`, `limit`) |
| GET | `/products/:id` | Detalhe |
| POST | `/products` | Cria (admin) |
| PUT | `/products/:id` | Atualiza (admin) |
| DELETE | `/products/:id` | Remove (admin) |
| GET | `/categories` | Lista categorias |

### Carrinho
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/cart` | Obtém carrinho |
| POST | `/cart/items` | Adiciona item |
| PATCH | `/cart/items/:id` | Altera quantidade |
| DELETE | `/cart/items/:id` | Remove item |
| POST | `/cart/coupon` | Aplica cupom |
| POST | `/shipping/calculate` | Calcula frete por CEP |

### Pedidos
| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/orders` | Cria pedido (checkout) |
| GET | `/orders` | Lista pedidos do usuário |
| GET | `/orders/:id` | Detalhe |
| PATCH | `/orders/:id/cancel` | Cancela |
| PATCH | `/orders/:id/status` | Altera status (admin) |

### Utilitários de teste
| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/test/reset` | Restaura o seed do banco |
| GET | `/health` | Status da aplicação |

### Códigos de resposta esperados
`200`, `201`, `204`, `400` (validação), `401` (não autenticado), `403` (sem permissão), `404` (não encontrado), `409` (conflito, ex.: e-mail duplicado), `422` (regra de negócio), `429` (rate limit), `500`.

---

## 8. Convenções para Automação

### Seletores
Todo elemento interativo deve ter `data-testid` estável e descritivo:

```
data-testid="login-email-input"
data-testid="login-submit-button"
data-testid="product-card-1"
data-testid="add-to-cart-button"
data-testid="cart-total"
data-testid="coupon-input"
data-testid="checkout-step-payment"
data-testid="order-confirmation-number"
```

Padrão: `<contexto>-<elemento>-<tipo>`.

### Boas práticas
- Mensagens de erro com `role="alert"`.
- Formulários com `label` associados aos inputs.
- IDs e rotas previsíveis.
- Ambiente local via `docker compose up`.

---

## 9. Cenários de Teste Sugeridos

### 9.1 E2E (UI)
- [ ] Cadastro de novo usuário com sucesso
- [ ] Cadastro com e-mail duplicado
- [ ] Cadastro com CPF inválido e senha fraca
- [ ] Login válido e inválido
- [ ] Bloqueio após 5 tentativas de login
- [ ] Buscar "tubo de ensaio" e validar resultados
- [ ] Filtrar por categoria e faixa de preço
- [ ] Ordenar por menor preço e validar ordem
- [ ] Adicionar produto ao carrinho e validar total
- [ ] Tentar exceder o limite de 10 unidades
- [ ] Produto sem estoque não pode ser comprado
- [ ] Aplicar cupom válido, expirado e inexistente
- [ ] Calcular frete com CEP válido e inválido
- [ ] Checkout completo com cartão aprovado
- [ ] Checkout com cartão recusado
- [ ] Checkout com Pix (desconto de 5%)
- [ ] Cancelar pedido na área do cliente
- [ ] Admin cria, edita e remove produto
- [ ] Usuário comum não acessa `/admin`
- [ ] Página 404 para rota inexistente

### 9.2 API
- [ ] Validação de contrato (schema) das respostas
- [ ] Autenticação e autorização por perfil
- [ ] Paginação, filtros e ordenação de `/products`
- [ ] Regras de negócio de carrinho, cupom e frete
- [ ] Idempotência e conflitos (`409`)
- [ ] Tratamento de payloads inválidos (`400`/`422`)
- [ ] Rate limiting (`429`) no login
- [ ] Encadeamento de fluxo: registrar → logar → carrinho → pedido

### 9.3 Não funcionais
- [ ] **Performance:** carga na listagem e no checkout (k6), p95 < 500ms
- [ ] **Acessibilidade:** varredura axe-core nas páginas principais (WCAG 2.1 AA)
- [ ] **Responsividade:** desktop, tablet e mobile
- [ ] **Cross-browser:** Chromium, Firefox, WebKit
- [ ] **Segurança básica:** XSS em campos de texto, SQL injection em busca, IDOR em pedidos, headers de segurança
- [ ] **Visual regression:** home, listagem e checkout

---

## 10. Bugs Intencionais (Opcional)

Para demonstrar habilidade em encontrar e reportar defeitos, a aplicação pode ter uma **flag de ambiente** que ativa bugs controlados:

```
ENABLE_KNOWN_BUGS=true
```

| ID | Bug | Área | Severidade |
|---|---|---|---|
| BUG-001 | Cupom `LAB20` aplicado em compras abaixo de R$ 300 | Carrinho | Alta |
| BUG-002 | Total não recalcula ao remover o último item | Carrinho | Média |
| BUG-003 | Busca diferencia maiúsculas de minúsculas | Busca | Baixa |
| BUG-004 | Estoque abatido mesmo com pagamento recusado | Checkout | Crítica |
| BUG-005 | Usuário comum acessa pedido de outro via ID (IDOR) | Pedidos | Crítica |
| BUG-006 | Parcela mínima de R$ 50 não é validada | Pagamento | Média |
| BUG-007 | Botão "Finalizar" permite duplo clique (pedido duplicado) | Checkout | Alta |
| BUG-008 | Mensagem de erro de login revela se o e-mail existe | Auth | Média |
| BUG-009 | Layout quebra em telas < 360px | UI | Baixa |
| BUG-010 | Campo de comentário aceita HTML (XSS armazenado) | Avaliações | Alta |

> Cada bug encontrado deve virar um **bug report** no repositório (template na seção 12).

---

## 11. Estrutura Sugerida do Repositório

```
rampz-store/
├── app/
│   ├── frontend/
│   └── backend/
├── tests/
│   ├── e2e/            # Playwright / Cypress
│   ├── api/            # Testes de API
│   ├── performance/    # k6
│   ├── accessibility/  # axe-core
│   └── visual/
├── docs/
│   ├── test-plan.md
│   ├── test-cases.md
│   └── bug-reports/
├── docker-compose.yml
├── .github/workflows/ci.yml
└── README.md
```

---

## 12. Template de Bug Report

```markdown
### [BUG-XXX] Título curto e objetivo

**Severidade:** Crítica | Alta | Média | Baixa
**Ambiente:** Chrome 130 / Windows 11 / build abc123

**Passos para reproduzir**
1. ...
2. ...

**Resultado esperado**
...

**Resultado atual**
...

**Evidências:** prints, vídeo, logs, HAR
```

---

## 13. Roadmap de Implementação

1. **Fase 1 – MVP:** catálogo, busca, carrinho, login/cadastro
2. **Fase 2 – Compra:** cupons, frete, checkout simulado, pedidos
3. **Fase 3 – Admin:** CRUD de produtos e gestão de pedidos
4. **Fase 4 – Qualidade:** `data-testid`, endpoint de reset, Swagger, seed
5. **Fase 5 – Testes:** suíte E2E + API + CI com relatórios publicados
6. **Fase 6 – Avançado:** performance, acessibilidade, visual e bugs intencionais

---

## 14. Aviso

A **Rampz Store** é um projeto fictício, sem fins comerciais. Nomes, preços, cupons e dados são inventados e usados apenas para fins educacionais e de demonstração de habilidades em Quality Assurance.
