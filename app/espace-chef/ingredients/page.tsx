"use client";

import { Onglets } from "@/components/shared/Onglets";
import { useState } from "react";
import ChefPage from "@/components/chef/ChefPage";
import ApprovalGate from "@/components/chef/ApprovalGate";
import MesCreations from "@/components/chef/ingredients/MesCreations";
import MesVersions from "@/components/chef/ingredients/MesVersions";

/* ─────────────────────────────────────────────────────────────────────────────
   Mes ingrédients. Deux modèles cohabitent (décision du 13/11, plan Recettes v5) :

   - « Mes créations » (Recettes §7.1) : ce que le batch cooker a créé quand la
     liste commune n'avait pas son ingrédient, en attente de Lab's Food ;
   - « Mes versions » (BLK-33) : les entrées de la liste commune qu'il a adoptées
     pour en corriger le nom, les mois ou les régimes, jamais les allergènes.
   ───────────────────────────────────────────────────────────────────────────── */

const TABS = [
  { id: "creations", label: "Mes créations" },
  { id: "versions", label: "Mes versions" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default function MesIngredientsPage() {
  const [tab, setTab] = useState<Tab>("creations");

  return (
    <ChefPage
      title="Mes ingrédients"
      subtitle="Vos ingrédients créés, et vos versions des ingrédients de la liste commune"
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <ApprovalGate quoi="Vos ingrédients s’enregistrent" />

        <Onglets
          label="Mes ingrédients"
          value={tab}
          onChange={setTab}
          items={TABS.map((t) => ({ id: t.id, label: t.label, controls: `panel-${t.id}` }))}
        />

        <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`onglet-${tab}`}>
          {tab === "creations" ? <MesCreations /> : <MesVersions />}
        </div>
      </div>
    </ChefPage>
  );
}
