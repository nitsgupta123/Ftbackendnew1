"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/ui/icons";
import { getPackageEditHref, getPackage, isWizardPackage } from "@/lib/package-api";
import {
  getFieldLabel,
  PACKAGE_DETAIL_SECTIONS } from
"@/lib/package-detail-sections";
import type { PackageRecord } from "@/lib/package-types";
import { formatPackageDateTime } from "@/lib/format-date";
import { Button } from "@/components/ui/button";
import PackageConsultantBrief, {
  consultantBriefHeadline,
} from "@/components/packages/PackageConsultantBrief";

interface PackageDetailsModalProps {
  pkg: PackageRecord | null;
  onClose: () => void;
}

function isImageUrl(value: string): boolean {
  return (
    /^https?:\/\//i.test(value) ||
    value.startsWith("/") ||
    /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(value));

}

function isHtmlContent(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function formatScalar(value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined) return "";
  return String(value);
}

function DetailField({ label, value }: {label: string;value: unknown;}) {
  if (value === null || value === undefined || value === "") {
    return (
      <div>
        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</dt>
        <dd className="mt-1 text-sm text-gray-400">—</dd>
      </div>);

  }

  if (typeof value === "boolean") {
    return (
      <div>
        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900">{value ? "Yes" : "No"}</dd>
      </div>);

  }

  if (typeof value === "string" && isImageUrl(value)) {
    return (
      <div>
        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</dt>
        <dd className="mt-2">
          <Image
            src={value}
            alt={label}
            width={320}
            height={128}
            unoptimized
            className="max-h-32 rounded-lg border border-[#E5E7EB] object-cover" />
          
          <p className="mt-1 text-xs text-gray-400 break-all">{value}</p>
        </dd>
      </div>);

  }

  if (typeof value === "string") {
    if (isHtmlContent(value)) {
      return (
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</dt>
          <dd
            className="blog-editor-content blog-content-preview mt-1 text-sm text-gray-900 break-words"
            dangerouslySetInnerHTML={{ __html: value }}
          />
        </div>
      );
    }

    return (
      <div>
        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap break-words">{value}</dd>
      </div>);

  }

  return (
    <div>
      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{formatScalar(value)}</dd>
    </div>);

}

function StringListField({ label, items }: {label: string;items: string[];}) {
  if (!items.length) {
    return <DetailField label={label} value={null} />;
  }

  return (
    <div>
      <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-2 flex flex-wrap gap-1.5">
        {items.map((item) =>
        <span
          key={item}
          className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-[#F3F4F6] text-[#374151]">
          
            {item}
          </span>
        )}
      </dd>
    </div>);

}

function ObjectBlock({
  title,
  data,
  index




}: {title: string;data: Record<string, unknown>;index?: number;}) {
  const entries = Object.entries(data).filter(
    ([key, value]) =>
    key !== "id" && key !== "categoryIds" && value !== null && value !== undefined && value !== ""
  );

  if (!entries.length) return null;

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-[#FAFBFD] p-4">
      <p className="text-sm font-semibold text-[#1F2A44] mb-3">
        {title}
        {index !== undefined ? ` ${index + 1}` : ""}
      </p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        {entries.map(([key, value]) =>
        <DetailField key={key} label={getFieldLabel(key)} value={value} />
        )}
      </dl>
    </div>);

}

function renderSectionContent(data: unknown): ReactNode {
  if (data === null || data === undefined) {
    return <p className="text-sm text-gray-400">No data saved for this step.</p>;
  }

  if (Array.isArray(data)) {
    if (!data.length) {
      return <p className="text-sm text-gray-400">No entries saved.</p>;
    }

    if (data.every((item) => typeof item === "string")) {
      return <StringListField label="Items" items={data as string[]} />;
    }

    return (
      <div className="space-y-3">
        {data.map((item, index) => {
          if (typeof item !== "object" || item === null) return null;
          const record = item as Record<string, unknown>;
          const heading =
          typeof record.question === "string" ?
          "FAQ" :
          typeof record.hotelName === "string" ?
          String(record.hotelName) :
          typeof record.dayNumber === "number" ?
          `Day ${record.dayNumber}` :
          typeof record.tier === "string" ?
          record.tier :
          "Entry";
          return (
            <ObjectBlock
              key={`${heading}-${index}`}
              title={heading}
              data={record}
              index={typeof record.dayNumber !== "number" ? index : undefined} />);


        })}
      </div>);

  }

  if (typeof data === "object") {
    const record = data as Record<string, unknown>;
    const scalarEntries: [string, unknown][] = [];
    const nestedEntries: [string, unknown][] = [];

    for (const [key, value] of Object.entries(record)) {
      if (value === null || value === undefined || value === "") continue;
      if (key === "categoryIds") continue;
      if (Array.isArray(value) || typeof value === "object" && value !== null) {
        nestedEntries.push([key, value]);
      } else {
        scalarEntries.push([key, value]);
      }
    }

    return (
      <div className="space-y-4">
        {scalarEntries.length > 0 &&
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {scalarEntries.map(([key, value]) => {
            if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
              return (
                <div key={key} className="sm:col-span-2">
                    <StringListField label={getFieldLabel(key)} items={value as string[]} />
                  </div>);

            }
            return <DetailField key={key} label={getFieldLabel(key)} value={value} />;
          })}
          </dl>
        }
        {nestedEntries.map(([key, value]) =>
        <div key={key}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              {getFieldLabel(key)}
            </p>
            {renderSectionContent(value)}
          </div>
        )}
        {!scalarEntries.length && !nestedEntries.length &&
        <p className="text-sm text-gray-400">No data saved for this step.</p>
        }
      </div>);

  }

  return <DetailField label="Value" value={data} />;
}

