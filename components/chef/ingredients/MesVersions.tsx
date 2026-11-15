"use client";

import { useState } from "react";
import {
  Check,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { Card, Empty } from "@/components/chef/ChefPage";
import { InfoPopover } from "@/components/shared/InfoPopover";
import { ApiError } from "@/lib/api/client";
import { refLabel, useComputedDiets } from "@/lib/api/referentials";
import { useChefApproved } from "@/lib/chef/approval";
import { MONTHS, seasonsLine } from "@/lib/recipe-fields";
import { cn } from "@/lib/utils";
import {
  useAdoptIngredient,
  useIngredientSearch,
  useMyIngredientVersions,
  useRemoveMyIngredient,
  useUpdateMyIngredient,
  type ChefIngredient,
} from "@/lib/api/chef-catalog";

/* ─────────────────────────────────────────────────────────────────────────────
   Mes ingrédients, onglet « Mes versions » (BLK-33, gardé avec le socle le 13/11).
   Lab's Food tient la liste commune ; le batch cooker peut en adopter une entrée
   et la corriger pour lui (un autre nom, ses mois de saison, ses régimes). Ses
   plats se classent alors depuis sa version, ceux des autres depuis la liste
   commune. Les allergènes, eux, restent toujours ceux de la liste commune.
   Supprimer sa version y revient.
   ───────────────────────────────────────────────────────────────────────────── */

const MESSAGES: Record<string, string> = {
  CHEF_INGREDIENTS_LIMIT:
    "Vous gardez déjà 500 ingrédients à vous : retirez-en un avant d’en adopter un autre.",
  INGREDIENT_NOT_FOUND: "Cet ingrédient n’est plus dans la liste commune.",
  CHEF_INGREDIENT_NOT_FOUND: "Cet ingrédient n’est plus dans votre liste.",
};

function messageOf(error: unknown): string {
  const code =
    error instanceof ApiError
      ? (error.body as { code?: string } | null)?.code
      : undefined;
  return (
    (code && MESSAGES[code]) ||
    "L’enregistrement n’a pas abouti. Réessayez dans un instant."
  );
}

export default function MesVersions() {
  const { approved } = useChefApproved();
  const mine = useMyIngredientVersions(approved);
  const [editing, setEditing] = useState<string | null>(null);
  const adoptes = new Set((mine.data ?? []).map((i) => i.catalogIngredientId));

  return (
    <div className="space-y-6">
      <Card>
        <p className="flex items-start gap-1 text-sm leading-relaxed text-ink-mid">
          Les régimes et les saisons de vos plats se calculent depuis la liste
          commune de Lab’s Food. Si une entrée ne vous convient pas, adoptez-la
          et corrigez-la : vos plats suivront votre version.
          <InfoPopover label="Qu’est-ce que ça change ?">
            Votre version ne vaut que pour vos plats : les autres batch cookers
            gardent la liste commune. Quand Lab’s Food modifie l’entrée commune,
            vos mois et vos régimes ne bougent pas ; les allergènes, eux,
            restent toujours ceux de la liste commune. Modifier vos mois ou vos
            régimes reclasse aussitôt vos plats qui utilisent l’ingrédient ;
            revenir à la version commune aussi.
          </InfoPopover>
        </p>
      </Card>

      {approved && <Adopter adoptes={adoptes} />}

      <Card title={`Ma liste${mine.data ? ` (${mine.data.length})` : ""}`}>
        {mine.isPending && approved ? (
          <div className="h-24 animate-pulse rounded-xl bg-cream-soft" />
        ) : mine.isError ? (
          <p role="alert" className="text-sm text-red-700">
            {messageOf(mine.error)}
          </p>
        ) : !mine.data?.length ? (
          <Empty text="Vous utilisez la liste commune telle quelle." />
        ) : (
          <ul className="divide-y divide-border">
            {mine.data.map((ing) =>
              editing === ing.id ? (
                <Editeur
                  key={ing.id}
                  ing={ing}
                  onDone={() => setEditing(null)}
                />
              ) : (
                <Ligne
                  key={ing.id}
                  ing={ing}
                  onEdit={() => setEditing(ing.id)}
                />
              ),
            )}
          </ul>
        )}
      </Card>
    </div>
  );
}

/** Chercher dans la liste commune et adopter une entrée (jamais l'un de mes ingrédients en attente). */
function Adopter({ adoptes }: { adoptes: Set<string> }) {
  const [terme, setTerme] = useState("");
  const resultats = useIngredientSearch(terme);
  const adopt = useAdoptIngredient();
  // Mes propres ingrédients en attente reviennent aussi de la recherche : ils sont
  // déjà à moi, ils se modifient dans « Mes créations ».
  const communs = (resultats.data ?? []).filter((c) => !c.private);

  return (
    <Card title="Adopter un ingrédient">
      <label className="relative block">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
          aria-hidden
        />
        <span className="sr-only">Chercher dans la liste commune</span>
        <input
          value={terme}
          onChange={(e) => setTerme(e.target.value)}
          placeholder="Tomate, riz, poulet…"
          className="input-base pl-9"
        />
      </label>
      {terme.trim().length >= 2 && (
        <ul className="mt-3 divide-y divide-border">
          {communs.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 py-2 text-sm"
            >
              <span className="text-navy">
                {c.name}
                <span className="ml-2 text-ink-soft">
                  {seasonsLine(c.seasonMonths)}
                </span>
              </span>
              {adoptes.has(c.id) ? (
                <span className="flex items-center gap-1 text-[13px] text-mint-ink">
                  <Check className="h-3.5 w-3.5" aria-hidden /> Dans ma liste
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => adopt.mutate(c.id)}
                  disabled={adopt.isPending}
                  className="btn btn-outline text-xs"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden /> Adopter
                </button>
              )}
            </li>
          ))}
          {resultats.data && communs.length === 0 && (
            <li className="py-2 text-sm text-ink-soft">
              Rien dans la liste commune sous ce nom.
            </li>
          )}
        </ul>
      )}
      {adopt.isError && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {messageOf(adopt.error)}
        </p>
      )}
    </Card>
  );
}

