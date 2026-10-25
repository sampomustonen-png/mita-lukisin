/* ---------- Kysymykset ----------
   t = näkyvä teksti kolmella kielellä, m = säännöllinen lauseke, jota verrataan kirjaston (suomenkielisiin) asiasanoihin,
   w = kysymyksen paino, filter = rajaa kirjoja, exclude = rajaa pois, quick = näkyy nopeassa kyselyssä. */
function L(fi, sv, en){ return {fi:fi, sv:sv, en:en}; }
var QUESTIONS = [
  {id:'genre', quick:true, max:3, w:5, text:L('Mitä lajityyppejä luet mieluiten?', 'Vilka genrer läser du helst?', 'Which genres do you like best?'), options:[
    {t:L('Dekkari', 'Deckare', 'Crime'), m:'^(rikoskirjallisuus|salapoliisikirjallisuus|poliisikirjallisuus|murha|murhat|poliisit|yksityisetsivät|etsivät|rikostutkinta|rikostutkijat|rikosromaanit|dekkarit)$'},
    {t:L('Trilleri', 'Thriller', 'Thriller'), m:'^(jännityskirjallisuus|psykologinen jännityskirjallisuus|thrillers.*|agentit|vakoilu|vakoilukirjallisuus|terrorismi|trillerit)$'},
    {t:L('Fantasia', 'Fantasy', 'Fantasy'), m:'^(fantasiakirjallisuus|fantasia|noidat|velhot|lohikäärmeet|taikuus|haltiat|romanttinen fantasiakirjallisuus)$'},
    {t:L('Tieteiskirjallisuus', 'Science fiction', 'Science fiction'), m:'^(tieteiskirjallisuus|science fiction.*|dystopiat|aikamatkat|avaruus|avaruusolennot|avaruusalukset|robotit|tekoäly|kloonaus)$'},
    {t:L('Kauhu', 'Skräck', 'Horror'), m:'^(kauhukirjallisuus|yliluonnolliset voimat|yliluonnolliset olennot|vampyyrit|kummitukset|demonit|zombit|aaveet|psykologinen kauhukirjallisuus)$'},
    {t:L('Historiallinen romaani', 'Historisk roman', 'Historical fiction'), m:'^(historialliset romaanit|historiallinen romaani|historiallinen jännityskirjallisuus|historialliset rakkausromaanit|historialliset seikkailuromaanit)'},
    {t:L('Rakkausromaani', 'Kärleksroman', 'Romance'), m:'^(rakkausromaanit|historialliset rakkausromaanit|romanttinen jännityskirjallisuus|romantiikka|romanttinen fantasiakirjallisuus)$'},
    {t:L('Psykologinen romaani', 'Psykologisk roman', 'Psychological fiction'), m:'^(psykologiset romaanit|psykologinen jännityskirjallisuus|psykologinen kirjallisuus)$'},
    {t:L('Sukuromaani', 'Släktroman', 'Family saga'), m:'^(sukuromaanit|sukupolvet|suvut|sukutarinat)$'},
    {t:L('Sotaromaani', 'Krigsroman', 'War fiction'), m:'^(sotaromaanit|toinen maailmansota|ensimmäinen maailmansota|sotilaat|jatkosota|talvisota|sotarintama|kotirintama|suomen sisällissota|sotakirjallisuus)$'},
    {t:L('Seikkailu', 'Äventyr', 'Adventure'), m:'^(seikkailukirjallisuus|seikkailu|historialliset seikkailuromaanit|seikkailuromaanit|seikkailut|merirosvot)$'},
    {t:L('Huumori ja satiiri', 'Humor och satir', 'Humour and satire'), m:'^(huumori|satiiri|satiirit|musta huumori|parodia|parodiat|tragikomiikka)$'},
    {t:L('Viihde ja feelgood', 'Underhållning och feelgood', 'Light and feel-good'), m:'^(viihdekirjallisuus|chick lit|feelgood-kirjallisuus|hyvän mielen kirjat)$'},
    {t:L('Runous', 'Poesi', 'Poetry'), m:'^(runot|proosarunot|runoelmat|lyriikka|runoteokset|runokokoelmat)$'},
    {t:L('Novellit', 'Noveller', 'Short stories'), m:'^(novellit|lyhytproosa|novellikokoelmat)$'},
    {t:L('Näytelmät', 'Pjäser', 'Plays'), m:'^(näytelmät|näytelmäkirjallisuus)$'}
  ]},
  {id:'style', quick:true, max:3, w:3, text:L('Millaista kerrontaa luet mieluiten?', 'Vilken sorts berättande läser du helst?', 'What kind of storytelling do you prefer?'), options:[
    {t:L('Helppolukuista ja viihdyttävää', 'Lättläst och underhållande', 'Easy and entertaining'), m:'^(viihdekirjallisuus|helppolukuiset kirjat|chick lit|feelgood-kirjallisuus)$'},
    {t:L('Vauhdikasta ja juonivetoista', 'Snabbt och handlingsdrivet', 'Fast-paced and plot-driven'), m:'^(jännityskirjallisuus|seikkailukirjallisuus|psykologinen jännityskirjallisuus|vakoilukirjallisuus)$'},
    {t:L('Henkilöihin ja tunteisiin keskittyvää', 'Fokus på personer och känslor', 'Character and emotion driven'), m:'^(psykologiset romaanit|ihmissuhteet|kehitysromaanit)$'},
    {t:L('Arkista ja realistista', 'Vardagligt och realistiskt', 'Everyday and realistic'), m:'^(arkielämä|yhteiskuntakuvaus|perhe-elämä|yhteiskunnalliset romaanit|realismi)$'},
    {t:L('Laajaa ja eeppistä', 'Brett och episkt', 'Sweeping and epic'), m:'^(sukuromaanit|historialliset romaanit|sukupolvet|sukutarinat)$'},
    {t:L('Lyhyttä ja tiivistä', 'Kort och koncentrerat', 'Short and concise'), m:'^(pienoisromaanit|lyhytproosa|novelliromaanit)$'},
    {t:L('Hauskaa tai satiirista', 'Roligt eller satiriskt', 'Funny or satirical'), m:'^(huumori|satiiri|satiirit|musta huumori|tragikomiikka)$'},
    {t:L('Runollista ja kielellisesti rikasta', 'Poetiskt och språkligt rikt', 'Poetic and richly written'), m:'^(runoromaanit|säeromaanit|proosarunot|lyyrinen proosa|lyhytproosa)$'},
    {t:L('Pohdiskelevaa ja filosofista', 'Reflekterande och filosofiskt', 'Reflective and philosophical'), m:'^(filosofiset romaanit|elämänfilosofia|filosofia|eksistentialismi)$'},
    {t:L('Omaelämäkerrallista', 'Självbiografiskt', 'Autobiographical'), m:'^(autofiktio|autofiktion|omaelämäkerrallisuus)$'},
    {t:L('Vertauskuvallista tai maagista', 'Allegoriskt eller magiskt', 'Allegorical or magical'), m:'^(allegoriat|vertauskuvat|symbolismi|maaginen realismi|faabelit)$'},
    {t:L('Kokeellista ja rajoja rikkovaa', 'Experimentellt och gränsöverskridande', 'Experimental and boundary-breaking'), m:'^(kokeelliset romaanit|kokeellinen kirjallisuus|kokeellinen proosa|metafiktio|postmodernismi|modernismi|avantgarde|tajunnanvirtakirjallisuus|tajunnanvirta|fragmentit|absurdi|absurdismi|surrealismi)$'},
    {t:L('Palkittua', 'Prisbelönt', 'Award-winning'), m:'^(kirjallisuuspalkinnot|finlandia-palkinto|nobelin kirjallisuuspalkinto)$'}
  ]},
  {id:'mood', quick:true, max:3, w:2, text:L('Millainen tunnelman pitäisi olla?', 'Vilken stämning vill du ha?', 'What mood are you after?'), options:[
    {t:L('Lämmin', 'Varm', 'Warm'), m:'^(ystävyys|yhteisöt|kyläyhteisöt|yhteisöllisyys|feelgood-kirjallisuus|viihdekirjallisuus)$'},
    {t:L('Haikea', 'Vemodig', 'Wistful'), m:'^(yksinäisyys|menetys|suru|kaipaus|surutyö|luopuminen|melankolia|kuolema)$'},
    {t:L('Jännittävä', 'Spännande', 'Suspenseful'), m:'^(jännityskirjallisuus|psykologinen jännityskirjallisuus|pako|takaa-ajo|vaarat)$'},
    {t:L('Synkkä', 'Mörk', 'Dark'), m:'^(traumat|kauhukirjallisuus|väkivalta|itsemurha|pahuus|perheväkivalta|julmuus|kärsimys|sarjamurhaajat)$'},
    {t:L('Humoristinen', 'Humoristisk', 'Humorous'), m:'^(huumori|satiiri|satiirit|musta huumori|tragikomiikka)$'},
    {t:L('Arvoituksellinen', 'Gåtfull', 'Mysterious'), m:'^(salaisuudet|perhesalaisuudet|mysteerit|arvoitukset|katoamiset|kadonneet)$'},
    {t:L('Unenomainen', 'Drömlik', 'Dreamlike'), m:'^(maaginen realismi|unet|surrealismi|fantastinen kirjallisuus)$'},
    {t:L('Toiveikas', 'Hoppfull', 'Hopeful'), m:'^(selviytyminen|anteeksianto|toivo|uusi alku|eheytyminen|sovinto)$'}
  ]},
  {id:'origin', quick:true, max:1, filter:true, text:L('Kotimaista vai käännöskirjallisuutta?', 'Inhemskt eller översatt?', 'Finnish or translated?'), options:[
    {t:L('Kotimaista', 'Inhemskt', 'Finnish')}, {t:L('Käännöksiä', 'Översättningar', 'Translated')}, {t:L('Molempia', 'Båda', 'Both')}
  ]},
  {id:'age', quick:true, def:4, max:1, filter:true, text:L('Uutuuksia vai klassikoita?', 'Nytt eller klassiker?', 'New or classic?'), options:[
    {t:L('Uudet, 2015 alkaen', 'Nya, från 2015', 'New, from 2015')}, {t:L('2000–2014', '2000–2014', '2000–2014')}, {t:L('1960–1999', '1960–1999', '1960–1999')},
    {t:L('Klassikot, ennen 1960', 'Klassiker, före 1960', 'Classics, before 1960')}, {t:L('Ei väliä', 'Spelar ingen roll', 'Any')}, {t:L('Oma aikaväli', 'Egen tidsperiod', 'Custom range')}
  ]},
  {id:'known', quick:true, def:1, max:1, filter:true, text:L('Tunnettuja kirjoja vai löytöjä?', 'Kända böcker eller upptäckter?', 'Well-known books or discoveries?'), options:[
    {t:L('Tunnettuja ja suosittuja', 'Kända och populära', 'Well-known and popular')}, {t:L('Sekä että', 'Både och', 'A mix')}, {t:L('Löytöjä', 'Upptäckter', 'Discoveries')}
  ]},
  {id:'era', max:2, w:2, text:L('Mihin aikaan tarina saa sijoittua?', 'När får berättelsen utspela sig?', 'When should the story be set?'), options:[
    {t:L('Keskiaika tai varhaisempi', 'Medeltiden eller tidigare', 'Middle Ages or earlier'), m:'^(keskiaika|antiikki|viikingit|esihistoria|1[0-4]00-luku|rautakausi|ristiretket)$'},
    {t:L('1500–1700-luku', '1500–1700-talet', '16th–18th century'), m:'^(1[5-7]00-luku|1[5-7][0-9]0-luku|isoviha|renessanssi|uskonpuhdistus|uskonpuhdistusaika)$'},
    {t:L('1800-luku', '1800-talet', '19th century'), m:'^(1800-luku|18[0-9]0-luku|nälkävuodet)$'},
    {t:L('1900-luvun alku ja sotavuodet', 'Tidigt 1900-tal och krigsåren', 'Early 1900s and the war years'), m:'^(19[0-4]0-luku|toinen maailmansota|ensimmäinen maailmansota|jatkosota|talvisota|suomen sisällissota|evakot)$'},
    {t:L('1950–1990-luku', '1950–1990-talet', '1950s–1990s'), m:'^(19[5-9]0-luku|lama|kylmä sota|jälleenrakennus)$'},
    {t:L('Nykyaika', 'Nutid', 'Present day'), m:'^(20[0-2]0-luku|2000-luku|nykyaika|internet|sosiaalinen media)$'},
    {t:L('Tulevaisuus', 'Framtiden', 'The future'), m:'^(tieteiskirjallisuus|dystopiat|tulevaisuus|lähitulevaisuus|ilmastonmuutokset|ilmastonmuutos)$'}
  ]},
  {id:'place', max:2, w:2, text:L('Missä tarina tapahtuu?', 'Var utspelar sig berättelsen?', 'Where is the story set?'), options:[
    {t:L('Suomalainen kylä tai pikkukaupunki', 'Finländsk by eller småstad', 'Finnish village or small town'), m:'^(maaseutu|kylät|pikkukaupungit|maaseuturomaanit|karjala|pohjanmaa|etelä-pohjanmaa|savo|kainuu|maalaisyhteisöt|kyläyhteisöt)$'},
    {t:L('Helsinki ja muut kaupungit', 'Helsingfors och andra städer', 'Helsinki and other cities'), m:'^(kaupungit|helsinki|tampere|turku|oulu|jyväskylä|kuopio|kaupunkilaiset|suurkaupungit|kaupunkielämä)$'},
    {t:L('Saaristo ja meri', 'Skärgård och hav', 'Archipelago and sea'), m:'^(saaret|saaristot|saaristo|merimatkat|merikirjallisuus|meri|merenkulku|merimiehet|ahvenanmaa|rannikot|majakat)$'},
    {t:L('Lappi ja erämaa', 'Lappland och vildmark', 'Lapland and wilderness'), m:'^(lappi|lappi \\(suomi\\)|erämaat|saamelaiset|tunturit|lappilaiset|poronhoito)$'},
    {t:L('Muu Pohjola', 'Övriga Norden', 'Other Nordic countries'), m:'^(ruotsi|tukholma|norja|islanti|viro|tanska|kööpenhamina|oslo|tallinna)$'},
    {t:L('Muualla Euroopassa', 'På andra håll i Europa', 'Elsewhere in Europe'), m:'^(iso-britannia|englanti|ranska|lontoo|venäjä|italia|saksa|pariisi|espanja|irlanti|skotlanti|kreikka|berliini|rooma|pietari|puola)$'},
    {t:L('Euroopan ulkopuolella', 'Utanför Europa', 'Outside Europe'), m:'^(yhdysvallat|new york|new york \\(kaupunki\\)|afrikka|kanada|kiina|japani|intia|australia|meksiko|kalifornia|etelä-amerikka|aasia)$'},
    {t:L('Keksitty maailma', 'Påhittad värld', 'Invented world'), m:'^(fantasiakirjallisuus|fantasia|avaruus|planeetat|avaruusolennot|avaruusalukset|rinnakkaistodellisuudet|kuvitteelliset maat)$'}
  ]},
  {id:'hero', max:2, w:1.5, text:L('Kenen tarinaa haluat seurata?', 'Vems berättelse vill du följa?', 'Whose story do you want to follow?'), options:[
    {t:L('Naisen', 'En kvinnas', 'A woman’s'), m:'^(naiset|äidit|tyttäret|isoäidit|naiseus|leskinaiset)$'},
    {t:L('Miehen', 'En mans', 'A man’s'), m:'^(miehet|isät|pojat|pojat \\(perheenjäsenet\\)|isoisät|miehisyys)$'},
    {t:L('Nuoren', 'En ung persons', 'A young person’s'), m:'^(nuoret|nuoret aikuiset|nuoruus|opiskelijat)$'},
    {t:L('Vanhuksen', 'En äldre persons', 'An older person’s'), m:'^(vanhukset|eläkeläiset|ikääntyneet|vanhuus)$'},
    {t:L('Lapsen', 'Ett barns', 'A child’s'), m:'^(lapset|lapsuus|lapset \\(ikäryhmät\\)|lapset \\(perheenjäsenet\\)|entisajan lapsuus)$'},
    {t:L('Perheen tai suvun', 'En familjs eller släkts', 'A family’s'), m:'^(perheet|perhe-elämä|sisarukset|suvut|uusperheet|lapsiperheet|sukuromaanit)$'}
  ]},
  {id:'theme', max:3, w:2.5, text:L('Mitkä aiheet koskettavat sinua?', 'Vilka ämnen berör dig?', 'Which themes move you?'), options:[
    {t:L('Rakkaus', 'Kärlek', 'Love'), m:'^(rakkausromaanit|rakkaus|avioliitto|rakkaussuhde|onneton rakkaus|parisuhde|parisuhteet|ihastuminen)$'},
    {t:L('Perhe ja suku', 'Familj och släkt', 'Family'), m:'^(perheet|sisarukset|suvut|perhesuhteet|vanhemmat|uusperheet|äiti-tytärsuhde|isä-poikasuhde|sukuromaanit|sukupolvet)$'},
    {t:L('Ystävyys', 'Vänskap', 'Friendship'), m:'^(ystävyys|ystävät|lapsuudenystävät)$'},
    {t:L('Syyllisyys ja kosto', 'Skuld och hämnd', 'Guilt and revenge'), m:'^(kosto|syyllisyys|häpeä|anteeksianto|katumus)$'},
    {t:L('Valta ja yhteiskunta', 'Makt och samhälle', 'Power and society'), m:'^(valtataistelu|yhteiskuntakuvaus|yhteiskunta|politiikka|valta|korruptio|luokkaerot|eriarvoisuus|diktatuuri|poliitikot|yhteiskunnalliset olot)$'},
    {t:L('Vapaus ja matkat', 'Frihet och resor', 'Freedom and journeys'), m:'^(matkat|pako|muutto|pakolaiset|pakomatkat|siirtolaisuus|siirtolaiset|matkustaminen|vapaus|maastamuutto)$'},
    {t:L('Identiteetti', 'Identitet', 'Identity'), m:'^(identiteetti|seksuaalisuus|maahanmuuttajat|homoseksuaalisuus|sukupuoli-identiteetti|transsukupuolisuus|vähemmistöt|juuret|seksuaalivähemmistöt)$'},
    {t:L('Muisti ja menetys', 'Minne och förlust', 'Memory and loss'), m:'^(muistot|menetys|suru|kuolema|muistinmenetys|dementia|surutyö)$'},
    {t:L('Luonto ja eläimet', 'Natur och djur', 'Nature and animals'), m:'^(eläimet|lemmikkieläimet|luonto|metsät|linnut|koirat|kissat|hevoset|luonnonsuojelu|ympäristö)$'},
    {t:L('Usko ja epäily', 'Tro och tvivel', 'Faith and doubt'), m:'^(usko|uskonnolliset yhteisöt|kristinusko|uskonto|uskonnot|herätysliikkeet|lestadiolaisuus|papit|kirkko|jumala|epäusko)$'},
    {t:L('Kasvu ja aikuistuminen', 'Uppväxt', 'Coming of age'), m:'^(aikuistuminen|kasvu|murrosikä|henkinen kasvu|kasvu \\(ihmisen\\)|kasvukertomukset|kehitysromaanit)$'},
    {t:L('Työ ja arki', 'Arbete och vardag', 'Work and everyday life'), m:'^(arkielämä|työ|arki|työyhteisöt|työelämä|ammatit|työttömyys)$'},
    {t:L('Mieli ja mielenterveys', 'Psykisk hälsa', 'Mind and mental health'), m:'^(mielenterveyshäiriöt|ahdistus|riippuvuus|mielenterveysongelmat|masennus|psyykkisesti sairaat|mielisairaudet|alkoholismi)$'}
  ]},
  {id:'length', def:3, max:1, filter:true, text:L('Kuinka pitkä kirjan pitäisi olla?', 'Hur lång ska boken vara?', 'How long should the book be?'), options:[
    {t:L('Lyhyt, alle 200 sivua', 'Kort, under 200 sidor', 'Short, under 200 pages')}, {t:L('Keskipitkä, 200–400 sivua', 'Medellång, 200–400 sidor', 'Medium, 200–400 pages')},
    {t:L('Pitkä, yli 400 sivua', 'Lång, över 400 sidor', 'Long, over 400 pages')}, {t:L('Ei väliä', 'Spelar ingen roll', 'Any')}
  ]},
  {id:'reader', def:0, max:1, filter:true, text:L('Kenelle kirja on kirjoitettu?', 'Vem är boken skriven för?', 'Who is the book written for?'), options:[
    {t:L('Aikuisille', 'Vuxna', 'Adults')}, {t:L('Nuorille ja nuorille aikuisille', 'Unga och unga vuxna', 'Teens and young adults')}, {t:L('Ei väliä', 'Spelar ingen roll', 'Any')}
  ]},
  {id:'audio', max:1, filter:true, text:L('Pitääkö kirjasta olla äänikirja?', 'Ska boken finnas som ljudbok?', 'Must there be an audiobook?'), options:[
    {t:L('Kyllä', 'Ja', 'Yes')}, {t:L('Ei väliä', 'Spelar ingen roll', 'Any')}
  ]}
];

