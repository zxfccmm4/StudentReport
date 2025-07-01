class ModernReportGenerator {
    constructor() {
        this.studentsData = [];
        this.jsPDF = null;
        this.currentSection = 'home';
        this.config = {
            reportTitle: '浙江省初中',
            reportPeriod: '2024-2025学年第一学期',
            principalName: '',
            directorName: '',
            teacherName: '',
            showIdCard: false,
            showSchool: false
        };
        this.init();
    }

    init() {
        this.initLibraries();
        this.setupEventListeners();
        this.setupNavigation();
        this.animateStats();
        this.loadConfig();
        this.showToast('欢迎使用智能学生成绩报告单生成系统！', 'success');
    }

    initLibraries() {
        // 初始化jsPDF库
        if (window.jspdf && window.jspdf.jsPDF) {
            this.jsPDF = window.jspdf.jsPDF;
            console.log('jsPDF库加载成功');
        } else {
            console.error('jsPDF库未正确加载');
            this.showToast('PDF库加载失败，请刷新页面重试', 'error');
        }
    }

    setupEventListeners() {
        // 文件上传相关
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // 按钮事件
        document.getElementById('generateReportsBtn')?.addEventListener('click', this.generateAllReports.bind(this));
        document.getElementById('downloadAllBtn')?.addEventListener('click', this.downloadAllReports.bind(this));
        document.getElementById('downloadSingleBtn')?.addEventListener('click', this.downloadSingleReport.bind(this));
        document.getElementById('studentSelect')?.addEventListener('change', this.showStudentReport.bind(this));

        // 配置相关事件
        document.getElementById('saveConfigBtn')?.addEventListener('click', this.saveConfig.bind(this));
        document.getElementById('resetConfigBtn')?.addEventListener('click', this.resetConfig.bind(this));
        document.getElementById('downloadTemplateBtn')?.addEventListener('click', this.downloadExcelTemplate.bind(this));

        // 导航切换
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('href').substring(1);
                this.navigateToSection(section);
            });
        });
    }

    setupNavigation() {
        // 平滑滚动到指定区域
        window.scrollToSection = (sectionId) => {
            this.navigateToSection(sectionId);
        };

        // 更新导航状态
        this.updateNavigation();
    }

    navigateToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
            this.currentSection = sectionId;
            this.updateNavigation();
        }
    }

    updateNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${this.currentSection}`) {
                link.classList.add('active');
            }
        });
    }

    animateStats() {
        const statNumbers = document.querySelectorAll('.stat-number');
        
        const animateNumber = (element, target) => {
            let current = 0;
            const increment = target / 100;
            const timer = setInterval(() => {
                current += increment;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                element.textContent = Math.floor(current).toLocaleString() + (target === 99 ? '%' : '');
            }, 20);
        };

        // 使用Intersection Observer来触发动画
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = parseInt(entry.target.dataset.target);
                    animateNumber(entry.target, target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        statNumbers.forEach(stat => observer.observe(stat));
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('uploadArea').classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('uploadArea').classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('uploadArea').classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    async processFile(file) {
        // 验证文件类型
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        
        if (!allowedTypes.includes(file.type)) {
            this.showToast('请选择有效的Excel文件（.xlsx 或 .xls）', 'error');
            return;
        }

        // 验证文件大小（10MB限制）
        if (file.size > 10 * 1024 * 1024) {
            this.showToast('文件大小不能超过10MB', 'error');
            return;
        }

        this.showLoading(true, '正在解析Excel文件...');
        this.updateProgress(20);

        try {
            const data = await this.readExcelFile(file);
            this.updateProgress(50);
            
            this.studentsData = this.processStudentData(data);
            this.updateProgress(80);
            
            this.displayDataPreview();
            this.updateProgress(100);
            
            setTimeout(() => {
                this.showLoading(false);
                this.showToast(`成功导入 ${this.studentsData.length} 名学生的数据`, 'success');
                this.navigateToSection('preview');
            }, 500);
            
        } catch (error) {
            console.error('文件处理错误:', error);
            this.showLoading(false);
            this.showToast(`文件处理失败：${error.message}`, 'error');
        }
    }

    readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    resolve(jsonData);
                } catch (error) {
                    reject(new Error('Excel文件解析失败，请检查文件格式'));
                }
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsArrayBuffer(file);
        });
    }

    processStudentData(rawData) {
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
            const subjects = this.getSubjectColumns(headers);
            console.log(`学生 ${student.姓名} 的科目列表:`, subjects);
            
            let totalScore = 0;
            let validScores = 0;

            subjects.forEach(subject => {
                const originalValue = student[subject];
                console.log(`处理科目 ${subject}: 原始值="${originalValue}"`);
                
                // 保持原始值不变，用于显示
                // 但对于计算总分，只处理数字值
                if (originalValue !== undefined && originalValue !== null && originalValue !== '') {
                    const scoreStr = originalValue.toString().replace(/[^\d.]/g, '');
                    const score = parseFloat(scoreStr);
                    
                    if (!isNaN(score) && score > 0) {
                        totalScore += score;
                        validScores++;
                        console.log(`科目 ${subject}: 数字分数=${score}，累加到总分`);
                    } else {
                        console.log(`科目 ${subject}: 非数字值="${originalValue}"，不参与总分计算`);
                    }
                }
            });

            student.totalScore = totalScore;
            student.averageScore = validScores > 0 ? (totalScore / validScores).toFixed(1) : '0';
            student.subjects = subjects;
            student.subjectCount = validScores;
            
            console.log(`学生 ${student.姓名} 处理完成: 科目数=${subjects.length}, 总分=${totalScore}, 平均分=${student.averageScore}`);

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

    getSubjectColumns(headers) {
        console.log('Excel表头:', headers);

        const excludeColumns = [
            '班级', '姓名', '班主任评语', '奖惩情况', '获奖情况', '学号', '性别', '身份证号',
            '年龄', '出生日期', '备注', '评语', '家长姓名', '联系电话', '地址', '学校',
            '身高', '体重', '视力', '健康状况', '体重kg', '身高cm', '学生上课表现',
            '请假', '早退', '学校课程教育目标', '学生期末总评', '正式上课'
        ];

        // 识别成绩相关的列（包含"成绩"字样的列或者是已知的科目名称）
        const knownSubjects = [
            '语文', '数学', '英语', '科学',
            '体育', '音乐', '美术', '信息技术', '劳动技术', '综合实践'
        ];

        const subjects = headers.filter(header => {
            const headerTrim = header.trim();

            // 排除非科目列
            if (excludeColumns.includes(headerTrim)) {
                return false;
            }

            // 包含"成绩"字样的列
            const hasScoreKeyword = headerTrim.includes('成绩') || headerTrim.includes('分数') || headerTrim.includes('得分');

            // 是已知科目名称的列
            const isKnownSubject = knownSubjects.some(subject =>
                headerTrim.includes(subject) || headerTrim === subject
            );

            const isSubject = (hasScoreKeyword || isKnownSubject) && headerTrim !== '';

            console.log(`检查列 "${headerTrim}": ${isSubject ? '是科目' : '不是科目'}`);
            return isSubject;
        });

        console.log('识别到的科目列:', subjects);
        return subjects;
    }

    displayDataPreview() {
        if (this.studentsData.length === 0) return;

        // 显示预览区域
        document.getElementById('preview').style.display = 'block';
        document.getElementById('studentCount').textContent = this.studentsData.length;

        // 生成表格
        const table = document.getElementById('dataTable');
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');

        // 清空现有内容
        thead.innerHTML = '';
        tbody.innerHTML = '';

        // 准备显示的列
        const displayColumns = ['姓名', '班级', ...this.studentsData[0].subjects.slice(0, 5), '总分', '平均分', '排名'];
        
        // 生成表头
        const headerRow = document.createElement('tr');
        displayColumns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        // 生成表格数据（显示前15行）
        const displayData = this.studentsData.slice(0, 15);
        displayData.forEach((student, index) => {
            const row = document.createElement('tr');
            displayColumns.forEach(column => {
                const td = document.createElement('td');
                
                if (column === '总分') {
                    td.textContent = student.totalScore;
                } else if (column === '平均分') {
                    td.textContent = student.averageScore;
                } else if (column === '排名') {
                    td.textContent = student.rank;
                } else {
                    td.textContent = student[column] || '';
                }
                
                row.appendChild(td);
            });
            tbody.appendChild(row);
            
            // 添加动画效果
            setTimeout(() => {
                row.style.opacity = '0';
                row.style.transform = 'translateY(20px)';
                row.style.transition = 'all 0.3s ease';
                setTimeout(() => {
                    row.style.opacity = '1';
                    row.style.transform = 'translateY(0)';
                }, index * 50);
            }, 10);
        });

        // 如果数据超过15行，显示提示
        if (this.studentsData.length > 15) {
            const row = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = displayColumns.length;
            td.textContent = `... 还有 ${this.studentsData.length - 15} 行数据`;
            td.style.textAlign = 'center';
            td.style.fontStyle = 'italic';
            td.style.color = '#71717a';
            td.style.padding = '20px';
            row.appendChild(td);
            tbody.appendChild(row);
        }
    }

    generateAllReports() {
        if (this.studentsData.length === 0) {
            this.showToast('请先导入学生数据', 'warning');
            return;
        }

        this.showLoading(true, '正在生成报告单...');
        this.updateProgress(30);

        setTimeout(() => {
            // 填充学生选择下拉框
            const studentSelect = document.getElementById('studentSelect');
            studentSelect.innerHTML = '<option value="">选择学生查看报告单</option>';
            
            this.studentsData.forEach((student, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${student.姓名} (${student.班级 || ''})`;
                studentSelect.appendChild(option);
            });

            this.updateProgress(100);
            
            setTimeout(() => {
                this.showLoading(false);
                // 显示报告单区域
                document.getElementById('reports').style.display = 'block';
                this.showToast('所有报告单生成完成！', 'success');
                this.navigateToSection('reports');
            }, 500);
        }, 1000);
    }

    showStudentReport() {
        const studentSelect = document.getElementById('studentSelect');
        const selectedIndex = studentSelect.value;
        const reportPreview = document.getElementById('reportPreview');
        
        if (selectedIndex === '') {
            reportPreview.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <h3>选择学生查看报告单</h3>
                    <p>从上方下拉菜单中选择一名学生</p>
                </div>
            `;
            return;
        }

        const student = this.studentsData[selectedIndex];
        const reportHtml = this.generateReportHtml(student);
        reportPreview.innerHTML = reportHtml;

        // 添加淡入动画
        reportPreview.style.opacity = '0';
        setTimeout(() => {
            reportPreview.style.transition = 'opacity 0.5s ease';
            reportPreview.style.opacity = '1';
        }, 50);
    }

    generateReportHtml(student) {
        // 调试信息
        console.log('生成报告单的学生数据:', student);
        console.log('学生科目列表:', student.subjects);

        if (!student.subjects || student.subjects.length === 0) {
            console.error('警告：学生没有科目数据！');
            return '<div class="report-card"><h3>错误：没有找到学生的科目成绩数据</h3></div>';
        }

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

        // 获取主要科目成绩和评价结果
        const chineseScore = getSubjectScore('语文');
        const chineseEvaluation = getSubjectScore('语文评价结果');
        const mathScore = getSubjectScore('数学');
        const mathEvaluation = getSubjectScore('数学评价结果');
        const englishScore = getSubjectScore('英语');
        const englishEvaluation = getSubjectScore('英语评价结果');
        const scienceScore = getSubjectScore('科学');
        const scienceEvaluation = getSubjectScore('科学评价结果');
        const artScore = getSubjectScore('美术');
        const itScore = getSubjectScore('信息技术');

        return `
            <div class="report-card" id="currentReportCard">
                <!-- 报告单标题 -->
                <div class="report-header">
                    <h1 class="report-main-title">${this.config.reportTitle}素质发展</h1>
                    <h2 class="report-sub-title">报告单</h2>
                    <div class="report-year">${this.config.reportPeriod}</div>
                </div>

                <!-- 学生基本信息 -->
                <div class="student-basic-info">
                    ${this.config.showSchool ? `
                    <div class="info-row">
                        <span class="info-label">学校(盖章):</span>
                        <span class="info-value underline">${student.学校 || '浙江省杭州市第一中学初中部'}</span>
                    </div>
                    ` : ''}
                    <div class="info-row">
                        <span class="info-label">班级:</span>
                        <span class="info-value underline">${student.班级 || '初级一年级(04)班'}</span>
                        <span class="info-label">姓名:</span>
                        <span class="info-value underline">${student.姓名 || ''}</span>
                        ${this.config.showIdCard ? `
                        <span class="info-label">身份证号:</span>
                        <span class="info-value underline">${student.身份证号 || ''}</span>
                        ` : ''}
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
                                ${this.generateTeacherMessage(student)}
                            </div>
                        </div>

                        <!-- 获奖情况 -->
                        <div class="awards-section">
                            <h3 class="section-title">获奖情况：</h3>
                            <div class="awards-content">
                                ${this.getAwardsContent(student)}
                            </div>
                        </div>

                        <!-- 寄语 -->
                        <div class="message-section">
                            <h3 class="section-title">寄语：</h3>
                            <div class="message-content">
                                ${this.getCustomMessage(student)}
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
                                        <th>评价结果</th>
                                        <th>考试成绩</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>1</td>
                                        <td>语文</td>
                                        <td>${chineseEvaluation || ''}</td>
                                        <td>${chineseScore || ''}</td>
                                    </tr>
                                    <tr>
                                        <td>2</td>
                                        <td>数学</td>
                                        <td>${mathEvaluation || ''}</td>
                                        <td>${mathScore || ''}</td>
                                    </tr>
                                    <tr>
                                        <td>3</td>
                                        <td>外语</td>
                                        <td>${englishEvaluation || ''}</td>
                                        <td>${englishScore || ''}</td>
                                    </tr>
                                    <tr>
                                        <td>4</td>
                                        <td>科学</td>
                                        <td>${scienceEvaluation || ''}</td>
                                        <td>${scienceScore || ''}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>音乐</td>
                                        <td></td>
                                        <td>良好</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>美术</td>
                                        <td></td>
                                        <td>${artScore || '良好'}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>信息技术</td>
                                        <td></td>
                                        <td>${itScore || '良好'}</td>
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
                        <span>校长：${this.config.principalName}</span>
                        <span>教务主任：${this.config.directorName}</span>
                        <span>班主任：${this.config.teacherName}</span>
                    </div>
                </div>
            </div>
        `;
    }

    getGradeLevel(score) {
        if (score >= 95) return '优秀+';
        if (score >= 90) return '优秀';
        if (score >= 85) return '良好+';
        if (score >= 80) return '良好';
        if (score >= 75) return '中等+';
        if (score >= 70) return '中等';
        if (score >= 60) return '及格';
        return '需努力';
    }

    getScoreColor(score) {
        if (score >= 90) return '#10b981'; // 绿色
        if (score >= 80) return '#f59e0b'; // 黄色
        if (score >= 70) return '#3b82f6'; // 蓝色
        if (score >= 60) return '#8b5cf6'; // 紫色
        return '#ef4444'; // 红色
    }

    getEvaluationLevel(score) {
        if (score >= 90) return '优秀';
        if (score >= 80) return '良好';
        if (score >= 70) return '合格';
        if (score >= 60) return '及格';
        return '待提高';
    }

    formatEvaluationResult(value) {
        // 如果值为空或未定义，返回空字符串
        if (value === null || value === undefined || value === '') {
            return '';
        }
        
        // 如果值是字符串且不是纯数字，直接返回
        if (typeof value === 'string' && isNaN(parseFloat(value))) {
            return value;
        }
        
        // 如果是数字或数字字符串，尝试转换为数字
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            // 如果是整数，直接返回整数
            if (Number.isInteger(numValue)) {
                return numValue.toString();
            }
            // 如果是小数，保留一位小数
            return numValue.toFixed(1);
        }
        
        // 其他情况直接返回原值
        return value.toString();
    }

    calculateAverageScore(value) {
        // 如果值为空或未定义，返回空字符串
        if (value === null || value === undefined || value === '') {
            return '';
        }
        
        // 如果值是字符串且不是纯数字，返回空字符串（不能计算平时成绩）
        if (typeof value === 'string' && isNaN(parseFloat(value))) {
            return '';
        }
        
        // 如果是数字，计算平时成绩（这里假设平时成绩是考试成绩的1.1倍）
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue > 0) {
            return Math.round(numValue * 1.1).toString();
        }
        
        return '';
    }

    generateTeacherMessage(student) {
        // 如果有自定义班主任评语，使用自定义内容
        if (student.班主任评语) {
            return student.班主任评语;
        }

        // 如果没有班主任评语，返回空字符串，不自动填充
        return '';
    }

    generateComment(student) {
        // 如果有自定义评语，优先使用
        if (student.班主任评语 || student.奖惩情况 || student.备注 || student.评语) {
            const comment = student.班主任评语 || student.备注 || student.评语 || '';
            const punishment = student.奖惩情况 ? `\n奖惩情况：${student.奖惩情况}` : '';
            return comment + punishment;
        }

        const avgScore = parseFloat(student.averageScore);
        const rank = student.rank;
        const totalStudents = this.studentsData.length;
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

    async downloadSingleReport() {
        const reportCard = document.getElementById('currentReportCard');
        if (!reportCard) {
            this.showToast('请先选择一个学生查看报告单', 'warning');
            return;
        }

        const studentSelect = document.getElementById('studentSelect');
        const selectedIndex = studentSelect.value;
        const student = this.studentsData[selectedIndex];

        try {
            this.showLoading(true, '正在生成PDF文件...');
            this.updateProgress(30);

            if (!this.jsPDF) {
                throw new Error('PDF生成库未正确加载');
            }

            console.log('开始PDF生成，学生数据:', student);
            console.log('报告单元素:', reportCard);
            console.log('报告单HTML长度:', reportCard.innerHTML.length);

            // 确保元素可见并完全渲染
            reportCard.style.visibility = 'visible';
            reportCard.style.display = 'block';
            reportCard.style.position = 'relative';
            reportCard.style.zIndex = '1000';
            reportCard.style.overflow = 'visible';
            
            // 强制设置关键区域的白色背景
            const teacherMessage = reportCard.querySelector('.teacher-message');
            const awardsSection = reportCard.querySelector('.awards-section');
            const parentMessage = reportCard.querySelector('.parent-message');
            
            if (teacherMessage) {
                teacherMessage.style.backgroundColor = '#ffffff !important';
                teacherMessage.style.background = '#ffffff !important';
                teacherMessage.style.setProperty('background-color', '#ffffff', 'important');
                teacherMessage.style.setProperty('background', '#ffffff', 'important');
                // 设置子元素背景
                const teacherChildren = teacherMessage.querySelectorAll('*');
                teacherChildren.forEach(child => {
                    child.style.backgroundColor = '#ffffff !important';
                    child.style.background = '#ffffff !important';
                    child.style.setProperty('background-color', '#ffffff', 'important');
                    child.style.setProperty('background', '#ffffff', 'important');
                });
            }
            if (awardsSection) {
                awardsSection.style.backgroundColor = '#ffffff !important';
                awardsSection.style.background = '#ffffff !important';
                awardsSection.style.setProperty('background-color', '#ffffff', 'important');
                awardsSection.style.setProperty('background', '#ffffff', 'important');
                // 设置子元素背景
                const awardsChildren = awardsSection.querySelectorAll('*');
                awardsChildren.forEach(child => {
                    child.style.backgroundColor = '#ffffff !important';
                    child.style.background = '#ffffff !important';
                    child.style.setProperty('background-color', '#ffffff', 'important');
                    child.style.setProperty('background', '#ffffff', 'important');
                });
            }
            if (parentMessage) {
                parentMessage.style.backgroundColor = '#ffffff !important';
                parentMessage.style.background = '#ffffff !important';
                parentMessage.style.setProperty('background-color', '#ffffff', 'important');
                parentMessage.style.setProperty('background', '#ffffff', 'important');
                // 设置子元素背景
                const parentChildren = parentMessage.querySelectorAll('*');
                parentChildren.forEach(child => {
                    child.style.backgroundColor = '#ffffff !important';
                    child.style.background = '#ffffff !important';
                    child.style.setProperty('background-color', '#ffffff', 'important');
                    child.style.setProperty('background', '#ffffff', 'important');
                });
            }
            
            // 等待DOM完全渲染
            await new Promise(resolve => setTimeout(resolve, 500));
            this.updateProgress(50);

            console.log('开始html2canvas渲染...');
            
            const canvas = await html2canvas(reportCard, {
                scale: 1.5,
                backgroundColor: '#ffffff',
                logging: true,
                useCORS: true,
                allowTaint: true,
                foreignObjectRendering: false,
                removeContainer: false,
                width: reportCard.scrollWidth + 10,
                height: reportCard.scrollHeight + 10,
                x: 0,
                y: 0,
                scrollX: 0,
                scrollY: 0,
                ignoreElements: function(element) {
                    // 确保白色背景元素不被忽略
                    return false;
                }
            });

            console.log('Canvas生成完成:', {
                width: canvas.width,
                height: canvas.height,
                dataLength: canvas.toDataURL('image/png', 0.8).length
            });

            this.updateProgress(80);

            const imgData = canvas.toDataURL('image/png', 0.8);
            console.log('图片数据长度:', imgData.length);
            
            if (imgData.length < 1000) {
                throw new Error('Canvas渲染失败，生成的图片数据为空');
            }

            const pdf = new this.jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            console.log('PDF页面尺寸:', { pageWidth, pageHeight });

            const imgWidth = pageWidth - 20; // 左右边距各10mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            console.log('图片在PDF中的尺寸:', { imgWidth, imgHeight });

            // 简化分页逻辑
            const maxHeight = pageHeight - 20; // 上下边距各10mm
            
            if (imgHeight > maxHeight) {
                console.log('需要分页，总页数:', Math.ceil(imgHeight / maxHeight));
                
                let currentY = 0;
                let pageCount = 0;
                
                while (currentY < imgHeight) {
                    if (pageCount > 0) {
                        pdf.addPage();
                    }
                    
                    const remainingHeight = imgHeight - currentY;
                    const currentPageHeight = Math.min(maxHeight, remainingHeight);
                    
                    // 计算在原canvas中的位置
                    const sourceY = (currentY * canvas.height) / imgHeight;
                    const sourceHeight = (currentPageHeight * canvas.height) / imgHeight;
                    
                    console.log(`第${pageCount + 1}页: sourceY=${sourceY}, sourceHeight=${sourceHeight}`);
                    
                    // 创建当前页的canvas
                    const pageCanvas = document.createElement('canvas');
                    const pageCtx = pageCanvas.getContext('2d');
                    pageCanvas.width = canvas.width;
                    pageCanvas.height = sourceHeight;
                    
                    // 绘制当前页内容
                    pageCtx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
                    
                    const pageImgData = pageCanvas.toDataURL('image/png', 0.8);
                    pdf.addImage(pageImgData, 'PNG', 10, 10, imgWidth, currentPageHeight);
                    
                    currentY += maxHeight;
                    pageCount++;
                }
            } else {
                console.log('单页PDF');
                pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
            }

            this.updateProgress(100);

            const fileName = `${student.姓名}_成绩报告单_${new Date().toLocaleDateString('zh-CN')}.pdf`;
            console.log('保存PDF文件:', fileName);
            
            pdf.save(fileName);

            setTimeout(() => {
                this.showLoading(false);
                this.showToast('PDF下载成功！', 'success');
            }, 500);

        } catch (error) {
            console.error('PDF生成失败详细信息:', error);
            console.error('错误堆栈:', error.stack);
            this.showLoading(false);
            this.showToast(`PDF生成失败：${error.message}`, 'error');
        }
    }

    async downloadAllReports() {
        if (this.studentsData.length === 0) {
            this.showToast('没有可下载的报告单', 'warning');
            return;
        }

        this.showLoading(true, '正在批量生成PDF文件...');
        let processedCount = 0;

        try {
            if (!this.jsPDF) {
                throw new Error('PDF生成库未正确加载');
            }

            const pdf = new this.jsPDF('p', 'mm', 'a4');
            let isFirstPage = true;

            // 分批处理，避免内存溢出
            const batchSize = 3;
            for (let batchStart = 0; batchStart < this.studentsData.length; batchStart += batchSize) {
                const batchEnd = Math.min(batchStart + batchSize, this.studentsData.length);
                const batch = this.studentsData.slice(batchStart, batchEnd);

                for (const student of batch) {
                    try {
                        this.updateProgress((processedCount / this.studentsData.length) * 100);
                        
                        console.log(`处理学生 ${processedCount + 1}/${this.studentsData.length}: ${student.姓名}`);
                        
                        // 创建临时容器，但让其可见以确保正确渲染
                        const tempContainer = document.createElement('div');
                        tempContainer.style.position = 'fixed';
                        tempContainer.style.left = '-9999px';
                        tempContainer.style.top = '0px';
                        tempContainer.style.width = '800px';
                        tempContainer.style.height = 'auto';
                        tempContainer.style.backgroundColor = '#ffffff';
                        tempContainer.style.zIndex = '10000';
                        tempContainer.style.visibility = 'visible';
                        tempContainer.style.overflow = 'visible';
                        tempContainer.innerHTML = this.generateReportHtml(student);
                        document.body.appendChild(tempContainer);

                        // 等待DOM完全渲染
                        await new Promise(resolve => setTimeout(resolve, 300));

                        const reportCard = tempContainer.querySelector('.report-card');
                        if (!reportCard) {
                            throw new Error(`无法生成 ${student.姓名} 的报告单DOM元素`);
                        }

                        // 强制设置关键区域的白色背景
                        const teacherMessage = reportCard.querySelector('.teacher-message');
                        const awardsSection = reportCard.querySelector('.awards-section');
                        const parentMessage = reportCard.querySelector('.parent-message');
                        
                        if (teacherMessage) {
                            teacherMessage.style.backgroundColor = '#ffffff !important';
                            teacherMessage.style.background = '#ffffff !important';
                            teacherMessage.style.setProperty('background-color', '#ffffff', 'important');
                            teacherMessage.style.setProperty('background', '#ffffff', 'important');
                            // 设置子元素背景
                            const teacherChildren = teacherMessage.querySelectorAll('*');
                            teacherChildren.forEach(child => {
                                child.style.backgroundColor = '#ffffff !important';
                                child.style.background = '#ffffff !important';
                                child.style.setProperty('background-color', '#ffffff', 'important');
                                child.style.setProperty('background', '#ffffff', 'important');
                            });
                        }
                        if (awardsSection) {
                            awardsSection.style.backgroundColor = '#ffffff !important';
                            awardsSection.style.background = '#ffffff !important';
                            awardsSection.style.setProperty('background-color', '#ffffff', 'important');
                            awardsSection.style.setProperty('background', '#ffffff', 'important');
                            // 设置子元素背景
                            const awardsChildren = awardsSection.querySelectorAll('*');
                            awardsChildren.forEach(child => {
                                child.style.backgroundColor = '#ffffff !important';
                                child.style.background = '#ffffff !important';
                                child.style.setProperty('background-color', '#ffffff', 'important');
                                child.style.setProperty('background', '#ffffff', 'important');
                            });
                        }
                        if (parentMessage) {
                            parentMessage.style.backgroundColor = '#ffffff !important';
                            parentMessage.style.background = '#ffffff !important';
                            parentMessage.style.setProperty('background-color', '#ffffff', 'important');
                            parentMessage.style.setProperty('background', '#ffffff', 'important');
                            // 设置子元素背景
                            const parentChildren = parentMessage.querySelectorAll('*');
                            parentChildren.forEach(child => {
                                child.style.backgroundColor = '#ffffff !important';
                                child.style.background = '#ffffff !important';
                                child.style.setProperty('background-color', '#ffffff', 'important');
                                child.style.setProperty('background', '#ffffff', 'important');
                            });
                        }

                        console.log(`开始渲染 ${student.姓名} 的Canvas...`);
                        
                        const canvas = await html2canvas(reportCard, {
                            scale: 1.2,
                            backgroundColor: '#ffffff',
                            logging: false,
                            useCORS: true,
                            allowTaint: true,
                            foreignObjectRendering: false,
                            width: reportCard.scrollWidth + 10,
                            height: reportCard.scrollHeight + 10,
                            x: 0,
                            y: 0,
                            scrollX: 0,
                            scrollY: 0,
                            ignoreElements: function(element) {
                                // 确保白色背景元素不被忽略
                                return false;
                            }
                        });

                        console.log(`${student.姓名} Canvas完成:`, {
                            width: canvas.width,
                            height: canvas.height
                        });

                        const imgData = canvas.toDataURL('image/png', 0.7);
                        
                        if (imgData.length < 1000) {
                            console.error(`${student.姓名} 的Canvas渲染失败`);
                            continue; // 跳过这个学生，继续处理下一个
                        }

                        const pageWidth = pdf.internal.pageSize.getWidth();
                        const pageHeight = pdf.internal.pageSize.getHeight();
                        const imgWidth = pageWidth - 20;
                        const imgHeight = (canvas.height * imgWidth) / canvas.width;

                        // 添加页面
                        if (!isFirstPage) pdf.addPage();
                        
                        // 简化分页处理
                        const maxHeight = pageHeight - 20;
                        if (imgHeight > maxHeight) {
                            let currentY = 0;
                            let pageCount = 0;
                            
                            while (currentY < imgHeight) {
                                if (pageCount > 0) pdf.addPage();
                                
                                const remainingHeight = imgHeight - currentY;
                                const currentPageHeight = Math.min(maxHeight, remainingHeight);
                                
                                const sourceY = (currentY * canvas.height) / imgHeight;
                                const sourceHeight = (currentPageHeight * canvas.height) / imgHeight;
                                
                                const pageCanvas = document.createElement('canvas');
                                const pageCtx = pageCanvas.getContext('2d');
                                pageCanvas.width = canvas.width;
                                pageCanvas.height = sourceHeight;
                                
                                pageCtx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
                                const pageImgData = pageCanvas.toDataURL('image/png', 0.7);
                                
                                pdf.addImage(pageImgData, 'PNG', 10, 10, imgWidth, currentPageHeight);
                                
                                currentY += maxHeight;
                                pageCount++;
                            }
                            isFirstPage = false;
                        } else {
                            pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
                            isFirstPage = false;
                        }

                        processedCount++;
                        document.body.removeChild(tempContainer);
                        
                        console.log(`${student.姓名} 处理完成 (${processedCount}/${this.studentsData.length})`);

                    } catch (error) {
                        console.error(`处理学生 ${student.姓名} 时出错:`, error);
                        this.showToast(`${student.姓名} 的报告单生成失败`, 'warning');
                    }
                }

                // 批次间休息
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            if (processedCount === 0) {
                throw new Error('没有成功处理任何学生数据');
            }

            this.updateProgress(100);
            
            const fileName = `所有学生成绩报告单_${new Date().toLocaleDateString('zh-CN')}.pdf`;
            pdf.save(fileName);

            setTimeout(() => {
                this.showLoading(false);
                this.showToast(`批量下载完成！共处理 ${processedCount} 个学生的报告单`, 'success');
            }, 500);

        } catch (error) {
            console.error('批量PDF生成失败:', error);
            this.showLoading(false);
            this.showToast(`批量PDF生成失败：${error.message}`, 'error');
        }
    }

    showLoading(show = true, message = '正在处理中...') {
        const overlay = document.getElementById('loadingOverlay');
        const text = document.getElementById('loadingText');
        
        if (text) text.textContent = message;
        overlay.style.display = show ? 'flex' : 'none';
        
        if (!show) {
            this.updateProgress(0);
        }
    }

    updateProgress(percentage) {
        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
        }
    }

    showToast(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <div class="toast-content">
                <i class="${iconMap[type]} toast-icon"></i>
                <span class="toast-message">${message}</span>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        container.appendChild(toast);

        // 自动移除Toast
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, duration);
    }

    // 获取获奖情况内容
    getAwardsContent(student) {
        const awards = student.获奖情况 || student.奖惩情况 || '';
        if (awards) {
            // 如果有多个奖项，按分号或逗号分割
            const awardList = awards.split(/[;,，；]/).filter(award => award.trim());
            return awardList.map(award => `<div class="award-name">${award.trim()}</div>`).join('');
        }
        return '<div class="award-name">无</div>';
    }

    // 获取自定义寄语内容
    getCustomMessage(student) {
        const message = student.寄语 || '';
        return message || '';
    }

    // 加载配置
    loadConfig() {
        const savedConfig = localStorage.getItem('reportConfig');
        if (savedConfig) {
            this.config = { ...this.config, ...JSON.parse(savedConfig) };
        }
        this.updateConfigUI();
    }

    // 更新配置界面
    updateConfigUI() {
        document.getElementById('reportTitle').value = this.config.reportTitle;
        document.getElementById('reportPeriod').value = this.config.reportPeriod;
        document.getElementById('principalName').value = this.config.principalName;
        document.getElementById('directorName').value = this.config.directorName;
        document.getElementById('teacherName').value = this.config.teacherName;
        document.getElementById('showIdCard').checked = this.config.showIdCard;
        document.getElementById('showSchool').checked = this.config.showSchool;
    }

    // 保存配置
    saveConfig() {
        this.config.reportTitle = document.getElementById('reportTitle').value;
        this.config.reportPeriod = document.getElementById('reportPeriod').value;
        this.config.principalName = document.getElementById('principalName').value;
        this.config.directorName = document.getElementById('directorName').value;
        this.config.teacherName = document.getElementById('teacherName').value;
        this.config.showIdCard = document.getElementById('showIdCard').checked;
        this.config.showSchool = document.getElementById('showSchool').checked;

        localStorage.setItem('reportConfig', JSON.stringify(this.config));
        this.showToast('配置保存成功！', 'success');
    }

    // 重置配置
    resetConfig() {
        this.config = {
            reportTitle: '浙江省初中',
            reportPeriod: '2024-2025学年第一学期',
            principalName: '',
            directorName: '',
            teacherName: '',
            showIdCard: false,
            showSchool: false
        };
        localStorage.removeItem('reportConfig');
        this.updateConfigUI();
        this.showToast('配置已重置为默认值！', 'info');
    }

    // 下载Excel模板
    downloadExcelTemplate() {
        // 创建模板数据
        const templateData = [
            ['姓名', '班级', '语文', '语文评价结果', '数学', '数学评价结果', '英语', '英语评价结果', '科学', '科学评价结果', '美术', '信息技术', '获奖情况', '寄语', '班主任评语'],
            ['张三', '初一(1)班', '92', '良好', '88', '良好', '90', '良好', '85', '合格', '良好', '优秀', '三好学生', '该生学习认真，积极向上，希望继续保持！', '张三同学在本学期表现优秀，学习态度端正，成绩稳步提升。'],
            ['李四', '初一(1)班', '85', '', '92', '良好', '87', '', '89', '良好', '合格', '良好', '优秀班干部', '作为班干部，工作负责，是老师的好帮手。', '李四同学工作能力强，乐于助人，深受同学们喜爱。'],
            ['王五', '初一(2)班', '90', '良好', '95', '优秀', '93', '', '91', '', '优秀', '良好', '数学竞赛二等奖', '数学天赋突出，希望在其他科目上也能均衡发展。', '王五同学数学成绩突出，思维敏捷，建议加强文科学习。']

        ];

        // 创建工作簿
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(templateData);

        // 设置列宽
        ws['!cols'] = [
            { wch: 8 }, { wch: 12 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 },
            { wch: 20 }, { wch: 8 }, { wch: 8 }, { wch: 15 }, { wch: 25 }, { wch: 12 },
            { wch: 8 }, { wch: 8 }, { wch: 20 }, { wch: 12 }, { wch: 10 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, '学生成绩模板');

        // 下载文件
        XLSX.writeFile(wb, '学生成绩报告单模板.xlsx');
        this.showToast('Excel模板下载成功！', 'success');
    }
}

// 初始化应用
window.addEventListener('DOMContentLoaded', () => {
    new ModernReportGenerator();
});
