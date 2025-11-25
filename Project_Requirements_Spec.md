# Project Requirements Specification: Acoustic Test Data Analysis System

**Version / 版本**: v0.1  
**Last Updated / 最后更新**: 2025-11-25

---

## 1. Introduction / 简介

### 1.1 Purpose / 目的

This document defines the functional and non-functional requirements for the **Acoustic Test Data Analysis System** / **声学测试数据分析系统**. The system assists professional acoustic engineers in processing, analyzing, and visualizing raw acoustic test data, generating comprehensive analysis reports.

本文档定义了声学测试数据分析系统的功能性和非功能性需求。该系统帮助专业声学工程师处理、分析和可视化原始声学测试数据，生成综合分析报告。

### 1.2 Scope / 范围

The system is a **web-based application** that:  
该系统是一个**基于网页的应用程序**，可以：

- Accepts acoustic test data in Excel format / 接受 Excel 格式的声学测试数据
- Performs data processing (filtering, merging) / 执行数据处理（筛选、合并）
- Visualizes results (frequency response curves, CPK analysis) / 可视化结果（频率响应曲线、CPK 分析）
- Generates professional reports (PDF/HTML export) / 生成专业报告（PDF/HTML 导出）

---

## 2. Data Specifications / 数据规格

### 2.1 Input Data Formats / 输入数据格式

Supported Excel input formats: / 支持的 Excel 输入格式：

- **Single Channel Data** / **单声道数据**: `*_single.xlsx`
- **Dual Channel Data** / **双声道数据**: `*_dual.xlsx` (e.g., Headphones with L/R channels)

#### Channel Identification / 声道识别

Left/Right data is distinguished by: / 左/右数据通过以下方式区分：
- Sheet name prefixes: `Left`, `Right` / Sheet 名称前缀：`Left`、`Right`
- Sheet name suffixes: `_L`, `_R` / Sheet 名称后缀：`_L`、`_R`

### 2.2 Data Structure / 数据结构

#### Serial Number Mapping / 序列号映射
- A sheet containing "SN" in its name holds product serial numbers  
  包含"SN"的 Sheet 存储产品序列号

#### Test Data Sheets / 测试数据 Sheet
- All other sheets contain test data records / 所有其他 Sheet 包含测试数据记录

#### Data Record Types / 数据记录类型

1. **Single Value Record** / **单值记录**  
   Data exists only in Column F (e.g., Sensitivity at 1kHz)  
   数据仅存在于 F 列（如 1kHz 灵敏度）

2. **Multi-Value Record (Frequency Response)** / **多值记录（频率响应）**  
   Column F contains frequency points; subsequent columns contain amplitude/phase data  
   F 列包含频率点；后续列包含幅度/相位数据

#### Metadata Rows / 元数据行

- **Row 2 & 3**: Upper and Lower limits (Identifiers: `upper limit`, `lower limit` in E2/E3)  
  **第 2 和 3 行**：上限和下限（标识符：E2/E3 中的 `upper limit`, `lower limit`）
- **Row 4+**: Actual test data / **第 4 行+**：实际测试数据
- **Column E**: Measurement unit / **E 列**：测量单位

---

## 3. Functional Requirements / 功能需求

### 3.1 Data Processing / 数据处理

#### File Upload / 文件上传
- **Iterative Upload** / **迭代上传**: Users can upload multiple Excel files incrementally  
  用户可以逐步上传多个 Excel 文件

#### Deduplication / 去重
- Option to remove duplicate records, keeping only latest test data  
  选项去除重复记录，仅保留最新的测试数据

#### Data Filtering / 数据筛选

- **Show All** / **显示全部**: Display all data / 显示所有数据
- **Pass Only** / **仅通过**: Display only passing data / 仅显示通过的数据
- **Fail Only** / **仅失败**: Display only failing data / 仅显示失败的数据
- **All Pass Units Only** / **仅全部通过单元**: Display only units where all test items passed  
  仅显示所有测试项均通过的单元

#### Channel Merging / 声道合并
- Option to merge Left and Right channel data into a single view  
  选项将左右声道数据合并到单个视图

---

### 3.2 Visualization / 可视化

#### 3.2.1 Frequency Response Charts / 频率响应图表

**Coordinate System** / **坐标系统**:
- **X-Axis** / **X 轴**: Frequency (Logarithmic scale) / 频率（对数刻度）
- **Y-Axis** / **Y 轴**: Amplitude/Phase (Linear scale) / 幅度/相位（线性刻度）

**Interactivity** / **交互性**:
- **Static Mode** / **静态模式**: Charts initially load as static images for performance  
  图表初始加载为静态图像以优化性能
- **Click to Activate** / **点击激活**: Users click to enable interactive mode (Zoom/Pan)  
  用户点击启用交互模式（缩放/平移）
- **Axis Persistence** / **轴持久化**: Zoom/Pan settings are saved with project  
  缩放/平移设置与项目一起保存

**Visual Style** / **视觉样式**:
- High-contrast, professional plotting style / 高对比度专业绘图样式
- Clear distinction between limits and measured data / 限值和实测数据之间的清晰区分

