import { htmlToText } from "./render";

/**
 * Sending goes through Resend when RESEND_API_KEY is set, and to the log otherwise
 * (SPEC §5.6). Nothing but the text and the PDF leaves the app — no tracking pixels, no
 * third-party templates.
 */

export interface Attachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface Message {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: Attachment[];
}

export type SendResult =
  | { sent: true; id: string | null; via: "resend" }
  | { sent: false; via: "log"; reason: string };

const ENDPOINT = "https://api.resend.com/emails";

export function fromAddress(): string {
  const studio = process.env.STUDIO_NAME || "The Atelier";
  const address = process.env.EMAIL_FROM || "onboarding@resend.dev";
  return `${studio} <${address}>`;
}

export function atelierAddress(): string | null {
  return process.env.ATELIER_EMAIL || null;
}

export async function sendEmail(message: Message): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const text = message.text ?? htmlToText(message.html);

  if (!key) {
    // The demo runs without an email provider; the message still has to be inspectable.
    console.log(
      `[email:log] to=${message.to} subject=${JSON.stringify(message.subject)}` +
        (message.attachments?.length
          ? ` attachments=${message.attachments.map((a) => a.filename).join(",")}`
          : "") +
        `\n${text.slice(0, 1200)}`
    );
    return { sent: false, via: "log", reason: "RESEND_API_KEY is not set" };
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromAddress(),
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text,
        reply_to: message.replyTo,
        attachments: message.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content.toString("base64"),
          content_type: a.contentType,
        })),
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error(`[email] resend refused (${response.status}): ${body.slice(0, 300)}`);
      return { sent: false, via: "log", reason: `resend ${response.status}` };
    }
    const data = (await response.json()) as { id?: string };
    return { sent: true, id: data.id ?? null, via: "resend" };
  } catch (err) {
    // A booking must not fail because the email did.
    console.error("[email] send failed", err);
    return { sent: false, via: "log", reason: String(err) };
  }
}
