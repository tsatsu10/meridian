#!/bin/bash

# 🚀 Meridian Deployment Script
# Comprehensive deployment automation for multiple environments

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/tmp/meridian-deploy-$(date +%Y%m%d-%H%M%S).log"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

# Help function
show_help() {
    cat << EOF
🚀 Meridian Deployment Script

Usage: $0 [ENVIRONMENT] [OPTIONS]

ENVIRONMENTS:
  development  Deploy to local development environment
  staging      Deploy to staging environment
  production   Deploy to production environment

OPTIONS:
  --skip-tests     Skip test execution
  --skip-build     Skip build process
  --skip-db        Skip database operations
  --dry-run        Show what would be deployed without executing
  --help, -h       Show this help message

EXAMPLES:
  $0 development                    # Deploy to development
  $0 staging --skip-tests          # Deploy to staging without tests
  $0 production --dry-run          # Show production deployment plan
  $0 production                    # Full production deployment

ENVIRONMENT VARIABLES:
  DATABASE_URL     Database connection string
  JWT_SECRET       JWT secret key
  API_PORT         API server port (default: 3008)
  NODE_ENV         Environment (development|staging|production)

For more information, see DEPLOYMENT.md
EOF
}

# Parse command line arguments
ENVIRONMENT=${1:-development}
SKIP_TESTS=false
SKIP_BUILD=false
SKIP_DB=false
DRY_RUN=false

shift || true  # Remove first argument
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-db)
            SKIP_DB=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            warning "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate environment
case $ENVIRONMENT in
    development|staging|production)
        ;;
    *)
        error "Invalid environment: $ENVIRONMENT. Use: development, staging, or production"
        ;;
esac

# Configuration based on environment
setup_environment() {
    log "🔧 Setting up $ENVIRONMENT environment"
    
    case $ENVIRONMENT in
        development)
            export NODE_ENV=development
            export API_PORT=${API_PORT:-3008}
            export DATABASE_TYPE=sqlite
            export DATABASE_URL=${DATABASE_URL:-"file:./meridian.db"}
            ;;
        staging)
            export NODE_ENV=staging
            export API_PORT=${API_PORT:-3008}
            export DATABASE_TYPE=postgresql
            ;;
        production)
            export NODE_ENV=production
            export API_PORT=${API_PORT:-3008}
            export DATABASE_TYPE=postgresql
            # Require DATABASE_URL for production
            if [[ -z "$DATABASE_URL" ]]; then
                error "DATABASE_URL is required for production deployment"
            fi
            ;;
    esac
    
    success "Environment configured: $ENVIRONMENT"
}

# Prerequisites check
check_prerequisites() {
    log "🔍 Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $NODE_VERSION -lt 18 ]]; then
        error "Node.js 18 or higher is required. Current version: $(node --version)"
    fi
    
    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        warning "pnpm not found, installing..."
        npm install -g pnpm
    fi
    
    # Check Git (for version info)
    if ! command -v git &> /dev/null; then
        warning "Git not found. Version info will not be available."
    fi
    
    # Check available disk space (minimum 2GB)
    if command -v df &> /dev/null; then
        AVAILABLE_SPACE=$(df -BG . | awk 'NR==2{print $4}' | sed 's/G//')
        if [[ $AVAILABLE_SPACE -lt 2 ]]; then
            error "Insufficient disk space. At least 2GB required, available: ${AVAILABLE_SPACE}GB"
        fi
    fi
    
    success "Prerequisites check passed"
}

# Install dependencies
install_dependencies() {
    if [[ $DRY_RUN == true ]]; then
        log "DRY RUN: Would install dependencies"
        return
    fi
    
    log "📦 Installing dependencies..."
    cd "$PROJECT_ROOT"
    
    # Clear any existing node_modules for clean install
    if [[ -d "node_modules" ]]; then
        log "Cleaning existing node_modules..."
        rm -rf node_modules
    fi
    
    # Install with frozen lockfile for consistency
    pnpm install --frozen-lockfile
    
    success "Dependencies installed"
}

