# Como restaurar seus dados no Neon (recuperação pontual)

A Neon guarda histórico das alterações do banco. Você pode **restaurar o branch principal para um momento anterior** (antes de os dados terem sido apagados) e depois usar essa conexão no app.

## Passos no painel da Neon

1. **Acesse o Console da Neon**
   - Abra: **https://console.neon.tech**
   - Faça login e selecione o projeto do seu app (o que está na `DATABASE_URL` do seu `.env`).

2. **Abra a página de Restore (Restauração)**
   - No menu lateral, procure por **"Restore"** ou **"Time Travel"** / **"Branch restore"**.
   - Ou acesse direto: **https://console.neon.tech** → seu projeto → **Branches** → no branch **main** (ou o que você usa), clique em **Restore** / **Restore branch**.

3. **Escolha o ponto no tempo**
   - Selecione uma **data e hora anteriores** ao momento em que os dados foram zerados (ex.: ontem, ou o último dia em que você lembra de ter dados).
   - Use o **Time Travel Assist** para testar no SQL Editor se naquele momento os dados ainda existem (ex.: `SELECT COUNT(*) FROM "Client";`).

4. **Conclua a restauração**
   - Confirme o restore. A Neon pode criar um **novo branch** com o estado daquele momento, ou restaurar o branch atual (depende do plano).
   - Se a Neon criar um **novo branch** com os dados antigos:
     - Anote a **nova connection string** desse branch.
     - No seu `.env`, troque a `DATABASE_URL` pela nova connection string (ou passe a usar esse branch como principal no projeto).

5. **Teste no app**
   - Reinicie o app (ou recarregue a página) e confira se clientes, orçamentos e pagamentos voltaram.

## Limitações

- O **período de restauração** depende do plano (até 7 ou 30 dias, por exemplo). Se os dados foram apagados há mais tempo, a Neon pode não ter mais esse ponto.
- Documentação oficial:
  - [Branch Restore](https://neon.tech/docs/guides/branch-restore)
  - [Time Travel](https://neon.tech/docs/guides/time-travel-assist)

## Se a Neon não tiver mais o ponto no tempo

- Se você **tiver um arquivo de backup** (o JSON exportado em Configurações → Backup e Restauração), use **Restaurar backup** e selecione esse arquivo para repopular o banco.
- Caso contrário, os dados que não estiverem nem no histórico da Neon nem em backup não podem ser recuperados.
