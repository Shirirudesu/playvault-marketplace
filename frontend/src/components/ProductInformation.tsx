import { useState } from "react";
import type { Product, ProductRequirement } from "../api";
import { SectionHeading } from "./SectionHeading";

export function ProductInformation({ product }: { product: Product }) {
  const [expanded, setExpanded] = useState(false);
  const description = product.long_description?.trim() || product.description;
  const paragraphs = description.split(/\n\s*\n/).filter(Boolean);
  const longDescription = description.length > 450 || paragraphs.length > 2;
  const requirements = product.system_requirements;
  const metadata = product.metadata;

  return (
    <div className="space-y-8">
      <section
        id="about-game"
        aria-labelledby="about-game-heading"
        className="scroll-mt-6"
      >
        <SectionHeading title="About this game" />
        <div className="relative mt-3 border border-white/10 bg-[#351183] p-4 sm:p-5 lg:p-6">
          <h2 id="about-game-heading" className="text-base font-extrabold">
            {product.title}
          </h2>
          <div
            className={`mt-3 max-w-5xl space-y-4 text-sm leading-6 text-[#D3C8EB] ${!expanded ? "line-clamp-4" : ""}`}
          >
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          {longDescription && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-3 cursor-pointer text-sm font-bold text-[#FAD318] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FAD318]"
              aria-expanded={expanded}
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      </section>

      {requirements && Object.values(requirements).some(Boolean) && (
        <section aria-labelledby="system-requirements-heading">
          <SectionHeading title="System requirements" />
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {requirements.minimum && (
              <RequirementCard
                title="Minimum requirements"
                requirement={requirements.minimum}
              />
            )}
            {requirements.recommended && (
              <RequirementCard
                title="Recommended requirements"
                requirement={requirements.recommended}
              />
            )}
          </div>
        </section>
      )}

      {metadata &&
        Object.values(metadata).some((value) =>
          Array.isArray(value) ? value.length > 0 : Boolean(value),
        ) && (
          <section aria-labelledby="other-details-heading">
            <SectionHeading title="Other details" />
            <dl
              className="mt-3 grid gap-px border border-white/10 bg-white/10"
              style={{
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
              }}
            >
              {metadata.developer && (
                <Detail label="Developer" value={metadata.developer} />
              )}
              {metadata.publisher && (
                <Detail label="Publisher" value={metadata.publisher} />
              )}
              {metadata.supported_languages?.length && (
                <Detail
                  label="Supported languages"
                  value={metadata.supported_languages.join(", ")}
                />
              )}
              {metadata.supported_operating_systems?.length && (
                <Detail
                  label="Supported operating systems"
                  value={metadata.supported_operating_systems.join(", ")}
                />
              )}
            </dl>
          </section>
        )}
    </div>
  );
}

function RequirementCard({
  title,
  requirement,
}: {
  title: string;
  requirement: ProductRequirement;
}) {
  const rows: [string, string | undefined][] = [
    ["Operating system", requirement.operating_system],
    ["Processor", requirement.processor],
    ["Memory", requirement.ram],
    ["Graphics", requirement.graphics],
    ["Storage", requirement.storage],
    ["Additional notes", requirement.additional],
  ];
  return (
    <div className="border border-white/10 bg-[#1F0A4D] p-4 sm:p-5">
      <h3 className="mb-3 text-sm font-extrabold">{title}</h3>
      <dl className="space-y-2">
        {rows
          .filter((row): row is [string, string] => Boolean(row[1]))
          .map(([label, value]) => (
            <div
              key={label}
              className="grid gap-1 text-xs sm:grid-cols-[125px_1fr] sm:gap-3"
            >
              <dt className="text-[#B3AAC9]">{label}</dt>
              <dd className="break-words text-white">{value}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 bg-[#1F0A4D] px-4 py-3">
      <dt className="text-[10px] font-bold uppercase tracking-[.12em] text-[#9385B2]">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium text-white">
        {value}
      </dd>
    </div>
  );
}
