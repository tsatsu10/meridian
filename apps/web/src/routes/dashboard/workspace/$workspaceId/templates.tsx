import { createFileRoute } from '@tanstack/react-router';
import { TemplateBrowser } from '../../../../components/templates/template-browser';

export const Route = createFileRoute('/dashboard/workspace/$workspaceId/templates')({
  component: TemplatesPage,
});

function TemplatesPage() {
  return (
    <div className="p-6">
      <TemplateBrowser />
    </div>
  );
}
