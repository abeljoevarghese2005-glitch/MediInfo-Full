import psycopg2
import os
import re
import time

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:tuEifPQTTYoKsTfXppVFddqliLaVoaTN@mainline.proxy.rlwy.net:41984/railway")

DRUG_CLASS_MAP = [
    (r'amoxicillin|ampicillin|cloxacillin|dicloxacillin|flucloxacillin|piperacillin|nafcillin', 'Penicillin Antibiotic'),
    (r'ceftriaxone|cefotaxime|cefdinir|cefpodoxime|cefixime|cefoperazone|ceftazidime', 'Third-generation Cephalosporin'),
    (r'cefazolin|cephalexin|cefadroxil|cefaclor|cefuroxime', 'Cephalosporin Antibiotic'),
    (r'cefepime|cefpirome', 'Fourth-generation Cephalosporin'),
    (r'meropenem|imipenem|doripenem|ertapenem', 'Carbapenem Antibiotic'),
    (r'azithromycin|clarithromycin|erythromycin|roxithromycin', 'Macrolide Antibiotic'),
    (r'ciprofloxacin|levofloxacin|ofloxacin|moxifloxacin|norfloxacin|gatifloxacin', 'Fluoroquinolone Antibiotic'),
    (r'doxycycline|tetracycline|minocycline', 'Tetracycline Antibiotic'),
    (r'gentamicin|amikacin|tobramycin|streptomycin|neomycin', 'Aminoglycoside Antibiotic'),
    (r'vancomycin|teicoplanin', 'Glycopeptide Antibiotic'),
    (r'linezolid', 'Oxazolidinone Antibiotic'),
    (r'metronidazole|tinidazole|ornidazole|secnidazole', 'Nitroimidazole Antibiotic'),
    (r'trimethoprim|sulfamethoxazole|cotrimoxazole', 'Sulfonamide Antibiotic'),
    (r'clindamycin|lincomycin', 'Lincosamide Antibiotic'),
    (r'colistin|polymyxin', 'Polymyxin Antibiotic'),
    (r'nitrofurantoin', 'Nitrofuran Antibiotic'),
    (r'fosfomycin', 'Phosphonic Acid Antibiotic'),
    (r'chloramphenicol', 'Chloramphenicol Antibiotic'),
    (r'fluconazole|itraconazole|voriconazole|posaconazole|isavuconazole', 'Triazole Antifungal'),
    (r'clotrimazole|miconazole|ketoconazole|econazole|tioconazole', 'Imidazole Antifungal'),
    (r'amphotericin', 'Polyene Antifungal'),
    (r'caspofungin|micafungin|anidulafungin', 'Echinocandin Antifungal'),
    (r'terbinafine|naftifine', 'Allylamine Antifungal'),
    (r'nystatin', 'Polyene Antifungal'),
    (r'griseofulvin', 'Antifungal Antibiotic'),
    (r'acyclovir|valacyclovir|famciclovir|penciclovir', 'Antiviral (Herpes)'),
    (r'oseltamivir|zanamivir|peramivir', 'Neuraminidase Inhibitor (Influenza)'),
    (r'tenofovir|lamivudine|emtricitabine|abacavir|zidovudine|stavudine', 'Nucleoside Reverse Transcriptase Inhibitor'),
    (r'efavirenz|nevirapine|rilpivirine|etravirine', 'Non-nucleoside Reverse Transcriptase Inhibitor'),
    (r'lopinavir|ritonavir|atazanavir|darunavir|saquinavir', 'HIV Protease Inhibitor'),
    (r'dolutegravir|raltegravir|elvitegravir|bictegravir', 'HIV Integrase Inhibitor'),
    (r'sofosbuvir|ledipasvir|velpatasvir|daclatasvir', 'Hepatitis C Antiviral'),
    (r'entecavir|adefovir|telbivudine', 'Hepatitis B Antiviral'),
    (r'ganciclovir|valganciclovir|cidofovir|foscarnet', 'Antiviral (CMV)'),
    (r'molnupiravir|nirmatrelvir|remdesivir', 'Antiviral (COVID-19)'),
    (r'isoniazid|rifampicin|rifabutin|pyrazinamide|ethambutol|bedaquiline|delamanid|clofazimine', 'Antitubercular Agent'),
    (r'metformin', 'Biguanide Antidiabetic'),
    (r'glibenclamide|glipizide|gliclazide|glimepiride|gliquidone', 'Sulfonylurea Antidiabetic'),
    (r'sitagliptin|vildagliptin|saxagliptin|alogliptin|linagliptin|teneligliptin', 'DPP-4 Inhibitor'),
    (r'canagliflozin|dapagliflozin|empagliflozin|ertugliflozin', 'SGLT-2 Inhibitor'),
    (r'pioglitazone|rosiglitazone', 'Thiazolidinedione Antidiabetic'),
    (r'exenatide|liraglutide|dulaglutide|semaglutide|lixisenatide', 'GLP-1 Receptor Agonist'),
    (r'insulin glargine|insulin detemir|insulin degludec', 'Long-acting Insulin'),
    (r'insulin aspart|insulin lispro|insulin glulisine', 'Rapid-acting Insulin'),
    (r'insulin|isophane', 'Insulin'),
    (r'acarbose|voglibose|miglitol', 'Alpha-glucosidase Inhibitor'),
    (r'repaglinide|nateglinide', 'Meglitinide Antidiabetic'),
    (r'enalapril|lisinopril|ramipril|captopril|perindopril|quinapril|fosinopril|benazepril', 'ACE Inhibitor'),
    (r'losartan|valsartan|telmisartan|olmesartan|irbesartan|candesartan|azilsartan', 'Angiotensin Receptor Blocker (ARB)'),
    (r'amlodipine|nifedipine|felodipine|nicardipine|diltiazem|verapamil|nimodipine', 'Calcium Channel Blocker'),
    (r'atenolol|metoprolol|bisoprolol|carvedilol|nebivolol|propranolol|labetalol|sotalol', 'Beta Blocker'),
    (r'furosemide|torsemide|bumetanide', 'Loop Diuretic'),
    (r'hydrochlorothiazide|chlorthalidone|indapamide|metolazone', 'Thiazide Diuretic'),
    (r'spironolactone|eplerenone|finerenone', 'Potassium-sparing Diuretic'),
    (r'atorvastatin|rosuvastatin|simvastatin|pravastatin|lovastatin|fluvastatin|pitavastatin', 'HMG-CoA Reductase Inhibitor (Statin)'),
    (r'ezetimibe', 'Cholesterol Absorption Inhibitor'),
    (r'digoxin|digitoxin', 'Cardiac Glycoside'),
    (r'warfarin|acenocoumarol', 'Vitamin K Antagonist'),
    (r'heparin|enoxaparin|dalteparin|fondaparinux', 'Anticoagulant (Heparin)'),
    (r'apixaban|rivaroxaban|edoxaban', 'Direct Oral Anticoagulant'),
    (r'dabigatran', 'Direct Thrombin Inhibitor'),
    (r'aspirin|clopidogrel|ticagrelor|prasugrel', 'Antiplatelet Agent'),
    (r'isosorbide|nitroglycerin|nitrate', 'Nitrate (Antianginal)'),
    (r'amiodarone|flecainide|propafenone|lidocaine', 'Antiarrhythmic'),
    (r'sertraline|fluoxetine|paroxetine|escitalopram|citalopram|fluvoxamine', 'SSRI Antidepressant'),
    (r'venlafaxine|duloxetine|desvenlafaxine|milnacipran', 'SNRI Antidepressant'),
    (r'amitriptyline|nortriptyline|imipramine|clomipramine|doxepin', 'Tricyclic Antidepressant'),
    (r'mirtazapine|trazodone|bupropion|agomelatine', 'Atypical Antidepressant'),
    (r'risperidone|olanzapine|quetiapine|aripiprazole|ziprasidone|paliperidone|asenapine', 'Atypical Antipsychotic'),
    (r'haloperidol|chlorpromazine|thioridazine|fluphenazine|trifluoperazine', 'Typical Antipsychotic'),
    (r'lithium', 'Mood Stabilizer'),
    (r'valproate|valproic|divalproex', 'Anticonvulsant (Valproate)'),
    (r'carbamazepine|oxcarbazepine|eslicarbazepine', 'Anticonvulsant (Carbamazepine)'),
    (r'levetiracetam|brivaracetam', 'Anticonvulsant (Levetiracetam)'),
    (r'lamotrigine', 'Anticonvulsant (Lamotrigine)'),
    (r'phenytoin|fosphenytoin', 'Anticonvulsant (Phenytoin)'),
    (r'gabapentin|pregabalin', 'Gabapentinoid'),
    (r'topiramate|zonisamide', 'Anticonvulsant (Topiramate)'),
    (r'diazepam|lorazepam|alprazolam|clonazepam|midazolam|nitrazepam|temazepam', 'Benzodiazepine'),
    (r'zolpidem|zaleplon|zopiclone|eszopiclone', 'Non-benzodiazepine Hypnotic'),
    (r'donepezil|rivastigmine|galantamine', 'Cholinesterase Inhibitor'),
    (r'memantine', 'NMDA Receptor Antagonist'),
    (r'levodopa|carbidopa|benserazide', "Dopamine Precursor (Parkinson's)"),
    (r'pramipexole|ropinirole|rotigotine', 'Dopamine Agonist'),
    (r'selegiline|rasagiline|safinamide', "MAO-B Inhibitor (Parkinson's)"),
    (r'sumatriptan|rizatriptan|zolmitriptan|eletriptan|almotriptan|naratriptan|frovatriptan', 'Serotonin Receptor Agonist (Triptan)'),
    (r'ibuprofen|naproxen|diclofenac|ketoprofen|flurbiprofen|indomethacin|piroxicam|meloxicam|mefenamic', 'NSAID'),
    (r'celecoxib|etoricoxib|parecoxib|valdecoxib', 'COX-2 Inhibitor'),
    (r'paracetamol|acetaminophen', 'Analgesic/Antipyretic'),
    (r'tramadol|tapentadol', 'Opioid Analgesic (Weak)'),
    (r'morphine|oxycodone|hydrocodone|codeine|fentanyl|buprenorphine|methadone|hydromorphone|pethidine', 'Opioid Analgesic'),
    (r'naloxone|naltrexone', 'Opioid Antagonist'),
    (r'dexamethasone|prednisolone|prednisone|methylprednisolone|hydrocortisone|betamethasone|triamcinolone|budesonide', 'Corticosteroid'),
    (r'colchicine', 'Antigout Agent'),
    (r'allopurinol|febuxostat', 'Xanthine Oxidase Inhibitor'),
    (r'salbutamol|albuterol|terbutaline|levalbuterol', 'Short-acting Beta-2 Agonist (SABA)'),
    (r'salmeterol|formoterol|indacaterol|olodaterol|vilanterol', 'Long-acting Beta-2 Agonist (LABA)'),
    (r'tiotropium|glycopyrronium|aclidinium|umeclidinium', 'Long-acting Anticholinergic (LAMA)'),
    (r'montelukast|zafirlukast|pranlukast', 'Leukotriene Receptor Antagonist'),
    (r'theophylline|aminophylline', 'Methylxanthine Bronchodilator'),
    (r'guaifenesin|ambroxol|bromhexine|acetylcysteine|erdosteine|carbocisteine', 'Mucolytic/Expectorant'),
    (r'cetirizine|fexofenadine|loratadine|desloratadine|levocetirizine|rupatadine|bilastine', 'Antihistamine (Non-sedating)'),
    (r'diphenhydramine|chlorphenamine|promethazine|hydroxyzine|cyclizine', 'Antihistamine (Sedating)'),
    (r'omeprazole|pantoprazole|rabeprazole|esomeprazole|lansoprazole|dexlansoprazole', 'Proton Pump Inhibitor (PPI)'),
    (r'ranitidine|famotidine|cimetidine|nizatidine', 'H2 Receptor Antagonist'),
    (r'ondansetron|granisetron|palonosetron|tropisetron', '5-HT3 Antagonist (Antiemetic)'),
    (r'domperidone|metoclopramide', 'Dopamine Antagonist (Antiemetic)'),
    (r'aprepitant|fosaprepitant|netupitant', 'NK1 Receptor Antagonist (Antiemetic)'),
    (r'loperamide', 'Antidiarrheal'),
    (r'bisacodyl|senna', 'Stimulant Laxative'),
    (r'lactulose|sorbitol|polyethylene glycol|macrogol', 'Osmotic Laxative'),
    (r'hyoscine|hyoscyamine|dicyclomine|mebeverine|otilonium', 'Antispasmodic'),
    (r'mesalazine|sulfasalazine|olsalazine|balsalazide', 'Aminosalicylate'),
    (r'cyclophosphamide|ifosfamide|chlorambucil|busulfan|melphalan', 'Alkylating Agent'),
    (r'methotrexate|fluorouracil|capecitabine|gemcitabine|cytarabine|mercaptopurine', 'Antimetabolite'),
    (r'doxorubicin|epirubicin|daunorubicin|idarubicin|bleomycin|mitomycin', 'Antitumour Antibiotic'),
    (r'paclitaxel|docetaxel|cabazitaxel|vincristine|vinblastine|vinorelbine', 'Antimicrotubule Agent'),
    (r'imatinib|dasatinib|nilotinib|bosutinib|ponatinib', 'BCR-ABL Tyrosine Kinase Inhibitor'),
    (r'erlotinib|gefitinib|afatinib|osimertinib', 'EGFR Tyrosine Kinase Inhibitor'),
    (r'sorafenib|sunitinib|regorafenib|cabozantinib', 'Multi-kinase Inhibitor'),
    (r'pembrolizumab|nivolumab|atezolizumab|durvalumab|avelumab', 'PD-1/PD-L1 Inhibitor (Immunotherapy)'),
    (r'ibrutinib|acalabrutinib|zanubrutinib', 'BTK Inhibitor'),
    (r'palbociclib|ribociclib|abemaciclib', 'CDK4/6 Inhibitor'),
    (r'olaparib|niraparib|rucaparib|talazoparib', 'PARP Inhibitor'),
    (r'lenalidomide|thalidomide|pomalidomide', 'Immunomodulatory Drug'),
    (r'bortezomib|carfilzomib|ixazomib', 'Proteasome Inhibitor'),
    (r'tamoxifen|toremifene', 'Selective Estrogen Receptor Modulator'),
    (r'letrozole|anastrozole|exemestane', 'Aromatase Inhibitor'),
    (r'leuprolide|goserelin|triptorelin|buserelin', 'GnRH Agonist'),
    (r'cisplatin|carboplatin|oxaliplatin', 'Platinum-based Chemotherapy'),
    (r'topotecan|irinotecan', 'Topoisomerase Inhibitor'),
    (r'everolimus|temsirolimus|sirolimus', 'mTOR Inhibitor'),
    (r'levothyroxine|thyroxine|liothyronine', 'Thyroid Hormone'),
    (r'carbimazole|methimazole|propylthiouracil', 'Antithyroid Drug'),
    (r'progesterone|medroxyprogesterone|norethisterone|levonorgestrel|dydrogesterone', 'Progestogen'),
    (r'octreotide|lanreotide|pasireotide', 'Somatostatin Analogue'),
    (r'alendronate|risedronate|zoledronic|ibandronate|pamidronate', 'Bisphosphonate'),
    (r'adalimumab|etanercept|golimumab|certolizumab|infliximab', 'TNF Inhibitor'),
    (r'secukinumab|ixekizumab|bimekizumab', 'IL-17 Inhibitor'),
    (r'ustekinumab|risankizumab|guselkumab|tildrakizumab', 'IL-12/23 Inhibitor'),
    (r'tocilizumab|sarilumab', 'IL-6 Receptor Inhibitor'),
    (r'baricitinib|tofacitinib|upadacitinib|ruxolitinib', 'JAK Inhibitor'),
    (r'dupilumab', 'IL-4/IL-13 Inhibitor'),
    (r'omalizumab', 'Anti-IgE Monoclonal Antibody'),
    (r'cyclosporine|tacrolimus', 'Calcineurin Inhibitor'),
    (r'mycophenolate|azathioprine', 'Antimetabolite Immunosuppressant'),
    (r'latanoprost|bimatoprost|travoprost|tafluprost', 'Prostaglandin Analogue (Glaucoma)'),
    (r'dorzolamide|brinzolamide|acetazolamide', 'Carbonic Anhydrase Inhibitor'),
    (r'cyclopentolate|tropicamide|atropine', 'Mydriatic/Cycloplegic'),
    (r'tamsulosin|alfuzosin|silodosin|doxazosin|terazosin', 'Alpha Blocker (BPH)'),
    (r'finasteride|dutasteride', '5-Alpha Reductase Inhibitor'),
    (r'sildenafil|tadalafil|vardenafil|avanafil', 'PDE-5 Inhibitor'),
    (r'oxybutynin|tolterodine|solifenacin|darifenacin|fesoterodine|trospium', 'Anticholinergic (Overactive Bladder)'),
    (r'isotretinoin|tretinoin|adapalene|tazarotene', 'Retinoid'),
    (r'albendazole|mebendazole|ivermectin|pyrantel|praziquantel', 'Antiparasitic/Anthelmintic'),
    (r'chloroquine|hydroxychloroquine|primaquine|artemether|quinine', 'Antimalarial'),
    (r'epinephrine|adrenaline|norepinephrine|noradrenaline|dopamine|dobutamine', 'Vasopressor/Inotrope'),
    (r'streptokinase|alteplase|tenecteplase', 'Thrombolytic'),
    (r'erythropoietin|epoetin|darbepoetin', 'Erythropoiesis-stimulating Agent'),
    (r'filgrastim|pegfilgrastim', 'Colony-stimulating Factor'),
    (r'chlorhexidine|povidone iodine|hydrogen peroxide|benzalkonium', 'Antiseptic/Disinfectant'),
    (r'pseudoephedrine|phenylephrine|xylometazoline|oxymetazoline|naphazoline', 'Nasal Decongestant'),
    (r'ferrous|ferric|iron supplement', 'Iron Supplement'),
    (r'folic acid|folate', 'Folate Supplement'),
    (r'cyanocobalamin|methylcobalamin|vitamin b12', 'Vitamin B12 Supplement'),
    (r'cholecalciferol|ergocalciferol|vitamin d', 'Vitamin D Supplement'),
    (r'ascorbic acid|vitamin c', 'Vitamin C Supplement'),
    (r'calcium carbonate|calcium citrate|calcium gluconate', 'Calcium Supplement'),
    (r'zinc oxide|titanium dioxide', 'Sunscreen/Skin Protectant'),
    (r'avobenzone|octinoxate|oxybenzone|homosalate|octisalate|octocrylene', 'Sunscreen'),
    (r'aluminum chlorohydrate|aluminum zirconium', 'Antiperspirant'),
    (r'menthol|camphor', 'Topical Analgesic/Counterirritant'),
    (r'sodium fluoride|fluoride', 'Dental Fluoride'),
    (r'pyrithione zinc|selenium sulfide', 'Antidandruff Agent'),
    (r'melatonin', 'Sleep Aid (Melatonin)'),
    (r'orlistat', 'Lipase Inhibitor (Weight Loss)'),
    (r'hyaluronic acid|sodium hyaluronate', 'Viscosupplement/Lubricant'),
    (r'phenazopyridine', 'Urinary Analgesic'),
    (r'mannitol|glycerol', 'Osmotic Agent'),
    (r'dapsone', 'Antileprotic/Antiprotozoal'),
    (r'multivitamin|multimineral', 'Multivitamin/Mineral'),
]

