#!/bin/bash
# Infrastructure Validation Script
# Runs all validation checks for Terraform, Kubernetes, Ansible, and Docker

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}=== BlockGuardian Infrastructure Validation ===${NC}\n"

VALIDATION_PASSED=true
WARNINGS=0
ERRORS=0

LOG_DIR="${INFRA_DIR}/logs/validation"
mkdir -p "$LOG_DIR"

pass()  { echo -e "${GREEN}  ✓ $1${NC}"; }
fail()  { echo -e "${RED}  ✗ $1${NC}"; VALIDATION_PASSED=false; ERRORS=$((ERRORS + 1)); }
warn()  { echo -e "${YELLOW}  ⚠ $1${NC}"; WARNINGS=$((WARNINGS + 1)); }
info()  { echo -e "${BLUE}  → $1${NC}"; }
section() { echo -e "\n${YELLOW}=== $1 ===${NC}"; }

# ─────────────────────────────────────────
# Terraform Validation
# ─────────────────────────────────────────
section "Terraform Validation"
cd "$INFRA_DIR/terraform"

info "Checking Terraform format..."
if terraform fmt -check -recursive > "$LOG_DIR/terraform_fmt.log" 2>&1; then
    pass "Terraform format check"
else
    fail "Terraform format check (run: terraform fmt -recursive)"
    cat "$LOG_DIR/terraform_fmt.log"
fi

info "Initializing Terraform (local backend)..."
if terraform init -backend=false -upgrade > "$LOG_DIR/terraform_init.log" 2>&1; then
    pass "Terraform init"
else
    fail "Terraform init"
    cat "$LOG_DIR/terraform_init.log"
fi

info "Validating Terraform configuration..."
if terraform validate > "$LOG_DIR/terraform_validate.log" 2>&1; then
    pass "Terraform validate"
else
    fail "Terraform validate"
    cat "$LOG_DIR/terraform_validate.log"
fi

info "Running TFLint..."
if command -v tflint &> /dev/null; then
    tflint --init > /dev/null 2>&1 || true
    if tflint > "$LOG_DIR/tflint.log" 2>&1; then
        pass "TFLint"
    else
        warn "TFLint found issues (see $LOG_DIR/tflint.log)"
    fi
else
    warn "tflint not installed, skipping"
fi

info "Running tfsec..."
if command -v tfsec &> /dev/null; then
    if tfsec . --no-color > "$LOG_DIR/tfsec.log" 2>&1; then
        pass "tfsec"
    else
        warn "tfsec found issues (see $LOG_DIR/tfsec.log)"
    fi
else
    warn "tfsec not installed, skipping"
fi

# ─────────────────────────────────────────
# Kubernetes Validation
# ─────────────────────────────────────────
section "Kubernetes Validation"
cd "$INFRA_DIR/kubernetes"

info "Running YAML lint..."
if command -v yamllint &> /dev/null; then
    if yamllint -c "$INFRA_DIR/.yamllint" . > "$LOG_DIR/kubernetes_yamllint.log" 2>&1; then
        pass "YAML lint"
    else
        warn "YAML lint found issues (see $LOG_DIR/kubernetes_yamllint.log)"
    fi
else
    warn "yamllint not installed, skipping"
fi

info "Building Kustomize overlays..."
if command -v kustomize &> /dev/null || command -v kubectl &> /dev/null; then
    BUILD_CMD="kustomize build"
    command -v kustomize &> /dev/null || BUILD_CMD="kubectl kustomize"

    for env in dev staging prod; do
        if $BUILD_CMD "environments/$env" > "$LOG_DIR/kustomize_${env}.yaml" 2>&1; then
            pass "Kustomize build: $env"
        else
            fail "Kustomize build: $env"
            cat "$LOG_DIR/kustomize_${env}.yaml"
        fi
    done
else
    warn "kustomize/kubectl not installed, skipping"
fi

