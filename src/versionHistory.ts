export interface VersionEntry {
  version: string;
  date: string;
  changes: string[];
}

export const VERSION_HISTORY: VersionEntry[] = [
  {
    version: '1.5.0',
    date: 'March 2026',
    changes: [
      'Auto-update prompt when new version is available',
      'Version history (you\'re reading it!)',
      'Back buttons repositioned to avoid notch and Dynamic Island',
    ],
  },
  {
    version: '1.4.0',
    date: 'March 2026',
    changes: [
      'Documents tab: store passports, visas, travel insurance per family member',
      'AI auto-fill for document uploads (PDF and images)',
      'Expiry alerts for documents expiring within 30/90 days',
      'Red badge on Documents tab when documents are expiring soon',
    ],
  },
  {
    version: '1.3.0',
    date: 'March 2026',
    changes: [
      'All files now auto-download in background on app open',
      'Fixed PDF viewing error',
      'Removed admin role — all family members have equal access',
    ],
  },
  {
    version: '1.2.0',
    date: 'March 2026',
    changes: [
      'Trips re-architecture: Trips are now the top level (flights and hotels underneath)',
      'Hotel storage with AI auto-fill',
      'Image and screenshot support for auto-fill (not just PDFs)',
      'Who\'s Travelling This Week banner on home screen',
      'Layover duration displayed on multi-leg trips',
      'Trip-level notes visible to all family members',
    ],
  },
  {
    version: '1.1.0',
    date: 'March 2026',
    changes: [
      'Added calendar export (.ics) for any flight',
      'WhatsApp share button on flight detail',
      'Correct local timezones for all airports',
    ],
  },
  {
    version: '1.0.0',
    date: 'March 2026',
    changes: [
      'Initial release',
      'Flight tracking for the whole family',
      'Shared family view',
      'Offline access',
      'PDF ticket storage',
    ],
  },
];
