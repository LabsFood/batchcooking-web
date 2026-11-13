"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, Loader2, Pencil, RotateCw } from "lucide-react";
import { Card } from "@/components/chef/ChefPage";
import IngredientFields, {
  draftFromIngredient,
  ingredientBody,
  readIngredientError,
  validateIngredient,
  type IngredientDraft,
  type IngredientField,
} from "@/components/chef/recipes/IngredientFields";
import { InfoPopover } from "@/components/shared/InfoPopover";
import { useToast } from "@/components/shared/Toaster";
import { apiMessage } from "@/lib/api/messages";
import {
  useMyIngredients,
  useUpdateIngredient,
  type MyIngredient,
} from "@/lib/api/ingredients";
import { refLabel, useAisles, useAllergens } from "@/lib/api/referentials";
import { REGULATED_ALLERGENS, aisleLabel } from "@/lib/recipe-fields";

/* ─────────────────────────────────────────────────────────────────────────────
   Mes ingrédients, onglet « Mes créations » (Recettes §7.1).

   Ce que le batch cooker a créé quand la liste commune n'avait pas le sien.
   Trois sorts possibles : « en attente » (privé, modifiable), « validé » (il a
   rejoint la liste commune : il n'est plus à vous) ou « remplacé » (fusionné
   avec une entrée de la liste, que la page nomme).

   Modifier un ingrédient en attente met à jour toutes les recettes qui
   l'utilisent : le formulaire le rappelle. Les allergènes sont exigés, comme à
   la création ; l'API reste l'autorité et ses refus s'affichent près du champ.
   ───────────────────────────────────────────────────────────────────────────── */

export default function MesCreations() {
  const query = useMyIngredients();
  const list = query.data ?? [];
  const pending = list.filter((i) => i.status === "pending");
  const merged = list.filter((i) => i.status === "merged");
  const validated = list.filter(
    (i) => i.status !== "pending" && i.status !== "merged",
  );

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-ink-mid">
        Ceux que vous avez créés quand la liste commune n’avait pas le vôtre.
      </p>

      {query.isPending ? (
        <div className="h-48 animate-pulse rounded-3xl bg-paper" />
      ) : query.isError ? (
        <Card>
          <p role="alert" className="text-sm leading-relaxed text-red-700">
            {apiMessage(query.error, "Vos ingrédients n’ont pas pu être lus.")}
          </p>
          <button
            onClick={() => query.refetch()}
            className="btn btn-outline mt-3 text-xs"
          >
            <RotateCw className="h-3.5 w-3.5" aria-hidden /> Réessayer
          </button>
        </Card>
      ) : list.length === 0 ? (
        <Card>
          <p className="font-display text-base font-bold text-navy">
            Vous n’avez créé aucun ingrédient
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-mid">
            Dans une recette, tapez le nom d’un ingrédient : si la liste commune
            ne l’a pas, vous pouvez le créer. Il apparaîtra ici.
          </p>
        </Card>
      ) : (
        <>
          <Group
            title="En attente"
            hint="Privés : vous seul pouvez les relier à une recette, jusqu’à ce que Lab’s Food les reprenne dans la liste commune. Vous pouvez les modifier tant qu’ils sont en attente."
            empty="Aucun ingrédient en attente."
            items={pending}
            render={(i) => (
              <PendingRow
                key={i.id}
                ingredient={i}
                onReload={() => query.refetch()}
              />
            )}
          />
          <Group
            title="Validés"
            hint="Lab’s Food les a repris dans la liste commune : ils ne sont plus à vous, et se modifient depuis la console de Lab’s Food."
            empty="Aucun ingrédient validé pour l’instant."
            items={validated}
            render={(i) => <ReadOnlyRow key={i.id} ingredient={i} />}
          />
          <Group
            title="Remplacés"
            hint="Lab’s Food a jugé qu’une entrée de la liste commune disait la même chose : vos recettes pointent maintenant vers elle."
            empty="Aucun ingrédient remplacé."
            items={merged}
            render={(i) => <ReadOnlyRow key={i.id} ingredient={i} />}
          />
        </>
      )}
    </div>
  );
}

function Group({
  title,
  hint,
  empty,
  items,
  render,
}: {
  title: string;
  hint: string;
  empty: string;
  items: MyIngredient[];
  render: (i: MyIngredient) => React.ReactNode;
}) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 flex items-center gap-1 font-display text-lg font-bold text-navy">
        {title}
        <span className="ml-1 text-sm font-normal text-ink-soft">
          {items.length}
        </span>
        <InfoPopover label={`À propos de « ${title} »`}>{hint}</InfoPopover>
      </h2>
      {items.length === 0 ? (
        <p className="rounded-2xl bg-paper px-4 py-3 text-[13px] text-ink-soft">
          {empty}
        </p>
      ) : (
        <ul className="space-y-2">{items.map((i) => render(i))}</ul>
      )}
    </section>
  );
}

