import { neon } from "@neondatabase/serverless";
export const sql = neon(process.env.DATABASE_URL!);
export function checkAuth(req: Request) {
  return req.headers.get("x-app-password") === process.env.APP_PASSWORD;
}
