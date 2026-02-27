# Audio Desk

Audio Deskは、Tauri + React + FFmpegで構築した音声プレビュー/バッチ処理アプリです。
大量の音声ファイルを素早く確認し、まとめて処理するワークフローを想定しています。

## 現在の実装範囲

- ファイルブラウザ（Miller風2カラム、複数選択、ピン留め）
- タブ管理（追加、切替、並び替え、固定、他タブクローズ）
- コンテキストメニュー操作（再生、キュー追加、パスコピー、フォルダ操作）
- ドラッグ&ドロップ（外部ドロップで移動/選択、内部D&Dでファイル移動）
- ダブルクリック再生 + 波形表示
- キュー方式のバッチ処理
- 処理履歴の保存・表示（最新50件）
- 設定による出力先/ファイル名/既存ファイル時の挙動変更
- ラウドネス正規化、リネームのみ実行モード

将来案は `PRD.md` にまとめています（READMEは実装済み中心）。

## 前提環境

- Node.js / npm
- Rust ツールチェーン（`rustc`, `cargo`）
- Tauriビルドに必要なOS依存ツール
- FFmpeg実行ファイル（Tauriサイドカー）

## セットアップ

1. 依存関係をインストール
   ```bash
   npm install
   ```
2. FFmpegサイドカーを配置（重要）
   - 実行ファイルを `src-tauri/bin/` に置く
   - ファイル名はターゲットトリプルを含める
   - Windows x64 の例: `ffmpeg-x86_64-pc-windows-msvc.exe`
   - ダミーファイルがあれば削除または上書き
3. ターゲットトリプルを確認（必要に応じて）
   ```bash
   rustc -vV
   ```
   `host:` の値とサイドカーファイル名を一致させてください。
4. 開発起動
   ```bash
   npm run tauri dev
   ```

## 使い方

1. 左側のファイルブラウザで対象フォルダへ移動
2. ファイルをクリックして選択（`Ctrl/Cmd` で追加選択、`Shift` で範囲選択）
3. ファイルをダブルクリックして再生・波形表示
4. 右パネルの `処理`（英語UIでは `Proc`）タブを開く
5. `選択を追加`（英語UIでは `Add Selected`）でキュー追加
6. `処理開始`（英語UIでは `Start Processing`）を実行
7. `履歴`（英語UIでは `Hist`）タブで結果とエラーを確認

処理済みファイルは、既定では入力フォルダ内の `processed` に出力されます。

### ファイルブラウザ補足

- タブの右クリックで固定/解除、クローズ、他タブクローズが可能
- フォルダ/ファイルの右クリックで再生・キュー追加・パスコピーなどを実行可能
- 外部ファイルのドロップで親フォルダを開いて該当ファイルを自動選択
- ファイルをフォルダ上にドラッグして移動可能（同一フォルダへの移動は無視）
- 自動更新（5秒間隔 + ウィンドウ再フォーカス時）で一覧を再読込
- ショートカット: `Alt+←` 戻る / `Alt+→` 進む / `Backspace` 戻る

## アーキテクチャ概要

- `src/features/app/`: 画面統合とアプリ全体副作用（テーマ・言語）
- `src/features/file-browser/`: ファイル一覧、選択、ピン留め
- `src/features/context-menu/`: 右クリックメニュー表示とコマンド実行
- `src/features/player/`: 再生状態と波形表示（WaveSurfer）
- `src/features/processor/`: キュー状態、タスク実行、同時実行制御
- `src/features/history/`: ジョブ履歴の保存と表示
- `src/features/settings/`: 設定UIと永続化
- `src/lib/`: FFmpeg実行基盤、共通ユーティリティ

## 設計方針（SOLID）

- **SRP**: UI / 状態管理 / 処理ロジックを分離
- **OCP**: 既存コードを壊さず処理追加しやすい構成
- **LSP**: 抽象に依存し差し替え可能な実装
- **ISP**: 設定・処理結果など用途別の型分離
- **DIP**: コアは具体実装ではなく注入された依存に基づく

例:
- `src/features/processor/useProcessorStore.ts` は状態管理
- `src/features/processor/processor.core.ts` は実行ロジック

## 技術スタック

- Tauri (Rust)
- React + TypeScript + Vite
- Tailwind CSS
- Zustand
- `@tauri-apps/plugin-store`
- wavesurfer.js
- FFmpeg

## ドキュメント

- 利用者向け操作: `src-tauri/resources/user-manual.md`
- 要件/構想: `PRD.md`

## リリース運用（Windows）

`scripts/release.ps1` で更新作業を自動化できます。

### 事前確認（初回のみ）

- `src-tauri/bin/ffmpeg-x86_64-pc-windows-msvc.exe` が存在すること
- PowerShellでプロジェクトルートにいること

### 更新手順（通常）

```powershell
./scripts/release.ps1
```

実行内容:

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
