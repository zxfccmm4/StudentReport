#!/bin/bash

# 智能学生成绩报告单生成系统启动脚本
# Author: Student Report Generator Team
# Version: 1.0.0

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# 图标定义
ROCKET="🚀"
CHECK="✅"
ERROR="❌"
WARNING="⚠️"
INFO="ℹ️"
GEAR="⚙️"

# 打印彩色信息
print_info() {
    echo -e "${BLUE}${INFO} $1${NC}"
}

print_success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

print_error() {
    echo -e "${RED}${ERROR} $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}${WARNING} $1${NC}"
}

print_header() {
    echo -e "${PURPLE}${ROCKET} $1${NC}"
}

# 检查Node.js版本
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安装，请先安装 Node.js 16+ 版本"
        echo "下载地址: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
    
    if [ $MAJOR_VERSION -lt 16 ]; then
        print_error "Node.js 版本过低 (当前: v$NODE_VERSION)，需要 v16.0.0 或更高版本"
        exit 1
    fi
    
    print_success "Node.js 版本检查通过 (v$NODE_VERSION)"
}

# 检查npm版本
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm 未安装"
        exit 1
    fi
    
    NPM_VERSION=$(npm -v)
    print_success "npm 版本检查通过 (v$NPM_VERSION)"
}

# 检查端口是否被占用
check_port() {
    local port=${1:-3000}
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "端口 $port 已被占用，正在尝试释放..."
        local pid=$(lsof -Ti :$port)
        if [ ! -z "$pid" ]; then
            kill -9 $pid 2>/dev/null || true
            sleep 2
            print_success "端口 $port 已释放"
        fi
    fi
}

# 安装依赖
install_dependencies() {
    print_info "正在安装后端依赖..."
    
    if [ ! -d "backend/node_modules" ]; then
        cd backend
        npm install
        cd ..
        print_success "后端依赖安装完成"
    else
        print_success "后端依赖已存在，跳过安装"
    fi
}

# 启动开发服务器
start_dev_server() {
    print_header "启动开发服务器"
    
    cd backend
    
    # 创建启动日志
    LOG_FILE="../logs/server.log"
    mkdir -p ../logs
    
    print_info "正在启动 Express 服务器..."
    print_info "日志文件: $LOG_FILE"
    
    # 使用 nohup 在后台启动服务器
    nohup npm run dev > $LOG_FILE 2>&1 &
    SERVER_PID=$!
    
    # 等待服务器启动
    sleep 3
    
    # 检查服务器是否成功启动
    if ps -p $SERVER_PID > /dev/null; then
        print_success "服务器启动成功！"
        print_success "进程ID: $SERVER_PID"
        echo $SERVER_PID > ../logs/server.pid
    else
        print_error "服务器启动失败，请检查日志文件"
        cat $LOG_FILE
        exit 1
    fi
    
    cd ..
}

# 启动生产服务器
start_prod_server() {
    print_header "启动生产服务器"
    
    cd backend
    
    # 创建启动日志
    LOG_FILE="../logs/server.log"
    mkdir -p ../logs
    
    print_info "正在启动生产服务器..."
    print_info "日志文件: $LOG_FILE"
    
    # 设置生产环境变量
    export NODE_ENV=production
    export PORT=7788
    
    # 使用 nohup 在后台启动服务器
    nohup npm start > $LOG_FILE 2>&1 &
    SERVER_PID=$!
    
    # 等待服务器启动
    sleep 3
    
    # 检查服务器是否成功启动
    if ps -p $SERVER_PID > /dev/null; then
        print_success "生产服务器启动成功！"
        print_success "进程ID: $SERVER_PID"
        echo $SERVER_PID > ../logs/server.pid
    else
        print_error "服务器启动失败，请检查日志文件"
        cat $LOG_FILE
        exit 1
    fi
    
    cd ..
}

# 停止服务器
stop_server() {
    print_info "正在停止服务器..."
    
    PID_FILE="logs/server.pid"
    if [ -f $PID_FILE ]; then
        PID=$(cat $PID_FILE)
        if ps -p $PID > /dev/null; then
            kill $PID
            sleep 2
            if ps -p $PID > /dev/null; then
                kill -9 $PID
            fi
            print_success "服务器已停止"
        else
            print_warning "服务器进程不存在"
        fi
        rm -f $PID_FILE
    else
        print_warning "未找到服务器进程ID文件"
    fi
    
    # 强制关闭端口7788的进程
    if lsof -Pi :7788 -sTCP:LISTEN -t >/dev/null 2>&1; then
        local pid=$(lsof -Ti :7788)
        if [ ! -z "$pid" ]; then
            kill -9 $pid 2>/dev/null || true
            print_success "端口 3000 已释放"
        fi
    fi
}

