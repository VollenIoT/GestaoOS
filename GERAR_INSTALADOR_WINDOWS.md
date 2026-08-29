# 🚀 Guia Completo: Geração dos Instaladores (Windows Desktop & APK Android)

Este documento contém o passo a passo completo para compilar e gerar os instaladores de produção tanto para o **Windows (.exe / .msi)** quanto para o **Android (.apk)**.

---

## 1. 🖥️ Instalador Windows Desktop (.exe / .msi)

O aplicativo Desktop é construído em **Tauri (Rust + React/Vite)**, gerando um executável ultraleve e de alta performance.

### 📋 Pré-requisitos no Windows (Feito uma única vez):
1. **Node.js**: Instalado (versão 18 ou superior).
2. **Rust**: Instalado via [rustup.rs](https://rustup.rs/).
3. **Visual Studio C++ Build Tools**: Instalado (pacote *"Desenvolvimento para Desktop com C++"*).

### 🛠️ Passo a Passo para Gerar o `.exe`:
Abra o **PowerShell** ou Prompt de Comando na pasta raiz do projeto (`d:\SistemaOS`) e execute:

```powershell
# 1. Navegue até o diretório do Desktop
cd d:\SistemaOS\apps\desktop

# 2. Gere o build de produção do frontend e compile o binário Tauri
npm run build
npx @tauri-apps/cli build
```

*(Ou direto da pasta raiz):*
```powershell
npm --prefix apps/desktop run build
npx --prefix apps/desktop @tauri-apps/cli build
```

### 📦 Onde encontrar o instalador gerado:
Após o término da compilação, o instalador estará localizado em:
- **Instalador NSIS (.exe)**:
  `d:\SistemaOS\apps\desktop\src-tauri\target\release\bundle\nsis\OS Pro Assistencia_1.0.0_x64-setup.exe`
- **Instalador MSI (.msi)**:
  `d:\SistemaOS\apps\desktop\src-tauri\target\release\bundle\msi\OS Pro Assistencia_1.0.0_x64_en-US.msi`

---

## 2. 📱 Aplicativo Android (.apk)

Você pode gerar o arquivo APK de duas formas: **via Nuvem (EAS Build - Mais Simples)** ou **Localmente (Android Studio / Gradle)**.

---

### Opção A: Gerar APK na Nuvem via EAS Build (Recomendado / Sem instalar Android Studio)

O EAS Build compila o APK nos servidores da Expo e entrega o arquivo `.apk` pronto para download.

1. **Instale a CLI do EAS (se ainda não tiver):**
   ```powershell
   npm install -g eas-cli
   ```

2. **Faça login na sua conta Expo:**
   ```powershell
   eas login
   ```

3. **Gere o APK de produção/teste:**
   Na pasta `d:\SistemaOS\apps\mobile`, execute:
   ```powershell
   cd d:\SistemaOS\apps\mobile
   eas build -p android --profile preview
   ```
   *(Ao finalizar, ele fornecerá um link direto para baixar o arquivo `.apk` pronto para instalar em qualquer celular).*

---

### Opção B: Gerar APK Localmente no seu Computador (Gradle)

#### 📋 Pré-requisitos:
- **Android Studio** instalado com SDK Platform Android (API 34), Build-Tools e Android SDK Command-line Tools.
- Variável de ambiente `ANDROID_HOME` configurada apontando para a pasta do SDK (ex: `C:\Users\SEU_USUARIO\AppData\Local\Android\Sdk`).
- **Java JDK (versão 17)** instalado.

#### 🛠️ Passo a Passo:
1. Gere os arquivos nativos do Android (prebuild):
   ```powershell
   cd d:\SistemaOS\apps\mobile
   npx expo prebuild --platform android
   ```

2. Compile o APK em modo Release:
   ```powershell
   cd android
   .\gradlew assembleRelease
   ```

3. **Onde encontrar o arquivo `.apk`:**
   `d:\SistemaOS\apps\mobile\android\app\build\outputs\apk\release\app-release.apk`

---

## 3. 🔄 Resumo Rápido dos Comandos

| Plataforma | Pasta | Comando Principal |
|---|---|---|
| **Windows (.exe)** | `apps/desktop` | `npm run build && npx @tauri-apps/cli build` |
| **Android APK (Nuvem)** | `apps/mobile` | `eas build -p android --profile preview` |
| **Android APK (Local)** | `apps/mobile` | `npx expo prebuild -p android && cd android && .\gradlew assembleRelease` |
