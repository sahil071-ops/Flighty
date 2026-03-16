export interface VersionEntry {
  version: string;
  date: string;
  changes: string[];
}

export const VERSION_HISTORY: VersionEntry[] = [
  {
    version: '3.1.0',
    date: 'March 2026',
    changes: [
      'Redesigned visual language — Obsidian design system with Inter typeface, deeper dark palette, and cyan accent',
      'Member cards now use each person\'s colour as a personalised tint and border glow',
      'Flight cards upgraded: larger time typography, member-coloured plane icon, gradient flight path',
      'Trip cards use a bold left-border accent instead of a thin top bar',
      'Flying Now card stripped of generic gradient — clean dark surface with cyan edge treatment',
      'Navigation refined with cyan active indicators and hairline top accent',
      'Buttons redesigned: primary is high-contrast cyan/black, secondary uses transparent border treatment',
      'Avatars now support XL size (64px) for the home screen member grid',
    ],
  },
  {
    version: '3.0.0',
    date: 'March 2026',
    changes: [
      'Smart document parsing: boarding passes via BCBP standard barcode (no AI), passports via MRZ parser (no AI for PDFs). Claude API only for visas, hotels, insurance, and as fallback',
      'Boarding pass upload on every flight — QR code full-screen display (tap to show, screen stays on)',
      'Live flight status via AviationStack — manual refresh only, free-tier safe, cached for 15 minutes',
      'Flying Now card on home screen for flights departing within 3 hours, with deduplication across family members',
      'Online check-in button for all major airlines (BA, EK, LH, QR, SQ, and 14 more)',
      'Copy booking reference with one tap — Copied! confirmation',
      'Loyalty cards in Documents tab — add frequent flyer numbers, matched automatically on flight pages by IATA code or alliance',
      'Check-in reminders via push notification at 48h and 24h before departure',
      'Device-member association — notifications go to the right person\'s phone',
    ],
  },
  {
    version: '2.0.9',
    date: 'March 2026',
    changes: [
      'Past flights, hotels, and car rentals are now greyed out with a "Completed" badge so you can tell at a glance which legs of the journey are done',
      'Hotel voucher View button now works on iOS — uses a signed URL (same fix applied to car rentals previously)',
      'New Download button on hotel vouchers',
      'Fixed empty time fields causing a database error when adding a car rental',
    ],
  },
  {
    version: '2.0.8',
    date: 'March 2026',
    changes: [
      'Car Rentals added to trips — track your hire car alongside flights and hotels',
      'Upload your rental confirmation (PDF, photo, or HEIC) and AI fills in the details automatically',
      'Car rental detail page shows pick-up/drop-off, duration, confirmation number, voucher, and a Maps button for the pick-up location',
      'Car rentals are included in the WhatsApp trip share',
    ],
  },
  {
    version: '2.0.7',
    date: 'March 2026',
    changes: [
      'Documents list and member documents no longer get cut off by the bottom navigation bar on iPhone',
      'View File button now works on iOS — uses a secure signed URL instead of a blob URL that Safari blocked',
      'New Download button on every document so you can save files directly to your device',
      'HEIC/HEIF photos from iPhone camera are now accepted and auto-converted before AI extraction',
    ],
  },
  {
    version: '2.0.6',
    date: 'March 2026',
    changes: [
      'Fixed "column not found" error when saving a passport or travel insurance document — AI-only fields (full_name, insured_name) are now stripped before the database insert',
    ],
  },
  {
    version: '2.0.5',
    date: 'March 2026',
    changes: [
      'Hotel detail view now has an "Open in Google Maps" button at the bottom — tapping it opens the hotel location directly in Maps',
      'App icon updated to a blue circle with a white airplane',
    ],
  },
  {
    version: '2.0.4',
    date: 'March 2026',
    changes: [
      'Documents on the trip page now link to existing documents from the Documents tab — no more broken inline upload',
      'Tap "+ Link document" on any trip to attach any of that person\'s passports, visas, or insurance docs',
      'Linked documents are tappable and open the full document detail view',
      'Unlink a document with the × button; upload new documents from the Documents tab',
    ],
  },
  {
    version: '2.0.3',
    date: 'March 2026',
    changes: [
      'Fixed flight order — now sorted purely by departure time (leg_order values in DB were incorrect)',
      'Trip card route summary (BOM → LHR → FRA) also now in correct chronological order',
    ],
  },
  {
    version: '2.0.2',
    date: 'March 2026',
    changes: [
      'Fixed "visa_number column not found" error when saving a visa document',
      'Visa Number now stored and displayed in the document detail view',
    ],
  },
  {
    version: '2.0.1',
    date: 'March 2026',
    changes: [
      'Fixed flight order within trips — always sorted chronologically by departure time',
      'Hotels also sort chronologically by check-in date',
      'Visas and travel insurance uploaded inside a trip now automatically appear in the member\'s Documents section',
      'Network error on document save now shows a clear retry message instead of raw browser error',
    ],
  },
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
