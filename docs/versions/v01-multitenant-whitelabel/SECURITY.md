# Segurança

Menor privilégio. `permissions[]` é a base das regras. Dados clínicos exigem `clinical.read/write` ou sessão de suporte clínico ativa para Platform Owner. Firestore/Worker são camadas de enforcement; esconder UI não é segurança.
