/* Offline-first translations for hard-coded/dynamic farming content. Frontend only. */
(() => {
  'use strict';
  const D = {
    hi: {
      'Sowing':'बुवाई','Seedling':'अंकुर अवस्था','Vegetative':'वानस्पतिक अवस्था','Flowering':'फूल आने की अवस्था','Harvest Ready':'कटाई के लिए तैयार',
      'Day 1–10':'दिन 1–10','Day 11–20':'दिन 11–20','Day 21–40':'दिन 21–40','Day 41–65':'दिन 41–65','Day 75+':'दिन 75+',
      'Beej buwai aur halka moisture banayein.':'बीज बोएँ और मिट्टी में हल्की नमी बनाए रखें।','Ankur suraksha aur weed check karein.':'अंकुरों की सुरक्षा करें और खरपतवार की जाँच करें।','Patte aur tanon ki growth—balanced poshan dein.':'पत्तियों और तनों की वृद्धि के लिए संतुलित पोषण दें।','Phool/bali aate samay pani ki kami na hone dein.':'फूल और बालियाँ आते समय पानी की कमी न होने दें।','Pakne par samay se katai aur safe storage karein.':'फसल पकने पर समय से कटाई करें और सुरक्षित भंडारण करें।',
      'Paddy (Dhan) ko warm humid climate, fertile alluvial/clayey soil, aur regular water management pasand hai.':'धान को गर्म और आर्द्र जलवायु, उपजाऊ जलोढ़ या चिकनी मिट्टी तथा नियमित जल प्रबंधन की आवश्यकता होती है।','Wheat (Gehun) Rabi season ki mukhya fasal hai jise cool weather aur timely irrigation chahiye.':'गेहूँ रबी की प्रमुख फसल है। इसे ठंडा मौसम और समय पर सिंचाई चाहिए।','Cotton (Kapas) black cotton soil mein achha badhta hai aur pest/bollworm monitoring zaroori hoti hai.':'कपास काली मिट्टी में अच्छी होती है। कीटों और बॉलवर्म की नियमित निगरानी ज़रूरी है।','Tomato (Tamatar) well-drained loamy soil mein achhi upaj deta hai aur fungal/blight care zaroori hai.':'टमाटर की अच्छी उपज के लिए जल निकासी वाली दोमट मिट्टी और फफूँद/झुलसा रोग की देखभाल ज़रूरी है।',
      'Paddy':'धान','Paddy (Dhan)':'धान','Wheat':'गेहूँ','Cotton':'कपास','Tomato':'टमाटर','Alluvial Soil':'जलोढ़ मिट्टी','Irrigated':'सिंचित','Kharif':'खरीफ','Rabi':'रबी','Zaid':'जायद','Choose file':'फ़ाइल चुनें','No file chosen':'कोई फ़ाइल नहीं चुनी गई'
    },
    mr: {
      'Sowing':'पेरणी','Seedling':'रोपांची अवस्था','Vegetative':'वाढीची अवस्था','Flowering':'फुलोऱ्याची अवस्था','Harvest Ready':'कापणीस तयार',
      'Day 1–10':'दिवस १–१०','Day 11–20':'दिवस ११–२०','Day 21–40':'दिवस २१–४०','Day 41–65':'दिवस ४१–६५','Day 75+':'दिवस ७५+',
      'Beej buwai aur halka moisture banayein.':'पेरणीनंतर जमिनीत हलका ओलावा राखा.','Ankur suraksha aur weed check karein.':'रोपांचे संरक्षण करा आणि तणांची तपासणी करा.','Patte aur tanon ki growth—balanced poshan dein.':'पाने आणि खोडांच्या वाढीसाठी संतुलित पोषण द्या.','Phool/bali aate samay pani ki kami na hone dein.':'फुले व कणसे येताना पाण्याची कमतरता होऊ देऊ नका.','Pakne par samay se katai aur safe storage karein.':'पीक पिकल्यानंतर वेळेवर कापणी करून सुरक्षित साठवण करा.',
      'Paddy (Dhan) ko warm humid climate, fertile alluvial/clayey soil, aur regular water management pasand hai.':'भात पिकासाठी उबदार व दमट हवामान, सुपीक गाळाची किंवा चिकणमातीची जमीन आणि नियमित पाणी व्यवस्थापन आवश्यक आहे.','Wheat (Gehun) Rabi season ki mukhya fasal hai jise cool weather aur timely irrigation chahiye.':'गहू हे रब्बी हंगामातील प्रमुख पीक आहे. त्याला थंड हवामान आणि वेळेवर सिंचन आवश्यक आहे.','Cotton (Kapas) black cotton soil mein achha badhta hai aur pest/bollworm monitoring zaroori hoti hai.':'कापूस काळ्या जमिनीत चांगला वाढतो. कीड व बोंडअळीचे नियमित निरीक्षण आवश्यक आहे.','Tomato (Tamatar) well-drained loamy soil mein achhi upaj deta hai aur fungal/blight care zaroori hai.':'टोमॅटोला चांगला निचरा होणारी पोयट्याची जमीन योग्य असते. बुरशी व करपा रोगाची काळजी घ्या.',
      'Paddy':'भात','Paddy (Dhan)':'भात','Wheat':'गहू','Cotton':'कापूस','Tomato':'टोमॅटो','Alluvial Soil':'गाळाची माती','Irrigated':'सिंचित','Kharif':'खरीप','Rabi':'रब्बी','Zaid':'उन्हाळी','Choose file':'फाइल निवडा','No file chosen':'फाइल निवडलेली नाही'
    },
    or: {
      'Sowing':'ବୁଣିବା','Seedling':'ଗଜା ଅବସ୍ଥା','Vegetative':'ବୃଦ୍ଧି ଅବସ୍ଥା','Flowering':'ଫୁଲ ଧରିବା ଅବସ୍ଥା','Harvest Ready':'ଅମଳ ପାଇଁ ପ୍ରସ୍ତୁତ',
      'Day 1–10':'ଦିନ ୧–୧୦','Day 11–20':'ଦିନ ୧୧–୨୦','Day 21–40':'ଦିନ ୨୧–୪୦','Day 41–65':'ଦିନ ୪୧–୬୫','Day 75+':'ଦିନ ୭୫+',
      'Beej buwai aur halka moisture banayein.':'ବିହନ ବୁଣନ୍ତୁ ଏବଂ ମାଟିରେ ହାଲୁକା ଆର୍ଦ୍ରତା ରଖନ୍ତୁ।','Ankur suraksha aur weed check karein.':'ଗଜାର ସୁରକ୍ଷା କରନ୍ତୁ ଏବଂ ଘାସପତ୍ର ଯାଞ୍ଚ କରନ୍ତୁ।','Patte aur tanon ki growth—balanced poshan dein.':'ପତ୍ର ଓ କାଣ୍ଡର ବୃଦ୍ଧି ପାଇଁ ସନ୍ତୁଳିତ ପୋଷକ ଦିଅନ୍ତୁ।','Phool/bali aate samay pani ki kami na hone dein.':'ଫୁଲ ଓ ଶିଷ ଆସିବା ସମୟରେ ପାଣିର ଅଭାବ ହେବାକୁ ଦିଅନ୍ତୁ ନାହିଁ।','Pakne par samay se katai aur safe storage karein.':'ଫସଲ ପାଚିଲେ ଠିକ୍ ସମୟରେ ଅମଳ କରି ସୁରକ୍ଷିତ ଭାବେ ସଂରକ୍ଷଣ କରନ୍ତୁ।',
      'Paddy (Dhan) ko warm humid climate, fertile alluvial/clayey soil, aur regular water management pasand hai.':'ଧାନ ପାଇଁ ଉଷ୍ଣ ଓ ଆର୍ଦ୍ର ଜଳବାୟୁ, ଉର୍ବର ପଟୁ ବା କାଦୁଅ ମାଟି ଏବଂ ନିୟମିତ ଜଳ ପରିଚାଳନା ଆବଶ୍ୟକ।','Wheat (Gehun) Rabi season ki mukhya fasal hai jise cool weather aur timely irrigation chahiye.':'ଗହମ ରବି ଋତୁର ମୁଖ୍ୟ ଫସଲ। ଏହାକୁ ଥଣ୍ଡା ପାଗ ଓ ଠିକ୍ ସମୟରେ ଜଳସେଚନ ଆବଶ୍ୟକ।','Cotton (Kapas) black cotton soil mein achha badhta hai aur pest/bollworm monitoring zaroori hoti hai.':'କଳା ମାଟିରେ କପା ଭଲ ବଢ଼େ। ପୋକ ଓ ବଲୱର୍ମ ଉପରେ ନିୟମିତ ନଜର ରଖନ୍ତୁ।','Tomato (Tamatar) well-drained loamy soil mein achhi upaj deta hai aur fungal/blight care zaroori hai.':'ଭଲ ଜଳ ନିଷ୍କାସନ ହେଉଥିବା ଦୋରସା ମାଟିରେ ଟମାଟୋ ଭଲ ଫଳେ। ଫଙ୍ଗସ୍ ଓ ଝାଉଁଳା ରୋଗର ଯତ୍ନ ନିଅନ୍ତୁ।',
      'Paddy':'ଧାନ','Paddy (Dhan)':'ଧାନ','Wheat':'ଗହମ','Cotton':'କପା','Tomato':'ଟମାଟୋ','Alluvial Soil':'ପଟୁ ମାଟି','Irrigated':'ଜଳସେଚିତ','Kharif':'ଖରିଫ','Rabi':'ରବି','Zaid':'ଜାୟଦ','Choose file':'ଫାଇଲ୍ ବାଛନ୍ତୁ','No file chosen':'କୌଣସି ଫାଇଲ୍ ବଛାଯାଇନାହିଁ'
    },
    bn: {
      'Sowing':'বীজ বপন','Seedling':'চারা অবস্থা','Vegetative':'বৃদ্ধির পর্যায়','Flowering':'ফুল আসার পর্যায়','Harvest Ready':'ফসল কাটার জন্য প্রস্তুত','Day 1–10':'দিন ১–১০','Day 11–20':'দিন ১১–২০','Day 21–40':'দিন ২১–৪০','Day 41–65':'দিন ৪১–৬৫','Day 75+':'দিন ৭৫+',
      'Beej buwai aur halka moisture banayein.':'বীজ বপন করুন এবং মাটিতে হালকা আর্দ্রতা বজায় রাখুন।','Ankur suraksha aur weed check karein.':'চারার সুরক্ষা করুন এবং আগাছা পরীক্ষা করুন।','Patte aur tanon ki growth—balanced poshan dein.':'পাতা ও কাণ্ডের বৃদ্ধির জন্য সুষম পুষ্টি দিন।','Phool/bali aate samay pani ki kami na hone dein.':'ফুল ও শিষ আসার সময় জলের অভাব হতে দেবেন না।','Pakne par samay se katai aur safe storage karein.':'ফসল পাকলে সময়মতো কাটুন এবং নিরাপদে সংরক্ষণ করুন।',
      'Paddy':'ধান','Paddy (Dhan)':'ধান','Wheat':'গম','Cotton':'তুলা','Tomato':'টমেটো','Alluvial Soil':'পলিমাটি','Irrigated':'সেচযুক্ত','Kharif':'খরিফ','Rabi':'রবি','Zaid':'জায়েদ','Choose file':'ফাইল বেছে নিন','No file chosen':'কোনও ফাইল বেছে নেওয়া হয়নি'
    },
    te: {
      'Sowing':'విత్తే దశ','Seedling':'మొలక దశ','Vegetative':'ఆకు మరియు కాండం పెరుగుదల దశ','Flowering':'పుష్పించే దశ','Harvest Ready':'కోతకు సిద్ధం','Day 1–10':'1–10వ రోజు','Day 11–20':'11–20వ రోజు','Day 21–40':'21–40వ రోజు','Day 41–65':'41–65వ రోజు','Day 75+':'75వ రోజు తర్వాత',
      'Beej buwai aur halka moisture banayein.':'విత్తనాలు వేసి నేలలో తగినంత తేమను ఉంచండి.','Ankur suraksha aur weed check karein.':'మొలకలను కాపాడండి మరియు కలుపు మొక్కలను పరిశీలించండి.','Patte aur tanon ki growth—balanced poshan dein.':'ఆకులు మరియు కాండం ఆరోగ్యంగా పెరగడానికి సమతుల్య పోషకాలు ఇవ్వండి.','Phool/bali aate samay pani ki kami na hone dein.':'పూలు మరియు కంకులు వచ్చే సమయంలో నీటి కొరత రానివ్వకండి.','Pakne par samay se katai aur safe storage karein.':'పంట పండినప్పుడు సమయానికి కోసి సురక్షితంగా నిల్వ చేయండి.',
      'Paddy (Dhan) ko warm humid climate, fertile alluvial/clayey soil, aur regular water management pasand hai.':'వరి పంటకు వెచ్చని తేమగల వాతావరణం, సారవంతమైన ఒండ్రు లేదా బంకమట్టి నేల, క్రమమైన నీటి నిర్వహణ అవసరం.','Wheat (Gehun) Rabi season ki mukhya fasal hai jise cool weather aur timely irrigation chahiye.':'గోధుమ రబీ కాలంలోని ప్రధాన పంట. దీనికి చల్లని వాతావరణం, సరైన సమయంలో నీటిపారుదల అవసరం.','Cotton (Kapas) black cotton soil mein achha badhta hai aur pest/bollworm monitoring zaroori hoti hai.':'నల్లరేగడి నేలలో పత్తి బాగా పెరుగుతుంది. పురుగులు, కాయతొలుచు పురుగులను క్రమం తప్పకుండా గమనించాలి.','Tomato (Tamatar) well-drained loamy soil mein achhi upaj deta hai aur fungal/blight care zaroori hai.':'నీరు బాగా బయటకు వెళ్లే లోమీ నేలలో టమాటా మంచి దిగుబడిని ఇస్తుంది. శిలీంధ్ర, ఎండు తెగుళ్లను గమనించాలి.',
      'Paddy':'వరి','Paddy (Dhan)':'వరి','Wheat':'గోధుమ','Cotton':'పత్తి','Tomato':'టమాటా','Alluvial Soil':'ఒండ్రు నేల','Irrigated':'నీటిపారుదల ఉన్నది','Kharif':'ఖరీఫ్','Rabi':'రబీ','Zaid':'జాయిద్','Choose file':'ఫైల్ ఎంచుకోండి','No file chosen':'ఫైల్ ఎంచుకోలేదు'
    },
    ta: {
      'Sowing':'விதைப்பு நிலை','Seedling':'நாற்று நிலை','Vegetative':'இலை மற்றும் தண்டு வளர்ச்சி நிலை','Flowering':'பூக்கும் நிலை','Harvest Ready':'அறுவடைக்குத் தயார்','Day 1–10':'நாள் 1–10','Day 11–20':'நாள் 11–20','Day 21–40':'நாள் 21–40','Day 41–65':'நாள் 41–65','Day 75+':'நாள் 75+',
      'Beej buwai aur halka moisture banayein.':'விதைகளை விதைத்து மண்ணில் லேசான ஈரப்பதத்தைப் பராமரிக்கவும்.','Ankur suraksha aur weed check karein.':'முளைகளைப் பாதுகாத்து களைகளைச் சரிபார்க்கவும்.','Patte aur tanon ki growth—balanced poshan dein.':'இலை மற்றும் தண்டு வளர்ச்சிக்கு சமச்சீர் ஊட்டச்சத்து வழங்கவும்.','Phool/bali aate samay pani ki kami na hone dein.':'பூக்கும் மற்றும் கதிர் வரும் காலத்தில் நீர்ப்பற்றாக்குறை ஏற்படாமல் பார்த்துக்கொள்ளவும்.','Pakne par samay se katai aur safe storage karein.':'பயிர்成熟மானதும் சரியான நேரத்தில் அறுவடை செய்து பாதுகாப்பாகச் சேமிக்கவும்.',
      'Paddy (Dhan) ko warm humid climate, fertile alluvial/clayey soil, aur regular water management pasand hai.':'நெற்பயிருக்கு வெப்பமான ஈரப்பதமுள்ள காலநிலை, வளமான வண்டல் அல்லது களிமண் நிலம் மற்றும் முறையான நீர் மேலாண்மை தேவை.','Wheat (Gehun) Rabi season ki mukhya fasal hai jise cool weather aur timely irrigation chahiye.':'கோதுமை ரபி பருவத்தின் முக்கியப் பயிர். இதற்கு குளிர்ந்த வானிலை மற்றும் சரியான நேரப் பாசனம் தேவை.','Cotton (Kapas) black cotton soil mein achha badhta hai aur pest/bollworm monitoring zaroori hoti hai.':'கரிசல் மண்ணில் பருத்தி நன்றாக வளரும். பூச்சி மற்றும் காய்ப்புழுவைக் கண்காணிக்க வேண்டும்.','Tomato (Tamatar) well-drained loamy soil mein achhi upaj deta hai aur fungal/blight care zaroori hai.':'நல்ல வடிகால் வசதியுள்ள வண்டல் கலந்த மண்ணில் தக்காளி நன்றாக விளையும். பூஞ்சை மற்றும் கருகல் நோயைக் கவனிக்கவும்.',
      'Paddy':'நெல்','Paddy (Dhan)':'நெல்','Wheat':'கோதுமை','Cotton':'பருத்தி','Tomato':'தக்காளி','Alluvial Soil':'வண்டல் மண்','Irrigated':'பாசன வசதி உள்ளது','Kharif':'காரிப்','Rabi':'ரபி','Zaid':'ஜாயித்','Choose file':'கோப்பைத் தேர்ந்தெடுக்கவும்','No file chosen':'கோப்பு தேர்ந்தெடுக்கப்படவில்லை'
    },
    pa: {
      'Sowing':'ਬਿਜਾਈ','Seedling':'ਪੌਦੇ ਦੀ ਸ਼ੁਰੂਆਤੀ ਅਵਸਥਾ','Vegetative':'ਵਾਧੇ ਦੀ ਅਵਸਥਾ','Flowering':'ਫੁੱਲ ਆਉਣ ਦੀ ਅਵਸਥਾ','Harvest Ready':'ਕਟਾਈ ਲਈ ਤਿਆਰ','Day 1–10':'ਦਿਨ 1–10','Day 11–20':'ਦਿਨ 11–20','Day 21–40':'ਦਿਨ 21–40','Day 41–65':'ਦਿਨ 41–65','Day 75+':'ਦਿਨ 75+',
      'Beej buwai aur halka moisture banayein.':'ਬੀਜ ਬੀਜੋ ਅਤੇ ਮਿੱਟੀ ਵਿੱਚ ਹਲਕੀ ਨਮੀ ਬਣਾਈ ਰੱਖੋ।','Ankur suraksha aur weed check karein.':'ਪੌਦਿਆਂ ਦੀ ਰੱਖਿਆ ਕਰੋ ਅਤੇ ਨਦੀਨਾਂ ਦੀ ਜਾਂਚ ਕਰੋ।','Patte aur tanon ki growth—balanced poshan dein.':'ਪੱਤਿਆਂ ਅਤੇ ਤਣਿਆਂ ਦੇ ਵਾਧੇ ਲਈ ਸੰਤੁਲਿਤ ਖੁਰਾਕ ਦਿਓ।','Phool/bali aate samay pani ki kami na hone dein.':'ਫੁੱਲ ਅਤੇ ਬੱਲੀਆਂ ਆਉਣ ਵੇਲੇ ਪਾਣੀ ਦੀ ਘਾਟ ਨਾ ਹੋਣ ਦਿਓ।','Pakne par samay se katai aur safe storage karein.':'ਫ਼ਸਲ ਪੱਕਣ ’ਤੇ ਸਮੇਂ ਸਿਰ ਕਟਾਈ ਕਰੋ ਅਤੇ ਸੁਰੱਖਿਅਤ ਸੰਭਾਲੋ।',
      'Paddy (Dhan) ko warm humid climate, fertile alluvial/clayey soil, aur regular water management pasand hai.':'ਝੋਨੇ ਲਈ ਗਰਮ ਨਮੀ ਵਾਲਾ ਮੌਸਮ, ਉਪਜਾਊ ਮੈਦਾਨੀ ਜਾਂ ਚਿਕਣੀ ਮਿੱਟੀ ਅਤੇ ਨਿਯਮਤ ਪਾਣੀ ਪ੍ਰਬੰਧ ਲੋੜੀਂਦਾ ਹੈ।','Wheat (Gehun) Rabi season ki mukhya fasal hai jise cool weather aur timely irrigation chahiye.':'ਕਣਕ ਹਾੜੀ ਦੇ ਮੌਸਮ ਦੀ ਮੁੱਖ ਫ਼ਸਲ ਹੈ। ਇਸ ਨੂੰ ਠੰਢਾ ਮੌਸਮ ਅਤੇ ਸਮੇਂ ਸਿਰ ਸਿੰਚਾਈ ਚਾਹੀਦੀ ਹੈ।','Cotton (Kapas) black cotton soil mein achha badhta hai aur pest/bollworm monitoring zaroori hoti hai.':'ਨਰਮ ਕਾਲੀ ਮਿੱਟੀ ਵਿੱਚ ਕਪਾਹ ਚੰਗੀ ਵਧਦੀ ਹੈ। ਕੀੜਿਆਂ ਅਤੇ ਟੀਂਡੇ ਦੀ ਨਿਗਰਾਨੀ ਜ਼ਰੂਰੀ ਹੈ।','Tomato (Tamatar) well-drained loamy soil mein achhi upaj deta hai aur fungal/blight care zaroori hai.':'ਚੰਗੇ ਨਿਕਾਸ ਵਾਲੀ ਦੋਮਟ ਮਿੱਟੀ ਵਿੱਚ ਟਮਾਟਰ ਦੀ ਵਧੀਆ ਪੈਦਾਵਾਰ ਹੁੰਦੀ ਹੈ। ਉੱਲੀ ਅਤੇ ਝੁਲਸ ਰੋਗ ਦਾ ਧਿਆਨ ਰੱਖੋ।',
      'Paddy':'ਝੋਨਾ','Paddy (Dhan)':'ਝੋਨਾ','Wheat':'ਕਣਕ','Cotton':'ਕਪਾਹ','Tomato':'ਟਮਾਟਰ','Alluvial Soil':'ਮੈਦਾਨੀ ਮਿੱਟੀ','Irrigated':'ਸਿੰਚਾਈ ਵਾਲੀ','Kharif':'ਸਾਉਣੀ','Rabi':'ਹਾੜੀ','Zaid':'ਜ਼ਾਇਦ','Choose file':'ਫ਼ਾਈਲ ਚੁਣੋ','No file chosen':'ਕੋਈ ਫ਼ਾਈਲ ਨਹੀਂ ਚੁਣੀ'
    }
  };
  const aliases = {hindi:'hi',english:'en',odia:'or',oriya:'or',marathi:'mr',bengali:'bn',bangla:'bn',telugu:'te',tamil:'ta',punjabi:'pa'};
  const getLang = () => { let l=(localStorage.getItem('fasalsathi_language')||'hi').toLowerCase(); return aliases[l]||l; };
  const translate = (value, lang=getLang()) => {
    if (!value || lang==='en') return value;
    const map=D[lang]; if (!map) return value;
    const trimmed=value.trim();
    if (map[trimmed]) return value.replace(trimmed,map[trimmed]);
    // Translate mixed text fragments while preserving numbers and punctuation.
    let out=trimmed;
    Object.keys(map).sort((a,b)=>b.length-a.length).forEach(k=>{
      if (/^[\w ()/+.-]+$/.test(k)) out=out.replace(new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'),map[k]);
    });
    return value.replace(trimmed,out);
  };
  window.FasalSathiTranslate = translate;
  const originals = new WeakMap();
  const attrs=['placeholder','title','aria-label'];
  const skip=new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','INPUT','CODE','PRE']);
  function walk(root=document.body){
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); let n;
    while((n=w.nextNode())){
      const p=n.parentElement; if(!p||skip.has(p.tagName)||p.closest('[data-i18n-skip],.no-translate')) continue;
      if(!originals.has(n)) originals.set(n,n.nodeValue);
      const original=originals.get(n); const result=translate(original);
      if(n.nodeValue!==result) n.nodeValue=result;
    }
    root.querySelectorAll?.('option, input[placeholder],textarea[placeholder],[title],[aria-label]').forEach(el=>{
      if(el.closest('[data-i18n-skip],.no-translate')) return;
      if(el.tagName==='OPTION'){
        if(!originals.has(el)) originals.set(el,el.textContent);
        el.textContent=translate(originals.get(el));
      }
      attrs.forEach(a=>{if(el.hasAttribute(a)){const key='data-fs-orig-'+a;if(!el.hasAttribute(key))el.setAttribute(key,el.getAttribute(a));el.setAttribute(a,translate(el.getAttribute(key)));}});
    });
  }
  let timer;
  function apply(){clearTimeout(timer);timer=setTimeout(()=>walk(),40);}
  window.addEventListener('fasalsathi:language-changed',apply);
  new MutationObserver(records=>{if(records.some(r=>r.addedNodes.length||r.type==='characterData'))apply();}).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  document.addEventListener('DOMContentLoaded',apply); setTimeout(apply,100);
})();
