# SAMPLE GovProcure Hub (32)

Build a comprehensive React dashboard for a Government Procurement prototype using standard shadcn/ui imports (@/components/ui/*).
ARCHITECTURE & STATE:
Use Tailwind CSS and Lucide React icons.
Persist activeRole ('official' | 'startup') using a custom React hook that safely syncs with localStorage (handling SSR hydration) or URL parameters. Default to 'official'.
Wrap the main layout in App.tsx and include the <Toaster/> component.
Implement strict GovTech styling: bg-slate-50 (main background), bg-slate-900 (sidebar/headers), bg-blue-800 (primary actions). Enforce rigid geometry by globally overriding shadcn border-radius CSS variables to 0rem. Use rounded-full exclusively for status indicators.
LAYOUT:
Create a persistent left Sidebar (hidden on md: down) and a main content area.
Create a top mobile Navigation Bar containing a Lucide Menu icon that triggers a shadcn Sheet to expose the sidebar on small viewports.
Sidebar must contain two role toggle buttons (highlight active with bg-slate-800 border-l-4 border-blue-500) and mock links (Overview, Compliance, Settings).
VIEW 1: DEPARTMENT OFFICIAL
Grid Layout: grid-cols-1 md:grid-cols-3 gap-4.
Render 3 Cards: Active Pilots (4), Budget Guarded (₹45.2M), and CVC Audit Risk (include a green "Low Risk" Badge).
Telemetry Ledger: A Table displaying immutable logs (Timestamp, API Endpoint, Action, Status). Use font-mono text-sm for technical columns.
AI Compliance Shield: A Card with a "Generate Rule 166 GFR Memo" Button. Bind this to an isGenerating boolean state. On click, set to true, render a <Skeleton className="h-48 w-full"/>, and initiate a safely managed 2000ms timeout. On completion, set state to false, render a mock formal memo (white bg, serif text, black borders), and trigger a success Toast.
VIEW 2: STARTUP VENDOR
Sandbox Status: A Card listing "Database Isolation", "Network Tunnels", "Container Uptime". Add a pulsing green dot (animate-pulse bg-green-500 rounded-full h-3 w-3) beside each.
Legacy API Gateway: A flex diagram: [Modern REST API] -> ArrowRight -> [Translation Layer] -> ArrowRight -> [Legacy SOAP].
API Key block: Render a mock key in a bg-slate-900 text-green-400 font-mono text-sm block with a Copy button. Implement navigator.clipboard.writeText in a try/catch block. Trigger a success Toast, or an error Toast if the API fails due to unsecure contexts.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://official-startup-hub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7e152a3d-32f1-4722-9ff1-57c2e6638e7c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
