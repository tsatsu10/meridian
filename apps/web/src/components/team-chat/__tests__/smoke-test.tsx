// Smoke Test - Verify team-chat components can be imported and rendered

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import TeamChatContainer from '../TeamChatContainer';

describe('TeamChat Smoke Test', () => {
  it('exports TeamChatContainer', () => {
    expect(TeamChatContainer).toBeDefined();
  });

  it('renders without crashing', () => {
    // This will verify all imports work
    const { container } = render(
      <TeamChatContainer teamId="test-123" teamName="Test Team" />
    );
    
    expect(container).toBeTruthy();
  });
});

