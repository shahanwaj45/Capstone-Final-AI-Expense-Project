import type { User, UserRole } from "@/types";

interface DemoAccount {
  email: string;
  password: string;
  user: User;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "student@test.com",
    password: "student123",
    user: {
      id: "persona-student-001",
      email: "student@test.com",
      name: "Aarav Rao",
      initials: "AR",
      role: "student",
      monthly_allowance: 11500,
    },
  },
  {
    email: "prof@test.com",
    password: "prof123",
    user: {
      id: "persona-prof-001",
      email: "prof@test.com",
      name: "Vikram Malhotra",
      initials: "VM",
      role: "professional",
      monthly_allowance: 115000,
    },
  },
];

export function authenticateUser(
  email: string,
  password: string,
): User | null {
  const account = DEMO_ACCOUNTS.find(
    (a) =>
      a.email.toLowerCase() === email.toLowerCase() &&
      a.password === password,
  );
  return account ? { ...account.user } : null;
}

export function getDemoCredentials(): Array<{
  email: string;
  password: string;
  role: UserRole;
}> {
  return DEMO_ACCOUNTS.map((a) => ({
    email: a.email,
    password: a.password,
    role: a.user.role,
  }));
}
