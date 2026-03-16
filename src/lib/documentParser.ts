/**
 * Tiered document parsing.
 * Tier 1: Free library parsing (BCBP for boarding passes, MRZ for passports,
 *          pdf.js + regex for flight tickets).
 * Tier 2: Claude API fallback when Tier 1 confidence is low.
 */

import type { DocumentType } from '@/types';

// ── Confidence scoring ─────────────────────────────────────────────────────────

type Confidence = 'high' | 'low';

function confidence(fields: (string | null | undefined)[], threshold: number): Confidence {
  const populated = fields.filter(v => v != null && v !== '').length;
  return populated >= threshold ? 'high' : 'low';
}

// ── HEIC conversion (re-used from claudeApi) ───────────────────────────────────

export async function convertIfHeic(file: File): Promise<File> {
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.heic$/i.test(file.name) ||
    /\.heif$/i.test(file.name);
  if (!isHeic) return file;
  try {
    const heic2any = (await import('heic2any')).default;
    const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    const blob = Array.isArray(result) ? result[0] : result;
    return new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
  } catch {
    return file; // Return original if conversion fails
  }
}

// ── PDF text extraction ────────────────────────────────────────────────────────

async function extractPDFText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');

  // Set worker using a CDN URL since we can't easily bundle it
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => item.str ?? '')
      .join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

// ── BCBP barcode reading ───────────────────────────────────────────────────────

async function tryReadBarcode(file: File): Promise<string | null> {
  try {
    let imageSource: HTMLImageElement | HTMLCanvasElement;

    if (file.type === 'application/pdf') {
      // Render PDF page 1 to canvas
      const pdfjs = await import('pdfjs-dist');
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
      }
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await page.render({ canvasContext: ctx as any, viewport } as any).promise;
      imageSource = canvas;
    } else {
      // Image file
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image load failed'));
      });
      imageSource = img;
    }

    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    const reader = new BrowserMultiFormatReader();

    let resultText: string | null = null;

    if (imageSource instanceof HTMLCanvasElement) {
      // For canvas, convert to image URL
      const dataUrl = imageSource.toDataURL();
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>(resolve => { img.onload = () => resolve(); });
      const result = await reader.decodeFromImageElement(img);
      resultText = result.getText();
    } else {
      const result = await reader.decodeFromImageElement(imageSource as HTMLImageElement);
      resultText = result.getText();
    }

    return resultText;
  } catch {
    return null;
  }
}

// ── BCBP parsing (boarding passes) ─────────────────────────────────────────────

export interface ParsedBoardingPass {
  passenger_name: string | null;
  flight_number: string | null;
  seat: string | null;
  gate: string | null;
  boarding_time: string | null;
  departure_airport: string | null;
  arrival_airport: string | null;
  departure_date: string | null;
  sequence_number: string | null;
  fare_class: string | null;
  booking_reference: string | null;
  confidence: Confidence;
}

export async function parseBCBP(file: File): Promise<ParsedBoardingPass> {
  const empty: ParsedBoardingPass = {
    passenger_name: null, flight_number: null, seat: null, gate: null,
    boarding_time: null, departure_airport: null, arrival_airport: null,
    departure_date: null, sequence_number: null, fare_class: null,
    booking_reference: null, confidence: 'low',
  };

  try {
    const barcodeText = await tryReadBarcode(file);
    if (!barcodeText) return empty;

    // BCBP strings start with 'M' and are 60+ chars
    if (barcodeText.length < 60 || barcodeText[0] !== 'M') return empty;

    const { decode } = await import('bcbp');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed: any = decode(barcodeText);
    const bcbpData = parsed?.data ?? parsed;
    if (!bcbpData?.legs?.[0]) return empty;

    const leg = bcbpData.legs[0];

    // Parse BCBP flightDate if present
    let departureDateStr: string | null = null;
    if (leg.flightDate) {
      try {
        departureDateStr = new Date(leg.flightDate).toISOString().slice(0, 10);
      } catch { /* ignore */ }
    }

    const result: ParsedBoardingPass = {
      passenger_name: (bcbpData.passengerName as string | undefined)
        ?.replace(/<<.*/, '').replace(/</, ' ').trim() ?? null,
      flight_number: leg.operatingCarrierDesignator
        ? `${leg.operatingCarrierDesignator}${String(leg.flightNumber ?? '').trim()}`
        : null,
      seat: String(leg.seatNumber ?? '').trim() || null,
      gate: String(leg.gateNumber ?? '').trim() || null,
      boarding_time: null,
      departure_airport: String(leg.departureAirport ?? leg.fromCityAirportCode ?? '').trim() || null,
      arrival_airport: String(leg.arrivalAirport ?? leg.toCityAirportCode ?? '').trim() || null,
      departure_date: departureDateStr,
      sequence_number: String(leg.checkInSequenceNumber ?? '').trim() || null,
      fare_class: String(leg.compartmentCode ?? leg.passengerStatus ?? '').trim() || null,
      booking_reference: String(leg.operatingCarrierPNR ?? leg.operatingCarrierPNRCode ?? '').trim() || null,
      confidence: 'low',
    };

    result.confidence = confidence(
      [result.flight_number, result.departure_airport, result.arrival_airport, result.passenger_name, result.seat],
      3
    );

    return result;
  } catch {
    return empty;
  }
}

// ── MRZ parsing (passports) ───────────────────────────────────────────────────

export interface ParsedPassport {
  passport_number: string | null;
  passport_country_of_issue: string | null;
  passport_nationality: string | null;
  passport_expiry_date: string | null;
  passport_dob: string | null;
  full_name: string | null;
  confidence: Confidence;
}

