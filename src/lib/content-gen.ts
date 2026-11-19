/**
 * Generates ORIGINAL bilingual product copy from factual attributes only
 * (name, brand, technical content, formulation, crops, pests, dosage).
 * It never uses text written by a source website. Output is a starting draft:
 * products stay DRAFT with hiReviewed=false until a person reviews them.
 */

export type Facts = {
  name: string;
  brand?: string;
  category: string; // our category slug
  subCategory?: string;
  technicalContent?: string;
  formulation?: string;
  crops?: string[];
  pests?: string[];
  dosage?: string; // factual dose as published on label, e.g. "2 ml per litre"
};

type Copy = {
  shortDescription_en: string;
  shortDescription_hi: string;
  description_en: string;
  description_hi: string;
  keyFeatures_en: string[];
  keyFeatures_hi: string[];
  dosage_en: string;
  dosage_hi: string;
  howToUse_en: string;
  howToUse_hi: string;
  safety_en: string;
  safety_hi: string;
  licenceType: "PESTICIDE" | "FERTILIZER" | "SEED" | "NONE";
  surfaceOnly: boolean;
};

const LABEL_LINE_EN = "Read the label and leaflet before use; follow the recommended dose and waiting period.";
const LABEL_LINE_HI = "इस्तेमाल से पहले लेबल और पर्चा ज़रूर पढ़ें; बताई गई डोज़ और वेटिंग पीरियड का पालन करें।";

const cropHi: Record<string, string> = {
  tomato: "टमाटर", chilli: "मिर्च", cotton: "कपास", paddy: "धान", wheat: "गेहूँ", sugarcane: "गन्ना", onion: "प्याज़",
  grapes: "अंगूर", banana: "केला", soybean: "सोयाबीन", vegetables: "सब्ज़ियाँ", fruits: "फल",
};

