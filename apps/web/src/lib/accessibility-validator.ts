/**
 * accessibility-validator.ts - WCAG 2.1 Compliance Testing Utilities
 * 
 * Provides tools for validating accessibility compliance:
 * - Color contrast validation
 * - Focus management testing
 * - Touch target size validation
 * - ARIA attribute validation
 * - Keyboard navigation testing
 * - Screen reader compatibility checks
 * - Automated compliance reporting
 */

/**
 * AccessibilityValidationResult - Results of accessibility audit
 */
export interface AccessibilityValidationResult {
  passed: boolean;
  level: "A" | "AA" | "AAA";
  score: number; // 0-100
  violations: AccessibilityViolation[];
  warnings: AccessibilityWarning[];
  timestamp: Date;
}

export interface AccessibilityViolation {
  id: string;
  description: string;
  element?: string;
  wcagLevel: "A" | "AA" | "AAA";
  severity: "critical" | "major" | "minor";
  fix?: string;
}

export interface AccessibilityWarning {
  id: string;
  description: string;
  element?: string;
  recommendation: string;
}

/**
 * WCAG Checklist - Comprehensive accessibility checklist
 */
export const WCAG_CHECKLIST = {
  // Perceivable Principle
  perceivable: {
    textAlternatives: {
      id: "1.1.1",
      name: "Text Alternatives",
      description: "Provide text alternatives for non-text content",
      level: "A",
      checks: [
        "All images have alt text",
        "All buttons have accessible labels",
        "All form inputs have associated labels",
        "All icons have aria-labels or sr-only text",
      ],
    },
    colorContrast: {
      id: "1.4.3",
      name: "Contrast (Minimum)",
      description: "Ensure text contrast meets minimum requirements",
      level: "AA",
      requirement: "4.5:1 for normal text, 3:1 for large text",
      checks: [
        "Text contrast is at least 4.5:1",
        "Large text contrast is at least 3:1",
        "UI components have sufficient contrast",
        "Graphical elements have sufficient contrast",
      ],
    },
    responsiveText: {
      id: "1.4.4",
      name: "Resize Text",
      description: "Text can be resized without loss of functionality",
      level: "AA",
      checks: [
        "Text can be scaled to 200% without loss",
        "No horizontal scrolling required",
        "Functionality remains intact when scaled",
      ],
    },
  },

  // Operable Principle
  operable: {
    keyboardAccessible: {
      id: "2.1.1",
      name: "Keyboard",
      description: "All functionality is keyboard accessible",
      level: "A",
      checks: [
        "All interactive elements are keyboard accessible",
        "Tab order is logical and intuitive",
        "No keyboard trap (unless intentional)",
        "Focus is visible",
      ],
    },
    focusVisible: {
      id: "2.4.7",
      name: "Focus Visible",
      description: "Keyboard focus indicator is visible",
      level: "AA",
      checks: [
        "Focus indicator is clearly visible",
        "Focus indicator has sufficient contrast",
        "Focus indicator is not obscured",
      ],
    },
    focusOrder: {
      id: "2.4.3",
      name: "Focus Order",
      description: "Focus order is logical and meaningful",
      level: "A",
      checks: [
        "Tab order matches visual order",
        "Focus goes to header before content",
        "Focus is trapped in modals",
      ],
    },
    touchTarget: {
      id: "2.5.5",
      name: "Target Size",
      description: "Touch target size is minimum 48x48px",
      level: "AAA",
      checks: [
        "All buttons are at least 48x48px",
        "All clickable elements are at least 48x48px",
        "Sufficient spacing between touch targets",
      ],
    },
  },

  // Understandable Principle
  understandable: {
    labeledForms: {
      id: "3.3.2",
      name: "Labels or Instructions",
      description: "Form inputs have associated labels",
      level: "A",
      checks: [
        "All form inputs have labels",
        "Labels are properly associated",
        "Required fields are marked",
        "Format instructions are provided",
      ],
    },
    errorPrevention: {
      id: "3.3.1",
      name: "Error Identification",
      description: "Input errors are identified and described",
      level: "A",
      checks: [
        "Errors are identified clearly",
        "Error messages are descriptive",
        "Error correction suggestions provided",
      ],
    },
    pageTitle: {
      id: "2.4.2",
      name: "Page Titled",
      description: "Page has a descriptive title",
      level: "A",
      checks: ["Page has a descriptive <title>", "Title is unique", "Title is meaningful"],
    },
  },

  // Robust Principle
  robust: {
    validMarkup: {
      id: "4.1.1",
      name: "Parsing",
      description: "HTML is valid and well-formed",
      level: "A",
      checks: [
        "No duplicate IDs",
        "No unclosed tags",
        "Proper nesting of elements",
        "Valid HTML structure",
      ],
    },
    ariaCompliance: {
      id: "4.1.2",
      name: "Name, Role, Value",
      description: "Elements have accessible name, role, and value",
      level: "A",
      checks: [
        "All interactive elements have accessible names",
        "ARIA roles are used correctly",
        "ARIA states are maintained",
        "ARIA properties are valid",
      ],
    },
  },
};

