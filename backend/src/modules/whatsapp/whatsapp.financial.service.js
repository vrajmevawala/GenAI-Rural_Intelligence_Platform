/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * KhedutMitra WhatsApp Bot — FINANCIAL QUESTIONS MODULE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Provides static financial Q&A for farmers about:
 * - Banking & loans (KCC, term loans, interest rates)
 * - OTP & security (online banking safety)
 * - Digital payments & UPI
 * - Government schemes & subsidies
 */

const { pool } = require('../../config/db');
const logger = require('../../utils/logger');

/**
 * FINANCIAL QUESTIONS DATABASE - Static content for financial literacy
 * Organized by category with Gujarati, Hindi, and English translations
 */
const FINANCIAL_QA_BANK = [
  {
    id: '1',
    category: 'banking',
    question_gu: '1️⃣ KCC શું છે અને તેના ફાયદા શું છે?',
    answer_gu: 'KCC (Kisan Credit Card) એક સરકારી લોન યોજના છે.\n✅ ખેતી માટે ₹40,000 સુધી મળે છે\n✅ 4% વ્યાજ દર\n✅ 7 વર્ષના લિયાકત\n→ બેંક શાખામાં આધાર અને જમીનપુરાવા સાથે આવો',
    question_hi: '1️⃣ KCC क्या है और इसके फायदे क्या हैं?',
    answer_hi: 'KCC (Kisan Credit Card) एक सरकारी ऋण योजना है।\n✅ खेती के लिए ₹40,000 तक मिलता है\n✅ 4% ब्याज दर\n✅ 7 साल की अवधि\n→ आधार और भूमि प्रमाण के साथ बैंक शाखा जाएं',
    question_en: '1️⃣ What is KCC and its benefits?',
    answer_en: 'KCC (Kisan Credit Card) is a government loan scheme.\n✅ Up to ₹40,000 for farming\n✅ 4% interest rate\n✅ 7-year tenure\n→ Visit bank with Aadhaar and land proof'
  },
  {
    id: '2',
    category: 'banking',
    question_gu: '2️⃣ વર્તમાન સમયે KCC વ્યાજ દર કેટલો છે?',
    answer_gu: 'KCC વ્યાજ દર 2024 માં:\n📊 સામાન્ય કર્જો: 4%-7% (બેંક પર આધાર)\n📊 હવે PMFBY વીમો સાથે જોડાયેલું છે\n💡 આતો બેંક શાખામાં ચકાસો (દર માસે બદલાય છે)\n→ 0 લખો મેનુ માટે | 6 આધિકારી માટે',
    answer_hi: 'KCC ब्याज दर 2024 में:\n📊 सामान्य ऋण: 4%-7% (बैंक पर निर्भर)\n📊 अब PMFBY बीमा से जुड़ा है\n💡 सटीक दर के लिए शाखा से जांच करें (हर महीने बदलता है)\n→ 0 menu के लिए | 6 अधिकारी के लिए',
    answer_en: 'KCC interest rates in 2024:\n📊 General loans: 4%-7% (depends on bank)\n📊 Now linked to PMFBY insurance\n💡 Check with bank for exact rates (changes monthly)\n→ 0 for menu | 6 for officer'
  },
  {
    id: '3',
    category: 'banking',
    question_gu: '3️⃣ મારું બેંક અકાઉન્ટ કેવી રીતે Aadhaar સાથે લિંક કરું?',
    answer_gu: 'Aadhaar અને Bank লিंक કરવા:\n📱 आधार नंबर याद रखो\n🏦 બેંક શાખામાં જાવ અથવા Mobile App વાપર કર\n📋 Form જમા કર (KYC ફોર્મ)\n⏱️ 2-3 દિવસમાં link થઈ જાય છે\n💡 Successful link થયું તો SMS મળશે',
    answer_hi: 'Aadhaar और Bank को लिंक करने के लिए:\n📱 आधार नंबर याद रखो\n🏦 बैंक शाखा जाओ या Mobile App use करो\n📋 फॉर्म जमा करो (KYC फॉर्म)\n⏱️ 2-3 दिनों में link हो जाता है\n💡 सफल लिंकिंग पर SMS मिलेगा',
    answer_en: 'To link Aadhaar with Bank:\n📱 Keep Aadhaar number ready\n🏦 Visit bank branch OR use Mobile App\n📋 Submit form (KYC form)\n⏱️ Links in 2-3 days\n💡 You will get SMS on successful linking'
  },
  {
    id: '4',
    category: 'otp_security',
    question_gu: '4️⃣ OTP શું છે અને તે કેવી રીતે સુરક્ષિત રાખવું?',
    answer_gu: 'OTP = One Time Password (એક વાર વપરાય એવો કોડ)\n🔒 હંમેશા પાસવર્ડ જેવો છે - કોણે પણ મત આપો!\n🔒 Bank તુમને ક્યારે OTP માંગશે:\n   ✅ અનલાઇન લોગઇન\n   ✅ Money Transfer\n   ✅ Card Activation\n⚠️ IMPORTANT: Bank કર્મચારીને OTP આપશો નહી!\n→ જો કોણે OTP માંગે તો બેંક કોલ કર',
    answer_hi: 'OTP = One Time Password (एक बार use होने वाला कोड)\n🔒 हमेशा पासवर्ड जैसा है - किसी को न दो!\n🔒 बैंक तुम्हें कब OTP मांगेगा:\n   ✅ ऑनलाइन login\n   ✅ पैसे भेजना\n   ✅ Card सक्रिय करना\n⚠️ महत्वपूर्ण: Bank कर्मचारी को OTP न दो!\n→ अगर कोई OTP मांगे तो बैंक को कॉल करो',
    answer_en: 'OTP = One Time Password (code used once only)\n🔒 Like a password - NEVER share it!\n🔒 Bank asks OTP when you:\n   ✅ Login online\n   ✅ Send money\n   ✅ Activate card\n⚠️ IMPORTANT: NEVER give OTP to bank staff!\n→ If anyone asks, call your bank immediately'
  },
  {
    id: '5',
    category: 'otp_security',
    question_gu: '5️⃣ બેંક જતી વખતે મોબાઇલ બેંકિંગ કેવી રીતે શરુ કરું?',
    answer_gu: 'Mobile Banking માટે વિધિ:\n1️⃣ આપનો બેંક App ડાઉનલોડ કર (Google Play)\n2️⃣ એપમાં Login કરવા માટે તમારું Account Number વાપર\n3️⃣ OTP મળશે - તે વાપર પહેલો વાર\n4️⃣ નવું પાસવર્ડ બનાવ (અને યાદ રાખ)\n💡 હવે તું ઘરેથી પैસા ટ્રાન્સ્ફર કરી સક્યો!\n⚠️ Device Safe રાખ - જરુરી બેકআપ ફોટો નાખ',
    answer_hi: 'Mobile Banking शुरू करने के steps:\n1️⃣ अपने बैंक का App डाउनलोड करो (Google Play)\n2️⃣ App में login करने के लिए Account Number use करो\n3️⃣ OTP आएगा - उसे पहली बार use करो\n4️⃣ नया पासवर्ड बनाओ (और याद रखो)\n💡 अब तुम घर से पैसे transfer कर सकते हो!\n⚠️ Device safe रखो - जरूरी backup photo रखो',
    answer_en: 'Steps to start Mobile Banking:\n1️⃣ Download your bank\'s App (Google Play)\n2️⃣ Login with your Account Number\n3️⃣ OTP arrives - use it first time\n4️⃣ Create a new password (remember it)\n💡 Now you can transfer money from home!\n⚠️ Keep device safe - store important photos'
  },
  {
    id: '6',
    category: 'digital_payments',
    question_gu: '6️⃣ UPI શું છે અને તેનો ઉપયોગ કેવું?',
    answer_gu: 'UPI = Unified Payments Interface (આધુનિક પેમેન્ટ)\n✅ Google Pay, PhonePe, Paytm વાપર કરી શકો\n✅ QR Code સ્કેન કરીને ફટાફટ પેમેન્ટ કરો\n✅ Bank Transfer વિના SMS OTP નથી\n💡 થાણું: UPI ID બે માનીશે - નામ અને મોબાઈલ\n⚠️ PIN જાણવો જોઇતો - બીજાને આપશો નહી!\n→ સમસ્યા માટે 6 ટાઈપ કર',
    answer_hi: 'UPI = Unified Payments Interface (आधुनिक भुगतान)\n✅ Google Pay, PhonePe, Paytm use कर सकते हो\n✅ QR Code scan करके जल्दी पेमेंट करो\n✅ Bank Transfer के बिना SMS OTP नहीं\n💡 याद रखो: UPI ID में नाम और मोबाइल दोनों होते हैं\n⚠️ PIN जान लो - किसी को न दे!\n→ समस्या के लिए 6 type करो',
    answer_en: 'UPI = Unified Payments Interface (modern payment)\n✅ Use Google Pay, PhonePe, Paytm\n✅ Scan QR code for quick payment\n✅ No bank transfer SMS OTP needed\n💡 Remember: UPI ID has name + mobile\n⚠️ Protect your PIN - never share!\n→ For problems type 6'
  },
  {
    id: '7',
    category: 'subsidies',
    question_gu: '7️⃣ સુબસિડી કેવી રીતે મળે?',
    answer_gu: 'ખેતી સુબસિડી મેળવવા:\n1️⃣ ગુજરાત પોર્ટલ પર નોંધણી કર (eGov)\n2️⃣ જમીન દસ્તાવેજ (7/12) અપલોડ કર\n3️⃣ Soil Health Card બનાવ (FREE)\n4️⃣ પાક વીમો PMFBY માર્ગે લો\n📊 વર્તમાન સુબસિડી (2024):\n   • બીજ: 50% સુધી\n   • સર: 25% સુધી\n   • Tool: ₹1000-5000\n→ CSC કેન્દ્રે મદદ લો (Free)',
    answer_hi: 'कृषि subsidy पाने के लिए:\n1️⃣ Gujarat portal पर रजिस्ट्रेशन करो (eGov)\n2️⃣ जमीन दस्तावेज (7/12) upload करो\n3️⃣ Soil Health Card बनवाओ (FREE)\n4️⃣ फसल बीमा PMFBY से लो\n📊 मौजूदा subsidy (2024):\n   • बीज: 50% तक\n   • खाद: 25% तक\n   • उपकरण: ₹1000-5000\n→ CSC center में मदद लो (Free)',
    answer_en: 'To get agricultural subsidy:\n1️⃣ Register on Gujarat portal (eGov)\n2️⃣ Upload land document (7/12)\n3️⃣ Get Soil Health Card (FREE)\n4️⃣ Get crop insurance via PMFBY\n📊 Current subsidy (2024):\n   • Seeds: up to 50%\n   • Fertilizer: up to 25%\n   • Tools: ₹1000-5000\n→ Get help at CSC center (Free)'
  },
  {
    id: '8',
    category: 'loans',
    question_gu: '8️⃣ જો લોન ચૂકવવું વીસરું તો શું થાય?',
    answer_gu: 'લોન ચૂકવણીમાં વીસરણી કરતાં:\n⚠️ વધારાનો વ્યાજ લાગે (Penalty Interest)\n⚠️ તમારો Credit Score ઘટશે\n⚠️ આગલી લોન મેળવવો મુશ્કેલ થશે\n⚠️ બેંક તમને Warning & Notice આપશે\n💡 અગર લોન ચૂકવતું નથી?\n   • બેંકને તોતી જણાવ\n   • EMI ફેરે તૂટ્ટવા માટે કહ\n   • Government વિશેષ યોજના છે\n→ ડર બે નહિ - બેંક શાખામાં રહેશ વાત કર',
    answer_hi: 'ऋण भुगतान में देरी करने पर:\n⚠️ अतिरिक्त ब्याज लगेगा (Penalty Interest)\n⚠️ आपका Credit Score घटेगा\n⚠️ अगला loan लेना मुश्किल होगा\n⚠️ बैंक आपको Warning & Notice देगा\n💡 अगर loan चुकता नहीं कर पा रहे?\n   • बैंक को बताओ\n   • EMI कम करने के लिए कहो\n   • सरकारी special scheme है\n→ डरो मत - बैंक शाखा में खुलकर बात करो',
    answer_en: 'If you delay loan payment:\n⚠️ Extra interest charged (Penalty Interest)\n⚠️ Your Credit Score will drop\n⚠️ Getting next loan becomes difficult\n⚠️ Bank will send Warning & Notice\n💡 If you cannot pay loan?\n   • Tell your bank\n   • Ask for lower EMI\n   • Gov has special schemes\n→ Don\'t worry - talk openly at bank'
  },
  {
    id: '9',
    category: 'banking',
    question_gu: '9️⃣ મારું બેંક અકાઉન્ટ માટે મિનિમમ બેલેન્સ કેટલો?',
    answer_gu: 'બેંક અકાઉન્ટ મિનિમમ બેલેન્સ (2024):\n💰 Savings Account: ₹100-500\n💰 Zero Balance (PMJDY): ₹0 (FREE)\n💰 Current Account: ₹2500-10000\n⚠️ અગર બેલેન્સ ઘટે તો Penalty ચાર્જ!\n💡 Sol: Zero Balance Account ખોલ\n   • Government Scheme (PMJDY)\n   • કોણે ખર્ચ નથી\n   • Debit Card મિલશે\n→ બેંક શાખામાં પુછી લે',
    answer_hi: 'बैंक खाता न्यूनतम balance (2024):\n💰 Savings Account: ₹100-500\n💰 Zero Balance (PMJDY): ₹0 (FREE)\n💰 Current Account: ₹2500-10000\n⚠️ अगर balance कम हो तो Penalty charge!\n💡 समाधान: Zero Balance खाता खोलो\n   • सरकारी स्कीम (PMJDY)\n   • कोई खर्च नहीं\n   • Debit Card मिलेगा\n→ बैंक शाखा से पूछ लो',
    answer_en: 'Bank account minimum balance (2024):\n💰 Savings Account: ₹100-500\n💰 Zero Balance (PMJDY): ₹0 (FREE)\n💰 Current Account: ₹2500-10000\n⚠️ If balance drops, Penalty charged!\n💡 Solution: Open Zero Balance account\n   • Gov scheme (PMJDY)\n   • No charges\n   • Get Debit Card\n→ Ask at bank branch'
  },
  {
    id: '10',
    category: 'insurance',
    question_gu: '🔟 PMFBY વીમો વિશે વધુ માહિતી?',
    answer_gu: 'PMFBY (Pradhan Mantri Fasal Bima Yojana):\n✅ FREE પાક વીમો ખેતર માટે\n✅ પાક નુકશાન હોય તો ₹1 Lakh સુધી\n✅ વર્ષે આવશ્યક નોંધણી કર\n✅ Kharif: Jun-31 Jul (જૂન-જુલાઈ)\n✅ Rabi: Dec-31 Jan (ડિસ-જાન)\n📋 જરુરી કાગળ:\n   • આધાર, બેંક પાસબુક\n   • 7/12 (જમીન પુરાવો)\n   • પાક તસવીર\n→ Ban in CSC કેંદ્ર (FREE help)',
    answer_hi: 'PMFBY (Pradhan Mantri Fasal Bima Yojana):\n✅ FREE फसल बीमा खेती के लिए\n✅ फसल नुकसान हो तो ₹1 Lakh तक\n✅ हर साल रजिस्ट्रेशन जरूरी\n✅ Kharif: 31 जून - 31 जुलाई\n✅ Rabi: 31 दिसंबर - 31 जनवरी\n📋 जरूरी दस्तावेज:\n   • आधार, बैंक पासबुक\n   • 7/12 (भूमि प्रमाण)\n   • फसल की तस्वीर\n→ CSC center में नामांकन करो (FREE help)',
    answer_en: 'PMFBY (Pradhan Mantri Fasal Bima Yojana):\n✅ FREE crop insurance for farming\n✅ Up to ₹1 Lakh if crop fails\n✅ Register every year\n✅ Kharif: June 31 - July 31\n✅ Rabi: Dec 31 - Jan 31\n📋 Required documents:\n   • Aadhaar, bank passbook\n   • 7/12 (land proof)\n   • Crop photo\n→ Register at CSC center (FREE help)'
  }
];

