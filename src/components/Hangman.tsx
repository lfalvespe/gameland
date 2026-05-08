import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, RefreshCw, Send, Users, User, Trophy, Layout, ChevronLeft, Lock, Info, Play, CheckCircle2, AlertCircle, X, LogOut, Volume2, VolumeX } from 'lucide-react';
import { db, setDoc, updateDoc, doc, onSnapshot, serverTimestamp, arrayUnion, increment, getDoc, deleteDoc, arrayRemove, addDoc, collection, OperationType, handleFirestoreError } from '../firebase';
import { cn, shuffleArray } from '../lib/utils';
import { useAuth } from '../AuthContext';
import { useError } from '../ErrorContext';
import { useSoundEffects } from '../lib/useSoundEffects';

// --- Constants ---

const THEME_WORDS: Record<string, { word: string; hint: string }[]> = {
  'Filmes/Séries': [
    { word: 'INCEPTION', hint: 'Diretor Christopher Nolan, sonhos dentro de sonhos.' },
    { word: 'GLADIADOR', hint: 'Russell Crowe em Roma Antiga.' },
    { word: 'FRIENDS', hint: 'Série sobre seis amigos em Nova York.' },
    { word: 'CORINGA', hint: 'Vilão icônico do Batman.' },
    { word: 'AVATAR', hint: 'Seres azuis em Pandora.' },
    { word: 'INTERESTELAR', hint: 'Viagem espacial através de um buraco de minhoca.' },
    { word: 'TITANIC', hint: 'Um navio que não deveria afundar.' },
    { word: 'MATRIX', hint: 'Simulação virtual e a pílula vermelha.' },
    { word: 'PSICOSE', hint: 'Clássico de Alfred Hitchcock no chuveiro.' },
    { word: 'PULP FICTION', hint: 'Filme cult de Quentin Tarantino.' },
    { word: 'TOY STORY', hint: 'Brinquedos que ganham vida.' },
    { word: 'VINGADORES', hint: 'Filme da Marvel sobre heróis mais poderosos da Terra.' },
    { word: 'BATMAN', hint: 'Cavaleiro das Trevas de Gotham.' },
    { word: 'STAR WARS', hint: 'Guerra nas estrelas, sabres de luz.' },
    { word: 'HARRY POTTER', hint: 'O menino que sobreviveu, bruxo famoso.' },
    { word: 'O PODEROSO CHEFÃO', hint: 'Don Corleone e a máfia italiana.' },
    { word: 'FORREST GUMP', hint: 'A vida é como uma caixa de chocolates.' },
    { word: 'CLUBE DA LUTA', hint: 'A primeira regra é não falar sobre ele.' },
    { word: 'CIDADE DE DEUS', hint: 'Filme brasileiro sobre o crime no Rio.' },
    { word: 'O AUTO DA COMPADECIDA', hint: 'João Grilo e Chicó no sertão.' },
    { word: 'PARASITA', hint: 'Filme coreano vencedor do Oscar.' },
    { word: 'BREAKING BAD', hint: 'Professor de química que vira traficante.' },
    { word: 'GAME OF THRONES', hint: 'Disputa pelo Trono de Ferro.' },
    { word: 'STRANGER THINGS', hint: 'Crianças combatendo o Mundo Invertido.' },
    { word: 'THE CROWN', hint: 'Série sobre o reinado de Elizabeth II.' },
    { word: 'BLACK MIRROR', hint: 'Série tecnológica e distópica.' },
    { word: 'JURASSIC PARK', hint: 'Dinossauros trazidos de volta à vida.' },
    { word: 'O SENHOR DOS ANÉIS', hint: 'Frodo e a jornada para destruir o anel.' },
    { word: 'TUBARÃO', hint: 'Filme de suspense de Steven Spielberg no mar.' },
    { word: 'DE VOLTA PARA O FUTURO', hint: 'Viagem no tempo em um DeLorean.' },
    { word: 'O REI LEÃO', hint: 'Simba e a jornada para ser rei.' },
    { word: 'THE WALKING DEAD', hint: 'Série de sobrevivência zumbi.' },
    { word: 'BETTER CALL SAUL', hint: 'Advogado trambiqueiro de Breaking Bad.' },
    { word: 'THE BOYS', hint: 'Super-heróis nem tão heróicos assim.' },
    { word: 'DARK', hint: 'Série alemã sobre viagens no tempo complexas.' },
    { word: 'LA CASA DE PAPEL', hint: 'Assalto à Casa da Moeda da Espanha.' },
    { word: 'LOST', hint: 'Sobreviventes de um avião em uma ilha misteriosa.' },
    { word: 'DR HOUSE', hint: 'Médico brilhante e ranzinza.' },
    { word: 'GREYS ANATOMY', hint: 'Drama médico em Seattle.' },
    { word: 'SHREK', hint: 'Ogro verde que resgata uma princesa.' },
    { word: 'FROZEN', hint: 'Uma aventura congelante com Elsa e Anna.' },
    { word: 'INDIANA JONES', hint: 'Arqueólogo aventureiro com chicote.' },
    { word: 'O EXTERMINADOR DO FUTURO', hint: 'Arnold Schwarzenegger como robô.' },
    { word: 'TOP GUN', hint: 'Pilotos de caça da marinha.' },
    { word: 'MISSÃO IMPOSSÍVEL', hint: 'Ethan Hunt em missões de espionagem.' },
    { word: 'SUPERHEROIS', hint: 'Pessoas com poderes extraordinários.' },
    { word: 'SEX EDUCATION', hint: 'Série adolescente sobre descobertas.' },
    { word: 'HOW I MET YOUR MOTHER', hint: 'Ted conta como conheceu a mãe de seus filhos.' },
    { word: 'THE OFFICE', hint: 'Cotidiano de um escritório de papelaria.' },
    { word: 'THE MANDALORIAN', hint: 'Caçador de recompensas no universo Star Wars.' },
    { word: 'OPPENHEIMER', hint: 'O pai da bomba atômica, filme de 2023.' },
    { word: 'COMO TREINAR O SEU DRAGÃO', hint: 'Animação sobre Soluço e Banguela.' },
    { word: 'DIVER TIDAMENTE', hint: 'Emoções dentro da cabeça de uma menina.' },
    { word: 'SUNDANCE', hint: 'Famoso festival de cinema independente.' },
    { word: 'MAD MAX', hint: 'Estrada da fúria no deserto pós-apocalíptico.' },
    { word: 'O SILÊNCIO DOS INOCENTES', hint: 'Hannibal Lecter e Clarice Starling.' },
    { word: 'AMELIE POULAIN', hint: 'Clássico francês sobre pequenas alegrias.' },
    { word: 'O PIANISTA', hint: 'Sobrevivência durante a Segunda Guerra Mundial.' },
    { word: 'DJANGO LIVRE', hint: 'Western moderno de Tarantino.' },
    { word: 'SENS8', hint: 'Oito pessoas conectadas mentalmente.' },
    { word: 'THE LAST OF US', hint: 'Série baseada em jogo de sobrevivência.' },
    { word: 'SUCCESSION', hint: 'Disputa pelo império da família Roy.' },
    { word: 'THE BEAR', hint: 'Chef de cozinha tenta salvar o restaurante da família.' },
    { word: 'OPPENHEIMER', hint: 'O pai da bomba atômica, filme de 2023.' },
    { word: 'BARBIE', hint: 'Boneca famosa descobre o mundo real no filme de 2023.' },
    { word: 'SPIDERMAN', hint: 'Herói que solta teias e escala prédios.' },
    { word: 'DUNA', hint: 'Épico de ficção científica em um planeta deserto.' },
    { word: 'FIGHT CLUB', hint: 'Brad Pitt e Edward Norton em um clube secreto.' },
    { word: 'SEVEN', hint: 'Sete crimes capitais e um detetive insistente.' },
    { word: 'TOY STORY', hint: 'Aventura de Woody e Buzz Lightyear.' },
    { word: 'V DE VINGANÇA', hint: 'Máscara icônica e revolta em Londres.' },
    { word: 'MAD MEN', hint: 'Série sobre publicitários nos anos 60.' },
    { word: 'THE WITCHER', hint: 'Geralt de Rívia caçando monstros.' },
    { word: 'THE MANDALORIAN', hint: 'Protetor do Baby Yoda na galáxia.' },
    { word: 'COBRA KAI', hint: 'Continuação de Karatê Kid em forma de série.' },
    { word: 'TED LASSO', hint: 'Treinador de futebol americano em um time inglês.' },
    { word: 'WANDINHA', hint: 'Filha da Família Addams na escola Nunca Mais.' },
    { word: 'LUPIN', hint: 'Ladrão de casaca inspirado nos livros clássicos.' },
    { word: 'ELITE', hint: 'Suspense e drama em um colégio espanhol luxuoso.' },
    { word: 'SCARFACE', hint: 'Tony Montana e seu império de drogas em Miami.' },
    { word: 'O ILUMINADO', hint: 'Trabalho demais e pouca diversão deixam Jack louco.' },
    { word: 'RESERVOIR DOGS', hint: 'Assalto que deu errado, clássico de Tarantino.' },
    { word: 'KILL BILL', hint: 'A noiva em busca de vingança com uma katana.' },
    { word: 'SHREK', hint: 'Ogro verde e seu burro falante.' },
    { word: 'RATATOUILLE', hint: 'Rato que quer ser um grande chef em Paris.' },
    { word: 'MONSTROS SA', hint: 'Sully e Mike assustando crianças para gerar energia.' },
    { word: 'O SHOW DE TRUMAN', hint: 'Homem descobre que sua vida é um reality show.' },
    { word: 'ET O EXTRATERRESTRE', hint: 'Amigo vindo do espaço que quer ligar para casa.' },
    { word: 'JAWS', hint: 'Pânico na praia causado por um grande tubarão branco.' },
    { word: 'GHOSTBUSTERS', hint: 'Quem você vai chamar? Os caça-fantasmas.' },
    { word: 'MOMMY', hint: 'Filme canadense sobre relação conturbada entre mãe e filho.' },
    { word: 'PARADOX', hint: 'Viagem no tempo e consequências inesperadas.' },
    { word: 'SQUID GAME', hint: 'Jogos mortais coreanos por dinheiro.' },
    { word: 'ALICE NO PAIS DAS MARAVILHAS', hint: 'Menina segue um coelho branco e cai em um buraco.' },
    { word: 'MALEVOLA', hint: 'A história da vilã da Bela Adormecida.' },
    { word: 'REI LEAO', hint: 'Simba e o ciclo da vida.' },
    { word: 'MOANA', hint: 'Jovem navegadora polinésia em busca de seu destino.' },
    { word: 'ENCANTO', hint: 'Família colombiana com dons mágicos.' },
    { word: 'COCO', hint: 'Viva a vida é uma festa e o dia dos mortos.' },
    { word: 'HOCUS POCUS', hint: 'Três bruxas irmãs retornam no Halloween.' },
    { word: 'BEETLEJUICE', hint: 'Diga o nome dele três vezes.' },
    { word: 'GREMLINS', hint: 'Não os alimente após a meia-noite.' }
  ],
  'Celebridades': [
    { word: 'BEYONCE', hint: 'Cantora de "Single Ladies" e "Halo".' },
    { word: 'NEYMAR', hint: 'Jogador de futebol brasileiro, o "Menino Ney".' },
    { word: 'MESSI', hint: 'Astro do futebol argentino.' },
    { word: 'ANITTA', hint: 'Cantora brasileira de renome internacional.' },
    { word: 'TOM CRUISE', hint: 'Ator de Missão Impossível.' },
    { word: 'LADY GAGA', hint: 'Cantora pop conhecida por "Bad Romance".' },
    { word: 'CRISTIANO RONALDO', hint: 'Estrela de Portugal no futebol.' },
    { word: 'BRAD PITT', hint: 'Ator famoso de "Clube da Luta".' },
    { word: 'RIHANNA', hint: 'Cantora de "Umbrella" e empresária.' },
    { word: 'LEONARDO DICAPRIO', hint: 'Ator vencedor do Oscar por "O Regresso".' },
    { word: 'ELTON JOHN', hint: 'Pianista e cantor de "Rocket Man".' },
    { word: 'MADONNA', hint: 'A rainha do pop.' },
    { word: 'WILL SMITH', hint: 'Ator de MIB e Um Maluco no Pedaço.' },
    { word: 'SCARLETT JOHANSSON', hint: 'Atriz que interpreta a Viúva Negra.' },
    { word: 'ZENDAYA', hint: 'Atriz de Euphoria e Homem-Aranha.' },
    { word: 'TOM HOLLAND', hint: 'O atual Homem-Aranha dos cinemas.' },
    { word: 'DUA LIPA', hint: 'Cantora de Future Nostalgia.' },
    { word: 'BILLIE EILISH', hint: 'Cantora de Bad Guy.' },
    { word: 'IVETE SANGALO', hint: 'A rainha do axé no Brasil.' },
    { word: 'CAETANO VELOSO', hint: 'Ícone da Tropicália brasileira.' },
    { word: 'FERNANDA MONTENEGRO', hint: 'A maior dama do teatro brasileiro.' },
    { word: 'WAGNER MOURA', hint: 'Ator brasileiro de Tropa de Elite e Narcos.' },
    { word: 'ALICE BRAGA', hint: 'Atriz brasileira de carreira internacional.' },
    { word: 'GISELE BUNDCHEN', hint: 'Supermodelo brasileira mundial.' },
    { word: 'MERYL STREEP', hint: 'Atriz recordista em indicações ao Oscar.' },
    { word: 'TOM HANKS', hint: 'Ator de Forrest Gump e Náufrago.' },
    { word: 'JUSTIN BIEBER', hint: 'Cantor de Baby e Sorry.' },
    { word: 'TAYLOR SWIFT', hint: 'Cantora de Shake It Off e Anti-Hero.' },
    { word: 'DRAKE', hint: 'Rapper canadense de Hotline Bling.' },
    { word: 'KANYE WEST', hint: 'Rapper e designer polêmico.' },
    { word: 'KIM KARDASHIAN', hint: 'Socialite e empresária famosa.' },
    { word: 'OPRAH WINFREY', hint: 'Apresentadora mais famosa dos EUA.' },
    { word: 'STEVE JOBS', hint: 'Fundador da Apple.' },
    { word: 'ELON MUSK', hint: 'Dono da Tesla, SpaceX e X.' },
    { word: 'MARK ZUCKERBERG', hint: 'Criador do Facebook.' },
    { word: 'BILL GATES', hint: 'Fundador da Microsoft.' },
    { word: 'PELÉ', hint: 'O Rei do Futebol.' },
    { word: 'AYRTON SENNA', hint: 'Lenda brasileira da Fórmula 1.' },
    { word: 'MICHAEL JORDAN', hint: 'Melhor jogador de basquete de todos os tempos.' },
    { word: 'MUHAMMAD ALI', hint: 'Lenda do boxe mundial.' },
    { word: 'SILVIO SANTOS', hint: 'O maior apresentador da TV brasileira.' },
    { word: 'FAUSTÃO', hint: 'Dono do bordão "Oloco meu!".' },
    { word: 'XUXA', hint: 'A Rainha dos Baixinhos.' },
    { word: 'ANGÉLICA', hint: 'Apresentadora que ia de táxi.' },
    { word: 'GILBERTO GIL', hint: 'Músico e ex-ministro da cultura.' },
    { word: 'DJAVAN', hint: 'Músico alagoano de Oceano.' },
    { word: 'MILTON NASCIMENTO', hint: 'Voz da música mineira.' },
    { word: 'ELIS REGINA', hint: 'Uma das maiores vozes do Brasil.' },
    { word: 'ROBERTO CARLOS', hint: 'O Rei da música brasileira.' },
    { word: 'CHITÃOZINHO E CHORORÓ', hint: 'Dupla sertaneja de Evidências.' },
    { word: 'ANGELINA JOLIE', hint: 'Atriz e ativista humanitária.' },
    { word: 'JOHNNY DEPP', hint: 'Ator famoso por Jack Sparrow.' },
    { word: 'TOM HARDY', hint: 'Ator de Mad Max e Venom.' },
    { word: 'RYAN GOSLING', hint: 'Ator de La La Land e Barbie.' },
    { word: 'MARGOT ROBBIE', hint: 'Atriz que interpreta Arlequina e Barbie.' },
    { word: 'EMMA STONE', hint: 'Atriz vencedora do Oscar por La La Land.' },
    { word: 'JENNIFER LAWRENCE', hint: 'Atriz de Jogos Vorazes.' },
    { word: 'VIOLA DAVIS', hint: 'Atriz renomada de How to Get Away with Murder.' },
    { word: 'LUDMILLA', hint: 'Cantora brasileira do Numanice.' },
    { word: 'PABLLO VITTAR', hint: 'Drag queen e cantora pop brasileira.' },
    { word: 'JORGE E MATEUS', hint: 'Dupla sertaneja de grande sucesso.' },
    { word: 'MICHAEL PHELPS', hint: 'Nadador recordista de medalhas olímpicas.' },
    { word: 'USAIN BOLT', hint: 'O homem mais rápido do mundo.' },
    { word: 'SERENA WILLIAMS', hint: 'Lenda do tênis mundial.' },
    { word: 'TIGER WOODS', hint: 'Ícone mundial do golfe.' },
    { word: 'LEBRON JAMES', hint: 'Astro do basquete da NBA.' },
    { word: 'STEPHEN CURRY', hint: 'Melhor arremessador de três pontos da NBA.' },
    { word: 'SHOHEI OHTANI', hint: 'Fenômeno japonês do beisebol.' },
    { word: 'MALALA YOUSAFZAI', hint: 'Ativista paquistanesa e Nobel da Paz.' },
    { word: 'GRETA THUNBERG', hint: 'Jovem ativista ambiental sueca.' },
    { word: 'STEPHEN HAWKING', hint: 'Físico famoso por seus estudos sobre buracos negros.' },
    { word: 'NEIL DEGRASSE TYSON', hint: 'Astrofísico e divulgador científico.' },
    { word: 'POPE FRANCIS', hint: 'Líder da Igreja Católica.' },
    { word: 'DALAI LAMA', hint: 'Líder espiritual do budismo tibetano.' },
    { word: 'MICHELLE OBAMA', hint: 'Ex-primeira-dama dos EUA e autora.' },
    { word: 'BARACK OBAMA', hint: 'Primeiro presidente negro dos EUA.' },
    { word: 'NELSON MANDELA', hint: 'Líder sul-africano contra o apartheid.' },
    { word: 'GANDHI', hint: 'Líder da independência da Índia pela não-violência.' },
    { word: 'MARTIN LUTHER KING', hint: 'Líder dos direitos civis nos EUA.' },
    { word: 'PRINCESS DIANA', hint: 'A Princesa do Povo.' },
    { word: 'SIMONE BILES', hint: 'Ginasta recordista de títulos.' },
    { word: 'REBECA ANDRADE', hint: 'Grande ginasta brasileira olímpica.' },
    { word: 'GABRIEL MEDINA', hint: 'Surfista brasileiro campeão mundial.' },
    { word: 'ITALO FERREIRA', hint: 'Primeiro medalhista de ouro do surfe olímpico.' },
    { word: 'ALOK', hint: 'DJ brasileiro de fama mundial.' },
    { word: 'WHINDERSSON NUNES', hint: 'Humorista e youtuber brasileiro.' },
    { word: 'FELIPE NETO', hint: 'Um dos maiores youtubers do Brasil.' },
    { word: 'ANA MARIA BRAGA', hint: 'Apresentadora do Mais Você.' },
    { word: 'LUCIANO HUCK', hint: 'Apresentador do Domingão.' }
  ],
  'Música': [
    { word: 'THE BEATLES', hint: 'Banda britânica de rock formada por John, Paul, George e Ringo.' },
    { word: 'MICHAEL JACKSON', hint: 'O Rei do Pop, famoso pelo "moonwalk".' },
    { word: 'QUEEN', hint: 'Banda liderada por Freddie Mercury.' },
    { word: 'BOHEMIAN RHAPSODY', hint: 'Música épica do Queen que mistura rock e ópera.' },
    { word: 'BOB MARLEY', hint: 'O maior ícone do Reggae mundial.' },
    { word: 'ELVIS PRESLEY', hint: 'O Rei do Rock and Roll.' },
    { word: 'ROLLING STONES', hint: 'Banda de rock de Mick Jagger e Keith Richards.' },
    { word: 'NIRVANA', hint: 'Banda de grunge liderada por Kurt Cobain.' },
    { word: 'IMAGINE', hint: 'Hino de paz composto por John Lennon.' },
    { word: 'METALLICA', hint: 'Banda gigante do heavy metal.' },
    { word: 'COLDPLAY', hint: 'Banda britânica de "Yellow" e "Viva la Vida".' },
    { word: 'PINK FLOYD', hint: 'Clássico do rock progressivo.' },
    { word: 'LED ZEPPELIN', hint: 'Banda de rock famosa por Stairway to Heaven.' },
    { word: 'ACDC', hint: 'Banda de rock australiana de Highway to Hell.' },
    { word: 'GUNS N ROSES', hint: 'Banda de Axel Rose e Slash.' },
    { word: 'ABBA', hint: 'Grupo sueco de Dancing Queen.' },
    { word: 'LEGIÃO URBANA', hint: 'Banda brasileira de Renato Russo.' },
    { word: 'RITA LEE', hint: 'A rainha do rock brasileiro.' },
    { word: 'TIM MAIA', hint: 'O síndico da música brasileira.' },
    { word: 'JORGE BEN JOR', hint: 'Criador do samba-rock.' },
    { word: 'MARISA MONTE', hint: 'Voz suave da MPB e Tribalistas.' },
    { word: 'SKANK', hint: 'Banda mineira de pop-rock e reggae.' },
    { word: 'PARALAMAS DO SUCESSO', hint: 'Banda liderada por Herbert Vianna.' },
    { word: 'TITÃS', hint: 'Banda de rock paulista famosa nos anos 80.' },
    { word: 'BEETHOVEN', hint: 'Compositor erudito de Nona Sinfonia.' },
    { word: 'MOZART', hint: 'Prodígio da música clássica austríaca.' },
    { word: 'JAZZ', hint: 'Gênero musical nascido em Nova Orleans.' },
    { word: 'BLUES', hint: 'Origem de muitos ritmos modernos.' },
    { word: 'HIP HOP', hint: 'Cultura musical de rua.' },
    { word: 'SAMBA', hint: 'Ritmo mais tradicional do Brasil.' },
    { word: 'BOSSA NOVA', hint: 'Gênero de João Gilberto e Tom Jobim.' },
    { word: 'FORRÓ', hint: 'Ritmo nordestino de Luiz Gonzaga.' },
    { word: 'SERTANEJO', hint: 'Música do interior do Brasil.' },
    { word: 'FUNK', hint: 'Ritmo de favela que conquistou o mundo.' },
    { word: 'AXÉ', hint: 'Ritmo baiano de carnaval.' },
    { word: 'PAGODE', hint: 'Variante popular do samba.' },
    { word: 'REGGAETON', hint: 'Ritmo latino de Despacito.' },
    { word: 'KPOP', hint: 'Pop coreano que virou fenômeno mundial.' },
    { word: 'BTS', hint: 'O maior grupo de Kpop do mundo.' },
    { word: 'IRON MAIDEN', hint: 'Banda clássica de metal com o mascote Eddie.' },
    { word: 'LINKIN PARK', hint: 'Banda de nu-metal de Chester Bennington.' },
    { word: 'U2', hint: 'Banda irlandesa liderada por Bono Vox.' },
    { word: 'ADELE', hint: 'Cantora britânica de vozeirão.' },
    { word: 'BRUNO MARS', hint: 'Cantor pop e funkeiro moderno.' },
    { word: 'ED SHEERAN', hint: 'Cantor ruivo de Shape of You.' },
    { word: 'CAZUZA', hint: 'Poeta do rock brasileiro.' },
    { word: 'CHORÃO', hint: 'Vocalista do Charlie Brown Jr.' },
    { word: 'ZÉ RAMALHO', hint: 'Músico paraibano de Chão de Giz.' },
    { word: 'ALCEU VALENÇA', hint: 'Músico pernambucano de Anunciação.' },
    { word: 'LUAN SANTANA', hint: 'Astro do sertanejo universitário.' },
    { word: 'DAVID BOWIE', hint: 'O Camaleão do Rock.' },
    { word: 'PRINCE', hint: 'Ícone da música pop de Purple Rain.' },
    { word: 'WHITNEY HOUSTON', hint: 'Uma das vozes mais potentes da música.' },
    { word: 'ARETHA FRANKLIN', hint: 'A Rainha do Soul.' },
    { word: 'AMY WINEHOUSE', hint: 'Cantora de jazz e soul de Rehab.' },
    { word: 'BRITNEY SPEARS', hint: 'A Princesa do Pop.' },
    { word: 'KATY PERRY', hint: 'Cantora de Firework e Roar.' },
    { word: 'SIA', hint: 'Cantora australiana conhecida por perucas e Chandelier.' },
    { word: 'THE WEEKND', hint: 'Cantor canadense de Blinding Lights.' },
    { word: 'HARRY STYLES', hint: 'Ex-One Direction, cantor de As It Was.' },
    { word: 'OLIVIA RODRIGO', hint: 'Jovem estrela do pop de Drivers License.' },
    { word: 'SZA', hint: 'Cantora de R&B contemporâneo.' },
    { word: 'ARIANA GRANDE', hint: 'Cantora pop de voz poderosa.' },
    { word: 'POST MALONE', hint: 'Rapper e cantor de Sunflower.' },
    { word: 'TRAVIS SCOTT', hint: 'Rapper famoso pelo show no Fortnite.' },
    { word: 'BAD BUNNY', hint: 'Astro do reggaeton de Porto Rico.' },
    { word: 'J BALVIN', hint: 'Cantor colombiano de reggaeton.' },
    { word: 'SHAKIRA', hint: 'Cantora colombiana de Hips Don’t Lie.' },
    { word: 'ROSALIA', hint: 'Cantora espanhola que mistura flamenco e pop.' },
    { word: 'MANU CHAO', hint: 'Cantor franco-espanhol de Clandestino.' },
    { word: 'CAZUZA', hint: 'Músico brasileiro, poeta do rock.' },
    { word: 'RAUL SEIXAS', hint: 'O Maluco Beleza do rock brasileiro.' },
    { word: 'CHICO BUARQUE', hint: 'Um dos maiores compositores da MPB.' },
    { word: 'TOM JOBIM', hint: 'Maestro da Bossa Nova e Garota de Ipanema.' },
    { word: 'JOÃO GILBERTO', hint: 'O pai da batida da Bossa Nova.' },
    { word: 'MARIA BETHÂNIA', hint: 'A Abelha Rainha da MPB.' },
    { word: 'GAL COSTA', hint: 'Uma das vozes mais cristalinas do Brasil.' },
    { word: 'ZECA PAGODINHO', hint: 'Ícone do samba e do pagode brasilero.' },
    { word: 'ALCIONE', hint: 'A Marrom, grande voz do samba.' },
    { word: 'BETH CARVALHO', hint: 'A Madrinha do Samba.' },
    { word: 'CARTOLA', hint: 'Mestre do samba da Mangueira.' },
    { word: 'ADONIRAN BARBOSA', hint: 'Poeta do samba paulista.' },
    { word: 'BAD BRAINS', hint: 'Pioneiros do hardcore punk e reggae.' },
    { word: 'THE CLASH', hint: 'A única banda que importa no punk.' },
    { word: 'RAMONES', hint: 'Precursores do punk rock nova-iorquino.' },
    { word: 'SEX PISTOLS', hint: 'Banda punk britânica polêmica.' },
    { word: 'GREEN DAY', hint: 'Banda de pop punk de American Idiot.' },
    { word: 'RED HOT CHILI PEPPERS', hint: 'Banda que mistura rock e funk.' },
    { word: 'FOO FIGHTERS', hint: 'Banda de Dave Grohl após o Nirvana.' }
  ],
  'Novelas': [
    { word: 'O CLONE', hint: 'Novela sobre clonagem e cultura muçulmana.' },
    { word: 'AVENIDA BRASIL', hint: 'Carminha e Nina em uma busca por vingança.' },
    { word: 'SENHORA DO DESTINO', hint: 'Maria do Carmo e a vilã Nazaré Tedesco.' },
    { word: 'LAÇOS DE FAMÍLIA', hint: 'Helena e Camila disputando o amor de Edu.' },
    { word: 'MULHERES APAIXONADAS', hint: 'Helena e diversas tramas de paixões no Rio.' },
    { word: 'ESCRAVA ISAURA', hint: 'Clássico sobre o sofrimento de uma escrava branca.' },
    { word: 'O REI DO GADO', hint: 'Disputa entre os Mezenga e os Berdinazzi.' },
    { word: 'ROQUE SANTEIRO', hint: 'O herói que não era herói na cidade de Asa Branca.' },
    { word: 'VALE TUDO', hint: 'Quem matou Odete Roitman?' },
    { word: 'PANTANAL', hint: 'A história de Juma Marruá que vira onça.' },
    { word: 'CAMINHO DAS ÍNDIAS', hint: 'Novela que mostrou a cultura indiana no Brasil.' },
    { word: 'TIETA', hint: 'Mulher volta rica e poderosa para Santana do Agreste.' },
    { word: 'CHOCOLATE COM PIMENTA', hint: 'Ana Francisca em busca de vingança em Ventura.' },
    { word: 'AMÉRICA', hint: 'A busca pelo sonho americano atravessando a fronteira.' },
    { word: 'DA COR DO PÉCADO', hint: 'Preta e Paco em uma história de amor e preconceito.' },
    { word: 'PARAÍSO TROPICAL', hint: 'As gêmeas Paula e Taís e o vilão Olavo.' },
    { word: 'A FAVORITA', hint: 'Flora ou Donatela: quem é a vilã?' },
    { word: 'CORDEL ENCANTADO', hint: 'Um conto de fadas no sertão brasileiro.' },
    { word: 'CARROSSEL', hint: 'Novela infantil sobre a Professora Helena e seus alunos.' },
    { word: 'OS DEZ MANDAMENTOS', hint: 'A história bíblica de Moisés líderando o povo.' },
    { word: 'MALHAÇÃO', hint: 'Série/Novela juvenil que durou décadas na TV.' },
    { word: 'O OUTRO LADO DO PARAÍSO', hint: 'Clara e seu retorno triunfal: "Vocês não imaginam o prazer que é estar de volta".' },
    { word: 'A DONA DO PEDAÇO', hint: 'Maria da Paz e seus bolos de sucesso.' },
    { word: 'AMOR À VIDA', hint: 'Félix e sua icônica jornada de vilão a queridinho.' },
    { word: 'IMPÉRIO', hint: 'O Comendador José Alfredo e seu império de joias.' },
    { word: 'FINA ESTAMPA', hint: 'Pereirão e sua rivalidade com Tereza Cristina.' },
    { word: 'ALMA GÊMEA', hint: 'Rafael e Serena em uma história de reencarnação.' },
    { word: 'MULHERES DE AREIA', hint: 'As gêmeas Ruth e Raquel no litoral paulista.' },
    { word: 'VAMP', hint: 'Novela cômica sobre vampiros em Armação dos Anjos.' },
    { word: 'SARAMANDAIA', hint: 'Cidade onde coisas fantásticas acontecem, como o homem que voa.' },
    { word: 'FORÇA DE UM DESEJO', hint: 'Novela de época com Ester Delamare e Inácio.' },
    { word: 'TERRA NOSTRA', hint: 'A imigração italiana no Brasil com Giuliana e Matteo.' },
    { word: 'RENASCER', hint: 'José Inocêncio e o facão aos pés do Jequitibá.' },
    { word: 'PEDRA SOBRE PEDRA', hint: 'Rivalidade entre os Pontes e os Batista em Resplendor.' },
    { word: 'FERA FERIDA', hint: 'Feliciano Júnior volta para Tubiacanga em busca de vingança.' },
    { word: 'TUDO OU NADA', hint: 'Novela da Manchete sobre o mundo dos diamantes.' },
    { word: 'A SUCESSORA', hint: 'A jovem Marina se casa e vai morar em uma mansão com o retrato da falecida.' },
    { word: 'DANCIN DAYS', hint: 'Júlia Matos sai da prisão e tenta recuperar o amor da filha.' },
    { word: 'ÁGUA VIVA', hint: 'Luta de uma órfã para encontrar seu pai biológico no Rio.' },
    { word: 'BAILA COMIGO', hint: 'Gêmeos separados que não sabem da existência um do outro.' },
    { word: 'ELAS POR ELAS', hint: 'Sete amigas se reencontram após 20 anos.' },
    { word: 'GUERRA DOS SEXOS', hint: 'Disputa pela herança e pela loja Charlies entre Charlô e Otávio.' },
    { word: 'VEREDA TROPICAL', hint: 'Silvana luta pela guarda do filho contra o avô milionário.' },
    { word: 'A GATA COMEU', hint: 'Jô Penteado e o professor Fábio em uma ilha deserta.' },
    { word: 'SELVA DE PEDRA', hint: 'Cristiano Vilas e o dilema entre a ambição e o amor por Simone.' },
    { word: 'BREGA E CHIQUE', hint: 'Duas mulheres, uma rica e uma pobre, que dividem o mesmo marido sem saber.' },
    { word: 'MANDALA', hint: 'Adaptação do mito de Édipo para a realidade brasileira.' },
    { word: 'VALE TUDO', hint: 'Raquel e a filha Maria de Fátima em um Brasil sem ética.' },
    { word: 'QUE REI SOU EU', hint: 'Sátira política ambientada no reino imaginário de Avilan.' },
    { word: 'TOP MODEL', hint: 'A vida dos surfistas e modelos na praia da Macumba.' },
    { word: 'RAINHA DA SUCATA', hint: 'Maria do Carmo, a nova rica, e a decadente Laurinha Figueroa.' },
    { word: 'MEU BEM MEU MAL', hint: 'Disputas pelo poder na empresa Venturini Designer.' },
    { word: 'O DONO DO MUNDO', hint: 'O cirurgião Felipe Barreto e a aposta de seduzir uma virgem.' },
    { word: 'DE CORPO E ALMA', hint: 'Troca de corações e o submundo dos clubes masculinos.' },
    { word: 'SONHO MEU', hint: 'A pequena Maria Carolina e sua busca pela mãe.' },
    { word: 'A VIAGEM', hint: 'Vida após a morte e o espírito obsessivo de Alexandre.' },
    { word: 'QUATRO POR QUATRO', hint: 'Quatro mulheres se unem para se vingar de seus ex-maridos.' },
    { word: 'A PRÓXIMA VÍTIMA', hint: 'Mistério sobre uma série de assassinatos baseados no horóscopo chinês.' },
    { word: 'EXPLODE CORAÇÃO', hint: 'A cultura cigana e o início da internet no Brasil.' },
    { word: 'XICA DA SILVA', hint: 'A escrava que virou rainha no Tijuco.' },
    { word: 'ANJO MAU', hint: 'A babá Nice disposta a tudo para subir na vida.' },
    { word: 'POR AMOR', hint: 'Até onde você iria por amor? Helena troca seu bebê pelo da filha.' },
    { word: 'TORRE DE BABEL', hint: 'A explosão do shopping Tropical Towers e seus mistérios.' },
    { word: 'SUAVE VENENO', hint: 'Waldomiro Cerqueira e a misteriosa Inês/Lavínia.' },
    { word: 'UM ANJO CAIU DO CÉU', hint: 'O anjo Rafael vem à Terra para ajudar o fotógrafo João Medeiros.' },
    { word: 'O BEIJO DO VAMPIRO', hint: 'Bento luta contra o vampiro Boris pelo amor de Cecília.' },
    { word: 'CELEBRIDADE', hint: 'A rivalidade entre Maria Clara Diniz e a invejosa Laura.' },
    { word: 'SENHORA DO DESTINO', hint: 'Maria do Carmo e a busca por sua filha Lindalva.' },
    { word: 'BELÍSSIMA', hint: 'A vilã Bia Falcão: "Pobreza pega!".' },
    { word: 'PÁGINAS DA VIDA', hint: 'Nanda morre no parto e a avó rejeita a neta com síndrome de Down.' },
    { word: 'A FAVORITA', hint: 'Donatela e Flora em uma trama onde o público não sabia quem era a vilã.' },
    { word: 'CIRANDA DE PEDRA', hint: 'Dramas familiares em uma mansão no Jardim Europa.' },
    { word: 'PASSIONE', hint: 'Bete Gouveia descobre que seu filho dado como morto está vivo na Itália.' },
    { word: 'CORDEL ENCANTADO', hint: 'Açucena e Jesuíno em um sertão místico e heróico.' },
    { word: 'FINA ESTAMPA', hint: 'Griselda, uma mulher que ganha na loteria e enfrenta a arrogância da elite.' },
    { word: 'CHEIAS DE CHARME', hint: 'As Empreguetes: Penha, Cida e Rosário.' },
    { word: 'AMOR À VIDA', hint: 'Félix e a vilania cômica que conquistou o Brasil.' },
    { word: 'VERDADES SECRETAS', hint: 'O submundo da moda e o "book rosa".' },
    { word: 'ETA MUNDO BOM', hint: 'Candinho e o lema: "Tudo o que acontece de ruim é para melhorar".' },
    { word: 'A FORÇA DO QUERER', hint: 'Bibi Perigosa e o mundo do tráfico.' },
    { word: 'ESPELHO DA VIDA', hint: 'Cris Valência e sua jornada no tempo para desvendar um crime.' },
    { word: 'AMOR DE MÃE', hint: 'Lurdes, Thelma e Vitória em diferentes formas de maternidade.' },
    { word: 'PANTANAL', hint: 'Remake da história de Jove e Juma no coração do Brasil.' },
    { word: 'TRAVESSIA', hint: 'Brisa e a lida com as fake news e deepfakes.' },
    { word: 'TERRA E PAIXÃO', hint: 'Aline luta por suas terras contra a família La Selva.' },
    { word: 'XANADU', hint: 'Não é bem uma novela, mas vamos focar em: BETO ROCKFELLER.' },
    { word: 'ESTÚPIDO CUPIDO', hint: 'Saudosismo dos anos sessenta em Albuquerque.' },
    { word: 'SARAMANDAIA', hint: 'Zico Rosado põe formigas pelo nariz.' },
    { word: 'A INDOMADA', hint: 'Altiva e a cidade de Greenville.' },
    { word: 'O CRAVO E A ROSA', hint: 'Catarina e Petruchio em uma adaptação de Shakespeare.' },
    { word: 'COBRAS E LAGARTOS', hint: 'Foguinho e seu império Luxus.' },
    { word: 'CUIDADO COM O ANJO', hint: 'Malu e João Miguel, um clássico mexicano exibido no Brasil.' },
    { word: 'REBELDE', hint: 'Novela juvenil que gerou o fenômeno musical RBD.' },
    { word: 'RUBI', hint: 'A ambiciosa protagonista que usa sua beleza para subir na vida.' },
    { word: 'MARIA DO BAIRRO', hint: 'A trilogia das Marias com Thalía.' },
    { word: 'A USURPADORA', hint: 'Paulina e Paola Bracho vivendo a vida uma da outra.' },
    { word: 'HISTÓRIA DE AMOR', hint: 'Helena e o pediatra Carlos em um triângulo amoroso.' },
    { word: 'CARA E COROA', hint: 'Fernanda e Vitória, sósias que trocam de lugar.' },
    { word: 'QUEM É VOCÊ', hint: 'Mistério sobre a identidade de uma mulher que usa máscaras.' },
    { word: 'ZAZÁ', hint: 'Zazá Dumont e o sonho de fazer o homem voar novamente.' }
  ],
  'Cidades do mundo': [
    { word: 'PARIS', hint: 'Cidade Luz, capital da França.' },
    { word: 'TÓQUIO', hint: 'Capital do Japão.' },
    { word: 'LONDRES', hint: 'Capital da Inglaterra, terra do Big Ben.' },
    { word: 'RECIFE', hint: 'Veneza brasileira.' },
    { word: 'VENEZA', hint: 'Cidade italiana famosa pelos seus canais.' },
    { word: 'ROMA', hint: 'Cidade eterna, capital da Itália.' },
    { word: 'NOVA YORK', hint: 'A cidade que nunca dorme.' },
    { word: 'LISBOA', hint: 'Capital de Portugal.' },
    { word: 'BARCELONA', hint: 'Cidade espanhola famosa por Gaudí.' },
    { word: 'RIO DE JANEIRO', hint: 'Cidade maravilhosa no Brasil.' },
    { word: 'DUBAI', hint: 'Cidade famosa por seus arranha-céus.' },
    { word: 'BERLIM', hint: 'Capital da Alemanha.' },
    { word: 'AMSTERDAM', hint: 'Cidade dos canais e bicicletas na Holanda.' },
    { word: 'PEQUIM', hint: 'Capital da China.' },
    { word: 'MADRID', hint: 'Capital da Espanha.' },
    { word: 'BUENOS AIRES', hint: 'Capital da Argentina, terra do tango.' },
    { word: 'SANTIAGO', hint: 'Capital do Chile.' },
    { word: 'CIDADE DO MÉXICO', hint: 'Capital do México, construída sobre um lago.' },
    { word: 'MONTREAL', hint: 'Cidade canadense onde se fala francês.' },
    { word: 'TORONTO', hint: 'A maior cidade do Canadá.' },
    { word: 'CHICAGO', hint: 'A cidade dos ventos nos EUA.' },
    { word: 'LOS ANGELES', hint: 'Cidade de Hollywood e do entretenimento.' },
    { word: 'SAN FRANCISCO', hint: 'Cidade da ponte Golden Gate.' },
    { word: 'MIAMI', hint: 'Cidade praiana famosa na Flórida.' },
    { word: 'SEOUL', hint: 'Capital tecnológica da Coreia do Sul.' },
    { word: 'BANGKOK', hint: 'Capital da Tailândia famosa pelos templos.' },
    { word: 'CINGAPURA', hint: 'Cidade-estado moderna no sudeste asiático.' },
    { word: 'SYDNEY', hint: 'Cidade australiana famosa por sua Ópera.' },
    { word: 'MELBOURNE', hint: 'Cidade da cultura e café na Austrália.' },
    { word: 'CIDADE DO CABO', hint: 'Cidade na ponta da África do Sul.' },
    { word: 'CAIRO', hint: 'Cidade perto das grandes pirâmides.' },
    { word: 'ISTAMBUL', hint: 'Cidade entre a Europa e a Ásia.' },
    { word: 'MOSCOU', hint: 'Capital da Rússia e terra da Praça Vermelha.' },
    { word: 'ESTOCOLMO', hint: 'Capital da Suécia construída em ilhas.' },
    { word: 'OSLO', hint: 'Capital da Noruega.' },
    { word: 'COPENHAGUE', hint: 'Capital da Dinamarca.' },
    { word: 'VIENA', hint: 'Capital austríaca da música clássica.' },
    { word: 'PRAGA', hint: 'Cidade das cem torres na República Tcheca.' },
    { word: 'BUDAPESTE', hint: 'Pérola do Danúbio na Hungria.' },
    { word: 'ATENAS', hint: 'Capital da Grécia e berço da democracia.' },
    { word: 'FLORENÇA', hint: 'Cidade berço do Renascimento italiano.' },
    { word: 'MILÃO', hint: 'Capital da moda na Itália.' },
    { word: 'MUNIQUE', hint: 'Cidade alemã famosa pela Oktoberfest.' },
    { word: 'ZURIQUE', hint: 'Maior cidade da Suíça.' },
    { word: 'SAO PAULO', hint: 'A maior metrópole da América do Sul.' },
    { word: 'SALVADOR', hint: 'Primeira capital do Brasil.' },
    { word: 'CURITIBA', hint: 'Cidade modelo em urbanismo no Brasil.' },
    { word: 'MANAUS', hint: 'A metrópole da Amazônia.' },
    { word: 'FORTALEZA', hint: 'Cidade do sol no Ceará.' },
    { word: 'JERUSALÉM', hint: 'Cidade sagrada para várias religiões.' },
    { word: 'SÃO PAULO', hint: 'A terra da garoa e maior cidade do Brasil.' },
    { word: 'BRASÍLIA', hint: 'Capital do Brasil projetada por Niemeyer.' },
    { word: 'BELO HORIZONTE', hint: 'Capital mineira, cidade dos botecos.' },
    { word: 'PORTO ALEGRE', hint: 'Capital gaúcha, terra do chimarrão.' },
    { word: 'FLORIANÓPOLIS', hint: 'A Ilha da Magia em Santa Catarina.' },
    { word: 'BELÉM', hint: 'Cidade das mangueiras no Pará.' },
    { word: 'NATAL', hint: 'Cidade do sol e das dunas no Rio Grande do Norte.' },
    { word: 'MACEIÓ', hint: 'Paraíso das águas em Alagoas.' },
    { word: 'JOÃO PESSOA', hint: 'Onde o sol nasce primeiro no Brasil.' },
    { word: 'VICTORIA', hint: 'Capital de Seychelles ou cidade no Canadá.' },
    { word: 'VANCOUVER', hint: 'Cidade canadense entre o mar e as montanhas.' },
    { word: 'SAN ANTTONIO', hint: 'Cidade texana do Alamo.' },
    { word: 'HOUSTON', hint: 'Cidade do centro espacial da NASA.' },
    { word: 'NEW ORLEANS', hint: 'Berço do jazz na Louisiana.' },
    { word: 'LAS VEGAS', hint: 'A capital mundial do entretenimento e cassinos.' },
    { word: 'SEATTLE', hint: 'Cidade do grunge e da Space Needle.' },
    { word: 'PORTLAND', hint: 'Cidade "esquisita" e verde no Oregon.' },
    { word: 'DENVER', hint: 'A cidade de uma milha de altura no Colorado.' },
    { word: 'MEXICO CITY', hint: 'Grande metrópole construída sobre ruínas astecas.' },
    { word: 'CANCUN', hint: 'Destino turístico famoso no Caribe mexicano.' },
    { word: 'HAVANA', hint: 'Capital de Cuba, famosa pelos carros antigos.' },
    { word: 'LIMA', hint: 'Capital gastronômica do Peru.' },
    { word: 'CUSCO', hint: 'Antiga capital do império Inca.' },
    { word: 'BOGOTÁ', hint: 'Capital colombiana nas alturas dos Andes.' },
    { word: 'MEDELLIN', hint: 'Cidade da eterna primavera na Colômbia.' },
    { word: 'CARTAGENA', hint: 'Cidade amuralhada histórica na Colômbia.' },
    { word: 'MONTEVIDEO', hint: 'Capital tranquila do Uruguai.' },
    { word: 'ASUNCION', hint: 'Capital do Paraguai.' },
    { word: 'LA PAZ', hint: 'Capital mais alta do mundo, na Bolívia.' },
    { word: 'REYKJAVIK', hint: 'Capital da Islândia.' },
    { word: 'DUBLIN', hint: 'Capital da Irlanda, terra da Guinness.' },
    { word: 'EDINBURGH', hint: 'Capital da Escócia, com seu castelo icônico.' },
    { word: 'BRUSSELS', hint: 'Sede da União Europeia na Bélgica.' },
    { word: 'LUXEMBOURG', hint: 'Pequena e rica capital europeia.' },
    { word: 'GENEVA', hint: 'Cidade suíça sede de organizações internacionais.' },
    { word: 'MONACO', hint: 'Principado luxuoso no Mediterrâneo.' },
    { word: 'NICE', hint: 'Cidade na Riviera Francesa.' },
    { word: 'MARSEILLE', hint: 'Grande porto histórico no sul da França.' },
    { word: 'LYON', hint: 'Capital gastronômica da França.' }
  ],
  'Esportes': [
    { word: 'BASQUETE', hint: 'Esporte jogado com uma cesta.' },
    { word: 'NATAÇÃO', hint: 'Esporte praticado em piscinas.' },
    { word: 'TÊNIS', hint: 'Esporte praticado com raquetes e uma bola amarela.' },
    { word: 'VÔLEI', hint: 'Esporte jogado com uma rede alta.' },
    { word: 'ATLETISMO', hint: 'Conjunto de esportes como corrida e saltos.' },
    { word: 'JUDÔ', hint: 'Arte marcial japonesa.' },
    { word: 'GINÁSTICA', hint: 'Esporte de força, flexibilidade e acrobacia.' },
    { word: 'CICLISMO', hint: 'Esporte de corrida de bicicletas.' },
    { word: 'SURFE', hint: 'Esporte praticado nas ondas do mar.' },
    { word: 'ESGRIMA', hint: 'Esporte de combate com espadas.' },
    { word: 'BEISEBOL', hint: 'Esporte popular nos EUA jogado com taco e bola.' },
    { word: 'GOLF', hint: 'Esporte jogado em campos vastos com buracos.' },
    { word: 'BOXE', hint: 'Esporte de combate com luvas.' },
    { word: 'KARATÊ', hint: 'Arte marcial focada em socos e chutes.' },
    { word: 'TAEKWONDO', hint: 'Arte marcial coreana focada em chutes.' },
    { word: 'CANOAGEM', hint: 'Esporte de remo em caiaques ou canoas.' },
    { word: 'REMO', hint: 'Esporte de barcos movidos a remos.' },
    { word: 'HIPISMO', hint: 'Esporte praticado com cavalos.' },
    { word: 'HANDEBOL', hint: 'Esporte de quadra jogado com as mãos.' },
    { word: 'RUGBY', hint: 'Esporte de contato intenso e bola oval.' },
    { word: 'SOFTBOL', hint: 'Versão similar ao beisebol.' },
    { word: 'SQUASH', hint: 'Esporte de raquete contra a parede.' },
    { word: 'BADMINTON', hint: 'Esporte jogado com peteca.' },
    { word: 'PADEL', hint: 'Esporte de raquete em quadra fechada.' },
    { word: 'CROSSFIT', hint: 'Treinamento de alta intensidade.' },
    { word: 'MUSCULAÇÃO', hint: 'Levantamento de peso na academia.' },
    { word: 'PILATES', hint: 'Método de controle muscular e postura.' },
    { word: 'YOGA', hint: 'Prática de meditação, respiração e posturas.' },
    { word: 'SKATE', hint: 'Esporte de prancha com quatro rodas.' },
    { word: 'PATINAÇÃO', hint: 'Deslizar sobre patins no gelo ou rodas.' },
    { word: 'ESQUI', hint: 'Deslizar na neve com dois suportes nos pés.' },
    { word: 'SNOWBOARD', hint: 'Deslizar na neve com uma prancha.' },
    { word: 'ALPINISMO', hint: 'Subir montanhas elevadas.' },
    { word: 'MERGULHO', hint: 'Explorar o fundo do mar com cilindro.' },
    { word: 'PARAQUEDISMO', hint: 'Saltar de aviões com paraquedas.' },
    { word: 'ASA DELTA', hint: 'Voo livre em aeronave de lona.' },
    { word: 'TRIATLO', hint: 'Natação, ciclismo e corrida em sequência.' },
    { word: 'MARATONA', hint: 'Corrida de 42 quilômetros.' },
    { word: 'MOTOCICLISMO', hint: 'Corridas de motos.' },
    { word: 'FÓRMULA UM', hint: 'A elite do automobilismo mundial.' },
    { word: 'RALLY', hint: 'Corridas de carros em terrenos variados.' },
    { word: 'POLO AQUÁTICO', hint: 'Esporte de equipe jogado em piscinas.' },
    { word: 'TIRO COM ARCO', hint: 'Precisão ao atirar flechas em alvos.' },
    { word: 'PENTATLO', hint: 'Cinco provas diferentes de esportes.' },
    { word: 'TÊNIS DE MESA', hint: 'Popularmente conhecido como pingue-pongue.' },
    { word: 'BOCHA', hint: 'Esporte de precisão com bolas pesadas.' },
    { word: 'SINUCA', hint: 'Jogo de mesa com tacos e bolas coloridas.' },
    { word: 'XADREZ', hint: 'Esporte da mente e estratégia no tabuleiro.' },
    { word: 'DAMAS', hint: 'Jogo de peças em tabuleiro quadriculado.' },
    { word: 'DOMINÓ', hint: 'Jogo de peças com pontos de zero a seis.' },
    { word: 'FUTSAL', hint: 'Futebol de salão.' },
    { word: 'FUTEBOL DE AREIA', hint: 'Futebol jogado na praia.' },
    { word: 'BIRIBOL', hint: 'Vôlei jogado em piscina.' },
    { word: 'POLO', hint: 'Esporte jogado a cavalo com taco e bola.' },
    { word: 'CRÍQUETE', hint: 'Esporte popular na Índia e Inglaterra com bastões.' },
    { word: 'LACROSSE', hint: 'Esporte de equipe jogado com bastões com rede.' },
    { word: 'DARDOS', hint: 'Lançamento de pequenos projéteis em um alvo circular.' },
    { word: 'Boliche', hint: 'Derrubar pinos com uma bola pesada.' },
    { word: 'Pesca esportiva', hint: 'Capturar e soltar peixes por lazer.' },
    { word: 'Paintball', hint: 'Jogo de estratégia com fardas e bolas de tinta.' },
    { word: 'Airsoft', hint: 'Simulação militar com armas de pressão.' },
    { word: 'Karatê de contato', hint: 'Estilo de karatê com golpes reais.' },
    { word: 'Kung Fu', hint: 'Arte marcial chinesa inspirada em animais.' },
    { word: 'Muay Thai', hint: 'Boxe tailandês que usa oito armas do corpo.' },
    { word: 'Jiu Jitsu', hint: 'Arte marcial focada em finalizações no chão.' },
    { word: 'Sumô', hint: 'Luta tradicional japonesa entre gigantes.' },
    { word: 'Luta Livre', hint: 'Entretenimento esportivo com coreografias de combate.' },
    { word: 'Cabo de guerra', hint: 'Duas equipes puxando uma corda.' },
    { word: 'Queimada', hint: 'Jogo de acertar o oponente com a bola.' },
    { word: 'Esconde-esconde', hint: 'Brincadeira de procurar quem se ocultou.' },
    { word: 'Pega-pega', hint: 'Brincadeira de correr atrás dos outros.' },
    { word: 'Pular corda', hint: 'Exercício de saltar sobre uma corda em movimento.' },
    { word: 'Amarelinha', hint: 'Brincadeira de saltar em quadrados numerados.' },
    { word: 'Peteca', hint: 'Esporte brasileiro de bater com a mão em uma bolsa de penas.' },
    { word: 'Iatismo', hint: 'Corrida de barcos a vela.' },
    { word: 'Windsurfe', hint: 'Surfe com uma vela acoplada à prancha.' },
    { word: 'Kitesurfe', hint: 'Surfe puxado por uma pipa gigante.' },
    { word: 'Wakeboard', hint: 'Esporte de prancha puxado por lancha.' },
    { word: 'Stand Up Paddle', hint: 'Remar em pé sobre uma prancha larga.' },
    { word: 'Bodyboard', hint: 'Surfe deitado em uma prancha curta e macia.' },
    { word: 'Parkour', hint: 'Arte do deslocamento urbano superando obstáculos.' },
    { word: 'Slackline', hint: 'Equilibrar-se em uma fita de nylon esticada.' },
    { word: 'Paraquedismo de salto livre', hint: 'Queda livre antes de abrir o paraquedas.' },
    { word: 'Base Jump', hint: 'Salto de paraquedas de lugares fixos como prédios.' },
    { word: 'Bungee Jump', hint: 'Saltar de altura preso por um elástico.' },
    { word: 'Rapel', hint: 'Descida em paredões usando cordas.' },
    { word: 'Caving', hint: 'Exploração esportiva de cavernas.' },
    { word: 'Cannyoning', hint: 'Exploração de canais e rios descendo cachoeiras.' },
    { word: 'Orientação', hint: 'Corrida usando bússola e mapa no mato.' }
  ],
  'Futebol': [
    { word: 'ESCANTEIO', hint: 'Cobrança do canto do campo.' },
    { word: 'IMPEDIMENTO', hint: 'Regra que confunde muita gente no futebol.' },
    { word: 'PÊNALTI', hint: 'Cobrança direta de falta dentro da área.' },
    { word: 'GOLEADOR', hint: 'Jogador que faz muitos gols.' },
    { word: 'ESTÁDIO', hint: 'Local onde ocorrem as partidas.' },
    { word: 'LIBERTADORES', hint: 'Principal torneio de clubes das Américas.' },
    { word: 'DERBY', hint: 'Um clássico regional entre dois rivais.' },
    { word: 'ARTILHEIRO', hint: 'Quem mais marcou gols em um campeonato.' },
    { word: 'ZAGUEIRO', hint: 'Jogador de defesa.' },
    { word: 'MEIO-CAMPO', hint: 'Cérebro do time que arma jogadas.' },
    { word: 'GOLEIRO', hint: 'Quem defende o gol.' },
    { word: 'COPA DO MUNDO', hint: 'Maior evento de futebol entre nações.' },
    { word: 'LATERAL', hint: 'Jogador de lado de campo.' },
    { word: 'VOLANTE', hint: 'Jogador de meio-campo defensivo.' },
    { word: 'ATACANTE', hint: 'Jogador responsável pelo ataque.' },
    { word: 'PONTA', hint: 'Atacante que joga pelos lados.' },
    { word: 'CAMISA DEZ', hint: 'Número clássico do craque do time.' },
    { word: 'CHAPÉU', hint: 'Drible por cima da cabeça do adversário.' },
    { word: 'CANETA', hint: 'Passar a bola por entre as pernas do rival.' },
    { word: 'ELÁSTICO', hint: 'Drible rápido com o peito do pé.' },
    { word: 'BICICLETA', hint: 'Chute acrobático no ar de costas pro gol.' },
    { word: 'PEIXINHO', hint: 'Cabeceio mergulhando rente ao chão.' },
    { word: 'GOL CONTRA', hint: 'Quando o jogador marca no próprio gol.' },
    { word: 'TRAVE', hint: 'Poste lateral ou superior do gol.' },
    { word: 'REDE', hint: 'Onde a bola repousa após o gol.' },
    { word: 'BANDEIRINHA', hint: 'Assistente do árbitro.' },
    { word: 'ÁRBITRO', hint: 'Quem apita a partida.' },
    { word: 'VAR', hint: 'Árbitro de vídeo que revisa jogadas.' },
    { word: 'CARTÃO AMARELO', hint: 'Advertência por falta.' },
    { word: 'CARTÃO VERMELHO', hint: 'Expulsão definitiva do jogador.' },
    { word: 'SUBSTITUIÇÃO', hint: 'Troca de um jogador por outro.' },
    { word: 'INTERVALO', hint: 'Pausa entre os dois tempos do jogo.' },
    { word: 'ACRÉSCIMOS', hint: 'Tempo adicionado ao final da partida.' },
    { word: 'Prorrogação', hint: 'Tempo extra em caso de empate.' },
    { word: 'GOL DE PLACA', hint: 'Gol tão bonito que merece uma homenagem.' },
    { word: 'HAT TRICK', hint: 'Quando o jogador faz três gols na mesma partida.' },
    { word: 'CHAMPIONS LEAGUE', hint: 'O maior torneio de clubes da Europa.' },
    { word: 'BRASILEIRÃO', hint: 'O campeonato nacional do Brasil.' },
    { word: 'SULA-AMERICANA', hint: 'Torneio continental secundário da América.' },
    { word: 'RECOPA', hint: 'Disputa entre campeões continentais.' },
    { word: 'BOLA DE OURO', hint: 'Prêmio dado ao melhor jogador do mundo.' },
    { word: 'FIFA', hint: 'Entidade máxima do futebol mundial.' },
    { word: 'CBF', hint: 'Federação brasileira de futebol.' },
    { word: 'TREINADOR', hint: 'Quem comanda o time tecnicamente.' },
    { word: 'CAPITÃO', hint: 'Líder do time dentro de campo.' },
    { word: 'RESERVA', hint: 'Jogador que fica no banco.' },
    { word: 'TORCIDA', hint: 'Os fãs que apoiam o time.' },
    { word: 'ULTRASS', hint: 'Torcedores fanáticos e organizados.' },
    { word: 'CATEGORIA DE BASE', hint: 'Onde se formam os novos jogadores.' },
    { word: 'MERCADO DA BOLA', hint: 'Janela de transferências de jogadores.' },
    { word: 'CANELADA', hint: 'Falta grosseira atingindo a canela.' },
    { word: 'CATIMBA', hint: 'Provocação ou cera para irritar o adversário.' },
    { word: 'CHOQUE-REI', hint: 'Clássico entre São Paulo e Palmeiras.' },
    { word: 'FLA-FLU', hint: 'Clássico épico entre Flamengo e Fluminense.' },
    { word: 'GRENAL', hint: 'A maior rivalidade do Rio Grande do Sul.' },
    { word: 'DERBY PAULISTA', hint: 'Confronto entre Corinthians e Palmeiras.' },
    { word: 'MAJESTOSO', hint: 'Clássico entre Corinthians e São Paulo.' },
    { word: 'CLÁSSICO DOS MILHÕES', hint: 'Vasco versus Flamengo.' },
    { word: 'Vovô', hint: 'O clássico mais antigo do Brasil (Botafogo x Fluminense).' },
    { word: 'LIXO', hint: 'Termo pejorativo para um jogo muito ruim.' },
    { word: 'PELEJA', hint: 'Um jogo muito disputado e sofrido.' },
    { word: 'CHUTEIRA', hint: 'Calçado especial com travas.' },
    { word: 'TORCIDA ORGANIZADA', hint: 'Fãs que cantam e apoiam em grupo uniforme.' },
    { word: 'MANDANTE', hint: 'O time que joga em seu próprio estádio.' },
    { word: 'VISITANTE', hint: 'O time que joga fora de casa.' },
    { word: 'ZONA DE REBAIXAMENTO', hint: 'As quatro últimas posições da tabela.' },
    { word: 'G-4', hint: 'Os quatro primeiros colocados de um campeonato.' },
    { word: 'LANTERNA', hint: 'O último colocado na classificação.' },
    { word: 'CARRINHO', hint: 'Entrada deslizando sobre o gramado.' },
    { word: 'ESCUDO', hint: 'O emblema do time no peito da camisa.' },
    { word: 'HINO', hint: 'Canção oficial do clube.' },
    { word: 'SÓCIO TORCEDOR', hint: 'Fã que paga mensalidade para ajudar o clube.' },
    { word: 'CATEGORIA DE BASE', hint: 'Onde os futuros craques são formados.' },
    { word: 'PENEIRA', hint: 'Teste para selecionar jovens jogadores.' },
    { word: 'EMPRESÁRIO', hint: 'Quem faz o meio-campo nas negociações de jogadores.' },
    { word: 'DIRIGENTE', hint: 'Quem comanda o clube administrativamente.' },
    { word: 'PRESIDENTE', hint: 'Autoridade máxima de um clube.' },
    { word: 'ESTADUAL', hint: 'Campeonato disputado dentro de um estado.' },
    { word: 'COPA DO BRASIL', hint: 'Torneio de mata-mata nacional muito lucrativo.' },
    { word: 'MUNDIAL DE CLUBES', hint: 'Disputa entre os campeões de cada continente.' },
    { word: 'EUROCOPA', hint: 'Campeonato de seleções da Europa.' },
    { word: 'COPA AMÉRICA', hint: 'Campeonato de seleções da América do Sul.' },
    { word: 'OLIMPÍADAS', hint: 'Evento multiesportivo que também tem futebol.' },
    { word: 'SELEÇÃO BRASILEIRA', hint: 'O time que representa o Brasil.' },
    { word: 'CANARINHO', hint: 'Apelido da seleção devido à cor amarela.' },
    { word: 'MARACANÃ', hint: 'O templo do futebol mundial no Rio.' },
    { word: 'WEMBLEY', hint: 'Estádio místico na Inglaterra.' },
    { word: 'SANTIAGO BERNABEU', hint: 'A casa do Real Madrid.' },
    { word: 'CAMP NOU', hint: 'O gigante estádio do Barcelona.' }
  ],
  'Geografia/História': [
    { word: 'AMAZÔNIA', hint: 'Maior floresta tropical do mundo.' },
    { word: 'PIRÂMIDES', hint: 'Grandes monumentos do Egito Antigo.' },
    { word: 'CONTINENTE', hint: 'Grande massa de terra cercada por oceanos.' },
    { word: 'DESCOBRIMENTO', hint: 'Evento histórico de 1500 no Brasil.' },
    { word: 'RENASCIMENTO', hint: 'Período cultural e artístico europeu.' },
    { word: 'PANTANAL', hint: 'Maior planície inundável do mundo.' },
    { word: 'EVEREST', hint: 'A montanha mais alta do mundo.' },
    { word: 'REVOLUÇÃO', hint: 'Uma mudança radical na história.' },
    { word: 'MONARQUIA', hint: 'Governo exercido por um rei ou rainha.' },
    { word: 'DEMOCRACIA', hint: 'Governo do povo.' },
    { word: 'EGITO', hint: 'Terra dos faraós e do Rio Nilo.' },
    { word: 'GRÉCIA', hint: 'Berço da civilização ocidental e das Olimpíadas.' },
    { word: 'KILIMANJARO', hint: 'A montanha mais alta da África.' },
    { word: 'CORDILHEIRA', hint: 'Cadeia de montanhas extensas.' },
    { word: 'ANDES', hint: 'Cadeia de montanhas na América do Sul.' },
    { word: 'HIMALAIA', hint: 'Onde estão as maiores montanhas do mundo.' },
    { word: 'SAARA', hint: 'O maior deserto quente do mundo.' },
    { word: 'GOBI', hint: 'Deserto frio na Ásia.' },
    { word: 'ATACAMA', hint: 'O deserto mais seco do planeta.' },
    { word: 'NILO', hint: 'Rio africano fundamental para o Egito.' },
    { word: 'AMAZONAS', hint: 'O rio mais volumoso do mundo.' },
    { word: 'MEDITERRÂNEO', hint: 'Mar que separa Europa, África e Ásia.' },
    { word: 'ADRIÁTICO', hint: 'Braço do mar Mediterrâneo junto à Itália.' },
    { word: 'CÁSPIO', hint: 'O maior mar fechado do mundo.' },
    { word: 'IMPÉRIO ROMANO', hint: 'Civilização que dominou o Mediterrâneo.' },
    { word: 'IDADE MÉDIA', hint: 'Período entre a Antiguidade e o Renascimento.' },
    { word: 'REVOLUÇÃO FRANCESA', hint: 'Queda da Bastilha e liberdade.' },
    { word: 'GUERRA MUNDIAL', hint: 'Conflito de escala global.' },
    { word: 'REVOLUÇÃO INDUSTRIAL', hint: 'Surgimento das máquinas e fábricas.' },
    { word: 'DESCOBRIMENTOS', hint: 'Era de navegações europeias.' },
    { word: 'COLONIZAÇÃO', hint: 'Processo de ocupação de novos territórios.' },
    { word: 'INDEPENDÊNCIA', hint: 'Quando um país se torna livre de outro.' },
    { word: 'REPÚBLICA', hint: 'Forma de governo com presidente.' },
    { word: 'DITADURA', hint: 'Governo autoritário e imposto.' },
    { word: 'CAPITALISMO', hint: 'Sistema focado no lucro e propriedade.' },
    { word: 'SOCIALISMO', hint: 'Sistema focado na igualdade social.' },
    { word: 'FEUDALISMO', hint: 'Sistema de terras e servos na Idade Média.' },
    { word: 'ANTIGUIDADE', hint: 'Período das primeiras civilizações.' },
    { word: 'ASSÍRIOS', hint: 'Povo guerreiro da Mesopotâmia.' },
    { word: 'FENÍCIOS', hint: 'Grandes navegadores e criadores do alfabeto.' },
    { word: 'INCAS', hint: 'Civilização avançada dos Andes.' },
    { word: 'MAPAS', hint: 'Representação gráfica da Terra.' },
    { word: 'CARTOGRAFIA', hint: 'Ciência de desenhar mapas.' },
    { word: 'GEOLOGIA', hint: 'Estudo da Terra e suas rochas.' },
    { word: 'VULCÃO', hint: 'Abertura na terra por onde sai lava.' },
    { word: 'TERREMOTO', hint: 'Tremor forte na crosta terrestre.' },
    { word: 'TSUNAMI', hint: 'Onda gigante causada por abalo sísmico.' },
    { word: 'OCEANOGRAFIA', hint: 'Estudo dos mares e oceanos.' },
    { word: 'METEOROLOGIA', hint: 'Estudo do clima e tempo.' },
    { word: 'PALEONTOLOGIA', hint: 'Estudo de fósseis antigos.' },
    { word: 'ARQUEOLOGIA', hint: 'Estudo de sociedades antigas através de vestígios.' },
    { word: 'ANTROPOLOGIA', hint: 'Estudo do ser humano e suas culturas.' },
    { word: 'SOCIOLOGIA', hint: 'Estudo das sociedades e relações humanas.' },
    { word: 'MONTE FUJI', hint: 'Montanha sagrada no Japão.' },
    { word: 'ESTÁTUA DA LIBERDADE', hint: 'Monumento icônico em Nova York.' },
    { word: 'TORRE EIFFEL', hint: 'Símbolo de Paris e da França.' },
    { word: 'BIG BEN', hint: 'O relógio mais famoso de Londres.' },
    { word: 'COLISEU', hint: 'Anfiteatro romano palco de gladiadores.' },
    { word: 'MACHU PICCHU', hint: 'Cidade perdida dos Incas no Peru.' },
    { word: 'GRANDE MURALHA', hint: 'Construção milenar visível do espaço na China.' },
    { word: 'PETRA', hint: 'Cidade esculpida na rocha na Jordânia.' },
    { word: 'CRISTO REDENTOR', hint: 'Monumento icônico no Rio de Janeiro.' },
    { word: 'TAJ MAHAL', hint: 'Palácio de mármore branco na Índia.' },
    { word: 'ACRÓPOLE', hint: 'Parte alta das cidades gregas, onde fica o Partenon.' },
    { word: 'VATICANO', hint: 'O menor país do mundo, sede da Igreja Católica.' },
    { word: 'CANAL DO PANAMÁ', hint: 'Obra de engenharia que liga dois oceanos.' },
    { word: 'ESTREITO DE GIBRALTAR', hint: 'Passagem entre o Mediterrâneo e o Atlântico.' },
    { word: 'MAR MORTO', hint: 'Lugar mais baixo da terra, onde nada afunda.' },
    { word: 'MAR VERMELHO', hint: 'Mar entre a África e a Arábia.' },
    { word: 'RIO VOLGA', hint: 'O rio mais longo da Europa.' },
    { word: 'RIO MISSISSIPPI', hint: 'Importante rio da América do Norte.' },
    { word: 'RIO DANÚBIO', hint: 'Rio que corta várias capitais europeias.' },
    { word: 'LAGO VITÓRIA', hint: 'O maior lago da África.' },
    { word: 'LAGO TITI CACA', hint: 'Lago navegável mais alto do mundo.' },
    { word: 'BAIA DE GUANABARA', hint: 'Baía onde fica a cidade do Rio de Janeiro.' },
    { word: 'ILHA DE PÁSCOA', hint: 'Ilha dos Moais no meio do Pacífico.' },
    { word: 'GROENLÂNDIA', hint: 'A maior ilha do mundo, coberta de gelo.' },
    { word: 'ANTÁRTIDA', hint: 'Continente gelado no Polo Sul.' },
    { word: 'ÁRTICO', hint: 'Região ao redor do Polo Norte.' },
    { word: 'CÍRCULO POLAR', hint: 'Linha imaginária que delimita as zonas frias.' },
    { word: 'TRÓPICO DE CÂNCER', hint: 'Linha imaginária no Hemisfério Norte.' },
    { word: 'TRÓPICO DE CAPRICÓRNIO', hint: 'Linha imaginária no Hemisfério Sul.' },
    { word: 'LINHA DO EQUADOR', hint: 'Divide a Terra em dois hemisférios.' },
    { word: 'MERIDIANO DE GREENWICH', hint: 'Marca o fuso horário zero.' },
    { word: 'PÓLO NORTE', hint: 'O ponto mais ao norte do globo.' },
    { word: 'PÓLO SUL', hint: 'O ponto mais ao sul do globo.' },
    { word: 'COORDENADAS', hint: 'Latitude e longitude para localização.' },
    { word: 'ESTAÇÕES DO ANO', hint: 'Primavera, verão, outono e inverno.' },
    { word: 'FUSO HORÁRIO', hint: 'Cada uma das divisões de tempo da Terra.' }
  ],
  'Ciência/Natureza': [
    { word: 'FOTOSSÍNTESE', hint: 'Processo pelo qual plantas produzem energia.' },
    { word: 'GRAVIDADE', hint: 'Força que nos mantém no chão.' },
    { word: 'EVOLUÇÃO', hint: 'Teoria de Charles Darwin.' },
    { word: 'ATMOSFERA', hint: 'Camada de gases que envolve a Terra.' },
    { word: 'PLANETA', hint: 'Corpo celeste que orbita uma estrela.' },
    { word: 'BIODIVERSIDADE', hint: 'Variedade de formas de vida em um ecossistema.' },
    { word: 'ECOSSISTEMA', hint: 'Conjunto de organismos e seu ambiente.' },
    { word: 'MOLÉCULA', hint: 'Conjunto de átomos.' },
    { word: 'GENÉTICA', hint: 'Estudo da hereditariedade.' },
    { word: 'ASTRONOMIA', hint: 'Estudo dos astros e do universo.' },
    { word: 'ÁTOMO', hint: 'Unidade básica da matéria.' },
    { word: 'DNA', hint: 'Molécula que contém as instruções genéticas.' },
    { word: 'QUASAR', hint: 'Objeto astronômico muito brilhante e distante.' },
    { word: 'PULSAR', hint: 'Estrela de nêutrons que emite rádio.' },
    { word: 'BURACO NEGRO', hint: 'Região do espaço onde nem a luz escapa.' },
    { word: 'SUPERNOVA', hint: 'Explosão violenta de uma estrela.' },
    { word: 'GALÁXIA', hint: 'Grande sistema de estrelas e planetas.' },
    { word: 'NEBULOSA', hint: 'Nuvem de gás e poeira no espaço.' },
    { word: 'METEORO', hint: 'Fragmento de rocha que entra na atmosfera.' },
    { word: 'ASTEROIDE', hint: 'Corpo rochoso que orbita o Sol.' },
    { word: 'MAGNETISMO', hint: 'Fenômeno de atração e repulsão de imãs.' },
    { word: 'TERMODINÂMICA', hint: 'Estudo do calor e energia.' },
    { word: 'ENTROPIA', hint: 'Medida de desordem de um sistema.' },
    { word: 'RELATIVIDADE', hint: 'Famosa teoria de Albert Einstein.' },
    { word: 'QUÂNTICA', hint: 'Física que estuda o mundo subatômico.' },
    { word: 'FÓTON', hint: 'Partícula elementar da luz.' },
    { word: 'PRÓTON', hint: 'Partícula positiva no núcleo do átomo.' },
    { word: 'NÊUTRON', hint: 'Partícula neutra no núcleo do átomo.' },
    { word: 'ELÉTRON', hint: 'Partícula negativa que orbita o núcleo.' },
    { word: 'BIOLOGIA', hint: 'Ciência que estuda a vida.' },
    { word: 'QUÍMICA', hint: 'Ciência das substâncias e suas reações.' },
    { word: 'FÍSICA', hint: 'Ciência das leis fundamentais do universo.' },
    { word: 'GEOLOGIA', hint: 'Estudo da estrutura da Terra.' },
    { word: 'BOTÂNICA', hint: 'Estudo das plantas.' },
    { word: 'ZOOLOGIA', hint: 'Estudo dos animais.' },
    { word: 'ECOLOGIA', hint: 'Estudo das interações entre seres vivos.' },
    { word: 'MICROBIOLOGIA', hint: 'Estudo de seres microscópicos.' },
    { word: 'VIROLOGIA', hint: 'Estudo dos vírus.' },
    { word: 'BACTERIA', hint: 'Seres unicelulares procariontes.' },
    { word: 'CÉLULA', hint: 'Unidade funcional e estrutural da vida.' },
    { word: 'MEMBRANA', hint: 'Capa que envolve a célula.' },
    { word: 'CITOPLASMA', hint: 'Conteúdo interno da célula.' },
    { word: 'MITOCÔNDRIA', hint: 'Usina de energia da célula.' },
    { word: 'CLOROPLASTO', hint: 'Onde ocorre a fotossíntese nas plantas.' },
    { word: 'ANATOMIA', hint: 'Estudo da estrutura dos seres vivos.' },
    { word: 'FISIOLOGIA', hint: 'Estudo do funcionamento dos organismos.' },
    { word: 'EMBRIOLOGIA', hint: 'Estudo do desenvolvimento do embrião.' },
    { word: 'BIOQUÍMICA', hint: 'Processos químicos nos seres vivos.' },
    { word: 'FARMACOLOGIA', hint: 'Estudo dos medicamentos e seus efeitos.' },
    { word: 'VACINA', hint: 'Substância que gera imunidade.' },
    { word: 'ANTIBIÓTICO', hint: 'Medicamento contra bactérias.' },
    { word: 'INFECÇÃO', hint: 'Invasão do corpo por agentes patogênicos.' },
    { word: 'EPIDEMIA', hint: 'Surto de doença em uma região.' },
    { word: 'PANDEMIA', hint: 'Surto global de uma doença.' },
    { word: 'METABOLISMO', hint: 'Conjunto de reações químicas no corpo.' },
    { word: 'DIGESTÃO', hint: 'Processo de quebra dos alimentos.' },
    { word: 'RESPIRAÇÃO', hint: 'Troca de gases entre o ser vivo e o ambiente.' },
    { word: 'CIRCULAÇÃO', hint: 'Transporte de substâncias pelo sangue.' },
    { word: 'EXCREÇÃO', hint: 'Eliminação de resíduos metabólicos.' },
    { word: 'SISTEMA NERVOSO', hint: 'Controla as funções do corpo e envia sinais.' },
    { word: 'SISTEMA IMUNE', hint: 'Defesa do corpo contra invasores.' },
    { word: 'SISTEMA ÓSSEO', hint: 'Estrutura de suporte do corpo humano.' },
    { word: 'MÚSCULO', hint: 'Tecido responsável pelos movimentos.' },
    { word: 'ÓRGÃO', hint: 'Grupo de tecidos que realizam uma função.' },
    { word: 'TECDO', hint: 'Grupo de células semelhantes.' },
    { word: 'POLUIÇÃO', hint: 'Degradação do ambiente por substâncias nocivas.' },
    { word: 'AQUECIMENTO GLOBAL', hint: 'Aumento da temperatura média da Terra.' },
    { word: 'EFEITO ESTUFA', hint: 'Retenção de calor pela atmosfera.' },
    { word: 'CAMADA DE OZÔNIO', hint: 'Protege a Terra dos raios UV.' },
    { word: 'RECICLAGEM', hint: 'Reaproveitamento de materiais descartados.' },
    { word: 'SUSTENTABILIDADE', hint: 'Uso consciente dos recursos naturais.' },
    { word: 'ENERGIA RENOVÁVEL', hint: 'Energia de fontes que não se esgotam.' },
    { word: 'ENERGIA SOLAR', hint: 'Energia obtida a partir da luz do sol.' },
    { word: 'ENERGIA EÓLICA', hint: 'Energia obtida a partir do vento.' },
    { word: 'HIDRELÉTRICA', hint: 'Energia obtida da força da água.' },
    { word: 'MINERAÇÃO', hint: 'Extração de minerais da terra.' },
    { word: 'PETRÓLEO', hint: 'Combustível fóssil líquido escuro.' },
    { word: 'CARVÃO MINERAL', hint: 'Combustível fóssil sólido.' },
    { word: 'GÁS NATURAL', hint: 'Mistura de hidrocarbonetos gasosos.' },
    { word: 'DESASTRE NATURAL', hint: 'Evento extremo da natureza que causa danos.' },
    { word: 'FURACÃO', hint: 'Tormenta tropical com ventos circulares fortes.' },
    { word: 'TORNADO', hint: 'Coluna de ar em rotação violenta.' },
    { word: 'SECA', hint: 'Período prolongado de falta de chuva.' },
    { word: 'INUNDAÇÃO', hint: 'Transbordamento de água que cobre a terra.' },
    { word: 'EROSÃO', hint: 'Desgaste do solo por água ou vento.' },
    { word: 'FLORESTAMENTO', hint: 'Plantio de árvores em áreas desmatadas.' },
    { word: 'FÓSSIL', hint: 'Restos ou marcas de seres que viveram no passado.' }
  ],
  'Mundo Animal': [
    { word: 'ELEFANTE', hint: 'O maior animal terrestre.' },
    { word: 'ORANGOTANGO', hint: 'Primata de pelos ruivos.' },
    { word: 'ORNITORRINCO', hint: 'Mamífero que bota ovos.' },
    { word: 'GUEPARDO', hint: 'O animal terrestre mais rápido.' },
    { word: 'BALEIA', hint: 'O maior animal do planeta.' },
    { word: 'HIPOPÓTAMO', hint: 'Grande mamífero semiaquático da África.' },
    { word: 'CAMALEÃO', hint: 'Réptil que muda de cor.' },
    { word: 'BORBOLETA', hint: 'Inseto que passa por metamorfose.' },
    { word: 'TARTARUGA', hint: 'Réptil de casco que pode viver muitos anos.' },
    { word: 'PINGUIM', hint: 'Ave que não voa e vive em climas frios.' },
    { word: 'LEÃO', hint: 'O rei da selva.' },
    { word: 'TUBARÃO', hint: 'Predador dos mares.' },
    { word: 'CANGURU', hint: 'Animal da Austrália que pula.' },
    { word: 'COALA', hint: 'Mamífero australiano que come eucalipto.' },
    { word: 'PANDA', hint: 'Urso chinês fã de bambu.' },
    { word: 'TIGRE', hint: 'Grande felino listrado.' },
    { word: 'LEOPARDO', hint: 'Felino ágil e manchado.' },
    { word: 'URSO POLAR', hint: 'O maior predador do Ártico.' },
    { word: 'SURICATO', hint: 'Pequeno mamífero africano que vive em colônias.' },
    { word: 'LÊMURE', hint: 'Primata exclusivo de Madagascar.' },
    { word: 'PREGUIÇA', hint: 'Animal muito lento que vive em árvores.' },
    { word: 'TATU', hint: 'Animal com carapaça que se enrola.' },
    { word: 'TAMANDUÁ', hint: 'Animal que se alimenta de formigas.' },
    { word: 'CAPIVARA', hint: 'O maior roedor do mundo.' },
    { word: 'JACARÉ', hint: 'Réptil dentado comum nos rios brasileiros.' },
    { word: 'COBRA', hint: 'Réptil sem patas e muitas vezes peçonhento.' },
    { word: 'Sapo', hint: 'Anfíbio que passa por metamorfose.' },
    { word: 'Rã', hint: 'Anfíbio ágil de pele lisa.' },
    { word: 'Salamandra', hint: 'Anfíbio com corpo de lagarto.' },
    { word: 'Águia', hint: 'Ave de rapina de visão poderosa.' },
    { word: 'Falcão', hint: 'Ave de rapina muito veloz.' },
    { word: 'Coruja', hint: 'Ave noturna de cabeça giratória.' },
    { word: 'Beija-flor', hint: 'Pequena ave que bate as asas muito rápido.' },
    { word: 'Papagaio', hint: 'Ave colorida capaz de imitar falas.' },
    { word: 'Arara', hint: 'Grande ave colorida típica do Brasil.' },
    { word: 'Golfinho', hint: 'Mamífero marinho muito inteligente.' },
    { word: 'Foca', hint: 'Mamífero semiaquático de nadadeiras.' },
    { word: 'Morsa', hint: 'Foca grande com presas de marfim.' },
    { word: 'Lula', hint: 'Molusco marinho com dez tentáculos.' },
    { word: 'Polvo', hint: 'Molusco marinho com oito tentáculos.' },
    { word: 'Caranguejo', hint: 'Crustáceo de andar lateral.' },
    { word: 'Lagosta', hint: 'Crustáceo marinho valorizado na culinária.' },
    { word: 'Abelha', hint: 'Inseto produtor de mel.' },
    { word: 'Formiga', hint: 'Inseto social trabalhador.' },
    { word: 'Gafanhoto', hint: 'Inseto saltador verde.' },
    { word: 'Aranha', hint: 'Aracnídeo que tece teias.' },
    { word: 'Escorpião', hint: 'Aracnídeo com aguilhão venenoso.' },
    { word: 'Morcego', hint: 'Único mamífero que voa.' },
    { word: 'Esquilo', hint: 'Pequeno roedor que enterra sementes.' },
    { word: 'Castor', hint: 'Roedor construtor de represas.' },
    { word: 'PORCO-ESPINHO', hint: 'Mamífero coberto de espinhos defensivos.' },
    { word: 'ÁGUA-VIVA', hint: 'Animal marinho de corpo mole e tentáculos.' },
    { word: 'POLVO GIGANTE', hint: 'Grande molusco marinho com muita inteligência.' },
    { word: 'ARARA AZUL', hint: 'Ave brasileira em perigo de extinção.' },
    { word: 'TUIUIÚ', hint: 'Ave símbolo do Pantanal.' },
    { word: 'LOBO GUARÁ', hint: 'Canídeo brasileiro de pernas longas.' },
    { word: 'ONÇA PINTADA', hint: 'O maior felino das Américas.' },
    { word: 'MICO LEÃO DOURADO', hint: 'Pequeno primata brasileiro de cor vibrante.' },
    { word: 'PEIXE-BOI', hint: 'Grande mamífero aquático dócil.' },
    { word: 'BOTO COR-DE-ROSA', hint: 'Golfinho de água doce da Amazônia.' },
    { word: 'TAMANDUÁ-BANDEIRA', hint: 'Animal de focinho longo e cauda pilosa.' },
    { word: 'EMA', hint: 'A maior ave brasileira, não voa.' },
    { word: 'CONDOR', hint: 'Grande ave de rapina dos Andes.' },
    { word: 'ALBATROZ', hint: 'Ave marinha de grande envergadura.' },
    { word: 'PELICANO', hint: 'Ave com grande bolsa no bico para pescar.' },
    { word: 'CISNE', hint: 'Ave aquática elegante de pescoço longo.' },
    { word: 'FLAMINGO', hint: 'Ave rosa que vive em lagunas.' },
    { word: 'AVESTRUZ', hint: 'A maior ave do mundo, corre muito.' },
    { word: 'GIRAFA', hint: 'O animal mais alto do mundo.' },
    { word: 'ZEBRA', hint: 'Mamífero africano com listras pretas e brancas.' },
    { word: 'RINOCERONTE', hint: 'Grande mamífero com chifre no focinho.' },
    { word: 'BÚFALO', hint: 'Grande bovídeo selvagem.' },
    { word: 'HIENA', hint: 'Mamífero carnívoro conhecido pelo seu "riso".' },
    { word: 'CHACAL', hint: 'Canídeo selvagem da África e Ásia.' },
    { word: 'COIOTE', hint: 'Canídeo selvagem da América do Norte.' },
    { word: 'LOBO', hint: 'Canídeo social que vive em alcateias.' },
    { word: 'RAPOSA', hint: 'Canídeo pequeno conhecido pela esperteza.' },
    { word: 'GUAXINIM', hint: 'Mamífero com "máscara" nos olhos.' },
    { word: 'TEXUGO', hint: 'Mamífero escavador de garras fortes.' },
    { word: 'LONTRA', hint: 'Mamífero aquático brincalhão de pele fofa.' },
    { word: 'ESQUILO-VOADOR', hint: 'Roedor que plana entre árvores.' },
    { word: 'MORCEGO-VAMPIRO', hint: 'Morcego que se alimenta de sangue.' },
    { word: 'KIWI', hint: 'Ave da Nova Zelândia que não voa.' },
    { word: 'DIABO-DA-TASMÂNIA', hint: 'Marsupial carnívoro de grito assustador.' },
    { word: 'WOMBAT', hint: 'Marsupial australiano atarracado.' },
    { word: 'WALLABY', hint: 'Pequeno primo do canguru.' },
    { word: 'ALPACA', hint: 'Mamífero andino de lã macia.' },
    { word: 'LHAMA', hint: 'Animal de carga dos Andes conhecido por cuspir.' }
  ],
  'Tecnologia': [
    { word: 'ALGORITMO', hint: 'Sequência de instruções para resolver um problema.' },
    { word: 'INTERNET', hint: 'Rede mundial de computadores.' },
    { word: 'SOFTWARE', hint: 'Parte lógica do computador.' },
    { word: 'HARDWARE', hint: 'Parte física do computador.' },
    { word: 'CRIPTOGRAFIA', hint: 'Escrita em código para proteger dados.' },
    { word: 'NUVEM', hint: 'Armazenamento remoto de dados.' },
    { word: 'SMARTPHONE', hint: 'Telefone inteligente.' },
    { word: 'ROBÓTICA', hint: 'Tecnologia que lida com robôs.' },
    { word: 'VIRTUAL', hint: 'Algo que existe apenas no computador.' },
    { word: 'BLOCKCHAIN', hint: 'Tecnologia por trás das criptomoedas.' },
    { word: 'SATÉLITE', hint: 'Objeto que orbita a Terra para comunicação.' },
    { word: 'METAVERSO', hint: 'Mundo virtual imersivo.' },
    { word: 'CRIPTOMOEDA', hint: 'Moeda digital e descentralizada.' },
    { word: 'BITCOIN', hint: 'A primeira e mais famosa criptomoeda.' },
    { word: 'ETHEREUM', hint: 'Plataforma de contratos inteligentes.' },
    { word: 'IA', hint: 'Sigla para Inteligência Artificial.' },
    { word: 'FRONTEND', hint: 'O que o usuário vê no site.' },
    { word: 'BACKEND', hint: 'O processamento que acontece no servidor.' },
    { word: 'BANCO DE DADOS', hint: 'Onde as informações são armazenadas.' },
    { word: 'FRAMEWORK', hint: 'Conjunto de ferramentas para facilitar o código.' },
    { word: 'API', hint: 'Interface de programação de aplicações.' },
    { word: 'OPEN SOURCE', hint: 'Código aberto disponível para todos.' },
    { word: 'GITHUB', hint: 'Plataforma de hospedagem de código.' },
    { word: 'TYPESCRIPT', hint: 'Superset do Javascript com tipos.' },
    { word: 'REACT', hint: 'Biblioteca para construir interfaces.' },
    { word: 'APLICATIVO', hint: 'Programa para celular ou tablet.' },
    { word: 'COMPUTADOR', hint: 'Máquina de processar dados.' },
    { word: 'PROCESSADOR', hint: 'O cérebro do computador.' },
    { word: 'MEMÓRIA RAM', hint: 'Armazenamento temporário e rápido.' },
    { word: 'PLACA DE VÍDEO', hint: 'Responsável pelos gráficos.' },
    { word: 'SISTEMA OPERACIONAL', hint: 'Gerente geral do hardware e software.' },
    { word: 'LINUX', hint: 'Kernel de sistema aberto.' },
    { word: 'WINDOWS', hint: 'Sistema operacional da Microsoft.' },
    { word: 'MACOS', hint: 'Sistema operacional da Apple.' },
    { word: 'ANDROID', hint: 'Sistema operacional móvel da Google.' },
    { word: 'IOS', hint: 'Sistema operacional móvel da Apple.' },
    { word: 'WI-FI', hint: 'Tecnologia de rede sem fio.' },
    { word: 'BLUETOOTH', hint: 'Conexão sem fio de curto alcance.' },
    { word: 'FIBRA ÓPTICA', hint: 'Cabo que transmite dados por luz.' },
    { word: 'REDES SOCIAIS', hint: 'Plataformas de interação online.' },
    { word: 'CIBERSEGURANÇA', hint: 'Proteção contra ataques digitais.' },
    { word: 'HACKER', hint: 'Especialista em invadir ou proteger sistemas.' },
    { word: 'FIREWALL', hint: 'Barreira de segurança de rede.' },
    { word: 'MALWARE', hint: 'Software malicioso criado para causar danos.' },
    { word: 'PHISHING', hint: 'Tentativa de roubo de dados por mensagens falsas.' },
    { word: 'DATA CENTER', hint: 'Local físico que abriga servidores.' },
    { word: 'BIG DATA', hint: 'Volume maciço de dados complexos.' },
    { word: 'STREAMING', hint: 'Transmissão contínua de áudio ou vídeo.' },
    { word: 'PODCAST', hint: 'Programa de áudio sob demanda.' },
    { word: 'E-COMMERCE', hint: 'Comércio eletrônico na internet.' },
    { word: 'MARKETPLACE', hint: 'Espaço virtual de compra e venda.' },
    { word: 'LOGÍSTICA', hint: 'Processo de entrega e armazenamento.' },
    { word: 'AUTOMAÇÃO', hint: 'Uso de tecnologia para tarefas automáticas.' },
    { word: 'DOCKER', hint: 'Plataforma para containers de software.' },
    { word: 'KUBERNETES', hint: 'Orquestrador de containers.' },
    { word: 'SERVERLESS', hint: 'Foco no código sem gerenciar servidores.' },
    { word: 'MICROSERVIÇOS', hint: 'Arquitetura de software modular.' },
    { word: 'DEVOPS', hint: 'Integração entre desenvolvimento e operações.' },
    { word: 'AGILE', hint: 'Metodologia de desenvolvimento rápido.' },
    { word: 'SCRUM', hint: 'Framework para gerenciamento de projetos ágeis.' },
    { word: 'PYTHON', hint: 'Linguagem de programação muito usada em IA.' },
    { word: 'JAVASCRIPT', hint: 'Linguagem que roda no navegador.' },
    { word: 'JAVA', hint: 'Linguagem clássica de backend e Android.' },
    { word: 'KOTLIN', hint: 'Linguagem moderna preferida para Android.' },
    { word: 'SWIFT', hint: 'Linguagem de programação para iOS.' },
    { word: 'PHP', hint: 'Linguagem muito usada em sites como WordPress.' },
    { word: 'GOLANG', hint: 'Linguagem criada pela Google para alta performance.' },
    { word: 'RUST', hint: 'Linguagem focada em segurança e performance.' },
    { word: 'SQL', hint: 'Linguagem de consulta para bancos de dados.' },
    { word: 'NOSQL', hint: 'Bancos de dados não relacionais.' },
    { word: 'MONGODB', hint: 'Banco de dados de documentos popular.' },
    { word: 'REDIS', hint: 'Armazenamento de dados em memória para cache.' },
    { word: 'POSTGRESQL', hint: 'Banco de dados relacional robusto open source.' },
    { word: 'ORACLE', hint: 'Grande empresa de software de banco de dados.' },
    { word: 'AWS', hint: 'Serviço de nuvem da Amazon.' },
    { word: 'AZURE', hint: 'Serviço de nuvem da Microsoft.' },
    { word: 'GOOGLE CLOUD', hint: 'Plataforma de computação em nuvem do Google.' },
    { word: 'FIREBASE', hint: 'Plataforma móvel e web do Google.' },
    { word: 'VERCEL', hint: 'Plataforma para hospedar apps frontend.' },
    { word: 'NETLIFY', hint: 'Serviço de hospedagem e automação para web.' },
    { word: 'GITLAB', hint: 'Plataforma completa de DevOps e git.' },
    { word: 'DASHBOARD', hint: 'Painel visual de controle e dados.' },
    { word: 'VIRTUALIZAÇÃO', hint: 'Criar versões virtuais de recursos de TI.' },
    { word: 'VPN', hint: 'Rede privada virtual para segurança.' },
    { word: 'PROXY', hint: 'Intermediário entre o cliente e o servidor.' },
    { word: 'SSL', hint: 'Certificado de segurança para sites.' }
  ]
};

