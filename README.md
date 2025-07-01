# 🎓 智能学生成绩报告单生成系统

一个现代化的前后端分离架构的学生成绩报告单生成系统，支持Excel文件导入、智能数据处理和美观报告单生成。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-16+-green.svg)
![Express](https://img.shields.io/badge/express-4.18+-red.svg)
![Frontend](https://img.shields.io/badge/frontend-vanilla%20js-yellow.svg)


## ✨ 功能特性

### 🎨 现代化UI设计
- **炫酷视觉效果**: 渐变背景、动画粒子、玻璃态效果
- **响应式设计**: 完美适配桌面端和移动端
- **流畅交互**: 平滑滚动、动画过渡、实时反馈
- **深色主题**: 护眼的深色界面设计

### 📊 强大数据处理
- **智能解析**: 自动识别Excel文件结构和数据格式
- **数据验证**: 严格的数据校验和错误处理
- **自动计算**: 总分、平均分、排名自动计算
- **统计分析**: 班级统计、科目分析、成绩分布

### 📄 美观报告单
- **专业设计**: 清晰的报告单布局和样式
- **智能评语**: 根据成绩自动生成个性化评语
- **多种格式**: 支持HTML预览和PDF下载
- **批量处理**: 一键生成所有学生报告单

### 🔧 技术架构
- **前后端分离**: RESTful API + 现代前端
- **高性能**: 异步处理、内存优化、响应式设计
- **易部署**: 自动化脚本、环境配置简单
- **可扩展**: 模块化设计、易于维护和扩展

## 🚀 快速开始

### 环境要求

- Node.js 16+ 
- npm 8+
- 现代浏览器 (Chrome, Firefox, Safari, Edge)

### 一键启动

使用自动化启动脚本：

```bash
# 克隆项目
git clone https://github.com/zxfccmm4/StudentReport.git
cd StudentReport

# 一键启动（自动安装依赖并启动服务）
./start.sh
```

### 手动安装

如果需要手动安装：

```bash
# 1. 安装后端依赖
cd backend
npm install

# 2. 启动服务
npm run dev  # 开发模式
# 或
npm start    # 生产模式

# 3. 访问应用
# 浏览器打开: http://localhost:3000
```

## 📁 项目结构

```
StudentReport/
├── frontend/                      # 前端文件
│   ├── index.html                 # 主页面
│   ├── sample-generator.html      # 示例数据生成器
│   ├── css/
│   │   └── style.css             # 样式文件
│   └── js/
│       └── app.js                # 前端逻辑
├── backend/                       # 后端服务
│   ├── server.js                 # Express服务器
│   ├── package.json              # 依赖配置
│   └── package-lock.json         # 锁定版本
├── sample_data_with_new_fields.csv   # 新字段示例数据
├── sample_student_data.csv           # 基础示例数据
├── troubleshooting.md                # 故障排除指南
├── start.sh                          # 自动化启动脚本
├── .gitignore                        # Git忽略配置
└── README.md                         # 项目说明
```

## 🎯 使用指南

### 1. 准备Excel文件

确保Excel文件包含以下列：

**必需列：**
- `姓名` - 学生姓名
- 各科目成绩列（如：语文、数学、英语等）

**可选列：**
- `学号` - 学生学号
- `班级` - 班级信息
- `性别` - 学生性别
- `身份证号` - 学生身份证号
- `学生上课表现` - 学生课堂表现
- `请假` - 请假天数
- `早退` - 早退次数
- `学校课程教育目标` - 学校教育目标
- `学生期末总评` - 期末总评
- `正式上课` - 正式上课天数
- `备注` 或 `评语` - 自定义评语

**Excel示例：**
| 姓名 | 学号 | 班级 | 性别 | 语文 | 数学 | 英语 | 物理 | 化学 | 学生上课表现 | 请假 | 早退 | 正式上课 |
|------|------|------|------|------|------|------|------|------|--------------|------|------|----------|
| 张三 | 001 | 高一1班 | 男 | 85 | 92 | 78 | 88 | 91 | 表现优秀 | 2 | 1 | 180 |
| 李四 | 002 | 高一1班 | 女 | 92 | 88 | 95 | 85 | 89 | 英语突出 | 1 | 0 | 180 |

### 2. 操作流程

1. **访问系统** - 在浏览器中打开 `http://localhost:3000`
2. **下载模板** - 点击"下载Excel模板"获取标准模板
3. **上传文件** - 在"数据上传"区域拖拽或选择Excel文件
4. **预览数据** - 系统自动解析并显示学生数据预览
5. **生成报告** - 点击"生成报告单"按钮
6. **查看报告** - 在下拉菜单中选择学生查看报告单
7. **下载PDF** - 支持单个下载或批量下载

### 3. API接口

#### 上传文件
```http
POST /api/upload
Content-Type: multipart/form-data

# 返回
{
  "status": "success",
  "message": "成功导入 30 名学生的数据",
  "data": {
    "totalStudents": 30,
    "subjects": ["语文", "数学", "英语"],
    "students": [...]
  }
}
```

#### 获取学生列表
```http
GET /api/students?page=1&limit=50

# 返回
{
  "status": "success",
  "data": {
    "students": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalStudents": 30
    }
  }
}
```

#### 生成报告单
```http
GET /api/students/0/report

# 返回
{
  "status": "success",
  "data": {
    "html": "<div class='report-card'>...</div>",
    "student": {
      "name": "张三",
      "studentId": "001"
    }
  }
}
```

## 🛠️ 开发指南

### 本地开发

1. **启动后端开发服务器**
```bash
cd backend
npm run dev
```

2. **修改前端代码**
- 编辑 `frontend/` 目录下的文件
- 浏览器会自动刷新显示更改

### 代码结构

#### 前端架构
```javascript
class ModernReportGenerator {
    // 主应用类
    init()                    // 初始化
    processFile()            // 处理文件上传
    displayDataPreview()     // 显示数据预览
    generateReportHtml()     // 生成报告单HTML
    downloadSingleReport()   // 下载单个PDF
    downloadAllReports()     // 批量下载PDF
}
```

#### 后端架构
```javascript
// 路由结构
app.post('/api/upload')           // 文件上传
app.get('/api/students')          // 获取学生列表
app.get('/api/students/:id/report') // 生成单个报告
app.post('/api/reports/generate')    // 批量生成
app.get('/api/statistics')          // 统计信息
```

### 添加新功能

1. **添加新的API接口**
```javascript
// backend/server.js
app.get('/api/new-feature', (req, res) => {
    res.json({ status: 'success', data: {} });
});
```

2. **添加前端功能**
```javascript
// frontend/js/app.js
async newFeature() {
    const response = await fetch('/api/new-feature');
    const data = await response.json();
    // 处理响应
}
```

## 🎨 自定义配置

### 修改样式主题

编辑 `frontend/css/style.css` 中的CSS变量：

```css
:root {
    --primary-color: #6366f1;     /* 主题色 */
    --bg-primary: #0f0f23;        /* 主背景色 */
    --text-primary: #ffffff;       /* 主文字色 */
    /* 更多变量... */
}
```

### 修改报告单模板

编辑 `generateReportHtml()` 函数来自定义报告单样式和内容。

### 修改评语生成逻辑

编辑 `generateComment()` 函数来自定义自动评语的生成规则。

## 📦 部署指南

### 使用启动脚本部署

```bash
# 生产环境启动
./start.sh prod

# 开发环境启动
./start.sh dev

# 查看状态
./start.sh status

# 停止服务
./start.sh stop
```

### 传统部署

1. **安装依赖**
```bash
cd backend && npm install --production
```

2. **设置环境变量**
```bash
export PORT=3000
export NODE_ENV=production
```

3. **启动服务**
```bash
npm start
```

### Nginx配置

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🔧 故障排除

详细的故障排除指南请查看 [troubleshooting.md](troubleshooting.md)

### 常见问题

1. **文件上传失败**
   - 检查文件格式是否为 .xlsx 或 .xls
   - 确认文件大小不超过 10MB
   - 验证Excel文件包含必需的列

2. **报告单生成失败**
   - 检查浏览器控制台错误信息
   - 确认数据格式正确
   - 尝试刷新页面重新操作

3. **PDF下载问题**
   - 确保浏览器支持 HTML5 Canvas
   - 检查网络连接是否稳定
   - 尝试使用Chrome或Firefox浏览器

4. **服务器启动失败**
   - 检查Node.js版本是否为16+
   - 确认端口3000未被占用
   - 查看服务器日志错误信息

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Express.js](https://expressjs.com/) - 后端框架
- [SheetJS](https://sheetjs.com/) - Excel文件处理
- [jsPDF](https://github.com/parallax/jsPDF) - PDF生成
- [html2canvas](https://html2canvas.hertzen.com/) - HTML转图片

## 📞 联系方式

- 项目地址: [GitHub](https://github.com/zxfccmm4/StudentReport)
- 问题反馈: [Issues](https://github.com/zxfccmm4/StudentReport/issues)

---

⭐ 如果这个项目对您有帮助，请给我们一个星标！