-- Run in your own Supabase project's SQL editor. No service-role key belongs in the client.
CREATE TABLE IF NOT EXISTS public.public_documents (
  public_id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('list','profile','review')),
  visibility text NOT NULL CHECK (visibility IN ('Private','Unlisted','Public')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  revision bigint NOT NULL,
  deleted boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.public_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS read_shared_documents ON public.public_documents;
CREATE POLICY read_shared_documents ON public.public_documents FOR SELECT TO authenticated USING (owner_id = auth.uid());
DROP POLICY IF EXISTS manage_own_documents ON public.public_documents;
CREATE POLICY manage_own_documents ON public.public_documents FOR ALL TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());

CREATE OR REPLACE FUNCTION public.publish_document(p_public_id uuid, p_kind text, p_visibility text, p_payload jsonb, p_revision bigint, p_deleted boolean)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF octet_length(p_payload::text)>2000000 THEN RAISE EXCEPTION 'Publication too large'; END IF;
  INSERT INTO public.public_documents(public_id,owner_id,kind,visibility,payload,revision,deleted)
  VALUES(p_public_id,auth.uid(),p_kind,p_visibility,p_payload,p_revision,p_deleted)
  ON CONFLICT(public_id) DO UPDATE SET kind=excluded.kind,visibility=excluded.visibility,payload=excluded.payload,revision=excluded.revision,deleted=excluded.deleted,updated_at=now()
  WHERE public_documents.owner_id=auth.uid() AND public_documents.revision<=excluded.revision;
  IF NOT FOUND AND NOT EXISTS (SELECT 1 FROM public.public_documents WHERE public_id=p_public_id AND owner_id=auth.uid()) THEN
    RAISE EXCEPTION 'Publication belongs to another account';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.publish_document(uuid,text,text,jsonb,bigint,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_document(uuid,text,text,jsonb,bigint,boolean) TO authenticated;
REVOKE ALL ON public.public_documents FROM anon;
GRANT SELECT ON public.public_documents TO authenticated;
GRANT INSERT,UPDATE,DELETE ON public.public_documents TO authenticated;

-- ID-only lookup prevents visitors from enumerating unlisted publications.
CREATE OR REPLACE FUNCTION public.read_public_document(p_public_id uuid)
RETURNS TABLE(public_id uuid,visibility text,kind text,payload jsonb,revision bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT d.public_id,d.visibility,d.kind,d.payload,d.revision
  FROM public.public_documents d
  WHERE d.public_id=p_public_id AND NOT d.deleted AND d.visibility IN ('Public','Unlisted');
$$;
REVOKE ALL ON FUNCTION public.read_public_document(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_public_document(uuid) TO anon,authenticated;
