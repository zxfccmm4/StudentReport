const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 7788;

// 中间件配置
app.use(cors({
    origin: ['http://localhost:7788', 'http://127.0.0.1:7788', 'http://localhost:5500'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../frontend')));

// 文件上传配置
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB限制
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('只支持Excel文件格式'));
        }
    }
});

// 内存存储学生数据（生产环境建议使用数据库）
let currentStudentsData = [];

// API路由

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({
        status: 'success',
        message: '服务器运行正常',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// 上传Excel文件并解析
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: '没有上传文件'
            });
        }

        console.log(`开始处理文件: ${req.file.originalname}, 大小: ${req.file.size} bytes`);

        // 解析Excel文件
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // 处理学生数据
        const studentsData = processStudentData(rawData);
        
        // 存储到内存（生产环境可存储到数据库）
        currentStudentsData = studentsData;

        console.log(`成功处理 ${studentsData.length} 名学生的数据`);

        res.json({
            status: 'success',
            message: `成功导入 ${studentsData.length} 名学生的数据`,
            data: {
                totalStudents: studentsData.length,
                subjects: studentsData[0]?.subjects || [],
                students: studentsData.slice(0, 20) // 只返回前20个用于预览
            }
        });

    } catch (error) {
        console.error('文件处理错误:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || '文件处理失败'
        });
    }
});

// 获取所有学生数据
app.get('/api/students', (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        
        const paginatedData = currentStudentsData.slice(startIndex, endIndex);
        
        res.json({
            status: 'success',
            data: {
                students: paginatedData,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(currentStudentsData.length / limit),
                    totalStudents: currentStudentsData.length,
                    hasNext: endIndex < currentStudentsData.length,
                    hasPrev: startIndex > 0
                }
            }
        });
    } catch (error) {
        console.error('获取学生数据错误:', error);
        res.status(500).json({
            status: 'error',
            message: '获取学生数据失败'
        });
    }
});

// 获取单个学生数据
app.get('/api/students/:index', (req, res) => {
    try {
        const index = parseInt(req.params.index);
        
        if (isNaN(index) || index < 0 || index >= currentStudentsData.length) {
            return res.status(404).json({
                status: 'error',
                message: '学生不存在'
            });
        }

        const student = currentStudentsData[index];
        
        res.json({
            status: 'success',
            data: student
        });
    } catch (error) {
        console.error('获取学生数据错误:', error);
        res.status(500).json({
            status: 'error',
            message: '获取学生数据失败'
        });
    }
});

// 生成单个学生报告单HTML
app.get('/api/students/:index/report', (req, res) => {
    try {
        const index = parseInt(req.params.index);
        
        if (isNaN(index) || index < 0 || index >= currentStudentsData.length) {
            return res.status(404).json({
                status: 'error',
                message: '学生不存在'
            });
        }

        const student = currentStudentsData[index];
        const reportHtml = generateReportHTML(student, currentStudentsData.length);
        
        res.json({
            status: 'success',
            data: {
                html: reportHtml,
                student: {
                    name: student.姓名,
                    studentId: student.学号,
                    class: student.班级
                }
            }
        });
    } catch (error) {
        console.error('生成报告单错误:', error);
        res.status(500).json({
            status: 'error',
            message: '生成报告单失败'
        });
    }
});

// 批量生成报告单
app.post('/api/reports/generate', async (req, res) => {
    try {
        if (currentStudentsData.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: '没有学生数据'
            });
        }

        const reports = currentStudentsData.map((student, index) => ({
            index,
            name: student.姓名,
            studentId: student.学号,
            class: student.班级,
            html: generateReportHTML(student, currentStudentsData.length)
        }));

        res.json({
            status: 'success',
            message: `成功生成 ${reports.length} 份报告单`,
            data: {
                totalReports: reports.length,
                reports: reports
            }
        });

    } catch (error) {
        console.error('批量生成报告单错误:', error);
        res.status(500).json({
            status: 'error',
            message: '批量生成报告单失败'
        });
    }
});

