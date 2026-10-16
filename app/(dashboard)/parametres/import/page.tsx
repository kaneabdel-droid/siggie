import { getTenantContext } from '@/utils/supabase/tenant'
import { redirect } from 'next/navigation'
import { AssistantImport, type TypeImportOption } from '@/components/import/AssistantImport'
import { importerDonneesSiggie } from './actions'

const OPTIONS_SIGGIE: TypeImportOption[] = [
  {
    id: 'membres',
    titre: 'Membres & Producteurs',
    description: 'Importez la liste des membres du GIE (code membre, nom, prénom, village, téléphone) pour le suivi des crédits et ristournes.',
    icone: 'membres',
    nomFichierModele: 'modele_import_membres.csv',
    modeleCSV: `code_membre,prenom,nom,village,telephone,statut
MB-001,Mamadou,Diop,Ndiawdoun,771234567,actif
MB-002,Fatou,Sarr,Makhana,782345678,actif
MB-003,Ousmane,Ba,Santhie,703456789,actif`
  },
  {
    id: 'intrants',
    titre: 'Stock d\'Intrants',
    description: 'Importez vos stocks initiaux d\'engrais, semences et produits phytosanitaires.',
    icone: 'intrants',
    nomFichierModele: 'modele_import_intrants.csv',
    modeleCSV: `nom,type_intrant,quantite_stock,prix_unitaire,description
Urée 46%,Engrais,150,19500,Sacs de 50kg pour riziculture
NPK 15-15-15,Engrais,200,18000,Sacs de 50kg engrais de fond
Sahel 108 certifié,Semence,80,12500,Semence de riz certifiée
Propanil herbicide,Phytosanitaire,50,6500,Bidons de 5 litres`
  },
  {
    id: 'materiels',
    titre: 'Parc Matériel',
    description: 'Importez les tracteurs, moissonneuses, motopompes et équipements du GIE.',
    icone: 'materiels',
    nomFichierModele: 'modele_import_materiels.csv',
    modeleCSV: `nom,etat,date_acquisition
Tracteur Massey Ferguson 375,bon,2021-04-10
Moissonneuse-batteuse Yanmar,bon,2022-09-15
Motopompe 4 pouces Lombardini,en_panne,2020-02-20
Charrue à disques 3 socs,bon,2021-04-10`
  },
  {
    id: 'clients',
    titre: 'Clients & Acheteurs',
    description: 'Importez les clients externes et acheteurs des récoltes ou du stock collecté.',
    icone: 'clients',
    nomFichierModele: 'modele_import_clients.csv',
    modeleCSV: `nom,telephone
Coopérative Rizicole du Walo,775551122
GIE Commerçants de Sor,784443322
Comptoir Agricole de Richard Toll,706667788`
  }
]

export default async function ImportSiggiePage() {
  const tenant = await getTenantContext()
  if (!tenant) redirect('/login')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Importation des données existantes
        </h1>
        <p className="text-sm text-foreground-muted mt-1">
          Intégrez rapidement vos membres, intrants, matériels et clients dans {tenant.gieName || 'votre coopérative'}.
        </p>
      </div>

      <AssistantImport
        nomApplication="SIGGIE"
        titreModule="Gestion de Coopérative & GIE"
        optionsTypes={OPTIONS_SIGGIE}
        onImporter={importerDonneesSiggie as any}
      />
    </div>
  )
}