/**
 * SEND FINANCIAL MENU
 * Lists all financial questions available for farmer
 */
async function generateFinancialMenu(language = 'gu') {
  // Create clean menu text with plain numbers (no emojis) based on question titles
  const questionsGu = FINANCIAL_QA_BANK.map((q, i) => {
    const num = i + 1;
    // Extract question text without emoji - remove any emoji or number prefix
    let cleanQ = String(q.question_gu || '').trim();
    // Remove emoji prefixes like "🔟 " or "1️⃣ " or just "1 "
    cleanQ = cleanQ.replace(/^[\d\uFE0F\u20E3🔟🔞\s️⃣]*\s*/, '').trim();
    return `${num}. ${cleanQ}`;
  });
  const questionsHi = FINANCIAL_QA_BANK.map((q, i) => {
    const num = i + 1;
    let cleanQ = String(q.question_hi || '').trim();
    cleanQ = cleanQ.replace(/^[\d\uFE0F\u20E3🔟🔞\s️⃣]*\s*/, '').trim();
    return `${num}. ${cleanQ}`;
  });
  const questionsEn = FINANCIAL_QA_BANK.map((q, i) => {
    const num = i + 1;
    let cleanQ = String(q.question_en || '').trim();
    cleanQ = cleanQ.replace(/^[\d\uFE0F\u20E3🔟🔞\s️⃣]*\s*/, '').trim();
    return `${num}. ${cleanQ}`;
  });

  const menus = {
    gu: `📚 આર્થિક પ્રશ્નો (Financial Questions):\n\n${questionsGu.join('\n')}\n\n0 મુખ્ય મેનુ`,
    hi: `📚 वित्तीय प्रश्न (Financial Questions):\n\n${questionsHi.join('\n')}\n\n0 मुख्य मेनू`,
    en: `📚 Financial Questions:\n\n${questionsEn.join('\n')}\n\n0 Main Menu`
  };

  return menus[language] || menus.gu;
}

