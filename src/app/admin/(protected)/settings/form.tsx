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

      <Card className="p-6">
        <h2 className="mb-1 font-semibold">Student registration fee</h2>
        <p className="mb-4 text-sm text-neutral-500">
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
