"use client";

import { useState } from "react";
import {
  Button,
  Chip,
  Segmented,
  Swatch,
  Stepper,
  SpecTable,
  PricePill,
  Sheet,
  Modal,
  ConsentRow,
  Field,
  useToast,
} from "@/components/ui";

export default function ComponentShowcase() {
  const [metal, setMetal] = useState<string>("yellow");
  const [karat, setKarat] = useState<string>("18");
  const [wrist, setWrist] = useState(16);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [chip1, setChip1] = useState(true);
  const [chip2, setChip2] = useState(false);
  const { toast } = useToast();

  return (
    <div className="px-6 lg:px-margin-d py-12 max-w-content mx-auto">
      <h1 className="font-display text-display-m-m lg:text-display-m-d mb-2">
        Design System
      </h1>
      <p className="text-body-m-m text-text-muted mb-12">
        Quiet Heritage components — Paper and Evening modes.
      </p>

      {/* Buttons */}
      <Section title="Buttons">
        <div className="qh-demo">
          <Button variant="primary">Book a consultation</Button>
          <Button variant="secondary">Try it on</Button>
          <Button variant="quiet">Cancel</Button>
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
      </Section>

      {/* Chips */}
      <Section title="Filter Chips">
        <div className="qh-demo">
          <Chip selected={chip1} onClick={() => setChip1(!chip1)} count={12}>
            Heirloom
          </Chip>
          <Chip selected={chip2} onClick={() => setChip2(!chip2)}>
            Fine
          </Chip>
          <Chip disabled>Playful</Chip>
        </div>
      </Section>

      {/* Segmented */}
      <Section title="Segmented Control">
        <div className="qh-demo qh-demo--col">
          <Segmented
            label="Metal"
            options={[
              { value: "yellow", label: "Yellow", dotColor: "var(--metal-yellow)" },
              { value: "white", label: "White", dotColor: "var(--metal-white)" },
              { value: "rose", label: "Rose", dotColor: "var(--metal-rose)" },
            ]}
            value={metal}
            onChange={setMetal}
          />
          <Segmented
            label="Karat"
            options={[
              { value: "14", label: "14K" },
              { value: "18", label: "18K" },
              { value: "22", label: "22K" },
            ]}
            value={karat}
            onChange={setKarat}
          />
        </div>
      </Section>

      {/* Swatches */}
      <Section title="Metal Swatches">
        <div className="qh-swatches">
          <div className="qh-swatches__row">
            <Swatch color="var(--metal-yellow)" name="Yellow" selected={metal === "yellow"} onClick={() => setMetal("yellow")} />
            <Swatch color="var(--metal-white)" name="White" selected={metal === "white"} onClick={() => setMetal("white")} />
            <Swatch color="var(--metal-rose)" name="Rose" selected={metal === "rose"} onClick={() => setMetal("rose")} />
          </div>
        </div>
      </Section>

      {/* Stepper */}
      <Section title="Stepper">
        <Stepper
          label="Wrist size"
          value={wrist}
          min={14}
          max={20}
          step={0.5}
          formatValue={(v) => `${v} cm`}
          onChange={setWrist}
        />
      </Section>

      {/* Spec Table */}
      <Section title="Spec Table">
        <SpecTable
          caption="Specifications"
          rows={[
            { label: "Code", value: "LX-104" },
            { label: "Metal", value: "18K Yellow Gold" },
            { label: "Weight", value: "10.4 g" },
            { label: "Length", value: "62 mm" },
            { label: "Width", value: "14 mm" },
          ]}
        />
      </Section>

      {/* Price Pill */}
      <Section title="Price Pill">
        <div className="qh-demo">
          <PricePill value="₹1.4–1.7L" />
          <PricePill label="From" value="₹82,400" />
        </div>
      </Section>

      {/* Field */}
      <Section title="Field / Input">
        <div className="flex flex-col gap-4 max-w-sm">
          <Field label="Name" placeholder="Your name" />
          <Field label="Email" type="email" hint="We'll confirm your slot here." />
          <Field label="Phone" error="Please enter a valid phone number." />
        </div>
      </Section>

      {/* Consent */}
      <Section title="Consent Row">
        <ConsentRow
          label="I agree that this is an indicative preview. The finished piece is made to order."
          required
          checked={consent}
          onChange={() => setConsent(!consent)}
        />
      </Section>

      {/* Overlays */}
      <Section title="Overlays">
        <div className="qh-demo">
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            Open Sheet
          </Button>
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open Modal
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast("Look saved to your board.", { variant: "positive" })
            }
          >
            Show Toast
          </Button>
        </div>
        <Sheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Customise"
          footer={
            <Button variant="primary" block onClick={() => setSheetOpen(false)}>
              Apply
            </Button>
          }
        >
          <p className="text-body-m-m text-text-muted">
            Sheet content goes here. Customisation controls for metal, karat,
            and size would appear in this overlay.
          </p>
        </Sheet>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Confirm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setModalOpen(false)}>
                Confirm
              </Button>
            </>
          }
        >
          <p className="text-body-m-m">
            Are you sure you want to remove this look from your board?
          </p>
        </Modal>
      </Section>

      {/* Evening mode */}
      <Section title="Evening Mode (AR)">
        <div
          data-theme="evening"
          className="rounded-sm p-6 bg-surface text-text"
        >
          <p className="label-m mb-4">AR controls preview</p>
          <div className="qh-demo">
            <Button variant="primary">Snapshot</Button>
            <Button variant="secondary">Change metal</Button>
            <PricePill value="₹1.4–1.7L" />
          </div>
          <div className="mt-4 flex gap-3">
            <Swatch color="var(--metal-yellow)" name="Yellow" selected />
            <Swatch color="var(--metal-white)" name="White" />
            <Swatch color="var(--metal-rose)" name="Rose" />
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <h2 className="qh-demo__h mb-4">{title}</h2>
      {children}
    </section>
  );
}
