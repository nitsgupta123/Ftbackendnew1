import { readFile } from "node:fs/promises";
import path from "node:path";
import type { MailAttachment } from "./email";
import type {
  HotelEntry,
  InclusionsData,
  ItineraryDay,
  PackageRecord,
} from "./package-types";
import type { PackageBasicsValues, SupplierPackageFile } from "./validation";
import { packageAttachmentFilename } from "./supplier-quote-email";

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");

export type PackageQuoteAttachment = MailAttachment;

export async function buildQuoteEmailAttachments(
  pkg: PackageRecord,
  options: { attachPackage?: boolean; includeItinerary?: boolean } = {}
): Promise<MailAttachment[]> {
  if (options.attachPackage === false) return [];

  const uploaded = await loadUploadedAttachments(pkg.supplier_source?.quotationFiles);
  if (uploaded.length > 0) return uploaded;

  return [
    buildSupplierPackageAttachment(pkg, {
      includeItinerary: options.includeItinerary,
    }),
  ];
}

export function buildSupplierPackageAttachment(
  pkg: PackageRecord,
  options: { includeItinerary?: boolean } = {}
): PackageQuoteAttachment {
  const includeItinerary = options.includeItinerary !== false;
  const basics = pkg.package_basics;
  const title =
    basics?.packageTitle?.trim() ||
    pkg.package_title?.trim() ||
    pkg.supplier_source?.supplierPackageName?.trim() ||
    "Package details";
  const html = renderPackageAttachmentHtml({
    title,
    pkg,
    includeItinerary,
  });

  return {
    filename: packageAttachmentFilename(title),
    contentType: "text/html",
    content: Buffer.from(html, "utf8"),
  };
}

async function loadUploadedAttachments(
  files: SupplierPackageFile[] | undefined
): Promise<MailAttachment[]> {
  if (!files?.length) return [];

  const attachments: MailAttachment[] = [];
  for (const file of files) {
    const absolute = resolveUploadPath(file.url);
    if (!absolute) continue;
    try {
      const content = await readFile(absolute);
      attachments.push({
        filename: safeAttachmentName(file.filename),
        contentType: file.mimetype?.trim() || mimeFromFilename(file.filename),
        content,
      });
    } catch {
      // Skip missing files so one broken path does not block the quote email.
    }
  }
  return attachments;
}

function resolveUploadPath(url: string): string | null {
  const match = url.trim().match(/^\/uploads\/(.+)$/);
  if (!match) return null;
  const absolute = path.resolve(UPLOAD_ROOT, match[1]);
  const relative = path.relative(UPLOAD_ROOT, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return absolute;
}

function safeAttachmentName(filename: string): string {
  const base = path.basename(filename).replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_");
  return base.trim() || "package-file";
}

function mimeFromFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".html": "text/html",
    ".htm": "text/html",
  };
  return mimeMap[ext] || "application/octet-stream";
}