/* Tunnelmasäätimet: arvo −2…2. Negatiivinen suosii vasenta päätä, positiivinen oikeaa. */
var SLIDERS = [
  {id:'tone', left:L('Iloinen', 'Glad', 'Cheerful'), right:L('Synkkä', 'Mörk', 'Dark'),
   lm:'^(huumori|feelgood-kirjallisuus|viihdekirjallisuus|ystävyys|satiiri|tragikomiikka|hyvän mielen kirjat)$',
   rm:'^(väkivalta|kuolema|traumat|itsemurha|julmuus|pahuus|kärsimys|sota|kauhukirjallisuus|perheväkivalta|sarjamurhaajat)$'},
  {id:'weight', left:L('Kevyt', 'Lätt', 'Light'), right:L('Vaativa', 'Krävande', 'Demanding'),
   lm:'^(viihdekirjallisuus|helppolukuiset kirjat|chick lit|feelgood-kirjallisuus|rakkausromaanit|jännityskirjallisuus)$',
   rm:'^(filosofiset romaanit|kokeelliset romaanit|kokeellinen kirjallisuus|modernismi|metafiktio|tajunnanvirtakirjallisuus|kirjallisuuspalkinnot|nobelin kirjallisuuspalkinto)$'},
  {id:'form', left:L('Tavanomainen', 'Traditionell', 'Conventional'), right:L('Kokeellinen', 'Experimentell', 'Experimental'),
   lm:'^(viihdekirjallisuus|rakkausromaanit|jännityskirjallisuus|sukuromaanit|historialliset romaanit|rikoskirjallisuus)$',
   rm:'^(kokeelliset romaanit|kokeellinen kirjallisuus|kokeellinen proosa|metafiktio|postmodernismi|surrealismi|absurdi|absurdismi|fragmentit|runoromaanit|tajunnanvirta)$'},
  {id:'pace', left:L('Rauhallinen', 'Lugn', 'Calm'), right:L('Vauhdikas', 'Snabb', 'Fast'),
   lm:'^(arkielämä|luonto|muistot|maaseutu|kehitysromaanit|elämänfilosofia|vanhuus|maaseuturomaanit)$',
   rm:'^(jännityskirjallisuus|seikkailukirjallisuus|takaa-ajo|pako|vakoilu|trillerit|toiminta|psykologinen jännityskirjallisuus)$'}
];

