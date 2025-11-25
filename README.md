# AcousticAnalyzer

**Version**: v0.1  
**A professional web-based acoustic test data analysis tool** / **专业的声学测试数据分析网页工具**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)  
[![Made with React](https://img.shields.io/badge/Made%20with-React-61DAFB.svg)](https://reactjs.org/)  
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)

---

## 📋 Overview / 概述

AcousticAnalyzer is a powerful web-based tool for analyzing acoustic test data, visualizing frequency responses, calculating CPK (Process Capability Index) statistics, and generating comprehensive reports.

AcousticAnalyzer 是一个强大的基于 Web 的声学测试数据分析工具，用于可视化频率响应、计算 CPK（过程能力指数）统计数据并生成综合报告。

### Key Features / 主要功能

- ✅ **Multi-file Support** / **多文件支持**: Upload and merge multiple Excel files
- 📊 **Interactive Charts** / **交互式图表**: Frequency response, CPK trends, histograms, and pie charts
- 📈 **Advanced Statistics** / **高级统计**: Unit-level and Set-level pass/fail analysis for L/R channels
- 🔍 **Flexible Filtering** / **灵活筛选**: Deduplicate, Pass/Fail filters, channel merging
- 💾 **Project Management** / **项目管理**: Save and load complete analysis sessions
- 📄 **Report Export** / **报告导出**: Export as PDF or standalone HTML
- ⚡ **Performance Optimized** / **性能优化**: Lazy loading, debouncing, and memoization
- 🎨 **Modern UI** / **现代界面**: Clean, responsive design with sidebar navigation

---

## 🚀 Quick Start / 快速开始

### Prerequisites / 前置要求

- **Node.js** (v16 or higher / v16 或更高版本)
- **npm** (v7 or higher / v7 或更高版本)

### Installation / 安装

```bash
# Clone the repository / 克隆仓库
git clone https://github.com/aaronzz00/AcousticAnalyzer.git
cd AcousticAnalyzer

# Install dependencies / 安装依赖
npm install

# Start development server / 启动开发服务器
npm run dev

# Build for production / 生产构建
npm run build
```

### First Use / 首次使用

1. **Upload Excel Files** / **上传 Excel 文件**  
   Click the upload button and select one or more `.xlsx` files containing acoustic test data.  
   点击上传按钮，选择一个或多个包含声学测试数据的 `.xlsx` 文件。

2. **Configure Filters** / **配置筛选**  
   Set deduplication, filter type (Show All/Pass Only/Fail Only), and channel merging options.  
   设置去重、筛选类型（显示全部/仅通过/仅失败）和声道合并选项。

3. **Start Analysis** / **开始分析**  
   Click "Start Analysis" to visualize your data with interactive charts and statistics.  
   点击"开始分析"以使用交互式图表和统计数据可视化您的数据。

4. **Export Report** / **导出报告**  
   Generate PDF or HTML reports with all charts and statistics included.  
   生成包含所有图表和统计数据的 PDF 或 HTML 报告。

---

## 📖 Documentation / 文档

- **[User Manual / 使用手册](docs/USER_MANUAL.md)**: Comprehensive bilingual guide / 详细的双语指南
- **[Project Requirements](Project_Requirements_Spec.md)**: Technical specifications / 技术规格
- **[AWS Deployment Guide](docs/AWS_DEPLOYMENT_GUIDE.md)**: Deploy to AWS Amplify / 部署到 AWS Amplify

---

## 📊 Excel File Format / Excel 文件格式

### Required Columns / 必需列

- **SN**: Product serial number / 产品序列号
- **Test Item**: Test name (e.g., "SPL@1kHz", "THD", "FR 100-10000Hz")  
  测试项名称（如 "SPL@1kHz", "THD", "FR 100-10000Hz"）
- **Value**: Measured test value / 测量值
- **Upper Limit** / **下限**: Optional / 可选
- **Lower Limit** / **上限**: Optional / 可选  
- **Pass/Fail**: Test result / 测试结果

### Optional Columns / 可选列

- **Channel**: L (Left) or R (Right) / L（左）或 R（右）
- **Frequency**: For frequency response tests / 用于频响测试

### Example / 示例

| SN | Channel | Test Item | Frequency | Value | Lower Limit | Upper Limit | Pass/Fail |
|----|---------|-----------|-----------|-------|-------------|-------------|-----------|
| 001 | L | SPL@1kHz | 1000 | 94.2 | 92 | 96 | PASS |
| 001 | L | FR | 100 | -3.2 | -5 | 5 | PASS |
| 001 | R | SPL@1kHz | 1000 | 93.8 | 92 | 96 | PASS |

---

## 🎯 Key Concepts / 核心概念

### Unit vs Set Statistics / 单元 vs 套装统计

- **Unit / 单元**: Individual L or R channel passes if ALL its test items (with limits) pass  
  单个 L 或 R 声道的所有测试项（有限值）都通过才算通过

- **Set / 套装**: Both L and R units for the same SN must pass  
  同一 SN 的 L 和 R 单元都通过才算一套通过

### CPK (Process Capability Index) / 过程能力指数

- **CPK ≥ 1.33**: Generally acceptable / 通常认为合格
- **CPK < 1.33**: May indicate process issues / 可能表明过程存在问题
- Only calculated for test items with defined limits / 仅对有定义限值的测试项计算

---

## 🛠️ Technology Stack / 技术栈

- **Frontend / 前端**: React 19.2, TypeScript 5.9
- **Build Tool / 构建工具**: Vite 7.2
- **Styling / 样式**: Tailwind CSS 4.1
- **Charts / 图表**: Plotly.js 3.3 (React-Plotly.js)
- **Excel Parsing / Excel 解析**: SheetJS (xlsx)
- **PDF Export / PDF 导出**: jsPDF + html2canvas
- **State Management / 状态管理**: React Hooks (useState, useMemo, useCallback)

---

## 🚢 Deployment / 部署

### AWS Amplify (Recommended / 推荐)

The easiest way to deploy AcousticAnalyzer is using AWS Amplify:  
部署 AcousticAnalyzer 最简单的方法是使用 AWS Amplify：

1. Push your code to GitHub / 将代码推送到 GitHub
2. Connect repository to AWS Amplify / 将仓库连接到 AWS Amplify
3. Amplify automatically builds and deploys / Amplify 自动构建和部署

See [AWS Deployment Guide](.gemini/antigravity/brain/*/AWS_DEPLOYMENT_GUIDE.md) for detailed instructions.  
查看 [AWS 部署指南](.gemini/antigravity/brain/*/AWS_DEPLOYMENT_GUIDE.md) 获取详细说明。

### Manual Deployment / 手动部署

```bash
# Build for production / 生产构建
npm run build

# The dist/ folder contains the production build
# Deploy to any static hosting service (Netlify, Vercel, GitHub Pages, etc.)
# dist/ 文件夹包含生产构建
# 部署到任何静态托管服务（Netlify, Vercel, GitHub Pages 等）
```

---

## 🤝 Contributing / 贡献

Contributions are welcome! / 欢迎贡献！

1. Fork the repository / 复刻仓库
2. Create a feature branch / 创建功能分支
3. Commit your changes / 提交更改
4. Push to the branch / 推送到分支
5. Open a Pull Request / 开启 Pull Request

---

## 📝 License / 许可证

This project is licensed under the MIT License.  
本项目采用 MIT 许可证。

---

## 🐛 Issues & Support / 问题与支持

- **Bug Reports / 错误报告**: [GitHub Issues](https://github.com/aaronzz00/AcousticAnalyzer/issues)
- **User Manual / 使用手册**: [docs/USER_MANUAL.md](docs/USER_MANUAL.md)
- **Email / 邮箱**: Contact repository owner / 联系仓库所有者

---

## 📈 Performance / 性能

- **Lazy Loading**: Charts load only when visible / 图表仅在可见时加载
- **Memoization**: Prevents unnecessary re-renders / 防止不必要的重新渲染
- **Debouncing**: Optimizes filter operations / 优化筛选操作
- **Optimized Charts**: Static mode by default, interactive on demand / 默认静态模式，按需交互

---

**Built with ❤️ for Acoustic Engineers** / **为声学工程师用心打造**

---

**Version / 版本**: v0.1 (November 2025)
