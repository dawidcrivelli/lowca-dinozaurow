/* ================= BAZA GATUNKÓW =================
   Mezozoik + kilku słynnych gości z innych epok.
   Grupy: dino | ptero | morskie | inne  (żeby dzieci nie utrwaliły sobie,
   że pterozaur albo dimetrodon to dinozaur).

   Wiersz: [id, polska nazwa, łacina, archetyp, opcje rysunku, podpowiedź,
            ciekawostka, rzadkość 1-4, typ areny, grupa, dieta, długość m, aliasy]
   Typy areny: drap | olbrzym | pancerz | zwinny | wodny
   Dieta: M mięsożerca · R roślinożerca · W wszystkożerca · Ry rybożerca
*/

const PAL = [
  ['#7FA86B', '#C9D98A', '#1E3320'], // 0  szałwiowa zieleń
  ['#4E9C93', '#A6DACD', '#123C38'], // 1  petrol
  ['#D2764A', '#F2C48B', '#4A2415'], // 2  rdza
  ['#D9B26F', '#F3E0AE', '#4A3418'], // 3  piasek
  ['#6E8CA8', '#BCD4E3', '#1F3040'], // 4  błękit skalny
  ['#96637F', '#DBB1C5', '#3A1F2E'], // 5  śliwka
  ['#4F7A4A', '#A9CB8C', '#1B2E19'], // 6  las
  ['#B65340', '#EBA687', '#40170F'], // 7  cegła
  ['#C9A227', '#F2E09C', '#453309'], // 8  musztarda
  ['#7C8794', '#C6CED6', '#252B31'], // 9  łupek
  ['#3F8FA6', '#9DD7E2', '#0F3340'], // 10 turkus
  ['#8C6A52', '#D5B695', '#33231A'], // 11 kakao
  ['#8A9440', '#D6DD94', '#2B3010'], // 12 oliwka
  ['#E08A6A', '#F8CBB2', '#4D2417'], // 13 koral
  ['#5A6BA8', '#B3BFE8', '#1C2246'], // 14 indygo
  ['#6B8E5A', '#BCD79D', '#22331A'], // 15 mech
  ['#A85B36', '#E6B38B', '#3A1B0D'], // 16 ochra
  ['#2F6E8F', '#92C6D8', '#0C2734'], // 17 głębina
];