NON_MEDICINE_KEYWORDS = [
    'deodorant', 'antiperspirant', 'lip balm', 'shampoo', 'conditioner',
    'moisturizer', 'makeup', 'cosmetic', 'perfume', 'fragrance',
    'toothpaste', 'mouthwash', 'dental floss', 'diaper', 'baby wipe',
    'sanitary', 'pet food', 'dog food', 'cat food',
]

def classify_drug(name, generic, composition):
    text = ' '.join(filter(None, [name, generic, composition])).lower()
    for kw in NON_MEDICINE_KEYWORDS:
        if kw in text:
            return 'Non-Medicine Product'
    for pattern, drug_class in DRUG_CLASS_MAP:
        if re.search(pattern, text, re.IGNORECASE):
            return drug_class
    return None

def get_connection():
    return psycopg2.connect(DATABASE_URL)

# ── Fetch all unclassified in memory first ────────────────────────────────────
print("Connecting to DB...")
conn = get_connection()
cur = conn.cursor()
print("Fetching unclassified medicines...")
cur.execute("""
    SELECT id, medicine_name, generic_name, composition
    FROM medicines
    WHERE drug_class IS NULL
       OR drug_class = ''
       OR drug_class = 'General'
       OR drug_class = 'Not Specified'
""")
medicines = cur.fetchall()
cur.close()
conn.close()
print(f"Found {len(medicines)} medicines to classify")

