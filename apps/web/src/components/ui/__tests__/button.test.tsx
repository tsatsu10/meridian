import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../button'

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies default variant styling', () => {
    render(<Button>Default</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-meridian-primary')
    expect(button).toHaveClass('text-white')
  })

  it('applies secondary variant styling', () => {
    render(<Button variant="secondary">Secondary</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-meridian-neutral-100')
    expect(button).toHaveClass('text-meridian-neutral-900')
  })

  it('applies destructive variant styling', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-meridian-error')
    expect(button).toHaveClass('text-white')
  })

  it('applies outline variant styling', () => {
    render(<Button variant="outline">Outline</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('border-meridian-neutral-300')
    expect(button).toHaveClass('bg-transparent')
  })

  it('applies ghost variant styling', () => {
    render(<Button variant="ghost">Ghost</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-transparent')
    expect(button).toHaveClass('text-meridian-neutral-700')
  })

  it('applies link variant styling', () => {
    render(<Button variant="link">Link</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('text-meridian-primary')
    expect(button).toHaveClass('underline-offset-4')
  })

  it('applies small size', () => {
    render(<Button size="sm">Small</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-8')
    expect(button).toHaveClass('px-3')
  })

  it('applies large size', () => {
    render(<Button size="lg">Large</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-11')
    expect(button).toHaveClass('px-6')
  })

  it('applies icon size', () => {
    render(<Button size="icon">🚀</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-10')
    expect(button).toHaveClass('w-10')
  })

  it('renders as disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('disabled:pointer-events-none')
    expect(button).toHaveClass('disabled:opacity-50')
  })

  it('does not handle click when disabled', () => {
    const handleClick = vi.fn()
    render(<Button disabled onClick={handleClick}>Disabled</Button>)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('renders as different element when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    )
    
    const link = screen.getByRole('link', { name: /link button/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/test')
  })

  it('forwards custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })

  it('forwards custom props', () => {
    render(<Button data-testid="custom-button" type="submit">Submit</Button>)
    const button = screen.getByTestId('custom-button')
    expect(button).toHaveAttribute('type', 'submit')
  })

  it('supports keyboard navigation', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Keyboard</Button>)
    
    const button = screen.getByRole('button')
    button.focus()
    expect(button).toHaveFocus()
    
    // Native buttons handle keyboard events automatically
    // In a real browser, pressing Enter or Space would trigger onClick
    // For testing, we can simulate click directly to verify the handler works
    button.click()
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('has proper accessibility attributes', () => {
    render(<Button aria-label="Accessible button">🚀</Button>)
    const button = screen.getByRole('button', { name: /accessible button/i })
    expect(button).toBeInTheDocument()
  })

  it('supports loading state with proper accessibility', () => {
    render(<Button disabled aria-describedby="loading">Loading...</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-describedby', 'loading')
  })

  it('renders icon with text correctly', () => {
    render(
      <Button>
        <span>🚀</span>
        Launch
      </Button>
    )
    
    const button = screen.getByRole('button', { name: /🚀 launch/i })
    expect(button).toBeInTheDocument()
    expect(button.querySelector('span')).toHaveTextContent('🚀')
  })

  it('handles multiple click events correctly', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Multi Click</Button>)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(3)
  })
})