/**
 * GET FINANCIAL ANSWER BY QUESTION NUMBER
 * Returns the answer to a specific question (1-10)
 */
function getFinancialAnswer(questionNumber, language = 'gu') {
  const num = parseInt(String(questionNumber).trim());
  if (isNaN(num) || num < 1 || num > FINANCIAL_QA_BANK.length) {
    const messages = {
      gu: `❌ પ્રશ્ન #${questionNumber} મળ્યો નથી. 1-10 વચ્ચે પ્રશ્ન પણ (0 મેનુ માટે).`,
      hi: `❌ प्रश्न #${questionNumber} नहीं मिला। 1-10 के बीच पूछो (0 मेनू के लिए)।`,
      en: `❌ Question #${questionNumber} not found. Ask between 1-10 (0 for menu).`
    };
    return messages[language] || messages.gu;
  }

  const question = FINANCIAL_QA_BANK.find(q => q.id === String(num));
  if (!question) {
    const messages = {
      gu: `❌ આ પ્રશ્ન હાલમાં લોડ થયું નથી.`,
      hi: `❌ यह प्रश्न अभी उपलब्ध नहीं है।`,
      en: `❌ This question is not available.`
    };
    return messages[language] || messages.gu;
  }

  const answerKey = `answer_${language === 'hi' ? 'hi' : language === 'en' ? 'en' : 'gu'}`;
  return question[answerKey] || question.answer_gu;
}