const join = (a: string[], and = "and") => (a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} ${and} ${a[a.length - 1]}`);

export function generateCopy(f: Facts): Copy {
  const crops = (f.crops ?? []).filter(Boolean);
  const pests = (f.pests ?? []).filter(Boolean);
  const cropsEn = crops.length ? join(crops.map((c) => c.toLowerCase())) : "a range of field and horticulture crops";
  const cropsHi = crops.length ? join(crops.map((c) => cropHi[c.toLowerCase()] ?? c), "और") : "कई खेत और बागवानी फसलों";
  const brandInName = Boolean(f.brand && f.name.toLowerCase().includes(f.brand.toLowerCase()));
  const by = f.brand && !brandInName ? ` by ${f.brand}` : "";
  const byHi = f.brand && !brandInName ? `${f.brand} का ` : "";
  const tc = f.technicalContent ? ` (${f.technicalContent})` : "";
  const dEn = f.dosage ? `Label dose: ${f.dosage}. Adjust within the label range for crop stage and pest pressure.` : "Follow the dose printed on the product label for your crop and stage.";
  const dHi = f.dosage ? `लेबल पर दी गई डोज़: ${f.dosage}। फसल की अवस्था और कीट/रोग के असर के हिसाब से लेबल की सीमा में ही बदलाव करें।` : "अपनी फसल और अवस्था के लिए लेबल पर छपी डोज़ का पालन करें।";

  switch (f.category) {
    case "crop-protection":
    case "plant-growth-regulators": {
      const isPgr = f.category === "plant-growth-regulators";
      const what = isPgr ? "plant growth regulator" : f.subCategory?.includes("fung") ? "fungicide" : f.subCategory?.includes("herb") ? "herbicide" : f.subCategory?.includes("bio") ? "bio-pesticide" : "insecticide";
      const whatHi = isPgr ? "ग्रोथ रेगुलेटर" : what === "fungicide" ? "फफूंदनाशक" : what === "herbicide" ? "खरपतवारनाशक" : what === "bio-pesticide" ? "जैविक दवा" : "कीटनाशक";
      const target = pests.length ? join(pests) : isPgr ? "flowering, fruit set and growth" : "the pests mentioned on its label";
      const targetHi = pests.length ? join(pests, "और") : isPgr ? "फूल, फल बनने और बढ़वार" : "लेबल पर बताए गए कीट/रोग";
      return {
        licenceType: "PESTICIDE", // PGRs are also registered under the Insecticides Act – admin can change
        surfaceOnly: true,
        shortDescription_en: `${f.name}${by} is a ${what}${tc} used on ${cropsEn} for ${target}.`,
        shortDescription_hi: `${byHi}${f.name} एक ${whatHi} है${tc}, जो ${cropsHi} में ${targetHi} के लिए इस्तेमाल होता है।`,
        description_en: `${f.name}${by} is a ${f.formulation ? `${f.formulation} ` : ""}${what}${tc}. It is recommended on ${cropsEn} for ${target}.\n\nFor best results, spray at the first sign of the problem rather than after heavy damage, cover both sides of the leaves, and rotate with products from a different chemical group to slow down resistance.\n\n${LABEL_LINE_EN}`,
        description_hi: `${byHi}${f.name} एक ${f.formulation ? `${f.formulation} ` : ""}${whatHi} है${tc}। इसे ${cropsHi} में ${targetHi} के लिए सुझाया जाता है।\n\nअच्छे नतीजे के लिए समस्या दिखते ही छिड़काव करें, ज़्यादा नुकसान होने का इंतज़ार न करें। पत्तियों के दोनों तरफ़ अच्छी तरह स्प्रे करें, और प्रतिरोध (resistance) से बचने के लिए अलग ग्रुप की दवा के साथ अदल-बदल कर इस्तेमाल करें।\n\n${LABEL_LINE_HI}`,
        keyFeatures_en: [
          f.technicalContent ? `Active content: ${f.technicalContent}` : `Branded ${what}`,
          pests.length ? `Used for: ${join(pests)}` : `For use as per label`,
          crops.length ? `Crops: ${cropsEn}` : "Suitable for many crops as per label",
          "Sealed, genuine pack with batch and expiry printed",
        ],
        keyFeatures_hi: [
          f.technicalContent ? `तकनीकी तत्व: ${f.technicalContent}` : `ब्रांडेड ${whatHi}`,
          pests.length ? `किसके लिए: ${join(pests, "और")}` : "लेबल के अनुसार इस्तेमाल",
          crops.length ? `फसलें: ${cropsHi}` : "लेबल के अनुसार कई फसलों में",
          "सील बंद असली पैक, बैच और एक्सपायरी छपी हुई",
        ],
        dosage_en: dEn,
        dosage_hi: dHi,
        howToUse_en: "1. Fill half the sprayer tank with clean water.\n2. Measure the product with a measuring cup – never by guess – and mix it separately in a small amount of water.\n3. Add it to the tank, top up with water and stir well.\n4. Spray in the early morning or evening when there is little wind. Avoid spraying before expected rain.\n5. Clean the sprayer after use.",
        howToUse_hi: "1. स्प्रेयर की टंकी आधी साफ़ पानी से भरें।\n2. दवा को नापने वाले कप से नापें – अंदाज़े से नहीं – और पहले थोड़े पानी में अलग से घोलें।\n3. घोल टंकी में डालें, बाकी पानी भरें और अच्छी तरह मिलाएं।\n4. सुबह जल्दी या शाम को, जब हवा कम हो, तब छिड़काव करें। बारिश की संभावना हो तो छिड़काव न करें।\n5. इस्तेमाल के बाद स्प्रेयर साफ़ करें।",
        safety_en: `${LABEL_LINE_EN}\n\nWear gloves, a mask, full-sleeve clothes and eye protection while mixing and spraying. Do not eat, drink or smoke while spraying. Keep away from children, animals, food and feed. Do not spray against the wind. Do not wash the sprayer or empty containers in ponds, wells or streams. Destroy empty containers – do not reuse them. In case of poisoning, contact a doctor immediately and show the label.\n\nStore in the original container in a cool, dry, locked place away from sunlight.`,
        safety_hi: `${LABEL_LINE_HI}\n\nघोल बनाते और छिड़काव करते समय दस्ताने, मास्क, पूरी बाजू के कपड़े और चश्मा पहनें। छिड़काव के समय कुछ न खाएं, न पिएं, न धूम्रपान करें। बच्चों, पशुओं, खाने और चारे से दूर रखें। हवा के उल्टी दिशा में स्प्रे न करें। स्प्रेयर या खाली डिब्बे तालाब, कुएं या नाले में न धोएं। खाली डिब्बे नष्ट कर दें – दोबारा इस्तेमाल न करें। ज़हर का असर होने पर तुरंत डॉक्टर को दिखाएं और लेबल साथ ले जाएं।\n\nअसली डिब्बे में ही, ठंडी, सूखी और ताले वाली जगह पर, धूप से दूर रखें।`,
      };
    }
    case "crop-nutrition":
      return {
        licenceType: "FERTILIZER",
        surfaceOnly: false,
        shortDescription_en: `${f.name}${by}${tc} – crop nutrition for ${cropsEn}.`,
        shortDescription_hi: `${byHi}${f.name}${tc} – ${cropsHi} के लिए पोषण।`,
        description_en: `${f.name}${by} is a crop nutrition product${tc}. It helps supply nutrients at the right stage so the crop can grow evenly and give a better quality harvest.\n\nUse it as part of a balanced nutrition plan based on your soil test. Water-soluble grades can be given through drip (fertigation) or as a foliar spray; granular products are applied to the soil.`,
        description_hi: `${byHi}${f.name} एक फसल पोषण प्रोडक्ट है${tc}। यह सही अवस्था पर पोषक तत्व देने में मदद करता है, जिससे फसल की बढ़वार एक जैसी होती है और उपज की गुणवत्ता अच्छी मिलती है।\n\nइसे मिट्टी जाँच के आधार पर संतुलित पोषण योजना के साथ इस्तेमाल करें। पानी में घुलने वाली खाद ड्रिप (फर्टिगेशन) या पत्तियों पर स्प्रे से दी जा सकती है; दानेदार खाद मिट्टी में डाली जाती है।`,
        keyFeatures_en: [f.technicalContent ? `Composition: ${f.technicalContent}` : "Branded nutrient", "Use with a soil-test based plan", "For drip, spray or soil application as per label"],
        keyFeatures_hi: [f.technicalContent ? `तत्व: ${f.technicalContent}` : "ब्रांडेड पोषक तत्व", "मिट्टी जाँच के आधार पर इस्तेमाल करें", "लेबल के अनुसार ड्रिप, स्प्रे या मिट्टी में"],
        dosage_en: dEn,
        dosage_hi: dHi,
        howToUse_en: "Dissolve the measured quantity fully in clean water before use. For foliar spray, spray in the cool part of the day. For drip, inject through the venturi or fertilizer tank and flush the lines with plain water afterwards. Do a small compatibility test before mixing with other products.",
        howToUse_hi: "नापी हुई मात्रा को इस्तेमाल से पहले साफ़ पानी में पूरी तरह घोल लें। पत्तियों पर स्प्रे दिन के ठंडे समय में करें। ड्रिप में वेंचुरी या फर्टिलाइज़र टैंक से दें और बाद में सादे पानी से पाइप साफ़ करें। दूसरे प्रोडक्ट के साथ मिलाने से पहले थोड़ी मात्रा में मिलाकर जाँच लें।",
        safety_en: "Keep away from children and animals. Avoid contact with eyes; wash hands after use. Store in a cool, dry place and close the bag or container tightly after use.",
        safety_hi: "बच्चों और पशुओं से दूर रखें। आँखों में जाने से बचाएं; इस्तेमाल के बाद हाथ धोएं। ठंडी, सूखी जगह पर रखें और इस्तेमाल के बाद बैग या डिब्बा अच्छी तरह बंद करें।",
      };
    case "seeds":
      return {
        licenceType: "SEED",
        surfaceOnly: false,
        shortDescription_en: `${f.name}${by} – seeds for ${cropsEn}.`,
        shortDescription_hi: `${byHi}${f.name} – ${cropsHi} के बीज।`,
        description_en: `${f.name}${by} seeds. Choose a variety that suits your region, season and market, and check the sowing window printed on the packet.\n\nBuy fresh seed for every season, sow at the recommended spacing and depth, and keep the packet with the bill until harvest.`,
        description_hi: `${byHi}${f.name} के बीज। अपने इलाके, मौसम और बाज़ार के हिसाब से किस्म चुनें, और पैकेट पर छपी बुवाई का समय देख लें।\n\nहर मौसम में ताज़ा बीज लें, बताई गई दूरी और गहराई पर बुवाई करें, और कटाई तक पैकेट और बिल संभाल कर रखें।`,
        keyFeatures_en: ["Sealed, branded seed packet", "Germination and lot details printed on the packet", crops.length ? `Crop: ${cropsEn}` : "See packet for crop details"],
        keyFeatures_hi: ["सील बंद ब्रांडेड बीज पैकेट", "अंकुरण और लॉट की जानकारी पैकेट पर छपी", crops.length ? `फसल: ${cropsHi}` : "फसल की जानकारी पैकेट पर देखें"],
        dosage_en: f.dosage ? `Seed rate: ${f.dosage}.` : "Seed rate and spacing are printed on the packet.",
        dosage_hi: f.dosage ? `बीज दर: ${f.dosage}।` : "बीज दर और दूरी पैकेट पर छपी है।",
        howToUse_en: "Prepare a fine, moist seed bed or nursery. Treat seed only if the packet does not say it is already treated. Sow at the depth and spacing on the packet and keep the soil moist (not waterlogged) until germination.",
        howToUse_hi: "भुरभुरी और नम क्यारी या नर्सरी तैयार करें। अगर पैकेट पर उपचारित (treated) नहीं लिखा है, तभी बीज उपचार करें। पैकेट पर बताई गहराई और दूरी पर बोएं और अंकुरण तक मिट्टी में नमी रखें (पानी भरा न रहे)।",
        safety_en: "Treated seed is not for eating or animal feed. Keep away from children. Store unopened packets in a cool, dry place. Opened seed packets cannot be returned unless defective.",
        safety_hi: "उपचारित बीज खाने या पशु आहार के लिए नहीं है। बच्चों से दूर रखें। बंद पैकेट ठंडी, सूखी जगह पर रखें। खुले बीज पैकेट वापस नहीं होते, जब तक उनमें खराबी न हो।",
      };
    default:
      return {
        licenceType: "NONE",
        surfaceOnly: false,
        shortDescription_en: `${f.name}${by}${f.technicalContent ? ` – ${f.technicalContent}` : ""}.`,
        shortDescription_hi: `${byHi}${f.name}${f.technicalContent ? ` – ${f.technicalContent}` : ""}।`,
        description_en: `${f.name}${by}. A practical, genuine product for farm and garden use. Check the specifications and pack size before ordering, and follow the instructions supplied with the product.`,
        description_hi: `${byHi}${f.name}। खेत और बागवानी के काम का असली प्रोडक्ट। ऑर्डर से पहले जानकारी और पैक साइज़ देख लें, और प्रोडक्ट के साथ मिले निर्देशों का पालन करें।`,
        keyFeatures_en: [f.brand ? `Brand: ${f.brand}` : "Genuine product", "Ships across India", "Replacement for damaged or wrong items as per policy"],
        keyFeatures_hi: [f.brand ? `ब्रांड: ${f.brand}` : "असली प्रोडक्ट", "पूरे भारत में डिलीवरी", "नीति के अनुसार टूटे या गलत सामान की बदली"],
        dosage_en: f.dosage ?? "",
        dosage_hi: f.dosage ?? "",
        howToUse_en: "Follow the instruction sheet supplied with the product.",
        howToUse_hi: "प्रोडक्ट के साथ मिले निर्देशों का पालन करें।",
        safety_en: "Keep away from children. Use as directed.",
        safety_hi: "बच्चों से दूर रखें। निर्देश के अनुसार इस्तेमाल करें।",
      };
  }
}