const LOCAL_WORDS = [
  ...Object.values(THEME_WORDS).flat()
];

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

const ALPHABET = KEYBOARD_ROWS.flat();

const normalizeText = (text: string) => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
};

// --- Components ---

const HangmanFigure = ({ mistakes, maxMistakes = 6, profilePic }: { mistakes: number; maxMistakes?: number; profilePic?: string }) => {
  const woodDark = "#451a03"; // Brown-950
  const woodMedium = "#78350f"; // Brown-900
  const woodLight = "#92400e"; // Brown-800
  const ropeColor = "#fbbf24"; // Amber-400
  const figureColor = "#f8fafc"; // Slate-50 for high contrast

  const isDead = mistakes >= maxMistakes;
  const isWorried = mistakes >= maxMistakes - 2 && !isDead;

  return (
    <div className="w-full max-w-[280px] aspect-[1/1.2] relative overflow-visible">
      {/* Structural Shadow */}
      <div className="absolute inset-x-0 bottom-0 h-4 bg-black/20 blur-xl rounded-full translate-y-4" />
      
      <svg viewBox="0 0 200 250" className="w-full h-full overflow-visible drop-shadow-2xl">
        <defs>
          <linearGradient id="woodGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={woodMedium} />
            <stop offset="50%" stopColor={woodLight} />
            <stop offset="100%" stopColor={woodDark} />
          </linearGradient>

          {/* Prisoner Stripe Pattern */}
          <pattern id="stripes" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(0)">
            <rect width="10" height="5" fill="#111827" />
            <rect y="5" width="10" height="5" fill="#f8fafc" />
          </pattern>

          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <clipPath id="headClip">
            <circle cx="140" cy="80" r="22" />
          </clipPath>
        </defs>

        {/* --- WOODEN STRUCTURE --- */}
        {/* Base Plate */}
        <motion.rect 
          x="20" y="230" width="160" height="12" rx="2" fill={woodDark}
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
        />
        
        {/* Vertical Post */}
        <motion.rect 
          x="45" y="20" width="16" height="210" rx="1" fill="url(#woodGrad)"
          initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} style={{ originY: 1 }}
        />
        
        {/* Horizontal Beam */}
        <motion.rect 
          x="45" y="20" width="115" height="16" rx="1" fill="url(#woodGrad)"
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} style={{ originX: 0 }}
          transition={{ delay: 0.2 }}
        />
        
        {/* Diagonal Brace */}
        <motion.path 
          d="M 45 70 L 95 20" 
          stroke={woodDark} strokeWidth="12" strokeLinecap="square"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ delay: 0.4 }}
        />
        <motion.path 
          d="M 45 70 L 95 20" 
          stroke={woodMedium} strokeWidth="8" strokeLinecap="square"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ delay: 0.4 }}
        />

        {/* Coiled Rope Effect */}
        <g>
          {/* Vertical Rope Part */}
          <motion.line 
            x1="140" y1="36" x2="140" y2="44" 
            stroke={ropeColor} strokeWidth="6" strokeLinecap="round"
            initial={{ y2: 36 }} animate={{ y2: 44 }}
            transition={{ delay: 0.6 }}
          />
          
          {/* Rope Coils (Knot) - Aligned to sit on the loop */}
          <motion.g initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8 }}>
            <ellipse cx="140" cy="44" rx="10" ry="4" fill={ropeColor} transform="rotate(-5 140 44)" />
            <ellipse cx="140" cy="51" rx="11" ry="4" fill={ropeColor} transform="rotate(-5 140 51)" />
            <ellipse cx="140" cy="58" rx="10" ry="4" fill={ropeColor} transform="rotate(-5 140 58)" />
          </motion.g>

          {/* Noose Loop - Perfect circle matching the profile pic size (r=22) */}
          <motion.circle 
            cx="140" cy="80" r="22"
            fill="none" 
            stroke={ropeColor} strokeWidth="6" 
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
          />
        </g>

        {/* --- PRISONER FIGURE --- */}
        <g filter="url(#glow)">
          {/* Head & Hat */}
          <motion.g
            initial={{ opacity: 0, scale: 0 }}
            animate={mistakes >= 1 ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, type: 'spring' }}
            style={{ originX: '140px', originY: '80px' }}
          >
            {/* Prisoner Hat */}
            <rect x="130" y="52" width="20" height="8" rx="1" fill="url(#stripes)" stroke="#000" strokeWidth="0.5" />
            
            {profilePic ? (
              <>
                <circle cx="140" cy="80" r="22" fill="#fff" />
                <image 
                  xlinkHref={profilePic} 
                  x="118" y="58" width="44" height="44" 
                  clipPath="url(#headClip)" preserveAspectRatio="xMidYMid slice"
                />
                <circle cx="140" cy="80" r="22" fill="none" stroke="#000" strokeWidth="1" />
              </>
            ) : (
              <circle cx="140" cy="80" r="22" fill="#fed7aa" stroke="#9a3412" strokeWidth="2" />
            )}
          </motion.g>

          {/* Torso (Shirt) */}
          <motion.rect 
            x="126" y="102" width="28" height="58" rx="4"
            fill="url(#stripes)"
            stroke="#000" strokeWidth="1"
            initial={{ scaleY: 0, opacity: 0 }} 
            animate={mistakes >= 2 ? { scaleY: 1, opacity: 1 } : { scaleY: 0, opacity: 0 }} 
            style={{ originY: 0 }}
          />

          {/* Left Arm (Sleeve) */}
          <motion.path 
            d="M 126 115 C 115 115, 105 125, 105 145" 
            fill="none" stroke="url(#stripes)" strokeWidth="14" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }} 
            animate={mistakes >= 3 ? { pathLength: 1, opacity: 1 } : { opacity: 0 }} 
          />
          <motion.path 
            d="M 126 115 C 115 115, 105 125, 105 145" 
            fill="none" stroke="#000" strokeWidth="1" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }} 
            animate={mistakes >= 3 ? { pathLength: 1, opacity: 1 } : { opacity: 0 }} 
          />

          {/* Right Arm (Sleeve) */}
          <motion.path 
            d="M 154 115 C 165 115, 175 125, 175 145" 
            fill="none" stroke="url(#stripes)" strokeWidth="14" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }} 
            animate={mistakes >= 4 ? { pathLength: 1, opacity: 1 } : { opacity: 0 }} 
          />
          <motion.path 
            d="M 154 115 C 165 115, 175 125, 175 145" 
            fill="none" stroke="#000" strokeWidth="1" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }} 
            animate={mistakes >= 4 ? { pathLength: 1, opacity: 1 } : { opacity: 0 }} 
          />

          {/* Left Leg (Trouser) */}
          <motion.path 
            d="M 132 160 C 132 175, 115 185, 115 210" 
            fill="none" stroke="url(#stripes)" strokeWidth="14" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }} 
            animate={mistakes >= 5 ? { pathLength: 1, opacity: 1 } : { opacity: 0 }} 
          />
          <motion.path 
            d="M 132 160 C 132 175, 115 185, 115 210" 
            fill="none" stroke="#000" strokeWidth="1" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }} 
            animate={mistakes >= 5 ? { pathLength: 1, opacity: 1 } : { opacity: 0 }} 
          />

          {/* Right Leg (Trouser) */}
          <motion.path 
            d="M 148 160 C 148 175, 165 185, 165 210" 
            fill="none" stroke="url(#stripes)" strokeWidth="14" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }} 
            animate={mistakes >= 6 ? { pathLength: 1, opacity: 1 } : { opacity: 0 }} 
          />
          <motion.path 
            d="M 148 160 C 148 175, 165 185, 165 210" 
            fill="none" stroke="#000" strokeWidth="1" strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }} 
            animate={mistakes >= 6 ? { pathLength: 1, opacity: 1 } : { opacity: 0 }} 
          />

          {/* Extra Parts for Easy Mode (Hands) */}
          <motion.circle 
            cx="105" cy="145" r="4" fill="#fed7aa" stroke="#000" strokeWidth="0.5"
            initial={{ opacity: 0, scale: 0 }}
            animate={mistakes >= 7 ? { opacity: 1, scale: 1 } : { opacity: 0 }}
          />
          <motion.circle 
            cx="175" cy="145" r="4" fill="#fed7aa" stroke="#000" strokeWidth="0.5"
            initial={{ opacity: 0, scale: 0 }}
            animate={mistakes >= 8 ? { opacity: 1, scale: 1 } : { opacity: 0 }}
          />
        </g>

        {/* Face Expressions */}
        <AnimatePresence>
          {mistakes >= 1 && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
               {!isDead ? (
                 !profilePic && (
                   <>
                     <circle cx="132" cy="74" r="2.5" fill={figureColor} />
                     <circle cx="148" cy="74" r="2.5" fill={figureColor} />
                     <motion.path 
                       d="M 134 88 Q 140 94 146 88" 
                       fill="none" stroke={figureColor} strokeWidth="2.5" strokeLinecap="round"
                       animate={isWorried ? { d: "M 134 94 Q 140 88 146 94" } : { d: "M 134 88 Q 140 94 146 88" }}
                     />
                   </>
                 )
               ) : (
                 <>
                   <g className={profilePic ? "drop-shadow-md" : ""}>
                     <path d="M 128 70 L 136 78 M 136 70 L 128 78" stroke={profilePic ? "#fff" : figureColor} strokeWidth="3" strokeLinecap="round" />
                     <path d="M 144 70 L 152 78 M 152 70 L 144 78" stroke={profilePic ? "#fff" : figureColor} strokeWidth="3" strokeLinecap="round" />
                   </g>
                   {profilePic && (
                     <circle cx="140" cy="80" r="22" fill="rgba(239, 68, 68, 0.4)" clipPath="url(#headClip)" />
                   )}
                   <path d="M 130 92 Q 140 82 150 92" fill="none" stroke={profilePic ? "#fff" : figureColor} strokeWidth="3" strokeLinecap="round" />
                 </>
               )}
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
};

