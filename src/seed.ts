import { env } from "./config/environment.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { AccountStatus } from "./domain/enums/account-status.enum.js";
import { AccountRepository } from "./repositories/account.repository.js";
import { UserRepository } from "./repositories/user.repository.js";
import { hashPassword } from "./utils/hash.js";
import { logger } from "./utils/logger.js";

if (env.NODE_ENV === "production") {
  logger.fatal("Seed script must not run in production");
  process.exit(1);
}

interface SeedUserDefinition {
  email: string;
  fullName: string;
  password: string;
  accountNumber: string;
  currency: string;
}

const seedUsers: SeedUserDefinition[] = [
  {
    email: "alice.seed@ledger.local",
    fullName: "Alice Seed",
    password: "SeedPassword123!",
    accountNumber: "100000000001",
    currency: "USD",
  },
  {
    email: "bob.seed@ledger.local",
    fullName: "Bob Seed",
    password: "SeedPassword123!",
    accountNumber: "100000000002",
    currency: "USD",
  },
];

async function runSeed(): Promise<void> {
  const { client, db } = await connectDatabase();
  const userRepo = new UserRepository(db);
  const accountRepo = new AccountRepository(db);

  const summary = {
    createdUsers: 0,
    existingUsers: 0,
    createdAccounts: 0,
    existingAccounts: 0,
  };

  try {
    for (const definition of seedUsers) {
      const session = client.startSession();

      try {
        await session.withTransaction(async () => {
          let user = await userRepo.findByEmail(definition.email, session);

          if (!user) {
            const now = new Date();
            const passwordHash = await hashPassword(definition.password);

            user = await userRepo.create(
              {
                email: definition.email,
                fullName: definition.fullName,
                passwordHash,
                createdAt: now,
                updatedAt: now,
              },
              session
            );

            summary.createdUsers += 1;
          } else {
            summary.existingUsers += 1;
          }

          const account = await accountRepo.findByAccountNumber(
            definition.accountNumber,
            session
          );

          if (!account) {
            const now = new Date();

            await accountRepo.create(
              {
                userId: user._id,
                accountNumber: definition.accountNumber,
                balance: 0,
                currency: definition.currency,
                status: AccountStatus.ACTIVE,
                createdAt: now,
                updatedAt: now,
              },
              session
            );

            summary.createdAccounts += 1;
          } else {
            summary.existingAccounts += 1;
          }
        });
      } finally {
        await session.endSession();
      }
    }

    logger.info(
      {
        summary,
        seededUsers: seedUsers.map(
          ({ email, fullName, accountNumber, currency }) => ({
            email,
            fullName,
            accountNumber,
            currency,
          })
        ),
      },
      "Database seed completed"
    );
  } finally {
    await disconnectDatabase();
  }
}

runSeed().catch(async (error: unknown) => {
  logger.error({ err: error }, "Database seed failed");

  try {
    await disconnectDatabase();
  } finally {
    process.exitCode = 1;
  }
});