**Layout** / **布局**:
- **Side-by-Side View** / **并排视图**: L/R channels displayed separately when not merged  
  未合并时 L/R 声道分别显示

#### 3.2.2 Statistical Analysis / 统计分析

**CPK Analysis Display** / **CPK 分析显示**:

**Multi-Value Data** / **多值数据**:
- **Line Chart** / **折线图**: CPK values vs. Frequency / CPK 值与频率
- **Variance Overlay** / **方差叠加**: Standard deviation across frequencies  
  跨频率的标准差
- **Limit Filtering** / **限值筛选**: Only display points with defined limits  
  仅显示有定义限值的点

**Single-Value Data** / **单值数据**:
- **Histogram** / **直方图**: For numeric data / 用于数值数据
- **Pie Chart** / **饼图**: For Pass/Fail distribution / 用于 Pass/Fail 分布
- **Text Display** / **文本显示**: CPK and σ values / CPK 和 σ 值

---

### 3.3 Statistics / 统计

#### Unit Statistics / 单元统计
- **Unit** / **单元**: Individual L or R channel  
  单独的 L 或 R 声道
- **Pass Criteria** / **通过标准**: ALL test items (with limits) must pass  
  所有测试项（有限值）必须通过
- **Metrics** / **指标**: Total Units, Passed Units, Failed Units  
  总单元数、通过单元数、失败单元数

#### Set Statistics / 套装统计
- **Set** / **套装**: Both L and R channels for the same SN  
  同一 SN 的 L 和 R 声道
- **Pass Criteria** / **通过标准**: Both L AND R units must pass  
  L 和 R 单元都必须通过
- **Display Condition** / **显示条件**: Only shown when channels are not merged  
  仅在未合并声道时显示

---

### 3.4 Reporting & Web Interface / 报告和网页界面

#### Report Structure / 报告结构
- **Editable Title** / **可编辑标题**: Auto-extracted from filenames  
  从文件名自动提取
- **Summary Section** / **摘要部分**: Editable text area for executive summary  
  用于执行摘要的可编辑文本区域
- **Test Items** / **测试项**: Sequential display of analyzed items  
  分析项的顺序显示

#### Interactive Elements / 交互元素
- **Hide/Show** / **隐藏/显示**: Toggle test item visibility  
  切换测试项可见性
- **User Annotation** / **用户注释**: Comments for each test item  
  每个测试项的评论

#### Export / 导出

**Save Project** / **保存项目**:
- Format: JSON / 格式：JSON
- Content: Data, Comments, Visibility, Filters, Layouts  
  内容：数据、评论、可见性、筛选、布局

**Load Project** / **加载项目**:
- Restore complete session state from JSON  
  从 JSON 恢复完整会话状态

**Export PDF** / **导出 PDF**:
- Browser print dialog with preset settings (A4, minimal margins, 60% scale)  
  浏览器打印对话框，预设设置（A4、最小边距、60% 缩放）

**Export HTML** / **导出 HTML**:
- Standalone HTML file with embedded styles  
  带嵌入式样式的独立 HTML 文件

---

### 3.5 Data Management / 数据管理

#### Multi-File Import / 多文件导入
- Support uploading multiple Excel files / 支持上传多个 Excel 文件
- System merges data from files with same test item names  
  系统合并具有相同测试项名称的文件数据

---

## 4. Non-Functional Requirements / 非功能需求

### 4.1 Platform / 平台
- **Type** / **类型**: Web Application (Browser-based) / 网页应用程序（基于浏览器）
- **Support** / **支持**: Modern browsers (Chrome, Edge, Safari)  
  现代浏览器（Chrome、Edge、Safari）

### 4.2 Performance / 性能
- **Lazy Loading** / **懒加载**: Charts load only when visible  
  图表仅在可见时加载
- **Memoization** / **记忆化**: Prevent unnecessary re-renders  
  防止不必要的重新渲染
- **Debouncing** / **防抖**: Optimize filter operations  
  优化筛选操作

### 4.3 Usability / 可用性
- **Target Users** / **目标用户**: Professional acoustic engineers  
  专业声学工程师
- **Interface** / **界面**: Clean, data-dense, and precise  
  简洁、数据密集且精确

### 4.4 Reliability / 可靠性
- **Error Handling** / **错误处理**: Robust file parsing and export handling  
  稳健的文件解析和导出处理
- **Data Privacy** / **数据隐私**: All processing done locally in browser  
  所有处理在浏览器本地完成

---

## 5. Future Enhancements / 未来增强

- **Multi-language Support** / **多语言支持**: Full i18n implementation  
  完整的国际化实现
- **Advanced Filtering** / **高级筛选**: Custom filter expressions  
  自定义筛选表达式
- **Batch Operations** / **批量操作**: Bulk edit comments/visibility  
  批量编辑评论/可见性
- **Cloud Integration** / **云集成**: Save projects to cloud storage  
  将项目保存到云存储

---

**Document Version / 文档版本**: v0.1  
**Last Updated / 最后更新**: 2025-11-25