/** Ce que dit un ingrédient : rayon, allergènes (ou « aucun »). */
function Summary({ ingredient: i }: { ingredient: MyIngredient }) {
  const aisles = useAisles();
  const allergens = useAllergens(REGULATED_ALLERGENS);
  return (
    <p className="mt-0.5 text-[13px] leading-relaxed text-ink-mid">
      {i.aisle ? aisleLabel(i.aisle, aisles) : "Rayon à préciser"}
      {" · "}
      {i.allergensNone
        ? "aucun des 14 allergènes"
        : i.allergens.length > 0
          ? i.allergens.map((c) => refLabel(allergens, c)).join(", ")
          : "allergènes à renseigner"}
    </p>
  );
}

function ReadOnlyRow({ ingredient: i }: { ingredient: MyIngredient }) {
  return (
    <li className="rounded-2xl border border-[rgba(31,42,55,0.06)] bg-paper px-4 py-3">
      <p className="font-semibold text-navy">{i.name}</p>
      <Summary ingredient={i} />
      {i.status === "merged" && (
        <p className="mt-1 text-[13px] text-ink-mid">
          Remplacé par{" "}
          <span className="font-semibold text-navy">
            {i.mergedInto
              ? `« ${i.mergedInto.name} »`
              : "une entrée de la liste commune"}
          </span>
          .
        </p>
      )}
      {i.status === "inactive" && (
        <p className="mt-1 text-[13px] text-ink-mid">
          Retiré de la liste commune depuis.
        </p>
      )}
    </li>
  );
}

function PendingRow({
  ingredient: i,
  onReload,
}: {
  ingredient: MyIngredient;
  onReload: () => void;
}) {
  const update = useUpdateIngredient();
  const aisles = useAisles();
  const toast = useToast();
  const uid = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<IngredientDraft>(() =>
    draftFromIngredient(i),
  );
  const [errors, setErrors] = useState<
    Partial<Record<IngredientField, string>>
  >({});
  const [general, setGeneral] = useState<string | null>(null);
  const [existing, setExisting] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);

  /* « Modifier » disparaît quand le formulaire s'ouvre : sans cela, le focus tomberait
     sur la page. Il va au nom, et revient au bouton quand le formulaire se ferme. */
  useEffect(() => {
    if (editing) nameRef.current?.focus();
    else if (wasEditing.current) editRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  function open() {
    setDraft(draftFromIngredient(i));
    setErrors({});
    setGeneral(null);
    setExisting(null);
    setStale(false);
    setEditing(true);
  }

  function submit() {
    if (update.isPending) return;
    setGeneral(null);
    setExisting(null);
    const found = validateIngredient(draft, aisles);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    update.mutate(
      { id: i.id, patch: ingredientBody(draft, true) },
      {
        onSuccess: (saved) => {
          setEditing(false);
          toast.success(
            `« ${saved.name} » enregistré`,
            "Vos recettes qui l’utilisent sont à jour.",
          );
        },
        onError: (e) => {
          const refus = readIngredientError(
            e,
            "L’ingrédient n’a pas pu être modifié.",
          );
          if (refus.existing) {
            setExisting(refus.existing.name);
            return;
          }
          setStale(refus.notPending);
          if (Object.keys(refus.fields).length > 0)
            setErrors((p) => ({ ...p, ...refus.fields }));
          if (refus.general) setGeneral(refus.general);
        },
      },
    );
  }

  return (
    <li className="rounded-2xl border border-[rgba(31,42,55,0.06)] bg-paper px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-navy">
            {i.name}
            <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[11px] font-semibold text-[#8B6200]">
              en attente
            </span>
          </p>
          <Summary ingredient={i} />
        </div>
        {!editing && (
          <button
            ref={editRef}
            type="button"
            onClick={open}
            className="btn btn-outline px-3 py-1.5 text-xs"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden /> Modifier
          </button>
        )}
      </div>

      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="mt-3 border-t border-[rgba(31,42,55,0.06)] pt-3"
        >
          <p className="mb-3 rounded-xl bg-cream-soft px-3 py-2 text-[13px] leading-relaxed text-ink-mid">
            Modifier un ingrédient met à jour toutes vos recettes qui
            l’utilisent. Si ses allergènes changent, relisez ceux de vos
            recettes.
          </p>

          <IngredientFields
            value={draft}
            onChange={setDraft}
            errors={errors}
            idPrefix={uid}
            nameRef={nameRef}
            onEnter={submit}
          />

          {existing && (
            <p
              role="alert"
              className="mt-4 rounded-2xl bg-amber-soft/60 p-3.5 text-[13px] leading-relaxed text-[#8B6200]"
            >
              « {existing} » figure déjà dans la liste commune ou parmi vos
              ingrédients en attente. Choisissez un autre nom, ou utilisez
              celui-là dans vos recettes.
            </p>
          )}

          {general && (
            <div
              role="alert"
              className="mt-4 flex flex-wrap items-start gap-2 rounded-2xl bg-red-50 p-3.5 text-[13px] leading-relaxed text-red-700"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">{general}</span>
              {stale && (
                <button
                  type="button"
                  onClick={onReload}
                  className="btn btn-outline text-xs"
                >
                  <RotateCw className="h-3.5 w-3.5" aria-hidden /> Recharger
                </button>
              )}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={update.isPending}
              className="btn btn-outline text-xs"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={update.isPending || stale}
              className="btn btn-primary text-xs disabled:opacity-55"
            >
              {update.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              )}
              Enregistrer
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
