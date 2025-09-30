# 🧪 OpenFrame Automated Tests

## 📊 Allure Reports

### 🔗 Quick Access to Reports
Replace `{PR_NUMBER}` with your Pull Request number:

```
https://flamingo-stack.github.io/openframe-oss-tenant/allure/{PR_NUMBER}
```

**Examples:**
- PR #123: https://flamingo-stack.github.io/openframe-oss-tenant/allure/123
- PR #124: https://flamingo-stack.github.io/openframe-oss-tenant/allure/124

### 🤖 Automated Reports
- **On every PR** Allure report is automatically generated
- **PR comment** contains direct link to the report
- **Reports are stored** in `gh-pages` branch


### 🔧 Local Execution
```bash
# Run all tests
mvn clean test

# Run only smoke tests
mvn test -Dgroups="smoke"

# Generate Allure report local
brew install allure

mvn clean test
allure serve target/allure-results
```