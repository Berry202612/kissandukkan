import type { PageSeed } from "./policies-1";

export const policiesPart2: PageSeed[] = [
  {
    slug: "pricing-mrp-policy",
    isPolicy: true,
    sortOrder: 7,
    title_en: "Pricing & MRP Policy",
    title_hi: "दाम और MRP नीति",
    summary_en: "Our selling price is never above the MRP printed on the pack. Any discount you see is calculated against that real MRP. All prices include GST.",
    summary_hi: "हमारा बिक्री दाम कभी भी पैक पर छपे MRP से ज़्यादा नहीं होता। जो भी छूट दिखती है, वह उसी असली MRP पर गिनी जाती है। सभी दाम GST सहित हैं।",
    body_en: `<h2>Never above MRP</h2><p>Under Indian law the Maximum Retail Price (MRP) printed on a pack is the highest price at which it can be sold. Our system checks every price against the MRP we record for each pack size and will not allow a selling price above it.</p>
<h2>How our prices are set</h2><p>We buy from authorised suppliers, distributors and brands and add a small, fixed margin. If that calculation would ever go above MRP, the price is capped at MRP. Prices can change when our purchase cost changes; the price you pay is the one shown at checkout.</p>
<h2>How discounts are shown</h2><ul><li>The "% off" badge is calculated only against the real printed MRP of that exact pack size.</li><li>Very small differences (under 3%) are not shown as a discount – you simply see our price and the MRP.</li><li>We do not use inflated "was" prices, countdown timers or fake urgency.</li></ul>
<h2>Fees shown separately</h2><p>The Payment &amp; Handling Fee and any shipping charge are not hidden inside product prices. They appear as separate lines in the cart before you pay and on your invoice. See the Payment Policy.</p>
<h2>Taxes</h2><p>All product prices are inclusive of GST. Your invoice shows the GST breakup.</p>
<h2>Report a pricing problem</h2><p>If you ever see a price above MRP, please tell us at {{supportEmail}} with the product link and a photo of the pack.</p>`,
    body_hi: `<h2>MRP से कभी ज़्यादा नहीं</h2><p>भारतीय कानून के अनुसार पैक पर छपा अधिकतम खुदरा मूल्य (MRP) वह सबसे ऊंचा दाम है जिस पर सामान बेचा जा सकता है। हमारा सिस्टम हर पैक साइज़ के दर्ज MRP से हर दाम की जाँच करता है और उससे ज़्यादा दाम रखने नहीं देता।</p>
<h2>हमारे दाम कैसे तय होते हैं</h2><p>हम अधिकृत सप्लायर, डिस्ट्रीब्यूटर और कंपनियों से सामान खरीदते हैं और एक छोटा, तय मार्जिन जोड़ते हैं। अगर यह हिसाब कभी MRP से ऊपर जाए, तो दाम MRP पर ही रोक दिया जाता है। हमारी खरीद लागत बदलने पर दाम बदल सकते हैं; आप वही दाम देते हैं जो चेकआउट पर दिखता है।</p>
<h2>छूट कैसे दिखाई जाती है</h2><ul><li>"% छूट" सिर्फ़ उसी पैक साइज़ के असली छपे MRP पर गिनी जाती है।</li><li>बहुत छोटा फ़र्क (3% से कम) छूट के रूप में नहीं दिखाया जाता – आपको सिर्फ़ हमारा दाम और MRP दिखता है।</li><li>हम बढ़ा-चढ़ाकर "पहले का दाम", उल्टी गिनती वाले टाइमर या झूठी जल्दबाज़ी नहीं दिखाते।</li></ul>
<h2>अलग से दिखाई जाने वाली फ़ीस</h2><p>पेमेंट और हैंडलिंग फ़ीस और डिलीवरी चार्ज प्रोडक्ट के दाम में छिपाए नहीं जाते। ये पेमेंट से पहले कार्ट में और आपके बिल में अलग लाइन में दिखते हैं। पेमेंट नीति देखें।</p>
<h2>टैक्स</h2><p>सभी प्रोडक्ट के दाम GST सहित हैं। आपके बिल में GST का पूरा हिसाब दिखता है।</p>
<h2>दाम की गड़बड़ी बताएं</h2><p>अगर कभी कोई दाम MRP से ज़्यादा दिखे, तो प्रोडक्ट लिंक और पैक की फोटो के साथ {{supportEmail}} पर बताएं।</p>`,
  },
  {
    slug: "cookie-policy",
    isPolicy: true,
    sortOrder: 8,
    title_en: "Cookie Policy",
    title_hi: "कुकी नीति",
    summary_en: "We use only necessary cookies – to keep you logged in, remember your language and cart, and protect the site. No advertising or tracking cookies.",
    summary_hi: "हम सिर्फ़ ज़रूरी कुकीज़ इस्तेमाल करते हैं – लॉग इन रखने, भाषा और कार्ट याद रखने और साइट की सुरक्षा के लिए। कोई विज्ञापन या ट्रैकिंग कुकी नहीं।",
    body_en: `<h2>What cookies are</h2><p>Cookies are small text files stored by your browser. We also use your browser's local storage for a few conveniences.</p>
<h2>What we use</h2><table><thead><tr><th>Name</th><th>Purpose</th><th>Duration</th></tr></thead><tbody><tr><td>Login session (authjs.*)</td><td>Keeps you signed in securely</td><td>Up to 30 days</td></tr><tr><td>NEXT_LOCALE</td><td>Remembers English or Hindi</td><td>1 year</td></tr><tr><td>kd_cookie_ack</td><td>Remembers that you have seen this notice</td><td>1 year</td></tr><tr><td>Local storage: cart, recently viewed, pincode</td><td>Keeps your cart and preferences on this device</td><td>Until you clear it</td></tr></tbody></table><p>During payment, Razorpay may set its own necessary cookies on its checkout window to process the payment securely.</p>
<h2>What we do not use</h2><p>No advertising cookies, no cross-site tracking and no selling of browsing data.</p>
<h2>Your control</h2><p>You can delete cookies from your browser settings. If you block necessary cookies, login and checkout will not work.</p>`,
    body_hi: `<h2>कुकी क्या है</h2><p>कुकी छोटी टेक्स्ट फ़ाइलें हैं जिन्हें आपका ब्राउज़र रखता है। कुछ सुविधाओं के लिए हम ब्राउज़र की लोकल स्टोरेज भी इस्तेमाल करते हैं।</p>
<h2>हम क्या इस्तेमाल करते हैं</h2><table><thead><tr><th>नाम</th><th>काम</th><th>समय</th></tr></thead><tbody><tr><td>लॉगिन सेशन (authjs.*)</td><td>आपको सुरक्षित रूप से लॉग इन रखता है</td><td>30 दिन तक</td></tr><tr><td>NEXT_LOCALE</td><td>हिंदी या अंग्रेज़ी याद रखता है</td><td>1 साल</td></tr><tr><td>kd_cookie_ack</td><td>याद रखता है कि आपने यह सूचना देख ली है</td><td>1 साल</td></tr><tr><td>लोकल स्टोरेज: कार्ट, हाल में देखे, पिनकोड</td><td>इस डिवाइस पर आपका कार्ट और पसंद याद रखता है</td><td>जब तक आप साफ़ न करें</td></tr></tbody></table><p>पेमेंट के समय Razorpay अपने चेकआउट पर सुरक्षित पेमेंट के लिए अपनी ज़रूरी कुकीज़ रख सकता है।</p>
<h2>हम क्या इस्तेमाल नहीं करते</h2><p>कोई विज्ञापन कुकी नहीं, कोई दूसरी साइटों पर ट्रैकिंग नहीं और ब्राउज़िंग जानकारी की कोई बिक्री नहीं।</p>
<h2>आपका नियंत्रण</h2><p>आप ब्राउज़र की सेटिंग से कुकीज़ मिटा सकते हैं। ज़रूरी कुकीज़ बंद करने पर लॉगिन और चेकआउट काम नहीं करेंगे।</p>`,
  },
  {
    slug: "disclaimer",
    isPolicy: true,
    sortOrder: 9,
    title_en: "Disclaimer",
    title_hi: "अस्वीकरण",
    summary_en: "Farming guidance on this website is general information. Always follow the product label and leaflet, and consult your local agriculture officer for your crop and region. Product claims are the manufacturer's.",
    summary_hi: "इस वेबसाइट पर खेती की सलाह सामान्य जानकारी है। हमेशा प्रोडक्ट का लेबल और पर्चा मानें, और अपनी फसल व इलाके के लिए स्थानीय कृषि अधिकारी से सलाह लें। प्रोडक्ट के दावे निर्माता के हैं।",
    body_en: `<h2>General guidance only</h2><p>Dosage tables, the dosage calculator, Kisan Gyan articles and answers to questions are general guidance prepared in good faith. Crop conditions, pest pressure, soil, water quality and weather differ from field to field. They are not a substitute for the product label, the leaflet inside the pack, or advice from your local Krishi Vigyan Kendra or agriculture officer.</p>
<h2>The label is final</h2><p>Where anything on this website differs from the label approved for the product, <strong>follow the label</strong>. Use only on crops and pests listed on the label, at the stated dose, and respect the waiting period before harvest.</p>
<h2>Manufacturer claims</h2><p>Product features and performance claims are those of the manufacturer. We sell sealed, genuine products but do not guarantee a particular yield or result.</p>
<h2>Images and illustrations</h2><p>Where a real product photo is not yet available we show a generic illustration that is clearly marked as representative.</p>
<h2>External links</h2><p>Courier tracking and other external links are provided for convenience. We are not responsible for the content of other websites.</p>`,
    body_hi: `<h2>सिर्फ़ सामान्य जानकारी</h2><p>डोज़ की जानकारी, डोज़ कैलकुलेटर, किसान ज्ञान के लेख और सवालों के जवाब नेक नीयत से तैयार की गई सामान्य जानकारी हैं। फसल की हालत, कीटों का असर, मिट्टी, पानी और मौसम हर खेत में अलग होते हैं। ये प्रोडक्ट के लेबल, पैक के अंदर के पर्चे, या आपके कृषि विज्ञान केंद्र या कृषि अधिकारी की सलाह की जगह नहीं ले सकते।</p>
<h2>लेबल ही अंतिम है</h2><p>अगर इस वेबसाइट पर लिखी कोई बात प्रोडक्ट के मंज़ूर लेबल से अलग हो, तो <strong>लेबल को मानें</strong>। सिर्फ़ लेबल पर लिखी फसलों और कीटों पर, बताई गई डोज़ में इस्तेमाल करें, और कटाई से पहले वेटिंग पीरियड का ध्यान रखें।</p>
<h2>निर्माता के दावे</h2><p>प्रोडक्ट की खूबियाँ और असर के दावे निर्माता के हैं। हम सील बंद असली सामान बेचते हैं, पर किसी तय उपज या नतीजे की गारंटी नहीं देते।</p>
<h2>फोटो और चित्र</h2><p>जहाँ असली प्रोडक्ट फोटो अभी नहीं है, वहाँ हम साफ़ तौर पर सांकेतिक लिखा हुआ सामान्य चित्र दिखाते हैं।</p>
<h2>बाहरी लिंक</h2><p>कूरियर ट्रैकिंग और दूसरे बाहरी लिंक सुविधा के लिए दिए गए हैं। दूसरी वेबसाइटों की सामग्री के लिए हम ज़िम्मेदार नहीं हैं।</p>`,
  },
  {
    slug: "grievance-redressal",
    isPolicy: true,
    sortOrder: 10,
    title_en: "Grievance Redressal",
    title_hi: "शिकायत निवारण",
    summary_en: "If you have a complaint, write to our Grievance Officer. We acknowledge every complaint within 48 hours and resolve it within one month, as required by the Consumer Protection (E-Commerce) Rules, 2020.",
    summary_hi: "कोई शिकायत हो तो हमारे शिकायत अधिकारी को लिखें। उपभोक्ता संरक्षण (ई-कॉमर्स) नियम, 2020 के अनुसार हम हर शिकायत की 48 घंटे में पावती देते हैं और एक महीने के अंदर समाधान करते हैं।",
    body_en: `<h2>Grievance Officer</h2>{{grievanceBlock}}
<h2>How to raise a complaint</h2><ol><li>For order issues, first use <strong>Account → Support tickets</strong> or the Contact page – most problems are solved quickly there.</li><li>If you are not satisfied, write to the Grievance Officer with your name, order number, the issue and any photos or documents.</li></ol>
<h2>Our commitment</h2><ul><li><strong>Acknowledgement within 48 hours</strong> of receiving your complaint.</li><li><strong>Resolution within one month</strong> of receiving your complaint.</li><li>We will tell you the reason if a request cannot be accepted.</li></ul>
<h2>Seller details</h2>{{entityBlock}}
<h2>Further escalation</h2><p>If your complaint is not resolved to your satisfaction, you may approach the National Consumer Helpline (1915 / consumerhelpline.gov.in) or the appropriate consumer commission.</p>`,
    body_hi: `<h2>शिकायत अधिकारी</h2>{{grievanceBlock}}
<h2>शिकायत कैसे करें</h2><ol><li>ऑर्डर से जुड़ी समस्या के लिए पहले <strong>खाता → सहायता टिकट</strong> या संपर्क पेज इस्तेमाल करें – ज़्यादातर समस्याएं वहीं जल्दी सुलझ जाती हैं।</li><li>संतुष्ट न हों तो अपने नाम, ऑर्डर नंबर, समस्या और फोटो या दस्तावेज़ के साथ शिकायत अधिकारी को लिखें।</li></ol>
<h2>हमारा वादा</h2><ul><li>शिकायत मिलने के <strong>48 घंटे में पावती</strong>।</li><li>शिकायत मिलने के <strong>एक महीने के अंदर समाधान</strong>।</li><li>अगर कोई रिक्वेस्ट मानी नहीं जा सकती, तो हम उसका कारण बताएंगे।</li></ul>
<h2>विक्रेता की जानकारी</h2>{{entityBlock}}
<h2>आगे शिकायत</h2><p>अगर आपकी शिकायत का संतोषजनक समाधान नहीं होता, तो आप राष्ट्रीय उपभोक्ता हेल्पलाइन (1915 / consumerhelpline.gov.in) या संबंधित उपभोक्ता आयोग में जा सकते हैं।</p>`,
  },
  {
    slug: "genuine-products-sourcing-policy",
    isPolicy: true,
    sortOrder: 11,
    title_en: "Genuine Products & Sourcing Policy",
    title_hi: "असली सामान और खरीद नीति",
    summary_en: "KissanDukkan is one shop that sources sealed, branded products from authorised suppliers, distributors and brands. We never sell loose, repacked or unbranded chemicals. If you suspect a fake, tell us and we will investigate.",
    summary_hi: "किसान दुकान एक ऐसी दुकान है जो अधिकृत सप्लायर, डिस्ट्रीब्यूटर और कंपनियों से सील बंद ब्रांडेड सामान लेती है। हम खुली, दोबारा पैक की हुई या बिना ब्रांड की दवाई कभी नहीं बेचते। नकली होने का शक हो तो बताएं, हम जाँच करेंगे।",
    body_en: `<h2>How KissanDukkan works</h2><p>KissanDukkan is an aggregator: one trusted storefront that brings together products from several authorised sources. You buy from {{legalName}}; we take responsibility for your order, invoice, delivery and support.</p>
<h2>Where our products come from</h2><ul><li><strong>Brands and their authorised distributors</strong> – the primary source for agro-chemicals, fertilizers and seeds.</li><li><strong>Authorised dealers and established online agri-input stores</strong> that buy from the brands' official channels.</li></ul><p>Some items are stocked and shipped by us; others are shipped directly from our sourcing partner's warehouse. Either way, the product is the same sealed pack from the brand.</p>
<h2>Our checks</h2><ul><li>Only sealed packs with the manufacturer's label, batch number, manufacturing and expiry dates, and registration/licence details where required by law.</li><li>No loose, decanted, repacked or unbranded agro-chemicals.</li><li>Active ingredients are checked against our list of banned and restricted pesticides; such products are never published.</li><li>A minimum shelf life on delivery is stated on product pages where relevant.</li></ul>
<h2>Our licences</h2>{{licenceBlock}}
<h2>Report a suspected fake</h2><p>If anything about a product looks wrong – broken seal, missing batch details, unusual smell or colour, spelling mistakes on the label – do not use it. Raise a request from My Orders within {{replacementWindowHours}} hours with photos, or write to {{supportEmail}}. We will investigate with the supplier and the brand, and replace or refund if the concern is confirmed.</p>`,
    body_hi: `<h2>किसान दुकान कैसे काम करती है</h2><p>किसान दुकान एक एग्रीगेटर है: एक भरोसेमंद दुकान जो कई अधिकृत स्रोतों से सामान लाती है। आप {{legalName}} से खरीदते हैं; आपके ऑर्डर, बिल, डिलीवरी और सहायता की ज़िम्मेदारी हमारी है।</p>
<h2>हमारा सामान कहाँ से आता है</h2><ul><li><strong>कंपनियाँ और उनके अधिकृत डिस्ट्रीब्यूटर</strong> – दवाइयों, खाद और बीज का मुख्य स्रोत।</li><li><strong>अधिकृत डीलर और जानी-मानी ऑनलाइन कृषि दुकानें</strong> जो कंपनियों के आधिकारिक रास्ते से खरीदती हैं।</li></ul><p>कुछ सामान हमारे पास स्टॉक रहता है और हम भेजते हैं; कुछ सामान हमारे पार्टनर के गोदाम से सीधे भेजा जाता है। दोनों में प्रोडक्ट कंपनी का वही सील बंद पैक होता है।</p>
<h2>हमारी जाँच</h2><ul><li>सिर्फ़ सील बंद पैक, जिन पर निर्माता का लेबल, बैच नंबर, बनने और एक्सपायरी की तारीख, और जहाँ कानूनन ज़रूरी हो वहाँ रजिस्ट्रेशन/लाइसेंस की जानकारी हो।</li><li>खुली, दूसरे डिब्बे में भरी, दोबारा पैक की हुई या बिना ब्रांड की दवाई कभी नहीं।</li><li>प्रतिबंधित और सीमित कीटनाशकों की सूची से हर तत्व की जाँच; ऐसे प्रोडक्ट कभी नहीं दिखाए जाते।</li><li>जहाँ ज़रूरी हो, प्रोडक्ट पेज पर डिलीवरी के समय न्यूनतम शेल्फ लाइफ लिखी जाती है।</li></ul>
<h2>हमारे लाइसेंस</h2>{{licenceBlock}}
<h2>नकली होने का शक हो तो बताएं</h2><p>अगर प्रोडक्ट में कुछ भी गड़बड़ लगे – टूटी सील, बैच की जानकारी न होना, अजीब गंध या रंग, लेबल पर गलत स्पेलिंग – तो उसे इस्तेमाल न करें। {{replacementWindowHours}} घंटे के अंदर फोटो के साथ "मेरे ऑर्डर" से रिक्वेस्ट करें, या {{supportEmail}} पर लिखें। हम सप्लायर और कंपनी के साथ जाँच करेंगे और शिकायत सही निकलने पर सामान बदलेंगे या पैसा लौटाएंगे।</p>`,
  },
  {
    slug: "safe-use-agrochemicals",
    isPolicy: true,
    sortOrder: 12,
    title_en: "Safe & Responsible Use of Agro-chemicals",
    title_hi: "दवाइयों का सुरक्षित और ज़िम्मेदार इस्तेमाल",
    summary_en: "Read the label, use the right dose, wear protective gear, keep chemicals locked away from children and food, and respect the waiting period before harvest. In case of poisoning, see a doctor immediately and take the label with you.",
    summary_hi: "लेबल पढ़ें, सही डोज़ डालें, सुरक्षा का सामान पहनें, दवाइयाँ बच्चों और खाने से दूर ताले में रखें, और कटाई से पहले वेटिंग पीरियड का ध्यान रखें। ज़हर का असर होने पर तुरंत डॉक्टर को दिखाएं और लेबल साथ ले जाएं।",
    body_en: `<h2>Before you buy</h2><ul><li>Identify the pest or disease correctly. Ask your local agriculture officer or Krishi Vigyan Kendra if unsure.</li><li>Buy only the quantity you need for the season.</li></ul>
<h2>Before spraying</h2><ul><li>Read the label and leaflet completely.</li><li>Wear gloves, a mask or respirator, goggles, a long-sleeved shirt, full trousers and boots.</li><li>Check the sprayer and nozzle for leaks.</li><li>Measure with a measuring cup – never by guess – and mix outdoors, away from wells and ponds.</li></ul>
<h2>While spraying</h2><ul><li>Spray in the early morning or evening when it is calm. Do not spray against the wind or before rain.</li><li>Do not eat, drink, smoke or chew tobacco.</li><li>Keep children, animals and other people away from the field.</li><li>Protect bees: avoid spraying open flowers during the day when bees are active.</li></ul>
<h2>After spraying</h2><ul><li>Wash your hands, face and clothes separately with soap and water.</li><li>Clean the sprayer away from water sources.</li><li>Puncture and bury or dispose of empty containers safely. Never reuse them for food, water or animal feed.</li><li>Follow the <strong>waiting period</strong> (days between last spray and harvest) on the label.</li></ul>
<h2>Storage</h2><p>Store in the original container with the label, in a cool, dry, locked place out of reach of children and away from food, feed and seed.</p>
<h2>In an emergency</h2><p>If someone feels dizzy, has a headache, nausea, breathing difficulty or skin irritation after exposure: move them to fresh air, remove contaminated clothes, wash skin with plenty of water and <strong>take them to a doctor immediately with the product label</strong>.</p>`,
    body_hi: `<h2>खरीदने से पहले</h2><ul><li>कीट या रोग की सही पहचान करें। शक हो तो कृषि अधिकारी या कृषि विज्ञान केंद्र से पूछें।</li><li>सीज़न के लिए जितनी ज़रूरत हो उतनी ही दवा खरीदें।</li></ul>
<h2>छिड़काव से पहले</h2><ul><li>लेबल और पर्चा पूरा पढ़ें।</li><li>दस्ताने, मास्क, चश्मा, पूरी बाजू की कमीज़, पूरी पैंट और जूते पहनें।</li><li>स्प्रेयर और नोज़ल में लीकेज जाँच लें।</li><li>नापने वाले कप से नापें – अंदाज़े से नहीं – और कुएं व तालाब से दूर खुले में घोल बनाएं।</li></ul>
<h2>छिड़काव के समय</h2><ul><li>सुबह जल्दी या शाम को, जब हवा शांत हो, तब स्प्रे करें। हवा के उल्टी दिशा में या बारिश से पहले स्प्रे न करें।</li><li>कुछ न खाएं, न पिएं, न बीड़ी-तंबाकू लें।</li><li>बच्चों, पशुओं और दूसरे लोगों को खेत से दूर रखें।</li><li>मधुमक्खियों को बचाएं: दिन में खुले फूलों पर, जब मधुमक्खियाँ हों, स्प्रे न करें।</li></ul>
<h2>छिड़काव के बाद</h2><ul><li>हाथ, मुँह और कपड़े साबुन-पानी से अलग धोएं।</li><li>स्प्रेयर पानी के स्रोत से दूर साफ़ करें।</li><li>खाली डिब्बे छेद करके गाड़ दें या सुरक्षित तरीके से नष्ट करें। इन्हें खाने, पानी या चारे के लिए कभी दोबारा इस्तेमाल न करें।</li><li>लेबल पर दिए <strong>वेटिंग पीरियड</strong> (आखिरी स्प्रे और कटाई के बीच के दिन) का पालन करें।</li></ul>
<h2>रखरखाव</h2><p>दवा को लेबल वाले असली डिब्बे में ही, ठंडी, सूखी, ताले वाली जगह पर, बच्चों की पहुँच से दूर और खाने, चारे व बीज से अलग रखें।</p>
<h2>आपात स्थिति में</h2><p>अगर दवा के संपर्क के बाद किसी को चक्कर, सिरदर्द, उल्टी जैसा मन, सांस में तकलीफ़ या त्वचा में जलन हो: उसे खुली हवा में ले जाएं, दवा लगे कपड़े उतारें, त्वचा को खूब पानी से धोएं और <strong>प्रोडक्ट का लेबल लेकर तुरंत डॉक्टर के पास जाएं</strong>।</p>`,
  },
  {
    slug: "about-us",
    isPolicy: false,
    sortOrder: 0,
    title_en: "About KissanDukkan",
    title_hi: "किसान दुकान के बारे में",
    summary_en: "KissanDukkan (किसान दुकान) is one trusted online shop for every farm need – genuine branded inputs from authorised sources, fair prices that never cross MRP, and help in Hindi and English.",
    summary_hi: "किसान दुकान खेती की हर ज़रूरत के लिए एक भरोसेमंद ऑनलाइन दुकान है – अधिकृत स्रोतों से असली ब्रांडेड सामान, MRP से कभी ज़्यादा नहीं ऐसे सही दाम, और हिंदी व अंग्रेज़ी में मदद।",
    body_en: `<h2>Why we started</h2><p>Buying agri-inputs often means visiting several shops, comparing prices that change from village to village, and wondering whether a pack is genuine. Online, the choice is wide but scattered across many sellers. KissanDukkan brings it together: one shop, one order, one point of help.</p>
<h2>How we work</h2><p>We are an aggregator. We source sealed, branded seeds, fertilizers, crop protection products, irrigation equipment, tools and gardening supplies from authorised suppliers, distributors and brands. Some products we stock and ship ourselves; others are shipped directly from our sourcing partner's warehouse so they reach you faster and at lower cost. Whichever route an item takes, you buy from us, you get one GST invoice from us, and we look after delivery, replacement and support.</p>
<h2>What we promise</h2><ul><li><strong>Genuine products only</strong> – sealed packs, with batch and expiry printed by the manufacturer.</li><li><strong>Fair prices</strong> – never above MRP, with discounts shown honestly.</li><li><strong>Clear information</strong> – technical content, dose, safety and manufacturer details on every product, in Hindi and English.</li><li><strong>No fake reviews</strong> – only customers who received a product can review it.</li></ul>
<p>{{parentCompanySentence}}</p>
<h2>Who we are</h2>{{entityBlock}}{{licenceBlock}}
<h2>Talk to us</h2>{{contactBlock}}`,
    body_hi: `<h2>हमने शुरुआत क्यों की</h2><p>कृषि सामान खरीदने के लिए अक्सर कई दुकानों पर जाना पड़ता है, हर गाँव में अलग दाम मिलते हैं, और यह शक रहता है कि पैक असली है या नहीं। ऑनलाइन बहुत विकल्प हैं, पर कई विक्रेताओं में बिखरे हुए। किसान दुकान इन्हें एक जगह लाती है: एक दुकान, एक ऑर्डर, एक जगह से मदद।</p>
<h2>हम कैसे काम करते हैं</h2><p>हम एक एग्रीगेटर हैं। हम सील बंद, ब्रांडेड बीज, खाद, दवाइयाँ, सिंचाई का सामान, औज़ार और बागवानी का सामान अधिकृत सप्लायर, डिस्ट्रीब्यूटर और कंपनियों से लेते हैं। कुछ सामान हम स्टॉक रखकर खुद भेजते हैं; कुछ सामान हमारे पार्टनर के गोदाम से सीधे भेजा जाता है ताकि जल्दी और कम खर्च में पहुँचे। सामान किसी भी रास्ते से आए, आप हमसे खरीदते हैं, आपको हमारा एक GST बिल मिलता है, और डिलीवरी, बदली और सहायता हम संभालते हैं।</p>
<h2>हमारा वादा</h2><ul><li><strong>सिर्फ़ असली सामान</strong> – सील बंद पैक, निर्माता का छापा हुआ बैच और एक्सपायरी।</li><li><strong>सही दाम</strong> – कभी MRP से ज़्यादा नहीं, छूट ईमानदारी से दिखाई जाती है।</li><li><strong>साफ़ जानकारी</strong> – हर प्रोडक्ट पर तकनीकी तत्व, डोज़, सावधानियाँ और निर्माता की जानकारी, हिंदी और अंग्रेज़ी में।</li><li><strong>कोई नकली रिव्यू नहीं</strong> – सिर्फ़ वही ग्राहक रिव्यू दे सकते हैं जिन्हें प्रोडक्ट मिल चुका है।</li></ul>
<p>{{parentCompanySentence}}</p>
<h2>हम कौन हैं</h2>{{entityBlock}}{{licenceBlock}}
<h2>हमसे बात करें</h2>{{contactBlock}}`,
  },
];