export default function PackageDetailsModal({ pkg, onClose }: PackageDetailsModalProps) {
  const [details, setDetails] = useState<PackageRecord | null>(pkg);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBuilderFields, setShowBuilderFields] = useState(false);
  const summaryCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pkg) return;

    queueMicrotask(() => {
      setDetails(pkg);
      setError(null);
      setShowBuilderFields(false);
    });

    if (!isWizardPackage(pkg)) return;

    queueMicrotask(() => {
      setLoading(true);
      getPackage(pkg.id).
      then((result) => {
        if (result.package) setDetails(result.package);
      }).
      catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load package details");
      }).
      finally(() => setLoading(false));
    });
  }, [pkg]);

  useEffect(() => {
    if (!pkg) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [pkg, onClose]);

  if (!pkg || !details) return null;

  const editHref = getPackageEditHref(details);
  const statusLabel = details.status.replaceAll("_", " ");
  const handleOpenPdf = () => {
    const content = summaryCardRef.current;
    if (!content) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      document.body.removeChild(iframe);
      return;
    }

    const title = details.package_title || "Package Details";
    const stylesheetNodes = Array.from(
      document.querySelectorAll("style, link[rel='stylesheet']")
    );
    const copiedStyles = stylesheetNodes
      .map((node) => {
        if (node.tagName.toLowerCase() === "link") {
          const href = (node as HTMLLinkElement).href;
          return `<link rel="stylesheet" href="${href}" />`;
        }
        return node.outerHTML;
      })
      .join("\n");

    doc.open();
    doc.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>${title}</title>
          ${copiedStyles}
          <style>
            body { margin: 0; background: #ffffff; color: #111827; }
            .pdf-root { padding: 20px; }
            @page { size: A4; margin: 12mm; }
          </style>
        </head>
        <body>
          <div class="pdf-root">${content.outerHTML}</div>
        </body>
      </html>
    `);
    doc.close();

    const cleanup = () => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    };

    win.focus();
    win.addEventListener("afterprint", cleanup, { once: true });
    setTimeout(() => {
      win.print();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close package details"
        className="absolute inset-0 cursor-default border-0 bg-black/40"
        onClick={onClose}
      />


      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="package-details-title"
        className="relative z-10 flex w-full max-w-5xl max-h-[90vh] flex-col rounded-2xl border border-[#E5E7EB] bg-white shadow-xl">
        
        <div className="flex items-start justify-between gap-4 border-b border-[#E5E7EB] px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#B48A2C]">
              Consultant brief
            </p>
            <h2
              id="package-details-title"
              className="mt-1 text-xl font-bold text-[#1F2A44] truncate">
              
              {details.package_title || "Untitled package"}
            </h2>
            <p className="mt-1 text-sm text-gray-500 truncate">
              {consultantBriefHeadline(details) || details.slug || `ID #${details.id}`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              onClick={handleOpenPdf}
              variant="outline"
              className="inline-flex h-9 items-center gap-1.5 px-3 text-sm font-medium text-[#1F2A44]"
              title="Open package details as PDF"
            >
              <Icon name="FileText" size={14} />
              Open PDF
            </Button>
            <Link
              href={editHref}
              className="inline-flex h-9 items-center px-3 text-sm font-medium text-[#B48A2C] border border-[#B48A2C]/30 rounded-lg hover:bg-[#B48A2C]/5">
              
              Edit package
            </Link>
            <Button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close">
              
              <Icon name="X" size={18} />
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {loading &&
          <p className="mb-4 text-sm text-gray-500">Loading full package details...</p>
          }
          {error &&
          <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          }

          <div ref={summaryCardRef} className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
              <span className="inline-flex rounded-full bg-[#F3F4F6] px-2 py-0.5 font-medium capitalize text-[#1F2A44]">
                {statusLabel}
              </span>
              <span>{isWizardPackage(details) ? "Wizard" : "Legacy"} · step {details.current_step}/14</span>
              <span>Updated {formatPackageDateTime(details.updated_at)}{details.updated_by ? ` · ${details.updated_by}` : ""}</span>
            </div>

            <PackageConsultantBrief pkg={details} />
          </div>

          <div className="mt-6 border-t border-[#E5E7EB] pt-4">
            <button
              type="button"
              onClick={() => setShowBuilderFields((open) => !open)}
              className="text-sm font-medium text-[#1F2A44] hover:text-[#B48A2C]"
            >
              {showBuilderFields ? "Hide builder fields" : "Show every builder field"}
            </button>
            <p className="mt-1 text-xs text-gray-400">
              The raw step-by-step fields, including SEO, media, and review notes.
            </p>
          </div>

          {showBuilderFields && (
          <div className="mt-4 space-y-5">
            {PACKAGE_DETAIL_SECTIONS.map((section) => {
              const sectionData = details[section.key];
              const isEmpty =
              sectionData === null ||
              sectionData === undefined ||
              Array.isArray(sectionData) && sectionData.length === 0 ||
              typeof sectionData === "object" &&
              !Array.isArray(sectionData) &&
              sectionData !== null &&
              !Object.values(sectionData).some(
                (value) => value !== null && value !== undefined && value !== ""
              );

              return (
                <section
                  key={section.key}
                  className="rounded-xl border border-[#E5E7EB] overflow-hidden">
                  
                  <div className="flex items-center justify-between gap-3 bg-[#F9FAFB] px-4 py-3 border-b border-[#E5E7EB]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1F2A44] text-[11px] font-bold text-white">
                        {section.step}
                      </span>
                      <h3 className="text-sm font-bold text-[#1F2A44] truncate">{section.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-medium ${
                          isEmpty ? "text-gray-400" : "text-emerald-600"
                        }`}
                      >
                        {isEmpty ? "Not filled" : "Filled"}
                      </span>
                      {isWizardPackage(details) ? (
                        <Link
                          href={getPackageEditHref(details, section.step)}
                          className="inline-flex size-7 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#B48A2C] hover:bg-[#B48A2C]/5 hover:border-[#B48A2C]/40 transition-colors"
                          title={`Edit ${section.title}`}
                          aria-label={`Edit ${section.title}`}
                        >
                          <Icon name="Pencil" size={14} />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  <div className="p-4">{renderSectionContent(sectionData)}</div>
                </section>);

            })}
          </div>
          )}
        </div>
      </div>
    </div>);

}
