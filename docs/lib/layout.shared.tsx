// Modified by Purpgo LLC.
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

// The Purpgo mark (same path as site/'s Logo.astro), monochrome via currentColor.
function Mark() {
  return (
    <img src="/brand/purpgo-logo.svg" alt="Purpgo" className="h-5 w-auto" />
  );
}

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      url: '/guides/',
      title: (
        <div className="flex items-center gap-2">
          <Mark />
          <span className="text-[15px] font-normal text-fd-muted-foreground">Docs</span>
        </div>
      ),
    },
    githubUrl: 'https://github.com/purpgo/purpgo',
    themeSwitch: { mode: 'light-dark' },
    links: [
      {
        text: 'purpgo.com',
        url: 'https://purpgo.com',
      },
      {
        type: 'custom',
        on: 'nav',
        secondary: true,
        children: (
          <a
            href="https://app.purpgo.com"
            className="inline-flex h-8 items-center whitespace-nowrap rounded-full bg-fd-foreground px-3.5 text-[13px] font-medium text-fd-background transition-opacity hover:opacity-85"
          >
            Open dashboard
          </a>
        ),
      },
    ],
  };
}