# ── Classify all in memory ────────────────────────────────────────────────────
to_update = []
skipped = 0
non_medicine = 0
classified = 0

for med_id, name, generic, composition in medicines:
    drug_class = classify_drug(name, generic, composition)
    if drug_class:
        to_update.append((drug_class, str(med_id)))
        if drug_class == 'Non-Medicine Product':
            non_medicine += 1
        else:
            classified += 1
    else:
        skipped += 1

print(f"Classified: {classified} | Non-medicine: {non_medicine} | Unknown: {skipped}")
print(f"Updating {len(to_update)} records in DB in small batches...")

# ── Update in small batches with auto-reconnect ───────────────────────────────
BATCH_SIZE = 200
total_done = 0

for i in range(0, len(to_update), BATCH_SIZE):
    batch = to_update[i:i + BATCH_SIZE]
    retries = 3
    while retries > 0:
        try:
            conn = get_connection()
            cur = conn.cursor()
            cur.executemany("UPDATE medicines SET drug_class = %s WHERE id = %s", batch)
            conn.commit()
            cur.close()
            conn.close()
            total_done += len(batch)
            print(f"  Progress: {total_done}/{len(to_update)}")
            break
        except Exception as e:
            print(f"  Error: {e} — retrying in 5s...")
            retries -= 1
            time.sleep(5)
            try:
                conn.close()
            except:
                pass

print(f"\n✅ Done! {total_done} medicines updated successfully.")