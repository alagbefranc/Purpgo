// Modified by Purpgo LLC.
// Product guide content. Every claim here is drawn from the app as shipped
// (screenshots in public/guide/shots). Personal data in those shots is redacted.

export type Shot = { src: string; alt: string; caption?: string; w: number; h: number };
export type Section = { heading: string; body: string[]; shot?: Shot; list?: string[] };
export type GuidePage = {
  slug: string;
  title: string;
  group: 'Start here' | 'Email' | 'Audience' | 'CRM' | 'Insights' | 'Connect' | 'Account';
  summary: string;
  where: string;
  why: string;
  sections: Section[];
};

const s = (name: string, alt: string, caption?: string, w = 1280, h = 680): Shot => ({
  src: `/guide/shots/${name}.webp`, alt, caption, w, h,
});

export const guide: GuidePage[] = [
  {
    slug: 'getting-started',
    title: 'Getting started',
    group: 'Start here',
    summary: 'A tour of the Purpgo app and the order to set things up in, from your first mailbox to your first campaign.',
    where: 'Sign in at app.purpgo.com. Everything lives in the left sidebar, grouped into Email, CRM and Resources.',
    why: 'Cold email works when the groundwork is right. Following the setup order below means your first send goes out from a healthy, authenticated mailbox to a clean list.',
    sections: [
      {
        heading: 'Find your way around',
        body: [
          'The sidebar is the map of the product. At the top, a counter shows how much you have sent today and how many mailboxes are connected, with a shortcut to the Inbox.',
          'Email holds Accounts, Campaigns, Contacts, Forms, Analytics, Deliverability and Placement tests. CRM holds Pipelines, Deals, Tasks and Meetings. Resources holds Templates, Integrations, Automations, API keys and the Audit log. Settings sits at the bottom.',
          'The top bar shows your workspace, your plan, your daily send allowance and a Search box you can open from the keyboard.',
        ],
        shot: s('mailboxes', 'The Purpgo app with the sidebar on the left and the Accounts page open', 'The sidebar groups every area of the app. Accounts is where you start.'),
      },
      {
        heading: 'Set up in this order',
        body: ['Each step builds on the one before it. You can come back to any of them later.'],
        list: [
          'Connect a mailbox in Accounts and let warmup build its reputation.',
          'Check its domain in Sending domains: authentication, tracking host and redirect.',
          'Import or add contacts, then group them with labels and segments.',
          'Save a template or two for your opening email and follow-ups.',
          'Create a campaign: pick leads, write the emails, set the schedule, review and launch.',
          'Work replies from the Unibox and move interested people into a CRM pipeline.',
          'Watch Analytics and Deliverability to keep sending healthy.',
        ],
      },
      {
        heading: 'Make the workspace yours',
        body: [
          'Open Settings, then Profile, to set the name that appears on outgoing email, choose a light, dark or system appearance, and confirm your timezones.',
          'The workspace timezone matters: new campaigns start their sending window in it, and a mailbox without its own timezone reads its warmup and working hours from it. Daily budgets reset at midnight UTC.',
        ],
        shot: s('settings', 'Profile settings showing appearance options and workspace timezones', 'Appearance and timezones, under Settings → Profile.', 941, 398),
      },
    ],
  },
  {
    slug: 'mailboxes-and-warmup',
    title: 'Mailboxes and warmup',
    group: 'Email',
    summary: 'Connect the mailboxes you send from, see their health at a glance, and warm them up before they carry campaigns.',
    where: 'Sidebar → Email → Accounts. Click any mailbox to open its drawer.',
    why: 'Every email you send leaves through one of these mailboxes, so their reputation decides whether you land in the inbox. Accounts is where you add them, watch their health and control how hard they work.',
    sections: [
      {
        heading: 'The Accounts page',
        body: [
          'Four counters sit across the top: Total connected, Healthy, Warming (ramping up) and Needs attention (paused or failing).',
          'Below them, every mailbox is listed with its status, how much it has sent today against its cap, whether warmup is on, and a health score. Search by email or filter the list, and use Add account to connect another. Sending domains opens the domain view.',
        ],
        shot: s('mailboxes', 'The Accounts page listing a connected mailbox with its status, sent today, warmup and health', 'Accounts lists every mailbox with its health score.'),
      },
      {
        heading: 'Inside a mailbox',
        body: [
          'Click a mailbox to open its drawer. Tabs along the top cover Overview, Deliverability, Analytics, Warmup, Sending and Settings.',
          'Overview shows a health score out of 100, the state of the mail sync (including how many messages were imported from the recent-mail window), sent today against today\u2019s allowance, and the mailbox\u2019s sending setup: provider, tracking domain, daily cap, minimum gap between sends and working hours.',
          'You can list folders that should never sync, which is handy when another tool fills a folder. And Hold from campaigns takes a mailbox out of campaign rotation while warmup keeps running. Purpgo never releases a hold on its own.',
        ],
        shot: s('mailbox-overview', 'The mailbox drawer Overview tab with a health score of 100, sync status and sending settings', 'Overview: health, sync, daily cap, send gap and the campaign hold.'),
      },
      {
        heading: 'Warmup',
        body: [
          'The Warmup tab is where you start and tune warmup for the mailbox. Press Start to switch it on.',
          'Ramp configuration controls the pace: a starting volume (10 emails a day by default), a daily increase (1 a day), a maximum volume (40 a day, a conservative ceiling for new mailboxes) and a reply rate (30% of warmup mail gets a reply, so it reads like real conversation). An optional content segment, such as saas or agency, targets warmup content to your field.',
          'Diagnostic participation decides whether the mailbox sends and receives diagnostic tests, with shared daily limits, and Domain authentication runs a DNS check on the spot.',
        ],
        shot: s('mailbox-warmup', 'The Warmup tab with ramp settings for starting volume, daily increase, maximum volume and reply rate', 'Warmup ramps from a gentle start to a safe ceiling.'),
      },
    ],
  },
  {
    slug: 'domains',
    title: 'Sending domains',
    group: 'Email',
    summary: 'Authentication, tracking and redirects for every domain you send from, in one checklist.',
    where: 'Sidebar → Email → Accounts → Sending domains (top right of the Accounts page).',
    why: 'Inbox providers judge the domain as much as the mailbox. A domain that is authenticated, uses its own tracking host and redirects to your website looks like part of a real company, which is one of the cheapest deliverability wins there is.',
    sections: [
      {
        heading: 'What you see',
        body: [
          'Counters show how many domains are sending mail, how many mailboxes they cover, and how many are authenticated, have a verified tracking host and have a live redirect.',
          'When a domain still has work to do, a banner explains what is missing and offers Set up all. The table lists each domain with its mailbox count and the state of authentication, tracking and redirect. Filter by All, Needs attention or Vendor managed.',
        ],
        shot: s('domains', 'The Sending domains page showing an authenticated domain and a setup banner', 'Each domain shows authentication, tracking and redirect status.'),
      },
      {
        heading: 'Finishing a domain',
        list: [
          'Authentication: confirm the domain shows Authenticated.',
          'Tracking: move off the shared tracking host to a link on your own domain, such as link.yourdomain.com.',
          'Redirect: point the bare domain at your website so curious recipients land somewhere real.',
        ],
        body: [],
      },
    ],
  },
  {
    slug: 'unibox',
    title: 'Unibox',
    group: 'Email',
    summary: 'One inbox for every connected mailbox, with views and labels that surface the replies worth answering.',
    where: 'Sidebar → Inbox (at the top, above Email).',
    why: 'Replies are the point of cold email. The Unibox gathers them from every mailbox so nobody has to sign in to ten accounts, and its views sort the hot leads from the noise.',
    sections: [
      {
        heading: 'Mail, views, mailboxes and labels',
        body: [
          'The left column has your mail folders: All mail, Inbox, Unread, Awaiting reply, Agent drafts, Snoozed, Drafts, Sent, Scheduled, Archive, Spam and Trash.',
          'Views slice the inbox by what needs doing: Action required, Hot leads, Needs a reply, Follow up, Declined and Automated. Below them you can narrow to a single mailbox, or to a label such as Needs reply, Follow up or Gone quiet.',
          'Search across name, address or any word, and press Compose to write a new email. Pick a conversation from the list to read and answer it on the right.',
        ],
        shot: s('unibox', 'The Unibox with mail folders, views, mailboxes and labels on the left and the message list in the middle (messages blurred)', 'The Unibox. Message contents are blurred for privacy.'),
      },
    ],
  },
  {
    slug: 'contacts',
    title: 'Contacts',
    group: 'Audience',
    summary: 'Your people, with labels, reusable segments and a suppression list that keeps the wrong addresses out of every campaign.',
    where: 'Sidebar → Email → Contacts. Tabs along the top switch between All contacts, Segments, Labels and Suppression list.',
    why: 'Good targeting beats more volume. Contacts is where your list lives, where you shape it into audiences, and where Purpgo protects you from emailing people who asked you to stop.',
    sections: [
      {
        heading: 'All contacts',
        body: [
          'Counters show everyone, who is subscribed and receiving mail, who has unsubscribed, and who is in a campaign right now.',
          'Bring people in with Import, keep a spreadsheet in step with Sheet sync, or add one by hand with New contact. Export takes a copy out. Filter by label, segment, status or campaign, add your own filters, and choose which columns show.',
        ],
        shot: s('contacts', 'The All contacts list with counters for subscribed, unsubscribed and in campaigns (contact details blurred)', 'All contacts, with import, sheet sync and export.'),
      },
      {
        heading: 'Segments',
        body: [
          'A segment is a reusable audience built from contact fields, labels, campaign activity and engagement. Build it once, then add it to a campaign in one step.',
        ],
        shot: s('segments', 'The Segments tab with a New segment button', 'Segments are saved audiences you can reuse.'),
      },
      {
        heading: 'Labels',
        body: [
          'Labels are one list shared by contacts, inbox conversations and forms. Every workspace starts with Needs reply, Follow up and Gone quiet, and you can add your own with New label.',
        ],
        shot: s('labels', 'The Labels tab showing Needs reply, Follow up and Gone quiet', 'One set of labels across contacts, inbox and forms.'),
      },
      {
        heading: 'Suppression list',
        body: [
          'Addresses and domains here are never emailed by any campaign. Recipients who unsubscribe, reply asking to stop, bounce or complain land here automatically. Add customers, partners or whole domains by hand so no campaign reaches them.',
        ],
        shot: s('suppression', 'The Suppression list tab with an Add addresses button', 'The suppression list fills itself, and you can add to it.'),
      },
    ],
  },
  {
    slug: 'campaigns',
    title: 'Campaigns',
    group: 'Email',
    summary: 'Build a sequence in four steps, choose who sends it and when, and launch only when it is ready.',
    where: 'Sidebar → Email → Campaigns. New campaign opens the builder.',
    why: 'Campaigns are how outreach scales: the right people, a short sequence, sent at a human pace from mailboxes that can take it.',
    sections: [
      {
        heading: 'The campaign list',
        body: [
          'Counters show all campaigns, and how many are active, paused, in draft and done. Search, sort by newest, and group campaigns into folders.',
        ],
        shot: s('campaigns', 'The Campaigns page with counters for active, paused, draft and done', 'Every campaign and its state.'),
      },
      {
        heading: 'Step 1: Leads',
        body: [
          'Name the campaign (you can rename it any time), then pick the lead lists that should get it. Someone who appears on several lists is emailed once. If you have no lists yet, Import leads brings in a CSV and your draft waits for you.',
        ],
        shot: s('wizard-leads', 'Campaign builder step 1, Leads, asking who should get the campaign', 'Leads: choose who gets it.', 545, 554),
      },
      {
        heading: 'Step 2: Emails',
        body: [
          'Write what they will receive. Sequences with branches or action steps are edited in the full flow editor on the campaign\u2019s Steps tab.',
        ],
      },
      {
        heading: 'Step 3: Schedule',
        body: [
          'Start as soon as the campaign launches, or on a set date. Set the sending window: a timezone (or follow the workspace), the sending days and the hours. Sends spread out across the window rather than going out in one burst.',
          'Choose senders by mailbox tag, or leave it empty to rotate through every active mailbox. Maximum per mailbox per day is a ceiling for this campaign, not a target; ramp-up, health and shared capacity can lower it. Tracking and replies options, including stop on reply and the unsubscribe header, sit at the bottom.',
        ],
        shot: s('wizard-schedule', 'Campaign builder step 3, Schedule, with start options, sending days, hours and senders (sender address blurred)', 'Schedule: when, and from which mailboxes.', 545, 554),
      },
      {
        heading: 'Step 4: Review',
        body: [
          'Review sums up leads, emails, schedule and senders, and flags anything missing. Save as draft, or Launch when it is ready. Everything can be changed later.',
        ],
      },
    ],
  },
  {
    slug: 'templates',
    title: 'Templates',
    group: 'Email',
    summary: 'Reusable subject lines and bodies for cold opens, follow-ups and replies.',
    where: 'Sidebar → Resources → Templates.',
    why: 'Your best-performing email should be one click away, not rewritten from memory. Templates keep your openers and follow-ups consistent across campaigns and people.',
    sections: [
      {
        heading: 'Saved templates',
        body: [
          'Each template has a name, a subject and a body, and shows when it was last edited. Search by name or subject, and create one with New template.',
          'Built-in variables such as {{.FirstName}} and {{.Company}} personalise each email when it is sent.',
        ],
        shot: s('templates', 'The Templates page with a cold intro template using FirstName and Company variables', 'A cold intro template with personalisation variables.'),
      },
    ],
  },
  {
    slug: 'forms',
    title: 'Forms',
    group: 'Audience',
    summary: 'Hosted lead-capture forms you can embed anywhere, with views, starts, submissions and conversion tracked for you.',
    where: 'Sidebar → Email → Forms. New form opens the editor.',
    why: 'Not every lead comes from a list. Forms turn website visitors into contacts that flow straight into Purpgo, ready for a sequence.',
    sections: [
      {
        heading: 'Your forms',
        body: [
          'Counters track forms, views, starts, submissions and conversion (submissions over views). Each form shows its status, labels, a trend line, and counts for views, starts, submissions and identified visitors. Filter by Published, Drafts or Archived.',
        ],
        shot: s('forms', 'The Forms list with views, starts, submissions and conversion', 'Forms with their performance at a glance.'),
      },
      {
        heading: 'The form editor',
        body: [
          'Build on the canvas by clicking or dragging fields: text, email, phone, long text, number, dropdown, radio buttons, checkbox group, single checkbox, date and hidden field. Layout blocks add headings, text, dividers and page breaks.',
          'Tabs cover Build, Design, Settings, Share, Analytics and Submissions. Press Publish when it is ready.',
        ],
        shot: s('form-editor', 'The form editor with a field palette on the left and a form on the canvas', 'Drag fields onto the canvas, then publish.'),
      },
    ],
  },
  {
    slug: 'crm',
    title: 'CRM',
    group: 'CRM',
    summary: 'Pipelines, deals, tasks and meetings, so an interested reply becomes real business.',
    where: 'Sidebar → CRM: Pipelines, Deals, Tasks and Meetings.',
    why: 'A positive reply is the start of the work. Keeping deals, follow-ups and calls next to the conversations that created them means nothing slips between tools.',
    sections: [
      {
        heading: 'Pipelines',
        body: [
          'A pipeline is the set of stages a deal moves through, custom to how you sell. Each stage shows how many deals it holds, and you can add stages or whole new pipelines.',
        ],
        shot: s('pipelines', 'A sales pipeline with Open, Qualified and Won stages', 'Stages a deal moves through.'),
      },
      {
        heading: 'Deals',
        body: [
          'Every deal across all pipelines in one place, with open deals, open pipeline value and won value up top. Switch between a table and a board, filter by open, won or lost, by pipeline and more.',
        ],
        shot: s('deals', 'The Deals page with open, pipeline value and won counters', 'Every deal, as a table or a board.'),
      },
      {
        heading: 'Tasks',
        body: [
          'Follow-ups and reminders across the workspace. Tasks attach to a contact or a deal, and counters flag what is overdue, high priority, pending, active and completed. View them grouped or as a table, and filter by person, team and type.',
        ],
        shot: s('tasks', 'The Tasks page with overdue, high priority, pending, active and completed counters', 'Follow-ups attached to contacts and deals.'),
      },
      {
        heading: 'Meetings',
        body: [
          'Calls you schedule, and calls prospects book with you. Schedule a call with a contact, or connect Calendly or Cal.com so booked calls land here automatically.',
        ],
        shot: s('meetings', 'The Meetings page with upcoming, today, total booked and canceled counters', 'Booked calls show up here on their own.'),
      },
    ],
  },
  {
    slug: 'analytics-and-deliverability',
    title: 'Analytics and deliverability',
    group: 'Insights',
    summary: 'See how your email performs and whether it reaches the inbox, across every campaign and mailbox.',
    where: 'Sidebar → Email → Analytics, and Sidebar → Email → Deliverability.',
    why: 'Sending is only half the job. Analytics tells you what works; Deliverability warns you early when bounces, complaints or spam placement start to rise.',
    sections: [
      {
        heading: 'Analytics',
        body: [
          'Total sent, open rate, reply rate and bounce rate head the page, for 7, 30 or 90 days and for all or one campaign. A chart plots sends, opens, clicks and replies, with a breakdown and account health (healthy, at risk, issues) alongside.',
          'Top campaigns ranks your best performers. Direct mail covers the email you send by hand: sent, received, reply rate and median reply time. Share image exports a snapshot.',
        ],
        shot: s('analytics', 'The Analytics page with sent, open, reply and bounce rates and an email performance chart', 'Workspace analytics, by campaign and date range.'),
      },
      {
        heading: 'Deliverability',
        body: [
          'A deliverability score, bounce rate, complaint rate, spam placement and active suppressions, over 7, 30 or 90 days. A chart tracks bounces, complaints, opens, replies and sends, with window totals that include unsubscribes.',
          'Warmup inbox placement shows where warmup mail was observed landing. Seed test placement by provider shows where a placement test landed (inbox, a Gmail tab, spam, or nowhere) at each provider, and Run a placement test starts one.',
        ],
        shot: s('deliverability', 'The Deliverability page with score, bounce rate, complaint rate, spam placement and suppressed counters', 'Deliverability across every mailbox.'),
      },
    ],
  },
  {
    slug: 'integrations-and-automations',
    title: 'Integrations and automations',
    group: 'Connect',
    summary: 'Connect the tools your team already uses, then let events in Purpgo trigger work across them.',
    where: 'Sidebar → Resources → Integrations, and Sidebar → Resources → Automations.',
    why: 'Purpgo should fit your stack, not replace it. Integrations move data in and out; automations act on it the moment something happens.',
    sections: [
      {
        heading: 'Integrations',
        body: [
          'Discover shows apps recommended for your workspace and the most popular ones, with categories for CRM, notifications, automation, meetings, verification and data. Apps include Close, Discord, MillionVerifier, Calendly, Clay, Apollo and Zapier, with HubSpot, Slack, Salesforce and Pipedrive marked coming soon.',
          'Don\u2019t see your tool? Connect it through Zapier, Make or n8n, or build your own.',
        ],
        shot: s('integrations', 'The Integrations directory with recommended and popular apps', 'The integrations directory.'),
      },
      {
        heading: 'Calendly',
        body: [
          'Booked, rescheduled and canceled calls land on the contact, live. Purpgo mints an inbound URL for you, meetings appear on the contact timeline and the Meetings page in real time, bookings can trigger automations, and you can add a Book a call button anywhere a contact is in view. Cal.com works the same way.',
        ],
        shot: s('calendly', 'The Calendly integration page listing what it can do', 'Calendly bookings flow straight to the contact.'),
      },
      {
        heading: 'Zapier',
        body: [
          'Authenticate Zapier with a scoped Purpgo API key and fan events out to a Zap webhook URL. Triggers include prospect replies, meeting booked, rescheduled or canceled, email bounces, warmup health changes and spam complaints. Make and n8n are available too.',
        ],
        shot: s('zapier', 'The Zapier integration page with its actions and triggers', 'Zapier triggers and the webhook action.'),
      },
      {
        heading: 'Automations',
        body: [
          'When something happens in Purpgo, do this across your integrations. Each automation has a trigger, such as Meeting booked, and a list of actions, and can be turned on or off.',
          'Start from a template: tag hot replies, open a deal when a meeting is booked, unsubscribe on a hard bounce, or ping Slack on a positive reply.',
        ],
        shot: s('automations', 'The Automations page with an automation and four starter templates', 'Automations and starter templates.'),
      },
    ],
  },
  {
    slug: 'billing',
    title: 'Billing',
    group: 'Account',
    summary: 'Your plan, payment method, invoices and live usage against your limits.',
    where: 'Sidebar → Settings → Billing.',
    why: 'Know what you pay, when it renews and how close you are to each limit, before it matters.',
    sections: [
      {
        heading: 'Subscription',
        body: [
          'The Overview tab shows your current plan with its price, renewal date and daily sends across the workspace. From here you can change plan, update the payment method, open invoices, request a limit increase or cancel. Manage billing opens the billing portal, and the Plans, AI & credits and Payment tabs go deeper.',
        ],
        shot: s('billing', 'The Billing overview with the current plan and usage and limits', 'Plan, renewal and live usage.'),
      },
      {
        heading: 'Usage and limits',
        body: [
          'Live counts against the limits the server actually enforces: mailboxes, sends today, contacts, campaigns, team members, attachment storage, sends in the last month and API calls in the last 24 hours. A meter with no cap is unmetered on your plan. Warmup volume is governed per mailbox and is not capped here.',
        ],
      },
    ],
  },
];

export const groups = ['Start here', 'Email', 'Audience', 'CRM', 'Insights', 'Connect', 'Account'] as const;
export const href = (slug: string) => (slug === 'getting-started' ? '/guide/' : `/guide/${slug}/`);