// 获取统计信息
app.get('/api/statistics', (req, res) => {
    try {
        if (currentStudentsData.length === 0) {
            return res.json({
                status: 'success',
                data: {
                    totalStudents: 0,
                    averageScore: 0,
                    subjectStats: [],
                    gradeDistribution: {}
                }
            });
        }

        // 计算统计信息
        const totalStudents = currentStudentsData.length;
        const allScores = currentStudentsData.map(s => s.totalScore);
        const averageScore = (allScores.reduce((sum, score) => sum + score, 0) / totalStudents).toFixed(1);
        
        // 科目统计
        const subjects = currentStudentsData[0].subjects || [];
        const subjectStats = subjects.map(subject => {
            const scores = currentStudentsData.map(s => s[subject] || 0);
            const avg = (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1);
            const max = Math.max(...scores);
            const min = Math.min(...scores);
            
            return {
                subject,
                average: parseFloat(avg),
                max,
                min,
                passRate: ((scores.filter(score => score >= 60).length / scores.length) * 100).toFixed(1)
            };
        });

        // 等级分布
        const gradeDistribution = {
            excellent: currentStudentsData.filter(s => s.averageScore >= 90).length,
            good: currentStudentsData.filter(s => s.averageScore >= 80 && s.averageScore < 90).length,
            average: currentStudentsData.filter(s => s.averageScore >= 70 && s.averageScore < 80).length,
            pass: currentStudentsData.filter(s => s.averageScore >= 60 && s.averageScore < 70).length,
            fail: currentStudentsData.filter(s => s.averageScore < 60).length
        };

        res.json({
            status: 'success',
            data: {
                totalStudents,
                averageScore: parseFloat(averageScore),
                subjectStats,
                gradeDistribution
            }
        });

    } catch (error) {
        console.error('获取统计信息错误:', error);
        res.status(500).json({
            status: 'error',
            message: '获取统计信息失败'
        });
    }
});

// 清空数据
app.delete('/api/data', (req, res) => {
    try {
        currentStudentsData = [];
        res.json({
            status: 'success',
            message: '数据已清空'
        });
    } catch (error) {
        console.error('清空数据错误:', error);
        res.status(500).json({
            status: 'error',
            message: '清空数据失败'
        });
    }
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('服务器错误:', error);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                status: 'error',
                message: '文件大小超过限制（最大10MB）'
            });
        }
    }
    
    res.status(500).json({
        status: 'error',
        message: error.message || '服务器内部错误'
    });
});

// 404处理
app.get('/download/excel-template', (req, res) => {
    const filePath = path.join(__dirname, '..', '学生成绩报告单模板.xlsx');
    res.download(filePath, '学生成绩报告单模板.xlsx', (err) => {
        if (err) {
            console.error('文件下载失败:', err);
            res.status(500).json({
                status: 'error',
                message: '模板文件下载失败'
            });
        }
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: '接口不存在'
    });
});

// 工具函数

function processStudentData(rawData) {
    if (rawData.length < 2) {
        throw new Error('数据格式错误：至少需要表头和一行数据');
    }

    const headers = rawData[0].map(header => header?.toString().trim()).filter(Boolean);
    const students = [];

    // 验证必需字段
    const requiredFields = ['姓名'];
    const missingFields = requiredFields.filter(field => !headers.includes(field));
    if (missingFields.length > 0) {
        throw new Error(`缺少必需字段：${missingFields.join(', ')}`);
    }

    for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0 || !row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
            continue; // 跳过空行
        }

        const student = {};
        headers.forEach((header, index) => {
            student[header] = row[index]?.toString().trim() || '';
        });

        // 验证学生姓名
        if (!student['姓名']) {
            continue; // 跳过没有姓名的行
        }

        // 计算总分和平均分
        const subjects = getSubjectColumns(headers);
        console.log("processStudentData (backend): Excel headers:", headers); // Added log
        console.log("processStudentData (backend): Identified subjects:", subjects); // Added log
        let totalScore = 0;
        let validScores = 0;

        subjects.forEach(subject => {
            const scoreStr = student[subject]?.toString().replace(/[^\d.]/g, '');
            const score = parseFloat(scoreStr) || 0;
            student[subject] = score; // 标准化分数格式
            if (score > 0) {
                totalScore += score;
                validScores++;
            }
        });

        student.totalScore = totalScore;
        student.averageScore = validScores > 0 ? (totalScore / validScores).toFixed(1) : '0';
        student.subjects = subjects;
        student.subjectCount = validScores;

        students.push(student);
    }

    if (students.length === 0) {
        throw new Error('没有找到有效的学生数据');
    }

    // 计算排名
    students.sort((a, b) => b.totalScore - a.totalScore);
    students.forEach((student, index) => {
        student.rank = index + 1;
    });

    console.log(`成功处理 ${students.length} 名学生的数据`);
    return students;
}

