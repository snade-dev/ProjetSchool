import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import prisma from "./prisma";
import { auditWithSession } from "./audit";

/**
 * W13 — Canal email SMTP (§2.6.3, allégé).
 *
 * RÈGLE ABSOLUE (même pattern que audit.ts / notify.ts) : l'email ne fait
 * JAMAIS échouer l'action métier. Toute défaillance (pas de config, DNS,
 * timeout, refus SMTP…) = console.error + entrée AuditLog `email.fail`
 * (sans données sensibles : ni mot de passe, ni corps du message).
 *
 * Résolution de la configuration, dans l'ordre :
 *   1. l'ÉCOLE : School.emailEnabled=true ET School.smtpHost renseigné ;
 *   2. la PLATEFORME : variables d'env SMTP_HOST / SMTP_PORT / SMTP_USER /
 *      SMTP_PASS / SMTP_FROM (pas de .env.example dans le repo — documentées ici) ;
 *   3. ni l'un ni l'autre → abandon silencieux loggé (in-app seulement).
 *
 * AMÉLIORATION NOTÉE : School.smtpPass est stocké en clair en base — à
 * chiffrer au repos (clé applicative) dans une story ultérieure.
 */

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
};

export type ResolvedEmailConfig = {
  source: "school" | "platform";
  host: string;
  port: number;
  user: string | null;
  pass: string | null;
  from: string;
  /** Nom de l'école (en-tête des templates). */
  schoolName: string;
};

// ---------------------------------------------------------------------------
// Transport injectable (tests) : les tests remplacent la fabrique par un
// jsonTransport / mock sans toucher au réseau. null = nodemailer réel.
// ---------------------------------------------------------------------------
type TransportFactory = (config: ResolvedEmailConfig) => Transporter;

let transportFactory: TransportFactory | null = null;

/** Réservé aux tests : injecte une fabrique de transport (null = réel). */
export function __setEmailTransportFactoryForTests(
  factory: TransportFactory | null
): void {
  transportFactory = factory;
}

function buildTransport(config: ResolvedEmailConfig): Transporter {
  if (transportFactory) return transportFactory(config);
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth:
      config.user && config.pass
        ? { user: config.user, pass: config.pass }
        : undefined,
    // Timeouts courts : un SMTP injoignable ne doit pas retenir l'action.
    connectionTimeout: 5_000,
    greetingTimeout: 5_000,
    socketTimeout: 10_000,
  });
}

/**
 * Résout la config SMTP effective d'une école (école → plateforme → null).
 * Ne lève jamais ; null = pas d'email pour cette école (in-app seulement).
 */
export async function resolveEmailConfig(
  schoolId: number
): Promise<ResolvedEmailConfig | null> {
  try {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        name: true,
        emailEnabled: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpPass: true,
        smtpFrom: true,
      },
    });
    if (!school) return null;

    // 1. Config propre à l'école (activée + hôte renseigné)
    if (school.emailEnabled && school.smtpHost) {
      return {
        source: "school",
        host: school.smtpHost,
        port: school.smtpPort ?? 587,
        user: school.smtpUser ?? null,
        pass: school.smtpPass ?? null,
        from: school.smtpFrom || school.smtpUser || `no-reply@${school.smtpHost}`,
        schoolName: school.name,
      };
    }

    // 2. Fallback plateforme (env SMTP_*)
    const host = process.env.SMTP_HOST;
    if (host) {
      return {
        source: "platform",
        host,
        port: parseInt(process.env.SMTP_PORT ?? "587", 10) || 587,
        user: process.env.SMTP_USER ?? null,
        pass: process.env.SMTP_PASS ?? null,
        from: process.env.SMTP_FROM || process.env.SMTP_USER || `no-reply@${host}`,
        schoolName: school.name,
      };
    }

    // 3. Aucune config : canal email inactif pour cette école.
    return null;
  } catch (err) {
    console.error("[email] résolution de la config SMTP impossible:", err);
    return null;
  }
}

/**
 * Envoie UN email au nom d'une école. Jamais bloquant : retourne
 * { sent: boolean, error?: string } — échec = console.error + AuditLog
 * `email.fail` (destinataire + sujet, jamais le contenu ni le mot de passe).
 */
export async function sendEmail(
  schoolId: number,
  payload: EmailPayload
): Promise<{ sent: boolean; error?: string }> {
  try {
    const config = await resolveEmailConfig(schoolId);
    if (!config) {
      // Abandon propre : l'école n'a pas de canal email (cas nominal).
      console.info(
        `[email] école #${schoolId} sans config SMTP — email « ${payload.subject} » non envoyé (in-app seulement).`
      );
      return { sent: false, error: "NO_CONFIG" };
    }
    return await sendWithConfig(schoolId, config, payload);
  } catch (err) {
    // Ceinture + bretelles : sendWithConfig gère déjà ses échecs.
    console.error("[email] échec inattendu:", err);
    return { sent: false, error: String(err) };
  }
}

/**
 * Variante interne pour les envois en lot : la config est résolue UNE fois
 * par l'appelant. Jamais bloquant.
 */
export async function sendWithConfig(
  schoolId: number,
  config: ResolvedEmailConfig,
  payload: EmailPayload
): Promise<{ sent: boolean; error?: string }> {
  try {
    const transport = buildTransport(config);
    await transport.sendMail({
      from: config.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      attachments: payload.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
    return { sent: true };
  } catch (err) {
    console.error(
      `[email] échec d'envoi « ${payload.subject} » → ${payload.to}:`,
      err
    );
    // §2.11 — trace d'exploitation SANS données sensibles (ni corps, ni pass).
    await auditWithSession(null, "email.fail", `School#${schoolId}`, {
      schoolId,
      after: {
        to: payload.to,
        subject: payload.subject,
        source: config.source,
        error: err instanceof Error ? err.message : String(err),
      },
    });
    return { sent: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// Templates HTML minimalistes FR
// ---------------------------------------------------------------------------

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Base publique de l'app pour absolutiser les liens internes des emails. */
export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "").replace(/\/+$/, "");
}

/**
 * Gabarit commun : en-tête au nom de l'école, corps HTML fourni, pied de page
 * « ne pas répondre ». `bodyHtml` est du HTML DÉJÀ sûr (échapper les valeurs
 * dynamiques avec escapeHtml avant interpolation).
 */
export function renderEmail(
  title: string,
  bodyHtml: string,
  school: { name: string }
): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#111">
  <div style="border-bottom:3px solid #C3EBFA;padding:16px 0;margin-bottom:16px">
    <div style="font-size:18px;font-weight:bold">${esc(school.name)}</div>
  </div>
  <h2 style="font-size:16px;margin:0 0 12px">${esc(title)}</h2>
  <div style="font-size:14px;line-height:1.6">${bodyHtml}</div>
  <div style="border-top:1px solid #eee;margin-top:24px;padding-top:12px;font-size:11px;color:#888">
    Notification automatique envoyée par ${esc(school.name)} — merci de ne pas répondre à cet email.
  </div>
</div>`;
}

export { esc as escapeHtml };