info "Validating manifests with kubectl dry-run..."
if command -v kubectl &> /dev/null; then
    for env in dev staging prod; do
        if [[ -f "$LOG_DIR/kustomize_${env}.yaml" ]]; then
            if kubectl apply --dry-run=client -f "$LOG_DIR/kustomize_${env}.yaml" > "$LOG_DIR/kubectl_dryrun_${env}.log" 2>&1; then
                pass "kubectl dry-run: $env"
            else
                warn "kubectl dry-run issues for $env (see $LOG_DIR/kubectl_dryrun_${env}.log)"
            fi
        fi
    done
else
    warn "kubectl not installed, skipping"
fi

# ─────────────────────────────────────────
# Ansible Validation
# ─────────────────────────────────────────
section "Ansible Validation"
cd "$INFRA_DIR/ansible"

info "Running Ansible syntax check..."
if command -v ansible-playbook &> /dev/null; then
    if ansible-playbook playbooks/main.yml --syntax-check \
        -i inventory/hosts.example.yml > "$LOG_DIR/ansible_syntax.log" 2>&1; then
        pass "Ansible syntax check"
    else
        fail "Ansible syntax check"
        cat "$LOG_DIR/ansible_syntax.log"
    fi
else
    warn "ansible-playbook not installed, skipping"
fi

info "Running ansible-lint..."
if command -v ansible-lint &> /dev/null; then
    if ansible-lint playbooks/main.yml > "$LOG_DIR/ansible_lint.log" 2>&1; then
        pass "ansible-lint"
    else
        warn "ansible-lint found issues (see $LOG_DIR/ansible_lint.log)"
    fi
else
    warn "ansible-lint not installed, skipping"
fi

# ─────────────────────────────────────────
# Docker Validation
# ─────────────────────────────────────────
section "Docker Validation"
cd "$INFRA_DIR"

info "Validating docker-compose.yml..."
if command -v docker &> /dev/null; then
    if docker compose -f docker-compose.yml config > "$LOG_DIR/docker_compose_validate.log" 2>&1; then
        pass "docker-compose.yml syntax"
    else
        fail "docker-compose.yml syntax"
        cat "$LOG_DIR/docker_compose_validate.log"
    fi

    info "Validating docker-compose.prod.yml..."
    if docker compose -f docker-compose.yml -f docker-compose.prod.yml config > "$LOG_DIR/docker_compose_prod_validate.log" 2>&1; then
        pass "docker-compose.prod.yml syntax"
    else
        fail "docker-compose.prod.yml syntax"
        cat "$LOG_DIR/docker_compose_prod_validate.log"
    fi
else
    warn "docker not installed, skipping"
fi

# ─────────────────────────────────────────
# Security Checks
# ─────────────────────────────────────────
section "Security Checks"

info "Checking for hardcoded secrets..."
FOUND_SECRETS=false

# Scan tfvars for hardcoded passwords (excluding example/template values and
# comments, e.g. "# export TF_VAR_db_password=..." documenting the secure
# way to set it, which would otherwise false-positive-match this check).
while IFS= read -r -d '' file; do
    if grep -v '^\s*#' "$file" 2>/dev/null | grep -qiE '^\s*db_password\s*=\s*"[^$]'; then
        warn "Potential hardcoded password in: $file"
        FOUND_SECRETS=true
    fi
done < <(find "$INFRA_DIR/terraform/environments" -type f -name "*.tfvars" -print0)

if [[ "$FOUND_SECRETS" == "false" ]]; then
    pass "No hardcoded passwords in tfvars"
fi

info "Checking .env is gitignored..."
if grep -q "^\.env$" "$INFRA_DIR/.gitignore" 2>/dev/null; then
    pass ".env is gitignored"
else
    warn ".env is not in .gitignore - add it to prevent secret exposure"
fi

# ─────────────────────────────────────────
# Summary
# ─────────────────────────────────────────
section "Validation Summary"
echo -e "  Errors:   ${RED}${ERRORS}${NC}"
echo -e "  Warnings: ${YELLOW}${WARNINGS}${NC}"
echo "  Logs saved to: $LOG_DIR/"

if [[ "$VALIDATION_PASSED" == "true" ]]; then
    echo -e "\n${GREEN}✓ All critical validations passed!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ ${ERRORS} critical validation(s) failed. Fix errors before deploying.${NC}"
    exit 1
fi