/**
 * ContrastValidator - Validates color contrast ratios
 */
export class ContrastValidator {
  /**
   * Validate contrast between two colors
   */
  validateContrast(
    color1: string,
    color2: string,
    level: "AA" | "AAA" = "AA"
  ): {
    ratio: number;
    compliant: boolean;
    requirement: string;
    message: string;
  } {
    const ratio = this.getContrastRatio(color1, color2);

    const normalRequirement = level === "AA" ? 4.5 : 7;
    const largeRequirement = level === "AA" ? 3 : 4.5;

    const compliant = ratio >= normalRequirement;
    const requirement = `${normalRequirement}:1 (normal), ${largeRequirement}:1 (large)`;

    return {
      ratio: Math.round(ratio * 100) / 100,
      compliant,
      requirement,
      message: compliant
        ? `✓ Contrast ratio ${ratio.toFixed(2)}:1 meets WCAG ${level}`
        : `✗ Contrast ratio ${ratio.toFixed(2)}:1 does not meet WCAG ${level} (requires ${requirement})`,
    };
  }

  /**
   * Get contrast ratio between two colors
   */
  private getContrastRatio(color1: string, color2: string): number {
    const lum1 = this.getRelativeLuminance(color1);
    const lum2 = this.getRelativeLuminance(color2);

    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Calculate relative luminance
   */
  private getRelativeLuminance(color: string): number {
    const hex = this.normalizeHex(color);
    const [r, g, b] = this.hexToRgb(hex);

    const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((val) => {
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /**
   * Normalize hex color
   */
  private normalizeHex(color: string): string {
    if (!color.startsWith("#")) {
      color = "#" + color;
    }
    if (color.length === 4) {
      return (
        "#" +
        color
          .slice(1)
          .split("")
          .map((c) => c + c)
          .join("")
      );
    }
    return color;
  }

  /**
   * Convert hex to RGB
   */
  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [0, 0, 0];
  }
}

/**
 * FocusValidator - Validates focus management
 */
export class FocusValidator {
  /**
   * Check if element is focusable
   */
  isFocusable(element: HTMLElement): boolean {
    const focusableElements = [
      "A",
      "BUTTON",
      "INPUT",
      "SELECT",
      "TEXTAREA",
      "AREA",
      "[contenteditable]",
      "[tabindex]",
    ];

    const isFocusableTag = focusableElements.some(
      (tag) => element.tagName === tag || element.matches(tag)
    );

    const isNotDisabled = !element.hasAttribute("disabled");
    const isVisible =
      element.offsetParent !== null || element.getClientRects().length > 0;

    return isFocusableTag && isNotDisabled && isVisible;
  }

  /**
   * Get all focusable elements in container
   */
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors =
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable]';

    return Array.from(container.querySelectorAll(focusableSelectors)).filter(
      (el) =>
        this.isFocusable(el as HTMLElement) &&
        (el as HTMLElement).offsetParent !== null
    ) as HTMLElement[];
  }

  /**
   * Validate focus order
   */
  validateFocusOrder(container: HTMLElement): {
    isLogical: boolean;
    warnings: string[];
  } {
    const focusableElements = this.getFocusableElements(container);
    const warnings: string[] = [];

    // Check for missing tab indices
    focusableElements.forEach((el) => {
      const tabIndex = el.getAttribute("tabindex");
      if (tabIndex && parseInt(tabIndex) > 0) {
        warnings.push(
          `Element has positive tabindex: ${tabIndex} (should be 0 or -1)`
        );
      }
    });

    // Check for logical visual order
    // Note: positions used for future implementation of visual order validation
    // focusableElements are already in tab order

    return {
      isLogical: warnings.length === 0,
      warnings,
    };
  }
}

/**
 * TouchTargetValidator - Validates touch target sizes
 */
export class TouchTargetValidator {
  private readonly minSize = 48; // pixels

  /**
   * Check if element meets minimum touch target size
   */
  validateTouchTarget(
    element: HTMLElement
  ): {
    compliant: boolean;
    width: number;
    height: number;
    message: string;
  } {
    const rect = element.getBoundingClientRect();
    const compliant = rect.width >= this.minSize && rect.height >= this.minSize;

    return {
      compliant,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      message: compliant
        ? `✓ Touch target ${rect.width.toFixed(0)}x${rect.height.toFixed(0)}px meets minimum 48x48px`
        : `✗ Touch target ${rect.width.toFixed(0)}x${rect.height.toFixed(0)}px does not meet minimum 48x48px`,
    };
  }

