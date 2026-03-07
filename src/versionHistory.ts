export interface VersionEntry {
  version: string;
  date: string;
  changes: string[];
}

export const VERSION_HISTORY: VersionEntry[] = [
  {
    version: '2.0.0',
    date: 'March 2026',
    changes: [
      'Fixed Vercel build error — TypeScript type issue in Flights screen resolved',
      'SQL setup script is now idempotent — safe to re-run without errors',
    ],
  },
  {
    version: '1.8.0',
    date: 'March 2026',
    changes: [
      'Fixed Flights screen to show trips instead of a flat flight list',
      'Each trip card shows the full route: BOM → LHR → FRA',
      'Fixed document save error — now shows the actual error from Supabase',
      'Fixed hotel voucher access and download',
      'Rebuilt offline auto-download: files tracked in IndexedDB, green indicator turns on when synced',
    ],
  },
  {
    version: '1.7.0',
    date: 'March 2026',
    changes: [
      'Hotel vouchers now viewable and saveable for offline access',
      'Fixed layover display — only shown between connected flight legs',
      'File sync failures now logged to console for debugging',
      'Sync Now button to force an offline data refresh',
      'Debug logging for document file uploads (check console if visa upload fails)',
    ],
  },
  {
    version: '1.6.0',
    date: 'March 2026',
    changes: [
      'Fixed offline mode — all data now correctly saved to device on app open',
      'Fixed false "Failed to save" error when saving documents with a file attachment',
      'Document upload button always visible inside trip (was hidden until label entered)',
    ],
  },
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
