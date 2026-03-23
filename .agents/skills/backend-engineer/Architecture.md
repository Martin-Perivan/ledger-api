# Architecture Patterns

## Layer Architecture

This project follows a strict layered architecture. Each layer has a single responsibility and communicates only with the layer directly below it.

```
Routes → Controllers → Services → Repositories → MongoDB
                         ↓
                    Domain (entities, enums, value objects)
```

### Rules

- **Routes** never import services or repositories.
- **Controllers** never import repositories or MongoDB driver.
- **Services** never import Express types (`Request`, `Response`).
- **Repositories** never import service or controller types.
- **Domain** never imports anything from other layers.

## Design Patterns Used

### 1. Repository Pattern

Each MongoDB collection has a dedicated repository class that encapsulates all data access logic.

```typescript
/**
 * Repository for the accounts collection.
 */
export class AccountRepository {
  private collection: Collection<AccountDocument>;

  constructor(db: Db) {
    this.collection = db.collection<AccountDocument>("accounts");
  }

  async findById(id: ObjectId, session?: ClientSession): Promise<AccountDocument | null> {
    return this.collection.findOne({ _id: id }, { session });
  }

  async updateBalance(
    id: ObjectId,
    balanceDelta: number,
    session?: ClientSession
  ): Promise<void> {
    await this.collection.updateOne(
      { _id: id },
      { $inc: { balance: balanceDelta }, $set: { updatedAt: new Date() } },
      { session }
    );
  }
}
```

### 2. Service Layer Pattern

All business logic lives in service classes. Services receive repositories via constructor injection.

```typescript
export class TransferService {
  constructor(
    private readonly accountRepo: AccountRepository,
    private readonly ledgerEntryRepo: LedgerEntryRepository,
    private readonly transactionRepo: TransactionRepository,
    private readonly riskService: RiskAssessmentService,
    private readonly client: MongoClient
  ) {}

  async execute(input: TransferInput): Promise<Result<TransferOutput, AppError>> {
    // Business logic here — returns Result, never throws
  }
}
```

### 3. Result Pattern

Services communicate success/failure through a discriminated union type.

```typescript
// Creating results:
const success = <T>(data: T): Result<T, never> => ({ success: true, data });
const failure = <E>(error: E): Result<never, E> => ({ success: false, error });

// Usage in controller:
const result = await transferService.execute(input);
if (!result.success) {
  return res.status(result.error.statusCode).json(result);
}
return res.status(201).json(result);
```

### 4. Strategy Pattern (Transaction Types)

Different transaction types (P2P, deposit) share the same ledger mechanics but differ in validation and entry creation. Each type implements a common interface:

```typescript
interface TransactionStrategy {
  validate(input: unknown): Promise<Result<ValidatedInput, AppError>>;
  createEntries(input: ValidatedInput, session: ClientSession): Promise<LedgerEntry[]>;
}
```

This keeps the `LedgerService` generic while allowing each transaction type to define its own rules.

### 5. Middleware Chain Pattern

Express middleware is composed in a specific order per route:

```typescript
router.post(
  "/transfers",
  authMiddleware,                          // 1. Verify JWT
  validate(transferSchema),                // 2. Validate input
  idempotencyMiddleware,                   // 3. Check idempotency key
  transferController.execute.bind(ctrl)    // 4. Execute
);
```

The order matters: auth before validation (no point validating if unauthenticated), validation before idempotency (no point caching an invalid request).

## Dependency Injection (Manual)

This project uses manual constructor injection — no DI framework. Dependencies are wired in `src/app.ts`:

```typescript
// In app.ts (factory function)
export function createApp(db: Db, client: MongoClient): Express {
  // Repositories
  const userRepo = new UserRepository(db);
  const accountRepo = new AccountRepository(db);
  const ledgerEntryRepo = new LedgerEntryRepository(db);
  const transactionRepo = new TransactionRepository(db);
  const idempotencyRepo = new IdempotencyRepository(db);

  // Services
  const authService = new AuthService(userRepo);
  const riskService = new RiskAssessmentService(transactionRepo);
  const accountService = new AccountService(accountRepo);
  const transferService = new TransferService(
    accountRepo, ledgerEntryRepo, transactionRepo, riskService, client
  );
  const depositService = new DepositService(
    accountRepo, ledgerEntryRepo, transactionRepo, client
  );

  // Controllers
  const authController = new AuthController(authService);
  const accountController = new AccountController(accountService);
  const transferController = new TransferController(transferService);
  const depositController = new DepositController(depositService);

  // Wire routes...
}
```

This is explicit, testable, and has zero magic. In tests, you inject mocks directly.