/* Pikavalinnat: valmiit vastaukset kysymyksiin (vaihtoehtojen järjestysnumerot) */
var PRESETS = [
  [L('Juuri nyt suosittua', 'Populärt just nu', 'Popular right now'), {now:true}],
  [L('Kotimainen dekkari', 'Inhemsk deckare', 'Finnish crime'), {genre:[0], origin:[0]}],
  [L('Feelgood', 'Feelgood', 'Feel-good'), {genre:[12], mood:[0]}],
  [L('Synkkä trilleri', 'Mörk thriller', 'Dark thriller'), {genre:[1], mood:[3]}],
  [L('Suuri historiallinen tarina', 'Stor historisk berättelse', 'Big historical story'), {genre:[5, 8]}],
  [L('Fantasiaa ja scifiä', 'Fantasy och sf', 'Fantasy and sci-fi'), {genre:[2, 3]}],
  [L('Hauskaa luettavaa', 'Rolig läsning', 'Something funny'), {genre:[11], mood:[4]}],
  [L('Runoja', 'Dikter', 'Poetry'), {genre:[13]}],
  [L('Novelleja', 'Noveller', 'Short stories'), {genre:[14]}],
  [L('Näytelmiä', 'Pjäser', 'Plays'), {genre:[15]}],
  [L('Kokeellinen', 'Experimentellt', 'Experimental'), {style:[11]}],
  [L('Kaunokirjallinen', 'Skönlitterärt', 'Literary'), {style:[2, 7, 8]}],
  [L('Palkittu', 'Prisbelönt', 'Award-winning'), {style:[12]}],
  [L('Löytöjä', 'Upptäckter', 'Discoveries'), {known:[2]}],
  [L('Uutuudet', 'Nyheter', 'New releases'), {age:[0]}],
  [L('Klassikot', 'Klassiker', 'Classics'), {age:[3]}]
];

