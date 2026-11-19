/** Default transactional email templates (EN + HI). Editable in Admin → Email templates. */
export type TemplateKey =
  | "order_confirmation"
  | "shipped"
  | "delivered"
  | "review_request"
  | "password_reset"
  | "contact_notification";

export const defaultTemplates: Record<TemplateKey, { en: { subject: string; body: string }; hi: { subject: string; body: string } }> = {
  order_confirmation: {
    en: {
      subject: "Order {{orderNumber}} confirmed – thank you!",
      body: `<p>Namaste {{name}},</p><p>We have received your payment and your order <strong>{{orderNumber}}</strong> is confirmed.</p>{{items}}<p><strong>Total paid: {{total}}</strong></p><p>Estimated delivery: {{eta}}. We will email you again when your items are shipped.</p><p>Track your order any time: <a href="{{trackUrl}}">{{trackUrl}}</a></p>`,
    },
    hi: {
      subject: "ऑर्डर {{orderNumber}} कन्फर्म हो गया – धन्यवाद!",
      body: `<p>नमस्ते {{name}} जी,</p><p>आपका पेमेंट मिल गया है और आपका ऑर्डर <strong>{{orderNumber}}</strong> कन्फर्म हो गया है।</p>{{items}}<p><strong>कुल भुगतान: {{total}}</strong></p><p>अनुमानित डिलीवरी: {{eta}}। सामान भेजते ही हम आपको फिर से ईमेल करेंगे।</p><p>अपना ऑर्डर यहाँ ट्रैक करें: <a href="{{trackUrl}}">{{trackUrl}}</a></p>`,
    },
  },
  shipped: {
    en: {
      subject: "Your order {{orderNumber}} has been shipped",
      body: `<p>Namaste {{name}},</p><p>Good news! Items from your order <strong>{{orderNumber}}</strong> are on the way.</p>{{items}}<p>Courier: {{courier}}<br/>Tracking number (AWB): {{awb}}</p><p>Track here: <a href="{{trackUrl}}">{{trackUrl}}</a></p>`,
    },
    hi: {
      subject: "आपका ऑर्डर {{orderNumber}} भेज दिया गया है",
      body: `<p>नमस्ते {{name}} जी,</p><p>खुशखबरी! आपके ऑर्डर <strong>{{orderNumber}}</strong> का सामान रास्ते में है।</p>{{items}}<p>कूरियर: {{courier}}<br/>ट्रैकिंग नंबर (AWB): {{awb}}</p><p>यहाँ ट्रैक करें: <a href="{{trackUrl}}">{{trackUrl}}</a></p>`,
    },
  },
  delivered: {
    en: {
      subject: "Order {{orderNumber}} delivered",
      body: `<p>Namaste {{name}},</p><p>Your order <strong>{{orderNumber}}</strong> has been delivered. Please check the items soon. If anything is damaged, wrong or expired, report it within {{windowHours}} hours from My Orders with photos or an unboxing video.</p><p>Always read the label and leaflet before use.</p>`,
    },
    hi: {
      subject: "ऑर्डर {{orderNumber}} डिलीवर हो गया",
      body: `<p>नमस्ते {{name}} जी,</p><p>आपका ऑर्डर <strong>{{orderNumber}}</strong> डिलीवर हो गया है। कृपया सामान जल्दी जाँच लें। अगर कोई सामान टूटा हुआ, गलत या एक्सपायर्ड है, तो {{windowHours}} घंटे के अंदर "मेरे ऑर्डर" में फोटो या अनबॉक्सिंग वीडियो के साथ बताएं।</p><p>इस्तेमाल से पहले लेबल और पर्चा ज़रूर पढ़ें।</p>`,
    },
  },
  review_request: {
    en: {
      subject: "How did {{productName}} work for you?",
      body: `<p>Namaste {{name}},</p><p>It has been a few days since your order {{orderNumber}} was delivered. Your honest review helps other farmers choose the right product.</p><p><a href="{{reviewUrl}}" style="display:inline-block;background:#1E6B3A;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none">Write a review</a></p>`,
    },
    hi: {
      subject: "{{productName}} आपके खेत में कैसा रहा?",
      body: `<p>नमस्ते {{name}} जी,</p><p>आपका ऑर्डर {{orderNumber}} कुछ दिन पहले डिलीवर हुआ था। आपकी सच्ची राय दूसरे किसान भाइयों को सही प्रोडक्ट चुनने में मदद करती है।</p><p><a href="{{reviewUrl}}" style="display:inline-block;background:#1E6B3A;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none">रिव्यू लिखें</a></p>`,
    },
  },
  password_reset: {
    en: {
      subject: "Reset your KissanDukkan password",
      body: `<p>Namaste {{name}},</p><p>We received a request to reset your password. This link is valid for 30 minutes:</p><p><a href="{{resetUrl}}">{{resetUrl}}</a></p><p>If you did not ask for this, you can ignore this email. Your password will not change.</p>`,
    },
    hi: {
      subject: "अपना KissanDukkan पासवर्ड बदलें",
      body: `<p>नमस्ते {{name}} जी,</p><p>आपने पासवर्ड बदलने की रिक्वेस्ट की है। यह लिंक 30 मिनट तक चलेगा:</p><p><a href="{{resetUrl}}">{{resetUrl}}</a></p><p>अगर यह रिक्वेस्ट आपने नहीं की, तो इस ईमेल को अनदेखा करें। आपका पासवर्ड नहीं बदलेगा।</p>`,
    },
  },
  contact_notification: {
    en: {
      subject: "New {{kind}} message: {{subject}}",
      body: `<p><strong>From:</strong> {{name}} ({{email}}) {{phone}}</p><p><strong>Subject:</strong> {{subject}}</p><p>{{message}}</p><p>Open the admin inbox to reply.</p>`,
    },
    hi: {
      subject: "नया {{kind}} संदेश: {{subject}}",
      body: `<p><strong>भेजने वाले:</strong> {{name}} ({{email}}) {{phone}}</p><p><strong>विषय:</strong> {{subject}}</p><p>{{message}}</p>`,
    },
  },
};
