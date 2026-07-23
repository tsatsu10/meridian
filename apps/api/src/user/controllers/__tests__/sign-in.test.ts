/**
 * Sign-In Controller Tests
 * Unit tests for user authentication
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import bcrypt from "bcrypt";
import signIn from "../sign-in";
import { getErrorMessage } from "../../../utils/error-utils";
import { getErrorDetails, isOperationalError } from "../../../utils/errors";
import {
  createMockDb,
  mockUsers,
  resetMockDb,
} from "../../../tests/helpers/test-database";

// Mock the database connection
vi.mock("../../../database/connection", () => ({
  getDatabase: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

describe("SignIn Controller", () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  describe("Successful sign-in", () => {
    it("should successfully sign in with valid credentials", async () => {
      // Arrange
      const email = "test@example.com";
      const password = "password123";
      const hashedPassword = await bcrypt.hash(password, 10);

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([
        {
          ...mockUsers.validUser,
          password: hashedPassword,
        },
      ]);

      // Act
      const result = await signIn(email, password);

      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe(email);
      expect(result.id).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result).not.toHaveProperty("password"); // Password should not be in response
    });

    it("should return user without password field", async () => {
      // Arrange
      const email = "test@example.com";
      const password = "password123";
      const hashedPassword = await bcrypt.hash(password, 10);

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([
        {
          ...mockUsers.validUser,
          email,
          password: hashedPassword,
        },
      ]);

      // Act
      const result = await signIn(email, password);

      // Assert
      expect(result).not.toHaveProperty("password");
      expect(Object.keys(result)).toEqual(["id", "email", "name"]);
    });
  });

  describe("Failed sign-in attempts", () => {
    it("should throw error when user not found", async () => {
      // Arrange
      const email = "nonexistent@example.com";
      const password = "password123";

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([]); // No user found

      // Act & Assert
      await expect(signIn(email, password)).rejects.toThrow(
        "Invalid email or password",
      );
    });

    it("should throw error with incorrect password", async () => {
      // Arrange
      const email = "test@example.com";
      const correctPassword = "password123";
      const incorrectPassword = "wrongpassword";
      const hashedPassword = await bcrypt.hash(correctPassword, 10);

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([
        {
          ...mockUsers.validUser,
          password: hashedPassword,
        },
      ]);

      // Act & Assert
      await expect(signIn(email, incorrectPassword)).rejects.toThrow(
        "Invalid email or password",
      );
    });

    it("should reject invalid credentials with a 401-mapped error, not a 500", async () => {
      // A bare `throw new Error("Invalid credentials")` is invisible to the
      // global error handler's AppError check (utils/errors.ts), which maps
      // any plain Error to statusCode 500 and isOperational: false — so a
      // routine wrong-password attempt was surfacing as a 500 "unexpected
      // error", getting logged as a CRITICAL AUDIT EVENT
      // (security_violation/unexpected_error), instead of an ordinary,
      // operational 401 "unauthorized_access".
      const email = "test@example.com";
      const correctPassword = "password123";
      const incorrectPassword = "wrongpassword";
      const hashedPassword = await bcrypt.hash(correctPassword, 10);

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([
        {
          ...mockUsers.validUser,
          password: hashedPassword,
        },
      ]);

      let caught: unknown;
      try {
        await signIn(email, incorrectPassword);
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeDefined();
      const details = getErrorDetails(caught);
      expect(details.statusCode).toBe(401);
      expect(isOperationalError(caught as Error)).toBe(true);
    });

    it("should reject an unknown user with a 401-mapped error, not a 500", async () => {
      const email = "nonexistent@example.com";
      const password = "password123";

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([]);

      let caught: unknown;
      try {
        await signIn(email, password);
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeDefined();
      const details = getErrorDetails(caught);
      expect(details.statusCode).toBe(401);
      expect(isOperationalError(caught as Error)).toBe(true);
    });

    it("should give an identical error message for unknown-user and wrong-password (no account enumeration)", async () => {
      // "User not found" vs "Invalid credentials" lets a caller distinguish
      // a non-existent email from a real one with a wrong password, i.e.
      // enumerate valid accounts by trying candidate emails and reading
      // which message comes back. Both should read identically.
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValueOnce([]); // no such user

      const unknownEmailMessage = await signIn(
        "nonexistent@example.com",
        "password123",
      ).catch((error) => (error as Error).message);

      const hashedPassword = await bcrypt.hash("password123", 10);
      mockDb.limit.mockResolvedValueOnce([
        { ...mockUsers.validUser, password: hashedPassword },
      ]);

      const wrongPasswordMessage = await signIn(
        "test@example.com",
        "wrongpassword",
      ).catch((error) => (error as Error).message);

      expect(unknownEmailMessage).toBe(wrongPasswordMessage);
    });

    it("should handle database errors gracefully", async () => {
      // Arrange
      const email = "test@example.com";
      const password = "password123";

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockRejectedValue(new Error("Database connection failed"));

      // Act & Assert
      await expect(signIn(email, password)).rejects.toThrow(
        "Database connection failed",
      );
    });
  });

  describe("Input validation", () => {
    it("should handle empty email", async () => {
      // Arrange
      const email = "";
      const password = "password123";

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([]);

      // Act & Assert
      await expect(signIn(email, password)).rejects.toThrow(
        "Invalid email or password",
      );
    });

    it("should handle empty password", async () => {
      // Arrange
      const email = "test@example.com";
      const password = "";
      const hashedPassword = await bcrypt.hash("password123", 10);

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([
        {
          ...mockUsers.validUser,
          password: hashedPassword,
        },
      ]);

      // Act & Assert
      await expect(signIn(email, password)).rejects.toThrow(
        "Invalid email or password",
      );
    });

    it("should handle case-sensitive email", async () => {
      // Arrange
      const correctEmail = "test@example.com";
      const uppercaseEmail = "TEST@EXAMPLE.COM";
      const password = "password123";

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([]); // Assuming email is case-sensitive

      // Act & Assert
      await expect(signIn(uppercaseEmail, password)).rejects.toThrow(
        "Invalid email or password",
      );
    });
  });

  describe("Security", () => {
    it("should use bcrypt for password comparison", async () => {
      // Arrange
      const email = "test@example.com";
      const password = "password123";
      const hashedPassword = await bcrypt.hash(password, 10);
      const bcryptCompareSpy = vi.spyOn(bcrypt, "compare");

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([
        {
          ...mockUsers.validUser,
          password: hashedPassword,
        },
      ]);

      // Act
      await signIn(email, password);

      // Assert
      expect(bcryptCompareSpy).toHaveBeenCalledWith(password, hashedPassword);
      bcryptCompareSpy.mockRestore();
    });

    it("should not expose password hash in any errors", async () => {
      // Arrange
      const email = "test@example.com";
      const password = "wrongpassword";
      const hashedPassword = await bcrypt.hash("password123", 10);

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([
        {
          ...mockUsers.validUser,
          password: hashedPassword,
        },
      ]);

      // Act & Assert
      try {
        await signIn(email, password);
      } catch (error) {
        const message = getErrorMessage(error);
        expect(message).not.toContain(hashedPassword);
        expect(message).not.toContain("$2b$");
      }
    });
  });
});