function getSubjectColumns(headers) {
    const allowedSubjects = ['语文', '数学', '英语', '科学', '社会']; // 新增社会，移除美术、信息技术
    console.log("getSubjectColumns (backend): Excel headers:", headers); // Added log
    return headers.filter(header => {
        const headerTrim = header.trim();
        const isSubject = allowedSubjects.some(subject => headerTrim.startsWith(subject));
        console.log(`getSubjectColumns (backend): Header "${headerTrim}", isSubject: ${isSubject}`); // Added log
        return isSubject;
    });
}

function generateReportHTML(student, totalStudents) {
    // 获取学生的各科成绩
    const getSubjectScore = (subjectName) => {
        // 尝试多种可能的字段名
        const possibleFields = [
            `${subjectName}成绩`,
            `${subjectName}`,
            subjectName
        ];

        for (const field of possibleFields) {
            if (student[field] !== undefined && student[field] !== null && student[field] !== '') {
                const value = student[field];
                // 如果是文本，直接返回
                if (typeof value === 'string' && isNaN(parseFloat(value))) {
                    return value;
                }
                // 如果是数字或可转换为数字的文本，返回数字
                const numValue = parseFloat(value);
                return isNaN(numValue) ? value : numValue;
            }
        }
        return '';
    };

    // 获取主要科目成绩
    const chineseScore = getSubjectScore('语文');
    const mathScore = getSubjectScore('数学');
    const englishScore = getSubjectScore('英语');
    const scienceScore = getSubjectScore('科学');
    const socialScore = getSubjectScore('社会'); // 新增社会科目

    return `
        <div class="report-card">
            <!-- 报告单标题 -->
            <div class="report-header">
                <h1 class="report-main-title">${student.reportTitle || '浙江省初中'}素质发展</h1>
                <h2 class="report-sub-title">报告单</h2>
                <div class="report-year">${student.reportPeriod || '2024-2025学年第一学期'}</div>
            </div>

            <!-- 学生基本信息 -->
            <div class="student-basic-info">
                <div class="info-row">
                    <span class="info-label">学校(盖章):</span>
                    <span class="info-value underline">${student.学校 || '浙江省杭州市第一中学初中部'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">班级:</span>
                    <span class="info-value underline">${student.班级 || '初级一年级(04)班'}</span>
                    <span class="info-label">姓名:</span>
                    <span class="info-value underline">${student.姓名 || ''}</span>
                    <span class="info-label">身份证号:</span>
                    <span class="info-value underline">${student.身份证号 || ''}</span>
                </div>
            </div>

            <!-- 主要内容区域 -->
            <div class="report-main-content">
                <!-- 左侧内容 -->
                <div class="left-content">
                    <!-- 班主任寄语 -->
                    <div class="teacher-message">
                        <h3 class="section-title">班主任寄语：</h3>
                        <div class="message-content">
                            ${student.班主任评语 || ''}
                        </div>
                    </div>

                    <!-- 获奖情况 -->
                    <div class="awards-section">
                        <h3 class="section-title">获奖情况：</h3>
                        <div class="awards-content">
                            ${student.获奖情况 || '无'}
                        </div>
                    </div>

                    <!-- 寄语 -->
                    <div class="message-section">
                        <h3 class="section-title">寄语：</h3>
                        <div class="message-content">
                            ${student.寄语 || ''}
                        </div>
                    </div>

                </div>

                <!-- 右侧综合素质评价 -->
                <div class="right-content">
                    <div class="evaluation-section">
                        <h3 class="evaluation-title">综合素质评价</h3>
                        <table class="evaluation-table">
                            <thead>
                                <tr>
                                    <th>序号</th>
                                    <th>评价项目</th>
                                    <th>考试成绩</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>1</td>
                                    <td>语文</td>
                                    <td>${chineseScore || ''}</td>
                                </tr>
                                <tr>
                                    <td>2</td>
                                    <td>数学</td>
                                    <td>${mathScore || ''}</td>
                                </tr>
                                <tr>
                                    <td>3</td>
                                    <td>外语</td>
                                    <td>${englishScore || ''}</td>
                                </tr>
                                <tr>
                                    <td>4</td>
                                    <td>科学</td>
                                    <td>${scienceScore || ''}</td>
                                </tr>
                                <tr>
                                    <td>5</td>
                                    <td>社会</td>
                                    <td>${socialScore || ''}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- 家长建议及意见 -->
            <div class="parent-message">
                <h3 class="section-title">家长建议及意见：</h3>
                <div class="parent-info">
                    <span>家长签名：</span>
                    <span class="info-gap"></span>
                    <span>下学期报名：</span>
                    <span class="info-gap"></span>
                    <span>年</span>
                    <span class="info-gap"></span>
                    <span>月</span>
                    <span class="info-gap"></span>
                    <span>日</span>
                </div>
            </div>

            <!-- 底部签名区域 -->
            <div class="signature-section">
                <div class="signature-item">
                    <span>校长：${student.principalName || ''}</span>
                    <span>教务主任：${student.directorName || ''}</span>
                    <span>班主任：${student.teacherName || ''}</span>
                </div>
            </div>
        </div>
    `;
}

