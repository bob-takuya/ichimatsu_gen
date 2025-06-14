# 市松パターンジェネレーター

![Ichimatsu Pattern Demo](./public/icon.png)

## 概要

菱形タイリングを使用して市松模様（チェッカーボード）パターンを生成・アニメーション化するWebベースのインタラクティブツールです。東京大学（造形第六）の授業プロジェクトとして制作されました。

このパターンは野老朝雄氏がデザインした東京オリンピックエンブレムにインスピレーションを受けています。

## Overview

This project is a web-based interactive tool for generating and animating ichimatsu (checkerboard) patterns using rhombic tiling. It was created as part of a university course project at the University of Tokyo.

The patterns are inspired by the Tokyo Olympic emblem designed by Asao Tokoro.

## 謝辞

このプロジェクトの制作にあたり、**Baku Hashimoto**氏の以下のプロジェクトを参考にさせていただきました：

### 使用ライブラリ

- **[Tweeq UI Library](https://github.com/baku89/tweeq)** - Vue.js UIコンポーネントライブラリとして使用

### プロジェクト構造・コードベース

- **[UNIM](https://baku89.com/works/unim)** - Unicode文字アニメーションツール。このプロジェクトの基盤として、UNIMのコードベースをフォークし、菱形タイリングパターン生成に特化した内容に置き換えました

Baku Hashimoto氏の優れたオープンソースツールとプロジェクト設計思想に深く感謝します。

## Acknowledgments

This project was created with reference to the following projects by **Baku Hashimoto**:

### Used Libraries

- **[Tweeq UI Library](https://github.com/baku89/tweeq)** - Used as Vue.js UI component library

### Project Structure & Codebase

- **[UNIM](https://baku89.com/works/unim)** - Unicode character animation tool. This project is based on UNIM's codebase, forked and adapted specifically for rhombic tiling pattern generation

We extend our deepest gratitude to Baku Hashimoto for his excellent open-source tools and project design philosophy.

## パターン生成アルゴリズム

このプロジェクトの菱形タイリングパターン生成アルゴリズムは、**松川昌平**氏による論文「[コンピュータによる菱形タイリングの生成手法](https://gakkai.sfc.keio.ac.jp/journal/.assets/SFCJ20-1-07.pdf)」（SFC Journal Vol.20 No.1, 2020）に基づいています。

同論文では、12個のゾーンオフセットパラメータを用いた菱形タイリングの体系的な生成手法が提示されており、本プロジェクトではこの手法を実装してインタラクティブなパターン生成を実現しています。

## Pattern Generation Algorithm

The rhombic tiling pattern generation algorithm in this project is based on the paper "[Computer-based Generation Method for Rhombic Tiling](https://gakkai.sfc.keio.ac.jp/journal/.assets/SFCJ20-1-07.pdf)" by **Shohei Matsukawa** (SFC Journal Vol.20 No.1, 2020).

The paper presents a systematic approach to generating rhombic tilings using 12 zone offset parameters, which this project implements to achieve interactive pattern generation.

## 開発中

⚠️ **このプロジェクトは現在活発に開発中です。**

機能や仕様が大幅に変更される可能性があります。一部の機能は不完全または実験的な状態です。プロジェクトの発展に伴い、フィードバックや貢献を歓迎いたします。

### 現在の状況:

- ✅ 基本的なパターン生成
- ✅ リアルタイムパラメータ調整
- ✅ 二つの描画モード
- 🚧 アニメーションシーケンス
- 🚧 パターンバリエーション
- 🚧 エクスポート機能（開発中）
- 🚧 画面UI/パフォーマンス最適化（開発中）

## Work in Progress

⚠️ **This project is currently under active development.**

Features and functionality may change significantly. Some features may be incomplete or experimental. We welcome feedback and contributions as the project evolves.

### Current Status:

- ✅ Basic pattern generation
- ✅ Real-time parameter adjustment
- ✅ Dual rendering modes
- 🚧 Animation sequences
- 🚧 Pattern variations
- 🚧 Export functionality (in progress)
- 🚧 UI/Performance optimizations (in progress)

## ライブデモ

🌐 **[GitHub Pagesでライブデモを見る](https://bob-takuya.github.io/ichimatsu_gen/)**

## Live Demo

🌐 **[View Live Demo on GitHub Pages](https://bob-takuya.github.io/ichimatsu_gen/)**

## ローカル開発

```bash
# リポジトリをクローン
git clone https://github.com/bob-takuya/ichimatsu_gen.git
cd ichimatsu_gen

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev

# プロダクション用にビルド
npm run build
```

## Local Development

```bash
# Clone the repository
git clone https://github.com/bob-takuya/ichimatsu_gen.git
cd ichimatsu_gen

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 使用方法

1. **パターン生成**: 右パネルのスライダーを使用して12個のゾーンオフセットパラメータを調整
2. **レンダリングモード**: "Edges"と"Fills"を切り替えて異なる視覚化を確認
3. **アニメーション**: タイムラインにパターンを追加してシーケンスを作成
4. **バリエーション**: 現在の設定に基づいて代替パターンを生成

## Usage

1. **Pattern Generation**: Use the sliders in the right panel to adjust the 12 zone offset parameters
2. **Rendering Mode**: Toggle between "Edges" and "Fills" to see different visualizations
3. **Animation**: Create sequences by adding patterns to the timeline
4. **Variations**: Generate alternative patterns based on the current configuration

## ライセンス

このプロジェクトは教育目的で作成されています。使用している外部ライブラリのライセンスについては、元のリポジトリを参照してください：

- [Tweeq License](https://github.com/baku89/tweeq/)

## License

This project is created for educational purposes. Please refer to the original repositories for their respective licenses:

- [Tweeq License](https://github.com/baku89/tweeq/)
