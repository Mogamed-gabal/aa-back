# Backend Audit Report — art-gallery-backend

## Scope

This review covers the current NestJS backend through AuthModule, CloudinaryModule, and ContentModule. It includes source structure, dependency installation, TypeScript, lint, build, unit and integration tests, runtime smoke tests, environment configuration, TypeORM setup, authentication, authorization, upload flow, API design, and production-readiness concerns. No source code was modified during this audit.

## Automated verification

- `pnpm install --frozen-lockfile`: passed.
- `pnpm exec tsc --noEmit`: **failed with 7 errors in test files**. The production build excludes tests, and the current Jest transform runs them without full type checking, so `pnpm run build` and Jest can pass while strict standalone TypeScript checking still fails.
- `pnpm run lint`: passed.
- `pnpm run build`: passed.
- Unit tests: 5 suites and 15 tests passed.
- Integration tests: 1 suite and 3 tests passed.
- `pnpm audit --prod`: no known vulnerabilities reported.
- Runtime `GET /api/v1/content/site-info`: HTTP 200.
- Runtime unauthenticated protected content update: HTTP 401.
- Runtime admin login: HTTP 201 with JWT access token.
- Runtime Swagger endpoint: HTTP 200.

## Confirmed strengths

The project uses a standard Flat NestJS modular structure without unnecessary domain or infrastructure layers. TypeScript strict mode and `noImplicitAny` are enabled. Dependencies are declared directly in `package.json` and locked in `pnpm-lock.yaml`. The Auth flow hides the password column by default, explicitly selects it only for credential verification, hashes seeded passwords with bcrypt, and extracts JWTs from the Bearer Authorization header. The Content module separates public read access from guarded administrative write and upload operations. Cloudinary uploads use memory-based Multer storage and map the returned secure URL and public ID.

## Findings requiring attention before production

### Blocking quality issue

1. **The test suite is not type-safe under standalone TypeScript checking.** `pnpm exec tsc --noEmit` reports seven errors: three `mockResolvedValue` calls infer `never` in `auth.seeder.spec.ts`, `auth.service.spec.ts`, and `test/auth.e2e-spec.ts`; three partial `SiteContent` fixtures are cast directly and TypeScript rejects them in `content.service.spec.ts`; and one additional mock typing error occurs in the Auth E2E test. Jest passes because the current `ts-jest` execution transpiles the tests without exposing these strict compile errors. This should be fixed before claiming the project is fully clean.

### High priority

2. **Database migrations are not implemented yet.** TypeORM has `synchronize` disabled by default. A fresh production database will not contain `users` or `site_contents` unless migrations are created and executed. Local testing used a temporary `DB_SYNCHRONIZE=true` override. This is the main deployment blocker before production.

3. **Rate limiting is installed but not configured.** `@nestjs/throttler` exists in dependencies, but no `ThrottlerModule` or throttling guard is currently registered. The login endpoint and image upload endpoint are therefore not protected against brute-force or request flooding at the application layer.

4. **Content upsert is not concurrency-safe.** `ContentService.updateSection()` performs a read followed by a create/save. Two concurrent updates for a missing section can race against the unique index and one request can fail. The implementation should use a database-native upsert or a transaction with conflict handling before production.

5. **Cloudinary credentials are optional at startup.** Empty Cloudinary values are accepted by Joi, so the application can start while image upload is not configured; the failure appears only when an upload is attempted. For production, the values should be required when `NODE_ENV=production`, or the provider should fail fast with a clear configuration error.

### Medium priority

6. **The dynamic section update body is not typed at the controller boundary.** `PUT /api/v1/content/:sectionKey` accepts `Record<string, unknown>` and performs DTO selection and validation manually in the service. It works and is tested, but Swagger cannot accurately describe the three different request schemas, and validation is not expressed in the normal Nest controller/DTO pipeline.

7. **There is no real Cloudinary integration test.** The Cloudinary unit tests mock the upload stream, which correctly tests local mapping and error handling but does not validate real credentials, network behavior, account configuration, or Cloudinary transformation behavior. A separate opt-in integration test should be used in an environment with test credentials.

8. **JWT validation does not load the user from the database.** The strategy trusts the signed payload after signature validation. A token remains valid until expiration even if the account is deleted or its access should be revoked. This may be acceptable for the single-admin MVP but should be addressed with revocation/versioning or a database lookup if administrative security requirements increase.

9. **Swagger is publicly accessible.** This is convenient during development but should either be disabled, protected, or restricted by environment in production, especially because it documents administrative endpoints.

### Low priority / improvement opportunities

10. `FileTypeValidator` relies primarily on the uploaded MIME type. MIME values can be spoofed; stronger production validation can inspect file signatures and optionally image dimensions.

11. The HTTP logger does not include a request ID or structured JSON fields. This is adequate for local debugging but makes tracing harder in distributed or production logs.

12. CORS uses credentials and an allow-list. A wildcard `CORS_ORIGIN=*` must not be used with credentials; production configuration should always provide explicit origins.

13. Login currently returns HTTP 201 because Nest POST defaults to 201. HTTP 200 would be more semantically conventional for a login response, although this is not a functional error.

14. The environment configuration contains fallback values while Joi separately requires several values from the raw environment. This is not breaking because validation runs first, but the policy should be made consistent: either keep safe development defaults intentionally or require all secrets explicitly.

## Architectural conclusion

The current architecture is coherent for the MVP and follows the requested Flat NestJS modular style. There are no TypeScript, dependency-resolution, lint, build, or currently tested runtime errors. The most important remaining work is not a structural rewrite: it is operational hardening through migrations, throttling, production-aware Cloudinary validation, and concurrency-safe content upsert.

## Recommended next gate before production

Create and test migrations for `users` and `site_contents`, configure throttling on authentication and uploads, make Cloudinary credentials mandatory in production, replace the read-then-save content update with a safe upsert or transaction, and add a protected/disabled production Swagger policy. After that, repeat the runtime smoke tests against a clean database and a non-synchronized environment.
