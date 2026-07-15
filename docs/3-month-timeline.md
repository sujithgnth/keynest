# 3-Month Interview Timeline

This timeline keeps the next 3 months focused on interview-relevant fullstack delivery. The goal is to build a serious, explainable MVP without drifting into long-term architecture experiments too early.

## Month 1: Core Fullstack Foundation

### Week 1: Project Setup And Architecture Skeleton

Goal: establish the fullstack foundation.

Build:

- Frontend app
- Backend app
- Basic folder structure
- Environment configuration
- Docker Compose for local development
- MongoDB local database
- Basic health-check API
- First README section
- Optional shared TypeScript types if useful

Interview value:

- Project structure
- Fullstack setup
- Docker basics
- Clean architecture foundations
- Environment configuration

### Week 2: Authentication Module

Goal: implement the first auth flow.

Build:

- User model
- Register API
- Login API
- Logout flow
- `GET /auth/me`
- Password hashing
- JWT or secure session strategy
- Protected backend route
- Basic frontend login/register pages
- Frontend protected route

Interview value:

- Authentication
- Authorization
- Route protection
- Password hashing
- Token/session tradeoffs
- Secure API design

### Week 3: User And Vault Data Modeling

Goal: model users and vault ownership.

Build:

- `VaultItem` model
- DTOs
- Validation
- Database schema/model
- User ownership relation
- Basic indexes

Interview value:

- MongoDB schema design
- Validation
- Data ownership
- API modeling
- Query design

### Week 4: Basic Vault CRUD

Goal: make the core vault workflow usable.

Build:

- Create vault item
- List vault items
- Edit vault item
- Delete vault item
- Frontend vault page
- Basic forms
- API integration

Interview value:

- REST API design
- Frontend forms
- Backend service/controller structure
- State management
- Clean TypeScript

### Month 1 Milestone

By the end of Month 1:

- A user can register.
- A user can log in.
- A user can access a protected vault page.
- A user can create/list/edit/delete vault items.
- Vault items are linked to the authenticated user.
- Basic validation and error handling exist.

## Month 2: Security And Deeper Interview Value

### Week 5: Encryption Design

Goal: make the password-manager security boundary explicit.

Build:

- Decide encryption boundary: client-side vs server-side
- Implement first serious encryption version
- Document master password handling
- Ensure secrets are not logged
- Ensure sensitive fields are not returned unnecessarily

Interview value:

- Encryption basics
- Security tradeoffs
- Threat modeling
- Password manager domain understanding

### Week 6: Search, Filter, And Tags

Goal: add usable item discovery while respecting encryption limits.

Build:

- Search vault items
- Filter by tags/category
- Sort items
- Add pagination if useful
- Add indexes where needed

Interview value:

- MongoDB querying
- Indexing
- Frontend filtering
- API query design
- Performance basics

### Week 7: Audit Logging

Goal: add basic security-conscious auditability.

Build:

- Audit log model
- Track create/update/delete/view actions
- Avoid storing sensitive values in logs
- Add backend event-style structure if useful

Interview value:

- Auditability
- Event-driven thinking
- Security-conscious logging
- Production readiness

### Week 8: Hardening

Goal: improve production-readiness of core flows.

Build:

- Global error handling
- Consistent API response format
- Form-level error display
- Rate limiting basics
- Input validation hardening
- Auth guard improvements

Interview value:

- Production-readiness
- Secure backend design
- Error handling
- Validation
- Maintainability

### Month 2 Milestone

By the end of Month 2:

- Encryption design is clear.
- Sensitive vault fields are encrypted.
- Search/filter/tags exist.
- Audit logging exists.
- Validation and error handling are improved.
- Basic rate limiting exists.
- Security notes are documented.

## Month 3: Testing, Deployment Readiness, And Architecture Explanation

### Week 9: Backend Testing

Goal: prove the backend flows work and security edge cases are considered.

Build:

- Unit tests for auth service
- Unit tests for vault service
- Integration tests for auth/vault APIs
- Test security edge cases

Interview value:

- Testing strategy
- Backend confidence
- Interview code quality

### Week 10: Frontend Testing

Goal: prove the core UI flows work.

Build:

- Component tests for forms
- Auth flow tests
- Vault CRUD flow tests
- 1 or 2 Playwright E2E tests

Interview value:

- Frontend testing
- E2E thinking
- Quality engineering

### Week 11: Docker, CI, And Deployment Preparation

Goal: make the project easier to run and evaluate.

Build:

- Docker Compose cleanup
- Environment separation
- Basic CI pipeline
- Lint/test/build pipeline
- Deployment notes

Interview value:

- DevOps basics
- Production-readiness
- Engineering maturity

### Week 12: Architecture Documentation And Interview Preparation

Goal: turn the project into a clear interview story.

Build:

- README
- Architecture overview
- API documentation
- System design diagram
- ADRs for major decisions
- Interview explanation notes

Interview value:

- Senior-level communication
- Architecture thinking
- Project storytelling
- Tradeoff explanation

### Month 3 Milestone

By the end of Month 3:

- Backend tests exist.
- Frontend tests exist.
- A few E2E tests exist.
- Local setup is Dockerized.
- Basic CI pipeline exists.
- README is interview-ready.
- Architecture notes exist.
- ADRs exist.
- Project interview explanation is ready.

## Do Not Waste Time On

Avoid during the first 3 months:

- Fancy UI
- Animations
- Browser extension
- Mobile app
- Microservices
- Kubernetes
- Billing/subscriptions
- Enterprise features
- Over-polishing before core flows work

## Security Questions To Keep Asking

- Is the master password stored anywhere?
- Where does encryption happen?
- Are passwords hashed properly?
- Are sensitive vault fields encrypted?
- Are secrets accidentally logged?
- Are tokens handled safely?
- Are protected routes actually protected?
- Are users prevented from accessing other users' vault items?
- Are validation and error messages safe?
- Are sensitive fields excluded from API responses?

## ADR Format

For meaningful technical decisions, write short ADRs using this structure:

- Decision
- Context
- Options
- Chosen approach
- Tradeoffs
- Risks
- Future improvement
- Interview explanation
