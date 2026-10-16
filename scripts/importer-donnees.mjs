#!/usr/bin/env node
/**
 * Agent CLI d'importation de données existantes pour SIGGIE (Gestion de GIE).
 * 
 * Usage :
 *   node scripts/importer-donnees.mjs --modele=membres|intrants|materiels|clients
 *   node scripts/importer-donnees.mjs --gie="Nom du GIE ou ID" --type=membres|intrants|materiels|clients --fichier=donnees.csv
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

if (existsSync('.env.local')) {
  process.loadEnvFile('.env.local')
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const MODELES = {
  membres: `code_membre,prenom,nom,village,telephone,statut
MB-001,Mamadou,Diop,Ndiawdoun,771234567,actif
MB-002,Fatou,Sarr,Makhana,782345678,actif
MB-003,Ousmane,Ba,Santhie,703456789,actif`,

  intrants: `nom,type_intrant,quantite_stock,prix_unitaire,description
Urée 46%,Engrais,150,19500,Sacs de 50kg pour riziculture
NPK 15-15-15,Engrais,200,18000,Sacs de 50kg engrais de fond
Sahel 108 certifié,Semence,80,12500,Semence de riz certifiée
Propanil herbicide,Phytosanitaire,50,6500,Bidons de 5 litres`,

  materiels: `nom,etat,date_acquisition
Tracteur Massey Ferguson 375,bon,2021-04-10
Moissonneuse-batteuse Yanmar,bon,2022-09-15
Motopompe 4 pouces Lombardini,en_panne,2020-02-20
Charrue à disques 3 socs,bon,2021-04-10`,

  clients: `nom,telephone
Coopérative Rizicole du Walo,775551122
GIE Commerçants de Sor,784443322
Comptoir Agricole de Richard Toll,706667788`
}

function parseCSV(content) {
  const clean = content.replace(/^\uFEFF/, '').trim()
  const lines = clean.split(/\r?\n/).filter(line => line.trim().length > 0)
  if (lines.length === 0) return []

  const separator = lines[0].includes(';') ? ';' : ','

  function parseLine(line) {
    const result = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === separator && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  const rawHeaders = parseLine(lines[0])
  const headers = rawHeaders.map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ''))
  const records = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i])
    if (values.length === 0 || (values.length === 1 && !values[0])) continue
    const obj = {}
    headers.forEach((header, idx) => {
      let val = values[idx] !== undefined ? values[idx] : ''
      val = val.replace(/^["']|["']$/g, '')
      obj[header] = val
    })
    records.push(obj)
  }

  return records
}

function parseArgs() {
  const args = process.argv.slice(2)
  const params = {}
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=')
      if (eqIdx !== -1) {
        const key = arg.slice(2, eqIdx)
        const val = arg.slice(eqIdx + 1)
        params[key] = val
      } else {
        params[arg.slice(2)] = true
      }
    }
  }
  return params
}

async function main() {
  const args = parseArgs()

  if (args.modele) {
    const type = args.modele.toLowerCase()
    const content = MODELES[type]
    if (!content) {
      console.error(`Type de modèle invalide. Choix possibles : ${Object.keys(MODELES).join(', ')}`)
      process.exit(1)
    }
    const filename = `modele_import_siggie_${type}.csv`
    writeFileSync(filename, content, 'utf8')
    console.log(`✓ Fichier modèle généré avec succès : ${filename}`)
    return
  }

  if (!args.fichier || !args.type) {
    console.log(`
Agent d'importation de données - SIGGIE
=======================================
Usage :
  1. Générer un modèle CSV :
     node scripts/importer-donnees.mjs --modele=membres|intrants|materiels|clients

  2. Importer des données :
     node scripts/importer-donnees.mjs --gie="Nom du GIE ou ID" --type=membres|intrants|materiels|clients --fichier=chemin/vers/fichier.csv
    `)
    return
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Erreur : NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquants.")
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  // Résoudre le GIE
  let gieId = args.gie_id
  if (!gieId && args.gie) {
    const { data: gies } = await supabase
      .from('gies')
      .select('id, nom')
      .or(`nom.ilike.%${args.gie}%,id.eq.${args.gie}`)
      .limit(1)

    if (gies && gies.length > 0) {
      gieId = gies[0].id
      console.log(`✓ GIE sélectionné : ${gies[0].nom} (${gieId})`)
    }
  }

  if (!gieId) {
    const { data: gies } = await supabase.from('gies').select('id, nom').limit(5)
    console.error("Veuillez préciser un GIE valide (--gie=\"Nom\").")
    if (gies && gies.length > 0) {
      console.log("GIEs disponibles :")
      gies.forEach(g => console.log(`  - ${g.nom} (ID: ${g.id})`))
    }
    process.exit(1)
  }

  const filePath = resolve(args.fichier)
  if (!existsSync(filePath)) {
    console.error(`Fichier introuvable : ${filePath}`)
    process.exit(1)
  }

  const rawFile = readFileSync(filePath, 'utf8')
  let records = []
  if (filePath.endsWith('.json')) {
    records = JSON.parse(rawFile)
  } else {
    records = parseCSV(rawFile)
  }

  console.log(`✓ ${records.length} ligne(s) chargée(s). Début de l'importation (${args.type})...\n`)

  let reussis = 0
  let erreurs = 0

  if (args.type === 'membres') {
    for (let i = 0; i < records.length; i++) {
      const r = records[i]
      const nom = (r.nom || '').trim()
      const prenom = (r.prenom || '').trim()

      if (!nom || !prenom) {
        erreurs++
        console.error(`Ligne ${i + 1} : Nom et prénom obligatoires.`)
        continue
      }

      let codeMembre = (r.code_membre || r.code || '').trim()
      if (!codeMembre) {
        codeMembre = `MB-${(i + 1).toString().padStart(4, '0')}`
      }

      const village = (r.village || '').trim() || null
      const telephone = (r.telephone || r.tel || '').trim() || null
      const statut = (r.statut || 'actif').trim()

      const { error } = await supabase.from('membres').upsert(
        {
          gie_id: gieId,
          code_membre: codeMembre,
          nom,
          prenom,
          village,
          telephone,
          statut
        },
        { onConflict: 'gie_id,code_membre' }
      )

      if (error) {
        erreurs++
        console.error(`Ligne ${i + 1} (${prenom} ${nom}) : ${error.message}`)
      } else {
        reussis++
      }
    }
  } else if (args.type === 'intrants') {
    for (let i = 0; i < records.length; i++) {
      const r = records[i]
      const nom = (r.nom || '').trim()

      if (!nom) {
        erreurs++
        console.error(`Ligne ${i + 1} : Nom de l'intrant obligatoire.`)
        continue
      }

      const typeIntrant = (r.type_intrant || r.type || 'Autre').trim()
      const qte = parseFloat(r.quantite_stock || r.stock || '0')
      const prix = parseFloat(r.prix_unitaire || r.prix || '0')
      const description = (r.description || '').trim() || null

      const { error } = await supabase.from('intrants').insert({
        gie_id: gieId,
        nom,
        type_intrant: typeIntrant,
        quantite_stock: isNaN(qte) ? 0 : qte,
        prix_unitaire: isNaN(prix) ? 0 : prix,
        description
      })

      if (error) {
        erreurs++
        console.error(`Ligne ${i + 1} (${nom}) : ${error.message}`)
      } else {
        reussis++
      }
    }
  } else if (args.type === 'materiels') {
    const etatsValides = ['bon', 'en_panne', 'reparation']

    for (let i = 0; i < records.length; i++) {
      const r = records[i]
      const nom = (r.nom || '').trim()

      if (!nom) {
        erreurs++
        console.error(`Ligne ${i + 1} : Nom du matériel obligatoire.`)
        continue
      }

      let etat = (r.etat || 'bon').toLowerCase().trim()
      if (!etatsValides.includes(etat)) etat = 'bon'

      const dateAcquisition = (r.date_acquisition || new Date().toISOString().split('T')[0]).trim()

      const { error } = await supabase.from('materiels').insert({
        gie_id: gieId,
        nom,
        etat,
        date_acquisition: dateAcquisition
      })

      if (error) {
        erreurs++
        console.error(`Ligne ${i + 1} (${nom}) : ${error.message}`)
      } else {
        reussis++
      }
    }
  } else if (args.type === 'clients') {
    for (let i = 0; i < records.length; i++) {
      const r = records[i]
      const nom = (r.nom || '').trim()

      if (!nom) {
        erreurs++
        console.error(`Ligne ${i + 1} : Nom du client obligatoire.`)
        continue
      }

      const telephone = (r.telephone || '').trim() || null

      const { error } = await supabase.from('clients_externes').insert({
        gie_id: gieId,
        nom,
        telephone
      })

      if (error) {
        erreurs++
        console.error(`Ligne ${i + 1} (${nom}) : ${error.message}`)
      } else {
        reussis++
      }
    }
  }

  console.log(`\nImportation terminée : ${reussis} succès, ${erreurs} échec(s).`)
}

main().catch(err => {
  console.error("Erreur inattendue :", err)
  process.exit(1)
})