/* ---------- Tietokirjat ----------
   Aiheet perustuvat kirjastojen YKL-luokitukseen ja asiasanoihin. Aineiston käsittely (scripts/nf_process.py)
   lisää jokaiselle kirjalle aiheluokan merkinnän (@historia, @tiede …), johon aihekysymys vertaa. */
var NOV_QUESTIONS = QUESTIONS, NOV_SLIDERS = SLIDERS, NOV_PRESETS = PRESETS;
var NF_QUESTIONS = [
  {id:'genre', quick:true, max:3, w:5, text:L('Mistä aiheista haluat lukea?', 'Vilka ämnen vill du läsa om?', 'Which topics interest you?'), options:[
    {t:L('Elämäkerrat ja muistelmat', 'Biografier och memoarer', 'Biographies and memoirs'), m:'^@elamakerrat$'},
    {t:L('Historia', 'Historia', 'History'), m:'^@historia$'},
    {t:L('Sotahistoria', 'Krigshistoria', 'Military history'), m:'^@sota$'},
    {t:L('Yhteiskunta ja politiikka', 'Samhälle och politik', 'Society and politics'), m:'^@yhteiskunta$'},
    {t:L('Talous ja työelämä', 'Ekonomi och arbetsliv', 'Economy and work'), m:'^@talous$'},
    {t:L('Tiede ja teknologia', 'Vetenskap och teknik', 'Science and technology'), m:'^@tiede$'},
    {t:L('Luonto ja eläimet', 'Natur och djur', 'Nature and animals'), m:'^@luonto$'},
    {t:L('Terveys ja hyvinvointi', 'Hälsa och välmående', 'Health and wellbeing'), m:'^@terveys$'},
    {t:L('Psykologia ja ihmissuhteet', 'Psykologi och relationer', 'Psychology and relationships'), m:'^@psykologia$'},
    {t:L('Filosofia ja uskonto', 'Filosofi och religion', 'Philosophy and religion'), m:'^@filosofia$'},
    {t:L('Taide, musiikki ja kulttuuri', 'Konst, musik och kultur', 'Art, music and culture'), m:'^@kulttuuri$'},
    {t:L('Kirjallisuus ja kieli', 'Litteratur och språk', 'Literature and language'), m:'^@kirjallisuus$'},
    {t:L('Matkat ja maat', 'Resor och länder', 'Travel and places'), m:'^@matkat$'},
    {t:L('Rikokset ja oikeus', 'Brott och rätt', 'Crime and justice'), m:'^@rikos$'},
    {t:L('Urheilu ja liikunta', 'Idrott och motion', 'Sport and exercise'), m:'^@urheilu$'},
    {t:L('Ruoka ja juoma', 'Mat och dryck', 'Food and drink'), m:'^@ruoka$'},
    {t:L('Koti, puutarha ja käsityöt', 'Hem, trädgård och hantverk', 'Home, garden and crafts'), m:'^@koti$'},
    {t:L('Perhe ja kasvatus', 'Familj och uppfostran', 'Family and parenting'), m:'^@perhe$'}
  ]},
  {id:'style', quick:true, max:2, w:3, text:L('Millaista otetta toivot?', 'Vilket grepp önskar du?', 'What kind of approach do you prefer?'), options:[
    {t:L('Henkilökohtainen ja kokemuksellinen', 'Personligt och upplevt', 'Personal and first-hand'), m:'^(muistelmat|omaelämäkerrat|kokemukset|kokemuskertomukset|päiväkirjat|kirjeet|elämäntarinat|@muistelmat)$'},
    {t:L('Esseistinen ja pohdiskeleva', 'Essäistiskt och reflekterande', 'Essayistic and reflective'), m:'^(esseet|esseekokoelmat|pakinat|kolumnit|aforismit|pohdinnat|@esseet)$'},
    {t:L('Journalistinen ja tutkiva', 'Journalistiskt och granskande', 'Journalistic and investigative'), m:'^(reportaasit|journalismi|tutkiva journalismi|haastattelut|tietokirjallisuus \\(journalismi\\)|@reportaasi)$'},
    {t:L('Yleistajuinen tietopaketti', 'Populärvetenskapligt', 'Popular science'), m:'^(yleistajuiset esitykset|populaaritiede|tiedeviestintä|@tietopaketti)$'},
    {t:L('Käytännöllinen opas', 'Praktisk guide', 'Practical guide'), m:'^(oppaat|oppaat \\(teokset\\)|ruokaohjeet|keittokirjat|käsityöohjeet|ohjeet|harjoitukset|@opas)$'},
    {t:L('Kuvateos', 'Bildverk', 'Illustrated book'), m:'^(kuvateokset|valokuvateokset|valokuvat|@kuvateos)$'}
  ]},
  {id:'place', max:2, w:2, text:L('Mitä aluetta kirja saa käsitellä?', 'Vilket område får boken handla om?', 'Which part of the world?'), options:[
    {t:L('Suomi', 'Finland', 'Finland'), m:'^(suomi|helsinki|tampere|turku|oulu|lappi|karjala|pohjanmaa|savo|häme|uusimaa|kainuu|ahvenanmaa|suomalaiset|suomalaisuus)$'},
    {t:L('Muut Pohjoismaat ja Baltia', 'Övriga Norden och Baltikum', 'Other Nordic and Baltic countries'), m:'^(ruotsi|norja|tanska|islanti|viro|latvia|liettua|pohjoismaat|baltian maat|tukholma|tallinna)$'},
    {t:L('Venäjä ja Itä-Eurooppa', 'Ryssland och Östeuropa', 'Russia and Eastern Europe'), m:'^(venäjä|neuvostoliitto|ukraina|puola|itä-eurooppa|valko-venäjä|pietari|moskova|siperia|balkan|unkari|tšekki)$'},
    {t:L('Muu Eurooppa', 'Övriga Europa', 'Rest of Europe'), m:'^(eurooppa|saksa|ranska|iso-britannia|englanti|italia|espanja|kreikka|irlanti|skotlanti|alankomaat|sveitsi|itävalta|portugali|lontoo|pariisi|rooma|berliini|euroopan unioni)$'},
    {t:L('Pohjois- ja Etelä-Amerikka', 'Nord- och Sydamerika', 'The Americas'), m:'^(yhdysvallat|kanada|meksiko|etelä-amerikka|latinalainen amerikka|brasilia|argentiina|kuuba|new york|kalifornia|amerikka)$'},
    {t:L('Aasia ja Lähi-itä', 'Asien och Mellanöstern', 'Asia and the Middle East'), m:'^(aasia|kiina|japani|intia|korea|pohjois-korea|etelä-korea|thaimaa|vietnam|indonesia|lähi-itä|israel|iran|irak|syyria|afganistan|turkki|arabimaat|tiibet|nepal)$'},
    {t:L('Afrikka', 'Afrika', 'Africa'), m:'^(afrikka|egypti|etelä-afrikka|kenia|tansania|namibia|etiopia|somalia|nigeria|kongo|marokko|ghana|sambia)$'},
    {t:L('Avaruus ja maailmankaikkeus', 'Rymden och universum', 'Space and the universe'), m:'^(avaruus|maailmankaikkeus|tähtitiede|planeetat|avaruustutkimus|avaruuslennot|kosmologia|aurinkokunta)$'}
  ]},
  {id:'era', max:2, w:2, text:L('Mitä aikaa kirja saa käsitellä?', 'Vilken tid får boken handla om?', 'Which period should it cover?'), options:[
    {t:L('Esihistoria ja antiikki', 'Förhistoria och antiken', 'Prehistory and antiquity'), m:'^(esihistoria|antiikki|kivikausi|pronssikausi|rautakausi|muinaishistoria|antiikin kreikka|antiikin rooma|egyptologia|evoluutio)$'},
    {t:L('Keskiaika', 'Medeltiden', 'Middle Ages'), m:'^(keskiaika|viikingit|ristiretket|viikinkiaika|1[0-4]00-luku)$'},
    {t:L('1500–1800-luku', '1500–1800-talet', '16th–19th century'), m:'^(1[5-8]00-luku|1[5-8][0-9]0-luku|isoviha|renessanssi|uskonpuhdistus|ruotsin vallan aika|autonomian aika|nälkävuodet)$'},
    {t:L('1900-luvun alku ja sotavuodet', 'Tidigt 1900-tal och krigsåren', 'Early 1900s and the war years'), m:'^(19[0-4]0-luku|toinen maailmansota|ensimmäinen maailmansota|jatkosota|talvisota|suomen sisällissota|lapin sota|evakot)$'},
    {t:L('1950–1990-luku', '1950–1990-talet', '1950s–1990s'), m:'^(19[5-9]0-luku|kylmä sota|jälleenrakennus|lama|kekkonen, urho)$'},
    {t:L('Nykyaika ja tulevaisuus', 'Nutid och framtid', 'Today and the future'), m:'^(20[0-2]0-luku|2000-luku|nykyaika|tulevaisuus|ilmastonmuutokset|tekoäly|digitalisaatio|sosiaalinen media|internet)$'}
  ]},
  {id:'origin', quick:true, max:1, filter:true, text:L('Kotimaista vai käännettyä?', 'Inhemskt eller översatt?', 'Finnish or translated?'), options:[
    {t:L('Kotimaista', 'Inhemskt', 'Finnish')}, {t:L('Käännöksiä', 'Översättningar', 'Translated')}, {t:L('Molempia', 'Båda', 'Both')}
  ]},
  {id:'age', quick:true, def:4, max:1, filter:true, text:L('Uutuuksia vai vanhempia kirjoja?', 'Nytt eller äldre?', 'New or older books?'), options:[
    {t:L('Uudet, 2015 alkaen', 'Nya, från 2015', 'New, from 2015')}, {t:L('2000–2014', '2000–2014', '2000–2014')}, {t:L('1960–1999', '1960–1999', '1960–1999')},
    {t:L('Vanhemmat, ennen 1960', 'Äldre, före 1960', 'Older, before 1960')}, {t:L('Ei väliä', 'Spelar ingen roll', 'Any')}, {t:L('Oma aikaväli', 'Egen tidsperiod', 'Custom range')}
  ]},
  {id:'known', quick:true, def:1, max:1, filter:true, text:L('Tunnettuja kirjoja vai löytöjä?', 'Kända böcker eller upptäckter?', 'Well-known books or discoveries?'), options:[
    {t:L('Tunnettuja ja suosittuja', 'Kända och populära', 'Well-known and popular')}, {t:L('Sekä että', 'Både och', 'A mix')}, {t:L('Löytöjä', 'Upptäckter', 'Discoveries')}
  ]},
  {id:'length', def:3, max:1, filter:true, text:L('Kuinka pitkä kirjan pitäisi olla?', 'Hur lång ska boken vara?', 'How long should the book be?'), options:[
    {t:L('Lyhyt, alle 200 sivua', 'Kort, under 200 sidor', 'Short, under 200 pages')}, {t:L('Keskipitkä, 200–400 sivua', 'Medellång, 200–400 sidor', 'Medium, 200–400 pages')},
    {t:L('Pitkä, yli 400 sivua', 'Lång, över 400 sidor', 'Long, over 400 pages')}, {t:L('Ei väliä', 'Spelar ingen roll', 'Any')}
  ]},
  {id:'audio', max:1, filter:true, text:L('Pitääkö kirjasta olla äänikirja?', 'Ska boken finnas som ljudbok?', 'Must there be an audiobook?'), options:[
    {t:L('Kyllä', 'Ja', 'Yes')}, {t:L('Ei väliä', 'Spelar ingen roll', 'Any')}
  ]}
];
var NF_SLIDERS = [];
var NF_PRESETS = [
  [L('Juuri nyt suosittua', 'Populärt just nu', 'Popular right now'), {now:true}],
  [L('Elämäkerrat ja muistelmat', 'Biografier och memoarer', 'Biographies and memoirs'), {genre:[0]}],
  [L('Suomen historia', 'Finlands historia', 'Finnish history'), {genre:[1], place:[0]}],
  [L('Sotahistoria', 'Krigshistoria', 'Military history'), {genre:[2]}],
  [L('Tiede', 'Vetenskap', 'Science'), {genre:[5], style:[3]}],
  [L('Luonto', 'Natur', 'Nature'), {genre:[6]}],
  [L('Hyvinvointi', 'Välmående', 'Wellbeing'), {genre:[7, 8]}],
  [L('Yhteiskunta', 'Samhälle', 'Society'), {genre:[3, 4]}],
  [L('Matkat', 'Resor', 'Travel'), {genre:[12]}],
  [L('Ruoka', 'Mat', 'Food'), {genre:[15]}],
  [L('True crime', 'True crime', 'True crime'), {genre:[13]}],
  [L('Löytöjä', 'Upptäckter', 'Discoveries'), {known:[2]}],
  [L('Uutuudet', 'Nyheter', 'New releases'), {age:[0]}]
];

/* Perusteluja varten jokainen vaihtoehto tietää, mihin kysymykseen se kuuluu */
[NOV_QUESTIONS, NF_QUESTIONS].forEach(function(qs){ qs.forEach(function(q){ q.options.forEach(function(o){ o.q = q.id; }); }); });