function Ligne({ ing, onEdit }: { ing: ChefIngredient; onEdit: () => void }) {
  const diets = useComputedDiets();
  const remove = useRemoveMyIngredient();
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="font-semibold text-navy">{ing.name}</p>
        <p className="mt-0.5 text-[13px] text-ink-mid">
          {seasonsLine(ing.seasonMonths)}
          {ing.diets.length > 0 &&
            ` · ${ing.diets.map((d) => refLabel(diets, d)).join(", ")}`}
        </p>
        {remove.isError && (
          <p role="alert" className="mt-1 text-[13px] text-red-700">
            {messageOf(remove.error)}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="btn btn-outline text-xs"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden /> Modifier
        </button>
        <button
          type="button"
          onClick={() => remove.mutate(ing.id)}
          disabled={remove.isPending}
          className="btn btn-outline text-xs"
        >
          {remove.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          )}
          Version commune
        </button>
      </div>
    </li>
  );
}

function Editeur({ ing, onDone }: { ing: ChefIngredient; onDone: () => void }) {
  const diets = useComputedDiets();
  const save = useUpdateMyIngredient();
  const [name, setName] = useState(ing.name);
  const [mois, setMois] = useState<number[]>(ing.seasonMonths);
  const [regimes, setRegimes] = useState<string[]>(ing.diets);
  const bascule = <T,>(list: T[], v: T) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  return (
    <li className="space-y-4 py-4">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-navy">Nom</span>
        <input
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
          className="input-base"
        />
      </label>

      <fieldset>
        <legend className="flex items-center gap-1 text-xs font-semibold text-navy">
          Mois de saison
          <InfoPopover label="Et si aucun mois n’est coché ?">
            Aucun mois coché : l’ingrédient n’a pas de saison, il ne restreint
            pas celle de vos plats.
          </InfoPopover>
        </legend>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {MONTHS.map((m, i) => (
            <button
              key={m}
              type="button"
              aria-pressed={mois.includes(i + 1)}
              onClick={() => setMois(bascule(mois, i + 1))}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs",
                mois.includes(i + 1)
                  ? "border-navy bg-navy text-white"
                  : "border-border text-ink-mid",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1 block text-xs font-semibold text-navy">
          Régimes compatibles
        </legend>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5">
          {diets.map((d) => (
            <label
              key={d.code}
              className="flex items-center gap-1.5 text-sm text-ink-mid"
            >
              <input
                type="checkbox"
                checked={regimes.includes(d.code)}
                onChange={() => setRegimes(bascule(regimes, d.code))}
              />
              {d.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!name.trim() || save.isPending}
          onClick={() =>
            save.mutate(
              {
                id: ing.id,
                patch: {
                  name: name.trim(),
                  seasonMonths: mois,
                  diets: regimes,
                },
              },
              { onSuccess: onDone },
            )
          }
          className="btn btn-primary text-xs"
        >
          {save.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Check className="h-3.5 w-3.5" aria-hidden />
          )}
          Enregistrer
        </button>
        <button
          type="button"
          onClick={onDone}
          className="btn btn-outline text-xs"
        >
          <X className="h-3.5 w-3.5" aria-hidden /> Annuler
        </button>
        {save.isError && (
          <span role="alert" className="text-sm text-red-700">
            {messageOf(save.error)}
          </span>
        )}
      </div>
    </li>
  );
}
