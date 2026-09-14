export const TOOTH_METADATA = {
  11:{name:'Maxillary right central incisor',className:'Incisor',kind:'incisor'},
  12:{name:'Maxillary right lateral incisor',className:'Incisor',kind:'incisor'},
  13:{name:'Maxillary right canine',className:'Canine',kind:'canine'},
  14:{name:'Maxillary right first premolar',className:'Premolar',kind:'premolar'},
  15:{name:'Maxillary right second premolar',className:'Premolar',kind:'premolar'},
  16:{name:'Maxillary right first molar',className:'Molar',kind:'molar'},
  17:{name:'Maxillary right second molar',className:'Molar',kind:'molar'},
  18:{name:'Maxillary right third molar',className:'Molar',kind:'molar'},
  21:{name:'Maxillary left central incisor',className:'Incisor',kind:'incisor'},
  22:{name:'Maxillary left lateral incisor',className:'Incisor',kind:'incisor'},
  23:{name:'Maxillary left canine',className:'Canine',kind:'canine'},
  24:{name:'Maxillary left first premolar',className:'Premolar',kind:'premolar'},
  25:{name:'Maxillary left second premolar',className:'Premolar',kind:'premolar'},
  26:{name:'Maxillary left first molar',className:'Molar',kind:'molar'},
  27:{name:'Maxillary left second molar',className:'Molar',kind:'molar'},
  28:{name:'Maxillary left third molar',className:'Molar',kind:'molar'},
  31:{name:'Mandibular left central incisor',className:'Incisor',kind:'incisor'},
  32:{name:'Mandibular left lateral incisor',className:'Incisor',kind:'incisor'},
  33:{name:'Mandibular left canine',className:'Canine',kind:'canine'},
  34:{name:'Mandibular left first premolar',className:'Premolar',kind:'premolar'},
  35:{name:'Mandibular left second premolar',className:'Premolar',kind:'premolar'},
  36:{name:'Mandibular left first molar',className:'Molar',kind:'molar'},
  37:{name:'Mandibular left second molar',className:'Molar',kind:'molar'},
  38:{name:'Mandibular left third molar',className:'Molar',kind:'molar'},
  41:{name:'Mandibular right central incisor',className:'Incisor',kind:'incisor'},
  42:{name:'Mandibular right lateral incisor',className:'Incisor',kind:'incisor'},
  43:{name:'Mandibular right canine',className:'Canine',kind:'canine'},
  44:{name:'Mandibular right first premolar',className:'Premolar',kind:'premolar'},
  45:{name:'Mandibular right second premolar',className:'Premolar',kind:'premolar'},
  46:{name:'Mandibular right first molar',className:'Molar',kind:'molar'},
  47:{name:'Mandibular right second molar',className:'Molar',kind:'molar'},
  48:{name:'Mandibular right third molar',className:'Molar',kind:'molar'}
};

export function toothMeta(number) {
  return TOOTH_METADATA[number] || {name:'Permanent tooth',className:'Tooth',kind:'tooth'};
}
