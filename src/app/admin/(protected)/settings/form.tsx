"use client";

// src/app/admin/(protected)/settings/form.tsx
//
// Client component so useActionState can show a success/error banner
// in-page without a redirect — same reasoning as the student registration
// form. Each image field is independent and optional: leaving a file
// input untouched keeps whatever is already saved (see
// readOptionalUploadedFile's comment in admin/actions.ts for why an
// untouched input must NOT be treated as "clear this image").
import { useActionState, useState, type ChangeEvent } from "react";
import { updateBranding, type UpdateBrandingState } from "@/app/admin/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_BYTES } from "@/lib/upload-limits";

const initialState: UpdateBrandingState = { status: "idle" };
const ACCEPT = ALLOWED_IMAGE_MIME_TYPES.join(",");
const MAX_KB = Math.round(MAX_IMAGE_BYTES / 1024);

export function BrandingForm(props: {
  tagline: string;
  motto: string;
  establishedYear: number | null;
  authorityName: string;
  centreHeadName: string;
  registrationFeeRupees: number;
  logoDataUrl: string | null;
  campusPhotoDataUrl: string | null;
  authoritySignatureDataUrl: string | null;
  centreHeadSignatureDataUrl: string | null;
  // 2026-10-05: white-label
  tenantName: string;
  whiteLabelEnabled: boolean;
  subdomain: string;
  customDomain: string;
  primaryColor: string;
  hidePoweredBy: boolean;
}) {
  const [state, formAction] = useActionState(updateBranding, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.status === "error" && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.message}
        </p>
      )}
      {state.status === "success" && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          Branding updated.
        </p>
      )}

      <Card className="p-6">
        <h2 className="mb-4 font-semibold">Logo &amp; tagline</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageField label="Institute logo" name="logo" currentUrl={props.logoDataUrl} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              name="tagline"
              defaultValue={props.tagline}
              placeholder="e.g. where success is Tradition"
              maxLength={120}
            />
            <p className="text-xs text-neutral-500">Shown under the institute name on certificates.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="motto">Motto</Label>
            <Input
              id="motto"
              name="motto"
              defaultValue={props.motto}
              placeholder="e.g. Learn Today | Grow Tomorrow"
              maxLength={120}
            />
            <p className="text-xs text-neutral-500">Shown in the certificate header contact bar.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="establishedYear">Established year</Label>
            <Input
              id="establishedYear"
              name="establishedYear"
              type="number"
              min={1900}
              max={2100}
              defaultValue={props.establishedYear ?? ""}
              placeholder="e.g. 2020"
            />
            <p className="text-xs text-neutral-500">Shown on the gold seal (ESTD. year).</p>
          </div>
          <ImageField label="Campus photo" name="campusPhoto" currentUrl={props.campusPhotoDataUrl} />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-1 font-semibold">Signatures</h2>
        <p className="mb-4 text-sm text-neutral-500">
          Captured once and reused on every certificate — replace either one here whenever it
          changes.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="centreHeadName">Centre Head name</Label>
              <Input
                id="centreHeadName"
                name="centreHeadName"
                defaultValue={props.centreHeadName}
                placeholder="e.g. Rohit Sharma"
              />
            </div>
            <ImageField
              label="Centre Head signature"
              name="centreHeadSignature"
              currentUrl={props.centreHeadSignatureDataUrl}
            />
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="authorityName">Authority name</Label>
              <Input
                id="authorityName"
                name="authorityName"
                defaultValue={props.authorityName}
                placeholder="e.g. Dr. Anita Verma, Director"
              />
            </div>
            <ImageField
              label="Authority signature"
              name="authoritySignature"
              currentUrl={props.authoritySignatureDataUrl}
            />
          </div>
        </div>
      </Card>

      <WhiteLabelCard
        tenantName={props.tenantName}
        whiteLabelEnabled={props.whiteLabelEnabled}
        subdomain={props.subdomain}
        customDomain={props.customDomain}
        primaryColor={props.primaryColor}
        hidePoweredBy={props.hidePoweredBy}
      />

      <Card className="p-6">
        <h2 className="mb-1 font-semibold">Student registration fee</h2>        <p className="mb-4 text-sm text-neutral-500">
          One-time fee each student pays before their certificate download is activated.
          Set to 0 for free registration (no payment or approval needed). Paid
          registrations appear under Approvals.
        </p>
        <div className="flex flex-col gap-1.5 max-w-xs">
          <Label htmlFor="registrationFeeRupees">Fee amount (₹)</Label>
          <Input
            id="registrationFeeRupees"
            name="registrationFeeRupees"
            type="number"
            min={0}
            max={1000000}
            step="1"
            defaultValue={props.registrationFeeRupees}
            placeholder="0"
          />
          <p className="text-xs text-neutral-500">0 = free. Students pay online via Razorpay/Cashfree.</p>
        </div>
      </Card>

      <div>
        <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
      </div>
    </form>
  );
}

