type SubTypeSeed = readonly [suffix: string, label: string];

type PrimarySeed = {
  code: string;
  label: string;
  subTypes: Array<{
    code: string;
    label: string;
  }>;
};

function makePrimary(code: string, label: string, subTypes: readonly SubTypeSeed[]): PrimarySeed {
  return {
    code,
    label,
    subTypes: subTypes.map(([suffix, subLabel]) => ({
      code: `${code}_${suffix}`,
      label: subLabel,
    })),
  };
}

export const lineOfBusinessTaxonomy: PrimarySeed[] = [
  makePrimary('property', 'Property', [
    ['all_risk', 'All Risk'],
    ['named_perils', 'Named Perils'],
    ['business_interruption', 'Business Interruption'],
    ['catastrophe', 'Catastrophe'],
  ]),
  makePrimary('commercial_property', 'Commercial Property', [
    ['office', 'Office'],
    ['retail', 'Retail'],
    ['industrial', 'Industrial'],
    ['warehouse', 'Warehouse'],
  ]),
  makePrimary('residential_property', 'Residential Property', [
    ['single_family', 'Single-Family'],
    ['multi_family', 'Multi-Family'],
    ['condo', 'Condo'],
    ['rental', 'Rental'],
  ]),
  makePrimary('catastrophe_property', 'Catastrophe Property', [
    ['windstorm', 'Windstorm'],
    ['flood', 'Flood'],
    ['earthquake', 'Earthquake'],
    ['wildfire', 'Wildfire'],
  ]),
  makePrimary('inland_marine', 'Inland Marine', [
    ['contractors_equipment', 'Contractors Equipment'],
    ['installation_floater', 'Installation Floater'],
    ['bailee', 'Bailee'],
    ['fine_arts', 'Fine Arts'],
  ]),
  makePrimary('ocean_marine', 'Ocean Marine', [
    ['hull', 'Hull'],
    ['cargo', 'Cargo'],
    ['stock_throughput', 'Stock Throughput'],
    ['terminal_operators', 'Terminal Operators'],
  ]),
  makePrimary('cargo', 'Cargo', [
    ['import', 'Import'],
    ['export', 'Export'],
    ['project_cargo', 'Project Cargo'],
    ['cold_chain', 'Cold Chain'],
  ]),
  makePrimary('hull', 'Hull', [
    ['commercial_hull', 'Commercial Hull'],
    ['yacht', 'Yacht'],
    ['charter', 'Charter'],
    ['war_risk', 'War Risk'],
  ]),
  makePrimary('aviation', 'Aviation', [
    ['aircraft_hull', 'Aircraft Hull'],
    ['liability', 'Liability'],
    ['airport', 'Airport'],
    ['drone', 'Drone / UAS'],
  ]),
  makePrimary('general_liability', 'General Liability', [
    ['premises_ops', 'Premises / Operations'],
    ['products_completed_ops', 'Products / Completed Operations'],
    ['personal_advertising', 'Personal & Advertising Injury'],
    ['contractual', 'Contractual'],
  ]),
  makePrimary('product_liability', 'Product Liability', [
    ['manufacturing', 'Manufacturing'],
    ['retail_distribution', 'Retail Distribution'],
    ['recall', 'Recall'],
    ['contamination', 'Contamination'],
  ]),
  makePrimary('excess_liability', 'Excess Liability', [
    ['follow_form', 'Follow Form'],
    ['umbrella_excess', 'Umbrella Excess'],
    ['cat_excess', 'Cat Excess'],
    ['per_risk', 'Per-Risk Excess'],
  ]),
  makePrimary('umbrella_liability', 'Umbrella Liability', [
    ['commercial_umbrella', 'Commercial Umbrella'],
    ['personal_umbrella', 'Personal Umbrella'],
    ['blanket', 'Blanket'],
    ['excess_umbrella', 'Excess Umbrella'],
  ]),
  makePrimary('professional_liability', 'Professional Liability', [
    ['medical_malpractice', 'Medical Malpractice'],
    ['architects_engineers', 'Architects & Engineers'],
    ['accountants', 'Accountants'],
    ['consultants', 'Consultants'],
  ]),
  makePrimary('errors_omissions', 'Errors & Omissions', [
    ['tech_e_o', 'Tech E&O'],
    ['media_e_o', 'Media E&O'],
    ['broker_e_o', 'Broker E&O'],
    ['real_estate_e_o', 'Real Estate E&O'],
  ]),
  makePrimary('directors_officers', 'Directors & Officers', [
    ['public_company', 'Public Company'],
    ['private_company', 'Private Company'],
    ['side_a', 'Side A'],
    ['side_b_c', 'Side B / C'],
  ]),
  makePrimary('employment_practices', 'Employment Practices', [
    ['wrongful_termination', 'Wrongful Termination'],
    ['discrimination', 'Discrimination'],
    ['harassment', 'Harassment'],
    ['wage_hour', 'Wage & Hour'],
  ]),
  makePrimary('fiduciary_liability', 'Fiduciary Liability', [
    ['erisa', 'ERISA'],
    ['plan_administration', 'Plan Administration'],
    ['trust_services', 'Trust Services'],
    ['investment_advice', 'Investment Advice'],
  ]),
  makePrimary('cyber', 'Cyber', [
    ['network_security', 'Network Security'],
    ['privacy_liability', 'Privacy Liability'],
    ['ransomware', 'Ransomware'],
    ['business_interruption', 'Business Interruption'],
  ]),
  makePrimary('data_breach', 'Data Breach', [
    ['notification', 'Notification'],
    ['forensics', 'Forensics'],
    ['credit_monitoring', 'Credit Monitoring'],
    ['crisis_management', 'Crisis Management'],
  ]),
  makePrimary('crime', 'Crime', [
    ['employee_theft', 'Employee Theft'],
    ['funds_transfer_fraud', 'Funds Transfer Fraud'],
    ['forgery', 'Forgery'],
    ['social_engineering', 'Social Engineering'],
  ]),
  makePrimary('fidelity', 'Fidelity', [
    ['commercial_crime', 'Commercial Crime'],
    ['employee_dishonesty', 'Employee Dishonesty'],
    ['erisa_bond', 'ERISA Bond'],
    ['financial_institution_bond', 'Financial Institution Bond'],
  ]),
  makePrimary('trade_credit', 'Trade Credit', [
    ['domestic', 'Domestic'],
    ['export', 'Export'],
    ['single_buyer', 'Single Buyer'],
    ['whole_turnover', 'Whole Turnover'],
  ]),
  makePrimary('surety', 'Surety', [
    ['bid_bond', 'Bid Bond'],
    ['performance_bond', 'Performance Bond'],
    ['payment_bond', 'Payment Bond'],
    ['maintenance_bond', 'Maintenance Bond'],
  ]),
  makePrimary('political_risk', 'Political Risk', [
    ['expropriation', 'Expropriation'],
    ['currency_inconvertibility', 'Currency Inconvertibility'],
    ['political_violence', 'Political Violence'],
    ['contract_frustration', 'Contract Frustration'],
  ]),
  makePrimary('mortgage_credit', 'Mortgage Credit', [
    ['lender_paid', 'Lender Paid'],
    ['borrower_paid', 'Borrower Paid'],
    ['portfolio_mi', 'Portfolio MI'],
    ['excess_of_loss', 'Excess of Loss'],
  ]),
  makePrimary('energy_property', 'Energy Property', [
    ['upstream', 'Upstream'],
    ['midstream', 'Midstream'],
    ['downstream', 'Downstream'],
    ['power_generation', 'Power Generation'],
  ]),
  makePrimary('energy_liability', 'Energy Liability', [
    ['operators_liability', 'Operators Liability'],
    ['pollution_legal_liability', 'Pollution Legal Liability'],
    ['well_control', 'Well Control'],
    ['contractors', 'Contractors'],
  ]),
  makePrimary('construction_all_risk', 'Construction All Risk', [
    ['civil_works', 'Civil Works'],
    ['erection_all_risks', 'Erection All Risks'],
    ['delay_in_startup', 'Delay in Start-Up'],
    ['tunneling', 'Tunneling'],
  ]),
  makePrimary('builders_risk', 'Builders Risk', [
    ['ground_up', 'Ground-Up'],
    ['renovation', 'Renovation'],
    ['infrastructure', 'Infrastructure'],
    ['high_rise', 'High-Rise'],
  ]),
  makePrimary('equipment_breakdown', 'Equipment Breakdown', [
    ['boilers_pressure_vessels', 'Boilers & Pressure Vessels'],
    ['electrical', 'Electrical'],
    ['mechanical', 'Mechanical'],
    ['computers', 'Computers'],
  ]),
  makePrimary('workers_compensation', 'Workers Compensation', [
    ['guaranteed_cost', 'Guaranteed Cost'],
    ['large_deductible', 'Large Deductible'],
    ['retrospective', 'Retrospective'],
    ['assigned_risk', 'Assigned Risk'],
  ]),
  makePrimary('employers_liability', 'Employers Liability', [
    ['stop_gap', 'Stop Gap'],
    ['tort_liability', 'Tort Liability'],
    ['occupational_disease', 'Occupational Disease'],
    ['third_party_overaction', 'Third-Party Overaction'],
  ]),
  makePrimary('commercial_auto', 'Commercial Auto', [
    ['fleet', 'Fleet'],
    ['motor_carrier', 'Motor Carrier'],
    ['garage_liability', 'Garage Liability'],
    ['hired_non_owned', 'Hired / Non-Owned'],
  ]),
  makePrimary('personal_auto', 'Personal Auto', [
    ['standard', 'Standard'],
    ['non_standard', 'Non-Standard'],
    ['collector', 'Collector'],
    ['telematics', 'Telematics'],
  ]),
  makePrimary('personal_umbrella', 'Personal Umbrella', [
    ['standard', 'Standard'],
    ['high_net_worth', 'High Net Worth'],
    ['watercraft_excess', 'Watercraft Excess'],
    ['young_driver', 'Young Driver'],
  ]),
  makePrimary('farm_ranch', 'Farm & Ranch', [
    ['dairy', 'Dairy'],
    ['ranch_property', 'Ranch Property'],
    ['equine', 'Equine'],
    ['agritourism', 'Agritourism'],
  ]),
  makePrimary('crop', 'Crop', [
    ['multi_peril', 'Multi-Peril'],
    ['hail', 'Hail'],
    ['revenue_protection', 'Revenue Protection'],
    ['whole_farm', 'Whole Farm'],
  ]),
  makePrimary('livestock', 'Livestock', [
    ['mortality', 'Mortality'],
    ['expense', 'Expense'],
    ['transit', 'Transit'],
    ['equine_mortality', 'Equine Mortality'],
  ]),
  makePrimary('forestry', 'Forestry', [
    ['timber', 'Timber'],
    ['reforestation', 'Reforestation'],
    ['fire_suppression', 'Fire Suppression'],
    ['carbon_credits', 'Carbon Credits'],
  ]),
  makePrimary('environmental_liability', 'Environmental Liability', [
    ['pollution_legal_liability', 'Pollution Legal Liability'],
    ['contractors_pollution', 'Contractors Pollution'],
    ['site_remediation', 'Site Remediation'],
    ['storage_tanks', 'Storage Tanks'],
  ]),
  makePrimary('terrorism', 'Terrorism', [
    ['property', 'Property'],
    ['liability', 'Liability'],
    ['nbcr', 'NBCR'],
    ['political_violence', 'Political Violence'],
  ]),
  makePrimary('parametric_weather', 'Parametric Weather', [
    ['hurricane', 'Hurricane'],
    ['rainfall', 'Rainfall'],
    ['temperature', 'Temperature'],
    ['snowfall', 'Snowfall'],
  ]),
  makePrimary('catastrophe_bond', 'Catastrophe Bond', [
    ['indemnity', 'Indemnity'],
    ['parametric', 'Parametric'],
    ['industry_loss_warranties', 'Industry Loss Warranties'],
    ['sidecar', 'Sidecar'],
  ]),
  makePrimary('reinsurance_treaty', 'Reinsurance Treaty', [
    ['quota_share', 'Quota Share'],
    ['surplus', 'Surplus'],
    ['excess_of_loss', 'Excess of Loss'],
    ['stop_loss', 'Stop Loss'],
  ]),
  makePrimary('stop_loss', 'Stop Loss', [
    ['specific', 'Specific'],
    ['aggregate', 'Aggregate'],
    ['laser', 'Laser'],
    ['managed_care', 'Managed Care'],
  ]),
  makePrimary('life', 'Life', [
    ['term', 'Term'],
    ['whole', 'Whole'],
    ['universal', 'Universal'],
    ['indexed_universal', 'Indexed Universal'],
  ]),
  makePrimary('term_life', 'Term Life', [
    ['level_term', 'Level Term'],
    ['annual_renewable', 'Annual Renewable'],
    ['decreasing_term', 'Decreasing Term'],
    ['mortgage_protection', 'Mortgage Protection'],
  ]),
  makePrimary('whole_life', 'Whole Life', [
    ['participating', 'Participating'],
    ['non_participating', 'Non-Participating'],
    ['limited_pay', 'Limited Pay'],
    ['single_premium', 'Single Premium'],
  ]),
  makePrimary('universal_life', 'Universal Life', [
    ['indexed', 'Indexed'],
    ['variable', 'Variable'],
    ['guaranteed', 'Guaranteed'],
    ['survivorship', 'Survivorship'],
  ]),
  makePrimary('group_life', 'Group Life', [
    ['basic', 'Basic'],
    ['supplemental', 'Supplemental'],
    ['dependent', 'Dependent'],
    ['accidental_death', 'Accidental Death'],
  ]),
  makePrimary('accident_health', 'Accident & Health', [
    ['medical', 'Medical'],
    ['dental', 'Dental'],
    ['vision', 'Vision'],
    ['hospital_indemnity', 'Hospital Indemnity'],
  ]),
  makePrimary('disability_income', 'Disability Income', [
    ['short_term', 'Short-Term'],
    ['long_term', 'Long-Term'],
    ['business_overhead', 'Business Overhead'],
    ['key_person', 'Key Person'],
  ]),
  makePrimary('travel', 'Travel', [
    ['trip_cancellation', 'Trip Cancellation'],
    ['medical_evacuation', 'Medical Evacuation'],
    ['baggage', 'Baggage'],
    ['annual_multi_trip', 'Annual Multi-Trip'],
  ]),
  makePrimary('pet', 'Pet', [
    ['accident_only', 'Accident Only'],
    ['accident_and_illness', 'Accident & Illness'],
    ['wellness', 'Wellness'],
    ['hereditary_conditions', 'Hereditary Conditions'],
  ]),
  makePrimary('legal_expenses', 'Legal Expenses', [
    ['defense_cost', 'Defense Cost'],
    ['family_law', 'Family Law'],
    ['landlord_tenant', 'Landlord-Tenant'],
    ['employment_advice', 'Employment Advice'],
  ]),
  makePrimary('public_entity', 'Public Entity', [
    ['municipal_property', 'Municipal Property'],
    ['public_officials', 'Public Officials'],
    ['law_enforcement', 'Law Enforcement'],
    ['schools', 'Schools'],
  ]),
  makePrimary('education', 'Education', [
    ['k12', 'K-12'],
    ['higher_ed', 'Higher Ed'],
    ['private_school', 'Private School'],
    ['campus_property', 'Campus Property'],
  ]),
  makePrimary('healthcare', 'Healthcare', [
    ['hospitals', 'Hospitals'],
    ['physicians', 'Physicians'],
    ['long_term_care', 'Long-Term Care'],
    ['managed_care', 'Managed Care'],
  ]),
  makePrimary('hospitality', 'Hospitality', [
    ['hotels', 'Hotels'],
    ['restaurants', 'Restaurants'],
    ['casinos', 'Casinos'],
    ['convention_centers', 'Convention Centers'],
  ]),
];