// --- Main Component ---

interface HangmanProps {
  mode: 'local' | 'online';
  variant?: 'battle' | 'classic';
  matchId?: string;
  opponentId?: string;
  onClose: () => void;
}

export function Hangman({ mode, variant = 'battle', matchId, opponentId, onClose }: HangmanProps) {
  const { user, profile } = useAuth();
  const { showError } = useError();
  
  // Local State
  const [localGame, setLocalGame] = useState<{
    word: string;
    hint: string;
    guesses: string[];
    mistakes: number;
    score: number;
    status: 'playing' | 'won' | 'lost';
    difficulty: 'Easy' | 'Medium' | 'Hard';
  } | null>(null);

  // Online Match State
  const [matchData, setMatchData] = useState<any>(null);
  const [mySetup, setMySetup] = useState({ word: '', hint: '' });
  const [loading, setLoading] = useState(mode === 'online');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(mode === 'local');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('hangman_difficulty') as 'Easy' | 'Medium' | 'Hard') || 'Medium';
    }
    return 'Medium';
  });

  useEffect(() => {
    if (mode === 'online' && variant === 'classic' && matchData) {
      if (matchData.selectedTheme) setSelectedTheme(matchData.selectedTheme);
      if (matchData.selectedDifficulty) setSelectedDifficulty(matchData.selectedDifficulty);
    }
  }, [mode, variant, matchData?.selectedTheme, matchData?.selectedDifficulty]);

  useEffect(() => {
    localStorage.setItem('hangman_difficulty', selectedDifficulty);
  }, [selectedDifficulty]);
  const [playerProfiles, setPlayerProfiles] = useState<Record<string, any>>({});
  const [matchArchived, setMatchArchived] = useState(false);

  // Sound Management
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('game_muted') === 'true');
  const { playSound } = useSoundEffects(isMuted);

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem('game_muted', String(newMuted));
  };

  const triggerLocalRematch = () => {
    setLocalGame(null);
    setShowThemeSelector(true);
    setSelectedTheme(null);
    setMatchArchived(false);
  };

  const saveMatchResult = async (result: 'won' | 'lost' | 'draw', vsCPU: boolean = false, finalMistakes: number = 0) => {
    if (!user) return;
    try {
      const players = mode === 'online' ? (matchData?.players || [user.uid, opponentId]) : [user.uid];
      
      // Global Match Record (Only one player saves in online mode to avoid duplicates)
      if (mode !== 'online' || (matchData?.players?.[0] === user.uid)) {
        await addDoc(collection(db, 'matches'), {
          players: players,
          gameType: 'Hangman',
          vsCPU: vsCPU,
          winner: result === 'won' ? user.uid : (result === 'draw' ? 'Draw' : (mode === 'online' ? (opponentId || 'Opponent') : 'CPU')),
          createdAt: serverTimestamp(),
          mode: mode === 'online' ? 'online' : 'vs_cpu'
        });
      }

      if (mode === 'online') {
        const userRef = doc(db, 'users', user.uid);
        const gameScore = matchData?.playerData?.[user.uid]?.sessionScore || 0;
        
        const themeUpdate: Record<string, any> = {};
        if (selectedTheme) {
          const sanitizedTheme = selectedTheme.replace(/[\./\[\]\*~]/g, '_');
          themeUpdate[`stats.hangman.themesPlayed.${sanitizedTheme}`] = increment(1);
        }

        await updateDoc(userRef, {
          score: increment(result === 'won' ? 50 + gameScore : (result === 'draw' ? 20 : 10)),
          'stats.hangman.wins': increment(result === 'won' ? 1 : 0),
          'stats.hangman.losses': increment(result === 'lost' ? 1 : 0),
          'stats.hangman.draws': increment(result === 'draw' ? 1 : 0),
          'stats.hangman.total': increment(1),
          'stats.hangman.totalMistakes': increment(finalMistakes),
          ...themeUpdate
        });
      }
    } catch (e) {
      console.error("Error saving match result:", e);
    }
  };

  useEffect(() => {
    if (mode === 'online' && matchData?.status === 'finished' && !matchArchived && user) {
      const isWinner = matchData.winner === user.uid;
      const isDraw = matchData.winner === 'draw';
      const result = isWinner ? 'won' : (isDraw ? 'draw' : 'lost');
      const myMistakes = matchData.playerData?.[user.uid]?.wrongGuesses || 0;
      saveMatchResult(result, false, myMistakes);
      setMatchArchived(true);
    }
  }, [mode, matchData?.status, matchArchived, user]);

  // Initialize Local Game
  const startNewLocalGame = useCallback((theme?: string, difficultyOverride?: 'Easy' | 'Medium' | 'Hard') => {
    let pool = LOCAL_WORDS;
    if (theme && THEME_WORDS[theme]) {
      pool = THEME_WORDS[theme];
    }

    const diff = difficultyOverride || selectedDifficulty;
    
    // Filter by word length (excluding spaces)
    const filteredPool = pool.filter(item => {
      const len = item.word.replace(/\s/g, '').length;
      if (diff === 'Easy') return len <= 6;
      if (diff === 'Medium') return len > 6 && len <= 10;
      if (diff === 'Hard') return len > 10;
      return true;
    });

    // Fallback if no words match the difficulty in this specific theme
    const finalPool = filteredPool.length > 0 ? filteredPool : pool;
    const random = finalPool[Math.floor(Math.random() * finalPool.length)];
    
    setLocalGame({
      word: random.word.toUpperCase(),
      hint: random.hint,
      guesses: [],
      mistakes: 0,
      score: 0,
      status: 'playing',
      difficulty: diff
    });
    setSelectedTheme(theme || 'Aleatório');
    setShowThemeSelector(false);
  }, [selectedDifficulty]);

  useEffect(() => {
    if (mode === 'local' && !localGame && !showThemeSelector) {
      setShowThemeSelector(true);
    }
  }, [mode, localGame, showThemeSelector]);

  // Online Subscription
  useEffect(() => {
    if (mode === 'online' && matchId) {
      setLoading(true);
      const unsub = onSnapshot(doc(db, 'hangman_matches', matchId), 
        async (snap) => {
          if (snap.exists()) {
            const data = snap.data() as any;
            setMatchData(data);

            // Auto-join match if not in players list and status is setup
            if (user && data.status === 'setup' && !data.players.includes(user.uid) && data.players.length < 6) {
              updateDoc(doc(db, 'hangman_matches', matchId), {
                players: arrayUnion(user.uid),
                updatedAt: serverTimestamp()
              }).catch(err => console.error("Auto-join match failed:", err));
            }

            // Fetch player profiles if they are missing
            if (data.players) {
              const profilesToFetch = data.players.filter((id: string) => !playerProfiles[id]);
              if (profilesToFetch.length > 0) {
                const fetchedProfiles = { ...playerProfiles };
                for (const pid of profilesToFetch) {
                  try {
                    const pSnap = await getDoc(doc(db, 'users', pid));
                    if (pSnap.exists()) {
                      fetchedProfiles[pid] = pSnap.data();
                    }
                  } catch (e) {
                    console.error("Error fetching player profile:", pid, e);
                  }
                }
                setPlayerProfiles(fetchedProfiles);
              }
            }
          } else {
            setMatchData(null);
            console.warn("Hangman: Match document does not exist anymore.");
          }
          setLoading(false);
        },
        (error) => {
          console.error("Hangman Match Error:", error);
          setLoading(false);
        }
      );
      return () => unsub();
    } else {
      setLoading(false);
    }
  }, [mode, matchId]); // Removed playerProfiles from dependency to avoid loop and unnecessary re-loading state

  useEffect(() => {
    if (mode === 'online' && matchId) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        const isGameOver = (mode === 'online' && matchData?.status === 'finished');
        if (!isGameOver) {
          e.preventDefault();
          e.returnValue = ''; // Required for most browsers to show confirmation
          return '';
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [mode, matchId, matchData?.status]);

  // Handle building missing match document if host
  const initMissingMatch = async () => {
    if (!user || !matchId) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'hangman_matches', matchId), {
        players: arrayUnion(user.uid),
        status: 'setup',
        playerData: {},
        scores: {},
        currentRound: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error("Failed to init missing match:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleExitClick = () => {
    const isGameOver = (mode === 'local' && localGame?.status !== 'playing') || (mode === 'online' && (matchData?.status === 'finished'));
    if (!isGameOver) {
      setShowExitConfirm(true);
    } else {
      handleLeave();
    }
  };

  const isExiting = useRef(false);

  useEffect(() => {
    // This is for cleanup ONLY when the user intentionally leaves via handleLeave or the component is truly dying.
    // Deleting documents on unmount is dangerous in React (strict mode, layout shifts, etc.)
    return () => {
      // We only perform background cleanup if isExiting is NOT set, 
      // because handleLeave already does its own cleanup.
      // However, to prevent the race condition where host deletes match during re-render:
      // We will ONLY remove the user from participants, NOT delete the whole doc during background unmount.
      if (mode === 'online' && matchId && user && !isExiting.current) {
         const roomRef = doc(db, 'rooms', matchId);
         getDoc(roomRef).then(snap => {
           if (snap.exists()) {
             const data = snap.data();
             if (data.participants?.includes(user.uid)) {
                const newParticipants = data.participants.filter((p: string) => p !== user.uid);
                // IF we are not intentionally exiting, and it's just an unmount/remount, 
                // we should be very careful about deleting.
                // In most cases, it's safer to JUST update participants and NOT delete here.
                if (newParticipants.length > 0) {
                  updateDoc(roomRef, {
                    participants: arrayRemove(user.uid),
                    participantCount: increment(-1)
                  });
                }
             }
           }
         }).catch(err => console.error("Safe cleanup effect error:", err));
      }
    };
  }, [mode, matchId, user?.uid]);

  const handleLeave = async () => {
    if (mode === 'online' && matchId && user) {
      isExiting.current = true;
      try {
        const matchRef = doc(db, 'hangman_matches', matchId);
        const matchSnap = await getDoc(matchRef);
        
        if (matchSnap.exists()) {
          const mData = matchSnap.data();
          const isGameOver = mData.status === 'finished';

          // If game is still in progress (setup or playing)
          if (!isGameOver) {
            const currentPlayers = mData.players || [];
            const otherParticipants = currentPlayers.filter((p: string) => p !== user.uid);
            
            // Mark leaving player as lost/left
            const playerUpdates: any = {
              [`playerData.${user.uid}.status`]: 'lost',
              [`playerData.${user.uid}.leftEarly`]: true,
              updatedAt: serverTimestamp()
            };

            // If only 1 player or 0 players would be left, end the match
            if (otherParticipants.length < 1) {
              playerUpdates.status = 'finished';
              playerUpdates.leftEarly = user.uid;
            } else if (mData.status === 'playing') {
               // Check if only 1 player remains in 'playing' state
               const activePlayers = otherParticipants.filter((pid: string) => {
                 const pStatus = mData.playerData?.[pid]?.status;
                 return pStatus === 'playing' || pStatus === 'setup';
               });

               if (activePlayers.length < 1) {
                 playerUpdates.status = 'finished';
                 // If there's already a winner, keep them, otherwise calculate
                 if (!mData.winner) {
                    const winners = otherParticipants.filter((pid: string) => mData.playerData?.[pid]?.status === 'won');
                    playerUpdates.winner = winners.length > 0 ? winners[0] : 'draw';
                 }
               }
            } else if (mData.status === 'setup') {
              // Remove player from participants list if game hasn't started
              playerUpdates.players = arrayRemove(user.uid);
              
              // If in setup and down to < 2 players, might want to end or just let them stay in setup
              if (otherParticipants.length < 1) {
                playerUpdates.status = 'finished';
              }
            }

            await updateDoc(matchRef, playerUpdates);
          }
        }

        const roomRef = doc(db, 'rooms', matchId);
        const roomSnap = await getDoc(roomRef);
        if (roomSnap.exists()) {
          const roomData = roomSnap.data();
          const newParticipants = (roomData.participants || []).filter((id: string) => id !== user.uid);
          
          if (newParticipants.length === 0) {
            await deleteDoc(roomRef);
            // We don't delete the match document here if we want the winner to see the result screen
            // But if nobody is left, we should probably clean it up or let it expire
            if (newParticipants.length === 0) {
              await deleteDoc(matchRef);
            }
          } else {
            await updateDoc(roomRef, {
              participants: arrayRemove(user.uid),
              participantCount: increment(-1)
            });
          }
        }
      } catch (error) {
        console.error("Error on leaving cleanup:", error);
      }
    }
    onClose();
  };

  // Sync local setup from DB on refresh
  useEffect(() => {
    if (mode === 'online' && matchData && user) {
      const pData = matchData.playerData?.[user.uid];
      if (matchData.status === 'setup' && pData?.ready && !mySetup.word) {
        setMySetup({
          word: pData.word || '',
          hint: pData.hint || ''
        });
      }
      
      // Clear local setup state when game is playing or finished to avoid stale data in rematches
      if ((matchData.status === 'playing' || matchData.status === 'finished') && (mySetup.word || mySetup.hint)) {
        setMySetup({ word: '', hint: '' });
      }
    }
  }, [mode, matchData, user, mySetup.word, mySetup.hint]);

  // Game Logic Helpers
  const handleGuess = async (letter: string) => {
    if (mode === 'local' && localGame && localGame.status === 'playing') {
      if (localGame.guesses.includes(letter)) return;

      const isCorrect = normalizeText(localGame.word).includes(letter);
      const newGuesses = [...localGame.guesses, letter];
      const newMistakes = isCorrect ? localGame.mistakes : localGame.mistakes + 1;
      
      const maxMistakes = localGame.difficulty === 'Easy' ? 8 : localGame.difficulty === 'Hard' ? 6 : 7;
      
      playSound(isCorrect ? 'correct' : 'wrong');
      
      let scoreChange = isCorrect ? 10 : -2;
      // Multiplier based on difficulty
      if (isCorrect) {
        if (localGame.difficulty === 'Hard') scoreChange *= 2;
        else if (localGame.difficulty === 'Easy') scoreChange = Math.floor(scoreChange * 0.5);
      }

      let newScore = Math.max(0, (localGame.score || 0) + scoreChange);

      let newStatus: 'playing' | 'won' | 'lost' = 'playing';
      const allGuessed = localGame.word.split('').every(l => newGuesses.includes(normalizeText(l)) || l === ' ' || l === '-');
      
      if (allGuessed) {
        newStatus = 'won';
        newScore += localGame.difficulty === 'Hard' ? 100 : (localGame.difficulty === 'Medium' ? 50 : 25);
      }
      else if (newMistakes >= maxMistakes) newStatus = 'lost';

      setLocalGame({
        ...localGame,
        guesses: newGuesses,
        mistakes: newMistakes,
        score: newScore,
        status: newStatus
      });

      if (newStatus !== 'playing') {
        saveMatchResult(newStatus === 'won' ? 'won' : 'lost', true, newMistakes);
        playSound(newStatus === 'won' ? 'win' : 'lose');
      }
    } else if (mode === 'online' && matchData && user) {
      const pData = matchData.playerData?.[user.uid];
      if (!pData || pData.status !== 'playing' || matchData.status !== 'playing') return;
      if (pData.guesses?.includes(letter)) return;

      let targetWord = '';
      if (variant === 'classic') {
        targetWord = (matchData.word || '').toUpperCase();
      } else {
        const targetPlayerId = matchData.targetMappings?.[user.uid] || matchData.players[(matchData.players.indexOf(user.uid) + 1) % matchData.players.length];
        targetWord = (matchData.playerData[targetPlayerId]?.word || '').toUpperCase();
      }
      
      if (!targetWord) return;

      const isCorrect = normalizeText(targetWord).includes(letter);
      
      playSound(isCorrect ? 'correct' : 'wrong');
      
      const newGuesses = Array.from(new Set([...(pData.guesses || []), letter]));
      const newMistakes = isCorrect ? (pData.wrongGuesses || 0) : (pData.wrongGuesses || 0) + 1;

      let scoreChange = isCorrect ? 10 : -2;
      let newScore = Math.max(0, (pData.sessionScore || 0) + scoreChange);

      const allGuessed = targetWord.split('').every((l: string) => newGuesses.includes(normalizeText(l)) || l === ' ' || l === '-');
      const playerGameOver = allGuessed || newMistakes >= 6;

      const targetLetters = targetWord.split('').filter((l: string) => l !== ' ' && l !== '-');
      const revealedCount = targetLetters.filter((l: string) => newGuesses.includes(normalizeText(l))).length;

      const playerUpdate: any = {
        [`playerData.${user.uid}.guesses`]: newGuesses,
        [`playerData.${user.uid}.wrongGuesses`]: newMistakes,
        [`playerData.${user.uid}.revealedCount`]: revealedCount,
        [`playerData.${user.uid}.sessionScore`]: newScore,
        updatedAt: serverTimestamp()
      };

      if (playerGameOver) {
        if (allGuessed) newScore += 50;
        playerUpdate[`playerData.${user.uid}.sessionScore`] = newScore;
        playerUpdate[`playerData.${user.uid}.status`] = allGuessed ? 'won' : 'lost';
        playerUpdate[`playerData.${user.uid}.finishTime`] = serverTimestamp();
        
        playSound(allGuessed ? 'win' : 'lose');
        
        // Calculate duration if startTime exists
        if (pData.startTime) {
          const startTime = pData.startTime.toDate ? pData.startTime.toDate().getTime() : pData.startTime;
          playerUpdate[`playerData.${user.uid}.duration`] = Date.now() - startTime;
        }

        // Check if match should end
        const otherPlayers = matchData.players.filter((pid: string) => pid !== user.uid);
        const everyoneElseFinished = otherPlayers.every((pid: string) => 
          matchData.playerData[pid]?.status === 'won' || matchData.playerData[pid]?.status === 'lost'
        );
        
        // Match ends if:
        // 1. Current player won (first to win)
        // 2. Both/All finished
        // GUARD: Only set match to finished if it's still playing
        if (matchData.status === 'playing') {
          if (allGuessed) {
            playerUpdate.status = 'finished';
            playerUpdate.winner = user.uid;
          } else if (everyoneElseFinished) {
            playerUpdate.status = 'finished';
            // Current player lost, but they were the last one.
            // Check if there was any other winner
            const otherWinners = otherPlayers.filter((pid: string) => matchData.playerData[pid]?.status === 'won');
            if (otherWinners.length > 0) {
              playerUpdate.winner = otherWinners[0];
            } else {
              playerUpdate.winner = 'draw';
            }
          }
        }
      }

      // Final safety guard: if match status changed while we were processing, abort
      const latestSnap = await getDoc(doc(db, 'hangman_matches', matchId!));
      if (latestSnap.exists() && latestSnap.data().status === 'playing') {
        await updateDoc(doc(db, 'hangman_matches', matchId!), playerUpdate);
      }
    }
  };

  const submitOnlineSetup = async () => {
    if (variant === 'classic') {
      if (!user || !matchId || !matchData) return;
      const updates: any = {
        [`playerData.${user.uid}.ready`]: true,
        [`playerData.${user.uid}.status`]: 'setup',
        updatedAt: serverTimestamp()
      };
      await updateDoc(doc(db, 'hangman_matches', matchId), updates);
      return;
    }

    if (!mySetup.word || !mySetup.hint || !user || !matchId || !matchData) return;

    const updates: any = {
      [`playerData.${user.uid}.word`]: mySetup.word.toUpperCase().trim(),
      [`playerData.${user.uid}.hint`]: mySetup.hint.trim(),
      [`playerData.${user.uid}.ready`]: true,
      [`playerData.${user.uid}.status`]: 'setup',
      updatedAt: serverTimestamp()
    };

    await updateDoc(doc(db, 'hangman_matches', matchId), updates);
    setShowSetupModal(false);
  };

  const startOnlineGame = async () => {
    if (!user || !matchId || !matchData) return;
    
    // Only host can start
    if (matchData.players[0] !== user.uid) return;
    
    // Everyone must be ready
    const everyoneReady = matchData.players.every((pid: string) => matchData.playerData?.[pid]?.ready);
    if (!everyoneReady || matchData.players.length < 2) return;

    // Use the latest players list from the match data to ensure everyone is included in the game start
    const currentPlayers = matchData.players as string[];
    
    let updates: any = {
      status: 'playing',
      startTime: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (variant === 'classic') {
      // Pick a word for everyone
      let pool = LOCAL_WORDS;
      const theme = matchData.selectedTheme;
      if (theme && THEME_WORDS[theme]) {
        pool = THEME_WORDS[theme];
      }

      const diff = matchData.selectedDifficulty || 'Medium';
      const filteredPool = pool.filter(item => {
        const len = item.word.replace(/\s/g, '').length;
        if (diff === 'Easy') return len <= 6;
        if (diff === 'Medium') return len > 6 && len <= 10;
        if (diff === 'Hard') return len > 10;
        return true;
      });

      const finalPool = filteredPool.length > 0 ? filteredPool : pool;
      const random = finalPool[Math.floor(Math.random() * finalPool.length)];
      
      updates.word = random.word.toUpperCase();
      updates.hint = random.hint;
    } else {
      // Generate random derangement for word distribution
      const shuffledForAssignment = shuffleArray(currentPlayers);
      const targetMappings: Record<string, string> = {};
      for (let i = 0; i < shuffledForAssignment.length; i++) {
         const guesser = shuffledForAssignment[i];
         const target = shuffledForAssignment[(i + 1) % shuffledForAssignment.length];
         targetMappings[guesser] = target;
      }
      updates.targetMappings = targetMappings;
    }

    currentPlayers.forEach((pid: string) => {
      updates[`playerData.${pid}.status`] = 'playing';
      updates[`playerData.${pid}.startTime`] = serverTimestamp();
      updates[`playerData.${pid}.guesses`] = [];
      updates[`playerData.${pid}.wrongGuesses`] = 0;
      updates[`playerData.${pid}.revealedCount`] = 0;
      updates[`playerData.${pid}.sessionScore`] = 0;
    });

    try {
      await updateDoc(doc(db, 'hangman_matches', matchId), updates);
      await updateDoc(doc(db, 'rooms', matchId), { status: 'playing' });
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `hangman_matches/${matchId}`, showError);
    }
  };

  // Auto-sync status if game started but player was somehow left behind in setup
  useEffect(() => {
    if (mode === 'online' && matchId && user && matchData?.status === 'playing') {
      const myData = matchData.playerData?.[user.uid];
      if (myData && myData.status === 'setup') {
        const updates: any = {
          [`playerData.${user.uid}.status`]: 'playing',
          [`playerData.${user.uid}.startTime`]: serverTimestamp(),
          [`playerData.${user.uid}.guesses`]: [],
          [`playerData.${user.uid}.wrongGuesses`]: 0,
          [`playerData.${user.uid}.revealedCount`]: 0,
          updatedAt: serverTimestamp()
        };
        updateDoc(doc(db, 'hangman_matches', matchId), updates).catch(err => console.error("Self status sync failed:", err));
      }
    }
  }, [matchData?.status, user?.uid, matchId, mode]);

  const saveLocalSetup = () => {
    if (!mySetup.word || !mySetup.hint) return;
    setShowSetupModal(false);
  };

  const selectOnlineClassicTheme = async (theme: string) => {
    if (mode === 'online' && variant === 'classic' && matchId && user) {
      const isHost = matchData?.players[0] === user.uid;
      if (!isHost) return;
      
      try {
        await updateDoc(doc(db, 'hangman_matches', matchId), {
          selectedTheme: theme,
          selectedDifficulty: selectedDifficulty,
          updatedAt: serverTimestamp()
        });
        setShowThemeSelector(false);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `hangman_matches/${matchId}`, showError);
      }
    }
  };


  // UI Renderers
  const renderModals = () => (
    <AnimatePresence>
      {showThemeSelector && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-slate-900 border border-white/10 rounded-[32px] p-8 max-w-2xl w-full shadow-2xl overflow-hidden relative"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-purple-500/10 rounded-2xl">
                <Layout className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Escolha um Tema</h3>
                <p className="text-[10px] font-bold tracking-widest uppercase opacity-40 text-white">
                  {mode === 'local' ? 'Modo Local' : 'Online Host - Escolha o Tema para Todos'}
                </p>
              </div>
            </div>

            {/* Difficulty Selector */}
            <div className="mb-8">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3 ml-1">Dificuldade</label>
              <div className="grid grid-cols-3 gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
                {(['Easy', 'Medium', 'Hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    onClick={async () => {
                      setSelectedDifficulty(diff);
                      if (mode === 'online' && variant === 'classic' && matchData?.players[0] === user?.uid) {
                         await updateDoc(doc(db, 'hangman_matches', matchId!), {
                           selectedDifficulty: diff,
                           updatedAt: serverTimestamp()
                         });
                      }
                    }}
                    className={cn(
                      "py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95",
                      selectedDifficulty === diff 
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-900/20" 
                        : "text-white/40 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {diff === 'Easy' ? 'Fácil' : diff === 'Medium' ? 'Médio' : 'Difícil'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
              {Object.keys(THEME_WORDS).map((theme) => (
                <button
                  key={theme}
                  onClick={() => {
                    if (mode === 'local') startNewLocalGame(theme);
                    else selectOnlineClassicTheme(theme);
                  }}
                  className="group relative flex items-center justify-between p-2 sm:p-3 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-left transition-all hover:bg-white/10 hover:border-purple-500/50 active:scale-95"
                >
                  <div className="min-w-0">
                    <span className="text-[9px] sm:text-xs font-black text-white uppercase tracking-tight group-hover:text-purple-400 transition-colors leading-tight block truncate">
                      {theme}
                    </span>
                    <span className="text-[6px] sm:text-[8px] font-bold opacity-30 text-white uppercase tracking-widest block">
                      {THEME_WORDS[theme].length} Itens
                    </span>
                  </div>
                  
                  <div className="ml-1 sm:ml-2 flex-shrink-0">
                    <div className="p-0.5 sm:p-1 rounded-md sm:rounded-lg bg-white/5 group-hover:bg-purple-500/20 group-hover:text-purple-400 transition-all">
                      <Play className="w-2 h-2 sm:w-3 sm:h-3" />
                    </div>
                  </div>
                </button>
              ))}
              <button
                onClick={() => {
                  if (mode === 'local') startNewLocalGame();
                  else selectOnlineClassicTheme('Aleatório');
                }}
                className="group relative flex items-center justify-between p-2 sm:p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg sm:rounded-xl text-left transition-all hover:bg-blue-500/20 hover:border-blue-500/50 active:scale-95"
              >
                <div className="min-w-0">
                  <span className="text-[9px] sm:text-xs font-black text-white uppercase tracking-tight group-hover:text-blue-400 transition-colors leading-tight block truncate">
                    Aleatório
                  </span>
                  <span className="text-[6px] sm:text-[8px] font-bold opacity-30 text-white uppercase tracking-widest block font-mono">
                    MIXED
                  </span>
                </div>
                
                <div className="ml-1 sm:ml-2 flex-shrink-0">
                  <div className="p-0.5 sm:p-1 rounded-md sm:rounded-lg bg-blue-500/20 text-blue-400 transition-all">
                    <RefreshCw className="w-2 h-2 sm:w-3 sm:h-3" />
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => {
                if (mode === 'online') handleLeave();
                else onClose();
              }}
              className="w-full mt-8 py-3 bg-white/5 text-white/40 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:text-white transition-colors"
            >
              Cancelar e Sair
            </button>
          </motion.div>
        </div>
      )}

      {showSetupModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-slate-900 border border-white/10 rounded-[32px] p-8 max-w-lg w-full shadow-2xl overflow-hidden relative"
          >
            <button 
              onClick={() => setShowSetupModal(false)}
              className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <X className="w-5 h-5 opacity-40 text-white" />
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-blue-500/10 rounded-2xl">
                <Play className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Preparar Palavra</h3>
                <p className="text-[10px] font-bold tracking-widest uppercase opacity-40 text-white">Configuração da Rodada</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3 ml-1">Palavra Secreta</label>
                <input 
                  type="text" 
                  value={mySetup.word}
                  onChange={(e) => setMySetup(prev => ({ ...prev, word: e.target.value.toUpperCase().replace(/[^A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ ]/g, '') }))}
                  maxLength={60}
                  placeholder="EX: O SENHOR DOS ANÉIS"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-black tracking-widest placeholder:text-white/10 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3 ml-1">Dica Útil</label>
                <input 
                  type="text" 
                  value={mySetup.hint}
                  onChange={(e) => setMySetup(prev => ({ ...prev, hint: e.target.value }))}
                  maxLength={120}
                  placeholder="EX: Trilogia épica de fantasia"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-black tracking-wide placeholder:text-white/10 focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>

            <button
              onClick={saveLocalSetup}
              disabled={!mySetup.word || !mySetup.hint}
              className="w-full mt-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest disabled:opacity-30 hover:bg-blue-500 transition-all active:scale-95 shadow-xl shadow-blue-900/20"
            >
              Salvar Configurações
            </button>
          </motion.div>
        </div>
      )}

      {showRules && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-slate-900 border border-white/10 rounded-[32px] p-8 max-w-lg w-full shadow-2xl overflow-hidden relative"
          >
            <button 
              onClick={() => setShowRules(false)}
              className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors"
            >
              <X className="w-5 h-5 opacity-40 text-white" />
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-yellow-500/10 rounded-2xl">
                <Info className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Como Jogar</h3>
                <p className="text-[10px] font-bold tracking-widest uppercase opacity-40 text-white">Regras - Forca Batalha</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 font-mono font-bold text-blue-400">1</div>
                <div>
                  <h4 className="font-bold mb-1 text-white">Objetivo</h4>
                  <p className="text-sm opacity-60 text-white">Adivinhe a palavra secreta antes que o boneco da forca seja totalmente desenhado. Você pode cometer até 6 erros.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 font-mono font-bold text-purple-400">2</div>
                <div>
                  <h4 className="font-bold mb-1 text-white">O Duelo</h4>
                  <p className="text-sm opacity-60 text-white">No modo online, cada jogador define uma palavra para o outro. Os pontos são atribuídos com base em quantos erros você evita.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowRules(false)}
              className="w-full mt-10 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:bg-opacity-90 transition-all active:scale-95"
            >
              Entendi!
            </button>
          </motion.div>
        </div>
      )}

      {showExitConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-slate-900 border border-white/10 rounded-[40px] p-12 max-w-md w-full text-center shadow-2xl"
          >
            <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <LogOut className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-4 text-white">Sair do Jogo?</h2>
            <p className="text-sm opacity-60 mb-12 leading-relaxed text-white">
              Se você sair agora, perderá seu progresso nesta partida. Tem certeza que deseja sair?
            </p>
            <div className="flex flex-col gap-4">
              <button 
                onClick={handleLeave}
                className="w-full py-4 bg-rose-600 hover:bg-rose-500 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 text-white"
              >
                Sim, Sair do Jogo
              </button>
              <button 
                onClick={() => setShowExitConfirm(false)}
                className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 text-white"
              >
                Não, Continuar Jogando
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderWord = (word: string, guesses: string[], isRevealed = false) => {
    const words = word.split(' ');
    const maxWordLength = Math.max(...words.map(w => w.length), 0);
    let globalCharIndex = 0;

    // Dynamic sizing based on the longest word to prevent mobile overflow
    // Default (up to 8 chars): w-8 h-10, text-2xl (sm: w-10 h-14, text-4xl)
    let boxSize = "w-8 h-10 sm:w-10 sm:h-14";
    let fontSize = "text-2xl sm:text-4xl";
    let gapSize = "gap-2 sm:gap-4";
    let borderSize = "border-b-4";

    if (maxWordLength > 12) {
      boxSize = "w-4 h-7 sm:w-8 sm:h-11";
      fontSize = "text-base sm:text-2xl";
      gapSize = "gap-1 sm:gap-2";
      borderSize = "border-b-2";
    } else if (maxWordLength > 10) {
      boxSize = "w-5 h-8 sm:w-9 sm:h-12";
      fontSize = "text-lg sm:text-3xl";
      gapSize = "gap-1 sm:gap-3";
      borderSize = "border-b-2 sm:border-b-4";
    } else if (maxWordLength > 8) {
      boxSize = "w-6 h-9 sm:w-10 sm:h-14";
      fontSize = "text-xl sm:text-4xl";
      gapSize = "gap-1 sm:gap-4";
      borderSize = "border-b-3 sm:border-b-4";
    }

    return (
      <div className="flex flex-col items-center mb-8 w-full px-2">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-6 w-full">
          {words.map((currentWord, wordIdx) => (
            <div 
              key={wordIdx} 
              className={cn(
                "flex justify-center", 
                gapSize,
                // If it's a single long word, allow it to wrap internally
                words.length === 1 ? "flex-wrap" : "flex-nowrap"
              )}
            >
              {currentWord.split('').map((letter, charIdx) => {
                const delayIndex = globalCharIndex++;
                const isHyphen = letter === '-';
                const isLetterGuessed = guesses.includes(normalizeText(letter));
                const showChar = isLetterGuessed || (isHyphen && isRevealed);

                return (
                  <motion.div 
                    key={charIdx}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: delayIndex * 0.05 }}
                    className={cn(
                      "flex items-center justify-center font-black transition-all",
                      boxSize,
                      fontSize,
                      (isHyphen || letter === ' ') ? "border-none" : borderSize,
                      "border-blue-500/30",
                      showChar ? "text-white" : "text-transparent"
                    )}
                  >
                    <AnimatePresence mode="popLayout">
                      {showChar ? (
                        <motion.span
                          key="letter"
                          initial={{ scale: 0, y: 10, opacity: 0 }}
                          animate={{ scale: 1, y: 0, opacity: 1 }}
                          transition={{ 
                            type: "spring",
                            stiffness: 400,
                            damping: 15
                          }}
                        >
                          {letter}
                        </motion.span>
                      ) : (
                        <span key="empty">{letter}</span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
              {/* Account for space in animation delay if not last word */}
              {wordIdx < words.length - 1 && (globalCharIndex++ || true) && null}
            </div>
          ))}
        </div>
        
        {/* Discreet notice for single long words that might wrap */}
        {words.length === 1 && word.length > 8 && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            className="text-[10px] uppercase tracking-widest mt-4 text-white font-medium"
          >
            Palavra única
          </motion.p>
        )}
      </div>
    );
  };

  const renderKeyboard = (guesses: string[], correctWord?: string) => {
    return (
      <div className="flex flex-col gap-2 max-w-2xl mx-auto w-full px-2">
        {KEYBOARD_ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-1 sm:gap-2 justify-center w-full">
            {row.map(letter => {
              const isGuessed = guesses.includes(letter);
              const isCorrect = correctWord && normalizeText(correctWord).includes(letter);
              
              return (
                <button
                  key={letter}
                  onClick={() => handleGuess(letter)}
                  disabled={isGuessed}
                  className={cn(
                    "flex-1 min-w-0 h-10 sm:h-12 max-w-[60px] rounded-lg font-bold text-sm sm:text-base transition-all active:scale-95 flex items-center justify-center",
                    !isGuessed && "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20",
                    isGuessed && isCorrect && "bg-green-500/20 border border-green-500/40 text-green-400 cursor-not-allowed",
                    isGuessed && !isCorrect && "bg-rose-500/20 border border-rose-500/40 text-rose-400 opacity-40 cursor-not-allowed"
                  )}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // --- MAIN RENDER ---
  const isSetup = mode === 'online' && matchData?.status === 'setup';
  const isPlaying = (mode === 'local' && localGame?.status === 'playing') || (mode === 'online' && matchData?.status === 'playing');
  const isSpectator = mode === 'online' && matchData && !matchData.players.includes(user?.uid || '');

  let mainContent: React.ReactNode = null;

  if (loading) {
    mainContent = (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-black uppercase tracking-widest opacity-40">Loading Forca Batalha...</p>
      </div>
    );
  } else if (mode === 'online' && !matchData) {
    mainContent = (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <AlertCircle className="w-16 h-16 text-rose-500 mb-6" />
        <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Partida não encontrada</h2>
        <p className="text-sm opacity-40 max-w-xs mb-8">
          Não conseguimos carregar os dados desta partida online. Se você for o anfitrião, tente inicializar novamente.
        </p>
        <div className="flex gap-4">
          <button 
            onClick={initMissingMatch}
            className="px-8 py-4 bg-blue-600 rounded-2xl font-black uppercase tracking-widest text-xs"
          >
            Inicializar Match
          </button>
          <button 
            onClick={handleLeave}
            className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-xs"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  } else if (isSetup || isPlaying || (localGame && localGame.status !== 'playing')) {
    const isGameOver = (mode === 'local' && localGame?.status !== 'playing') || (mode === 'online' && matchData?.status === 'finished');
    const playerStatus = mode === 'online' ? matchData?.playerData?.[user!.uid]?.status : localGame?.status;
    const won = playerStatus === 'won';

    const isReady = mode === 'online' && matchData?.playerData?.[user!.uid]?.ready;
    const isHost = mode === 'online' && matchData?.players[0] === user?.uid;
    const everyoneReady = mode === 'online' && matchData?.players.every((pid: string) => matchData.playerData?.[pid]?.ready);
    const canStart = isHost && everyoneReady && matchData!.players.length >= 2;
    const hasDefinedWord = mySetup.word.length > 0;

    const players = mode === 'online' ? (matchData?.players || []) : [];
    const myIndex = players.indexOf(user?.uid || '');
    const targetPlayerId = mode === 'online' && matchData?.targetMappings 
      ? matchData.targetMappings[user?.uid || ''] 
      : (players.length > 0 ? players[(myIndex + 1) % players.length] : null);
    
    // In online mode:
    // - If playing: show target's word (the one we are guessing)
    // - If setup: show my own word (the one I am defining)
    const currentWord = mode === 'local' ? localGame?.word : 
                      (matchData?.status === 'playing') ? 
                      (variant === 'classic' ? (matchData.word || '') : (targetPlayerId ? (matchData.playerData[targetPlayerId]?.word || '') : '')) : 
                      (variant === 'classic' ? '' : (hasDefinedWord ? mySetup.word : ' '.repeat(Math.max(5, mySetup.word.length || 8))));
    
    const currentHint = mode === 'local' ? localGame?.hint : 
                       (matchData?.status === 'playing') ? 
                       (variant === 'classic' ? (matchData.hint || '') : (targetPlayerId ? (matchData.playerData[targetPlayerId]?.hint || '') : '')) : 
                       (variant === 'classic' ? (matchData?.selectedTheme ? `Tema: ${matchData.selectedTheme}` : 'Aguardando tema...') : (hasDefinedWord ? mySetup.hint : 'Aguardando palavra...'));

    const mistakesCount = mode === 'local' ? (localGame?.mistakes || 0) : (matchData?.playerData?.[user!.uid]?.wrongGuesses || 0);
    const maxMistakes = mode === 'local' ? (localGame?.difficulty === 'Easy' ? 8 : localGame?.difficulty === 'Hard' ? 6 : 7) : 6;
    const currentGuesses = mode === 'local' ? (localGame?.guesses || []) : 
                           (matchData?.status === 'setup' ? (hasDefinedWord ? ALPHABET : []) : (matchData?.playerData?.[user!.uid]?.guesses || []));
    
    // Safety check: if match is playing but my player status is still setup, treat as playing if it was a minor sync delay
    const effectivePlayerStatus = mode === 'online' ? 
      ((matchData?.status === 'playing' && matchData?.playerData?.[user!.uid]?.status === 'setup') ? 'playing' : matchData?.playerData?.[user!.uid]?.status) : 
      localGame?.status;

    const isPlayerPlaying = effectivePlayerStatus === 'playing';

    mainContent = (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col text-white">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/50 backdrop-blur-md border-b border-white/5 px-4 py-3 sm:px-6 sm:py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button 
              onClick={handleExitClick}
              className="flex items-center gap-2 text-xs sm:text-sm font-black tracking-widest opacity-60 hover:opacity-100 transition-opacity uppercase text-white"
            >
              <X className="w-5 h-5" />
              <span className="hidden min-[450px]:inline">EXIT GAME</span>
              <span className="min-[450px]:hidden">EXIT</span>
            </button>

            <div className="text-center absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
              <h1 className="text-xl font-black italic uppercase tracking-tighter text-white">
                {variant === 'classic' ? 'Forca Clássico' : 'Forca Batalha'}
              </h1>
              <div className="flex flex-col sm:flex-row items-center sm:gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-white">
                  {mode === 'local' ? 'Modo Local' : variant === 'classic' ? 'Arena Global' : 'Duelo Simultâneo'}
                </p>
                {(mode === 'local' || (variant === 'classic' && matchData)) && (
                  <div className="flex gap-1.5 mt-1 sm:mt-0">
                    {selectedTheme && (
                      <span className="text-[8px] font-black bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/30 uppercase tracking-widest shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                        {selectedTheme}
                      </span>
                    )}
                    <span 
                      className={cn(
                        "text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest",
                        selectedDifficulty === 'Easy' ? "bg-green-500/20 text-green-400 border-green-500/30" :
                        selectedDifficulty === 'Medium' ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                        "bg-red-500/20 text-red-400 border-red-500/30"
                      )}
                    >
                      {selectedDifficulty === 'Easy' ? 'Fácil' : selectedDifficulty === 'Medium' ? 'Médio' : 'Difícil'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <button 
                onClick={toggleMute}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all flex items-center gap-2 group"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-white/40" /> : <Volume2 className="w-4 h-4 text-white/80" />}
              </button>
              <div className="hidden min-[500px]:flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                <Trophy className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Score: {mode === 'local' ? localGame?.score : (matchData?.playerData?.[user!.uid]?.sessionScore || 0)}</span>
              </div>
              <button 
                onClick={() => setShowRules(true)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all flex items-center gap-2 group"
              >
                <HelpCircle className="w-5 h-5 text-yellow-400" />
                <span className="text-[10px] font-black tracking-widest uppercase hidden sm:inline text-white">Rules</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pt-32 sm:pt-40 pb-12 p-6 flex flex-col items-center">
          {mode === 'online' && matchData && (
            <div className="w-full max-w-5xl flex flex-wrap items-center justify-center gap-3 sm:gap-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
              {matchData.players.map((playerId: string) => {
                const isMe = playerId === user?.uid;
                const pInfo = playerProfiles[playerId] || {};
                const pData = matchData.playerData?.[playerId];
                const isActive = pData?.status === 'playing';
                const isReady = pData?.ready;

                return (
                  <div 
                    key={playerId}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all relative min-w-[100px] sm:min-w-[140px]",
                      isActive ? "bg-blue-500/10 border-blue-500/50 scale-105 shadow-[0_0_20px_rgba(59,130,246,0.2)]" : "bg-white/5 border-white/5 opacity-60",
                      isMe && "ring-2 ring-white/10 ring-offset-4 ring-offset-slate-950"
                    )}
                  >
                    <div className="relative">
                      {pInfo.photoURL ? (
                        <img 
                          src={pInfo.photoURL} 
                          alt={pInfo.displayName} 
                          className={cn(
                            "w-10 h-10 sm:w-14 sm:h-14 rounded-xl object-cover border-2",
                            isActive ? "border-blue-500" : "border-white/10"
                          )}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-white/10 flex items-center justify-center border-2 border-white/10">
                          <User className="w-5 h-5 sm:w-7 sm:h-7 opacity-40" />
                        </div>
                      )}
                      {isReady && matchData.status === 'setup' && (
                        <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 shadow-lg">
                          <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest truncate max-w-[80px] sm:max-w-[120px]">
                        {isMe ? 'Você' : (pInfo.displayName || 'Jogador')}
                      </p>
                      <div className="flex items-center justify-center gap-1.5 mt-0.5">
                        <span className="text-[7px] font-black uppercase opacity-40">Erros</span>
                        <span className="text-[10px] font-black italic text-rose-400">{pData?.wrongGuesses || 0}/6</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {isSpectator ? (
            matchData?.status === 'setup' ? (
              <div className="flex flex-col items-center justify-center p-12 bg-slate-900 border border-white/10 rounded-[40px] text-center max-w-xl mx-auto shadow-2xl animate-in fade-in zoom-in duration-500">
                <div className="p-4 bg-blue-500/20 rounded-3xl mb-6">
                  <RefreshCw className="w-10 h-10 text-blue-400 animate-spin-slow" />
                </div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter mb-2 text-white">Aguardando Preparação</h3>
                <p className="text-xs font-bold opacity-40 max-w-xs text-white uppercase tracking-widest leading-relaxed">
                  Os jogadores estão definindo suas palavras secretas. Acompanhe a arena em instantes...
                </p>
                <div className="mt-8 flex items-center gap-2">
                   {matchData.players.map((pid: string) => (
                     <div key={pid} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden relative group">
                       {playerProfiles[pid]?.photoURL ? (
                         <img src={playerProfiles[pid].photoURL} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                       ) : (
                         <User className="w-4 h-4 opacity-20" />
                       )}
                       {matchData.playerData?.[pid]?.ready && (
                         <div className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full" />
                       )}
                     </div>
                   ))}
                </div>
              </div>
            ) : (
              <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in zoom-in duration-500">
                {matchData.players.map((pid: string) => {
                  const playerData = matchData.playerData[pid];
                  if (!playerData) return null;
                  
                  const players = matchData.players;
                  const targetId = matchData.targetMappings?.[pid] || players[(players.indexOf(pid) + 1) % players.length];
                  const targetData = matchData.playerData[targetId];
                  
                  const pInfo = playerProfiles[pid] || {};
                  const wordToGuess = targetData?.word || '';
                  const hintToGuess = targetData?.hint || '';
                  const guesses = playerData.guesses || [];
                  const mistakes = playerData.wrongGuesses || 0;
                  const status = playerData.status;
  
                  return (
                    <div key={pid} className="bg-slate-900 border border-white/10 rounded-[32px] p-6 flex flex-col items-center gap-6 relative overflow-hidden shadow-2xl">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 opacity-30" />
                      <div className="flex items-center gap-4 self-start">
                        <div className="relative">
                          {pInfo.photoURL ? (
                            <img src={pInfo.photoURL} className="w-10 h-10 rounded-xl object-cover border border-white/10" alt="" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                              <User className="w-5 h-5 opacity-40" />
                            </div>
                          )}
                          {status === 'won' && (
                            <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-0.5 shadow-lg">
                              <Trophy className="w-2.5 h-2.5 text-black" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-white">{pInfo.displayName || 'Jogador'}</p>
                          <p className={cn(
                            "text-[8px] font-bold uppercase",
                            status === 'won' ? "text-green-400" : status === 'lost' ? "text-rose-400" : "text-blue-400"
                          )}>
                            {status === 'won' ? 'Venceu!' : status === 'lost' ? 'Enforcado!' : 'Jogando...'}
                          </p>
                        </div>
                      </div>
  
                      <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
                        <div className="w-32 h-40 flex items-center justify-center">
                           <div className="scale-50 origin-center">
                             <HangmanFigure mistakes={mistakes} maxMistakes={6} profilePic={pInfo.photoURL} />
                           </div>
                        </div>
                        
                        <div className="flex-1 flex flex-col items-center sm:items-start gap-4">
                          {hintToGuess && (
                            <div className="flex flex-col gap-1 items-center sm:items-start">
                              <span className="text-[8px] font-black uppercase tracking-widest opacity-40 text-white">Dica:</span>
                              <p className="text-xs font-bold text-blue-400 italic">{hintToGuess}</p>
                            </div>
                          )}
                          <div className="scale-75 origin-top-left -ml-4 sm:ml-0">
                            {renderWord(wordToGuess, guesses, isGameOver || status !== 'playing')}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Side: Figure and Hint */}
            <div className="flex flex-col items-center gap-8">
              <HangmanFigure mistakes={mistakesCount} maxMistakes={maxMistakes} profilePic={profile?.photoURL || user?.photoURL} />
              
              <div className="bg-slate-900 border border-white/10 rounded-[32px] p-8 sm:p-10 w-full max-w-sm text-center relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-purple-500 opacity-50" />
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/20 rounded-xl">
                    <Info className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-[0.3em] text-blue-400">Dica Secreta</span>
                </div>
                
                {mode === 'online' && matchData?.status === 'setup' ? (
                  <div className="space-y-4">
                    {variant === 'classic' ? (
                      <div className="flex flex-col gap-4">
                        {isHost ? (
                          <>
                            <button 
                              onClick={() => setShowThemeSelector(true)}
                              className="w-full py-4 bg-purple-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-purple-500 transition-all flex items-center justify-center gap-2 text-white"
                            >
                              <Layout className="w-3 h-3" /> {selectedTheme ? `Tema: ${selectedTheme}` : 'Escolher Tema'}
                            </button>
                            {!isReady ? (
                              <button 
                                onClick={submitOnlineSetup}
                                disabled={!selectedTheme}
                                className="w-full py-4 bg-green-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-green-500 transition-all disabled:opacity-30 text-white shadow-lg shadow-green-900/20"
                              >
                                Estou Pronto!
                              </button>
                            ) : (
                              <div className="py-4 text-white">
                                {canStart ? (
                                  <div className="flex flex-col items-center gap-4 w-full">
                                    <div className="text-xs font-bold text-green-400 mb-1 animate-bounce">Tudo pronto!</div>
                                    <button 
                                      onClick={startOnlineGame}
                                      className="w-full py-4 bg-green-600 hover:bg-green-500 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-xl shadow-green-900/30 flex items-center justify-center gap-2 text-white"
                                    >
                                      <Play className="w-4 h-4 fill-current" /> Iniciar Partida
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-3">
                                    <RefreshCw className="w-6 h-6 text-blue-400 animate-spin-slow" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                                      Aguardando jogadores...
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-4">
                            {!isReady ? (
                              <>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                                  {matchData.selectedTheme ? `O mestre escolheu: ${matchData.selectedTheme}` : 'O mestre está escolhendo o tema...'}
                                </p>
                                <button 
                                  onClick={submitOnlineSetup}
                                  className="w-full py-4 bg-green-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-green-500 transition-all text-white shadow-lg shadow-green-900/20"
                                >
                                  Estou Pronto!
                                </button>
                              </>
                            ) : (
                              <div className="flex flex-col items-center gap-3 py-4">
                                <RefreshCw className="w-6 h-6 text-blue-400 animate-spin-slow" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                                  {everyoneReady ? 'Aguardando o mestre iniciar...' : 'Aguardando outros jogadores...'}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {!isReady ? (
                          <>
                            {!hasDefinedWord ? (
                              <button 
                                onClick={() => setShowSetupModal(true)}
                                className="w-full py-4 bg-blue-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-500 transition-all flex items-center justify-center gap-2 text-white"
                              >
                                <Play className="w-3 h-3 fill-current" /> Informar sua palavra
                              </button>
                            ) : (
                              <div className="flex flex-col gap-3">
                                <div className="text-xs font-bold text-green-400 mb-1">Palavra definida com sucesso!</div>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => setShowSetupModal(true)}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all text-white"
                                  >
                                    Editar
                                  </button>
                                  <button 
                                    onClick={submitOnlineSetup}
                                    className="flex-1 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-green-900/20 text-white"
                                  >
                                    Estou Pronto!
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="py-4 text-white">
                            <div className="flex flex-col items-center gap-3">
                              {canStart ? (
                                <div className="flex flex-col items-center gap-4 w-full">
                                  <div className="text-xs font-bold text-green-400 mb-1 animate-bounce">Tudo pronto!</div>
                                  <button 
                                    onClick={startOnlineGame}
                                    className="w-full py-4 bg-green-600 hover:bg-green-500 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-xl shadow-green-900/30 flex items-center justify-center gap-2 text-white"
                                  >
                                    <Play className="w-4 h-4 fill-current" /> Iniciar Partida
                                  </button>
                                  <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Você é o dono da sala</p>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-3">
                                  <RefreshCw className="w-6 h-6 text-blue-400 animate-spin-slow" />
                                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                                    {isHost ? 'Aguardando jogadores ficarem Ready...' : 'Aguardando o dono iniciar...'}
                                  </p>
                                  {everyoneReady && !isHost && (
                                    <p className="text-[8px] font-bold text-green-400 uppercase tracking-widest">Todos prontos!</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <p className={cn(
                      "text-xl sm:text-2xl font-black italic transition-all duration-500",
                      mode === 'local' && localGame?.difficulty === 'Hard' && mistakesCount < 3 ? "text-white/20 blur-sm" : "text-white drop-shadow-sm"
                    )}>
                      {mode === 'local' && localGame?.difficulty === 'Hard' && mistakesCount < 3 
                        ? 'Dica oculta (erre 3x)' 
                        : currentHint}
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-4">
                      <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 flex items-center gap-2">
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/40">Erros</span>
                        <span className={cn(
                          "text-[10px] font-black italic",
                          mistakesCount >= maxMistakes - 1 ? "text-rose-500 animate-pulse" : "text-white"
                        )}>{mistakesCount}/{maxMistakes}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-0.5 w-4 bg-white/10" />
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-20">Boa Sorte</span>
                        <div className="h-0.5 w-4 bg-white/10" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Word and Keyboard */}
            <div className="flex flex-col gap-12 w-full">
              {renderWord(currentWord || '', currentGuesses, playerStatus !== 'playing' || isGameOver)}

              <AnimatePresence mode="wait">
                {isPlayerPlaying ? (
                  <motion.div 
                    key="keyboard"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="text-white"
                  >
                    {renderKeyboard(currentGuesses, currentWord)}
                  </motion.div>
                ) : (mode === 'local' && !isPlayerPlaying) || (mode === 'online' && !isSpectator && !isPlayerPlaying && matchData?.status === 'playing') ? (
                  <motion.div 
                    key="status-overlay"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center text-white"
                  >
                    <div className={cn(
                      "inline-flex p-12 rounded-[40px] mb-8 flex-col items-center text-center gap-4 shadow-2xl",
                      won ? "bg-green-500/10 border border-green-500/20" : "bg-rose-500/10 border border-rose-500/20"
                    )}>
                      <div className={cn(
                        "w-20 h-20 rounded-full flex items-center justify-center mb-2",
                        won ? "bg-green-500 text-white" : "bg-rose-500 text-white"
                      )}>
                        {won ? <Trophy className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
                      </div>
                      <h3 className="text-3xl font-black italic uppercase tracking-tighter">
                        {won ? 'Adivinhou!' : 'Enforcado!'}
                      </h3>
                      <p className="text-sm font-bold opacity-60">
                        {won ? `Você descobriu a palavra "${currentWord}"!` : `A palavra era: ${currentWord}`}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                      {mode === 'local' ? (
                        <button 
                          onClick={triggerLocalRematch}
                          className="flex-1 py-5 bg-blue-600 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-blue-500 transition-all font-black italic text-white"
                        >
                          <RefreshCw className="w-4 h-4" /> Jogar Novamente
                        </button>
                      ) : (
                        <div className="flex-1 py-5 bg-white/5 rounded-2xl flex flex-col items-center justify-center gap-1 opacity-60">
                          <RefreshCw className="w-4 h-4 animate-spin mb-2" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Aguardando</span>
                          <span className="text-[8px] font-bold opacity-40">Finalização Geral da Partida</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        )}
        </div>
      </div>
    );
  } else if (mode === 'online' && matchData?.status === 'finished') {
    const players = matchData.players;
    const winner = matchData.winner;
    const isWinner = winner === user?.uid;
    const isDraw = winner === 'draw';

    const formatDuration = (ms?: number) => {
      if (!ms) return '-';
      const sec = Math.floor(ms / 1000);
      const min = Math.floor(sec / 60);
      const s = sec % 60;
      return `${min}:${s.toString().padStart(2, '0')}`;
    };

    mainContent = (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col overflow-y-auto text-white p-4 sm:p-12">
        <header className="max-w-5xl w-full mx-auto flex items-center justify-between mb-8 sm:mb-12 pt-4">
           <button 
            onClick={handleLeave}
            className="flex items-center gap-2 text-xs font-black tracking-widest opacity-60 hover:opacity-100 transition-opacity uppercase"
          >
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="text-center">
             <h2 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter">Fim de Jogo</h2>
             <p className="text-[10px] font-black uppercase tracking-widest opacity-40 text-blue-400">Relatório de Batalha</p>
          </div>
          <div className="w-10 sm:w-20" />
        </header>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl w-full mx-auto pb-20"
        >
          {/* Winner Banner */}
          <div className={cn(
             "w-full rounded-[40px] p-8 sm:p-12 text-center mb-8 sm:mb-12 shadow-2xl relative overflow-hidden flex flex-col items-center",
             isDraw || isSpectator ? "bg-slate-800 border border-white/10" : 
             isWinner ? "bg-green-500/20 border border-green-500/30" : "bg-rose-500/20 border border-rose-500/30"
          )}>
            <div className={cn(
              "w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center mb-6",
              isDraw || isSpectator ? "bg-white/10" : isWinner ? "bg-green-500/20 text-green-400" : "bg-rose-500/20 text-rose-400"
            )}>
              {isDraw ? <Users className="w-10 h-10 sm:w-12 sm:h-12" /> : <Trophy className="w-10 h-10 sm:w-12 sm:h-12" />}
            </div>
            <h1 className="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter mb-2">
              {isDraw ? 'Empate Técnico!' : isWinner ? 'Vitória Épica!' : isSpectator ? 'Fim da Partida' : 'Derrota Honrosa'}
            </h1>
            <p className="text-base sm:text-lg font-bold opacity-60 max-w-md">
              {matchData.leftEarly && matchData.leftEarly !== user?.uid ? (
                'Alguém abandonou o campo de batalha.'
              ) : isDraw ? (
                'Ambos jogaram excepcionalmente.'
              ) : isWinner ? (
                'Você superou seus oponentes no tempo e na lógica.'
              ) : isSpectator ? (
                'A partida entre os jogadores foi finalizada.'
              ) : (
                'Outro jogador foi mais rápido desta vez.'
              )}
            </p>
          </div>

          {/* Detailed Comparison Table */}
          <div className="bg-slate-900 border border-white/10 rounded-[32px] sm:rounded-[40px] overflow-hidden shadow-2xl mb-8 sm:mb-12">
            {/* Desktop Header */}
            <div className="hidden md:grid md:grid-cols-5 p-6 border-b border-white/10 bg-white/5">
              <div className="text-[10px] font-black uppercase tracking-widest opacity-40">Jogador</div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-40 text-center">Status / Palavra</div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-40 text-center">Erros</div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-40 text-center">Letras</div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-40 text-right">Tempo</div>
            </div>

            {players.map((pid: string) => {
              const info = playerProfiles[pid] || {};
              const data = matchData.playerData[pid] || {};
              const isPMe = pid === user?.uid;
              const targetPlayerIdForThis = matchData.targetMappings?.[pid] || players[(players.indexOf(pid) + 1) % players.length];
              const targetWord = variant === 'classic' ? (matchData.word || '-') : (matchData.playerData[targetPlayerIdForThis]?.word || '-');
              const stats = {
                revealed: data.revealedCount || 0,
                wrong: data.wrongGuesses || 0,
                status: data.status,
                time: formatDuration(data.duration)
              };

              return (
                <div key={pid} className={cn(
                  "flex flex-col md:grid md:grid-cols-5 p-6 sm:p-8 items-center border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors gap-4 md:gap-0",
                  isPMe && "bg-blue-500/5"
                )}>
                  {/* Player Info */}
                  <div className="flex items-center gap-4 self-start md:self-center w-full md:w-auto">
                    <div className="relative">
                      {info.photoURL ? (
                        <img src={info.photoURL} className="w-12 h-12 rounded-2xl object-cover border border-white/10" alt="" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                          <User className="w-6 h-6 opacity-40" />
                        </div>
                      )}
                      {matchData.winner === pid && (
                        <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-1 shadow-lg">
                          <Trophy className="w-3 h-3 text-black" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black uppercase tracking-tight truncate">{info.displayName || 'Jogador'}</p>
                      <p className={cn("text-[9px] font-bold uppercase", isPMe ? "text-blue-400" : "opacity-30")}>
                        {isPMe ? 'Você' : 'Adversário'}
                      </p>
                    </div>
                  </div>

                  {/* Status / Word */}
                  <div className="flex flex-row md:flex-col justify-between md:justify-center items-center w-full md:w-auto px-4 md:px-0">
                    <div className="md:hidden text-[9px] font-bold uppercase opacity-40">Status / Palavra:</div>
                    <div className="text-center">
                      <div className={cn(
                        "inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-1",
                        stats.status === 'won' ? "bg-green-500/20 text-green-400" : "bg-rose-500/20 text-rose-400"
                      )}>
                        {stats.status === 'won' ? 'Vitória' : 'Derrota'}
                      </div>
                      <p className="text-xs font-mono opacity-40">{targetWord}</p>
                    </div>
                  </div>

                  {/* Mistakes */}
                  <div className="flex flex-row md:flex-col justify-between md:justify-center items-center w-full md:w-auto px-4 md:px-0">
                    <div className="md:hidden text-[9px] font-bold uppercase opacity-40">Erros:</div>
                    <span className="text-xl font-black italic text-rose-400">{stats.wrong}/6</span>
                  </div>

                  {/* Revealed */}
                  <div className="flex flex-row md:flex-col justify-between md:justify-center items-center w-full md:w-auto px-4 md:px-0">
                    <div className="md:hidden text-[9px] font-bold uppercase opacity-40">Letras:</div>
                    <span className="text-xl font-black italic text-blue-400">{stats.revealed}</span>
                  </div>

                  {/* Time */}
                  <div className="flex flex-row md:flex-col justify-between md:justify-end items-center w-full md:w-auto px-4 md:px-0">
                    <div className="md:hidden text-[9px] font-bold uppercase opacity-40">Tempo:</div>
                    <div className="text-right">
                      <span className="text-xl font-black italic block whitespace-nowrap">{stats.time}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={handleLeave}
              className="flex-1 py-6 bg-white text-black rounded-3xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-transform shadow-xl"
            >
              Encerrar Partida
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {mainContent}
      {renderModals()}
    </>
  );
}