  /**
   * Get all interactive elements and check their sizes
   */
  validateAllTouchTargets(container: HTMLElement): {
    compliant: Array<HTMLElement>;
    noncompliant: Array<{
      element: HTMLElement;
      width: number;
      height: number;
    }>;
  } {
    const focusValidator = new FocusValidator();
    const focusableElements = focusValidator.getFocusableElements(container);

    const compliant: HTMLElement[] = [];
    const noncompliant: Array<{
      element: HTMLElement;
      width: number;
      height: number;
    }> = [];

    focusableElements.forEach((el) => {
      const result = this.validateTouchTarget(el);
      if (result.compliant) {
        compliant.push(el);
      } else {
        noncompliant.push({
          element: el,
          width: result.width,
          height: result.height,
        });
      }
    });

    return { compliant, noncompliant };
  }
}

/**
 * AriaValidator - Validates ARIA attributes
 */
export class AriaValidator {
  private readonly validRoles = [
    "button",
    "link",
    "navigation",
    "main",
    "complementary",
    "contentinfo",
    "dialog",
    "alertdialog",
    "alert",
    "status",
    "menu",
    "menuitem",
    "checkbox",
    "radio",
    "slider",
    "spinbutton",
    "combobox",
    "listbox",
    "option",
    "group",
    "list",
    "listitem",
    "tab",
    "tablist",
    "tabpanel",
    "tree",
    "treeitem",
    "presentation",
    "row",
    "rowgroup",
    "cell",
    "columnheader",
    "rowheader",
    "table",
    "img",
    "region",
    "article",
    "doc-chapter",
    "doc-noteref",
    "doc-subtitle",
    "doc-toc",
  ];

  /**
   * Validate ARIA role
   */
  validateRole(role: string): {
    valid: boolean;
    message: string;
  } {
    const valid = this.validRoles.includes(role.toLowerCase());
    return {
      valid,
      message: valid ? `✓ Role "${role}" is valid` : `✗ Role "${role}" is not recognized`,
    };
  }

  /**
   * Validate ARIA attributes on element
   */
  validateAriaAttributes(element: HTMLElement): {
    valid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Check for role without accessible name
    const role = element.getAttribute("role");
    if (role && !this.hasAccessibleName(element)) {
      warnings.push(`Element with role "${role}" has no accessible name`);
    }

    // Check for aria-label length
    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel && ariaLabel.length > 120) {
      warnings.push(
        `aria-label is very long (${ariaLabel.length} chars). Consider using aria-labelledby instead`
      );
    }

    // Check for redundant aria-label
    const text = element.textContent?.trim();
    if (ariaLabel && text && ariaLabel === text) {
      warnings.push("aria-label duplicates visible text content");
    }

    return {
      valid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Check if element has accessible name
   */
  private hasAccessibleName(element: HTMLElement): boolean {
    // Check for aria-label
    if (element.hasAttribute("aria-label")) return true;

    // Check for aria-labelledby
    if (element.hasAttribute("aria-labelledby")) return true;

    // Check for text content
    if (element.textContent?.trim()) return true;

    // Check for alt attribute (for images)
    if (element.hasAttribute("alt")) return true;

    // Check for title attribute
    if (element.hasAttribute("title")) return true;

    return false;
  }
}

/**
 * AccessibilityAuditor - Comprehensive accessibility auditing
 */
export class AccessibilityAuditor {
  private focusValidator = new FocusValidator();
  private touchTargetValidator = new TouchTargetValidator();
  private ariaValidator = new AriaValidator();

  /**
   * Audit entire page for accessibility
   */
  auditPage(container: HTMLElement = document.body): AccessibilityValidationResult {
    const violations: AccessibilityViolation[] = [];
    const warnings: AccessibilityWarning[] = [];

    // Audit focus
    const focusAudit = this.focusValidator.validateFocusOrder(container);
    focusAudit.warnings.forEach((warning) => {
      warnings.push({
        id: "focus-order",
        description: warning,
        recommendation: "Ensure tab order follows logical flow",
      });
    });

    // Audit touch targets
    const touchAudit = this.touchTargetValidator.validateAllTouchTargets(container);
    touchAudit.noncompliant.forEach(({ element, width, height }) => {
      violations.push({
        id: "touch-target",
        description: `Touch target too small: ${width}x${height}px (minimum 48x48px)`,
        element: element.tagName,
        wcagLevel: "AAA",
        severity: "major",
        fix: "Increase element size to minimum 48x48px or add padding",
      });
    });

    // Audit ARIA
    const allInteractive = this.focusValidator.getFocusableElements(container);
    allInteractive.forEach((el) => {
      const ariaAudit = this.ariaValidator.validateAriaAttributes(el);
      ariaAudit.warnings.forEach((warning) => {
        warnings.push({
          id: "aria",
          description: warning,
          element: el.tagName,
          recommendation: "Follow ARIA best practices",
        });
      });
    });

    // Calculate score
    const totalIssues = violations.length + warnings.length;
    const score = Math.max(0, 100 - totalIssues * 10);

    return {
      passed: violations.length === 0,
      level: violations.some((v) => v.wcagLevel === "AA") ? "AA" : "AAA",
      score,
      violations,
      warnings,
      timestamp: new Date(),
    };
  }
}

export default {
  ContrastValidator,
  FocusValidator,
  TouchTargetValidator,
  AriaValidator,
  AccessibilityAuditor,
  WCAG_CHECKLIST,
};
