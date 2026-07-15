# Project Direction

KeyNest is both an interview portfolio project and a long-term career lab.

Short term, during the next 3 months, it should become an interview-ready fullstack TypeScript project that proves the developer can design, build, test, secure, containerize, and explain a realistic production-style system.

Long term, it should support growth toward:

- Senior Fullstack TypeScript Developer
- Strong Senior Frontend Engineer
- Future hands-on Software Architect

## Layer 1: Interview-Ready MVP

The MVP should be completed first during the interview preparation phase. It should be focused enough to finish and polished enough to explain in interviews.

The goal is not to build every possible password manager feature. The goal is to demonstrate ownership of a realistic fullstack system.

The detailed weekly execution plan is tracked in [3-month-timeline.md](3-month-timeline.md).

### MVP Features

Must include:

1. User registration
2. User login
3. Authentication/session handling
4. Protected routes
5. Create vault item
6. Edit vault item
7. Delete vault item
8. List vault items
9. Search/filter vault items
10. Category/grouping support
11. Client-side encryption model
12. Backend stores encrypted vault data only
13. Basic audit logs
14. Validation
15. Error handling
16. Pagination
17. Basic tests
18. Docker/docker-compose setup
19. README
20. Architecture explanation

### MVP Interview Goal

After the MVP, the developer should be able to explain:

- Why this architecture was chosen
- How authentication works
- How vault data is encrypted
- What the backend stores
- What the backend must never store
- How the database is designed
- What indexes are needed
- How validation and errors are handled
- How the app runs with Docker
- What should be improved in the next version

## Layer 2: Long-Term Architecture Lab

After the MVP, KeyNest should evolve into a long-term learning project for deeper fullstack, backend, architecture, security, DevOps, and system-design practice.

Long-term improvements can include:

1. Better encryption/key-management design
2. Stronger session management
3. Refresh token rotation or secure session model
4. Rate limiting
5. Better audit logging
6. Advanced search strategy for encrypted data
7. Security event monitoring
8. Password strength analysis
9. Import/export flow
10. Backup/restore strategy
11. Browser extension exploration
12. Better test coverage
13. End-to-end tests
14. CI/CD pipeline
15. Production deployment
16. Observability/logging/metrics
17. Performance optimization
18. Accessibility improvements
19. Design system improvements
20. Architecture decision records

These are long-term improvements, not MVP blockers.

## Priority System

For the next 3 months, classify every task before doing it:

1. Interview-critical
2. Interview-useful
3. Long-term architecture growth
4. Low-priority distraction

Focus mainly on interview-critical and interview-useful work during the interview phase.

### Interview-Critical Areas

- Authentication flow
- Authorization and route protection
- Secure API design
- Encryption/decryption design
- Frontend forms
- Frontend state management
- API integration
- Validation
- Error handling
- Database modeling
- MongoDB queries
- Indexing basics
- Testing strategy
- Clean TypeScript design
- Component design
- Backend service/controller structure
- DTOs and validation
- Security tradeoffs
- Explaining architecture decisions

### Interview-Useful Areas

- Password strength indicator
- Search and filtering
- Tags/categories
- Audit logs
- Pagination
- Sorting
- Rate limiting
- Refresh token strategy
- Session expiration
- Docker setup
- Basic CI
- Basic deployment preparation

## Scope Rule

Do not overbuild the MVP.

For the first interview version, avoid:

- Browser extension
- Mobile app
- Team vaults
- Enterprise sharing
- Payment system
- Complex account recovery
- Microservices
- Kubernetes
- Event-driven architecture
- Unnecessary AI features

These can be explored later if they support learning.

## Short-Term Build Order

For the interview-ready MVP, follow this order:

1. README and project goal
2. Architecture overview
3. Auth decision: JWT vs session
4. MongoDB data model and indexes
5. User registration
6. Login
7. Protected routes
8. Vault item data model
9. Client-side encryption model
10. Vault CRUD APIs
11. Vault UI
12. Search/filter/category
13. Audit log basics
14. Validation and error handling
15. Pagination
16. Basic tests
17. Docker/docker-compose
18. Final interview explanation

## Long-Term Learning Tracks

### Frontend Architecture

- React architecture
- Angular comparison
- Design system
- Reusable components
- Forms
- Accessibility
- Performance
- State management
- Error/loading/empty states

### Backend Architecture

- NestJS modules/controllers/services
- DTO validation
- Guards
- Interceptors
- Exception filters
- Repositories/services
- Database access patterns
- Pagination
- Rate limiting
- Logging

### Database

- PostgreSQL vs MongoDB tradeoffs
- Schema design
- Indexes
- Unique constraints
- Transactions
- Query performance
- Cursor pagination
- Encrypted data limitations

### Security

- Password hashing
- Session/JWT tradeoffs
- Client-side encryption
- Key derivation
- Metadata leakage
- Secure error messages
- Environment variables
- Rate limiting
- Audit logs

### DevOps

- Docker
- Docker Compose
- Environment config
- CI/CD
- Deployment
- Logs
- Health checks
- Monitoring basics

### Software Architecture

- ADRs
- Tradeoff analysis
- Failure modes
- Threat modeling
- Maintainability
- Scalability
- Modularity
- Testing strategy
- Production-readiness

## External Course Usage

External password-manager videos or tutorials may be used for inspiration, but KeyNest should not become a copy-paste tutorial project.

Use external videos only for:

- Project setup ideas
- Common feature flow
- Implementation comparison
- Missing concepts
- Alternative approaches

The final architecture and decisions must be owned and explainable by the developer.

## Long-Term Evolution Path

### 2026

- Build strong MVP
- Prepare interview explanations
- Improve fullstack fundamentals
- Add tests and Docker
- Start deployment readiness

### 2027

- Improve backend depth
- Add stronger security design
- Add observability
- Compare SQL and NoSQL approaches
- Improve frontend architecture
- Add audit/event-driven patterns
- Write ADRs regularly

### 2028

- Treat the project like an architecture case study
- Improve scalability
- Improve reliability
- Improve security architecture
- Add advanced system-design documentation
- Practise explaining the project like a senior engineer and architect

## Main Principle

This project should become a career lab.

Short term: make it interview-ready.

Long term: use it to become a stronger fullstack engineer and future software architect.

Do not allow passive code generation. Think first, explain first, then build.
