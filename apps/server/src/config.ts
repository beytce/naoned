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
    MAIL_FROM: z.string().default("Comptoirs <onboarding@resend.dev>"),
  })
  .superRefine((env, ctx) => {
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