function renderPackageAttachmentHtml(input: {
  title: string;
  pkg: PackageRecord;
  includeItinerary: boolean;
}): string {
  const { title, pkg, includeItinerary } = input;
  const basics = pkg.package_basics;
  const sections: string[] = [
    renderOverview(basics, pkg),
    renderHotels(pkg.hotels),
    renderInclusions(pkg.inclusions, basics?.importantInfo),
  ];

  if (includeItinerary) {
    sections.splice(1, 0, renderItinerary(pkg.itinerary?.days));
  }

  const body = sections.filter(Boolean).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #1F2A44; line-height: 1.5; margin: 0; padding: 24px; background: #fff; }
    h1 { font-size: 22px; margin: 0 0 6px; color: #14385C; }
    h2 { font-size: 16px; margin: 28px 0 10px; color: #14385C; border-bottom: 2px solid #14385C; padding-bottom: 6px; }
    h3 { font-size: 14px; margin: 0 0 6px; }
    p, li { font-size: 13px; }
    .meta { color: #64748B; font-size: 13px; margin-bottom: 20px; }
    .card { border: 1px solid #E5E7EB; border-radius: 8px; padding: 14px 16px; margin: 10px 0; background: #FAFBFD; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; vertical-align: top; padding: 6px 10px 6px 0; }
    th { color: #64748B; font-weight: 600; width: 160px; }
    ul { margin: 6px 0 0 18px; padding: 0; }
    .rte h1 { font-size: 16px; margin: 8px 0 4px; color: #14385C; }
    .rte h2 { font-size: 15px; margin: 8px 0 4px; color: #14385C; }
    .rte h3, .rte h4 { font-size: 13px; margin: 6px 0 3px; color: #14385C; }
    .rte p { margin: 0 0 8px; }
    .rte ul, .rte ol { margin: 4px 0 8px 18px; }
    .rte li { margin: 2px 0; }
    .rte strong { font-weight: 700; }
    .muted { color: #94A3B8; font-size: 12px; }
    .footer { margin-top: 32px; font-size: 12px; color: #64748B; border-top: 1px solid #E5E7EB; padding-top: 12px; }
  </style>
</head>
<body>
  <p class="muted">Fayyaz Travels — supplier package summary</p>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">${escapeHtml(metaLine(basics, pkg))}</p>
  ${body || `<p class="muted">No package details have been saved yet.</p>`}
  <p class="footer">This attachment is for quoting only. It does not include Fayyaz selling prices or internal consultant notes.</p>
</body>
</html>`;
}

function metaLine(basics: PackageBasicsValues | null | undefined, pkg: PackageRecord): string {
  const parts = [
    durationLabel(basics),
    [basics?.countriesCovered, basics?.citiesOrRegions].filter(Boolean).join(" · "),
    basics?.tourType,
    pkg.supplier_source?.supplierPackageName
      ? `Supplier package: ${pkg.supplier_source.supplierPackageName}`
      : "",
  ].filter(Boolean);
  return parts.join("  |  ");
}

function renderOverview(
  basics: PackageBasicsValues | null | undefined,
  pkg: PackageRecord
): string {
  const rows: Array<[string, string]> = [];
  addRow(rows, "Package name", basics?.packageTitle || pkg.package_title);
  addRow(rows, "Supplier package", pkg.supplier_source?.supplierPackageName);
  addRow(rows, "Duration", durationLabel(basics));
  addRow(rows, "Package type", basics?.tourType);
  addRow(rows, "Package themes", basics?.packageThemes?.filter(Boolean).join(", "));
  addRow(rows, "Package mode", basics?.packageMode);
  addRow(rows, "Runs", basics?.runsCustom || basics?.runs);
  addRow(rows, "Countries", basics?.countriesCovered);
  addRow(rows, "Cities / regions", basics?.citiesOrRegions);
  addRow(rows, "Starting point", basics?.startingPoint);
  addRow(rows, "Ending point", basics?.endingPoint);
  addRow(rows, "Short intro", htmlToText(basics?.shortIntro));
  addRow(rows, "Overview", htmlToText(basics?.packageOverview));

  if (!rows.length) return "";
  return `<h2>Package overview</h2>${definitionTable(rows)}`;
}

function renderItinerary(days: ItineraryDay[] | undefined): string {
  const list = (days ?? []).filter(
    (day) => day && (day.title || htmlToText(day.description) || day.activitiesIncluded)
  );
  if (!list.length) return "";

  const cards = list
    .map((day) => {
      const meals = [
        day.breakfast ? "Breakfast" : "",
        day.lunch ? "Lunch" : "",
        day.dinner ? "Dinner" : "",
      ].filter(Boolean);
      const rows: Array<[string, string]> = [];
      addRow(rows, "Activities", htmlToText(day.activitiesIncluded));
      addRow(rows, "Highlights", htmlToText(day.highlights));
      addRow(rows, "Optional activities", htmlToText(day.optionalActivities));
      addRow(rows, "Transport", day.transport);
      addRow(rows, "Hotel that night", day.hotelThatNight);
      addRow(rows, "Meals", meals.join(", "));
      addRow(rows, "Dietary notes", day.dietaryNotes);
      addRow(rows, "Halal food note", day.halalFoodNote);
      addRow(rows, "City", day.city);

      const heading = `Day ${day.dayNumber}${day.title?.trim() ? ` — ${day.title.trim()}` : ""}`;
      const descriptionHtml = richHtmlBlock(day.description);
      const body = [
        descriptionHtml ? `<div class="rte">${descriptionHtml}</div>` : "",
        rows.length ? definitionTable(rows) : "",
      ]
        .filter(Boolean)
        .join("");

      return `<div class="card"><h3>${escapeHtml(heading)}</h3>${
        body || `<p class="muted">No details saved for this day.</p>`
      }</div>`;
    })
    .join("\n");

  return `<h2>Day-by-day itinerary</h2>${cards}`;
}

function renderHotels(hotels: HotelEntry[] | null | undefined): string {
  const list = (hotels ?? []).filter((hotel) => hotel?.hotelName?.trim());
  if (!list.length) return "";

  const cards = list
    .map((hotel) => {
      const rows: Array<[string, string]> = [];
      addRow(rows, "City", hotel.city);
      addRow(rows, "Star rating", hotel.starRating);
      addRow(rows, "Room type", hotel.roomType);
      addRow(rows, "Nights", hotel.nights);
      addRow(rows, "Max occupancy", hotel.maxOccupancy);
      addRow(rows, "Child policy", hotel.childPolicy);
      addRow(rows, "Address", hotel.address);
      addRow(
        rows,
        "Breakfast",
        hotel.breakfastIncluded == null
          ? ""
          : hotel.breakfastIncluded
            ? hotel.halalBreakfast
              ? "Included (halal)"
              : "Included"
            : "Not included"
      );
      addRow(rows, "Connecting rooms", yesNo(hotel.connectingRooms));
      addRow(rows, "Extra bed", yesNo(hotel.extraBed));

      return `<div class="card"><h3>${escapeHtml(hotel.hotelName!.trim())}</h3>${
        rows.length ? definitionTable(rows) : ""
      }</div>`;
    })
    .join("\n");

  return `<h2>Hotels</h2>${cards}`;
}

function storedImportantInfo(
  data: InclusionsData | null | undefined,
  legacyImportantInfo?: string
): string {
  if (data && Object.prototype.hasOwnProperty.call(data, "importantInfo")) {
    return data.importantInfo ?? "";
  }
  return legacyImportantInfo ?? "";
}

function renderInclusions(
  data: InclusionsData | null | undefined,
  legacyImportantInfo?: string
): string {
  const importantHtml = richHtmlBlock(storedImportantInfo(data, legacyImportantInfo));
  if (!data && !importantHtml) return "";
  const chunks: string[] = [];
  if (importantHtml) {
    chunks.push(
      `<p><strong>Important notes</strong></p><div class="rte">${importantHtml}</div>`
    );
  }
  if (!data) {
    return `<h2>Inclusions</h2>${chunks.join("\n")}`;
  }
  const flags = [
    data.flightsIncluded ? "Flights included" : "",
    data.trainIncluded ? "Train included" : "",
    data.transfersIncluded ? "Transfers included" : "",
  ].filter(Boolean);
  if (flags.length) {
    chunks.push(`<p>${escapeHtml(flags.join(" · "))}</p>`);
  }
  chunks.push(bulletList("Included", data.included));
  chunks.push(bulletList("Excluded", data.excluded));
  chunks.push(bulletList("Optional add-ons", data.optionalAddons));
  if (data.localFees?.trim()) {
    chunks.push(`<p><strong>Local fees:</strong> ${escapeHtml(htmlToText(data.localFees))}</p>`);
  }
  if (data.nonRefundable?.trim()) {
    chunks.push(
      `<p><strong>Non-refundable:</strong> ${escapeHtml(htmlToText(data.nonRefundable))}</p>`
    );
  }
  const body = chunks.filter(Boolean).join("\n");
  if (!body) return "";
  return `<h2>Inclusions</h2>${body}`;
}

function bulletList(title: string, items?: string[]): string {
  const list = (items ?? []).map((item) => item.trim()).filter(Boolean);
  if (!list.length) return "";
  return `<p><strong>${escapeHtml(title)}</strong></p><ul>${list
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("")}</ul>`;
}

function definitionTable(rows: Array<[string, string]>): string {
  return `<table>${rows
    .map(
      ([label, value]) =>
        `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value).replace(/\n/g, "<br>")}</td></tr>`
    )
    .join("")}</table>`;
}

function addRow(rows: Array<[string, string]>, label: string, value?: string | null): void {
  const text = value?.trim();
  if (!text) return;
  rows.push([label, text]);
}

function durationLabel(basics: PackageBasicsValues | null | undefined): string {
  const days = basics?.days?.trim();
  const nights = basics?.nights?.trim();
  if (days && nights) return `${days} days / ${nights} nights`;
  if (days) return `${days} days`;
  if (nights) return `${nights} nights`;
  return "";
}

function yesNo(value?: boolean): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "";
}

function htmlToText(value?: string | null): string {
  if (!value?.trim()) return "";
  return value
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*p\s*>/gi, "\n")
    .replace(/<\/\s*div\s*>/gi, "\n")
    .replace(/<\/\s*li\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function richHtmlBlock(value?: string | null): string {
  const raw = value?.trim();
  if (!raw) return "";
  if (!/<\/?[a-z][\s\S]*>/i.test(raw)) {
    return `<p>${escapeHtml(raw).replace(/\n/g, "<br>")}</p>`;
  }
  return sanitizeRichHtml(raw);
}

function sanitizeRichHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed)[\s\S]*?>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|iframe|object|embed)[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
