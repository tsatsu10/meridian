# Contributing to Meridian

Thank you for your interest in contributing to Meridian! We welcome contributions from the community and are excited to work with you.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contribution Guidelines](#contribution-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Community](#community)

## 📜 Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. We are committed to providing a welcoming and inspiring community for all.

### Our Pledge
- Be respectful and inclusive
- Welcome newcomers and help them succeed
- Focus on constructive feedback
- Respect different viewpoints and experiences

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- pnpm 8 or higher
- Git

### Quick Start
1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/meridian.git`
3. Install dependencies: `pnpm install`
4. Start development servers: `pnpm dev:all`
5. Create a feature branch: `git checkout -b feature/your-feature-name`

## 🛠️ Development Setup

### Monorepo Structure
```
meridian/
├── apps/
│   ├── api/          # Hono-based REST API
│   └── web/          # React frontend application
├── packages/
│   └── libs/         # Shared libraries
└── .github/          # CI/CD and templates
```

### Environment Setup

1. **API Setup** (`apps/api/`)
   ```bash
   cd apps/api
   cp .env.example .env
   # Configure your environment variables
   npm run db:setup    # Initialize database
   npm run dev         # Start API server
   ```

2. **Web Setup** (`apps/web/`)
   ```bash
   cd apps/web
   npm run dev         # Start development server
   ```

### Development Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start web development server only |
| `pnpm dev:all` | Start both API and web servers |
| `pnpm build` | Build all applications |
| `pnpm test` | Run all tests |
| `pnpm lint` | Run linting on all packages |

## 📝 Contribution Guidelines

### Types of Contributions

We welcome the following types of contributions:

- 🐛 **Bug fixes** - Fix issues and improve stability
- ✨ **New features** - Add new functionality
- 📝 **Documentation** - Improve docs and examples
- 🧪 **Tests** - Add or improve test coverage
- ⚡ **Performance** - Optimize performance
- 🔒 **Security** - Address security concerns
- ♻️ **Refactoring** - Improve code quality

### Contribution Workflow

1. **Check existing issues** - Look for related issues or discussions
2. **Create an issue** - For new features or significant changes
3. **Fork and branch** - Create a feature branch from `main`
4. **Develop** - Write your code following our standards
5. **Test** - Ensure all tests pass and add new tests
6. **Document** - Update documentation as needed
7. **Submit PR** - Create a detailed pull request

## 🔄 Pull Request Process

### Branch Naming
Use descriptive branch names with prefixes:
- `feature/add-user-authentication`
- `fix/resolve-dashboard-loading`
- `docs/update-api-documentation`
- `refactor/improve-error-handling`

### Commit Messages
Follow conventional commit format:
- `feat: add user authentication system`
- `fix: resolve dashboard loading issue`
- `docs: update API documentation`
- `test: add unit tests for user service`
- `refactor: improve error handling`

### PR Requirements

Before submitting a PR, ensure:

- [ ] Code follows project coding standards
- [ ] All tests pass locally
- [ ] New features include appropriate tests
- [ ] Documentation is updated
- [ ] Commit messages follow conventional format
- [ ] PR description is clear and complete
- [ ] No console.log statements in production code
- [ ] TypeScript types are properly defined

### PR Template

Use our PR template to provide:
- Clear description of changes
- Type of change (bug fix, feature, etc.)
- Testing information
- Screenshots (if applicable)
- Deployment considerations

### Review Process

1. **Automated Checks** - CI/CD pipeline validates your changes
2. **Code Review** - Team members review your code
3. **Address Feedback** - Make requested changes
4. **Final Approval** - Maintainer approves and merges

## 🐛 Issue Guidelines

### Before Creating an Issue

1. **Search existing issues** - Check if the issue already exists
2. **Check documentation** - Make sure it's not a usage question
3. **Reproduce the bug** - Ensure it's consistently reproducible

### Issue Types

Use the appropriate issue template:

- **🐛 Bug Report** - For reporting bugs and issues
- **✨ Feature Request** - For suggesting new features
- **📝 Documentation** - For documentation improvements
- **❓ Question** - For usage questions and help

### Good Issue Examples

**Bug Report:**
- Clear, descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Screenshots or error logs

**Feature Request:**
- Problem statement
- Proposed solution
- Use cases
- Acceptance criteria

## 💻 Coding Standards

### TypeScript Guidelines

- **Strict typing** - Use TypeScript strictly, avoid `any`
- **Interfaces** - Define clear interfaces for data structures
- **Error handling** - Implement proper error handling
- **Comments** - Add comments for complex logic only

```typescript
// Good
interface UserData {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

function createUser(userData: UserData): Promise<User> {
  // Implementation
}

// Bad
function createUser(data: any): any {
  // Implementation
}
```

### React Guidelines

- **Functional components** - Use hooks over class components
- **Component composition** - Prefer composition over inheritance
- **Props typing** - Define prop types clearly
- **Performance** - Use React.memo for expensive components

```tsx
// Good
interface ButtonProps {
  variant: 'primary' | 'secondary';
  onClick: () => void;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ variant, onClick, children }) => {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      {children}
    </button>
  );
};

