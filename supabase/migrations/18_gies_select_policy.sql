-- La table gies a RLS activé depuis la migration 00 mais n'a jamais eu de policy :
-- avec RLS activé et zéro policy, Postgres bloque toute lecture pour les clients
-- non-admin. Ça cassait silencieusement `gies(nom, subscription_tier)` dans toutes
-- les pages du dashboard (nom affiché "Mon GIE", forfait toujours vu comme "standard"
-- même pour un GIE medium/premium — cause du bug d'accès matériel signalé sur WABS).
create policy "Les utilisateurs voient leur propre GIE"
on public.gies for select using (
    id in (select gie_id from public.utilisateurs where id = auth.uid())
);