function WhiteLabelCard({
  tenantName,
  whiteLabelEnabled,
  subdomain,
  customDomain,
  primaryColor,
  hidePoweredBy,
}: {
  tenantName: string;
  whiteLabelEnabled: boolean;
  subdomain: string;
  customDomain: string;
  primaryColor: string;
  hidePoweredBy: boolean;
}) {
  // Auto-suggest a subdomain from the institute name, e.g.
  // "Sharma Coaching Centre" → "sharma-coaching-centre".
  const suggested = tenantName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
  const [sub, setSub] = useState(subdomain);
  const [enabled, setEnabled] = useState(whiteLabelEnabled);

  return (
    <Card className="p-6">
      <h2 className="mb-1 font-semibold">White label</h2>
      <p className="mb-4 text-sm text-neutral-500">
        Serve Certivo under your own branding — your logo, your name, your
        colors, your domain. Premium add-on (see Pricing).
      </p>

      <label className="mb-4 flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          name="whiteLabelEnabled"
          defaultChecked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 rounded accent-neutral-900"
        />
        <span className="text-sm font-medium">Enable white-label for this institute</span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="subdomain">Subdomain</Label>
          <div className="flex items-center gap-1">
            <Input
              id="subdomain"
              name="subdomain"
              value={sub}
              onChange={(e) => setSub(e.target.value.toLowerCase())}
              placeholder={suggested || "your-institute"}
              maxLength={63}
              className="font-mono"
            />
            <button
              type="button"
              onClick={() => setSub(suggested)}
              className="shrink-0 rounded-md border border-neutral-200 px-2.5 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Use suggestion
            </button>
          </div>
          <p className="text-xs text-neutral-500">
            Your site will be live at <span className="font-mono">{sub || suggested || "your-institute"}.certivo.in</span> once
            enabled.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="customDomain">Custom domain (optional)</Label>
          <Input
            id="customDomain"
            name="customDomain"
            defaultValue={customDomain}
            placeholder="certificates.yourinstitute.com"
            maxLength={253}
            className="font-mono"
          />
          <p className="text-xs text-neutral-500">
            Point a DNS <span className="font-mono">CNAME</span> record from your
            domain to <span className="font-mono">certivo-chandan21.vercel.app</span>,
            then enter the domain here.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="primaryColor">Brand color</Label>
          <div className="flex items-center gap-2">
            <input
              id="primaryColor"
              name="primaryColor"
              type="color"
              defaultValue={/^#[0-9a-fA-F]{6}$/.test(primaryColor) ? primaryColor : "#0F172A"}
              className="h-10 w-14 cursor-pointer rounded border border-neutral-200 bg-white p-1 dark:border-neutral-700"
            />
            <span className="text-xs text-neutral-500">
              Used as the accent color across your white-label site.
            </span>
          </div>
        </div>

        <div className="flex items-center">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              name="hidePoweredBy"
              defaultChecked={hidePoweredBy}
              className="h-4 w-4 rounded accent-neutral-900"
            />
            <span className="text-sm">
              Hide &ldquo;Powered by Certivo&rdquo; in the footer
            </span>
          </label>
        </div>
      </div>

      {!enabled && (
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          White-label is a premium add-on at ₹999/month. Enable it here and our
          team will confirm activation — your branding stays saved either way.
        </p>
      )}
    </Card>
  );
}

function ImageField({
  label,
  name,
  currentUrl,
}: {
  label: string;
  name: string;
  currentUrl: string | null;
}) {
  // Preview whatever the admin just picked, falling back to what's
  // already saved — purely a local, in-browser preview; the actual file
  // only reaches the server when the form submits.
  const [preview, setPreview] = useState<string | null>(currentUrl);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPreview(currentUrl);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(typeof reader.result === "string" ? reader.result : currentUrl);
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element -- data: URLs
        // from a locally-selected file / server-fetched bytes, not a
        // remote image next/image would need to optimize.
        <img
          src={preview}
          alt={`${label} preview`}
          className="h-16 w-auto max-w-[160px] rounded border border-neutral-200 bg-white object-contain p-1 dark:border-neutral-800"
        />
      ) : (
        <div className="flex h-16 w-40 items-center justify-center rounded border border-dashed border-neutral-300 text-xs text-neutral-400 dark:border-neutral-700">
          Not set
        </div>
      )}
      <Input id={name} name={name} type="file" accept={ACCEPT} onChange={onChange} />
      <p className="text-xs text-neutral-500">PNG or JPEG, up to {MAX_KB}KB.</p>
    </div>
  );
}
