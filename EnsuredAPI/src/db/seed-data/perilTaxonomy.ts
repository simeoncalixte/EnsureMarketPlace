// Canonical peril (cause-of-loss) taxonomy.
//
// A peril is the event/agent that *causes* an insured loss (fire, windstorm,
// ransomware). It is a distinct dimension from Line of Business — which is the
// product/contract category being written. The two are many-to-many: one LOB is
// exposed to many perils, and one peril spans many LOBs (fire hits property,
// marine, energy, auto...). For that reason perils carry stable, globally-unique
// bare codes (e.g. `hurricane`, `flood`) — NOT category-prefixed like LOB
// subtypes — so they can be referenced directly by the rules engine, cat event
// sets, map layers, and `RiskPortfolio.perilType`.
//
// `isCatastrophe` marks systemic / accumulating perils (single events that hit
// many risks at once) versus attritional perils. Downstream loss-modeling and
// appetite/accumulation logic reads this flag.

export type PerilSeed = {
  code: string;
  label: string;
  description: string;
  isCatastrophe?: boolean;
};

export type PerilCategorySeed = {
  code: string;
  label: string;
  description: string;
  perils: PerilSeed[];
};

export const perilTaxonomy: PerilCategorySeed[] = [
  {
    code: 'windstorm',
    label: 'Windstorm & Atmospheric',
    description: 'Wind-driven and severe-weather perils originating in the atmosphere.',
    perils: [
      { code: 'hurricane', label: 'Hurricane / Typhoon / Cyclone', description: 'Tropical cyclone with sustained hurricane-force winds; named-storm wind and rain.', isCatastrophe: true },
      { code: 'tornado', label: 'Tornado', description: 'Violently rotating column of air in contact with the ground.', isCatastrophe: true },
      { code: 'tropical_storm', label: 'Tropical Storm', description: 'Organized tropical system below hurricane strength.', isCatastrophe: true },
      { code: 'severe_convective_storm', label: 'Severe Convective Storm', description: 'Thunderstorm complex producing damaging wind, hail and tornadoes.', isCatastrophe: true },
      { code: 'extratropical_cyclone', label: 'Extratropical Cyclone / European Windstorm', description: 'Mid-latitude windstorm such as a European winter windstorm.', isCatastrophe: true },
      { code: 'winter_storm', label: 'Winter Storm / Blizzard', description: 'Snow, ice and freeze accumulation including weight-of-snow and ice dams.', isCatastrophe: true },
      { code: 'straight_line_wind', label: 'Straight-Line Wind / Derecho', description: 'Non-rotating damaging windstorm including derechos and downbursts.' },
      { code: 'hail', label: 'Hail', description: 'Impact damage from hailstones.' },
      { code: 'thunderstorm', label: 'Thunderstorm', description: 'Localized convective storm with wind, rain and lightning.' },
      { code: 'lightning', label: 'Lightning', description: 'Direct strike or resulting electrical surge damage.' },
    ],
  },
  {
    code: 'flood',
    label: 'Flood & Water',
    description: 'Inundation and water-escape perils, surface and subsurface.',
    perils: [
      { code: 'storm_surge', label: 'Storm Surge', description: 'Coastal inundation driven by tropical or extratropical storm winds.', isCatastrophe: true },
      { code: 'river_flood', label: 'Riverine / Fluvial Flood', description: 'Overflow of rivers and watercourses beyond their banks.', isCatastrophe: true },
      { code: 'flash_flood', label: 'Flash Flood', description: 'Rapid-onset flooding from intense rainfall or dam release.', isCatastrophe: true },
      { code: 'coastal_flood', label: 'Coastal Flood', description: 'Tidal and sea-level driven coastal inundation.', isCatastrophe: true },
      { code: 'tsunami', label: 'Tsunami', description: 'Seismic or landslide-generated ocean wave inundation.', isCatastrophe: true },
      { code: 'dam_failure', label: 'Dam / Levee Failure', description: 'Inundation from structural failure of flood-control works.', isCatastrophe: true },
      { code: 'surface_water_flood', label: 'Surface Water / Pluvial Flood', description: 'Rainfall ponding and runoff independent of watercourses.' },
      { code: 'water_damage', label: 'Escape of Water / Burst Pipe', description: 'Accidental discharge from plumbing, tanks or appliances.' },
      { code: 'sewer_backup', label: 'Sewer Backup', description: 'Backflow of water or sewage through drains and sewers.' },
    ],
  },
  {
    code: 'geophysical',
    label: 'Geophysical / Earth Movement',
    description: 'Perils originating from movement of the earth and its crust.',
    perils: [
      { code: 'earthquake', label: 'Earthquake', description: 'Ground shaking from seismic fault rupture.', isCatastrophe: true },
      { code: 'earthquake_fire', label: 'Fire Following Earthquake', description: 'Conflagration ignited as a consequence of an earthquake.', isCatastrophe: true },
      { code: 'volcanic_eruption', label: 'Volcanic Eruption', description: 'Lava, ashfall, pyroclastic flow and related damage.', isCatastrophe: true },
      { code: 'earthquake_sprinkler', label: 'Sprinkler Leakage Following Quake', description: 'Water damage from sprinkler systems disturbed by seismic shaking.' },
      { code: 'landslide', label: 'Landslide / Mudslide', description: 'Downslope movement of rock, soil or debris.' },
      { code: 'sinkhole', label: 'Sinkhole / Catastrophic Collapse', description: 'Ground collapse into subsurface voids.' },
      { code: 'land_subsidence', label: 'Land Subsidence', description: 'Gradual settling or sinking of ground surface.' },
      { code: 'avalanche', label: 'Avalanche', description: 'Rapid flow of snow down a slope.' },
    ],
  },
  {
    code: 'wildfire',
    label: 'Wildfire & Drought',
    description: 'Heat- and drought-driven perils including uncontrolled fire spread.',
    perils: [
      { code: 'wildfire', label: 'Wildfire / Bushfire', description: 'Uncontrolled fire spreading through vegetation.', isCatastrophe: true },
      { code: 'wildland_urban_interface', label: 'Wildland-Urban Interface Fire', description: 'Wildfire spread into developed areas at the vegetation boundary.', isCatastrophe: true },
      { code: 'drought', label: 'Drought', description: 'Prolonged precipitation deficit and water shortage.', isCatastrophe: true },
      { code: 'extreme_heat', label: 'Extreme Heat / Heatwave', description: 'Sustained high temperatures causing damage or loss.' },
    ],
  },
  {
    code: 'fire',
    label: 'Fire & Explosion',
    description: 'Combustion, blast and impact perils to property.',
    perils: [
      { code: 'fire', label: 'Fire', description: 'Hostile combustion damaging insured property.' },
      { code: 'explosion', label: 'Explosion', description: 'Rapid release of energy producing blast and overpressure.' },
      { code: 'smoke', label: 'Smoke Damage', description: 'Soot and smoke contamination from fire or malfunction.' },
      { code: 'implosion', label: 'Implosion', description: 'Inward collapse from external pressure or vacuum.' },
      { code: 'spontaneous_combustion', label: 'Spontaneous Combustion', description: 'Self-heating ignition of stored materials.' },
      { code: 'vehicle_impact', label: 'Vehicle / Aircraft Impact', description: 'Property damage from impact of vehicles or falling aircraft.' },
    ],
  },
  {
    code: 'crime',
    label: 'Crime & Malicious Acts',
    description: 'Theft, dishonesty and intentional damage by people.',
    perils: [
      { code: 'theft', label: 'Theft / Burglary', description: 'Unlawful taking of property, with or without forced entry.' },
      { code: 'robbery', label: 'Robbery', description: 'Taking of property by force or threat.' },
      { code: 'vandalism', label: 'Vandalism / Malicious Damage', description: 'Deliberate damage or defacement of property.' },
      { code: 'employee_theft', label: 'Employee Theft / Dishonesty', description: 'Loss caused by dishonest acts of employees.' },
      { code: 'fraud', label: 'Fraud', description: 'Loss arising from deception for unlawful gain.' },
      { code: 'forgery', label: 'Forgery & Alteration', description: 'Loss from forged or altered financial instruments.' },
      { code: 'social_engineering', label: 'Social Engineering', description: 'Deception inducing transfer of funds or data.' },
      { code: 'funds_transfer_fraud', label: 'Funds Transfer Fraud', description: 'Unauthorized electronic transfer of funds.' },
      { code: 'riot_civil_commotion', label: 'Riot & Civil Commotion', description: 'Damage arising from public disturbance.' },
      { code: 'looting', label: 'Looting', description: 'Theft of property during disorder or disaster.' },
    ],
  },
  {
    code: 'cyber',
    label: 'Cyber & Technology',
    description: 'Digital, data and information-technology perils.',
    perils: [
      { code: 'ransomware', label: 'Ransomware', description: 'Malware that encrypts systems and demands payment.', isCatastrophe: true },
      { code: 'data_breach', label: 'Data Breach / Privacy', description: 'Unauthorized access to or disclosure of protected data.' },
      { code: 'network_interruption', label: 'Network Business Interruption', description: 'Income loss from failure or outage of network systems.' },
      { code: 'cyber_extortion', label: 'Cyber Extortion', description: 'Threats against systems or data demanding payment.' },
      { code: 'malware', label: 'Malware / Virus', description: 'Malicious code damaging or disrupting systems.' },
      { code: 'denial_of_service', label: 'Denial of Service', description: 'Attack overwhelming systems to deny availability.' },
      { code: 'system_failure', label: 'System / Technology Failure', description: 'Unplanned outage from internal IT failure.' },
      { code: 'phishing', label: 'Phishing', description: 'Fraudulent solicitation of credentials or payment.' },
      { code: 'cloud_outage', label: 'Cloud / Dependent Outage', description: 'Interruption from failure of a third-party technology provider.', isCatastrophe: true },
    ],
  },
  {
    code: 'liability',
    label: 'Liability / Casualty',
    description: 'Legal-liability perils — harm to third parties triggering indemnity.',
    perils: [
      { code: 'bodily_injury', label: 'Bodily Injury', description: 'Liability for physical injury to a third party.' },
      { code: 'property_damage', label: 'Third-Party Property Damage', description: 'Liability for damage to property of others.' },
      { code: 'personal_advertising_injury', label: 'Personal & Advertising Injury', description: 'Libel, slander, infringement and related offenses.' },
      { code: 'products_liability', label: 'Products Liability', description: 'Liability arising from products causing harm.' },
      { code: 'completed_operations', label: 'Completed Operations', description: 'Liability arising from completed work or operations.' },
      { code: 'professional_negligence', label: 'Professional Negligence / E&O', description: 'Liability for errors or omissions in professional services.' },
      { code: 'medical_malpractice', label: 'Medical Malpractice', description: 'Liability arising from healthcare professional negligence.' },
      { code: 'management_liability', label: 'Management Liability (Wrongful Act)', description: 'Wrongful acts of directors, officers and the organization.' },
      { code: 'employment_practices', label: 'Employment Practices', description: 'Discrimination, harassment and wrongful employment acts.' },
      { code: 'abuse_molestation', label: 'Abuse & Molestation', description: 'Liability for abuse or molestation claims.' },
    ],
  },
  {
    code: 'marine_transit',
    label: 'Marine & Transit',
    description: 'Perils to vessels, cargo and goods in transit.',
    perils: [
      { code: 'collision', label: 'Collision', description: 'Impact between a vessel and another object or vessel.' },
      { code: 'sinking', label: 'Sinking / Foundering', description: 'Loss of a vessel by sinking.' },
      { code: 'stranding_grounding', label: 'Stranding / Grounding', description: 'Vessel running aground or stranded.' },
      { code: 'jettison', label: 'Jettison', description: 'Deliberate casting of cargo overboard to save the venture.' },
      { code: 'general_average', label: 'General Average', description: 'Shared sacrifice or expense for the common maritime venture.' },
      { code: 'piracy', label: 'Piracy', description: 'Robbery or hijacking of vessels or cargo at sea.' },
      { code: 'cargo_damage', label: 'Cargo Damage', description: 'Physical damage to goods in transit.' },
      { code: 'cargo_theft', label: 'Cargo Theft', description: 'Theft of goods in transit or storage.' },
      { code: 'spoilage', label: 'Spoilage / Refrigeration Breakdown', description: 'Deterioration of goods from temperature or handling failure.' },
      { code: 'container_loss', label: 'Container Loss Overboard', description: 'Loss of containers from a vessel at sea.' },
    ],
  },
  {
    code: 'engineering',
    label: 'Engineering & Machinery',
    description: 'Breakdown and failure perils to equipment and structures.',
    perils: [
      { code: 'mechanical_breakdown', label: 'Mechanical Breakdown', description: 'Sudden failure of mechanical equipment.' },
      { code: 'electrical_breakdown', label: 'Electrical Breakdown', description: 'Sudden failure of electrical equipment.' },
      { code: 'boiler_explosion', label: 'Boiler & Pressure Vessel Explosion', description: 'Rupture or explosion of pressure equipment.' },
      { code: 'power_surge', label: 'Power Surge', description: 'Damage from voltage spikes or electrical disturbance.' },
      { code: 'operator_error', label: 'Operator Error', description: 'Damage caused by human operating mistakes.' },
      { code: 'faulty_workmanship', label: 'Faulty Workmanship / Defective Design', description: 'Loss from defective design, materials or workmanship.' },
      { code: 'structural_collapse', label: 'Structural Collapse', description: 'Sudden collapse of a building or structure.' },
      { code: 'equipment_failure', label: 'Equipment Failure', description: 'General failure of machinery or apparatus.' },
    ],
  },
  {
    code: 'political',
    label: 'Political & Social',
    description: 'Political violence, state action and social-unrest perils.',
    perils: [
      { code: 'terrorism', label: 'Terrorism', description: 'Violent acts for political, religious or ideological aims.', isCatastrophe: true },
      { code: 'war', label: 'War & Invasion', description: 'Loss arising from declared or undeclared war.', isCatastrophe: true },
      { code: 'civil_war', label: 'Civil War / Insurrection', description: 'Armed internal conflict and insurrection.', isCatastrophe: true },
      { code: 'sabotage', label: 'Sabotage', description: 'Deliberate damage to disrupt operations or infrastructure.' },
      { code: 'coup', label: "Coup d'État / Political Violence", description: 'Forcible seizure of government or related violence.' },
      { code: 'strikes', label: 'Strikes, Riots & Civil Commotion (SRCC)', description: 'Damage arising from labor action and civil unrest.' },
      { code: 'expropriation', label: 'Expropriation / Nationalization', description: 'Seizure of assets by government action.' },
      { code: 'currency_inconvertibility', label: 'Currency Inconvertibility', description: 'Inability to convert or transfer local currency.' },
      { code: 'contract_frustration', label: 'Contract Frustration', description: 'Loss from government interference with contract performance.' },
      { code: 'trade_embargo', label: 'Trade Embargo / Sanctions', description: 'Loss arising from imposition of embargoes or sanctions.' },
    ],
  },
  {
    code: 'financial',
    label: 'Financial & Credit',
    description: 'Credit, non-payment and business-income perils.',
    perils: [
      { code: 'credit_default', label: 'Credit Default / Insolvency', description: 'Counterparty insolvency or failure to pay debt.' },
      { code: 'non_payment', label: 'Non-Payment', description: 'Buyer protracted default on amounts owed.' },
      { code: 'business_interruption', label: 'Business Interruption', description: 'Loss of income from interruption of operations.' },
      { code: 'contingent_business_interruption', label: 'Contingent Business Interruption', description: 'Income loss from disruption to suppliers or customers.' },
      { code: 'supply_chain_disruption', label: 'Supply Chain Disruption', description: 'Loss from interruption of the supply chain.' },
      { code: 'bond_default', label: 'Surety Bond Default', description: 'Principal failure to perform a bonded obligation.' },
      { code: 'trade_credit_loss', label: 'Trade Credit Loss', description: 'Loss on receivables from buyer default or insolvency.' },
    ],
  },
  {
    code: 'environmental',
    label: 'Environmental & Pollution',
    description: 'Contamination and pollution perils to land, water and air.',
    perils: [
      { code: 'pollution', label: 'Pollution / Contamination', description: 'Release of pollutants causing damage or clean-up cost.' },
      { code: 'sudden_accidental_pollution', label: 'Sudden & Accidental Pollution', description: 'Pollution from a sudden, identifiable event.' },
      { code: 'gradual_pollution', label: 'Gradual Pollution', description: 'Pollution from gradual seepage or ongoing release.' },
      { code: 'chemical_release', label: 'Chemical Release', description: 'Accidental release of hazardous chemicals.' },
      { code: 'oil_spill', label: 'Oil Spill', description: 'Release of petroleum into the environment.' },
      { code: 'asbestos', label: 'Asbestos', description: 'Bodily injury or remediation from asbestos exposure.' },
      { code: 'mold', label: 'Mold / Fungi', description: 'Damage or liability from mold and fungal growth.' },
      { code: 'groundwater_contamination', label: 'Groundwater Contamination', description: 'Contamination of subsurface water supplies.' },
    ],
  },
  {
    code: 'life_health',
    label: 'Life, Health & Accident',
    description: 'Mortality, morbidity and health perils to persons.',
    perils: [
      { code: 'mortality', label: 'Death / Mortality', description: 'Death of an insured life.' },
      { code: 'accidental_death', label: 'Accidental Death & Dismemberment', description: 'Death or dismemberment from accidental injury.' },
      { code: 'critical_illness', label: 'Critical Illness', description: 'Diagnosis of a covered serious illness.' },
      { code: 'disability', label: 'Disability', description: 'Inability to work due to injury or illness.' },
      { code: 'longevity', label: 'Longevity', description: 'Risk of insureds living longer than expected.' },
      { code: 'hospitalization', label: 'Hospitalization / Medical Expense', description: 'Medical and hospital costs of covered persons.' },
      { code: 'pandemic', label: 'Pandemic / Epidemic', description: 'Widespread infectious-disease outbreak affecting many lives.', isCatastrophe: true },
      { code: 'occupational_disease', label: 'Occupational Disease', description: 'Illness arising from workplace exposure.' },
    ],
  },
  {
    code: 'agriculture',
    label: 'Agriculture & Biological',
    description: 'Crop, livestock and biological perils to agricultural risk.',
    perils: [
      { code: 'crop_hail', label: 'Crop Hail', description: 'Hail damage to standing crops.' },
      { code: 'frost_freeze', label: 'Frost / Freeze', description: 'Crop damage from frost or freezing temperatures.' },
      { code: 'excessive_rainfall', label: 'Excessive Rainfall', description: 'Crop loss from excess moisture and waterlogging.' },
      { code: 'pestilence', label: 'Pest / Insect Infestation', description: 'Crop damage from pests or insect infestation.' },
      { code: 'plant_disease', label: 'Plant Disease / Blight', description: 'Crop loss from fungal, bacterial or viral disease.' },
      { code: 'livestock_mortality', label: 'Livestock Mortality', description: 'Death of insured livestock.' },
      { code: 'epizootic', label: 'Epizootic / Animal Disease Outbreak', description: 'Widespread outbreak of disease in animal populations.', isCatastrophe: true },
      { code: 'yield_shortfall', label: 'Yield Shortfall', description: 'Production falling below an insured yield threshold.' },
    ],
  },
];

// Flat list of every canonical peril code, derived from the taxonomy. Use this as
// the single source of truth when validating a peril reference elsewhere.
export const perilTaxonomyCodes: string[] = perilTaxonomy.flatMap((category) =>
  category.perils.map((peril) => peril.code),
);