const RAW = [
  /* ---------------- TEROPODY ---------------- */
  ['trex','Tyranozaur','Tyrannosaurus rex','thero',{p:6,dp:1,sn:46,belly:1,arm:8,sc:1.06},
    'Król drapieżników: ogromna głowa i śmiesznie małe rączki','Jego ugryzienie było najsilniejsze ze wszystkich zwierząt lądowych — miażdżyło kości.',4,'drap','dino','M',12,['trex','t rex','rex','tyranozaur rex','tyrannosaurus']],
  ['giganoto','Gigantozaur','Giganotosaurus','thero',{p:16,dp:1,sn:44,sc:1.04},
    'Był nawet dłuższy niż tyranozaur, ale miał węższą głowę','Polował w Argentynie na wielkie zauropody, prawdopodobnie w grupach.',4,'drap','dino','M',13,['gigantozaur','giganotozaur','giganotosaurus']],
  ['spino','Spinozaur','Spinosaurus','thero',{p:10,sail:1,sn:50},
    'Nosi wielki żagiel na plecach i łowi ryby','Najdłuższy znany drapieżny dinozaur — pływał i miał wiosłowaty ogon.',4,'drap','dino','Ry',15,['spinozaur','spinosaurus','spino']],
  ['allo','Allozaur','Allosaurus','thero',{p:2,hrn:2,sn:38},
    'Największy łowca jurajskiej Ameryki, ma rożki nad oczami','Znaleziono go w Kamieniołomie Cleveland-Lloyd w setkach egzemplarzy.',3,'drap','dino','M',9,['allozaur','allosaurus','allo']],
  ['carno','Karnotaur','Carnotaurus','thero',{p:7,hrn:1,sn:28,arm:5},
    'Byk wśród dinozaurów: dwa rogi jak u byka','Miał najkrótsze ręce ze wszystkich dużych teropodów i biegał bardzo szybko.',3,'drap','dino','M',8,['karnotaur','carnotaurus','karnotaurus']],
  ['cerato','Ceratozaur','Ceratosaurus','thero',{p:12,nose:1,sn:36},
    'Ma róg na czubku nosa','Poza rogiem miał też rządek kostnych płytek wzdłuż grzbietu.',3,'drap','dino','M',6,['ceratozaur','ceratosaurus']],
  ['dilo','Dilofozaur','Dilophosaurus','thero',{p:1,cr2:1,sn:36,sc:.95},
    'Dwa grzebienie na głowie jak podwójny kogut','W filmach pluje jadem — naprawdę nikt tego nie potwierdził, to wymysł.',3,'drap','dino','M',7,['dilofozaur','dilophosaurus','dilofosaurus']],
  ['velo','Welociraptor','Velociraptor','thero',{p:3,rap:1,sn:30,clw:2,sc:.85},
    'Mały raptor z sierpowym pazurem, wielkości indyka','Był pokryty piórami, a jego pazur służył do przytrzymywania ofiary.',2,'zwinny','dino','M',2,['welociraptor','velociraptor','raptor','veloc']],
  ['deino','Deinonych','Deinonychus','thero',{p:2,rap:1,sn:32,clw:2,sc:.92},
    'To jego naprawdę pokazano w filmach jako „welociraptora”','To on zainspirował filmowe raptory — był dwa razy większy niż welociraptor.',3,'zwinny','dino','M',3,['deinonych','deinonychus','deinonyk']],
  ['utah','Utahraptor','Utahraptor','thero',{p:7,rap:1,sn:36,clw:2,sc:1.02},
    'Największy raptor świata, nazwany od stanu w USA','Jego pazur na stopie miał 24 cm — jak duży nóż kuchenny.',4,'drap','dino','M',6,['utahraptor','utaraptor']],
  ['compso','Kompsognat','Compsognathus','thero',{p:8,rap:1,sn:22,sc:.7},
    'Jeden z najmniejszych dinozaurów, wielkości kury','W jego brzuchu znaleziono całą jaszczurkę — połykał zdobycz w całości.',1,'zwinny','dino','M',1,['kompsognat','compsognathus','kompsognatus']],
  ['galli','Gallimim','Gallimimus','thero',{p:9,bk:1,orn:1,sn:34,sc:.95},
    'Struś wśród dinozaurów: dziób i długie nogi','Biegał prawdopodobnie 50 km/h — szybciej niż koń.',2,'zwinny','dino','W',6,['gallimim','gallimimus','galimim']],
  ['struthio','Struthiomim','Struthiomimus','thero',{p:3,bk:1,orn:1,sn:34,sc:.93},
    'Kuzyn gallimima, też bez zębów i bardzo szybki','Nazwa znaczy „naśladowca strusia”.',2,'zwinny','dino','W',4,['struthiomim','struthiomimus','strutiomim']],
  ['ovi','Owiraptor','Oviraptor','thero',{p:5,bk:1,orn:1,cr2:1,sn:24,sc:.8},
    'Niesłusznie oskarżony o kradzież jaj, ma grzebień','Znaleziono go na gnieździe — ale to były JEGO jaja, wysiadywał je.',2,'zwinny','dino','W',2,['owiraptor','oviraptor','oviraptor']],
  ['theri','Terizinozaur','Therizinosaurus','thero',{p:6,bk:1,orn:1,sn:26,arm:26,clw:2,belly:1},
    'Ma pazury długie jak miecze, ale je rośliny','Jego pazury mierzyły metr — najdłuższe pazury w historii Ziemi.',4,'drap','dino','R',10,['terizinozaur','therizinosaurus','teryzinozaur']],
  ['bary','Baryonyks','Baryonyx','thero',{p:10,sn:48,clw:1},
    'Krokodyla paszcza i wielki pazur na kciuku, łowi ryby','W jego żołądku znaleziono łuski ryb i kości młodego iguanodona.',3,'drap','dino','Ry',9,['baryonyks','baryonyx','barionyks']],
  ['sucho','Suchomim','Suchomimus','thero',{p:11,rdg:1,sn:50},
    'Kuzyn baryonyksa z małym garbem na grzbiecie','Nazwa znaczy „naśladowca krokodyla” — miał ponad 100 zębów.',3,'drap','dino','Ry',11,['suchomim','suchomimus','suchomimus']],
  ['alberto','Albertozaur','Albertosaurus','thero',{p:12,dp:1,sn:40,arm:8},
    'Lżejszy i szybszy kuzyn tyranozaura z Kanady','Znaleziono stado 26 osobników razem — może polowały grupowo.',3,'drap','dino','M',9,['albertozaur','albertosaurus']],
  ['daspleto','Daspletozaur','Daspletosaurus','thero',{p:16,dp:1,sn:40,arm:8},
    '„Przerażający jaszczur”, kuzyn tyranozaura','Miał najmocniejszą czaszkę wśród średnich tyranozaurów.',3,'drap','dino','M',9,['daspletozaur','daspletosaurus']],
  ['acro','Akrokantozaur','Acrocanthosaurus','thero',{p:7,rdg:1,sn:40},
    'Ma niski grzebień-garb wzdłuż całego grzbietu','Zostawił ślady stóp w Teksasie — tropi tam zauropoda.',3,'drap','dino','M',11,['akrokantozaur','acrocanthosaurus']],
  ['tarbo','Tarbozaur','Tarbosaurus','thero',{p:11,dp:1,sn:42,arm:7},
    'Azjatycki bliźniak tyranozaura','Żył na pustyni Gobi i był niemal identyczny jak T. rex.',3,'drap','dino','M',10,['tarbozaur','tarbosaurus']],
  ['troodon','Troodon','Troodon','thero',{p:12,rap:1,sn:26,clw:1,sc:.82},
    'Najmądrzejszy dinozaur: wielkie oczy i duży mózg','Miał oczy skierowane do przodu jak sowa — polował o zmierzchu.',2,'zwinny','dino','W',2,['troodon','troodont']],
  ['coelo','Celofyz','Coelophysis','thero',{p:3,rap:1,sn:28,sc:.8},
    'Jeden z najstarszych dinozaurów, chudy i szybki','W Ghost Ranch w Nowym Meksyku znaleziono ich całe setki naraz.',1,'zwinny','dino','M',3,['celofyz','coelophysis','celofyzys']],
  ['herrera','Herrerazaur','Herrerasaurus','thero',{p:11,sn:32,sc:.88},
    'Praprzodek wszystkich drapieżnych dinozaurów','To jeden z najstarszych dinozaurów — 231 milionów lat.',2,'drap','dino','M',5,['herrerazaur','herrerasaurus']],
  ['megalo','Megalozaur','Megalosaurus','thero',{p:6,sn:38},
    'Pierwszy dinozaur, jakiego opisali naukowcy','Nazwany w 1824 roku — wtedy jeszcze nie istniało słowo „dinozaur”.',2,'drap','dino','M',7,['megalozaur','megalosaurus']],
  ['cryo','Kriolofozaur','Cryolophosaurus','thero',{p:4,cr2:1,sn:34},
    'Grzebień jak fryzura Elvisa, znaleziony w Antarktydzie','Nazywany żartem „Elvisaurus” z powodu czuba na głowie.',3,'drap','dino','M',7,['kriolofozaur','cryolophosaurus','krylofozaur']],

  /* ---------------- ZAUROPODY ---------------- */
  ['brachio','Brachiozaur','Brachiosaurus','sauro',{p:11,nk:'high',big:1},
    'Przednie nogi dłuższe niż tylne, głowa wysoko jak żuraw','Sięgał głową na wysokość czteropiętrowego domu.',4,'olbrzym','dino','R',22,['brachiozaur','brachiosaurus','brachjozaur']],
  ['diplo','Diplodok','Diplodocus','sauro',{p:12,nk:'low',whip:1},
    'Bardzo długi, z ogonem jak bicz','Jego ogon mógł strzelać jak bicz — z prędkością dźwięku!',3,'olbrzym','dino','R',26,['diplodok','diplodocus','dyplodok']],
  ['apato','Apatozaur','Apatosaurus','sauro',{p:6,nk:'low'},
    'Grubszy i cięższy kuzyn diplodoka','Jego imię znaczy „zwodniczy jaszczur”.',3,'olbrzym','dino','R',22,['apatozaur','apatosaurus']],
  ['bronto','Brontozaur','Brontosaurus','sauro',{p:15,nk:'mid'},
    '„Grzmiący jaszczur” — przez lata uważano, że nie istnieje','Skreślono go z listy w 1903, a przywrócono dopiero w 2015 roku.',3,'olbrzym','dino','R',22,['brontozaur','brontosaurus','bronto']],
  ['argenti','Argentynozaur','Argentinosaurus','sauro',{p:9,nk:'mid',big:1},
    'Chyba najcięższe zwierzę, jakie chodziło po Ziemi','Ważył tyle co 15 słoni, a jego kręg był wyższy od człowieka.',4,'olbrzym','dino','R',35,['argentynozaur','argentinosaurus','argentinozaur']],
  ['amarga','Amargazaur','Amargasaurus','sauro',{p:5,nk:'low',spn:1},
    'Mały zauropod z dwoma rzędami kolców na szyi','Kolce mogły podtrzymywać żagiel albo służyć do popisów.',3,'olbrzym','dino','R',10,['amargazaur','amargasaurus']],
  ['camara','Kamarazaur','Camarasaurus','sauro',{p:3,nk:'mid'},
    'Najczęściej znajdowany zauropod Ameryki, krótka pyszczasta głowa','Połykał kamienie (gastrolity), żeby mielić rośliny w żołądku.',2,'olbrzym','dino','R',18,['kamarazaur','camarasaurus']],
  ['mamen','Mamenchizaur','Mamenchisaurus','sauro',{p:8,nk:'xlong'},
    'Szyja dłuższa niż połowa całego ciała','Miał najdłuższą szyję w historii — aż 15 metrów.',3,'olbrzym','dino','R',25,['mamenchizaur','mamenchisaurus']],
  ['salta','Saltazaur','Saltasaurus','sauro',{p:2,nk:'low',arm2:1},
    'Zauropod w pancerzu z kostnych guzków','Jedyny zauropod z prawdziwym pancerzem na grzbiecie.',3,'pancerz','dino','R',12,['saltazaur','saltasaurus']],
  ['alamo','Alamozaur','Alamosaurus','sauro',{p:16,nk:'mid',big:1},
    'Ostatni wielki zauropod Ameryki, żył obok tyranozaura','Był jedynym zauropodem w Ameryce Północnej na końcu kredy.',3,'olbrzym','dino','R',26,['alamozaur','alamosaurus']],
  ['plateo','Plateozaur','Plateosaurus','prosauro',{p:3},
    'Praprzodek zauropodów, mógł stanąć na dwóch nogach','Znaleziono setki szkieletów w Niemczech — całe cmentarzysko.',2,'olbrzym','dino','R',8,['plateozaur','plateosaurus']],
  ['masso','Massospondyl','Massospondylus','prosauro',{p:12},
    'Mniejszy kuzyn plateozaura z Afryki','Znaleziono jego jaja z zarodkami w środku — najstarsze takie gniazdo.',2,'olbrzym','dino','R',5,['massospondyl','massospondylus','masospondyl']],

  /* ---------------- CERATOPSY ---------------- */
  ['tri','Triceratops','Triceratops','cerat',{p:7,fr:'big',hrn:3},
    'Trzy rogi i wielka kryza — rywal tyranozaura','Jego czaszka mierzyła 2,5 metra, jedna z największych na lądzie.',4,'pancerz','dino','R',9,['triceratops','tricerator','tri','triceratop']],
  ['styra','Styrakozaur','Styracosaurus','cerat',{p:2,fr:'spiky',hrn:1},
    'Kryza najeżona długimi kolcami, jeden róg na nosie','Miał sześć wielkich kolców jak korona.',3,'pancerz','dino','R',6,['styrakozaur','styracosaurus','stirakozaur']],
  ['penta','Pentaceratops','Pentaceratops','cerat',{p:16,fr:'huge',hrn:3},
    'Ma jeszcze większą kryzę niż triceratops','Nazwa znaczy „pięciorogi”, choć dwa „rogi” to tylko kości policzkowe.',3,'pancerz','dino','R',6,['pentaceratops','pentaceratop']],
  ['toro','Torozaur','Torosaurus','cerat',{p:11,fr:'tall',hrn:3},
    'Kryza z dwoma wielkimi oknami, prawie jak triceratops','Niektórzy naukowcy sądzą, że to po prostu bardzo stary triceratops.',3,'pancerz','dino','R',8,['torozaur','torosaurus']],
  ['proto','Protoceratops','Protoceratops','cerat',{p:3,fr:'small',hrn:0,sc:.8},
    'Mały ceratops bez rogów, wielkości owcy','Znaleziono go w skamieniałej walce z welociraptorem.',2,'pancerz','dino','R',2,['protoceratops','protoceratop']],
  ['centro','Centrozaur','Centrosaurus','cerat',{p:12,fr:'hook',hrn:1},
    'Jeden róg na nosie i haczyki na kryzie','Żył w gigantycznych stadach — znaleziono tysiące kości razem.',2,'pancerz','dino','R',6,['centrozaur','centrosaurus']],
  ['chasmo','Chasmozaur','Chasmosaurus','cerat',{p:6,fr:'tall',hrn:3},
    'Kryza wysoka jak żagiel, z wielkimi oknami','Kryza była tak cienka, że prześwitywała przez nią skóra.',2,'pancerz','dino','R',5,['chasmozaur','chasmosaurus']],
  ['kosmo','Kosmoceratops','Kosmoceratops','cerat',{p:5,fr:'curly',hrn:3},
    'Rogi zawinięte w dół jak grzywka','Miał aż 15 rogów — rekord wśród wszystkich dinozaurów.',3,'pancerz','dino','R',5,['kosmoceratops','kosmoceratop']],
  ['einio','Einiozaur','Einiosaurus','cerat',{p:8,fr:'hook',hrn:1},
    'Róg na nosie wygięty do przodu jak otwieracz do puszek','Nazwa w języku Czarnych Stóp znaczy „bawoli jaszczur”.',2,'pancerz','dino','R',5,['einiozaur','einiosaurus']],
  ['psitta','Psittakozaur','Psittacosaurus','cerat',{p:15,fr:'none',hrn:0,sc:.72},
    'Praceratops z papuzim dziobem, chodził na dwóch nogach','Miał pęk sztywnych szczecin na ogonie.',2,'zwinny','dino','R',2,['psittakozaur','psittacosaurus','psitakozaur']],

  /* ---------------- PANCERNE ---------------- */
  ['anky','Ankylozaur','Ankylosaurus','armor',{p:12,club:1,spk:1},
    'Żywy czołg z maczugą na końcu ogona','Uderzenie jego maczugi mogło złamać nogę tyranozaura.',4,'pancerz','dino','R',8,['ankylozaur','ankylosaurus','anky','ankilozaur']],
  ['euoplo','Euoplocefal','Euoplocephalus','armor',{p:6,club:1},
    'Kuzyn ankylozaura — też pancerz i maczuga','Miał opancerzone nawet powieki — zasuwka z kości chroniła oko.',3,'pancerz','dino','R',6,['euoplocefal','euoplocephalus','euplocefal']],
  ['nodo','Nodozaur','Nodosaurus','armor',{p:11,spk:1},
    'Pancerny, ale bez maczugi na ogonie','Nodozaury broniły się kolcami po bokach zamiast maczugą.',2,'pancerz','dino','R',6,['nodozaur','nodosaurus']],
  ['edmontonia','Edmontonia','Edmontonia','armor',{p:3,shd:1,spk:1},
    'Ma wielkie kolce sterczące do przodu z barków','Kolce na ramionach służyły do pojedynków z innymi samcami.',3,'pancerz','dino','R',7,['edmontonia']],
  ['sauropelta','Sauropelta','Sauropelta','armor',{p:16,shd:1},
    '„Tarczowy jaszczur” z rzędem kolców na szyi','Sam pancerz ważył tyle co dorosły człowiek.',2,'pancerz','dino','R',5,['sauropelta']],
  ['polacanthus','Polakant','Polacanthus','armor',{p:15,spk:1},
    'Cały grzbiet najeżony ostrymi kolcami','Nazwa znaczy po prostu „wiele kolców”.',2,'pancerz','dino','R',5,['polakant','polacanthus','polakantus']],
  ['gastonia','Gastonia','Gastonia','armor',{p:9,spk:1,shd:1},
    'Kolce po bokach jak piła, z Utah','Miał ponad 50 kolców i płytek rozsianych po ciele.',2,'pancerz','dino','R',5,['gastonia']],
  ['scelido','Scelidozaur','Scelidosaurus','armor',{p:8,low:1},
    'Najstarszy i najprostszy pancerny dinozaur','To praprzodek zarówno ankylozaurów, jak i stegozaurów.',2,'pancerz','dino','R',4,['scelidozaur','scelidosaurus']],

  /* ---------------- STEGOZAURY ---------------- */
  ['stego','Stegozaur','Stegosaurus','stego',{p:6,n:9,ts:4},
    'Płyty na grzbiecie i cztery kolce na ogonie','Kolce na ogonie mają nazwę „thagomizer” — z komiksu!',4,'pancerz','dino','R',9,['stegozaur','stegosaurus','stego']],
  ['kentro','Kentrozaur','Kentrosaurus','stego',{p:2,n:6,pl:'spike',ts:4,shd:1},
    'Zamiast płyt ma same kolce, nawet na barkach','Znaleziony w Tanzanii, w tej samej warstwie co brachiozaur.',3,'pancerz','dino','R',5,['kentrozaur','kentrosaurus']],
  ['miragaia','Miragaia','Miragaia','stego',{p:1,n:10,nk:1},
    'Stegozaur z żyrafią szyją','Miał 17 kręgów szyjnych — więcej niż niejeden zauropod.',2,'pancerz','dino','R',6,['miragaia','miragaja']],
  ['hespero','Hesperozaur','Hesperosaurus','stego',{p:16,n:7},
    'Kuzyn stegozaura z szerszymi, krótszymi płytami','„Hespero” znaczy zachodni — z zachodu USA.',2,'pancerz','dino','R',6,['hesperozaur','hesperosaurus']],

  /* ---------------- HADROZAURY / ORNITOPODY ---------------- */
  ['edmonto','Edmontozaur','Edmontosaurus','hadro',{p:3,sc:1.03},
    'Wielka kaczodzioba krowa kredy, bez grzebienia','Miał ponad 1000 zębów w baterii zębowej do mielenia roślin.',3,'olbrzym','dino','R',12,['edmontozaur','edmontosaurus']],
  ['para','Parazaurolof','Parasaurolophus','hadro',{p:1,cr:'tube'},
    'Długa rurka z tyłu głowy, jak trąbka','Przez rurkę wydawał niski dźwięk jak z puzonu — słychać było kilometrami.',4,'olbrzym','dino','R',10,['parazaurolof','parasaurolophus','parazaurolophus','para']],
  ['koryto','Korytozaur','Corythosaurus','hadro',{p:5,cr:'helm'},
    'Grzebień okrągły jak hełm koryncki','Znaleziono jego mumię z odciskiem skóry.',3,'olbrzym','dino','R',9,['korytozaur','corythosaurus']],
  ['lambeo','Lambeozaur','Lambeosaurus','hadro',{p:2,cr:'hatch'},
    'Grzebień jak siekierka pochylona do przodu','Największy hadrozaur Ameryki Północnej.',3,'olbrzym','dino','R',9,['lambeozaur','lambeosaurus']],
  ['maia','Majazaura','Maiasaura','hadro',{p:11,cr:'bump'},
    '„Dobra matka” — karmiła pisklęta w gnieździe','Pierwszy dinozaur, przy którym udowodniono opiekę nad młodymi.',3,'olbrzym','dino','R',9,['majazaura','maiasaura','majazaur']],
  ['iguano','Iguanodon','Iguanodon','hadro',{p:6,thumb:1},
    'Zamiast kciuka ma ostry kolec','Naukowcy najpierw wsadzili mu ten kolec na nos jak róg.',3,'olbrzym','dino','R',10,['iguanodon','igwanodon']],
  ['ourano','Ouranozaur','Ouranosaurus','hadro',{p:8,sail:1},
    'Kaczodzioby z żaglem na grzbiecie','Żagiel mógł chłodzić go w afrykańskim upale.',3,'olbrzym','dino','R',7,['ouranozaur','ouranosaurus','uranozaur']],
  ['hypsi','Hypsilofodon','Hypsilophodon','hadro',{p:15,sc:.72},
    'Mały, szybki roślinożerca wielkości psa','Kiedyś sądzono, że mieszkał na drzewach jak kangur nadrzewny.',1,'zwinny','dino','R',2,['hypsilofodon','hypsilophodon','hipsilofodon']],
  ['tenonto','Tenontozaur','Tenontosaurus','hadro',{p:16},
    'Ulubiony obiad deinonychów, z długim sztywnym ogonem','Prawie zawsze znajduje się go razem z zębami deinonychów.',2,'olbrzym','dino','R',7,['tenontozaur','tenontosaurus']],
  ['hadrosaurus','Hadrozaur','Hadrosaurus','hadro',{p:12},
    'Pierwszy prawie kompletny szkielet dinozaura na świecie','Znaleziony w New Jersey w 1858 — pierwszy zmontowany szkielet dinozaura.',2,'olbrzym','dino','R',8,['hadrozaur','hadrosaurus']],
  ['saurolof','Saurolof','Saurolophus','hadro',{p:9,cr:'bump'},
    'Ma kolec-grzebień sterczący do tyłu z czoła','Znaleziono go zarówno w Kanadzie, jak i w Mongolii.',2,'olbrzym','dino','R',10,['saurolof','saurolophus','saurolofus']],

  /* ---------------- PACHYCEFALOZAURY ---------------- */
  ['pachy','Pachycefalozaur','Pachycephalosaurus','dome',{p:2,dm:'big'},
    'Czaszka gruba jak kask, do bodzenia','Kopuła na głowie miała 25 cm grubości.',3,'zwinny','dino','W',5,['pachycefalozaur','pachycephalosaurus','pachy','pachycefal']],
  ['stygi','Stygimoloch','Stygimoloch','dome',{p:7,dm:'spiky'},
    'Kopuła i wieniec kolców, „diabeł z rzeki Styks”','Może to po prostu nastoletni pachycefalozaur.',3,'zwinny','dino','W',3,['stygimoloch','stygimolok']],
  ['dracorex','Dracorex','Dracorex hogwartsia','dome',{p:16,dm:'spiky'},
    'Nazwany na cześć Hogwartu, wygląda jak smok','Pełna nazwa to „Dracorex hogwartsia” — smoczy król z Hogwartu.',3,'zwinny','dino','W',3,['dracorex','drakoreks']],
  ['homalo','Homalocefal','Homalocephale','dome',{p:11,dm:'flat'},
    'Kuzyn pachycefalozaura, ale z płaską głową','Płaska czaszka pokryta guzkami zamiast kopuły.',2,'zwinny','dino','W',3,['homalocefal','homalocephale']],

  /* ---------------- PTEROZAURY ---------------- */
  ['pterano','Pteranodon','Pteranodon','ptero',{p:4,cr:'back',bk:1,big:1},
    'Wielki grzebień z tyłu głowy, bez zębów','Skrzydła rozpięte na 7 metrów — jak mały samolot.',3,'zwinny','ptero','Ry',7,['pteranodon','pteranadon','pterandon']],
  ['pterodak','Pterodaktyl','Pterodactylus','ptero',{p:8,cr:'small',sc:.8},
    'Najsłynniejszy mały latający gad, wielkości wrony','To pierwszy pterozaur, jakiego kiedykolwiek opisano.',2,'zwinny','ptero','Ry',1,['pterodaktyl','pterodactylus','pterodaktil','pterodaktyle']],
  ['quetzal','Kecalkoatl','Quetzalcoatlus','ptero',{p:11,bk:1,big:1,cr:'keel'},
    'Wielki jak żyrafa, a jednak latał','Największe latające zwierzę w historii — 11 metrów rozpiętości.',4,'zwinny','ptero','M',11,['kecalkoatl','quetzalcoatlus','kwecalkoatl','quetzal']],
  ['rhampho','Ramforynch','Rhamphorhynchus','ptero',{p:12,tl:1},
    'Ma długi ogon zakończony chorągiewką','Ogon działał jak ster w powietrzu.',2,'zwinny','ptero','Ry',1,['ramforynch','rhamphorhynchus','ramforynchus']],
  ['dimorpho','Dimorfodon','Dimorphodon','ptero',{p:2,bh:1,tl:1},
    'Głowa wielka jak u maskonura, dwa rodzaje zębów','Jego głowa była za duża do szybkiego latania — raczej szybował.',2,'zwinny','ptero','M',1,['dimorfodon','dimorphodon']],
  ['tapejara','Tapejara','Tapejara','ptero',{p:13,cr:'sail',bk:1},
    'Ogromny kolorowy żagiel na głowie','Grzebień był większy niż reszta czaszki — do popisów godowych.',3,'zwinny','ptero','W',3,['tapejara','tapejera']],
  ['tropeo','Tropeognat','Tropeognathus','ptero',{p:10,cr:'keel'},
    'Ma kil na dziobie jak łódka','Kil pomagał mu łowić ryby w locie, tuż nad falami.',2,'zwinny','ptero','Ry',6,['tropeognat','tropeognathus']],
  ['nyctosaurus','Nyktozaur','Nyctosaurus','ptero',{p:17,cr:'sail',bk:1},
    'Poroże na głowie jak maszt żaglówki','Jego grzebień był większy niż całe ciało — najdziwniejszy z pterozaurów.',3,'zwinny','ptero','Ry',2,['nyktozaur','nyctosaurus']],

  /* ---------------- GADY MORSKIE ---------------- */
  ['plesio','Plezjozaur','Plesiosaurus','plesio',{p:10,nk:'long'},
    'Cztery płetwy i długa szyja jak u łabędzia','To on „jest” potworem z Loch Ness na rysunkach.',3,'wodny','morskie','Ry',4,['plezjozaur','plesiosaurus','plezjozaury']],
  ['elasmo','Elasmozaur','Elasmosaurus','plesio',{p:17,nk:'xlong'},
    'Szyja dłuższa niż całe ciało','Miał 72 kręgi szyjne — najdłuższa szyja w historii Ziemi.',4,'wodny','morskie','Ry',12,['elasmozaur','elasmosaurus']],
  ['krypto','Kryptoklid','Cryptoclidus','plesio',{p:1,nk:'mid'},
    'Średni plezjozaur z gęstą siatką zębów','Zęby splatały się w sitko do łowienia małych rybek.',2,'wodny','morskie','Ry',4,['kryptoklid','cryptoclidus']],
  ['notho','Nothozaur','Nothosaurus','plesio',{p:12,nk:'mid',lg:1},
    'Pół-gad, pół-foka — wychodził na brzeg','Praprzodek plezjozaurów, jeszcze z prawdziwymi łapami.',2,'wodny','morskie','Ry',3,['nothozaur','nothosaurus','notozaur']],
  ['mosa','Mozazaur','Mosasaurus','mosa',{p:17},
    'Gigantyczna morska jaszczurka z wiosłowym ogonem','Najbliższym dzisiejszym krewnym mozazaura jest… waran.',4,'wodny','morskie','M',17,['mozazaur','mosasaurus','mozazaury','mosa']],
  ['tylo','Tylozaur','Tylosaurus','mosa',{p:10},
    'Mozazaur z twardym taranem na czubku pyska','Taranował ofiary jak żywy pocisk.',3,'wodny','morskie','M',14,['tylozaur','tylosaurus']],
  ['liopleuro','Liopleurodon','Liopleurodon','mosa',{p:4,plio:1},
    'Krótka szyja, ogromna głowa, cztery płetwy','Jego czaszka była dłuższa niż dorosły człowiek.',3,'wodny','morskie','M',7,['liopleurodon','lioplerodon']],
  ['krono','Kronozaur','Kronosaurus','mosa',{p:14,plio:1},
    'Pliozaur o głowie większej niż u tyranozaura','Nazwany od Kronosa, tytana, który połykał własne dzieci.',3,'wodny','morskie','M',10,['kronozaur','kronosaurus']],
  ['ichthyo','Ichtiozaur','Ichthyosaurus','ichthyo',{p:9},
    'Gad, który wyglądał jak delfin','Rodził żywe młode w wodzie, nie składał jaj.',2,'wodny','morskie','Ry',3,['ichtiozaur','ichthyosaurus','ichtiozaury','ihtiozaur']],
  ['ophthalmo','Oftalmozaur','Ophthalmosaurus','ichthyo',{p:17,big:1},
    'Oczy wielkie jak talerze, nurkował w ciemność','Miał największe oczy ze wszystkich kręgowców — 23 cm.',3,'wodny','morskie','Ry',6,['oftalmozaur','ophthalmosaurus','oftalmozaury']],
  ['shoni','Szonizaur','Shonisaurus','ichthyo',{p:4,big:1},
    'Największy ichtiozaur, wielki jak wieloryb','Miał 15 metrów i prawie nie miał zębów.',3,'wodny','morskie','Ry',15,['szonizaur','shonisaurus','shonizaur']],
  ['archelon','Archelon','Archelon','turtle',{p:12},
    'Żółw morski wielki jak samochód','Skorupa miała 4 metry — największy żółw wszech czasów.',3,'wodny','morskie','W',4,['archelon','archelona']],
  ['megalodon','Megalodon','Otodus megalodon','fish',{p:9,k:'shark'},
    'Rekin z zębami wielkości dłoni','Jego ząb mierzył 18 cm — mieści się w nim cała dziecięca dłoń.',4,'wodny','inne','M',18,['megalodon','megalodons','meg']],
  ['dunkleo','Dunkleosteus','Dunkleosteus','fish',{p:9},
    'Pancerna ryba z kostną gilotyną zamiast zębów','Zamykał paszczę w 1/50 sekundy — najszybszy zgryz w oceanie.',4,'wodny','inne','M',8,['dunkleosteus','dunkleozaur','dunkleo']],
  ['leedsi','Leedsichthys','Leedsichthys','fish',{p:10},
    'Największa ryba w historii, ale jadła plankton','Miał 16 metrów, a odżywiał się najmniejszymi stworzeniami morza.',3,'wodny','inne','W',16,['leedsichthys','leedsichtys','ledsichthys']],

  /* ---------------- KROKODYLOMORFY ---------------- */
  ['sarco','Sarkozuch','Sarcosuchus','croc',{p:12,sc:1.03},
    'SuperKrokodyl — 12 metrów i bańka na nosie','Rósł przez 50-60 lat i nigdy nie przestawał rosnąć.',3,'wodny','inne','M',12,['sarkozuch','sarcosuchus','sarkosuch','superkrokodyl']],
  ['deinosuchus','Deinozuch','Deinosuchus','croc',{p:6,sc:1.03},
    'Amerykański krokodyl, który polował na dinozaury','Znaleziono kości hadrozaurów z jego zębami w środku.',3,'wodny','inne','M',11,['deinozuch','deinosuchus','deinosuch']],
  ['posto','Postozuch','Postosuchus','croc',{p:16,up:1},
    'Krokodyl chodzący na dwóch nogach, przed dinozaurami','Był największym drapieżnikiem triasu, zanim pojawiły się dinozaury.',2,'drap','inne','M',5,['postozuch','postosuchus','postosuch']],
  ['protosuchus','Protozuch','Protosuchus','croc',{p:8,up:1,sc:.75},
    'Pra-krokodyl wielkości kota, z długimi nogami','Biegał po lądzie jak jaszczurka, wcale nie pływał.',1,'drap','inne','M',1,['protozuch','protosuchus','protosuch']],
  ['kapro','Kaprozuch','Kaprosuchus','croc',{p:2,up:1,sc:.85},
    'Krokodyl-dzik z kłami sterczącymi na boki','Nazywany „BoarCroc” — krokodyl z kłami jak u dzika.',2,'drap','inne','M',6,['kaprozuch','kaprosuchus','kaprosuch']],

  /* ---------------- GOŚCIE Z INNYCH EPOK ---------------- */
  ['dimetro','Dimetrodon','Dimetrodon','sail',{p:7},
    'Żagiel na grzbiecie, ale to NIE dinozaur','Żył 40 mln lat przed dinozaurami i jest bliżej spokrewniony z nami niż z nimi.',3,'drap','inne','M',4,['dimetrodon','dimetradon','dimetrodont']],
  ['edapho','Edafozaur','Edaphosaurus','sail',{p:12,short:1},
    'Kuzyn dimetrodona z poprzeczkami na żaglu, jadł rośliny','Na kolcach żagla miał poprzeczne guzki jak drabinka.',2,'pancerz','inne','R',3,['edafozaur','edaphosaurus']],
  ['lystro','Lystrozaur','Lystrosaurus','synap',{p:3,tsk:1},
    'Beczkowaty ryjek z dwoma kłami, przetrwał największą zagładę','Po wielkim wymieraniu permu 95% wszystkich zwierząt lądowych to był on.',2,'pancerz','inne','R',1,['lystrozaur','lystrosaurus','listrozaur']],
  ['moschops','Moschops','Moschops','synap',{p:11},
    'Gruby prassak z bardzo grubą czaszką','Bodł się głowami z rywalami jak dzisiejsze barany.',2,'pancerz','inne','R',3,['moschops','moshops']],
  ['eryops','Eryops','Eryops','amphib',{p:6},
    'Wielka pierwotna żaba-krokodyl z bagien','Był płazem — jak salamandra wielkości człowieka.',2,'wodny','inne','M',2,['eryops','eriops']],
  ['diplocaulus','Diplokaulus','Diplocaulus','amphib',{p:1,boom:1},
    'Głowa w kształcie bumerangu','Głowa działała jak skrzydło — dawała nośność w prądzie wody.',2,'wodny','inne','Ry',1,['diplokaulus','diplocaulus','diplokaul']],
  ['meganeura','Meganeura','Meganeura','bug',{p:12,k:'dragon'},
    'Ważka wielkości orła','Rozpiętość 70 cm — mogła urosnąć, bo w powietrzu było więcej tlenu.',3,'zwinny','inne','M',1,['meganeura','meganeuria','megaeura']],
  ['arthropleura','Artropleura','Arthropleura','bug',{p:16,k:'milli'},
    'Stonoga długa jak samochód','Największy stawonóg lądowy w historii — 2,5 metra.',3,'pancerz','inne','R',3,['artropleura','arthropleura','artopleura']],
  ['trilobit','Trylobit','Trilobita','bug',{p:17},
    'Morski „pancerzyk” z tysiącami soczewek w oczach','Przetrwał 270 milionów lat — dłużej niż dinozaury.',1,'pancerz','inne','W',1,['trylobit','trilobit','trilobita','trylobity']],
  ['mammoth','Mamut','Mammuthus primigenius','mammal',{p:11,k:'mammoth'},
    'Włochaty słoń epoki lodowcowej','Ostatnie mamuty żyły jeszcze, gdy budowano piramidy.',3,'olbrzym','inne','R',5,['mamut','mammoth','mammuthus','mamut wlochaty']],
  ['smilodon','Smilodon','Smilodon fatalis','mammal',{p:2},
    'Tygrys szablozębny z kłami jak sztylety','Jego kły miały 28 cm, ale były zaskakująco kruche.',3,'drap','inne','M',2,['smilodon','tygrys szablozebny','szablozebny','smilodont']],
  ['archaeo','Archeopteryks','Archaeopteryx','bird',{p:8},
    'Pierwszy ptak: pióra, ale też zęby i pazury na skrzydłach','To brakujące ogniwo między dinozaurami a ptakami.',3,'zwinny','dino','M',1,['archeopteryks','archaeopteryx','archeopteryx','archeopteryks']],
  ['micro','Mikroraptor','Microraptor','bird',{p:14,four:1},
    'Miał aż cztery skrzydła — także na nogach','Pióra były czarne i mieniły się jak u wrony.',3,'zwinny','dino','M',1,['mikroraptor','microraptor','mikro raptor']],
];