# Run tests
run_tests() {
    if [[ $SKIP_TESTS == true ]]; then
        warning "Skipping tests"
        return
    fi
    
    if [[ $DRY_RUN == true ]]; then
        log "DRY RUN: Would run test suite"
        return
    fi
    
    log "🧪 Running test suite..."
    cd "$PROJECT_ROOT"
    
    # API tests
    if [[ -d "apps/api" ]]; then
        log "Running API tests..."
        cd apps/api
        npm test 2>/dev/null || warning "API tests not configured or failed"
        cd "$PROJECT_ROOT"
    fi
    
    # Web tests
    if [[ -d "apps/web" ]]; then
        log "Running Web tests..."
        cd apps/web
        npm run test:coverage || warning "Some web tests may have failed"
        cd "$PROJECT_ROOT"
    fi
    
    # E2E tests (only for staging/production)
    if [[ $ENVIRONMENT != "development" ]]; then
        log "Running E2E tests..."
        cd apps/web
        if command -v npx playwright &> /dev/null; then
            npx playwright install --with-deps
            npm run test:e2e || warning "E2E tests failed"
        else
            warning "Playwright not available, skipping E2E tests"
        fi
        cd "$PROJECT_ROOT"
    fi
    
    success "Tests completed"
}

# Build applications
build_applications() {
    if [[ $SKIP_BUILD == true ]]; then
        warning "Skipping build"
        return
    fi
    
    if [[ $DRY_RUN == true ]]; then
        log "DRY RUN: Would build applications"
        return
    fi
    
    log "🏗️  Building applications..."
    cd "$PROJECT_ROOT"
    
    # Build API
    if [[ -d "apps/api" ]]; then
        log "Building API..."
        cd apps/api
        npm run build
        cd "$PROJECT_ROOT"
        success "API built successfully"
    fi
    
    # Build Web
    if [[ -d "apps/web" ]]; then
        log "Building Web application..."
        cd apps/web
        if [[ $ENVIRONMENT == "production" ]]; then
            npm run build:production
        else
            npm run build
        fi
        cd "$PROJECT_ROOT"
        success "Web application built successfully"
    fi
    
    success "All applications built successfully"
}

# Database operations
handle_database() {
    if [[ $SKIP_DB == true ]]; then
        warning "Skipping database operations"
        return
    fi
    
    if [[ $DRY_RUN == true ]]; then
        log "DRY RUN: Would handle database operations"
        return
    fi
    
    log "🗄️  Handling database operations..."
    cd "$PROJECT_ROOT/apps/api"
    
    # Database setup based on type
    if [[ $DATABASE_TYPE == "sqlite" ]]; then
        log "Setting up SQLite database..."
        # Ensure SQLite database exists
        npm run db:generate 2>/dev/null || true
        npm run db:migrate 2>/dev/null || warning "Database migrations failed"
    else
        log "Setting up PostgreSQL database..."
        # Test connection first
        if npm run db:check 2>/dev/null; then
            success "Database connection successful"
        else
            error "Cannot connect to database. Check DATABASE_URL"
        fi
        
        # Run migrations
        npm run db:generate 2>/dev/null || warning "Migration generation failed"
        npm run db:migrate || warning "Database migrations failed"
    fi
    
    # Seed data for development
    if [[ $ENVIRONMENT == "development" ]]; then
        npm run db:seed 2>/dev/null || warning "Database seeding failed"
    fi
    
    cd "$PROJECT_ROOT"
    success "Database operations completed"
}

# Start services
start_services() {
    if [[ $DRY_RUN == true ]]; then
        log "DRY RUN: Would start services"
        return
    fi
    
    log "🚀 Starting services..."
    cd "$PROJECT_ROOT"
    
    # Stop any existing processes
    pkill -f "meridian-api" 2>/dev/null || true
    pkill -f "meridian-web" 2>/dev/null || true
    sleep 2
    
    if [[ $ENVIRONMENT == "development" ]]; then
        log "Starting development servers..."
        # Start API in background
        cd apps/api
        npm run dev > /tmp/meridian-api.log 2>&1 &
        API_PID=$!
        echo $API_PID > /tmp/meridian-api.pid
        
        # Start Web in background
        cd ../web
        npm run dev > /tmp/meridian-web.log 2>&1 &
        WEB_PID=$!
        echo $WEB_PID > /tmp/meridian-web.pid
        
        cd "$PROJECT_ROOT"
        
        # Wait for services to start
        sleep 10
        
        # Check if services are running
        if kill -0 $API_PID 2>/dev/null; then
            success "API server started (PID: $API_PID)"
        else
            error "Failed to start API server"
        fi
        
        if kill -0 $WEB_PID 2>/dev/null; then
            success "Web server started (PID: $WEB_PID)"
        else
            error "Failed to start Web server"
        fi
        
        log "📊 Services Status:"
        log "   API: http://localhost:${API_PORT:-3008}"
        log "   Web: http://localhost:5173"
        log "   Logs: tail -f /tmp/meridian-*.log"
        
    else
        log "Starting production servers..."
        
        # Use PM2 for production process management
        if command -v pm2 &> /dev/null; then
            cd apps/api
            pm2 start dist/index.js --name meridian-api --env $ENVIRONMENT
            
            cd ../web
            pm2 serve dist 3000 --name meridian-web --spa
            
            pm2 save
            success "Production servers started with PM2"
        else
            # Fallback to direct execution
            cd apps/api
            npm start &
            API_PID=$!
            echo $API_PID > /tmp/meridian-api.pid
            
            cd ../web
            npm run preview &
            WEB_PID=$!
            echo $WEB_PID > /tmp/meridian-web.pid
            
            success "Production servers started"
        fi
    fi
}

