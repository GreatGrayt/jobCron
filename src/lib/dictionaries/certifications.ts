/**
 * Comprehensive list of professional certifications across all industries
 */

export const certificationPatterns: Array<{ name: string; pattern: RegExp }> = [
  // Finance & Accounting
  { name: 'CFA', pattern: /\bCFA\s*(?:Level\s*([I1-3]|One|Two|Three|I{1,3}))?\b/gi },
  { name: 'ACCA', pattern: /\bACCA\b/gi },
  { name: 'ACA', pattern: /\bACA\b/gi },
  { name: 'CIMA', pattern: /\bCIMA\b/gi },
  { name: 'FRM', pattern: /\bFRM\b/gi },
  { name: 'CPA', pattern: /\bCPA\b/gi },
  { name: 'CIA', pattern: /\bCIA\b(?:\s+Certified)?/gi },
  { name: 'CISA', pattern: /\bCISA\b/gi },
  { name: 'CFP', pattern: /\bCFP\b|Certified\s+Financial\s+Planner/gi },
  { name: 'CMA', pattern: /\bCMA\b|Certified\s+Management\s+Accountant/gi },
  { name: 'EA', pattern: /\bEnrolled\s+Agent\b/gi },
  { name: 'Series 7', pattern: /\bSeries\s+7\b/gi },
  { name: 'Series 63', pattern: /\bSeries\s+63\b/gi },
  { name: 'Series 65', pattern: /\bSeries\s+65\b/gi },
  { name: 'CAIA', pattern: /\bCAIA\b/gi },
  { name: 'CTP', pattern: /\bCTP\b|Certified\s+Treasury\s+Professional/gi },

  // IT & Technology
  { name: 'AWS Certified Solutions Architect', pattern: /AWS\s+(?:Certified\s+)?Solutions\s+Architect/gi },
  { name: 'AWS Certified Developer', pattern: /AWS\s+(?:Certified\s+)?Developer/gi },
  { name: 'AWS Certified SysOps', pattern: /AWS\s+(?:Certified\s+)?SysOps/gi },
  { name: 'Azure Administrator', pattern: /Azure\s+Administrator/gi },
  { name: 'Azure Developer', pattern: /Azure\s+Developer/gi },
  { name: 'Azure Solutions Architect', pattern: /Azure\s+Solutions\s+Architect/gi },
  { name: 'GCP Professional', pattern: /GCP\s+Professional|Google\s+Cloud\s+Professional/gi },
  { name: 'CISSP', pattern: /\bCISSP\b/gi },
  { name: 'CompTIA Security+', pattern: /CompTIA\s+Security\+|Security\+/gi },
  { name: 'CompTIA Network+', pattern: /CompTIA\s+Network\+|Network\+/gi },
  { name: 'CompTIA A+', pattern: /CompTIA\s+A\+|A\+\s+Certified/gi },
  { name: 'CEH', pattern: /\bCEH\b|Certified\s+Ethical\s+Hacker/gi },
  { name: 'CCNA', pattern: /\bCCNA\b|Cisco\s+Certified/gi },
  { name: 'CCNP', pattern: /\bCCNP\b/gi },
  { name: 'CCIE', pattern: /\bCCIE\b/gi },
  { name: 'RHCSA', pattern: /\bRHCSA\b|Red\s+Hat\s+Certified/gi },
  { name: 'RHCE', pattern: /\bRHCE\b/gi },
  { name: 'MCSA', pattern: /\bMCSA\b|Microsoft\s+Certified\s+Solutions\s+Associate/gi },
  { name: 'MCSE', pattern: /\bMCSE\b|Microsoft\s+Certified\s+Solutions\s+Expert/gi },
  { name: 'PMP', pattern: /\bPMP\b|Project\s+Management\s+Professional/gi },
  { name: 'ITIL', pattern: /\bITIL\b/gi },
  { name: 'TOGAF', pattern: /\bTOGAF\b/gi },
  { name: 'CKA', pattern: /\bCKA\b|Certified\s+Kubernetes\s+Administrator/gi },
  { name: 'CKAD', pattern: /\bCKAD\b|Certified\s+Kubernetes\s+Application\s+Developer/gi },
  { name: 'Terraform Associate', pattern: /Terraform\s+Associate/gi },

  // Data Science & Analytics
  { name: 'Google Data Analytics', pattern: /Google\s+(?:Certified\s+)?Data\s+Analytics/gi },
  { name: 'Microsoft Certified: Data Analyst', pattern: /Microsoft\s+Certified:?\s*Data\s+Analyst/gi },
  { name: 'Tableau Desktop Specialist', pattern: /Tableau\s+Desktop\s+Specialist/gi },
  { name: 'Cloudera Certified', pattern: /Cloudera\s+Certified/gi },
  { name: 'CAP', pattern: /\bCAP\b|Certified\s+Analytics\s+Professional/gi },

  // Marketing & Sales
  { name: 'Google Ads Certification', pattern: /Google\s+Ads\s+Certif(?:ication|ied)/gi },
  { name: 'Google Analytics', pattern: /Google\s+Analytics\s+(?:Certified|Certification)/gi },
  { name: 'HubSpot Certification', pattern: /HubSpot\s+Certif(?:ication|ied)/gi },
  { name: 'Facebook Blueprint', pattern: /Facebook\s+Blueprint/gi },
  { name: 'Salesforce Certified', pattern: /Salesforce\s+Certified/gi },
  { name: 'Hootsuite Certified', pattern: /Hootsuite\s+(?:Certified|Certification)/gi },

  // HR & Management
  { name: 'SHRM-CP', pattern: /\bSHRM-CP\b/gi },
  { name: 'SHRM-SCP', pattern: /\bSHRM-SCP\b/gi },
  { name: 'PHR', pattern: /\bPHR\b|Professional\s+in\s+Human\s+Resources/gi },
  { name: 'SPHR', pattern: /\bSPHR\b|Senior\s+Professional\s+in\s+Human\s+Resources/gi },
  { name: 'GPHR', pattern: /\bGPHR\b/gi },
  { name: 'Six Sigma Green Belt', pattern: /Six\s+Sigma\s+Green\s+Belt/gi },
  { name: 'Six Sigma Black Belt', pattern: /Six\s+Sigma\s+Black\s+Belt/gi },
  { name: 'Lean Six Sigma', pattern: /Lean\s+Six\s+Sigma/gi },
  { name: 'Scrum Master', pattern: /(?:Certified\s+)?Scrum\s+Master|CSM/gi },
  { name: 'Product Owner', pattern: /(?:Certified\s+)?(?:Scrum\s+)?Product\s+Owner|CSPO/gi },
  { name: 'SAFe', pattern: /\bSAFe\b\s+(?:Agilist|Certified)/gi },

  // Healthcare
  { name: 'MD', pattern: /\bM\.?D\.?\b|Doctor\s+of\s+Medicine/gi },
  { name: 'RN', pattern: /\bR\.?N\.?\b|Registered\s+Nurse/gi },
  { name: 'NP', pattern: /\bN\.?P\.?\b|Nurse\s+Practitioner/gi },
  { name: 'PA-C', pattern: /\bPA-C\b|Physician\s+Assistant/gi },
  { name: 'PharmD', pattern: /\bPharmD\b|Doctor\s+of\s+Pharmacy/gi },
  { name: 'APRN', pattern: /\bAPRN\b/gi },
  { name: 'ACLS', pattern: /\bACLS\b/gi },
  { name: 'BLS', pattern: /\bBLS\b/gi },
  { name: 'CNA', pattern: /\bCNA\b|Certified\s+Nursing\s+Assistant/gi },

  // Legal
  { name: 'JD', pattern: /\bJ\.?D\.?\b|Juris\s+Doctor/gi },
  { name: 'LLM', pattern: /\bLL\.?M\.?\b/gi },
  { name: 'Bar Admission', pattern: /Bar\s+Admission|Licensed\s+Attorney/gi },
  { name: 'Notary Public', pattern: /Notary\s+Public/gi },

  // Engineering
  { name: 'PE', pattern: /\bP\.?E\.?\b|Professional\s+Engineer/gi },
  { name: 'FE', pattern: /\bF\.?E\.?\b|Fundamentals\s+of\s+Engineering/gi },
  { name: 'EIT', pattern: /\bEIT\b|Engineer\s+in\s+Training/gi },
  { name: 'PLS', pattern: /\bPLS\b|Professional\s+Land\s+Surveyor/gi },
  { name: 'LEED AP', pattern: /LEED\s+AP/gi },

  // Real Estate & Construction
  { name: 'Real Estate License', pattern: /Real\s+Estate\s+Licen(?:se|ced)/gi },
  { name: 'CCIM', pattern: /\bCCIM\b/gi },
  { name: 'CPM', pattern: /\bCPM\b|Certified\s+Property\s+Manager/gi },
  { name: 'OSHA', pattern: /OSHA\s+(?:Certified|Certification)/gi },

  // Supply Chain & Logistics
  { name: 'CSCP', pattern: /\bCSCP\b|Certified\s+Supply\s+Chain\s+Professional/gi },
  { name: 'CPIM', pattern: /\bCPIM\b/gi },
  { name: 'CLTD', pattern: /\bCLTD\b/gi },

  // Quality & Manufacturing
  { name: 'ASQ', pattern: /ASQ\s+Certif(?:ied|ication)/gi },
  { name: 'CQE', pattern: /\bCQE\b|Certified\s+Quality\s+Engineer/gi },
  { name: 'CQA', pattern: /\bCQA\b|Certified\s+Quality\s+Auditor/gi },

  // General Business
  { name: 'MBA', pattern: /\bMBA\b|Master\s+of\s+Business\s+Administration/gi },
  { name: 'CFA', pattern: /\bCFA\b/gi },
];
