# SoundBatcher

SoundBatcherは、Tauri、React、FFmpegを使用して構築された、高速な音声プレビューとバッチ処理のためのデスクトップアプリケーションです。

## 設計方針（SOLID）

本プロジェクトでは、保守性と拡張性を高めるためにSOLID原則を重視しています。

- **SRP（単一責任）**: UI、状態管理、処理ロジックを分離。
  - 例: `src/features/processor/useProcessorStore.ts` は状態管理に専念し、
    処理実行ロジックは `src/features/processor/processor.core.ts` に分離。
- **OCP（開放閉鎖）**: 既存コードを壊さず機能追加しやすい設計。
  - 例: 処理キュー実行 (`runWithConcurrency`) は汎用化して再利用可能。
- **LSP（リスコフ置換）**: 依存先を抽象化し、差し替えても同じ振る舞い。
- **ISP（インターフェース分離）**: 設定・処理結果など用途別の型を分離。
- **DIP（依存逆転）**: コアロジックは具体実装ではなく依存注入で動作。
  - 例: `executeTask` はファイル操作/FFmpeg実行を依存として受け取る。

## セットアップ

1.  **依存関係のインストール:**
    ```bash
    npm install
    ```

2.  **FFmpegのセットアップ (重要):**
    このアプリはサイドカーバイナリとしてFFmpegを必要とします。
    - お使いのプラットフォーム（例：Windows）用のFFmpeg実行ファイルをダウンロードしてください。
    - ターゲットトリプルを含めるようにファイル名を変更してください。
      - Windows (x64) の場合、通常は次のようになります: `ffmpeg-x86_64-pc-windows-msvc.exe`
    - 実行ファイルを `src-tauri/bin/` に配置してください。
    - セットアップ中に作成されたダミーファイルが存在する場合は削除（または上書き）してください。

    ターゲットトリプルを確認するには、以下を実行してください:
    ```bash
    rustc -vV
    ```
    `host: ...` の部分を探してください。

3.  **開発サーバーの起動:**
    ```bash
    npm run tauri dev
    ```

## 機能

- **ファイルブラウザ:** ファイルシステムをナビゲートし、音声ファイルをプレビューします。
- **ピン留め機能:** よく使うフォルダをピン留めして素早くアクセスできます。
- **ファイル選択:** 処理したいファイルを個別に選択できます。
- **波形プレーヤー:** 再生コントロール付きの視覚的な波形表示。
- **バッチプロセッサ:** 選択したファイルをキューに入れ、一括処理を行います（現在はラウドネスノーマライゼーションをサポート）。
- **履歴ログ:** 過去のバッチ処理の履歴（日時、ファイル数、ステータス）を保存・閲覧できます（最新50件まで）。
- **エクスポート:** 処理されたファイルは `processed` サブディレクトリに保存されます。

## アーキテクチャ概要

- `src/features/app/`
  - 画面統合とアプリ全体副作用（テーマ適用・言語適用）
- `src/features/file-browser/`
  - ファイル一覧表示、選択、ピン留め管理
- `src/features/player/`
  - 再生状態と波形表示（WaveSurfer）
- `src/features/processor/`
  - `useProcessorStore.ts`: キュー状態・ジョブ連携
  - `processor.core.ts`: タスク実行と同時実行制御
  - `processor.utils.ts`: ID生成・状態更新・最終ステータス判定
  - `processor.types.ts`: ドメイン型定義
- `src/features/history/`
  - ジョブ履歴の保持と表示
- `src/features/settings/`
  - 設定UIと永続化
- `src/lib/`
  - FFmpeg実行基盤、共通ストア

## 使い方

1.  **アプリケーションの起動:**
    開発モードで起動する場合は、以下のコマンドを実行します。
    ```bash
    npm run tauri dev
    ```

2.  **ファイルの選択とプレビュー:**
    - 左側のサイドバーにあるファイルブラウザを使って、音声ファイルが保存されているフォルダに移動します。
    - **クリック**でファイルを選択（複数選択可）します。
    - **ダブルクリック**でファイルを再生し、波形を表示します。
    - フォルダ名の横にあるピンアイコンをクリックすると、そのフォルダを「Pinned」セクションに固定できます。

3.  **バッチ処理の実行:**
    - 処理を行いたいファイルを選択した状態で、右側のパネルの「Processor」タブを確認します。
    - 「Add Selected Files」ボタンをクリックして、選択したファイルを処理キューに追加します。
    - 「Start Processing」ボタンをクリックすると、キュー内のファイルが一括処理されます。

4.  **履歴の確認:**
    - 右側パネルの「History」タブをクリックすると、過去の処理履歴が表示されます。
    - 各履歴をクリックすると、処理されたファイルの詳細やエラー内容を確認できます。

5.  **保存先:**
    - 処理が完了したファイルは、元のファイルがあるフォルダ内に自動作成される `processed` フォルダに保存されます。元のファイルは上書きされません。

## 技術スタック

- Tauri (Rust)
- React + TypeScript + Vite
- Tailwind CSS
- Zustand (状態管理)
- tauri-plugin-store (永続化)
- wavesurfer.js (音声可視化)
- FFmpeg (音声処理)

## 自分用の更新運用（Windows）

毎回の更新は `scripts/release.ps1` を使うと簡単です。

### 事前確認（初回のみ）

- `src-tauri/bin/ffmpeg-x86_64-pc-windows-msvc.exe` が存在すること
- PowerShell でプロジェクトルートに移動していること

### 更新手順（通常）

```powershell
./scripts/release.ps1
```

このコマンドは次を自動で実行します。

1. `npm install`
2. `npm run tauri build`
3. 最新の `*-setup.exe`（NSISインストーラー）を起動

### 更新手順（依存インストールをスキップ）

```powershell
./scripts/release.ps1 -SkipInstall
```

### 生成物

- NSIS: `src-tauri/target/release/bundle/nsis/`
- MSI: `src-tauri/target/release/bundle/msi/`
