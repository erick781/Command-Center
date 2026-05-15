import type { ReactNode } from "react";

type DeliverableViewerMeta = {
  label: string;
  value: string;
};

type DeliverableViewerProps = {
  actions?: ReactNode;
  contentHtml: string;
  eyebrow: string;
  meta: DeliverableViewerMeta[];
  previewLabel?: string;
  subtitle?: string;
  title: string;
  viewportMaxHeight?: number;
};

export function DeliverableViewer(props: DeliverableViewerProps) {
  const {
    actions,
    contentHtml,
    eyebrow,
    meta,
    previewLabel,
    subtitle,
    title,
    viewportMaxHeight = 800,
  } = props;

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/[0.06] bg-[#101015]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-400">
            {eyebrow}
          </div>
          <div className="mt-2 text-lg font-semibold text-white">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-white/36">{subtitle}</div> : null}
        </div>

        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>

      <div className="p-4 md:p-6">
        {previewLabel ? (
          <div className="mb-4 text-[11px] uppercase tracking-[0.18em] text-white/30">{previewLabel}</div>
        ) : null}

        <div
          className="overflow-y-auto rounded-[28px] bg-[#f6f3ec] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] md:p-8"
          style={{ maxHeight: viewportMaxHeight }}
        >
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-[#e6dccf] pb-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-400">
                  {eyebrow}
                </div>
                <div className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-[#111111]">
                  {title}
                </div>
                {subtitle ? <div className="mt-2 text-sm text-[#6b6257]">{subtitle}</div> : null}
              </div>

              <div className="grid gap-2 sm:min-w-[220px]">
                {meta.map((item) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    className="rounded-2xl border border-[#eadfce] bg-[#fbf7ef] px-4 py-3"
                  >
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[#8a7a67]">
                      {item.label}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[#171410]">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="text-sm leading-7"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
