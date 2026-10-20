import { z } from "zod";

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    HOST: z.string().default("0.0.0.0"),
    /** postgres://… in production; pglite:<dir> (or pglite:memory) for a local embedded database. */
    DATABASE_URL: z.string().default("pglite:.data/dev"),
    /**
     * Public URL of the app, used in magic link e-mails. Railway shows domains without a scheme,
     * so `https://` is added when missing, and spaces and trailing slashes are dropped.
     */
    APP_URL: z
      .string()
      .default("http://localhost:5173")
      .transform((v) => v.trim().replace(/\/+$/, ""))
      .transform((v) => (/^https?:\/\//.test(v) ? v : `https://${v}`))
      .pipe(z.string().url()),
    /** Directory of the built web app, served in production. */
    WEB_DIST: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    /** Web Push keys (pnpm --filter @comptoirs/server vapid). Without them, no push. */
    VAPID_PUBLIC_KEY: z.string().optional(),
    /** Comma-separated e-mails allowed to see the retention dashboard (/admin). */
    ADMIN_EMAILS: z.string().default(""),
    /** The players' community (a Discord invite, a forum): a link in the game. */
    COMMUNITY_URL: z.string().url().optional(),
    /** Discord or Slack incoming webhook: alerts when the world stalls or something breaks. */
    ALERT_WEBHOOK_URL: z.string().url().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),
    VAPID_SUBJECT: z.string().default("mailto:contact@comptoirs.app"),
    MAIL_FROM: z.string().default("Fondaco <onboarding@resend.dev>"),
    /**
     * Beta: the open world takes the theme's current balancing at each start. Set to "false" once
     * a season's settings are tuned in the database.
     */
    WORLD_SETTINGS_FROM_THEME: z
      .enum(["true", "false"])
      .default("true")
      .transform((v) => v === "true"),
    /**
     * Development only: JSON merged over the world's settings at start, e.g.
     * `{"terraferma":{"live":false}}` to play the families of the worlds before the Terraferma.
     */
    WORLD_SETTINGS_OVERRIDE: z
      .string()
      .optional()
      .transform((v) => (v ? (JSON.parse(v) as Record<string, unknown>) : undefined)),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production" && env.WORLD_SETTINGS_OVERRIDE) {
      ctx.addIssue({
        code: "custom",
        path: ["WORLD_SETTINGS_OVERRIDE"],
        message: "development only",
      });
    }
    if (env.NODE_ENV === "production" && !env.RESEND_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["RESEND_API_KEY"], message: "required in production" });
    }
    if (env.NODE_ENV === "production" && env.DATABASE_URL.startsWith("pglite:")) {
      ctx.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "use PostgreSQL in production",
      });
    }
  });

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return schema.parse(env);
}
