# Regra: Atualização de Versão do Sistema

Sempre que o usuário solicitar a alteração ou incremento da versão do sistema (ex: de `1.0.2` para `1.0.3`), a versão **DEVE** ser atualizada em **TODOS** os seguintes locais de forma sincronizada:

1. **Configuração do Tauri:**
   - `apps/desktop/src-tauri/tauri.conf.json` (`"version": "X.Y.Z"`)

2. **Configuração do Rust / Cargo:**
   - `apps/desktop/src-tauri/Cargo.toml` (`version = "X.Y.Z"`)

3. **Package do Desktop:**
   - `apps/desktop/package.json` (`"version": "X.Y.Z"`)

4. **Constante do Modal de Atualização da UI:**
   - `apps/desktop/src/components/UpdateSystemModal.tsx` (`export const CURRENT_SYSTEM_VERSION = 'X.Y.Z';`)

5. **Verificação geral:**
   - Fazer uma busca por referências estáticas da versão anterior no código-fonte para garantir que nenhuma tela ou componente ficou com versão defasada.
