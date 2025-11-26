# AcousticAnalyzer User Manual  
# AcousticAnalyzer 用户手册

**Version / 版本**: v0.2  
**Last Updated / 最后更新**: November 2025

---

## Table of Contents / 目录

**English**
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Data Upload and File Format](#data-upload-and-file-format)
4. [Filtering and Analysis Options](#filtering-and-analysis-options)
5. [Understanding the Report](#understanding-the-report)
6. [Charts and Visualizations](#charts-and-visualizations)tics / 统计数据](#statistics--统计数据)
7. [Report Export / 报告导出](#report-export--报告导出)
8. [Project Management / 项目管理](#project-management--项目管理)
9. [FAQ / 常见问题](#faq--常见问题)

---

## Quick Start / 快速开始

### Step 1: Upload Test Data / 第一步：上传测试数据

1. Click **"Upload Excel Files"** button in the center of the page  
   点击页面中央的 **"Upload Excel Files"** 按钮
2. Select one or more Excel test data files  
   选择一个或多个 Excel 测试数据文件
3. Wait for file parsing to complete  
   等待文件解析完成

### Step 2: Start Analysis / 第二步：开始分析

1. Configure filter options in the "Filter Options" area  
   在"Filter Options"区域配置筛选选项
2. Enter analysis summary in the "Summary" textbox (optional)  
   在"Summary"文本框中输入分析总结（可选）
3. Click **"Start Analysis"** button  
   点击 **"Start Analysis"** 按钮

### Step 3: View Results / 第三步：查看结果

- Automatically generated statistics summary displayed at the top  
  自动生成的统计摘要显示在顶部
- Scroll to view charts and data for each test item  
  滚动查看各测试项的图表和数据
- Use sidebar to quickly navigate to specific test items  
  使用侧边栏快速导航到特定测试项

---

## File Upload / 文件上传

### Supported File Formats / 支持的文件格式

- **Excel files** (.xlsx, .xls)  
  **Excel 文件** (.xlsx, .xls)
- Multiple files can be uploaded simultaneously  
  支持同时上传多个文件

### Excel File Requirements / Excel 文件要求

Test data should contain the following information:  
测试数据应包含以下信息：

#### Required Columns / 必需列
- **SN**: Product serial number / 产品序列号
- **Test Item Name**: e.g., "SPL@1kHz", "THD", "Frequency Response"  
  **测试项名称**: 如 "SPL@1kHz", "THD", "Frequency Response"
- **Test Value**: Actual measured value / 实际测量值
- **Upper Limit**: Optional / 上限（可选）
- **Lower Limit**: Optional / 下限（可选）
- **Pass/Fail**: Test result / 测试结果

#### Optional Columns / 可选列
- **Channel**: Channel identifier (L/R) / 声道标识 (L/R)
- **Frequency**: Frequency points (for frequency response tests) / 频率点（用于频响测试）

### Multiple File Upload / 多文件上传

- Multiple test files can be uploaded at once  
  可以一次性上传多个测试文件
- System automatically merges data for the same test items  
  系统会自动合并相同测试项的数据
- Data for the same SN will be consolidated  
  相同 SN 的数据会被整合

---

## Data Analysis / 数据分析

### Filter Options / 筛选选项

#### 1. Deduplicate (Latest)
- **ON**: Keep only the latest record for duplicate tests of the same SN  
  **开启**: 同一 SN 的重复测试只保留最新记录
- **OFF**: Keep all test records  
  **关闭**: 保留所有测试记录
- Default: ON / 默认：开启

#### 2. Filter Type / 筛选类型
- **Show All**: Display all data / 显示所有数据
- **Pass Only**: Display only passed tests / 仅显示通过的测试
- **Fail Only**: Display only failed tests / 仅显示失败的测试
- **All Pass Units Only**: Display only units that passed all tests / 仅显示全部通过的单元
- Default: Show All / 默认：Show All

#### 3. Merge Channels / 合并声道
- **ON**: Merge L/R channel data into a single view  
  **开启**: 合并 L/R 声道数据到单一视图
- **OFF**: Display L/R channels separately  
  **关闭**: L/R 声道分开显示
- Default: OFF / 默认：关闭

### Start Analysis / 开始分析

After configuring filter options, click **"Start Analysis"** to enter analysis mode.  
配置完筛选选项后，点击 **"Start Analysis"** 进入分析模式。

---

## Charts / 图表查看

### Chart Types / 图表类型

#### 1. Frequency Response Chart / 频率响应曲线图
- Displays frequency response for multi-point test items  
  显示多频点测试项的频率响应
- X-axis: Frequency (logarithmic scale) / X轴：频率（对数刻度）
- Y-axis: Measured value (e.g., dB) / Y轴：测量值（如 dB）
- Can display upper/lower limit lines  
  可显示上下限线
- Supports overlaying multiple curves (different SNs)  
  支持多条曲线叠加（不同 SN）

#### 2. CPK Line Chart / CPK 折线图
- Displays CPK values for each frequency point  
  显示各频率点的 CPK 值
- Only shows frequency points with defined limits  
  仅显示有上下限定义的频率点
- CPK ≥ 1.33 is generally considered acceptable  
  CPK ≥ 1.33 通常认为合格

#### 3. CPK Distribution Chart / CPK 分布图
- Displayed for single-value test items  
  单值测试项显示
- Histogram + normal distribution curve  
  直方图 + 正态分布曲线
- Shows CPK value and standard deviation (σ)  
  显示 CPK 值和标准差 (σ)

#### 4. Result Distribution Pie Chart / 结果分布饼图
- For test items without limits  
  用于无上下限的测试项
- Shows Pass/Fail ratio  
  显示 Pass/Fail 比例

### Chart Interaction / 图表交互

#### Zoom and Pan / 缩放和平移
1. Charts are in "static" mode by default  
   默认情况下图表为"静态"模式
2. **Click the chart** to activate interaction mode  
   **点击图表**激活交互模式
3. When activated, you can:  
   激活后可以：
   - Drag to pan / 拖拽平移
   - Scroll to zoom / 滚轮缩放
   - Double-click to reset view / 双击重置视图

#### Save View State / 保存视图状态
- Chart zoom and pan states are automatically saved  
  图表的缩放和平移状态会自动保存
- Project save includes chart view settings  
  保存项目时会包含图表视图设置
- View is restored when reopening the project  
  下次打开项目时恢复原有视图

---

## Statistics / 统计数据

### Summary Statistics / 摘要统计

Overall statistics are displayed at the top of the analysis report:  
分析报告顶部显示整体统计信息：

#### Unit Statistics / 单元统计
- **Total Units**: Total number of L or R units  
  **Total Units**: L 或 R 单元总数
- **Passed Units**: Number of passed units  
  **Passed Units**: 通过的单元数
- **Failed Units**: Number of failed units  
  **Failed Units**: 失败的单元数

**Judgment Logic / 判定逻辑**: A unit (L or R) passes only if all test items with defined limits pass  
一个单元（L 或 R）的所有有上下限的测试项都通过才算通过

#### Set Statistics / 套装统计
- **Passed Sets**: Number of products where both L+R passed  
  **Passed Sets**: L+R 都通过的产品数
- **Failed Sets**: Number of products where either L or R failed  
  **Failed Sets**: L 或 R 任一失败的产品数

**Judgment Logic / 判定逻辑**: A set passes only if both L and R units for the same SN pass  
同一 SN 的 L 和 R 都通过才算一套通过

> **Note / 注意**: Set Statistics are only shown when channels are not merged  
> Set Statistics 仅在未合并声道时显示

### Test Item Statistics / 测试项统计

Statistics for each test item are displayed below the charts:  
每个测试项下方显示该项的统计：

#### Single Channel or Merged Mode / 单声道或合并模式
- Pass count / Pass 数量
- Fail count / Fail 数量
- Total count / Total 数量

#### Dual Channel Mode (L/R) / 双声道模式 (L/R)
- Displayed in two columns / 分两列显示
- Left: Left Channel statistics / 左侧：Left Channel 统计
- Right: Right Channel statistics / 右侧：Right Channel 统计
- Each column shows Pass/Fail/Total independently  
  每列独立显示 Pass/Fail/Total

---

## Report Export / 报告导出

### Report Title / 报告标题

1. Click the title at the top to edit  
   点击顶部标题可编辑
2. Automatically extracted from filename by default  
   默认从文件名自动提取
3. Uses common prefix for multiple files  
   多文件时使用公共前缀

### Export Options / 导出选项

#### 1. Export PDF
- Opens print preview in a new window  
  在新窗口打开打印预览
- Use browser print function  
  使用浏览器打印功能
- Select "Save as PDF"  
  选择"保存为 PDF"
- Preset parameters / 预设参数：
  - Paper: A4 / 纸张：A4
  - Margins: Minimum / 页边距：最小
  - Scale: 60% / 缩放：60%

#### 2. Export HTML
- Downloads a standalone HTML file  
  下载独立的 HTML 文件
- Contains all styles and data  
  包含所有样式and数据
- Can be opened in any browser  
  可在任何浏览器打开
- Filename format: `{Title}_{Date}.html`  
  文件名格式：`{标题}_{日期}.html`

---

## Project Management / 项目管理

### Save Project / 保存项目

1. Click **"Save Project"** button  
   点击 **"Save Project"** 按钮
2. Project is saved as a JSON file  
   项目保存为 JSON 文件
3. Filename format: `{Title}_{Date}.json`  
   文件名格式：`{标题}_{日期}.json`

### Save Content / 保存内容
- All test data / 所有测试数据
- Filter option settings / 筛选选项设置
- Report title and summary / 报告标题和总结
- Test item visibility status / 测试项可见性状态
- Chart view states (zoom/pan) / 图表视图状态（缩放/平移）
- Comments / 评论备注

### Load Project / 加载项目

1. Click **"Load Project"** button  
   点击 **"Load Project"** 按钮
2. Select a previously saved .json file  
   选择之前保存的 .json 文件
3. All settings and data are fully restored  
   所有设置和数据完全恢复

---

## FAQ / 常见问题

### Q1: No response after uploading files? / 上传文件后没有反应？

**A**: Check the following:  
**A**: 检查以下几点：
- Is the Excel file format correct? / Excel 文件格式是否正确
- Does it contain required columns (SN, test item, test value)? / 是否包含必需的列（SN, 测试项, 测试值）
- Is the file too large (recommended < 50MB)? / 文件是否过大（建议 < 50MB）
- Are there any errors in the browser console? / 浏览器控制台是否有错误信息

### Q2: Charts not interactive? / 图表无法交互？

**A**: 
- Make sure you've clicked the chart to activate interaction mode  
  确保已点击图表激活交互模式
- Check if "Click to interact" prompt is shown on the chart  
  查看图表上是否显示"Click to interact"提示
- Try refreshing the page / 刷新页面重试

### Q3: CPK values not displayed? / CPK 值没有显示？

**A**: CPK values are only shown when:  
**A**: CPK 值仅在满足以下条件时显示：
- Test item has defined upper or lower limits  
  测试项定义了上限或下限
- Sufficient data points (≥2) / 有足够的数据点（≥2）
- For frequency response tests, that frequency point has limit values defined  
  频响测试中，该频率点有限值定义

### Q4: Statistics seem inaccurate? / 统计数据不准确？

**A**: 
- Check if "Deduplicate" option meets expectations  
  检查"Deduplicate"选项是否符合预期
- Verify "Filter Type" settings / 确认"Filter Type"设置
- Validate Pass/Fail markers in test data  
  验证测试数据中的 Pass/Fail 标记

### Q5: Browser crashes during PDF export? / PDF 导出时浏览器崩溃？

**A**: 
- Use "Export HTML" instead for large datasets  
  数据量过大时使用"Export HTML"替代
- HTML files can be printed to PDF using browser  
  HTML 文件可用浏览器打印为 PDF
- Or export test items in batches / 或分批次导出测试项

### Q6: How to hide certain test items? / 如何隐藏某些测试项？

**A**: 
1. Click the eye icon in the top right of the test item  
   点击测试项右上角的眼睛图标
2. Hidden items are shown with strikethrough in the sidebar  
   隐藏的项目在侧边栏中显示为删除线
3. Click sidebar item to restore visibility  
   点击侧边栏项目可恢复显示

### Q7: Will uploading files multiple times overwrite data? / 多次上传文件会覆盖吗？

**A**: 
- No, data will not be overwritten / 不会覆盖
- New data will be appended to existing data / 新数据会追加到现有数据
- Use "Deduplicate" to remove duplicates / 使用"Deduplicate"可去除重复
- To start fresh, refresh the page / 如需重新开始，刷新页面

### Q8: Set Statistics not showing? / Set Statistics 没有显示？

**A**: Set Statistics are only shown when:  
**A**: Set Statistics 仅在以下情况显示：
- "Merge Channels" is not enabled / 未开启"Merge Channels"
- Data contains L/R channel information / 数据中包含 L/R 声道信息
- Paired L+R data exists / 存在成对的 L+R 数据

---

## Technical Support / 技术支持

### Browser Requirements / 浏览器要求

- **Recommended / 推荐**: Chrome, Edge, Safari (latest versions / 最新版本)
- **Minimum / 最低**: Modern browser with ES6 support / 支持 ES6 的现代浏览器

### Performance Recommendations / 性能建议

- Enable "Deduplicate" for large datasets (>1000 records)  
  大数据集（>1000 条记录）建议启用"Deduplicate"
- Use filtering to reduce displayed data volume  
  使用筛选功能减少显示数据量
- Save project regularly to avoid data loss  
  定期保存项目避免数据丢失

### Data Privacy / 数据隐私

- All data is processed locally in the browser  
  所有数据在浏览器本地处理
- No data is uploaded to servers  
  不会上传到服务器
- Saved project files are stored locally  
  保存的项目文件存储在本地

---

## Version Information / 版本信息

**Current Version / 当前版本**: v0.1

**Changelog / 更新日志**:
- v0.1 (2025-11): Initial release / 初始版本发布
  - Basic data analysis features / 基础数据分析功能
  - Multiple chart type support / 多图表类型支持
  - Project save/load / 项目保存/加载
  - PDF/HTML export / PDF/HTML 导出
  - Performance optimization (lazy loading, debouncing) / 性能优化（懒加载、防抖）

---

**Last Updated / 最后更新**: 2025-11-25
