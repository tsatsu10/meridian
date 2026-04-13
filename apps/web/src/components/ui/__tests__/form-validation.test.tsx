/**
 * Form Validation Tests
 * 
 * Tests form components and validation:
 * - Input validation
 * - Form submission
 * - Error handling
 * - Accessibility
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TestWrapper } from '../../../test-utils/test-wrapper';
import { Button } from '../button';
import { Input } from '../input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '../form';

// Test form schema
const testSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type TestFormData = z.infer<typeof testSchema>;

// Test form component
function TestForm({ onSubmit }: { onSubmit: (data: TestFormData) => void }) {
  const form = useForm<TestFormData>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder="you@example.com" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input {...field} type="password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input {...field} type="password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}

describe('Form Validation', () => {
  it('should render form fields', () => {
    const onSubmit = vi.fn();
    render(<TestForm onSubmit={onSubmit} />, { wrapper: TestWrapper });

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    
    render(<TestForm onSubmit={onSubmit} />, { wrapper: TestWrapper });

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should validate password length', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    
    render(<TestForm onSubmit={onSubmit} />, { wrapper: TestWrapper });

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'short');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should validate password confirmation match', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    
    render(<TestForm onSubmit={onSubmit} />, { wrapper: TestWrapper });

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'ValidPassword123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'DifferentPassword123!');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should submit valid form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    
    render(<TestForm onSubmit={onSubmit} />, { wrapper: TestWrapper });

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'ValidPassword123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'ValidPassword123!');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!',
      });
    });
  });

  it('should clear errors on valid input', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    
    render(<TestForm onSubmit={onSubmit} />, { wrapper: TestWrapper });

    const emailInput = screen.getByLabelText(/email/i);

    // Type invalid email
    await user.type(emailInput, 'invalid');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });

    // Fix the email
    await user.clear(emailInput);
    await user.type(emailInput, 'valid@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'ValidPassword123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'ValidPassword123!');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.queryByText(/invalid email address/i)).not.toBeInTheDocument();
    });

    expect(onSubmit).toHaveBeenCalled();
  });

  it('should be accessible', () => {
    const onSubmit = vi.fn();
    const { container } = render(<TestForm onSubmit={onSubmit} />, { wrapper: TestWrapper });

    // All form fields should have associated labels
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);

    expect(emailInput).toHaveAttribute('type', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(confirmInput).toHaveAttribute('type', 'password');

    // Form should have proper structure
    const form = container.querySelector('form');
    expect(form).toBeInTheDocument();

    // Button should be accessible
    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toHaveAttribute('type', 'submit');
  });

  it('should handle rapid input changes', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    
    render(<TestForm onSubmit={onSubmit} />, { wrapper: TestWrapper });

    const emailInput = screen.getByLabelText(/email/i);

    // Type and delete rapidly
    await user.type(emailInput, 'test');
    await user.clear(emailInput);
    await user.type(emailInput, 'test@example.com');

    expect(emailInput).toHaveValue('test@example.com');
  });

  it('should prevent double submission', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<TestForm onSubmit={onSubmit} />, { wrapper: TestWrapper });

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'ValidPassword123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'ValidPassword123!');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    
    // Click twice rapidly
    await user.click(submitButton);
    await user.click(submitButton);

    // Should only submit once
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });
});

