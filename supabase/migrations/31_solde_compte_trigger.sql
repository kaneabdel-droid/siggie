-- Interdit qu'un compte qui n'est pas de type "banque" (caisse, etc.) passe en
-- solde négatif — un point d'application unique en BEFORE INSERT couvre tous
-- les chemins d'écriture existants (addTransaction, addDecaissementCredit,
-- addRemboursementCredit) sans dupliquer le contrôle dans chacun. `compte_id`
-- est nullable sur `transactions` (transactions historiques non rattachées à
-- un compte) : on laisse passer sans contrôle dans ce cas, comportement
-- inchangé. Un compte "banque" peut légitimement aller à découvert.
create or replace function public.verifier_solde_compte()
returns trigger language plpgsql as $$
declare
  v_type_compte varchar(50);
  v_solde numeric;
begin
  if new.compte_id is null then
    return new;
  end if;

  select type_compte, solde_initial into v_type_compte, v_solde
  from public.comptes
  where id = new.compte_id;

  if v_type_compte is distinct from 'banque' then
    select v_solde + coalesce(sum(case when type_transaction = 'entree' then montant else -montant end), 0)
    into v_solde
    from public.transactions
    where compte_id = new.compte_id;

    if new.type_transaction = 'sortie' and (v_solde - new.montant) < 0 then
      raise exception 'Solde insuffisant sur ce compte (solde actuel : %, montant demandé : %)', v_solde, new.montant;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_verifier_solde_compte
  before insert on public.transactions
  for each row execute procedure public.verifier_solde_compte();
