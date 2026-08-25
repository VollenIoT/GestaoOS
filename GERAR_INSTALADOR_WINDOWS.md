# Guia de Gerador do Instalador Desktop (.exe / .msi)

Para gerar o arquivo **instalável executável (.exe / .msi)** do sistema no Windows:

### Requisitos no Windows:
1. Ter o **Rust** instalado no sistema (baixe em [rustup.rs](https://rustup.rs/)).
2. Ter as Ferramentas de Compilação C++ do Visual Studio (Build Tools C++).

### Comando para Gerar o Instalador `.exe`:
Abra a raiz do projeto e execute:

```powershell
npm --prefix apps/desktop run build
npx tauri build
```

O instalador nativo do Windows será gerado na pasta:
`apps/desktop/src-tauri/target/release/bundle/msi/OS Pro Assistencia_1.0.0_x64_en-US.msi`
ou
`apps/desktop/src-tauri/target/release/bundle/nsis/OS Pro Assistencia_1.0.0_x64-setup.exe`
