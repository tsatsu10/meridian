# Project subagents

These markdown files in `.cursor/agents/` are **Cursor custom subagents** ([docs](https://cursor.com/docs/context/subagents)). Cursor Agent can delegate to them (separate context) or you can invoke them explicitly.

## How to use

- **Invoke by name**: In chat, use `/name` or ask naturally, e.g. `/design-ui-designer` or “Follow the design-ui-designer subagent.”
- **This repo**: **`.cursor/rules/subagent-invocation.mdc`** tells the AI to **read the matching `.md` file** and run that specialist in-session if automatic delegation or a narrow Task-tool list does not pick them up—so `/design-ui-designer` still works reliably in Composer and shared environments.
- **Automatic delegation**: Cursor Agent may delegate based on each file’s `description` in frontmatter (see index below).

## Troubleshooting

| Issue | What to do |
|-------|------------|
| Slash command does nothing | Use **Agent** mode (not only inline Edit). Update **Cursor** to the latest version. |
| “Subagent not in enum” / Task errors | Some toolchains only expose built-in subagents programmatically; use natural language: **`/design-ui-designer …`** or “Read `.cursor/agents/design-ui-designer.md` and apply it.” The project **rule** above handles the latter pattern. |
| Agents not listed | Confirm files are under **`.cursor/agents/`** and committed; optional copy to **`~/.cursor/agents/`** for all projects. |

## Subagent index

| Invoke as | Description |
|-----------|-------------|
| **Design** | |
| `/design-brand-guardian` | Brand identity, consistency, positioning |
| `/design-image-prompt-engineer` | AI image prompt engineering for photography |
| `/design-inclusive-visuals-specialist` | Culturally accurate, inclusive visuals |
| `/design-ui-designer` | Design systems, component libraries, pixel-perfect UI |
| `/design-ux-architect` | UX architecture, CSS systems, implementation guidance |
| `/design-ux-researcher` | User research, usability testing, insights |
| `/design-visual-storyteller` | Visual narratives, multimedia, storytelling |
| `/design-whimsy-injector` | Personality, delight, playful interactions |
| **Engineering** | |
| `/engineering-ai-engineer` | ML models, deployment, AI features |
| `/engineering-autonomous-optimization-architect` | API performance, cost/security guardrails |
| `/engineering-backend-architect` | Backend, APIs, databases, cloud |
| `/engineering-data-engineer` | Data pipelines, lakehouse, ETL/ELT |
| `/engineering-devops-automator` | Infra automation, CI/CD, ops |
| `/engineering-frontend-developer` | React/Vue/Angular, UI, performance, a11y |
| `/engineering-mobile-app-builder` | Native/cross-platform mobile |
| `/engineering-rapid-prototyper` | Fast PoC and MVP |
| `/engineering-security-engineer` | App security, threat modeling, secure review |
| `/engineering-senior-developer` | Laravel/Livewire/FluxUI, advanced implementation |
| `/engineering-technical-writer` | Docs, API references, READMEs, tutorials |
| **Testing** | |
| `/testing-accessibility-auditor` | WCAG, assistive tech, inclusive design |
| `/testing-api-tester` | API validation, performance, quality |
| `/testing-evidence-collector` | QA with screenshots, evidence-based |
| `/testing-performance-benchmarker` | Performance testing and optimization |
| `/testing-reality-checker` | Evidence-based certification, production readiness |
| `/testing-test-results-analyzer` | Test results, metrics, insights |
| `/testing-tool-evaluator` | Tool/software evaluation and recommendations |
| `/testing-workflow-optimizer` | Process improvement, workflow automation |
| `/consulting-mvp-acceptance` | Consulting OS PRD §10 MVP acceptance (production or full-stack local) |
| **Product & project** | |
| `/product-behavioral-nudge-engine` | Behavioral nudges, motivation, UX cadences |
| `/product-feedback-synthesizer` | User feedback analysis and synthesis |
| `/product-owner` | Backlog intent, acceptance criteria, MVP scope, stakeholder tradeoffs |
| `/product-sprint-prioritizer` | Sprint planning, prioritization, agile |
| `/product-trend-researcher` | Market/trend research, competitive analysis |
| `/project-management-experiment-tracker` | Experiments, A/B tests, tracking |
| `/project-management-project-shepherd` | Cross-functional coordination, timelines |
| `/project-management-studio-operations` | Studio ops, process, efficiency |
| `/project-management-studio-producer` | High-level orchestration, portfolio |
| `/project-manager-senior` | Specs → tasks, scope, realistic delivery |
| **Marketing** | |
| `/marketing-app-store-optimizer` | ASO, conversion, discoverability |
| `/marketing-content-creator` | Content strategy, campaigns, multi-platform |
| `/marketing-growth-hacker` | Acquisition, experiments, growth |
| `/marketing-instagram-curator` | Instagram, visual storytelling, community |
| `/marketing-reddit-community-builder` | Reddit, community, value-driven content |
| `/marketing-social-media-strategist` | LinkedIn, Twitter, professional platforms |
| `/marketing-tiktok-strategist` | TikTok, viral content, algorithm |
| `/marketing-twitter-engager` | Twitter engagement, thought leadership |
| `/marketing-wechat-official-account` | WeChat OA, content, conversion |
| `/marketing-xiaohongshu-specialist` | Xiaohongshu, lifestyle, trends |
| `/marketing-zhihu-strategist` | Zhihu, thought leadership, credibility |
| **Support & data** | |
| `/support-analytics-reporter` | Dashboards, analysis, KPIs, reporting |
| `/support-executive-summary-generator` | Executive summaries, strategy comms |
| `/support-finance-tracker` | Finance, planning, budgets, analysis |
| `/support-infrastructure-maintainer` | Reliability, performance, ops |
| `/support-legal-compliance-checker` | Legal, compliance, data handling |
| `/support-support-responder` | Customer support, resolution, experience |
| `/data-analytics-reporter` | Data → insights, reporting, dashboards |
| `/data-consolidation-agent` | Sales data consolidation, dashboards |
| `/report-distribution-agent` | Report distribution, territories |
| `/sales-data-extraction-agent` | Excel/sales data extraction, metrics |
| **Specialized & XR** | |
| `/specialized-cultural-intelligence-strategist` | Cultural intelligence, inclusive product |
| `/specialized-developer-advocate` | Dev communities, DX, technical content |
| `/agentic-identity-trust` | Identity, auth, trust for autonomous agents |
| `/agents-orchestrator` | Pipeline orchestration, workflow |
| `/lsp-index-engineer` | LSP, code intelligence, indexing |
| `/terminal-integration-specialist` | Terminal, text rendering, SwiftTerm |
| `/macos-spatial-metal-engineer` | Swift, Metal, 3D on macOS |
| `/visionos-spatial-engineer` | visionOS, SwiftUI, Liquid Glass |
| `/xr-cockpit-interaction-specialist` | XR cockpit controls |
| `/xr-immersive-developer` | WebXR, browser AR/VR |
| `/xr-interface-architect` | Spatial UI, AR/VR/XR strategy |

## File format

Each subagent is a `.md` file with:

- **YAML frontmatter**: `name`, `description`, `model` (optional: `readonly`, `is_background` per [Cursor subagents docs](https://cursor.com/docs/subagents))
- **Body**: Prompt and instructions for that specialist

Agent uses the `description` to decide when to delegate. Keep descriptions specific (e.g. “Use when implementing auth” rather than “Use for coding”).