/**
 * HANDLE FINANCIAL QUESTION FLOW
 * Called when farmer selects option 7 from main menu
 */
async function handleFinancialFlow(conv, input, language) {
  const lang = language || conv.language || 'gu';

  // If no input yet, show menu of questions
  if (!input) {
    const menu = await generateFinancialMenu(lang);
    return {
      message: menu,
      nextStage: 'financial_flow'
    };
  }

  // User selected a question (1-10)
  const answer = getFinancialAnswer(input, lang);
  
  // Add follow-up options
  const followups = {
    gu: '\n\n0️ મુખ્ય મેનુ | 7️ વધુ પ્રશ્નો',
    hi: '\n\n0️ मुख्य मेनू | 7️ और प्रश्न',
    en: '\n\n0️ Main Menu | 7️ More Questions'
  };

  const fullMessage = answer + (followups[lang] || followups.gu);

  // Save to context that farmer viewed this question
  await saveFinancialQuestionViewed(conv.id, input, lang);

  return {
    message: fullMessage,
    nextStage: 'financial_flow'
  };
}

/**
 * SAVE FINANCIAL QUESTION VIEWED (for analytics)
 */
async function saveFinancialQuestionViewed(conversationId, questionNumber, language) {
  try {
    await pool.query(
      `UPDATE whatsapp_conversations 
       SET context = context || $1::jsonb,
           updated_at = NOW()
       WHERE id = $2`,
      [
        JSON.stringify({
          last_financial_question: String(questionNumber),
          financial_language: language,
          financial_question_time: new Date().toISOString()
        }),
        conversationId
      ]
    );
  } catch (err) {
    logger.warn('Failed to save financial question view', {
      conversationId,
      questionNumber,
      error: err.message
    });
  }
}

module.exports = {
  generateFinancialMenu,
  getFinancialAnswer,
  handleFinancialFlow,
  saveFinancialQuestionViewed,
  FINANCIAL_QA_BANK
};