function mrzDateToISO(mrzDate: string): string | null {
  // YYMMDD format
  if (!/^\d{6}$/.test(mrzDate)) return null;
  const yy = parseInt(mrzDate.slice(0, 2));
  const mm = mrzDate.slice(2, 4);
  const dd = mrzDate.slice(4, 6);
  const year = yy >= 0 && yy <= 30 ? `20${String(yy).padStart(2, '0')}` : `19${String(yy).padStart(2, '0')}`;
  return `${year}-${mm}-${dd}`;
}

export async function parseMRZ(file: File): Promise<ParsedPassport> {
  const empty: ParsedPassport = {
    passport_number: null, passport_country_of_issue: null, passport_nationality: null,
    passport_expiry_date: null, passport_dob: null, full_name: null, confidence: 'low',
  };

  try {
    let text = '';
    if (file.type === 'application/pdf') {
      text = await extractPDFText(file);
    } else {
      return empty; // Can't reliably OCR images without a library like Tesseract
    }

    // Look for MRZ lines: two lines of 44 chars with only uppercase letters, digits, and '<'
    const mrzPattern = /[A-Z0-9<]{44}/g;
    const matches = text.replace(/\s/g, '').match(mrzPattern) ?? [];

    // Find two consecutive MRZ lines (TD3 format = 44 chars each)
    let line1: string | null = null;
    let line2: string | null = null;

    for (let i = 0; i < matches.length - 1; i++) {
      const a = matches[i];
      const b = matches[i + 1];
      if ((a[0] === 'P' || a[0] === 'V') && /^[A-Z0-9<]{44}$/.test(b)) {
        line1 = a;
        line2 = b;
        break;
      }
    }

    if (!line1 || !line2) return empty;

    const { parse } = await import('mrz');
    const parsed = parse([line1, line2]);

    const result: ParsedPassport = {
      passport_number: parsed.fields.documentNumber ?? null,
      passport_country_of_issue: parsed.fields.issuingState ?? null,
      passport_nationality: parsed.fields.nationality ?? null,
      passport_expiry_date: parsed.fields.expirationDate
        ? mrzDateToISO(parsed.fields.expirationDate)
        : null,
      passport_dob: parsed.fields.birthDate
        ? mrzDateToISO(parsed.fields.birthDate)
        : null,
      full_name: parsed.fields.lastName && parsed.fields.firstName
        ? `${parsed.fields.firstName} ${parsed.fields.lastName}`.trim()
        : null,
      confidence: 'low',
    };

    result.confidence = confidence(
      [result.passport_number, result.passport_nationality, result.passport_expiry_date, result.passport_dob],
      3
    );

    return result;
  } catch {
    return empty;
  }
}

// ── PDF text parsing for flight tickets ───────────────────────────────────────

export interface ParsedFlightTicket {
  flight_number: string | null;
  booking_reference: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  passenger_name: string | null;
  seat: string | null;
  departure_airport: string | null;
  arrival_airport: string | null;
  confidence: Confidence;
}

export async function parsePDFFlightTicket(file: File): Promise<ParsedFlightTicket> {
  const empty: ParsedFlightTicket = {
    flight_number: null, booking_reference: null, departure_time: null,
    arrival_time: null, passenger_name: null, seat: null,
    departure_airport: null, arrival_airport: null, confidence: 'low',
  };

  if (file.type !== 'application/pdf') return empty;

  try {
    const text = await extractPDFText(file);

    const patterns: Record<string, RegExp> = {
      flight_number: /\b([A-Z]{2}\d{3,4})\b/,
      booking_reference: /(?:PNR|Booking\s+Ref(?:erence)?|Reference|Confirmation)[:\s]+([A-Z0-9]{5,8})/i,
      departure_time: /(?:Departs?|Departure)[:\s]+(\d{1,2}:\d{2})/i,
      arrival_time: /(?:Arrives?|Arrival)[:\s]+(\d{1,2}:\d{2})/i,
      passenger_name: /(?:Passenger|Name)[:\s]+([A-Z][A-Z\s]+(?:[A-Z]))/i,
      seat: /(?:Seat)[:\s]+([0-9]{1,3}[A-F])/i,
    };

    const result: ParsedFlightTicket = {
      flight_number: text.match(patterns.flight_number)?.[1] ?? null,
      booking_reference: text.match(patterns.booking_reference)?.[1] ?? null,
      departure_time: text.match(patterns.departure_time)?.[1] ?? null,
      arrival_time: text.match(patterns.arrival_time)?.[1] ?? null,
      passenger_name: text.match(patterns.passenger_name)?.[1]?.trim() ?? null,
      seat: text.match(patterns.seat)?.[1] ?? null,
      departure_airport: text.match(/\b([A-Z]{3})\s*→/)?.[1] ?? null,
      arrival_airport: text.match(/→\s*([A-Z]{3})\b/)?.[1] ?? null,
      confidence: 'low',
    };

    result.confidence = confidence(
      [result.flight_number, result.booking_reference, result.departure_time,
       result.arrival_time, result.passenger_name, result.seat],
      3
    );

    return result;
  } catch {
    return empty;
  }
}

// ── Parsing status messages ────────────────────────────────────────────────────

export function parsingStatusMessage(docType: DocumentType | 'boarding_pass'): string {
  switch (docType) {
    case 'boarding_pass': return 'Reading boarding pass barcode…';
    case 'passport': return 'Reading passport…';
    default: return 'Extracting details with AI…';
  }
}
