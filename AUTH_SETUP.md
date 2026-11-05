# Acesso por e-mail e senha — RODSOFICIAL

Esta atualização introduz autenticação real e isolamento de contas no Supabase.
**Sem configuração do backend, a tela exibe aviso e não permite cadastro.** Isso evita simular segurança inexistente.

## Ativação no Lovable
1. Crie ou conecte um projeto Supabase ao projeto RODSOFICIAL.
2. No SQL Editor do Supabase, execute o arquivo supabase/migrations/202611040001_finance_workspaces.sql.
3. Configure as variáveis de ambiente públicas do frontend:
   - VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
   - VITE_SUPABASE_ANON_KEY=CHAVE_PUBLICAVEL_ANON
   Use apenas a chave anon/publicável. Nunca exponha service_role ou chaves secretas no navegador.
4. Em Authentication > Providers, habilite Email e configure a confirmação de e-mail conforme a preferência.
5. Em Authentication > Settings, permita senhas com no mínimo 6 caracteres, incluindo pelo menos 1 letra e 1 número (validação também presente na interface).
6. Configure no Supabase o domínio publicado e URLs de redirecionamento adequadas.
7. Teste o cadastro de duas contas distintas: cada uma deve abrir sem produtos, custos, ADS e vendas. Cadastre dados na conta A; a conta B não deve visualizá-los; confirme também no banco que as regras RLS negam acesso à linha alheia.
8. Verifique login, logout, persistência após recarregar e isolamento entre navegadores.
9. Faça backup antes de migrar eventuais dados locais antigos. Não importamos automaticamente os dados da chave antiga gestao-fin-v1 para evitar associá-los à conta errada.

## Segurança
A tabela finance_workspaces usa chave primária user_id atrelada a auth.users e políticas de Row Level Security. Apenas a sessão JWT válida do dono pode ler ou gravar a própria linha. Sem login, nenhum dado financeiro é exibido.

## Limitações atuais
- Os dados de cada conta são salvos em um documento JSONB; atualização concorrente por dois dispositivos não tem controle fino de conflitos. Evite editar simultaneamente a mesma conta.
- O app ainda não permite recuperar dados legados do navegador de forma automática.
- A funcionalidade exige provisionar o Supabase e configurar as variáveis antes de ser publicada.
- Nenhuma senha é gravada no banco financeiro; a senha é gerenciada pelo Supabase Auth.
