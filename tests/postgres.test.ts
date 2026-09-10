import { it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
it("enforces ownership, ID-only unlisted access, tombstones and stale revisions in PostgreSQL", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; GRANT USAGE ON SCHEMA auth TO authenticated,anon; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon; INSERT INTO auth.users VALUES ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');`,
    );
    await db.exec(readFileSync("supabase/schema.sql", "utf8"));
    await db.exec(readFileSync("supabase/schema.sql", "utf8"));
    const owner = "00000000-0000-4000-8000-000000000001",
      other = "00000000-0000-4000-8000-000000000002",
      publicId = "00000000-0000-4000-8000-000000000003";
    await db.exec(
      `SET ROLE authenticated; SET request.jwt.claim.sub='${owner}';`,
    );
    await db.query(
      `SELECT publish_document($1,'list','Unlisted','{"title":"Private link"}',5,false)`,
      [publicId],
    );
    await db.exec(`RESET ROLE; SET ROLE anon; RESET request.jwt.claim.sub;`);
    await expect(db.query("SELECT * FROM public_documents")).rejects.toThrow();
    expect(
      (await db.query("SELECT * FROM read_public_document($1)", [publicId]))
        .rows,
    ).toHaveLength(1);
    expect(
      (await db.query("SELECT * FROM read_public_document($1)", [other])).rows,
    ).toHaveLength(0);
    await db.exec(
      `RESET ROLE; SET ROLE authenticated; SET request.jwt.claim.sub='${other}';`,
    );
    expect(
      (await db.query("SELECT * FROM public_documents")).rows,
    ).toHaveLength(0);
    await expect(
      db.query(`SELECT publish_document($1,'list','Public','{}',6,false)`, [
        publicId,
      ]),
    ).rejects.toThrow();
    await db.exec(`SET request.jwt.claim.sub='${owner}';`);
    await db.query(
      `SELECT publish_document($1,'list','Public','{"title":"Stale"}',4,false)`,
      [publicId],
    );
    const current = await db.query<{ payload: { title: string } }>(
      "SELECT payload FROM public_documents",
    );
    expect(current.rows[0].payload.title).toBe("Private link");
    await db.query(`SELECT publish_document($1,'list','Private','{}',7,true)`, [
      publicId,
    ]);
    await db.query(
      `SELECT publish_document($1,'list','Public','{"title":"Resurrect"}',6,false)`,
      [publicId],
    );
    await db.exec("RESET ROLE; SET ROLE anon;");
    expect(
      (await db.query("SELECT * FROM read_public_document($1)", [publicId]))
        .rows,
    ).toHaveLength(0);
  } finally {
    await db.close();
  }
}, 30000);
