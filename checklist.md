# Checklist — loja demo e testes E2E

Objetivo: manter uma loja placeholder funcional para testes automatizados com Playwright. Pagamentos e pedidos são sempre simulados; sem backend de produção.

## Playwright

- [x] Configurar Playwright para Chromium e adicionar comandos `test:e2e` e `test:e2e:ui`.
- [x] Iniciar/parar o servidor automaticamente nos testes e resetar API/localStorage em cada cenário.
- [x] Usar seletores estáveis (`data-testid`) nos controles e mensagens importantes.
- [x] Executar a suíte E2E com Chromium no CI.

## Fluxos principais

- [x] Catálogo: carregar produtos, buscar, filtrar, ordenar e exibir estado sem resultados.
- [x] Produto e carrinho: abrir detalhes, adicionar/remover itens, alterar quantidade até o limite e conferir total.
- [x] Checkout: validar endereço, frete e cupons; conferir erros e resumo antes de confirmar.
- [x] Pagamento simulado: cartão aprovado/recusado/timeout, Pix e boleto; verificar confirmação/pendência e ausência de cobrança real.
- [x] Regras de pagamento: validar parcela mínima no cartão e permitir método alternativo em totais baixos.
- [x] Pedido: consultar confirmação e cancelar pedido pendente, quando permitido.
- [x] Conta demo: cadastro, login/logout, recuperação local de senha e histórico/cancelamento de pedido pendente.
- [x] Admin demo: criar, editar e remover produto localmente; contato: validar formulário sem requisição de rede.
- [x] Indisponibilidade: produto sem estoque não pode ser adicionado e carrinho vazio não inicia checkout.

## Verificações essenciais

- [x] Cobrir estados de validação, erro e carregamento dos fluxos principais.
- [x] Fazer smoke test responsivo em mobile (390 px) e desktop (1280 px) e verificar atalho de busca por teclado.
- [x] Cobrir filtro combinado de preço/estoque e persistência do carrinho após recarregar.
- [x] Cobrir login inválido, transição de status de pedido no admin e rota inexistente (404).
- [x] Executar 42 testes E2E (21 cenários repetidos duas vezes) em ordem embaralhada e com workers paralelos, sem dependência entre testes.