function getGradeLevel(score) {
    if (score >= 95) return '优秀+';
    if (score >= 90) return '优秀';
    if (score >= 85) return '良好+';
    if (score >= 80) return '良好';
    if (score >= 75) return '中等+';
    if (score >= 70) return '中等';
    if (score >= 60) return '及格';
    return '需努力';
}

function getScoreColor(score) {
    if (score >= 90) return '#10b981'; // 绿色
    if (score >= 80) return '#f59e0b'; // 黄色
    if (score >= 70) return '#3b82f6'; // 蓝色
    if (score >= 60) return '#8b5cf6'; // 紫色
    return '#ef4444'; // 红色
}

function generateComment(student, totalStudents) {
    // 如果有自定义评语，优先使用
    if (student.班主任评语 || student.奖惩情况 || student.备注 || student.评语) {
        const comment = student.班主任评语 || student.备注 || student.评语 || '';
        const punishment = student.奖惩情况 ? `\n奖惩情况：${student.奖惩情况}` : '';
        return comment + punishment;
    }

    const avgScore = parseFloat(student.averageScore);
    const rank = student.rank;
    const rankPercentage = (rank / totalStudents) * 100;

    let comment = '';
    let strengths = [];
    let improvements = [];

    // 分析各科成绩，找出优势和需要改进的科目
    student.subjects.forEach(subject => {
        const score = student[subject] || 0;
        if (score >= 85) {
            strengths.push(subject);
        } else if (score < 70) {
            improvements.push(subject);
        }
    });

    // 根据平均分生成评语
    if (avgScore >= 90) {
        comment = `${student.姓名}同学学习态度端正，成绩优异，在班级${totalStudents}名学生中排名第${rank}位，表现出色。`;
    } else if (avgScore >= 80) {
        comment = `${student.姓名}同学学习认真，成绩良好，在班级中排名第${rank}位，具有较强的学习能力。`;
    } else if (avgScore >= 70) {
        comment = `${student.姓名}同学学习基础较好，成绩中等，目前班级排名第${rank}位，还有提升空间。`;
    } else if (avgScore >= 60) {
        comment = `${student.姓名}同学学习态度较好，但成绩有待提高，在班级中排名第${rank}位，需要加强努力。`;
    } else {
        comment = `${student.姓名}同学需要端正学习态度，加强基础知识学习，目前排名第${rank}位，建议家长和老师共同关注。`;
    }

    // 添加优势科目描述
    if (strengths.length > 0) {
        comment += `在${strengths.join('、')}等科目上表现突出，值得继续保持。`;
    }

    // 添加改进建议
    if (improvements.length > 0) {
        comment += `建议在${improvements.join('、')}等科目上加强练习，巩固基础知识。`;
    }

    // 添加排名相关的鼓励或建议
    if (rankPercentage <= 20) {
        comment += '希望继续保持优秀成绩，发挥榜样作用。';
    } else if (rankPercentage <= 50) {
        comment += '继续努力，争取更好的成绩。';
    } else {
        comment += '要制定学习计划，提高学习效率，争取更大进步。';
    }

    return comment;
}

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 服务器启动成功！`);
    console.log(`📍 服务地址: http://localhost:${PORT}`);
    console.log(`📋 API文档: http://localhost:${PORT}/api/health`);
    console.log(`⏰ 启动时间: ${new Date().toLocaleString('zh-CN')}`);
});

module.exports = app;