/* ---------- konwersja na obiekty ---------- */
function mkSpecies(row) {
  const [id, pl, lat, a, o, h, f, r, t, g, d, sz, alias] = row;
  return { id, pl, lat, a, o: o || {}, h, f, r, t, g, d, sz, alias: alias || [], pw: power(sz, t) };
}
function power(sz, t) {
  let v = 2 + 4 * Math.log10((sz || 1) + 1);
  if (t === 'drap') v += 2;
  if (t === 'pancerz') v += 1.2;
  if (t === 'olbrzym') v += 0.6;
  return Math.max(1, Math.min(12, Math.round(v)));
}

const SPECIES = RAW.map(mkSpecies);
const BY_ID = Object.fromEntries(SPECIES.map(s => [s.id, s]));

/* ---------- etykiety ---------- */
const GROUPS = {
  dino: { label: 'Dinozaury', short: 'Dinozaur', color: '#4F7A4A' },
  ptero: { label: 'Latające gady', short: 'Pterozaur (latający gad)', color: '#6E8CA8' },
  morskie: { label: 'Gady morskie', short: 'Gad morski', color: '#2F6E8F' },
  inne: { label: 'Inne prehistoryczne', short: 'Inne prehistoryczne zwierzę', color: '#A85B36' },
};
const DIETS = { M: 'Mięsożerca', R: 'Roślinożerca', W: 'Wszystkożerca', Ry: 'Rybożerca' };
const TYPES = {
  drap: { label: 'Drapieżnik', emo: '🦷', color: '#B65340' },
  olbrzym: { label: 'Olbrzym', emo: '🦶', color: '#8A9440' },
  pancerz: { label: 'Pancerz', emo: '🛡️', color: '#C9A227' },
  zwinny: { label: 'Zwinny', emo: '💨', color: '#4E9C93' },
  wodny: { label: 'Wodniak', emo: '🌊', color: '#3F8FA6' },
};
/* pięciokąt: każdy typ wygrywa z dwoma następnymi w cyklu */
const TYPE_CYCLE = ['drap', 'olbrzym', 'pancerz', 'zwinny', 'wodny'];
const ARCH_LIST = [
  ['thero', 'Drapieżnik dwunożny (teropod)'],
  ['sauro', 'Długoszyi olbrzym (zauropod)'],
  ['prosauro', 'Prazauropod'],
  ['cerat', 'Rogaty z kryzą (ceratops)'],
  ['armor', 'Pancerny z maczugą'],
  ['stego', 'Z płytami na grzbiecie'],
  ['hadro', 'Kaczodzioby'],
  ['dome', 'Twardogłowy'],
  ['ptero', 'Latający gad'],
  ['plesio', 'Długoszyi gad morski'],
  ['mosa', 'Morska jaszczurka'],
  ['ichthyo', 'Rybokształtny gad morski'],
  ['croc', 'Krokodyl'],
  ['sail', 'Z żaglem na grzbiecie'],
  ['synap', 'Prassak czworonożny'],
  ['amphib', 'Płaz'],
  ['bug', 'Stawonóg'],
  ['fish', 'Ryba'],
  ['mammal', 'Ssak'],
  ['turtle', 'Żółw'],
  ['bird', 'Pierzasty / ptak'],
];

if (typeof module !== 'undefined') {
  module.exports = { PAL, SPECIES, BY_ID, GROUPS, DIETS, TYPES, TYPE_CYCLE, ARCH_LIST, RAW };
}