export default React.memo(Button);
```

### API Guidelines

- **RESTful design** - Follow REST principles
- **Error responses** - Use consistent error formats
- **Validation** - Validate all inputs with Zod
- **Documentation** - Document endpoints with OpenAPI

```typescript
// Good
app.post('/api/users', async (c) => {
  const userData = userSchema.parse(await c.req.json());
  
  try {
    const user = await createUser(userData);
    return c.json({ data: user }, 201);
  } catch (error) {
    return c.json({ error: 'Failed to create user' }, 400);
  }
});
```

## 🧪 Testing Requirements

### Test Coverage

- **Minimum 80%** test coverage for new code
- **Unit tests** for business logic
- **Integration tests** for API endpoints
- **E2E tests** for critical user journeys

### Testing Guidelines

```typescript
// Unit test example
describe('UserService', () => {
  it('should create a user with valid data', async () => {
    const userData = { name: 'John', email: 'john@example.com' };
    const user = await userService.createUser(userData);
    
    expect(user).toBeDefined();
    expect(user.name).toBe('John');
    expect(user.email).toBe('john@example.com');
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests with coverage
cd apps/web && npm run test:coverage

# Run E2E tests
cd apps/web && npm run test:e2e

# Run specific test file
cd apps/web && npm test UserService.test.ts
```

## 📚 Documentation

### Documentation Requirements

- **API changes** - Update OpenAPI specification
- **New features** - Add usage examples
- **Breaking changes** - Document migration steps
- **README updates** - Keep setup instructions current

### Documentation Style

- Use clear, concise language
- Provide code examples
- Include screenshots for UI changes
- Add troubleshooting tips

## 💬 Community

### Getting Help

- **GitHub Issues** - For bugs and feature requests
- **GitHub Discussions** - For questions and community chat
- **Documentation** - Check docs first for common questions

### Communication Guidelines

- Be respectful and professional
- Provide context and details
- Use appropriate channels for different types of questions
- Help others when you can

## 🏆 Recognition

We appreciate all contributions! Contributors are recognized in:
- GitHub contributors list
- Release notes for significant contributions
- Special recognition for long-term contributors

## 📋 Checklist for First-Time Contributors

- [ ] Read this contributing guide completely
- [ ] Set up development environment
- [ ] Run tests locally to ensure everything works
- [ ] Look through "good first issue" labels
- [ ] Join our community discussions
- [ ] Make your first contribution!

## ⚠️ Important Notes

### Security Issues
- **Never commit secrets** or sensitive information
- **Report security issues privately** via email to security@meridian.app
- **Use environment variables** for configuration

### Performance Considerations
- **Bundle size** - Avoid adding large dependencies
- **Database queries** - Optimize database operations
- **Image optimization** - Use appropriate formats and sizes
- **Lazy loading** - Implement for large components

### Breaking Changes
- **Discuss first** - Talk to maintainers before making breaking changes
- **Migration guide** - Provide clear migration instructions
- **Version planning** - Breaking changes go in major releases

---

Thank you for contributing to Meridian! Your contributions make this project better for everyone. 🎉

For questions about contributing, please create a GitHub Discussion or reach out to the maintainers.