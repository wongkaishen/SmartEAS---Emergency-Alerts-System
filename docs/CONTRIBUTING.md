# Contributing to SmartEAS

## Overview

Thank you for your interest in contributing to SmartEAS! This document provides guidelines for contributing to the AI-driven natural disaster alert and search & rescue system.

## Development Setup

### Prerequisites
- Node.js 18+ and npm
- AWS CLI configured
- Git
- VS Code (recommended)

### Local Development
1. Clone the repository
```bash
git clone https://github.com/wongkaishen/SmartEAS.git
cd SmartEAS
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. Start development servers
```bash
npm run dev
```

## Project Structure

```
SmartEAS/
├── backend/               # AWS Lambda functions
│   ├── src/handlers/     # Lambda function handlers
│   ├── src/utils/        # Shared utilities
│   └── serverless.yml    # Serverless configuration
├── frontend/             # React.js application
│   ├── src/components/   # Reusable components
│   ├── src/pages/        # Page components
│   └── src/contexts/     # React contexts
├── infrastructure/       # AWS CDK infrastructure
├── mcp-server/           # Model Context Protocol server
├── scrapers/            # Social media scrapers
└── docs/                # Documentation
```

## Coding Standards

### TypeScript/JavaScript
- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for code formatting
- Include JSDoc comments for functions

### React Components
- Use functional components with hooks
- Implement proper error boundaries
- Follow Material-UI design patterns
- Write accessible components (ARIA labels)

### AWS Lambda Functions
- Keep functions focused and single-purpose
- Include proper error handling
- Use structured logging
- Implement proper timeout handling

### Database Design
- Use appropriate DynamoDB partition keys
- Implement proper GSI design
- Include TTL for temporary data
- Use sparse indexes where appropriate

## Testing

### Unit Tests
```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# Infrastructure tests
cd infrastructure && npm test
```

### Integration Tests
```bash
# Test API endpoints
npm run test:integration

# Test Lambda functions
npm run test:lambda
```

### End-to-End Tests
```bash
# Test complete disaster detection flow
npm run test:e2e
```

## Submitting Changes

### Pull Request Process
1. Create a feature branch from `main`
2. Make your changes
3. Add/update tests as needed
4. Update documentation
5. Ensure all tests pass
6. Submit a pull request

### PR Requirements
- [ ] Tests pass
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Security review completed
- [ ] Performance impact assessed

### Commit Messages
Use conventional commits:
```
feat: add earthquake detection algorithm
fix: resolve Twitter API rate limiting
docs: update configuration guide
test: add unit tests for route optimizer
```

## Feature Development

### New Disaster Types
1. Update disaster detection keywords
2. Add AI analysis prompts
3. Create type-specific route optimization
4. Update frontend UI components
5. Add tests for new disaster type

### New Data Sources
1. Create scraper in `scrapers/` directory
2. Add Lambda function handler
3. Update DynamoDB schema if needed
4. Implement data validation
5. Add monitoring and alerting

### API Endpoints
1. Define endpoint in `serverless.yml`
2. Implement handler function
3. Add input validation
4. Include proper error handling
5. Write API documentation
6. Add integration tests

## Security Guidelines

### API Security
- Validate all inputs
- Use HTTPS everywhere
- Implement rate limiting
- Sanitize user data
- Use proper CORS headers

### AWS Security
- Follow least privilege principle
- Use IAM roles instead of keys
- Enable CloudTrail logging
- Encrypt data at rest and in transit
- Regular security audits

### Data Privacy
- Anonymize personal data
- Implement data retention policies
- Follow GDPR guidelines
- Secure API keys properly

## Performance Guidelines

### Lambda Optimization
- Minimize cold start time
- Use Lambda layers for shared code
- Implement proper memory allocation
- Monitor execution duration

### Database Performance
- Use appropriate partition keys
- Implement proper caching
- Monitor read/write capacity
- Use batch operations when possible

### Frontend Performance
- Implement code splitting
- Use proper caching strategies
- Optimize bundle size
- Lazy load components

## Documentation

### Code Documentation
- Add JSDoc comments to functions
- Document complex algorithms
- Include usage examples
- Update README files

### API Documentation
- Use OpenAPI specifications
- Include request/response examples
- Document error codes
- Provide SDK examples

## Getting Help

### Communication Channels
- GitHub Issues for bugs and features
- GitHub Discussions for questions
- Email: dev@smarteas.ai for security issues

### Resources
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [React Development Guide](https://reactjs.org/docs/getting-started.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Material-UI Documentation](https://mui.com/)

## Release Process

### Version Management
- Use semantic versioning (semver)
- Tag releases in Git
- Maintain CHANGELOG.md
- Create release notes

### Deployment
1. Merge to `main` branch
2. Run automated tests
3. Deploy to staging environment
4. Perform smoke tests
5. Deploy to production
6. Monitor deployment

### Hotfixes
1. Create hotfix branch from `main`
2. Implement fix
3. Test thoroughly
4. Deploy to production
5. Merge back to `main`

## Code of Conduct

### Our Standards
- Be respectful and inclusive
- Provide constructive feedback
- Focus on what's best for the community
- Show empathy towards others

### Unacceptable Behavior
- Harassment or discrimination
- Trolling or insulting comments
- Personal or political attacks
- Publishing private information

### Enforcement
- Report issues to maintainers
- Community guidelines will be enforced
- Violations may result in temporary or permanent bans

## License

By contributing to SmartEAS, you agree that your contributions will be licensed under the MIT License.
