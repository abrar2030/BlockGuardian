#!/bin/bash
# Comprehensive Deployment Script for Financial-Grade Infrastructure
# This script orchestrates the complete deployment of BlockGuardian infrastructure

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-staging}"
ACTION="${2:-deploy}"
COMPLIANCE_MODE="financial-grade"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging - write to project-local log dir, not /var/log (requires root)
LOG_DIR="${PROJECT_ROOT}/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="${LOG_DIR}/blockguardian-deployment-$(date +%Y%m%d_%H%M%S).log"
exec 1> >(tee -a "$LOG_FILE")
exec 2> >(tee -a "$LOG_FILE" >&2)

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Validation functions
validate_environment() {
    local env="$1"
    if [[ ! "$env" =~ ^(dev|staging|prod)$ ]]; then
        error "Invalid environment: $env. Must be one of: dev, staging, prod"
    fi
}

validate_prerequisites() {
    log "Validating prerequisites..."

    local required_tools=("terraform" "kubectl" "aws" "docker" "ansible" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "$tool is required but not installed"
        fi
    done

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured or invalid"
    fi

    # Check Terraform version (>= 1.5.0)
    local tf_version
    tf_version=$(terraform version -json | jq -r '.terraform_version')
    # sort -V returns versions in ascending order; if 1.5.0 is NOT first, installed version is >= 1.5.0
    local lowest
    lowest=$(printf '%s\n%s\n' "1.5.0" "$tf_version" | sort -V | head -n1)
    if [[ "$lowest" != "1.5.0" ]]; then
        error "Terraform version 1.5.0 or higher required. Found: $tf_version"
    fi

    log "Prerequisites validation completed"
}

# Security validation
security_scan() {
    log "Running security scans..."

    info "Scanning Terraform configurations..."
    cd "$PROJECT_ROOT/terraform"
    if command -v tfsec &> /dev/null; then
        tfsec . --format json > /tmp/tfsec-results.json || true
        local issue_count
        issue_count=$(jq '.results | length' /tmp/tfsec-results.json 2>/dev/null || echo 0)
        if [[ "$issue_count" -gt 0 ]]; then
            warn "Security issues found in Terraform configuration ($issue_count issues)"
            jq -r '.results[] | .description' /tmp/tfsec-results.json
        fi
    else
        warn "tfsec not found - skipping Terraform security scan"
    fi

    info "Scanning Kubernetes manifests..."
    cd "$PROJECT_ROOT/kubernetes"
    if command -v kubesec &> /dev/null; then
        find . -type f \( -name "*.yaml" -o -name "*.yml" \) -print0 | xargs -0 -r -I{} kubesec scan {} || warn "kubesec scan completed with warnings"
    else
        warn "kubesec not found - skipping Kubernetes security scan"
    fi

    if [[ -n "${DOCKER_IMAGE:-}" ]]; then
        info "Scanning container image: $DOCKER_IMAGE"
        if command -v trivy &> /dev/null; then
            trivy image "$DOCKER_IMAGE" || warn "Trivy scan completed with findings"
        else
            warn "trivy not found - skipping container image scan"
        fi
    fi

    log "Security scans completed"
}

# Terraform deployment
terraform_deploy() {
    local env="$1"
    log "Deploying Terraform infrastructure for $env..."

    cd "$PROJECT_ROOT/terraform"

    local tfvars_file="environments/${env}/terraform.tfvars"
    if [[ ! -f "$tfvars_file" ]]; then
        error "Terraform vars file not found: $tfvars_file"
    fi

    if [[ -z "${TF_VAR_db_password:-}" ]]; then
        error "TF_VAR_db_password environment variable is not set. Set it before deploying."
    fi

    info "Initializing Terraform..."
    terraform init -upgrade

    info "Planning Terraform changes..."
    terraform plan -var-file="$tfvars_file" -out=tfplan

    if [[ "$ACTION" == "plan" ]]; then
        info "Plan-only mode. Exiting without applying."
        return 0
    fi

    info "Applying Terraform changes..."
    terraform apply tfplan

    rm -f tfplan
    log "Terraform deployment completed for $env"
}

# Kubernetes deployment
kubernetes_deploy() {
    local env="$1"
    log "Deploying Kubernetes resources for $env..."

    cd "$PROJECT_ROOT/kubernetes"

    local overlay_dir="environments/${env}"
    if [[ ! -d "$overlay_dir" ]]; then
        error "Kubernetes overlay not found: $overlay_dir"
    fi

    info "Validating Kubernetes manifests..."
    kubectl kustomize "$overlay_dir" | kubectl apply --dry-run=client -f - || error "Manifest validation failed"

    if [[ "$ACTION" == "plan" ]]; then
        info "Plan-only mode. Exiting without applying."
        return 0
    fi

    info "Applying Kubernetes resources..."
    kubectl kustomize "$overlay_dir" | kubectl apply -f -

    info "Waiting for deployments to rollout..."
    local ns="default"
    [[ "$env" == "dev" ]] && ns="dev"
    [[ "$env" == "staging" ]] && ns="staging"
    [[ "$env" == "prod" ]] && ns="production"

    kubectl rollout status "deployment/${env}-blockguardian-backend" -n "$ns" --timeout=300s || \
        warn "Backend rollout status check failed - verify manually"
    kubectl rollout status "deployment/${env}-blockguardian-frontend" -n "$ns" --timeout=300s || \
        warn "Frontend rollout status check failed - verify manually"

    log "Kubernetes deployment completed for $env"
}

# Ansible configuration
ansible_configure() {
    local env="$1"
    log "Running Ansible configuration for $env..."

    cd "$PROJECT_ROOT/ansible"

    if [[ ! -f "inventory/hosts.yml" ]]; then
        error "Ansible inventory not found: inventory/hosts.yml"
    fi

    info "Running Ansible playbook..."
    ansible-playbook playbooks/main.yml \
        -i inventory/hosts.yml \
        --extra-vars "environment=${env}" \
        --diff

    log "Ansible configuration completed for $env"
}

# Main deployment flow
main() {
    log "Starting BlockGuardian deployment"
    log "Environment: $ENVIRONMENT | Action: $ACTION | Compliance: $COMPLIANCE_MODE"

    validate_environment "$ENVIRONMENT"
    validate_prerequisites
    security_scan

    case "$ACTION" in
        deploy|plan)
            terraform_deploy "$ENVIRONMENT"
            kubernetes_deploy "$ENVIRONMENT"
            ansible_configure "$ENVIRONMENT"
            ;;
        terraform-only)
            terraform_deploy "$ENVIRONMENT"
            ;;
        kubernetes-only)
            kubernetes_deploy "$ENVIRONMENT"
            ;;
        ansible-only)
            ansible_configure "$ENVIRONMENT"
            ;;
        destroy)
            if [[ "$ENVIRONMENT" == "prod" ]]; then
                error "Destroy is not allowed for production environment via this script"
            fi
            cd "$PROJECT_ROOT/terraform"
            local destroy_tfvars="environments/${ENVIRONMENT}/terraform.tfvars"
            if [[ ! -f "$destroy_tfvars" ]]; then
                error "Terraform vars file not found: $destroy_tfvars"
            fi
            if [[ -z "${TF_VAR_db_password:-}" ]]; then
                error "TF_VAR_db_password environment variable is not set. Set it before destroying."
            fi
            terraform destroy -var-file="$destroy_tfvars" -auto-approve
            ;;
        *)
            error "Unknown action: $ACTION. Valid: deploy, plan, terraform-only, kubernetes-only, ansible-only, destroy"
            ;;
    esac

    log "BlockGuardian deployment completed successfully"
    log "Deployment log saved to: $LOG_FILE"
}

main "$@"
