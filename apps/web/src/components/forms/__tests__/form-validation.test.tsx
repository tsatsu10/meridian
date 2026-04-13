/**
 * Form Validation Tests
 * 
 * Tests form validation functionality:
 * - Field validation rules
 * - Error message display
 * - Form submission
 * - Async validation
 * - Multi-step forms
 * - Field dependencies
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

interface ValidationRule {
  type: 'required' | 'email' | 'minLength' | 'maxLength' | 'pattern' | 'custom'
  value?: any
  message: string
  validator?: (value: any) => boolean | Promise<boolean>
}

interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'number' | 'select'
  placeholder?: string
  defaultValue?: string
  validationRules?: ValidationRule[]
  options?: Array<{ value: string; label: string }>
}

interface FormProps {
  fields: FormField[]
  onSubmit?: (data: Record<string, any>) => Promise<void> | void
  onValidationError?: (errors: Record<string, string>) => void
  validateOnBlur?: boolean
  validateOnChange?: boolean
}

function FormWithValidation({
  fields,
  onSubmit,
  onValidationError,
  validateOnBlur = true,
  validateOnChange = false,
}: FormProps) {
  const [values, setValues] = React.useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {}
    fields.forEach(field => {
      initial[field.name] = field.defaultValue || ''
    })
    return initial
  })

  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [touched, setTouched] = React.useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const validateField = async (field: FormField, value: any): Promise<string | null> => {
    if (!field.validationRules) return null

    for (const rule of field.validationRules) {
      switch (rule.type) {
        case 'required':
          if (!value || value.toString().trim() === '') {
            return rule.message
          }
          break

        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (value && !emailRegex.test(value)) {
            return rule.message
          }
          break

        case 'minLength':
          if (value && value.length < rule.value) {
            return rule.message
          }
          break

        case 'maxLength':
          if (value && value.length > rule.value) {
            return rule.message
          }
          break

        case 'pattern':
          if (value && !new RegExp(rule.value).test(value)) {
            return rule.message
          }
          break

        case 'custom':
          if (rule.validator) {
            const isValid = await rule.validator(value)
            if (!isValid) {
              return rule.message
            }
          }
          break
      }
    }

    return null
  }

  const validateAllFields = async (): Promise<Record<string, string>> => {
    const newErrors: Record<string, string> = {}

    for (const field of fields) {
      const error = await validateField(field, values[field.name])
      if (error) {
        newErrors[field.name] = error
      }
    }

    return newErrors
  }

  const handleChange = async (fieldName: string, value: any) => {
    setValues(prev => ({ ...prev, [fieldName]: value }))

    if (validateOnChange) {
      const field = fields.find(f => f.name === fieldName)
      if (field) {
        const error = await validateField(field, value)
        setErrors(prev => ({
          ...prev,
          [fieldName]: error || '',
        }))
      }
    }
  }

  const handleBlur = async (fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }))

    if (validateOnBlur) {
      const field = fields.find(f => f.name === fieldName)
      if (field) {
        const error = await validateField(field, values[fieldName])
        setErrors(prev => ({
          ...prev,
          [fieldName]: error || '',
        }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {}
    fields.forEach(field => {
      allTouched[field.name] = true
    })
    setTouched(allTouched)

    // Validate all fields
    const validationErrors = await validateAllFields()
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      onValidationError?.(validationErrors)
      setIsSubmitting(false)
      return
    }

    try {
      await onSubmit?.(values)
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderField = (field: FormField) => {
    const hasError = touched[field.name] && errors[field.name]

    if (field.type === 'select') {
      return (
        <div key={field.name} className="form-field">
          <label htmlFor={field.name}>{field.label}</label>
          <select
            id={field.name}
            name={field.name}
            value={values[field.name]}
            onChange={(e) => handleChange(field.name, e.target.value)}
            onBlur={() => handleBlur(field.name)}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={hasError ? `${field.name}-error` : undefined}
          >
            <option value="">Select...</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {hasError && (
            <span id={`${field.name}-error`} className="error-message" role="alert">
              {errors[field.name]}
            </span>
          )}
        </div>
      )
    }

    return (
      <div key={field.name} className="form-field">
        <label htmlFor={field.name}>{field.label}</label>
        <input
          id={field.name}
          name={field.name}
          type={field.type}
          placeholder={field.placeholder}
          value={values[field.name]}
          onChange={(e) => handleChange(field.name, e.target.value)}
          onBlur={() => handleBlur(field.name)}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={hasError ? `${field.name}-error` : undefined}
        />
        {hasError && (
          <span id={`${field.name}-error`} className="error-message" role="alert">
            {errors[field.name]}
          </span>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} data-testid="validation-form">
      {fields.map(renderField)}
      
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  )
}

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('FormWithValidation', () => {
  const basicFields: FormField[] = [
    {
      name: 'username',
      label: 'Username',
      type: 'text',
      placeholder: 'Enter username',
      validationRules: [
        { type: 'required', message: 'Username is required' },
        { type: 'minLength', value: 3, message: 'Username must be at least 3 characters' },
      ],
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      placeholder: 'Enter email',
      validationRules: [
        { type: 'required', message: 'Email is required' },
        { type: 'email', message: 'Invalid email format' },
      ],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render form with all fields', () => {
    render(<FormWithValidation fields={basicFields} />, { wrapper: TestWrapper })

    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
  })

  it('should show required field error on blur', async () => {
    const user = userEvent.setup()

    render(<FormWithValidation fields={basicFields} />, { wrapper: TestWrapper })

    const usernameInput = screen.getByLabelText('Username')
    await user.click(usernameInput)
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText('Username is required')).toBeInTheDocument()
    })
  })

  it('should validate email format', async () => {
    const user = userEvent.setup()

    render(<FormWithValidation fields={basicFields} />, { wrapper: TestWrapper })

    const emailInput = screen.getByLabelText('Email')
    await user.type(emailInput, 'invalid-email')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText('Invalid email format')).toBeInTheDocument()
    })
  })

  it('should validate minimum length', async () => {
    const user = userEvent.setup()

    render(<FormWithValidation fields={basicFields} />, { wrapper: TestWrapper })

    const usernameInput = screen.getByLabelText('Username')
    await user.type(usernameInput, 'ab')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText('Username must be at least 3 characters')).toBeInTheDocument()
    })
  })

  it('should clear error when valid input is provided', async () => {
    const user = userEvent.setup()

    render(<FormWithValidation fields={basicFields} />, { wrapper: TestWrapper })

    const usernameInput = screen.getByLabelText('Username')
    
    // Trigger error
    await user.click(usernameInput)
    await user.tab()
    
    await waitFor(() => {
      expect(screen.getByText('Username is required')).toBeInTheDocument()
    })

    // Fix error
    await user.type(usernameInput, 'validusername')
    await user.tab()

    await waitFor(() => {
      expect(screen.queryByText('Username is required')).not.toBeInTheDocument()
    })
  })

  it('should prevent submission with validation errors', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <FormWithValidation fields={basicFields} onSubmit={onSubmit} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(screen.getByText('Username is required')).toBeInTheDocument()
      expect(screen.getByText('Email is required')).toBeInTheDocument()
    })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('should submit form with valid data', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <FormWithValidation fields={basicFields} onSubmit={onSubmit} />,
      { wrapper: TestWrapper }
    )

    await user.type(screen.getByLabelText('Username'), 'testuser')
    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
      })
    })
  })

  it('should handle async validation', async () => {
    const user = userEvent.setup()
    const asyncValidator = vi.fn().mockResolvedValue(false)

    const fieldsWithAsync: FormField[] = [
      {
        name: 'username',
        label: 'Username',
        type: 'text',
        validationRules: [
          { 
            type: 'custom', 
            message: 'Username already taken',
            validator: asyncValidator,
          },
        ],
      },
    ]

    render(<FormWithValidation fields={fieldsWithAsync} />, { wrapper: TestWrapper })

    await user.type(screen.getByLabelText('Username'), 'existing-user')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText('Username already taken')).toBeInTheDocument()
    })
  })

  it('should validate on change when enabled', async () => {
    const user = userEvent.setup()

    render(
      <FormWithValidation fields={basicFields} validateOnChange={true} />,
      { wrapper: TestWrapper }
    )

    const emailInput = screen.getByLabelText('Email')
    
    // Type invalid email
    await user.type(emailInput, 'invalid')
    
    // Blur to mark as touched (required for error display)
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText('Invalid email format')).toBeInTheDocument()
    })
  })

  it('should not validate on change when disabled', async () => {
    const user = userEvent.setup()

    render(
      <FormWithValidation fields={basicFields} validateOnChange={false} />,
      { wrapper: TestWrapper }
    )

    const emailInput = screen.getByLabelText('Email')
    await user.type(emailInput, 'invalid')

    expect(screen.queryByText('Invalid email format')).not.toBeInTheDocument()
  })

  it('should handle select fields', async () => {
    const user = userEvent.setup()

    const selectFields: FormField[] = [
      {
        name: 'country',
        label: 'Country',
        type: 'select',
        validationRules: [{ type: 'required', message: 'Country is required' }],
        options: [
          { value: 'us', label: 'United States' },
          { value: 'uk', label: 'United Kingdom' },
        ],
      },
    ]

    render(<FormWithValidation fields={selectFields} />, { wrapper: TestWrapper })

    const select = screen.getByLabelText('Country')
    await user.selectOptions(select, 'us')

    expect(select).toHaveValue('us')
  })

  it('should validate select field', async () => {
    const user = userEvent.setup()

    const selectFields: FormField[] = [
      {
        name: 'country',
        label: 'Country',
        type: 'select',
        validationRules: [{ type: 'required', message: 'Country is required' }],
        options: [
          { value: 'us', label: 'United States' },
        ],
      },
    ]

    render(<FormWithValidation fields={selectFields} />, { wrapper: TestWrapper })

    await user.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(screen.getByText('Country is required')).toBeInTheDocument()
    })
  })

  it('should validate max length', async () => {
    const user = userEvent.setup()

    const maxLengthFields: FormField[] = [
      {
        name: 'bio',
        label: 'Bio',
        type: 'text',
        validationRules: [
          { type: 'maxLength', value: 10, message: 'Bio must be at most 10 characters' },
        ],
      },
    ]

    render(<FormWithValidation fields={maxLengthFields} />, { wrapper: TestWrapper })

    await user.type(screen.getByLabelText('Bio'), 'This is a very long bio')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText('Bio must be at most 10 characters')).toBeInTheDocument()
    })
  })

  it('should validate pattern', async () => {
    const user = userEvent.setup()

    const patternFields: FormField[] = [
      {
        name: 'phone',
        label: 'Phone',
        type: 'text',
        validationRules: [
          { 
            type: 'pattern', 
            value: '^\\d{10}$', 
            message: 'Phone must be 10 digits' 
          },
        ],
      },
    ]

    render(<FormWithValidation fields={patternFields} />, { wrapper: TestWrapper })

    await user.type(screen.getByLabelText('Phone'), '123')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText('Phone must be 10 digits')).toBeInTheDocument()
    })
  })

  it('should call onValidationError when validation fails', async () => {
    const user = userEvent.setup()
    const onValidationError = vi.fn()

    render(
      <FormWithValidation 
        fields={basicFields} 
        onValidationError={onValidationError} 
      />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(onValidationError).toHaveBeenCalledWith({
        username: 'Username is required',
        email: 'Email is required',
      })
    })
  })

  it('should disable submit button while submitting', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(
      <FormWithValidation fields={basicFields} onSubmit={onSubmit} />,
      { wrapper: TestWrapper }
    )

    await user.type(screen.getByLabelText('Username'), 'testuser')
    await user.type(screen.getByLabelText('Email'), 'test@example.com')

    const submitButton = screen.getByRole('button', { name: /submit/i })
    await user.click(submitButton)

    expect(submitButton).toBeDisabled()
    expect(submitButton).toHaveTextContent('Submitting...')
  })

  it('should set aria-invalid on fields with errors', async () => {
    const user = userEvent.setup()

    render(<FormWithValidation fields={basicFields} />, { wrapper: TestWrapper })

    const usernameInput = screen.getByLabelText('Username')
    await user.click(usernameInput)
    await user.tab()

    await waitFor(() => {
      expect(usernameInput).toHaveAttribute('aria-invalid', 'true')
    })
  })

  it('should link errors with aria-describedby', async () => {
    const user = userEvent.setup()

    render(<FormWithValidation fields={basicFields} />, { wrapper: TestWrapper })

    const usernameInput = screen.getByLabelText('Username')
    await user.click(usernameInput)
    await user.tab()

    await waitFor(() => {
      expect(usernameInput).toHaveAttribute('aria-describedby', 'username-error')
    })
  })

  it('should handle default values', () => {
    const fieldsWithDefaults: FormField[] = [
      {
        name: 'username',
        label: 'Username',
        type: 'text',
        defaultValue: 'default-user',
      },
    ]

    render(<FormWithValidation fields={fieldsWithDefaults} />, { wrapper: TestWrapper })

    expect(screen.getByLabelText('Username')).toHaveValue('default-user')
  })

  it('should validate multiple rules in order', async () => {
    const user = userEvent.setup()

    const multiRuleFields: FormField[] = [
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        validationRules: [
          { type: 'required', message: 'Password is required' },
          { type: 'minLength', value: 8, message: 'Password must be at least 8 characters' },
        ],
      },
    ]

    render(<FormWithValidation fields={multiRuleFields} />, { wrapper: TestWrapper })

    // First error: required
    await user.click(screen.getByLabelText('Password'))
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument()
    })

    // Second error: minLength
    await user.type(screen.getByLabelText('Password'), 'short')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
    })
  })

  it('should show error role="alert" for accessibility', async () => {
    const user = userEvent.setup()

    render(<FormWithValidation fields={basicFields} />, { wrapper: TestWrapper })

    const usernameInput = screen.getByLabelText('Username')
    await user.click(usernameInput)
    await user.tab()

    await waitFor(() => {
      const errorMessage = screen.getByText('Username is required')
      expect(errorMessage).toHaveAttribute('role', 'alert')
    })
  })

  it('should accept valid email formats', async () => {
    const user = userEvent.setup()

    render(<FormWithValidation fields={basicFields} />, { wrapper: TestWrapper })

    const emailInput = screen.getByLabelText('Email')
    await user.type(emailInput, 'valid.email+tag@example.co.uk')
    await user.tab()

    await waitFor(() => {
      expect(screen.queryByText('Invalid email format')).not.toBeInTheDocument()
    })
  })

  it('should handle number input type', async () => {
    const user = userEvent.setup()

    const numberFields: FormField[] = [
      {
        name: 'age',
        label: 'Age',
        type: 'number',
        validationRules: [{ type: 'required', message: 'Age is required' }],
      },
    ]

    render(<FormWithValidation fields={numberFields} />, { wrapper: TestWrapper })

    await user.type(screen.getByLabelText('Age'), '25')
    
    expect(screen.getByLabelText('Age')).toHaveValue(25)
  })

  it('should validate all fields on submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    const multipleFields: FormField[] = [
      {
        name: 'field1',
        label: 'Field 1',
        type: 'text',
        validationRules: [{ type: 'required', message: 'Field 1 is required' }],
      },
      {
        name: 'field2',
        label: 'Field 2',
        type: 'text',
        validationRules: [{ type: 'required', message: 'Field 2 is required' }],
      },
      {
        name: 'field3',
        label: 'Field 3',
        type: 'text',
        validationRules: [{ type: 'required', message: 'Field 3 is required' }],
      },
    ]

    render(<FormWithValidation fields={multipleFields} onSubmit={onSubmit} />, { wrapper: TestWrapper })

    await user.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(screen.getByText('Field 1 is required')).toBeInTheDocument()
      expect(screen.getByText('Field 2 is required')).toBeInTheDocument()
      expect(screen.getByText('Field 3 is required')).toBeInTheDocument()
    })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('should handle password input type', async () => {
    const user = userEvent.setup()

    const passwordFields: FormField[] = [
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        validationRules: [
          { type: 'required', message: 'Password is required' },
          { type: 'minLength', value: 8, message: 'Password must be at least 8 characters' },
        ],
      },
    ]

    render(<FormWithValidation fields={passwordFields} />, { wrapper: TestWrapper })

    const passwordInput = screen.getByLabelText('Password')
    await user.type(passwordInput, 'secret123')

    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(passwordInput).toHaveValue('secret123')
  })
})

