// add_myappointments_keys.js
// Merges the "myAppointments" namespace into all 10 locale JSON files.
// Run from: frontend/  ->  node add_myappointments_keys.js

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, 'src', 'i18n', 'locales');

const newKeys = {
  en: {
    myAppointments: {
      title: "My Appointments",
      subtitle: "Manage all your bookings",
      live: "Live",
      bookNew: "+ Book New",
      emptyTitle: "No appointments yet",
      emptySubtitle: "Book your first appointment with a doctor",
      findDoctor: "Find a Doctor",
      upcoming: "Upcoming",
      pastAndCancelled: "Past & Cancelled",
      joinLiveQueue: "Join Live Queue",
      reschedule: "Reschedule",
      awaitingApproval: "Awaiting approval",
      status: {
        confirmed: "confirmed",
        cancelled: "cancelled",
        completed: "completed",
        pending: "pending"
      },
      modal: {
        title: "Reschedule Appointment",
        warningText: "Rescheduling resets your appointment to pending. A rescheduling fee may be deducted by the clinic.",
        currentlyLabel: "Currently:",
        newDateLabel: "New Date",
        newTimeLabel: "New Time Slot",
        confirmReschedule: "📅 Confirm Reschedule",
        rescheduling: "Rescheduling..."
      },
      toast: {
        confirmed: "Your appointment with {{doctor}} has been confirmed! 🎉",
        cancelledByClinic: "Your appointment with {{doctor}} was cancelled by the clinic.",
        rescheduled: "Appointment rescheduled to {{date}} at {{time}}. A rescheduling fee may apply.",
        rescheduleFailed: "Failed to reschedule. Please try again.",
        defaultDoctor: "your doctor"
      }
    }
  },
  hi: {
    myAppointments: {
      title: "मेरी अपॉइंटमेंट",
      subtitle: "अपनी सभी बुकिंग प्रबंधित करें",
      live: "लाइव",
      bookNew: "+ नई बुक करें",
      emptyTitle: "अभी तक कोई अपॉइंटमेंट नहीं",
      emptySubtitle: "किसी डॉक्टर के साथ अपनी पहली अपॉइंटमेंट बुक करें",
      findDoctor: "डॉक्टर खोजें",
      upcoming: "आगामी",
      pastAndCancelled: "पिछली और रद्द",
      joinLiveQueue: "लाइव कतार में शामिल हों",
      reschedule: "पुनर्निर्धारित करें",
      awaitingApproval: "स्वीकृति की प्रतीक्षा है",
      status: {
        confirmed: "पुष्ट",
        cancelled: "रद्द",
        completed: "पूर्ण",
        pending: "लंबित"
      },
      modal: {
        title: "अपॉइंटमेंट पुनर्निर्धारित करें",
        warningText: "पुनर्निर्धारण आपकी अपॉइंटमेंट को लंबित स्थिति में रीसेट कर देता है। क्लिनिक द्वारा पुनर्निर्धारण शुल्क काटा जा सकता है।",
        currentlyLabel: "वर्तमान में:",
        newDateLabel: "नई तारीख",
        newTimeLabel: "नया समय स्लॉट",
        confirmReschedule: "📅 पुनर्निर्धारण की पुष्टि करें",
        rescheduling: "पुनर्निर्धारित किया जा रहा है..."
      },
      toast: {
        confirmed: "{{doctor}} के साथ आपकी अपॉइंटमेंट की पुष्टि हो गई है! 🎉",
        cancelledByClinic: "{{doctor}} के साथ आपकी अपॉइंटमेंट क्लिनिक द्वारा रद्द कर दी गई थी।",
        rescheduled: "अपॉइंटमेंट {{date}} को {{time}} बजे के लिए पुनर्निर्धारित की गई। पुनर्निर्धारण शुल्क लागू हो सकता है।",
        rescheduleFailed: "पुनर्निर्धारण विफल रहा। कृपया फिर से प्रयास करें।",
        defaultDoctor: "आपके डॉक्टर"
      }
    }
  },
  mr: {
    myAppointments: {
      title: "माझ्या अपॉइंटमेंट्स",
      subtitle: "तुमच्या सर्व बुकिंग्स व्यवस्थापित करा",
      live: "थेट",
      bookNew: "+ नवीन बुक करा",
      emptyTitle: "अद्याप कोणतीही अपॉइंटमेंट नाही",
      emptySubtitle: "डॉक्टरांसोबत तुमची पहिली अपॉइंटमेंट बुक करा",
      findDoctor: "डॉक्टर शोधा",
      upcoming: "आगामी",
      pastAndCancelled: "मागील आणि रद्द केलेल्या",
      joinLiveQueue: "थेट रांगेत सामील व्हा",
      reschedule: "पुनर्नियोजित करा",
      awaitingApproval: "मंजुरीची प्रतीक्षा आहे",
      status: {
        confirmed: "पुष्टी झाली",
        cancelled: "रद्द",
        completed: "पूर्ण",
        pending: "प्रलंबित"
      },
      modal: {
        title: "अपॉइंटमेंट पुनर्नियोजित करा",
        warningText: "पुनर्नियोजन तुमची अपॉइंटमेंट प्रलंबित स्थितीत रीसेट करते. क्लिनिककडून पुनर्नियोजन शुल्क आकारले जाऊ शकते.",
        currentlyLabel: "सध्या:",
        newDateLabel: "नवीन तारीख",
        newTimeLabel: "नवीन वेळ स्लॉट",
        confirmReschedule: "📅 पुनर्नियोजनाची पुष्टी करा",
        rescheduling: "पुनर्नियोजित करत आहे..."
      },
      toast: {
        confirmed: "{{doctor}} सोबतची तुमची अपॉइंटमेंट पुष्ट झाली आहे! 🎉",
        cancelledByClinic: "{{doctor}} सोबतची तुमची अपॉइंटमेंट क्लिनिकने रद्द केली होती.",
        rescheduled: "अपॉइंटमेंट {{date}} रोजी {{time}} वाजता पुनर्नियोजित केली. पुनर्नियोजन शुल्क लागू होऊ शकते.",
        rescheduleFailed: "पुनर्नियोजन अयशस्वी झाले. कृपया पुन्हा प्रयत्न करा.",
        defaultDoctor: "तुमचे डॉक्टर"
      }
    }
  },
  ta: {
    myAppointments: {
      title: "எனது சந்திப்புகள்",
      subtitle: "உங்கள் அனைத்து முன்பதிவுகளையும் நிர்வகிக்கவும்",
      live: "நேரடி",
      bookNew: "+ புதியதை முன்பதிவு செய்யவும்",
      emptyTitle: "இன்னும் சந்திப்புகள் இல்லை",
      emptySubtitle: "ஒரு மருத்துவருடன் உங்கள் முதல் சந்திப்பை முன்பதிவு செய்யுங்கள்",
      findDoctor: "மருத்துவரைக் கண்டறியவும்",
      upcoming: "வரவிருக்கும்",
      pastAndCancelled: "கடந்த மற்றும் ரத்து செய்யப்பட்டவை",
      joinLiveQueue: "நேரடி வரிசையில் சேரவும்",
      reschedule: "மறு திட்டமிடல்",
      awaitingApproval: "ஒப்புதலுக்காக காத்திருக்கிறது",
      status: {
        confirmed: "உறுதிசெய்யப்பட்டது",
        cancelled: "ரத்து செய்யப்பட்டது",
        completed: "முடிந்தது",
        pending: "நிலுவையில்"
      },
      modal: {
        title: "சந்திப்பை மறு திட்டமிடவும்",
        warningText: "மறு திட்டமிடல் உங்கள் சந்திப்பை நிலுவையில் உள்ள நிலைக்கு மீட்டமைக்கும். கிளினிக்கால் மறு திட்டமிடல் கட்டணம் கழிக்கப்படலாம்.",
        currentlyLabel: "தற்போது:",
        newDateLabel: "புதிய தேதி",
        newTimeLabel: "புதிய நேர இடைவெளி",
        confirmReschedule: "📅 மறு திட்டமிடலை உறுதிப்படுத்தவும்",
        rescheduling: "மறு திட்டமிடப்படுகிறது..."
      },
      toast: {
        confirmed: "{{doctor}} உடனான உங்கள் சந்திப்பு உறுதிசெய்யப்பட்டது! 🎉",
        cancelledByClinic: "{{doctor}} உடனான உங்கள் சந்திப்பு கிளினிக்கால் ரத்து செய்யப்பட்டது.",
        rescheduled: "சந்திப்பு {{date}} அன்று {{time}} மணிக்கு மறு திட்டமிடப்பட்டது. மறு திட்டமிடல் கட்டணம் பொருந்தலாம்.",
        rescheduleFailed: "மறு திட்டமிடல் தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.",
        defaultDoctor: "உங்கள் மருத்துவர்"
      }
    }
  },
  te: {
    myAppointments: {
      title: "నా అపాయింట్‌మెంట్‌లు",
      subtitle: "మీ అన్ని బుకింగ్‌లను నిర్వహించండి",
      live: "ప్రత్యక్షం",
      bookNew: "+ కొత్తది బుక్ చేయండి",
      emptyTitle: "ఇంకా అపాయింట్‌మెంట్‌లు లేవు",
      emptySubtitle: "ఒక డాక్టర్‌తో మీ మొదటి అపాయింట్‌మెంట్ బుక్ చేయండి",
      findDoctor: "డాక్టర్‌ను కనుగొనండి",
      upcoming: "రాబోయేవి",
      pastAndCancelled: "గత మరియు రద్దు చేయబడినవి",
      joinLiveQueue: "ప్రత్యక్ష క్యూలో చేరండి",
      reschedule: "షెడ్యూల్ మార్చండి",
      awaitingApproval: "ఆమోదం కోసం వేచి ఉంది",
      status: {
        confirmed: "నిర్ధారించబడింది",
        cancelled: "రద్దు చేయబడింది",
        completed: "పూర్తయింది",
        pending: "పెండింగ్‌లో ఉంది"
      },
      modal: {
        title: "అపాయింట్‌మెంట్ షెడ్యూల్ మార్చండి",
        warningText: "షెడ్యూల్ మార్చడం వలన మీ అపాయింట్‌మెంట్ పెండింగ్ స్థితికి రీసెట్ అవుతుంది. క్లినిక్ ద్వారా షెడ్యూల్ మార్పు రుసుము తీసివేయబడవచ్చు.",
        currentlyLabel: "ప్రస్తుతం:",
        newDateLabel: "కొత్త తేదీ",
        newTimeLabel: "కొత్త సమయ స్లాట్",
        confirmReschedule: "📅 షెడ్యూల్ మార్పును నిర్ధారించండి",
        rescheduling: "షెడ్యూల్ మారుస్తోంది..."
      },
      toast: {
        confirmed: "{{doctor}}తో మీ అపాయింట్‌మెంట్ నిర్ధారించబడింది! 🎉",
        cancelledByClinic: "{{doctor}}తో మీ అపాయింట్‌మెంట్ క్లినిక్ ద్వారా రద్దు చేయబడింది.",
        rescheduled: "అపాయింట్‌మెంట్ {{date}} న {{time}} కు షెడ్యూల్ మార్చబడింది. షెడ్యూల్ మార్పు రుసుము వర్తించవచ్చు.",
        rescheduleFailed: "షెడ్యూల్ మార్చడం విఫలమైంది. దయచేసి మళ్లీ ప్రయత్నించండి.",
        defaultDoctor: "మీ డాక్టర్"
      }
    }
  },
  kn: {
    myAppointments: {
      title: "ನನ್ನ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ಗಳು",
      subtitle: "ನಿಮ್ಮ ಎಲ್ಲಾ ಬುಕಿಂಗ್‌ಗಳನ್ನು ನಿರ್ವಹಿಸಿ",
      live: "ಲೈವ್",
      bookNew: "+ ಹೊಸದನ್ನು ಬುಕ್ ಮಾಡಿ",
      emptyTitle: "ಇನ್ನೂ ಯಾವುದೇ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ಗಳಿಲ್ಲ",
      emptySubtitle: "ವೈದ್ಯರೊಂದಿಗೆ ನಿಮ್ಮ ಮೊದಲ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಿ",
      findDoctor: "ವೈದ್ಯರನ್ನು ಹುಡುಕಿ",
      upcoming: "ಮುಂಬರುವ",
      pastAndCancelled: "ಹಿಂದಿನ ಮತ್ತು ರದ್ದುಗೊಂಡ",
      joinLiveQueue: "ಲೈವ್ ಕ್ಯೂಗೆ ಸೇರಿ",
      reschedule: "ಮರುಸಮಯ ನಿಗದಿ",
      awaitingApproval: "ಅನುಮೋದನೆಗಾಗಿ ಕಾಯಲಾಗುತ್ತಿದೆ",
      status: {
        confirmed: "ದೃಢಪಡಿಸಲಾಗಿದೆ",
        cancelled: "ರದ್ದುಗೊಂಡಿದೆ",
        completed: "ಪೂರ್ಣಗೊಂಡಿದೆ",
        pending: "ಬಾಕಿ ಇದೆ"
      },
      modal: {
        title: "ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಮರುಸಮಯ ನಿಗದಿ",
        warningText: "ಮರುಸಮಯ ನಿಗದಿ ಮಾಡುವುದರಿಂದ ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬಾಕಿ ಸ್ಥಿತಿಗೆ ಮರುಹೊಂದಿಸಲ್ಪಡುತ್ತದೆ. ಕ್ಲಿನಿಕ್‌ನಿಂದ ಮರುಸಮಯ ನಿಗದಿ ಶುಲ್ಕ ಕಡಿತಗೊಳ್ಳಬಹುದು.",
        currentlyLabel: "ಪ್ರಸ್ತುತ:",
        newDateLabel: "ಹೊಸ ದಿನಾಂಕ",
        newTimeLabel: "ಹೊಸ ಸಮಯ ಸ್ಲಾಟ್",
        confirmReschedule: "📅 ಮರುಸಮಯ ನಿಗದಿಯನ್ನು ದೃಢೀಕರಿಸಿ",
        rescheduling: "ಮರುಸಮಯ ನಿಗದಿ ಮಾಡಲಾಗುತ್ತಿದೆ..."
      },
      toast: {
        confirmed: "{{doctor}} ಜೊತೆಗಿನ ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ದೃಢಪಡಿಸಲಾಗಿದೆ! 🎉",
        cancelledByClinic: "{{doctor}} ಜೊತೆಗಿನ ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಅನ್ನು ಕ್ಲಿನಿಕ್ ರದ್ದುಗೊಳಿಸಿದೆ.",
        rescheduled: "ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಅನ್ನು {{date}} ರಂದು {{time}} ಗೆ ಮರುಸಮಯ ನಿಗದಿ ಮಾಡಲಾಗಿದೆ. ಮರುಸಮಯ ನಿಗದಿ ಶುಲ್ಕ ಅನ್ವಯಿಸಬಹುದು.",
        rescheduleFailed: "ಮರುಸಮಯ ನಿಗದಿ ವಿಫಲವಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
        defaultDoctor: "ನಿಮ್ಮ ವೈದ್ಯರು"
      }
    }
  },
  bn: {
    myAppointments: {
      title: "আমার অ্যাপয়েন্টমেন্ট",
      subtitle: "আপনার সমস্ত বুকিং পরিচালনা করুন",
      live: "লাইভ",
      bookNew: "+ নতুন বুক করুন",
      emptyTitle: "এখনও কোনো অ্যাপয়েন্টমেন্ট নেই",
      emptySubtitle: "একজন ডাক্তারের সাথে আপনার প্রথম অ্যাপয়েন্টমেন্ট বুক করুন",
      findDoctor: "ডাক্তার খুঁজুন",
      upcoming: "আসন্ন",
      pastAndCancelled: "অতীত এবং বাতিল",
      joinLiveQueue: "লাইভ সারিতে যোগ দিন",
      reschedule: "পুনঃনির্ধারণ করুন",
      awaitingApproval: "অনুমোদনের অপেক্ষায়",
      status: {
        confirmed: "নিশ্চিত",
        cancelled: "বাতিল",
        completed: "সম্পন্ন",
        pending: "মুলতুবি"
      },
      modal: {
        title: "অ্যাপয়েন্টমেন্ট পুনঃনির্ধারণ করুন",
        warningText: "পুনঃনির্ধারণ আপনার অ্যাপয়েন্টমেন্টকে মুলতুবি অবস্থায় রিসেট করে। ক্লিনিক দ্বারা পুনঃনির্ধারণ ফি কাটা হতে পারে।",
        currentlyLabel: "বর্তমানে:",
        newDateLabel: "নতুন তারিখ",
        newTimeLabel: "নতুন সময় স্লট",
        confirmReschedule: "📅 পুনঃনির্ধারণ নিশ্চিত করুন",
        rescheduling: "পুনঃনির্ধারণ করা হচ্ছে..."
      },
      toast: {
        confirmed: "{{doctor}}-এর সাথে আপনার অ্যাপয়েন্টমেন্ট নিশ্চিত হয়েছে! 🎉",
        cancelledByClinic: "{{doctor}}-এর সাথে আপনার অ্যাপয়েন্টমেন্ট ক্লিনিক দ্বারা বাতিল করা হয়েছিল।",
        rescheduled: "অ্যাপয়েন্টমেন্ট {{date}}-এ {{time}}-এ পুনঃনির্ধারণ করা হয়েছে। পুনঃনির্ধারণ ফি প্রযোজ্য হতে পারে।",
        rescheduleFailed: "পুনঃনির্ধারণ ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।",
        defaultDoctor: "আপনার ডাক্তার"
      }
    }
  },
  ml: {
    myAppointments: {
      title: "എന്റെ അപ്പോയിന്റ്മെന്റുകൾ",
      subtitle: "നിങ്ങളുടെ എല്ലാ ബുക്കിംഗുകളും കൈകാര്യം ചെയ്യുക",
      live: "തത്സമയം",
      bookNew: "+ പുതിയത് ബുക്ക് ചെയ്യുക",
      emptyTitle: "ഇതുവരെ അപ്പോയിന്റ്മെന്റുകളൊന്നുമില്ല",
      emptySubtitle: "ഒരു ഡോക്ടറുമായി നിങ്ങളുടെ ആദ്യ അപ്പോയിന്റ്മെന്റ് ബുക്ക് ചെയ്യുക",
      findDoctor: "ഡോക്ടറെ കണ്ടെത്തുക",
      upcoming: "വരാനിരിക്കുന്നവ",
      pastAndCancelled: "മുൻകാല, റദ്ദാക്കിയവ",
      joinLiveQueue: "തത്സമയ ക്യൂവിൽ ചേരുക",
      reschedule: "പുനഃക്രമീകരിക്കുക",
      awaitingApproval: "അംഗീകാരത്തിനായി കാത്തിരിക്കുന്നു",
      status: {
        confirmed: "സ്ഥിരീകരിച്ചു",
        cancelled: "റദ്ദാക്കി",
        completed: "പൂർത്തിയായി",
        pending: "തീർപ്പുകൽപ്പിക്കാത്തത്"
      },
      modal: {
        title: "അപ്പോയിന്റ്മെന്റ് പുനഃക്രമീകരിക്കുക",
        warningText: "പുനഃക്രമീകരണം നിങ്ങളുടെ അപ്പോയിന്റ്മെന്റിനെ തീർപ്പുകൽപ്പിക്കാത്ത നിലയിലേക്ക് പുനഃസജ്ജമാക്കുന്നു. ക്ലിനിക്ക് പുനഃക്രമീകരണ ഫീസ് ഈടാക്കിയേക്കാം.",
        currentlyLabel: "നിലവിൽ:",
        newDateLabel: "പുതിയ തീയതി",
        newTimeLabel: "പുതിയ സമയ സ്ലോട്ട്",
        confirmReschedule: "📅 പുനഃക്രമീകരണം സ്ഥിരീകരിക്കുക",
        rescheduling: "പുനഃക്രമീകരിക്കുന്നു..."
      },
      toast: {
        confirmed: "{{doctor}} യുമായുള്ള നിങ്ങളുടെ അപ്പോയിന്റ്മെന്റ് സ്ഥിരീകരിച്ചു! 🎉",
        cancelledByClinic: "{{doctor}} യുമായുള്ള നിങ്ങളുടെ അപ്പോയിന്റ്മെന്റ് ക്ലിനിക്ക് റദ്ദാക്കി.",
        rescheduled: "അപ്പോയിന്റ്മെന്റ് {{date}} ന് {{time}} ന് പുനഃക്രമീകരിച്ചു. പുനഃക്രമീകരണ ഫീസ് ബാധകമായേക്കാം.",
        rescheduleFailed: "പുനഃക്രമീകരണം പരാജയപ്പെട്ടു. ദയവായി വീണ്ടും ശ്രമിക്കുക.",
        defaultDoctor: "നിങ്ങളുടെ ഡോക്ടർ"
      }
    }
  },
  gu: {
    myAppointments: {
      title: "મારી અપોઈન્ટમેન્ટ્સ",
      subtitle: "તમારી બધી બુકિંગ્સ સંચાલિત કરો",
      live: "લાઇવ",
      bookNew: "+ નવી બુક કરો",
      emptyTitle: "હજુ સુધી કોઈ અપોઈન્ટમેન્ટ નથી",
      emptySubtitle: "ડોક્ટર સાથે તમારી પ્રથમ અપોઈન્ટમેન્ટ બુક કરો",
      findDoctor: "ડોક્ટર શોધો",
      upcoming: "આગામી",
      pastAndCancelled: "ભૂતકાળ અને રદ કરેલ",
      joinLiveQueue: "લાઇવ કતારમાં જોડાઓ",
      reschedule: "ફરીથી શેડ્યૂલ કરો",
      awaitingApproval: "મંજૂરીની રાહ જોવાઈ રહી છે",
      status: {
        confirmed: "પુષ્ટિ થયેલ",
        cancelled: "રદ કરેલ",
        completed: "પૂર્ણ",
        pending: "બાકી"
      },
      modal: {
        title: "અપોઈન્ટમેન્ટ ફરીથી શેડ્યૂલ કરો",
        warningText: "ફરીથી શેડ્યૂલ કરવાથી તમારી અપોઈન્ટમેન્ટ બાકી સ્થિતિમાં રીસેટ થાય છે. ક્લિનિક દ્વારા ફરીથી શેડ્યૂલિંગ ફી કાપવામાં આવી શકે છે.",
        currentlyLabel: "હાલમાં:",
        newDateLabel: "નવી તારીખ",
        newTimeLabel: "નવો સમય સ્લોટ",
        confirmReschedule: "📅 ફરીથી શેડ્યૂલિંગની પુષ્ટિ કરો",
        rescheduling: "ફરીથી શેડ્યૂલ કરી રહ્યા છીએ..."
      },
      toast: {
        confirmed: "{{doctor}} સાથેની તમારી અપોઈન્ટમેન્ટની પુષ્ટિ થઈ ગઈ છે! 🎉",
        cancelledByClinic: "{{doctor}} સાથેની તમારી અપોઈન્ટમેન્ટ ક્લિનિક દ્વારા રદ કરવામાં આવી હતી.",
        rescheduled: "અપોઈન્ટમેન્ટ {{date}} ના રોજ {{time}} વાગ્યે ફરીથી શેડ્યૂલ કરવામાં આવી. ફરીથી શેડ્યૂલિંગ ફી લાગુ થઈ શકે છે.",
        rescheduleFailed: "ફરીથી શેડ્યૂલિંગ નિષ્ફળ થયું. કૃપા કરી ફરી પ્રયાસ કરો.",
        defaultDoctor: "તમારા ડોક્ટર"
      }
    }
  },
  pa: {
    myAppointments: {
      title: "ਮੇਰੀਆਂ ਅਪੌਇੰਟਮੈਂਟਾਂ",
      subtitle: "ਆਪਣੀਆਂ ਸਾਰੀਆਂ ਬੁਕਿੰਗਾਂ ਦਾ ਪ੍ਰਬੰਧਨ ਕਰੋ",
      live: "ਲਾਈਵ",
      bookNew: "+ ਨਵੀਂ ਬੁੱਕ ਕਰੋ",
      emptyTitle: "ਅਜੇ ਤੱਕ ਕੋਈ ਅਪੌਇੰਟਮੈਂਟ ਨਹੀਂ",
      emptySubtitle: "ਕਿਸੇ ਡਾਕਟਰ ਨਾਲ ਆਪਣੀ ਪਹਿਲੀ ਅਪੌਇੰਟਮੈਂਟ ਬੁੱਕ ਕਰੋ",
      findDoctor: "ਡਾਕਟਰ ਲੱਭੋ",
      upcoming: "ਆਉਣ ਵਾਲੀਆਂ",
      pastAndCancelled: "ਪਿਛਲੀਆਂ ਅਤੇ ਰੱਦ ਕੀਤੀਆਂ",
      joinLiveQueue: "ਲਾਈਵ ਕਤਾਰ ਵਿੱਚ ਸ਼ਾਮਲ ਹੋਵੋ",
      reschedule: "ਮੁੜ-ਨਿਯਤ ਕਰੋ",
      awaitingApproval: "ਮਨਜ਼ੂਰੀ ਦੀ ਉਡੀਕ ਹੈ",
      status: {
        confirmed: "ਪੁਸ਼ਟੀ ਹੋਈ",
        cancelled: "ਰੱਦ ਕੀਤੀ",
        completed: "ਪੂਰੀ ਹੋਈ",
        pending: "ਬਕਾਇਆ"
      },
      modal: {
        title: "ਅਪੌਇੰਟਮੈਂਟ ਮੁੜ-ਨਿਯਤ ਕਰੋ",
        warningText: "ਮੁੜ-ਨਿਯਤ ਕਰਨ ਨਾਲ ਤੁਹਾਡੀ ਅਪੌਇੰਟਮੈਂਟ ਬਕਾਇਆ ਸਥਿਤੀ ਵਿੱਚ ਰੀਸੈੱਟ ਹੋ ਜਾਂਦੀ ਹੈ। ਕਲੀਨਿਕ ਦੁਆਰਾ ਮੁੜ-ਨਿਯਤ ਫੀਸ ਕੱਟੀ ਜਾ ਸਕਦੀ ਹੈ।",
        currentlyLabel: "ਵਰਤਮਾਨ ਵਿੱਚ:",
        newDateLabel: "ਨਵੀਂ ਤਾਰੀਖ",
        newTimeLabel: "ਨਵਾਂ ਸਮਾਂ ਸਲਾਟ",
        confirmReschedule: "📅 ਮੁੜ-ਨਿਯਤ ਕਰਨ ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ",
        rescheduling: "ਮੁੜ-ਨਿਯਤ ਕੀਤਾ ਜਾ ਰਿਹਾ ਹੈ..."
      },
      toast: {
        confirmed: "{{doctor}} ਨਾਲ ਤੁਹਾਡੀ ਅਪੌਇੰਟਮੈਂਟ ਦੀ ਪੁਸ਼ਟੀ ਹੋ ਗਈ ਹੈ! 🎉",
        cancelledByClinic: "{{doctor}} ਨਾਲ ਤੁਹਾਡੀ ਅਪੌਇੰਟਮੈਂਟ ਕਲੀਨਿਕ ਦੁਆਰਾ ਰੱਦ ਕਰ ਦਿੱਤੀ ਗਈ ਸੀ।",
        rescheduled: "ਅਪੌਇੰਟਮੈਂਟ {{date}} ਨੂੰ {{time}} ਵਜੇ ਮੁੜ-ਨਿਯਤ ਕੀਤੀ ਗਈ। ਮੁੜ-ਨਿਯਤ ਫੀਸ ਲਾਗੂ ਹੋ ਸਕਦੀ ਹੈ।",
        rescheduleFailed: "ਮੁੜ-ਨਿਯਤ ਕਰਨਾ ਅਸਫਲ ਰਿਹਾ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।",
        defaultDoctor: "ਤੁਹਾਡੇ ਡਾਕਟਰ"
      }
    }
  }
};

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      if (!target[key] || typeof target[key] !== 'object') target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

let filesUpdated = 0;
let filesFailed = 0;

for (const lang of Object.keys(newKeys)) {
  const filePath = path.join(LOCALES_DIR, `${lang}.json`);
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`✗ Missing file: ${filePath}`);
      filesFailed++;
      continue;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(raw);
    deepMerge(json, newKeys[lang]);
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
    console.log(`✓ Updated ${lang}.json`);
    filesUpdated++;
  } catch (err) {
    console.error(`✗ Failed on ${lang}.json:`, err.message);
    filesFailed++;
  }
}

console.log(`\nDone. ${filesUpdated} updated, ${filesFailed} failed.`);
console.log('Now run: node check_i18n_keys.js src/i18n/locales');