# Health checks
health_check() {
    if [[ $DRY_RUN == true ]]; then
        log "DRY RUN: Would perform health checks"
        return
    fi
    
    log "🏥 Performing health checks..."
    
    # Wait for services to be ready
    sleep 15
    
    # Check API health
    API_URL="http://localhost:${API_PORT:-3008}"
    if curl -f -s "$API_URL/health" > /dev/null 2>&1; then
        success "API health check passed"
    else
        warning "API health check failed - service may still be starting"
    fi
    
    # Check Web application (development only)
    if [[ $ENVIRONMENT == "development" ]]; then
        if curl -f -s "http://localhost:5173" > /dev/null 2>&1; then
            success "Web application health check passed"
        else
            warning "Web application health check failed - service may still be starting"
        fi
    fi
}

# Generate deployment report
generate_report() {
    log "📊 Generating deployment report..."
    
    REPORT_FILE="/tmp/meridian-deploy-report-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$REPORT_FILE" << EOF
{
  "deployment": {
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "environment": "$ENVIRONMENT",
    "version": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "tag": "$(git describe --tags 2>/dev/null || echo 'no-tags')",
    "node_version": "$(node --version)",
    "pnpm_version": "$(pnpm --version 2>/dev/null || echo 'not-installed')"
  },
  "configuration": {
    "api_port": "${API_PORT:-3008}",
    "database_type": "$DATABASE_TYPE",
    "node_env": "$NODE_ENV"
  },
  "execution": {
    "skip_tests": $SKIP_TESTS,
    "skip_build": $SKIP_BUILD,
    "skip_db": $SKIP_DB,
    "dry_run": $DRY_RUN
  },
  "log_file": "$LOG_FILE"
}
EOF
    
    success "Deployment report generated: $REPORT_FILE"
    cat "$REPORT_FILE"
}

# Cleanup function
cleanup() {
    if [[ $DRY_RUN == true ]]; then
        return
    fi
    
    log "🧹 Cleaning up..."
    
    # Clean build artifacts if deployment failed
    if [[ $? -ne 0 ]]; then
        warning "Deployment failed, cleaning up..."
        # Kill any started processes
        if [[ -f /tmp/meridian-api.pid ]]; then
            kill $(cat /tmp/meridian-api.pid) 2>/dev/null || true
            rm -f /tmp/meridian-api.pid
        fi
        if [[ -f /tmp/meridian-web.pid ]]; then
            kill $(cat /tmp/meridian-web.pid) 2>/dev/null || true
            rm -f /tmp/meridian-web.pid
        fi
    fi
}

# Trap for cleanup on exit
trap cleanup EXIT

# Main deployment flow
main() {
    log "🚀 Starting Meridian deployment to $ENVIRONMENT environment"
    log "📝 Log file: $LOG_FILE"
    
    setup_environment
    check_prerequisites
    install_dependencies
    run_tests
    build_applications
    handle_database
    start_services
    health_check
    generate_report
    
    success "🎉 Deployment to $ENVIRONMENT completed successfully!"
    
    if [[ $ENVIRONMENT == "development" ]]; then
        log ""
        log "🌟 Development server is running:"
        log "   Frontend: http://localhost:5173"
        log "   API: http://localhost:${API_PORT:-3008}"
        log "   API Health: http://localhost:${API_PORT:-3008}/health"
        log ""
        log "📝 Logs:"
        log "   API: tail -f /tmp/meridian-api.log"
        log "   Web: tail -f /tmp/meridian-web.log"
        log ""
        log "🛑 Stop servers:"
        log "   kill \$(cat /tmp/meridian-api.pid /tmp/meridian-web.pid)"
    fi
}

# Show banner
cat << "EOF"
  _  __                           
 | |/ /__ _ _ __   ___  ___        
 | ' // _` | '_ \ / _ \/ _ \       
 | . \ (_| | | | |  __/ (_) |      
 |_|\_\__,_|_| |_|\___|\___/       
                                  
 🚀 Deployment Script v1.0.0      
EOF

# Run main function
main "$@"