# 重启服务器
restart_server() {
    print_header "重启服务器"
    stop_server
    sleep 2
    start_dev_server
}

# 查看服务器状态
check_status() {
    print_header "服务器状态检查"
    
    PID_FILE="logs/server.pid"
    if [ -f $PID_FILE ]; then
        PID=$(cat $PID_FILE)
        if ps -p $PID > /dev/null; then
            print_success "服务器正在运行 (PID: $PID)"
            
            # 检查端口
            if lsof -Pi :7788 -sTCP:LISTEN -t >/dev/null 2>&1; then
                print_success "端口 3000 正在监听"
                print_success "访问地址: http://localhost:7788"
            else
                print_warning "端口 3000 未监听"
            fi
        else
            print_warning "服务器进程不存在"
        fi
    else
        print_warning "未找到服务器进程ID文件"
    fi
    
    # 检查日志
    if [ -f "logs/server.log" ]; then
        print_info "最近的日志:"
        tail -10 logs/server.log
    fi
}

# 清理日志
clean_logs() {
    print_info "清理日志文件..."
    rm -rf logs/
    print_success "日志文件已清理"
}

# 显示帮助信息
show_help() {
    echo -e "${CYAN}智能学生成绩报告单生成系统 - 启动脚本${NC}"
    echo ""
    echo -e "${WHITE}使用方法:${NC}"
    echo "  ./start.sh [命令]"
    echo ""
    echo -e "${WHITE}可用命令:${NC}"
    echo "  dev       - 启动开发服务器 (默认)"
    echo "  prod      - 启动生产服务器"
    echo "  stop      - 停止服务器"
    echo "  restart   - 重启服务器"
    echo "  status    - 查看服务器状态"
    echo "  clean     - 清理日志文件"
    echo "  help      - 显示帮助信息"
    echo ""
    echo -e "${WHITE}示例:${NC}"
    echo "  ./start.sh          # 启动开发服务器"
    echo "  ./start.sh prod     # 启动生产服务器"
    echo "  ./start.sh stop     # 停止服务器"
    echo ""
    echo -e "${WHITE}更多信息:${NC}"
    echo "  项目地址: https://github.com/your-username/student-report-generator"
    echo "  文档: README.md"
}

# 显示项目信息
show_banner() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║         🎓 智能学生成绩报告单生成系统 v1.0.0                    ║"
    echo "║                                                              ║"
    echo "║         现代化前后端分离架构 • 炫酷UI设计 • 高性能处理             ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# 主函数
main() {
    show_banner
    
    # 解析命令行参数
    COMMAND=${1:-dev}
    
    case $COMMAND in
        "dev")
            check_node
            check_npm
            check_port 7788
            install_dependencies
            start_dev_server
            print_success "开发服务器启动完成！"
            echo ""
            echo -e "${CYAN}📍 访问地址: ${WHITE}http://localhost:7788${NC}"
            echo -e "${CYAN}📋 API文档: ${WHITE}http://localhost:7788/api/health${NC}"
            echo -e "${CYAN}📁 项目目录: ${WHITE}$(pwd)${NC}"
            echo ""
            print_info "使用 './start.sh stop' 停止服务器"
            print_info "使用 './start.sh status' 查看状态"
            ;;
        "prod")
            check_node
            check_npm
            check_port 7788
            install_dependencies
            start_prod_server
            print_success "生产服务器启动完成！"
            echo ""
            echo -e "${CYAN}📍 访问地址: ${WHITE}http://localhost:7788${NC}"
            echo ""
            print_info "使用 './start.sh stop' 停止服务器"
            ;;
        "stop")
            stop_server
            ;;
        "restart")
            restart_server
            print_success "服务器重启完成！"
            echo ""
            echo -e "${CYAN}📍 访问地址: ${WHITE}http://localhost:7788${NC}"
            ;;
        "status")
            check_status
            ;;
        "clean")
            clean_logs
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_error "未知命令: $COMMAND"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"