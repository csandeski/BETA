import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Clock, BookOpen, AlertTriangle, Check, Loader2, Star, ChevronLeft, ChevronRight, Sparkles, Shield, Trophy, TrendingUp, BookMarked, Award, CheckCircle, Volume2, VolumeX } from "lucide-react";
import { useSound } from "@/hooks/useSound";
import { PlanUpgradeModal } from "@/components/PlanUpgradeModal";
import { userDataManager } from "@/utils/userDataManager";
import { apiClient } from "@/lib/api";
import { lockBodyScroll, unlockBodyScroll } from "@/utils/scrollLock";

// Helper function to handle guest book completion
function completeGuestBook(bookData: any) {
  // Get existing guest data
  const storedData = localStorage.getItem('guestUserData');
  if (storedData) {
    const guestData = JSON.parse(storedData);
    
    // Ensure reward is a number (it might come as string)
    const rewardAmount = typeof bookData.reward === 'string' ? parseFloat(bookData.reward) : bookData.reward;
    
    // Update main balance and earnings
    guestData.balance += rewardAmount;
    guestData.totalEarnings += rewardAmount;
    
    // Update stats
    guestData.stats.totalBooksRead += 1;
    guestData.stats.totalActivities += 1;
    guestData.stats.todayBooksRead += 1;
    guestData.stats.totalEarnings += rewardAmount;
    guestData.stats.todayEarnings += rewardAmount;
    guestData.stats.weekEarnings += rewardAmount;
    guestData.stats.monthEarnings += rewardAmount;
    
    // Update difficulty counts based on book difficulty
    if (bookData.difficulty === 'Fácil') {
      guestData.stats.easyBooksCount = (guestData.stats.easyBooksCount || 0) + 1;
    } else if (bookData.difficulty === 'Médio') {
      guestData.stats.mediumBooksCount = (guestData.stats.mediumBooksCount || 0) + 1;
    } else if (bookData.difficulty === 'Difícil') {
      guestData.stats.hardBooksCount = (guestData.stats.hardBooksCount || 0) + 1;
    }
    
    // Calculate new average rating
    const totalRatings = guestData.booksCompleted.reduce((sum: number, book: any) => sum + book.rating, 0) + bookData.rating;
    guestData.stats.averageRating = totalRatings / (guestData.booksCompleted.length + 1);
    
    // Update progress towards goals
    guestData.stats.weeklyProgress = Math.min(100, (guestData.stats.weekEarnings / guestData.stats.weeklyGoal) * 100);
    guestData.stats.monthlyProgress = Math.min(100, (guestData.stats.monthEarnings / guestData.stats.monthlyGoal) * 100);
    
    // Update last seven days chart (add today's earning)
    const today = guestData.stats.lastSevenDays[guestData.stats.lastSevenDays.length - 1];
    if (today) {
      today.valor += rewardAmount;
    }
    
    // Add to completed books
    guestData.booksCompleted.push({
      id: Date.now().toString(),
      bookSlug: bookData.bookSlug,
      title: bookData.title,
      reward: bookData.reward,
      completedAt: new Date().toISOString(),
      rating: bookData.rating,
      difficulty: bookData.difficulty
    });
    
    guestData.completedBooks.push(bookData.bookSlug);
    
    // Save updated data
    localStorage.setItem('guestUserData', JSON.stringify(guestData));
    
    return guestData;
  }
  return null;
}

export default function BookReading() {
  const [, params] = useRoute("/book/:slug");
  const [, setLocation] = useLocation();
  const [showInstructions, setShowInstructions] = useState(true);
  const [readingTime, setReadingTime] = useState(0);
  const [currentQuizStep, setCurrentQuizStep] = useState(0);
  const [showFraudWarning, setShowFraudWarning] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [validationStep, setValidationStep] = useState(0);
  const [rating, setRating] = useState(0);
  const [opinion, setOpinion] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isRobotVerified, setIsRobotVerified] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [ambientSoundEnabled, setAmbientSoundEnabled] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [userTotalEarned, setUserTotalEarned] = useState(0);
  const [isGuestUser, setIsGuestUser] = useState(false);
  const { playSound, startAmbientSound, stopAmbientSound } = useSound();

  const bookSlug = params?.slug || "";
  
  // Load user data on mount and scroll to top
  useEffect(() => {
    // Scroll to top when book page loads
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    const loadData = async () => {
      // Check if user is logged in
      const authResponse = await fetch('/api/auth/status');
      const authData = await authResponse.json();
      
      if (!authData.isLoggedIn || !authData.userId) {
        // User is not logged in - mark as guest
        setIsGuestUser(true);
      } else {
        // Load fresh data from database for logged in user
        setIsGuestUser(false);
        await userDataManager.loadUserData();
      }
    };
    
    loadData();
    
    // Reload data when page becomes visible
    const handleFocus = () => {
      loadData();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
  
  // Scroll to top when quiz step changes
  useEffect(() => {
    if (currentQuizStep > 0) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [currentQuizStep]);
  
  // Scroll to top when validation step changes
  useEffect(() => {
    if (validationStep > 0) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [validationStep]);
  
  // Book data based on slug
  const books: Record<string, any> = {
    "o-poder-do-habito": {
      title: "O Poder do Hábito",
      author: "Charles Duhigg",
      reward: 29.25,
      category: "Desenvolvimento Pessoal",
      readingLevel: "Intermediário",
      difficulty: "Médio",
      estimatedTime: "45 min",
      chapters: 12,
      pages: 408,
      publishYear: 2012,
      synopsis: "Descubra como funcionam os hábitos e aprenda a identificar os gatilhos que controlam seus comportamentos. Transforme sua vida mudando pequenas rotinas diárias.",
      content: `O Poder do Hábito - Charles Duhigg

Capítulo 1: O Ciclo do Hábito

Lisa Allen fumava, bebia e estava endividada. Em três anos, ela havia parado de fumar, corrido uma maratona e comprado uma casa. O que mudou? Ela aprendeu a identificar e modificar seus hábitos.

A Ciência dos Hábitos

Os hábitos surgem porque o cérebro está constantemente procurando maneiras de poupar esforço. Um hábito é um loop neurológico que consiste em três partes fundamentais:

1. DEIXA (Trigger) - O gatilho que inicia o comportamento automático
2. ROTINA - A ação em si, que pode ser física, mental ou emocional
3. RECOMPENSA - O benefício que seu cérebro recebe e que faz querer repetir

Quando esse loop se repete, o cérebro para de participar totalmente na tomada de decisão. É por isso que podemos dirigir para casa "no piloto automático" sem lembrar do caminho.

O Caso Eugene Pauly

Eugene Pauly perdeu parte de seu cérebro devido a uma encefalite viral. Ele não conseguia formar novas memórias - não reconhecia médicos que via diariamente há anos. Mas ainda podia formar novos hábitos.

Isso provou que hábitos e memórias são armazenados em diferentes partes do cérebro. Os gânglios basais, uma estrutura primitiva do cérebro, é onde os hábitos são armazenados. É por isso que podemos executar rotinas complexas sem pensar conscientemente nelas.

Os Experimentos do MIT

Pesquisadores do MIT realizaram experimentos fascinantes com ratos em labirintos. No início, a atividade cerebral dos ratos era intensa enquanto exploravam cada corredor. Depois de aprender o caminho para o chocolate, algo impressionante aconteceu: a atividade cerebral diminuía drasticamente. O comportamento havia se tornado automático.

O cérebro havia "chunked" (agrupado) dezenas de ações - virar à esquerda, virar à direita, avançar - em uma única rotina automática. É o mesmo processo que permite você escovar os dentes sem pensar em cada movimento.

Como a Pepsodent Mudou a América

No início do século XX, apenas 7% dos americanos escovavam os dentes. Claude Hopkins, um gênio da publicidade, transformou a escovação em um hábito nacional através da Pepsodent.

Seu segredo? Ele identificou uma deixa simples (a "película" nos dentes que você sente com a língua) e prometeu uma recompensa clara (dentes bonitos e brilhantes). Mas o verdadeiro truque estava no ingrediente secreto: ácido cítrico e menta, que criavam uma sensação de formigamento. Esse formigamento se tornou a verdadeira recompensa - as pessoas começaram a desejar aquela sensação de "boca limpa".

Por Que Hábitos São Tão Difíceis de Quebrar

Os hábitos nunca desaparecem completamente. Eles ficam codificados nas estruturas do cérebro, esperando pelas deixas e recompensas certas. É por isso que alcoólatras em recuperação podem ter recaídas anos depois - o padrão neurológico permanece.

Mas há esperança...

A Regra de Ouro da Mudança de Hábito

Você não pode extinguir um mau hábito, você só pode mudá-lo. A fórmula:
• Use a MESMA deixa
• Forneça a MESMA recompensa
• Mude apenas a ROTINA

O Segredo do AA (Alcoólicos Anônimos)

AA funciona porque substitui a rotina de beber por reuniões e apoio, mantendo as mesmas deixas (estresse, solidão, ansiedade) e recompensas (alívio, companhia, relaxamento). O programa também adiciona um ingrediente crucial: fé e comunidade, que fortalecem a nova rotina.

Aplicando na Sua Vida

Para mudar um hábito:
1. Identifique a rotina
2. Experimente com recompensas
3. Isole a deixa
4. Tenha um plano

Lembre-se: pequenas vitórias levam a grandes mudanças. Comece com um hábito pequeno e use esse sucesso como alavanca para mudanças maiores.`,
      questions: [
        {
          id: "q1",
          question: "De acordo com o livro, quais são os três componentes fundamentais que formam o loop do hábito?",
          options: ["Motivação, ação e resultado", "Deixa, rotina e recompensa", "Pensamento, comportamento e consequência", "Estímulo, resposta e feedback"],
          correct: 1
        },
        {
          id: "q2",
          question: "Em qual parte específica do cérebro os hábitos são armazenados, segundo as pesquisas apresentadas?",
          options: ["Córtex frontal", "Hipocampo", "Gânglios basais", "Cerebelo"],
          correct: 2
        },
        {
          id: "q3",
          question: "Qual é a regra de ouro para mudar hábitos que o autor apresenta no livro?",
          options: ["Eliminar completamente o hábito antigo", "Substituir a rotina mantendo deixa e recompensa", "Criar novos hábitos do zero", "Ignorar os hábitos ruins"],
          correct: 1
        }
      ]
    },
    "mindset": {
      title: "Mindset",
      author: "Carol S. Dweck",
      reward: 24.70,
      category: "Psicologia",
      readingLevel: "Básico",
      difficulty: "Fácil",
      synopsis: "Entenda a diferença entre mentalidade fixa e de crescimento. Aprenda como sua forma de pensar impacta diretamente seu sucesso e felicidade.",
      estimatedTime: "40 min",
      chapters: 8,
      pages: 312,
      publishYear: 2006,
      content: `Mindset: A Nova Psicologia do Sucesso - Carol S. Dweck

      Capítulo 1: Os Dois Mindsets Que Moldam Nossa Vida

      Por que algumas pessoas realizam seu potencial enquanto outras igualmente talentosas não conseguem? Após décadas de pesquisa, a psicóloga Carol Dweck descobriu que a resposta não está no talento, mas no MINDSET - nossa crença sobre a natureza das habilidades humanas.

      🔍 A Grande Descoberta

      Existem dois tipos fundamentais de mindset que moldam toda nossa vida:

      🔒 MINDSET FIXO
      • Acredita que qualidades como inteligência e talento são traços fixos
      • Você tem uma quantidade certa e pronto
      • O sucesso é a afirmação dessa inteligência inata
      • O fracasso é uma sentença negativa sobre suas capacidades fundamentais

      MINDSET DE CRESCIMENTO
      • Acredita que qualidades podem ser desenvolvidas através de esforço
      • O cérebro é como um músculo que fica mais forte com uso
      • Desafios são oportunidades para aprender
      • Fracassos são informações, não definições

      O Experimento Revelador

      Dweck deu a centenas de crianças quebra-cabeças progressivamente mais difíceis. A reação delas foi surpreendente e se dividiu em dois grupos distintos:

      Grupo 1 (Mindset Fixo): Quando os quebra-cabeças ficaram difíceis, essas crianças:
      • Desistiram rapidamente
      • Disseram "não sou inteligente o suficiente"
      • Perderam o interesse
      • Algumas até mentiram sobre seus resultados posteriormente

      Grupo 2 (Mindset de Crescimento): Diante do mesmo desafio:
      • Uma criança exclamou: "Adoro um desafio!"
      • Outra disse: "Eu esperava que isso fosse informativo!"
      • Pediram para levar quebra-cabeças para casa
      • Melhoraram seu desempenho com o tempo

      🎾 Campeões e Seus Mindsets

      JOHN McENROE - O Talento Natural (Mindset Fixo)
      • Acreditava que o talento deveria ser natural e sem esforço
      • Quando perdia, sempre culpava algo externo: a quadra, o juiz, o clima
      • Nunca admitia que o adversário foi melhor
      • Parou de evoluir cedo na carreira

      MICHAEL JORDAN - O Eterno Aprendiz (Mindset de Crescimento)
      • Foi cortado do time de basquete da escola
      • Treinou incansavelmente após cada derrota
      • "Errei mais de 9.000 cestas na minha carreira. Perdi quase 300 jogos. É por isso que eu tenho sucesso."
      • Continuou melhorando até o fim da carreira

      💼 CEOs e Culturas Corporativas

      CEOs com Mindset Fixo:
      • Precisam sempre parecer os mais inteligentes da sala
      • Cercam-se de pessoas que confirmam sua grandeza
      • Culpam outros pelos fracassos
      • Criam culturas de medo onde erros são escondidos
      • Exemplos: Ken Lay (Enron), Jerry Levin (AOL Time Warner)

      CEOs com Mindset de Crescimento:
      • Admitem erros e pedem feedback
      • Contratam pessoas mais inteligentes que eles
      • Veem a empresa como um trabalho em progresso
      • Criam culturas de aprendizagem e inovação
      • Exemplos: Lou Gerstner (IBM), Anne Mulcahy (Xerox)

      👨‍👩‍👧 O Poder do Elogio

      Um dos achados mais importantes: o tipo de elogio que damos molda o mindset:

      ❌ ELOGIO PREJUDICIAL (promove mindset fixo):
      • "Você é tão inteligente!"
      • "Você é um artista nato!"
      • "Você tem um dom especial!"

      ELOGIO CONSTRUTIVO (promove mindset de crescimento):
      • "Você trabalhou muito duro nisso!"
      • "Adorei as estratégias que você usou!"
      • "Você está melhorando através da prática!"

      💑 Mindset nos Relacionamentos

      MINDSET FIXO NO AMOR:
      • "Se fosse para dar certo, seria fácil"
      • "Meu parceiro deveria me entender sem eu precisar falar"
      • "Problemas significam que não somos compatíveis"
      • Resultado: relacionamentos frágeis que quebram sob pressão

      MINDSET DE CRESCIMENTO NO AMOR:
      • "Relacionamentos exigem trabalho e crescimento mútuo"
      • "Comunicação é uma habilidade a ser desenvolvida"
      • "Conflitos são oportunidades para nos conhecermos melhor"
      • Resultado: relacionamentos que se fortalecem com o tempo

      🧬 A Neurociência da Mudança

      A boa notícia revolucionária: mindsets podem ser mudados!

      Pesquisas em neuroplasticidade mostram:
      • O cérebro forma novas conexões durante toda a vida
      • Aprender coisas novas literalmente muda a estrutura cerebral
      • Apenas aprender sobre os dois mindsets já inicia mudanças

      Como Desenvolver um Mindset de Crescimento

      1. Aprenda a ouvir sua "voz do mindset fixo"
      2. Reconheça que você tem uma escolha
      3. Fale com você mesmo usando a voz do mindset de crescimento
      4. Tome ação baseada no mindset de crescimento

      A transformação não acontece da noite para o dia, mas cada pequeno passo conta. Como diz Dweck: "Tornar-se é melhor do que ser."`,
      questions: [
        {
          id: "q1",
          question: "Segundo Carol Dweck, quais são os dois tipos fundamentais de mindset apresentados no livro?",
          options: ["Positivo e negativo", "Fixo e de crescimento", "Aberto e fechado", "Forte e fraco"],
          correct: 1
        },
        {
          id: "q2",
          question: "Como o mindset de crescimento encara o esforço e os desafios?",
          options: ["Como fraqueza e perda de tempo", "Como algo desnecessário para quem tem talento", "Como oportunidades de aprendizado e desenvolvimento", "Como obstáculos a serem evitados"],
          correct: 2
        },
        {
          id: "q3",
          question: "Que tipo de elogio, segundo a pesquisa, promove o desenvolvimento de um mindset de crescimento?",
          options: ["Elogiar a inteligência natural", "Elogiar o dom especial", "Elogiar o processo, esforço e estratégias", "Elogiar apenas os resultados finais"],
          correct: 2
        }
      ]
    },
    "como-fazer-amigos": {
      title: "Como Fazer Amigos",
      author: "Dale Carnegie",
      reward: 27.30,
      category: "Relacionamentos",
      readingLevel: "Básico",
      difficulty: "Fácil",
      synopsis: "Técnicas comprovadas para melhorar relacionamentos e comunicação. Desenvolva habilidades sociais que transformarão sua vida pessoal e profissional.",
      estimatedTime: "35 min",
      chapters: 6,
      pages: 256,
      publishYear: 1936,
      content: `Como Fazer Amigos e Influenciar Pessoas - Dale Carnegie

      O Livro Que Mudou Milhões de Vidas

      Publicado em 1936, durante a Grande Depressão, este livro se tornou um dos mais vendidos de todos os tempos. Por quê? Porque Carnegie descobriu que o sucesso financeiro depende apenas 15% de conhecimento técnico e 85% de habilidade em lidar com pessoas.

      Parte 1: Técnicas Fundamentais para Lidar com Pessoas

      ⛔ Princípio 1: Não Critique, Não Condene, Não Se Queixe

      B.F. Skinner, o famoso psicólogo, provou cientificamente que animais aprendem mais rápido quando recompensados por bom comportamento do que quando punidos por mau comportamento. Com humanos é ainda mais verdadeiro.

      A crítica é perigosa porque:
      • Fere o orgulho da pessoa
      • Desperta ressentimento
      • Coloca a pessoa na defensiva
      • A faz justificar-se em vez de mudar

      História Reveladora: Al Capone, um dos criminosos mais notórios da América, se considerava um benfeitor público. "Tudo o que fiz foi fornecer ao público diversões mais leves com os melhores licores e cervejas." Se até criminosos se justificam, imagine pessoas comuns!

      Abraham Lincoln aprendeu essa lição dolorosamente. Quando jovem, criticava abertamente seus oponentes. Quase foi morto em duelo por isso. Depois, adotou o lema: "Não os julgue; são exatamente o que seríamos sob circunstâncias similares."

      💝 Princípio 2: Faça Elogios Honestos e Sinceros

      William James, pai da psicologia americana, declarou: "O princípio mais profundo da natureza humana é o DESEJO DE SER APRECIADO."

      Não é desejo. É uma FOME - uma necessidade ardente, persistente, quase irracional de ser importante.

      Como as pessoas buscam importância:
      • John D. Rockefeller: doando milhões
      • Gangsters: sendo temidos
      • Algumas pessoas: até ficando doentes para ter atenção

      Charles Schwab era pago $1 milhão por ano (em 1920!) não por conhecimento técnico, mas por sua habilidade com pessoas. Seu segredo? "Sou sincero em minha aprovação e generoso em meus elogios. Nada mata mais as ambições de uma pessoa do que críticas de superiores."

      CUIDADO: Há uma diferença crucial entre apreciação e bajulação:
      • Apreciação: sincera, vem do coração, altruísta
      • Bajulação: falsa, vem dos dentes para fora, egoísta
      • Bajulação é tão falsa que geralmente fracassa

      🎣 Princípio 3: Desperte um Forte Desejo na Outra Pessoa

      Harry Overstreet, grande educador, disse: "A ação surge do que fundamentalmente desejamos."

      O único modo de influenciar alguém é falar sobre o que ELA quer e mostrar como conseguir.

      História Brilhante: Uma criança de 3 anos não queria ir ao jardim de infância. Os pais tentaram de tudo. Então perguntaram: "O que você gostaria de fazer na escola?" Ela disse: "Pintar com os dedos!" No dia seguinte, ela acordou cedo, ansiosa para ir.

      Henry Ford resumiu: "Se existe um segredo de sucesso, é a habilidade de entender o ponto de vista do outro e ver as coisas pelo ângulo dele tanto quanto pelo seu."

      Exemplo Prático em Vendas:
      ❌ ERRADO: "Quero vender isso porque preciso de comissão"
      CERTO: "Isso vai economizar seu tempo e aumentar seus lucros"

      Parte 2: Seis Maneiras de Fazer as Pessoas Gostarem de Você

      1. Interesse-se Sinceramente pelas Outras Pessoas

      Você faz mais amigos em DOIS MESES se interessando pelos outros do que em DOIS ANOS tentando fazer os outros se interessarem por você.

      Alfred Adler, psicólogo vienense: "O indivíduo que não se interessa pelos seus semelhantes é quem tem as maiores dificuldades na vida."

      Um estudo sobre ligações telefônicas revelou: a palavra mais usada é "EU" - 3.990 vezes em 500 conversas!

      😄 2. Sorria

      A expressão no seu rosto é mais importante que as roupas que veste.

      William James descobriu: "A ação parece seguir o sentimento, mas na verdade ação e sentimento caminham juntos. Assim, o caminho voluntário para a felicidade, se perdemos a alegria, é sentar alegremente e agir e falar como se a alegria já estivesse lá."

      Um provérbio chinês: "O homem sem sorriso no rosto não deve abrir uma loja."

      📛 3. O Nome de Uma Pessoa é o Som Mais Doce em Qualquer Idioma

      Jim Farley podia chamar 50.000 pessoas pelo primeiro nome. Foi isso que ajudou Franklin Roosevelt a se tornar presidente.

      Andrew Carnegie, o magnata do aço, orgulhava-se de saber o nome de cada um de seus funcionários. Ele dizia: "A informação mais importante é o nome da pessoa."

      Napoleon III, Imperador da França, se gabava de que, apesar de seus afazeres, conseguia lembrar o nome de cada pessoa que conhecia.

      👂 4. Seja um Bom Ouvinte. Incentive os Outros a Falarem Sobre Si Mesmos

      Uma vez, Carnegie foi a um jantar e conheceu um botânico. Ficou fascinado ouvindo sobre plantas exóticas, experimentos, jardins internos. No final, o botânico disse ao anfitrião que Carnegie era "o conversador mais interessante" que já conhecera.

      Carnegie quase não havia falado nada!

      Segredo dos negociadores bem-sucedidos: "Deixe a outra pessoa falar. Ela sabe mais sobre seus negócios e problemas do que você."

      💬 5. Fale Sobre os Interesses da Outra Pessoa

      Theodore Roosevelt impressionava visitantes porque, antes de recebê-los, estudava os assuntos de interesse deles.

      Yale descobriu: quando falamos sobre o que interessa aos outros, eles nos acham fascinantes.

      6. Faça a Outra Pessoa Sentir-se Importante - e Faça Isso Sinceramente

      A regra de ouro: "Faça aos outros o que gostaria que fizessem a você."

      Frases mágicas que funcionam:
      • "Desculpe incomodá-lo..."
      • "Você seria tão gentil de..."
      • "Você poderia, por favor..."
      • "Obrigado"

      Aplicação Prática

      Cada princípio é uma ferramenta. Como qualquer ferramenta, funciona apenas quando usada. Conhecimento sem ação é inútil.

      Carnegie sugere: escolha UM princípio por semana. Pratique-o conscientemente. No fim de 6 semanas, você terá transformado sua vida social.

      Lembre-se: "Quando lidamos com pessoas, não lidamos com criaturas lógicas, mas com criaturas emotivas, cheias de preconceitos e movidas por orgulho e vaidade."`,
      questions: [
        {
          id: "q1",
          question: "Qual é o primeiro princípio fundamental que Dale Carnegie apresenta para lidar com pessoas?",
          options: ["Sempre seja completamente honesto", "Não critique, não condene, não se queixe", "Sorria sempre que encontrar alguém", "Ouça mais do que fale"],
          correct: 1
        },
        {
          id: "q2",
          question: "Segundo Carnegie, qual é o som mais doce para qualquer pessoa em qualquer idioma?",
          options: ["Palavras de elogio", "Música suave", "Seu próprio nome", "Palavras de gratidão"],
          correct: 2
        },
        {
          id: "q3",
          question: "Como fazer mais amigos de acordo com o princípio apresentado no livro?",
          options: ["Sendo uma pessoa muito interessante", "Se interessando genuinamente pelos outros", "Tendo muito dinheiro e status", "Sendo popular e carismático"],
          correct: 1
        }
      ]
    },
    "rapido-e-devagar": {
      title: "Rápido e Devagar",
      author: "Daniel Kahneman",
      reward: 48,
      category: "Psicologia Comportamental",
      readingLevel: "Avançado",
      difficulty: "Difícil",
      estimatedTime: "50 min",
      chapters: 14,
      pages: 512,
      publishYear: 2011,
      synopsis: "Entenda como sua mente toma decisões, os vieses cognitivos que afetam seu julgamento e como pensar de forma mais racional.",
      content: `Rápido e Devagar: Duas Formas de Pensar - Daniel Kahneman

Capítulo 1: Os Dois Sistemas

Seu cérebro tem dois sistemas de pensamento que operam de formas completamente diferentes. Compreender como eles funcionam é a chave para tomar melhores decisões e evitar armadilhas mentais.

SISTEMA 1: O Pensamento Rápido

É automático, intuitivo e emocional. Opera sem esforço consciente:
• Detecta que um objeto está mais distante que outro
• Completa a frase "pão com..."
• Detecta hostilidade em uma voz
• Resolve 2 + 2
• Lê palavras em um outdoor
• Dirige um carro em uma estrada vazia

SISTEMA 2: O Pensamento Devagar

É deliberado, lógico e consciente. Requer atenção e esforço:
• Procura uma pessoa específica em uma multidão
• Calcula 17 x 24
• Compara dois produtos pelo custo-benefício
• Preenche formulários de impostos
• Verifica a validade de um argumento complexo

O Problema da Preguiça Mental

Nosso cérebro é preguiçoso por natureza. O Sistema 2 consome muita energia, então preferimos usar o Sistema 1 sempre que possível. Isso leva a erros previsíveis.

Exemplo clássico:
Um taco e uma bola custam $1,10 no total.
O taco custa $1,00 a mais que a bola.
Quanto custa a bola?

Resposta intuitiva (Sistema 1): 10 centavos
Resposta correta (Sistema 2): 5 centavos

Mais de 50% dos estudantes de Harvard erraram essa questão!

Capítulo 2: Vieses e Heurísticas

Heurísticas são atalhos mentais que nosso cérebro usa para tomar decisões rápidas. São úteis, mas podem nos enganar.

1. Heurística da Disponibilidade

Julgamos a probabilidade de eventos pela facilidade com que exemplos vêm à mente.

Exemplo: Depois de ver notícias sobre um acidente aéreo, superestimamos o risco de voar, mesmo que dirigir seja estatisticamente mais perigoso.

2. Heurística da Representatividade

Julgamos probabilidades por semelhança com estereótipos mentais.

Linda tem 31 anos, solteira, franca e muito inteligente. Formou-se em filosofia. Como estudante, preocupava-se com discriminação e justiça social.

O que é mais provável?
A) Linda é caixa de banco
B) Linda é caixa de banco e ativa no movimento feminista

85% escolhem B, mas é matematicamente impossível B ser mais provável que A!

3. Ancoragem

Somos influenciados por números arbitrários apresentados antes de uma decisão.

Experimento: Pessoas que viram a pergunta "Gandhi tinha mais ou menos de 144 anos quando morreu?" estimaram sua idade de morte em 67 anos. Quem viu "Gandhi tinha mais ou menos de 35 anos?" estimou 50 anos.

Capítulo 3: Excesso de Confiança

O Viés do Conhecimento Retrospectivo

"Eu sabia que isso ia acontecer!" - Depois que algo ocorre, achamos que era óbvio e previsível.

Especialistas financeiros que previram a crise de 2008... depois que ela aconteceu. Antes? Quase ninguém viu chegando.

A Ilusão de Compreensão

Criamos histórias coerentes sobre o passado, o que nos faz pensar que entendemos o mundo melhor do que realmente entendemos.

Google teve sucesso porque seus fundadores eram gênios? Ou tiveram sorte? Provavelmente ambos, mas preferimos a história simples do gênio.

Capítulo 4: Escolhas e Felicidade

A Diferença Entre Eu Experiencial e Eu Lembrança

Eu Experiencial: Vive o momento presente
Eu Lembrança: Conta histórias sobre o passado

Experimento da mão na água gelada:
• Opção A: 60 segundos em água muito gelada
• Opção B: 60 segundos em água muito gelada + 30 segundos em água um pouco menos gelada

80% preferem repetir a Opção B, mesmo envolvendo MAIS sofrimento total!

A Regra do Pico-Fim

Lembramos de experiências pelo seu pico (melhor ou pior momento) e como terminaram, não pela média ou duração.

Um estudo com colonoscopias mostrou: pacientes que tiveram um final menos doloroso (mesmo que o procedimento fosse mais longo) lembravam da experiência como menos ruim.

Capítulo 5: Como Melhorar Suas Decisões

1. Reconheça Quando Está em Território Perigoso

• Decisões importantes quando está cansado
• Pressão de tempo extrema
• Emoções fortes (raiva, paixão, medo)
• Problemas complexos que parecem simples

2. Desacelere e Engage o Sistema 2

• Escreva prós e contras
• Consulte dados, não apenas intuição
• Procure evidências contrárias
• Peça opiniões de pessoas não envolvidas

3. Use Checklists e Protocolos

Médicos que usam checklists simples reduzem erros em 35%. Por que funciona? Força o Sistema 2 a verificar o trabalho do Sistema 1.

4. Pense em Probabilidades, Não em Histórias

Em vez de "vai dar certo porque...", pergunte "qual a chance real disso dar certo?"

Conclusão: A Arte de Pensar Claramente

Não podemos eliminar nossos vieses, mas podemos reconhecê-los e compensar. O truque não é confiar menos na intuição, mas saber QUANDO confiar nela.

Confie na intuição quando:
• Você tem muita experiência na área
• O feedback é rápido e claro
• O ambiente é estável e previsível

Desconfie da intuição quando:
• A situação é nova ou complexa
• As apostas são altas
• Você está emocionalmente envolvido
• Não há feedback claro

Lembre-se: "Nossa mente complacente é uma máquina de tirar conclusões precipitadas."`,
      questions: [
        {
          id: "q1",
          question: "Quais são os dois sistemas de pensamento descritos por Kahneman?",
          options: ["Consciente e Inconsciente", "Rápido/Intuitivo e Devagar/Deliberado", "Emocional e Racional", "Automático e Manual"],
          correct: 1
        },
        {
          id: "q2",
          question: "O que é a heurística da disponibilidade segundo o livro?",
          options: ["Julgar probabilidades pela facilidade de lembrar exemplos", "Estar sempre disponível para ajudar", "Ter informações disponíveis rapidamente", "Disponibilizar recursos mentais"],
          correct: 0
        },
        {
          id: "q3",
          question: "Qual é a regra do pico-fim mencionada no livro?",
          options: ["Sempre terminar no ponto mais alto", "Começar devagar e terminar rápido", "Lembramos experiências pelo pico e como terminaram", "O fim justifica os meios"],
          correct: 2
        }
      ]
    },
    // Removed duplicate pai-rico-pai-pobre entry - see new one below
    "pai-rico-pai-pobre-old": {
      title: "Pai Rico, Pai Pobre (OLD)",
      author: "Robert Kiyosaki", 
      reward: 40,
      category: "Finanças Pessoais",
      readingLevel: "Intermediário",
      difficulty: "Médio",
      estimatedTime: "35 min",
      chapters: 10,
      pages: 336,
      publishYear: 1997,
      synopsis: "Aprenda lições fundamentais sobre educação financeira, investimentos e como fazer o dinheiro trabalhar para você.",
      content: `Pai Rico, Pai Pobre - Robert Kiyosaki

Capítulo 1: A História de Dois Pais

Robert Kiyosaki teve dois pais: um biológico (Pai Pobre) e o pai de seu melhor amigo (Pai Rico). Ambos eram homens inteligentes e trabalhadores, mas tinham visões opostas sobre dinheiro.

PAI POBRE (PhD, Funcionário Público):
"Estude muito para conseguir um bom emprego"
"Nossa casa é nosso maior investimento"
"Não posso comprar isso"
"Dinheiro é a raiz de todo mal"
"Jogue seguro, não arrisque"

PAI RICO (8ª série, Empresário):
"Estude muito para comprar boas empresas"
"Nossa casa é um passivo, não um ativo"
"Como posso comprar isso?"
"A falta de dinheiro é a raiz de todo mal"
"Aprenda a gerenciar riscos"

Aos 9 anos, Robert decidiu ouvir o Pai Rico sobre dinheiro.

Capítulo 2: A Primeira Lição - Os Ricos Não Trabalham Por Dinheiro

Quando Robert pediu ao Pai Rico para ensiná-lo a ficar rico, recebeu uma oferta: trabalhar de graça em sua loja.

Depois de semanas trabalhando sem receber, Robert ficou furioso. Foi aí que aprendeu a primeira lição:

"Os pobres e a classe média trabalham por dinheiro. Os ricos fazem o dinheiro trabalhar para eles."

A Armadilha do Medo e da Ganância

MEDO: Medo de não pagar as contas nos faz aceitar qualquer emprego
GANÂNCIA: Quando ganhamos mais, queremos mais coisas
RESULTADO: Corrida dos Ratos - quanto mais ganhamos, mais gastamos

Pai Rico explicou: "A maioria das pessoas tem um preço porque tem medo e ganância. Primeiro o medo de ficar sem dinheiro as motiva a trabalhar duro, depois, quando recebem o salário, a ganância as faz pensar em todas as coisas maravilhosas que o dinheiro pode comprar."

Capítulo 3: Por Que Ensinar Alfabetização Financeira?

A Diferença Fundamental: ATIVOS vs PASSIVOS

ATIVO: Coloca dinheiro no seu bolso
PASSIVO: Tira dinheiro do seu bolso

Simples assim! Mas a maioria confunde...

Exemplos de ATIVOS REAIS:
• Imóveis que geram aluguel
• Ações que pagam dividendos
• Negócios que não exigem sua presença
• Royalties de propriedade intelectual
• Títulos e fundos que geram renda

Exemplos de PASSIVOS:
• Hipoteca da casa própria
• Financiamento do carro
• Cartões de crédito
• Empréstimos estudantis

Por Que Sua Casa NÃO é um Ativo?

1. Você paga impostos sobre ela
2. Você paga manutenção constante
3. Pode desvalorizar
4. Não gera renda (você mora nela)
5. O dinheiro fica preso (iliquido)

O Padrão de Fluxo de Caixa

POBRE: Salário → Despesas
CLASSE MÉDIA: Salário → Passivos → Despesas
RICO: Ativos → Renda → Mais Ativos

Capítulo 4: Cuide de Seus Próprios Negócios

"Os ricos se concentram em suas colunas de ativos enquanto todos os outros se concentram em suas demonstrações de renda."

A diferença entre Profissão e Negócio:

PROFISSÃO: O que você faz para ganhar dinheiro
NEGÓCIO: O que você faz para construir riqueza

McDonald's: Hamburgueria ou Imobiliária?

Ray Kroc perguntou a estudantes: "Qual é meu negócio?"
"Hambúrgueres", responderam.
"Não. Meu negócio é imobiliário."

McDonald's possui os terrenos mais valiosos do mundo!

Construindo Sua Coluna de Ativos

Comece pequeno, mas comece:
1. Compre ativos que você entende
2. Reinvista os lucros para comprar mais ativos
3. Use luxos como recompensa DEPOIS que os ativos pagarem por eles

Regra de Ouro: "Compre ativos primeiro, luxos por último"

Capítulo 5: Os Ricos Inventam Dinheiro

Inteligência Financeira = Criatividade + Coragem

Exemplo Real de Kiyosaki:
• Comprou uma casa por $20.000 (pagou $2.000 de entrada)
• Vendeu por $60.000 em 4 meses
• Lucro: $40.000
• Tempo investido: 5 horas
• Ganho por hora: $8.000

As Duas Opções na Vida:
1. Jogar seguro e se contentar com pouco
2. Desenvolver inteligência financeira e criar oportunidades

"O dinheiro não é real. É apenas uma ideia. Se você acha que dinheiro é escasso, ele será. Se você acredita em abundância, criará oportunidades."

Capítulo 6: Trabalhe Para Aprender, Não Por Dinheiro

Habilidades Essenciais que a Escola Não Ensina:

1. VENDAS E MARKETING
"A habilidade de vender é a base de todo sucesso pessoal"

2. COMUNICAÇÃO
"Quanto mais pessoas você consegue alcançar, mais rico pode ficar"

3. LIDERANÇA
"Liderar pessoas é multiplicar seus resultados"

4. CONTABILIDADE
"Não precisa ser contador, mas precisa entender números"

5. INVESTIMENTO
"Faça o dinheiro trabalhar duro para você"

6. DIREITO
"Conheça as regras do jogo para jogar melhor"

Capítulo 7: Superando Obstáculos

Os 5 Maiores Medos que Impedem o Sucesso Financeiro:

1. MEDO DE PERDER DINHEIRO
Solução: Comece cedo, comece pequeno. Todos os ricos já perderam dinheiro.

2. MEDO DE FRACASSAR  
Solução: Fracasso é parte do sucesso. Aprenda e siga em frente.

3. PREGUIÇA
Solução: Ganância positiva - querer mais da vida é motivador.

4. MAUS HÁBITOS
Solução: Pague-se primeiro. Antes de pagar qualquer conta, separe para investir.

5. ARROGÂNCIA
Solução: O que você não sabe te prejudica. Continue aprendendo.

Capítulo 8: Começando

10 Passos Para Despertar Seu Gênio Financeiro:

1. Encontre uma razão maior que a realidade - um sonho poderoso
2. Escolha diariamente - cada gasto é uma escolha entre ser rico ou pobre
3. Escolha amigos cuidadosamente - você é a média das 5 pessoas com quem mais convive
4. Domine uma fórmula e depois aprenda outra - aprendizado contínuo
5. Pague-se primeiro - disciplina é o fator #1
6. Pague bem seus assessores - bons conselhos valem ouro
7. Seja um "doador indiano" - dê esperando receber
8. Use ativos para comprar luxos - não use crédito
9. Tenha heróis - modele pessoas bem-sucedidas
10. Ensine e receberá - quanto mais ensina, mais aprende

A Mensagem Final

"Há um rico dentro de você esperando para sair. Mas primeiro você precisa mudar sua mentalidade. Pare de pensar como pobre ou classe média. Questione crenças antigas sobre dinheiro. Eduque-se financeiramente. E mais importante: TOME AÇÃO."

"Não é quanto dinheiro você ganha, mas quanto dinheiro você mantém, quão duro ele trabalha para você, e para quantas gerações você o mantém."`,
      questions: [
        {
          id: "q1",
          question: "Qual é a diferença fundamental entre ativos e passivos segundo o Pai Rico?",
          options: ["Ativos são caros, passivos são baratos", "Ativos colocam dinheiro no bolso, passivos tiram", "Ativos são imóveis, passivos são dívidas", "Ativos são investimentos, passivos são gastos"],
          correct: 1
        },
        {
          id: "q2",
          question: "Por que o Pai Rico considera que a casa própria NÃO é um ativo?",
          options: ["Porque é muito cara", "Porque não gera renda e tem custos constantes", "Porque pode ser vendida", "Porque é um bem imobiliário"],
          correct: 1
        },
        {
          id: "q3",
          question: "Qual é a principal mensagem sobre trabalho e aprendizado no livro?",
          options: ["Trabalhe pelo maior salário possível", "Trabalhe para aprender habilidades, não apenas por dinheiro", "Trabalhe até se aposentar", "Trabalhe apenas no que gosta"],
          correct: 1
        }
      ]
    },
    "a-arte-da-guerra": {
      title: "A Arte da Guerra",
      author: "Sun Tzu",
      reward: 35,
      category: "Estratégia",
      readingLevel: "Básico",
      difficulty: "Fácil",
      estimatedTime: "30 min",
      chapters: 13,
      pages: 160,
      publishYear: -500,
      synopsis: "Estratégias milenares de liderança e tática que podem ser aplicadas nos negócios e na vida pessoal.",
      content: `A Arte da Guerra - Sun Tzu

Capítulo 1: Planejamento e Avaliação

"A guerra é de vital importância para o Estado; é o domínio da vida ou da morte, o caminho para a sobrevivência ou a ruína."

Os Cinco Fatores Fundamentais

Antes de qualquer conflito (nos negócios ou na vida), avalie:

1. O CAMINHO (Propósito)
Harmonia entre líder e seguidores. Quando há propósito compartilhado, as pessoas seguem sem quest
ionar.

Aplicação Moderna: Cultura empresarial forte, visão clara, valores compartilhados.

2. O CÉU (Timing)
Condições externas, momento certo, tendências e ciclos.

Aplicação Moderna: Condições de mercado, tendências econômicas, momento de lançamento.

3. A TERRA (Terreno)
O ambiente onde você opera, vantagens e desvantagens do território.

Aplicação Moderna: Mercado, nicho, posição competitiva, recursos disponíveis.

4. O COMANDO (Liderança)
Sabedoria, credibilidade, benev olência, coragem e disciplina do líder.

Aplicação Moderna: Competência gerencial, inteligência emocional, capacidade de decisão.

5. A DISCIPLINA (Método)
Organização, processos, cadeia de comando, logística.

Aplicação Moderna: Processos eficientes, hierarquia clara, sistemas de controle.

"Toda guerra é baseada em engano."

Capítulo 2: A Conduta da Guerra

"O Supremo Mestre é aquele que vence sem lutar."

A Economia do Conflito

Guerra prolongada nunca beneficiou nenhum país. No mundo dos negócios:
• Guerras de preços destroem margens
• Batalhas legais drenam recursos
• Conflitos internos reduzem produtividade

Regra de Ouro: "Vitória rápida é o objetivo principal."

Capture Recursos, Não os Destrua

"Um general hábil alimenta seu exército com os suprimentos do inimigo."

Aplicação Moderna:
• Contrate talentos da concorrência
• Adquira empresas complementares
• Aprenda com os erros dos outros

Capítulo 3: Estratégia de Ataque

A Hierarquia da Excelência Estratégica:

1º MELHOR: Frustrar os planos do inimigo
2º: Romper suas alianças
3º: Atacar seu exército
4º PIOR: Sitiar cidades fortificadas

Traduzindo para Negócios:
1º: Inovação disruptiva
2º: Quebrar parcerias da concorrência
3º: Competição direta
4º: Guerra de preços

"Conheça o inimigo e conheça a si mesmo; em cem batalhas, você nunca estará em perigo."

Autoconhecimento + Conhecimento do Mercado = Vitória

Capítulo 4: Disposições Táticas

"A invencibilidade está na defesa; a possibilidade de vitória, no ataque."

Primeiro Torne-se Invencível

Antes de expandir:
• Solidifique sua base
• Elimine pontos fracos
• Construa reservas
• Domine seu nicho atual

"O guerreiro vitorioso vence primeiro e depois vai à guerra; o guerreiro derrotado vai à guerra e depois procura vencer."

Planejar > Executar > Vencer
Não: Executar > Improvisar > Torcer

Capítulo 5: Energia e Momentum

"A qualidade das decisões é como o ataque bem calculado de um falcão que o capacita a atacar e destruir sua vítima."

Timing é Tudo

Não basta ter recursos; é preciso usá-los no momento certo.
• Lançar produto quando o mercado está pronto
• Expandir quando há capital e demanda
• Recuar quando os custos superam benefícios

Força Direta vs. Força Indireta

FORÇA DIRETA: Ataque frontal, previsível
FORÇA INDIRETA: Flanquear, surpreender, inovar

"Use o normal para engajar, use o extraordinário para vencer."

Capítulo 6: Pontos Fracos e Fortes

"Aparecer onde não são esperados."

A Estratégia da Água

"A água não tem forma constante. Na guerra não há condições constantes."

Seja flexível e adaptável:
• Forte onde o concorrente é fraco
• Rápido onde ele é lento
• Inovador onde ele é tradicional

Concentração de Forças

"Concentre suas forças onde o inimigo divide as dele."

Foco é poder. Melhor dominar um nicho que ser mediano em vários.

Capítulo 7: Manobras

"Que o impacto seja como uma pedra atingindo um ovo: use o sólido para atacar o oco."

Transforme Desvantagens em Vantagens

Obstáculos são oportunidades:
• Pequeno = ágil
• Novo = sem vícios
• Recursos limitados = criatividade forçada

A Importância da Comunicação

"Gongos e tambores, bandeiras e estandartes são meios pelos quais as orelhas e olhos dos homens são focados no mesmo ponto."

Comunicação clara e consistente alinha toda a organização.

Capítulo 8: Variações Táticas

Os Cinco Erros Fatais de um Líder:

1. IMPRUDÊNCIA - leva à destruição
2. COVARDIA - leva à captura
3. TEMPERAMENTO PRECIPITADO - pode ser provocado
4. SENSIBILIDADE EXCESSIVA à HONRA - vulnerável a insultos
5. PREOCUPAÇÃO EXCESSIVA COM OS HOMENS - hesitação

"Há estradas que não devem ser seguidas, exércitos que não devem ser atacados, cidades que não devem ser sitiadas."

Saber quando NÃO agir é tão importante quanto saber quando agir.

Capítulo 9: O Exército em Marcha

Lendo os Sinais

Observe indicadores indiretos:
• Alta rotatividade = problemas internos
• Mudanças repentinas = desespero ou oportunidade
• Silêncio = planejamento de algo grande

Trate Bem Sua Equipe

"Trate seus soldados como filhos, e eles o seguirão aos vales mais profundos."

Mas equilibre com disciplina: "Se você é indulgente mas incapaz de fazer sua autoridade sentida, bondoso mas incapaz de fazer cumprir suas ordens, então seus soldados serão como crianças mimadas."

Capítulo 10: Terreno

Seis Tipos de Situações Competitivas:

1. ACESSÍVEL - mercado aberto, chegue primeiro
2. ENREDADO - difícil sair depois de entrar
3. TEMPORIZADOR - não beneficia ninguém avançar
4. ESTREITO - vantagem do primeiro movimento
5. PRECIPITADO - alto risco, alta recompensa
6. DISTANTE - logística é crucial

"Conheça o terreno como a palma da sua mão."

Capítulo 11: Os Nove Terrenos

"Em terreno dispersivo, não lute. Em terreno fácil, não pare. Em terreno contestável, não ataque."

Adapte sua estratégia ao contexto:
• Mercado saturado: diferencie
• Oceano azul: mova rápido
• Alta competição: forme alianças
• Crise: inove ou morra

Capítulo 12: Ataque pelo Fogo

Disrupção Como Arma

O "fogo" moderno:
• Inovação tecnológica
• Mudança de modelo de negócio
• Marketing viral
• Quebra de paradigmas

"Não mova sem ver vantagem; não use suas tropas sem ter um objetivo claro; não lute sem estar em perigo."

Capítulo 13: O Uso de Espiões

Informação é Poder

"O que permite ao soberano inteligente e ao bom general atacar, conquistar e alcançar coisas além do alcance dos homens comuns é o conhecimento prévio."

Inteligência Competitiva Moderna:
• Análise de mercado
• Feedback de clientes
• Monitoramento de tendências
• Networking estratégico
• Big data e analytics

Conclusão: A Sabedoria Atemporal

"A excelência suprema consiste em quebrar a resistência do inimigo sem lutar."

Os princípios de Sun Tzu transcendem a guerra:
• Preparação supera força bruta
• Estratégia supera recursos
• Conhecimento supera adivinhação
• Flexibilidade supera rigidez
• Paciência supera pressa

"Vitória é reservada para aqueles que estão dispostos a pagar seu preço."`,
      questions: [
        {
          id: "q1",
          question: "Segundo Sun Tzu, qual é a suprema excelência na guerra?",
          options: ["Vencer todas as batalhas", "Ter o maior exército", "Vencer sem lutar", "Conquistar territórios"],
          correct: 2
        },
        {
          id: "q2",
          question: "Quais são os cinco fatores fundamentais para avaliar antes de qualquer conflito?",
          options: ["Força, velocidade, armas, soldados, território", "Caminho, céu, terra, comando, disciplina", "Ataque, defesa, recuo, cerco, emboscada", "Planejamento, execução, controle, revisão, vitória"],
          correct: 1
        },
        {
          id: "q3",
          question: "O que Sun Tzu diz sobre conhecer a si mesmo e ao inimigo?",
          options: ["Conhecer apenas a si mesmo é suficiente", "Em cem batalhas, nunca estará em perigo", "O inimigo sempre terá vantagem", "O conhecimento não é importante na guerra"],
          correct: 1
        }
      ]
    },
    "o-monge-e-o-executivo": {
      title: "O Monge e o Executivo",
      author: "James C. Hunter",
      reward: 43,
      category: "Liderança",
      readingLevel: "Básico",
      difficulty: "Fácil",
      estimatedTime: "35 min",
      chapters: 7,
      pages: 144,
      publishYear: 1998,
      synopsis: "Uma história transformadora sobre liderança servidora e como desenvolver relações saudáveis no trabalho.",
      content: `O Monge e o Executivo - James C. Hunter

Prólogo: A Jornada Começa

John Daily tinha tudo: sucesso profissional, família, dinheiro. Mas algo estava errado. Sua esposa ameaçava divórcio, seus filhos mal falavam com ele, e sua equipe no trabalho o respeitava por medo, não por admiração.

Quando sua empresa o mandou para um retiro de liderança em um mosteiro, John não imaginava que encontraria Simeão - um ex-executivo lendário que largou tudo para se tornar monge.

Capítulo 1: As Definições

"Liderança: A habilidade de influenciar pessoas para trabalharem entusiasticamente visando atingir objetivos comuns, inspirando confiança por meio da força do caráter."

Simeão fez uma pergunta que mudou tudo:

"Você é um gerente ou um líder?"

GERENTE usa poder posicional: "Faça porque eu mando"
LÍDER usa influência pessoal: "Faça porque confiam em mim"

PODER vs AUTORIDADE

PODER: Capacidade de forçar alguém a fazer sua vontade devido à posição
• Temporário (dura enquanto você tem o cargo)
• Cria resistência e ressentimento
• Diminui com o uso

 AUTORIDADE: Habilidade de levar pessoas a fazerem sua vontade de boa vontade
• Permanente (construída em relacionamentos)
• Cria cooperação e comprometimento
• Aumenta com o uso

"Vocês têm filhos?" perguntou Simeão. "Quando seu filho de dois anos corre para a rua, você usa poder - o agarra e o tira de lá. Mas quando ele tem 16 anos, se você só construiu poder e não autoridade, ele não vai ouvi-lo."

Capítulo 2: O Paradigma Antigo

A Pirâmide Tradicional:

       CEO
      /   \
   VPs     VPs
  /  \    /  \
Gerentes Gerentes
    |       |
Funcionários
    |
CLIENTES

"Notem onde estão os clientes", disse Simeão. "No fundo! E quem está no topo? O CEO. Isso faz sentido?"

O Paradigma Velho:
• Líder é servido pelos outros
• Comando e controle
• Medo como motivador
• Resultados a qualquer custo
• Pessoas são recursos

Capítulo 3: O Modelo

"O maior entre vocês será aquele que serve."

A Pirâmide Invertida da Liderança Servidora:

   CLIENTES
      |
Funcionários
    |     |
Gerentes Gerentes
  \  /    \  /
   VPs     VPs
      \   /
       CEO

"O líder existe para servir a equipe, não o contrário."

O Papel do Líder Servidor:
1. Identificar e satisfazer necessidades legítimas (não vontades!)
2. Remover obstáculos
3. Desenvolver pessoas
4. Construir comunidade
5. Ouvir autenticamente

Capítulo 4: O Verbo

"Amor não é como você se sente. É o que você faz."

Simeão chocou todos: "Vocês devem AMAR seus funcionários."

Mas ele explicou:

AMOR AGAPE (não romântico): O ato de dar aos outros o que eles precisam, não o que merecem.

As Qualidades do Amor/Liderança (1 Coríntios 13):

PACIÊNCIA: Mostrar autocontrole
• Não perder a calma com erros
• Dar tempo para aprendizado
• Repetir explicações sem irritar-se

BONDADE: Dar atenção, apreciação e incentivo
• Notar pequenos progressos
• Elogiar publicamente
• Agradecer sinceramente

HUMILDADE: Ser autêntico, sem pret ensão ou arrogância
• Admitir erros
• Pedir desculpas
• Não ter todas as respostas

RESPEITO: Tratar todos como importantes
• Lembrar nomes
• Ouvir sem interromper
• Valorizar opiniões diferentes

ABNEGAÇÃO: Satisfazer necessidades dos outros
• Abrir mão de privilégios
• Compartilhar créditos
• Assumir culpas

PERDÃO: Desistir de ressentimento
• Não guardar rancor
• Dar segundas chances
• Focar no futuro, não no passado

HONESTIDADE: Ser livre de engano
• Feedback direto mas respeitoso
• Transparência nas decisões
• Cumprir promessas

COMPROMISSO: Ater-se às escolhas
• Persistência nos objetivos
• Consistência nas ações
• Confiabilidade absoluta

Capítulo 5: O Ambiente

"Você não pode mudar ninguém. Mas pode criar um ambiente onde as pessoas escolham mudar."

O Jardim da Liderança:

SEMENTE: Potencial humano (todos têm)
JARDINEIRO: Líder
AMBIENTE: Cultura organizacional

"Um jardineiro não faz a planta crescer. Ele cria as condições ideais para o crescimento natural."

Criando o Ambiente Certo:

1. SEGURANÇA PSICOLÓGICA
• Erros são oportunidades de aprendizado
• Ideias são bem-vindas
• Vulnerabilidade é força

2. PROPÓSITO CLARO
• Todos sabem o "porquê"
• Conexão com algo maior
• Significado no trabalho

3. CRESCIMENTO CONTÍNUO
• Desafios apropriados
• Aprendizado constante
• Celebração de progressos

Capítulo 6: A Escolha

"Liderança não é sobre personalidade, posses ou carisma. É sobre quem você é como pessoa."

Os Quatro Estágios do Desenvolvimento:

1. INCONSCIENTE INCOMPETENTE
Não sei que não sei

2. CONSCIENTE INCOMPETENTE
Sei que não sei (desconfortável mas necessário)

3. CONSCIENTE COMPETENTE
Sei que sei (requer esforço consciente)

4. INCONSCIENTE COMPETENTE
Faço naturalmente (hábito formado)

"Mudar é simples, mas não é fácil."

A Fórmula da Mudança:

INTENÇÃO + AÇÃO = MUDANÇA

• Querer mudar não é suficiente
• Saber o que fazer não é suficiente
• É preciso FAZER consistentemente

Capítulo 7: A Recompensa

John voltou transformado. Mas a mudança real veio com o tempo:

NA FAMÍLIA:
• Começou a ouvir a esposa sem julgar
• Passou tempo de qualidade com os filhos
• Pediu desculpas pelos anos de ausência
• Resultado: Família unida e amorosa

NO TRABALHO:
• Parou de gritar e ameaçar
• Começou a servir sua equipe
• Delegou com confiança
• Resultado: Produtividade recorde e baixa rotatividade

EM SI MESMO:
• Encontrou propósito além do sucesso
• Desenvolveu paz interior
• Tornou-se exemplo, não chefe
• Resultado: Realização verdadeira

As Lições Finais de Simeão:

1. "Liderança é sobre influência, nada mais, nada menos."

2. "Para liderar, você deve servir."

3. "Servir é identificar e atender necessidades legítimas."

4. "Você pode escolher amar (verbo) mesmo quando não sente amor (substantivo)."

5. "Autoridade se constrói com serviço e sacrifício."

6. "Liderança começa com vontade."

"O que você faria diferente se soubesse que todos que trabalham para você fossem ganhar na loteria no próximo mês e não precisassem mais do emprego? Como você os trataria para que ESCOLHESSEM ficar?"

Epílogo: O Legado

"No final, as pessoas não lembrarão o que você disse ou fez. Elas lembrarão como você as fez sentir."

O verdadeiro teste da liderança:

Suas pessoas o seguiriam se você não tivesse poder sobre elas?

Se a resposta é sim, você é um líder.
Se é não, você é apenas um chefe.

"A grandeza não está em ser servido, mas em servir."`,
      questions: [
        {
          id: "q1",
          question: "Qual é a diferença fundamental entre poder e autoridade segundo o livro?",
          options: ["Poder é permanente, autoridade é temporária", "Poder força pela posição, autoridade influencia pela confiança", "Não há diferença real", "Autoridade é para chefes, poder é para líderes"],
          correct: 1
        },
        {
          id: "q2",
          question: "O que significa liderança servidora na prática?",
          options: ["Fazer tudo que os funcionários querem", "Identificar e atender necessidades legítimas da equipe", "Servir café para os funcionários", "Nunca dar ordens"],
          correct: 1
        },
        {
          id: "q3",
          question: "Qual é a definição de amor ágape no contexto de liderança?",
          options: ["Ter sentimentos positivos pela equipe", "Ser amigo de todos", "Dar aos outros o que precisam, não o que merecem", "Evitar conflitos sempre"],
          correct: 2
        }
      ]
    },
    "os-7-habitos": {
      title: "Os 7 Hábitos das Pessoas Altamente Eficazes",
      author: "Stephen Covey",
      reward: 47,
      category: "Desenvolvimento Pessoal",
      readingLevel: "Intermediário",
      difficulty: "Médio",
      estimatedTime: "45 min",
      chapters: 10,
      pages: 432,
      publishYear: 1989,
      synopsis: "Desenvolva hábitos fundamentais para alcançar eficácia pessoal e profissional de forma sustentável.",
      content: `Os 7 Hábitos das Pessoas Altamente Eficazes - Stephen Covey

Introdução: De Dentro Para Fora

"Não podemos resolver nossos problemas com o mesmo nível de pensamento que os criou." - Albert Einstein

Covey descobriu, estudando 200 anos de literatura sobre sucesso, uma mudança fundamental:

Primeiros 150 anos: ÉTICA DO CARÁTER
• Integridade, humildade, coragem
• Justiça, paciência, trabalho duro
• Simplicidade, modestia

Últimos 50 anos: ÉTICA DA PERSONALIDADE
• Técnicas, imagem pública
• Habilidades sociais, pensamento positivo
• Atalhos e soluções rápidas

"Se quisermos mudar uma situação, primeiro temos que mudar a nós mesmos. E para mudar efetivamente a nós mesmos, primeiro temos que mudar nossas percepções."

HÁBITO 1: SEJA PROATIVO

"Entre o estímulo e a resposta, há um espaço. Nesse espaço está nosso poder de escolher nossa resposta."

Pessoas REATIVAS:
• São afetadas pelo clima emocional
• Culpam circunstâncias
• Usam linguagem vitimizada:
  - "Não há nada que eu possa fazer"
  - "Ele me deixa tão irritado"
  - "Eu tenho que fazer isso"

Pessoas PROATIVAS:
• Carregam seu próprio clima
• Assumem responsabilidade
• Usam linguagem proativa:
  - "Vamos ver as alternativas"
  - "Eu controlo meus sentimentos"
  - "Eu escolho fazer isso"

O Círculo de Influência vs Círculo de Preocupação:

CÍRCULO DE PREOCUPAÇÃO: Coisas que não controlamos
CÍRCULO DE INFLUÊNCIA: Coisas que podemos controlar

Proativos focam no Círculo de Influência e ele cresce.
Reativos focam no Círculo de Preocupação e sua influência diminui.

HÁBITO 2: COMECE COM O FIM EM MENTE

"Todas as coisas são criadas duas vezes: primeiro mentalmente, depois fisicamente."

Exercício do Funeral:
Imagine seu próprio funeral daqui a 3 anos. Quatro pessoas falarão:
1. Um familiar
2. Um amigo
3. Um colega de trabalho
4. Alguém da comunidade

O que você gostaria que cada um dissesse sobre você?

Essa visão define seus valores mais profundos.

Criando uma Missão Pessoal:

Centros de Vida Comuns (e seus problemas):
• CÔNJUGE: Dependência emocional extrema
• FAMÍLIA: Pode se tornar sufocante
• DINHEIRO: Nunca é suficiente
• TRABALHO: Desequilíbrio vida-trabalho
• POSSE: Materialismo vazio
• PRAZER: Hedonismo destrutivo
• INIMIGO: Obsessão negativa

Centro Ideal: PRINCÍPIOS
• Imutáveis e universais
• Fornecem direção consistente
• Base sólida para decisões

HÁBITO 3: PRIMEIRO O MAIS IMPORTANTE

"O que é uma coisa que você poderia fazer regularmente, que você não faz agora, que faria uma tremenda diferença positiva em sua vida?"

Matriz do Tempo:

           URGENTE    |    NÃO URGENTE
       ________________|________________
       |   QUADRANTE I |  QUADRANTE II |
IMPOR- |     CRISES    |  PREVENÇÃO    |
TANTE  |   PROBLEMAS   | RELACIONAMENT. |
       |   DEADLINES   | PLANEJAMENTO  |
       |_______________|_______________|
       | QUADRANTE III | QUADRANTE IV  |
NÃO    | INTERRUPÇÕES |  TRIVIALIDADES|
IMPOR- |  LIGAÇÕES    |  REDES SOCIAIS|
TANTE  |  RELATÓRIOS  |  DISTRAÇÕES  |
       |_______________|_______________|

Pessoas eficazes vivem no QUADRANTE II:
• Prevenção e planejamento
• Construir relacionamentos
• Desenvolvimento pessoal
• Verdadeiras oportunidades

"Você tem que dizer não para as coisas boas para poder dizer sim para as excelentes."

HÁBITO 4: PENSE GANHA-GANHA

Seis Paradigmas de Interação Humana:

1. GANHA-PERDE: "Eu subo, você desce"
2. PERDE-GANHA: "Piso em mim para agradar"
3. PERDE-PERDE: "Se eu afundo, levo todos"
4. GANHA: "Contanto que eu ganhe"
5. GANHA-GANHA: "Sucesso para todos"
6. GANHA-GANHA ou NÃO HÁ ACORDO: "Melhor não fazer negócio"

Ganha-Ganha não é técnica, é filosofia.

Requer:
• CARÁTER: Integridade, maturidade, mentalidade de abundância
• RELACIONAMENTOS: Confiança alta
• ACORDOS: Expectativas claras
• SISTEMAS: Recompensas alinhadas
• PROCESSOS: Solução sinérgica

HÁBITO 5: PROCURE PRIMEIRO COMPREENDER, DEPOIS SER COMPREENDIDO

"A maioria das pessoas não ouve com a intenção de compreender; ouve com a intenção de responder."

Níveis de Escuta:
1. IGNORAR: Não ouvir
2. FINGIR: "Sim, ahh, certo..."
3. SELETIVA: Ouvir apenas partes
4. ATENTA: Focar nas palavras
5. EMPÁTICA: Ouvir com intenção de entender

Quatro Respostas Autobiográficas (evite):
• AVALIAR: Concordar ou discordar
• SONDAR: Fazer perguntas de sua perspectiva
• ACONSELHAR: Dar conselhos baseados em sua experiência
• INTERPRETAR: Explicar motivos e comportamentos

Escuta Empática:
• Repita o conteúdo
• Reformule o conteúdo
• Reflita sentimentos
• Reformule e reflita

"Quando demonstro que realmente entendo, as defesas caem."

HÁBITO 6: CRIE SINERGIA

"Sinergia significa que o todo é maior que a soma das partes. 1 + 1 = 3 ou mais."

Essência da Sinergia:
• Valorizar diferenças
• Respeitar perspectivas
• Compensar fraquezas
• Construir sobre forças

Níveis de Comunicação:

BAIXA confiança: DEFENSIVA (Ganha-Perde ou Perde-Ganha)
Confiança MÉDIA: RESPEITOSA (Compromisso)
ALTA confiança: SINÉRGICA (Ganha-Ganha criativo)

"A pessoa verdadeiramente eficaz tem a humildade e o respeito para reconhecer suas próprias limitações e apreciar os ricos recursos disponíveis através da interação com outros."

HÁBITO 7: AFINE O INSTRUMENTO

"Quem é ocupado demais para afiar o machado, estará ocupado demais para cortar árvores."

As Quatro Dimensões da Renovação:

1. FÍSICA
• Exercício, nutrição, descanso
• Mínimo: 30 minutos, 3x semana
• Aumenta energia e resistência

2. ESPIRITUAL
• Meditação, oração, natureza
• Literatura inspiradora
• Renovação de compromisso com valores

3. MENTAL
• Leitura, escrita, planejamento
• Aprender novas habilidades
• Evitar entretenimento passivo excessivo

4. SOCIAL/EMOCIONAL
• Serviço, empatia, sinergia
• Segurança intrínseca
• Relacionamentos significativos

"As pessoas que não dedicam pelo menos uma hora por dia para renovar-se nas quatro dimensões, estão se iludindo quanto à eficácia que podem atingir."

A Espiral Ascendente:

APRENDER → COMPROMETER-SE → FAZER → APRENDER (nível superior)

Conclusão: De Dentro Para Fora Novamente

"Semeie um pensamento, colha uma ação;
Semeie uma ação, colha um hábito;
Semeie um hábito, colha um caráter;
Semeie um caráter, colha um destino."

Vitórias Privadas precedem Vitórias Públicas:
• Hábitos 1-3: Independência (vitórias privadas)
• Hábitos 4-6: Interdependência (vitórias públicas)
• Hábito 7: Renovação contínua

Legado Final:

"O que importa mais é como vemos as coisas, não as coisas em si. Quando mudamos o paradigma, mudamos o resultado."`,
      questions: [
        {
          id: "q1",
          question: "Qual é a diferença entre pessoas proativas e reativas segundo Covey?",
          options: ["Proativas são mais inteligentes", "Proativas escolhem suas respostas, reativas são controladas por circunstâncias", "Não há diferença real", "Reativas trabalham mais"],
          correct: 1
        },
        {
          id: "q2",
          question: "Em qual quadrante da Matriz do Tempo pessoas eficazes passam mais tempo?",
          options: ["Quadrante I - Urgente e Importante", "Quadrante II - Não Urgente mas Importante", "Quadrante III - Urgente mas Não Importante", "Quadrante IV - Não Urgente e Não Importante"],
          correct: 1
        },
        {
          id: "q3",
          question: "Quais são as quatro dimensões do Hábito 7 (Afine o Instrumento)?",
          options: ["Trabalho, casa, lazer, sono", "Física, espiritual, mental, social/emocional", "Saúde, dinheiro, família, amigos", "Corpo, mente, alma, coração"],
          correct: 1
        }
      ]
    },
    "quem-pensa-enriquece": {
      title: "Quem Pensa Enriquece",
      author: "Napoleon Hill",
      reward: 44,
      category: "Sucesso Financeiro",
      readingLevel: "Intermediário",
      difficulty: "Médio",
      estimatedTime: "40 min",
      chapters: 13,
      pages: 360,
      publishYear: 1937,
      synopsis: "Descubra os 13 passos comprovados para alcançar riqueza e sucesso através do poder do pensamento.",
      content: `Quem Pensa Enriquece - Napoleon Hill

Introdução: O Segredo de Carnegie

Napoleon Hill passou 20 anos estudando mais de 500 dos homens mais ricos da América, a pedido de Andrew Carnegie. O resultado? Uma fórmula de 13 passos para o sucesso.

"Você é o mestre de seu destino. Você pode influenciar, direcionar e controlar seu próprio ambiente. Você pode fazer sua vida ser o que quiser que ela seja."

Passo 1: DESEJO - O Ponto de Partida

"Desejar ser rico não trará riqueza. Mas desejar riqueza com um estado mental que se torna uma obsessão, depois planejar meios definidos para adquiri-la, e apoiar esses planos com persistência que não reconhece fracasso, trará riqueza."

Os 6 Passos para Transformar Desejo em Ouro:

1. Fixe em sua mente a quantia EXATA de dinheiro que deseja
2. Determine exatamente o que pretende dar em troca
3. Estabeleça uma data definitiva
4. Crie um plano definitivo e comece IMEDIATAMENTE
5. Escreva uma declaração clara e concisa
6. Leia sua declaração em voz alta duas vezes ao dia

Exemplo de Declaração:
"Até 1º de janeiro de 20XX, terei em minha posse R$ 100.000, que virá a mim em várias quantias de tempos em tempos. Em troca deste dinheiro, darei o serviço mais eficiente de que sou capaz..."

Passo 2: FÉ - Visualização e Crença

"Fé é o elemento químico que, quando misturado com a oração, dá acesso direto à Inteligência Infinita."

Como Desenvolver Fé:

1. AUTOSUGESTÃO REPETIDA
"Qualquer ideia repetidamente apresentada ao subconsciente é finalmente aceita."

2. VISUALIZAÇÃO EMOTIVA
"Veja-se já na posse do dinheiro."

3. AFIRMAÇÕES POSITIVAS
Repita 5 vezes ao dia:
• "Eu tenho a capacidade de alcançar meu objetivo"
• "Meus pensamentos dominantes se tornarão realidade"
• "Eu sou mestre do meu destino"

Passo 3: AUTOSUGESTÃO - O Meio de Influenciar o Subconsciente

"Seu subconsciente não distingue entre instruções construtivas e destrutivas."

Técnica da Autosugestão:

1. Vá para um lugar quieto onde não será perturbado
2. Feche os olhos e repita em voz alta sua declaração
3. VEJA-SE já na posse do dinheiro
4. SINTA as emoções que sentirá quando atingir
5. Faça isso ao acordar e antes de dormir

"A mera leitura das palavras é inútil - A EMOÇÃO deve ser misturada com as palavras."

Passo 4: CONHECIMENTO ESPECIALIZADO

"Conhecimento geral, não importa quão grande em quantidade ou variedade, é de pouco uso na acumulação de dinheiro."

"Conhecimento é apenas poder potencial. Torna-se poder apenas quando organizado em planos definidos de ação."

Fontes de Conhecimento:
• Experiência própria
• Educação formal
• Bibliotecas públicas
• Cursos especiais
• Mastermind (grupo de mentes-mestras)

Henry Ford tinha pouca educação formal, mas disse: "Por que eu deveria encher minha mente com conhecimento geral quando tenho homens ao meu redor que podem fornecer qualquer conhecimento que eu precise?"

Passo 5: IMAGINAÇÃO - A Oficina da Mente

"A imaginação é literalmente a oficina onde são criados todos os planos pelo homem."

Dois Tipos de Imaginação:

1. SINTÉTICA: Arranja velhos conceitos em novas combinações
2. CRIATIVA: Cria do nada, conecta com a Inteligência Infinita

"As ideias são o ponto de partida de todas as fortunas."

Coca-Cola começou como uma ideia de um farmacêutico que vendeu a fórmula por $2.300. Hoje vale bilhões.

Passo 6: PLANEJAMENTO ORGANIZADO

"Você está engajado em um empreendimento de grande importância para você. Para ter certeza do sucesso, você deve ter planos que são impecáveis."

Quando Planos Falham:
"Quando a derrota vem, aceite-a como um sinal de que seus planos não são sólidos, reconstrua esses planos e navegue mais uma vez em direção ao seu objetivo coviçado."

As 11 Razões Principais do Fracasso:
1. Herança desfavorável
2. Falta de propósito definido
3. Falta de ambição
4. Educação insuficiente
5. Falta de autodisciplina
6. Saúde ruim
7. Influências ambientais desfavoráveis
8. Procrastinação
9. Falta de persistência
10. Personalidade negativa
11. Falta de controle do impulso sexual

Passo 7: DECISÃO - O Domínio da Procrastinação

"Análise de várias centenas de pessoas que acumularam fortunas revelou que cada uma delas tinha o hábito de TOMAR DECISÕES RAPIDAMENTE e mudá-las LENTAMENTE."

"As pessoas que falham em acumular dinheiro têm o hábito de tomar decisões muito lentamente e mudá-las rapidamente e com frequência."

Regras para Tomada de Decisão:
• Tome suas próprias decisões
• Mantenha seus planos para você mesmo
• Fale menos, ouça mais
• Quando decidir, aja imediatamente

Passo 8: PERSISTÊNCIA - O Esforço Sustentado

"Persistência é para o caráter do homem o que o carbono é para o aço."

Os 8 Fatores da Persistência:
1. Definição de propósito
2. Desejo ardente
3. Autoconfiança
4. Planos definidos
5. Conhecimento preciso
6. Cooperação
7. Força de vontade
8. Hábito

Como Desenvolver Persistência:
1. Propósito definido apoiado por desejo ardente
2. Plano definido expresso em ação contínua
3. Mente fechada contra influências negativas
4. Aliança amigável com pessoas encorajadoras

Passo 9: O PODER DA MENTE-MESTRA

"Nenhum indivíduo tem poder suficiente para ter grande sucesso sem a cooperação de outros."

Mente-Mestra: "Coordenação de conhecimento e esforço entre duas ou mais pessoas, que trabalham em direção a um propósito definido."

Benefícios:
1. ECONÔMICO: Conhecimento combinado
2. PSÍQUICO: Energia espiritual multiplicada

Andrew Carnegie atribuiu toda sua fortuna ao poder da Mente-Mestra - seu grupo de 50 homens.

Passo 10: A TRANSMUTAÇÃO SEXUAL

"A emoção do sexo é a mais poderosa das emoções humanas."

Transmutação: Mudar ou transferir energia sexual para outros canais criativos.

Os 10 Estímulos da Mente:
1. Desejo sexual
2. Amor
3. Desejo ardente por fama
4. Música
5. Amizade
6. Aliança de Mente-Mestra
7. Sofrimento mútuo
8. Autosugestão
9. Medo
10. Narcóticos e álcool

"Os homens de maior realização são homens com naturezas sexuais altamente desenvolvidas que aprenderam a arte da transmutação sexual."

Passo 11: A MENTE SUBCONSCIENTE

"A mente subconsciente funciona dia e noite. Através de um método desconhecido ao homem, ela extrai forças da Inteligência Infinita."

As 7 Principais Emoções Positivas:
1. Desejo
2. Fé
3. Amor
4. Sexo
5. Entusiasmo
6. Romance
7. Esperança

As 7 Principais Emoções Negativas (evitar):
1. Medo
2. Ciúme
3. Ódio
4. Vingança
5. Ganância
6. Superstição
7. Raiva

"Emoções positivas e negativas não podem ocupar a mente ao mesmo tempo."

Passo 12: O CÉREBRO - Estação de Transmissão

"Cada cérebro humano é tanto uma estação de transmissão quanto de recepção para a vibração do pensamento."

"Quando estimulado, a mente se torna mais receptiva à vibração do pensamento."

Passo 13: O SEXTO SENTIDO - A Porta para o Templo da Sabedoria

"O sexto sentido é a porção da mente subconsciente referida como Imaginação Criativa."

"Através do sexto sentido, a Inteligência Infinita pode e vai se comunicar voluntariamente."

Como Desenvolver o Sexto Sentido:
1. Meditação regular
2. Desenvolvimento dos outros 12 princípios
3. Conselho imaginário com heróis
4. Escuta da "pequena voz interior"

Os 6 Fantasmas do Medo (a vencer):

1. MEDO DA POBREZA
2. MEDO DA CRÍTICA
3. MEDO DA DOENÇA
4. MEDO DA PERDA DO AMOR
5. MEDO DA VELHICE
6. MEDO DA MORTE

"Os medos são nada mais que estados mentais."

Conclusão: Uma Palavra Sobre Tolerância

"Se você tem medo do fracasso, você está condenado ao fracasso antes mesmo de começar."

"Riqueza começa com um pensamento. A quantidade é limitada apenas pela pessoa em cuja mente o pensamento é colocado em movimento."

FÓrmula Final:
DESEJO + FÉ + AUTOSUGESTÃO + CONHECIMENTO + IMAGINAÇÃO + PLANEJAMENTO + DECISÃO + PERSISTÊNCIA + MENTE-MESTRA + TRANSMUTAÇÃO + SUBCONSCIENTE + CÉREBRO + SEXTO SENTIDO = RIQUEZA

"O que a mente pode conceber e acreditar, ela pode alcançar."`,
      questions: [
        {
          id: "q1",
          question: "Quais são os 6 passos para transformar desejo em riqueza segundo Napoleon Hill?",
          options: ["Pensar, planejar, agir, revisar, ajustar, repetir", "Fixar quantia exata, determinar troca, estabelecer data, criar plano, escrever declaração, ler diariamente", "Estudar, trabalhar, economizar, investir, reinvestir, aposentar", "Sonhar, visualizar, acreditar, manifestar, receber, agradecer"],
          correct: 1
        },
        {
          id: "q2",
          question: "O que Napoleon Hill define como 'Mente-Mestra'?",
          options: ["Uma pessoa muito inteligente", "Coordenação de conhecimento entre duas ou mais pessoas com propósito definido", "O cérebro de um gênio", "Pensamento positivo individual"],
          correct: 1
        },
        {
          id: "q3",
          question: "Qual é a fórmula principal do livro resumida em uma frase?",
          options: ["Trabalho duro sempre compensa", "Dinheiro atrai dinheiro", "O que a mente pode conceber e acreditar, ela pode alcançar", "Sorte é preparação encontrando oportunidade"],
          correct: 2
        }
      ]
    },
    "o-milagre-da-manha": {
      title: "O Milagre da Manhã",
      author: "Hal Elrod",
      reward: 22.75,
      category: "Produtividade",
      readingLevel: "Básico",
      difficulty: "Fácil",
      synopsis: "Transforme sua vida antes das 8 da manhã com uma rotina matinal revolucionária que aumentará sua produtividade e felicidade.",
      estimatedTime: "35 min",
      chapters: 8,
      pages: 180,
      publishYear: 2012,
      content: `O Milagre da Manhã - Hal Elrod

      Como Transformar Sua Vida Antes das 8h

      Hal Elrod morreu por 6 minutos. Foi atropelado por um motorista bêbado, quebrou 11 ossos, teve traumatismo craniano e os médicos disseram que ele nunca mais andaria. Mas ele não só voltou a andar como se tornou ultramaratonista e palestrante de sucesso.

      O segredo? Uma rotina matinal que mudou tudo.

      A Realidade Dolorosa: 95% das Pessoas Vivem Abaixo do Seu Potencial

      Estatísticas chocantes:
      • 41% das pessoas estão endividadas
      • 52% não têm aposentadoria planejada
      • 64% estão acima do peso
      • Depressão é a principal causa de incapacidade no mundo

      Por quê? Porque as pessoas acordam no último minuto, correm para o trabalho e repetem o ciclo. Nunca dedicam tempo para o desenvolvimento pessoal.

      "Como você acorda cada manhã e como começa cada dia tem um impacto ENORME em seus níveis de sucesso em todas as áreas da vida."

      O Life S.A.V.E.R.S. - Os 6 Hábitos Que Vão Salvar Sua Vida

      S - SILENCE (Silêncio/Meditação) - 5 minutos
      
      Comece com silêncio intencional. Não pegue o celular! 
      
      Opções:
      • Meditação
      • Oração
      • Reflexão
      • Respiração profunda
      • Gratidão

      Benefícios comprovados: Reduz stress, melhora foco, aumenta clareza mental.

      A - AFFIRMATIONS (Afirmações) - 5 minutos

      Programe sua mente para o sucesso com afirmações poderosas.

      Estrutura perfeita de afirmação:
      1. O que você quer
      2. Por que você quer
      3. Quem você se compromete a ser
      4. O que você se compromete a fazer
      5. Como isso vai fazer você se sentir

      Exemplo: "Eu me comprometo a acordar às 5h todos os dias porque isso me dá tempo para me desenvolver e me tornar a pessoa que preciso ser para criar a vida dos meus sonhos."

      V - VISUALIZATION (Visualização) - 5 minutos

      Atletas olímpicos usam visualização. Por que você não usaria?

      Visualize três coisas:
      1. Seus objetivos já alcançados (como você se sente?)
      2. O processo para alcançá-los (você se vendo fazendo o trabalho)
      3. Como será seu dia perfeito hoje

      Jim Carrey escreveu um cheque de $10 milhões para si mesmo antes de ficar famoso. Anos depois, recebeu exatamente isso por um filme.

      E - EXERCISE (Exercício) - 20 minutos

      Apenas 20 minutos de exercício aumentam:
      • Energia em 20%
      • Foco em 30%
      • Humor em 40%

      Não precisa ser intenso:
      • Yoga
      • Caminhada
      • Polichinelos
      • Alongamento
      • Dança

      "Se você não tem tempo para exercício, terá que arranjar tempo para doença."

      R - READING (Leitura) - 20 minutos

      10 páginas por dia = 18 livros por ano = 180 livros em 10 anos

      Imagine aprender com os 180 maiores especialistas do mundo. Como sua vida seria diferente?

      Dica: Leia livros de desenvolvimento pessoal pela manhã. Ficção à noite.

      S - SCRIBING (Escrita/Diário) - 5 minutos

      Escrever clarifica pensamentos e acelera resultados.

      O que escrever:
      • 3 coisas pelas quais você é grato
      • 3 objetivos para hoje
      • 1 afirmação positiva
      • Reflexões e insights
      • Lições aprendidas

      "As ideias não implementadas morrem. O diário as mantém vivas."

      O Desafio dos 30 Dias

      Comprometa-se com 30 dias seguidos. Por quê?
      • Dias 1-10: Insuportável (você vai querer desistir)
      • Dias 11-20: Desconfortável (mas gerenciável)
      • Dias 21-30: Imparável (novo hábito formado)

      Adaptações Importantes

      Tempo curto? Faça a versão de 6 minutos:
      • 1 minuto cada hábito

      Não é pessoa matutina? 
      • Comece acordando 15 minutos mais cedo
      • Adicione 15 minutos por semana
      • Em 1 mês, você terá 1 hora extra

      Tem filhos pequenos?
      • Acorde antes deles
      • Ou faça com eles (ensine pelo exemplo)

      A Equação do Sucesso

      QUANDO você acorda + COMO você acorda = SUCESSO

      Acordar cedo não é suficiente. Você precisa acordar com PROPÓSITO.

      História Inspiradora: John, vendedor medíocre, implementou o Milagre da Manhã. Em 2 anos:
      • Dobrou sua renda
      • Perdeu 30kg
      • Salvou seu casamento
      • Escreveu um livro

      Tudo começou acordando 1 hora mais cedo.

      Seu Milagre Está Esperando

      "Toda manhã você tem duas escolhas: continuar dormindo com seus sonhos ou acordar e persegui-los."

      Amanhã de manhã, quando o despertador tocar, lembre-se: Você está a apenas uma manhã de distância de mudar toda sua vida.`,
      questions: [
        {
          id: "q1",
          question: "O que significa a sigla S.A.V.E.R.S. no método do Milagre da Manhã?",
          options: ["Sono, Alimentação, Vida, Exercício, Reflexão, Sucesso", "Silêncio, Afirmações, Visualização, Exercício, Leitura, Escrita", "Saúde, Amor, Vitória, Energia, Riqueza, Sabedoria", "Simplicidade, Ação, Valor, Esforço, Resultado, Satisfação"],
          correct: 1
        },
        {
          id: "q2",
          question: "Quantos dias o autor sugere para formar o novo hábito matinal?",
          options: ["7 dias", "14 dias", "21 dias", "30 dias"],
          correct: 3
        },
        {
          id: "q3",
          question: "Qual é a versão reduzida do Milagre da Manhã para quem tem pouco tempo?",
          options: ["30 minutos no total", "15 minutos no total", "6 minutos (1 minuto por hábito)", "3 minutos no total"],
          correct: 2
        }
      ]
    },
    "pai-rico-pai-pobre": {
      title: "Pai Rico, Pai Pobre",
      author: "Robert Kiyosaki",
      reward: 26.00,
      category: "Finanças",
      readingLevel: "Intermediário",
      difficulty: "Médio",
      synopsis: "Aprenda a diferença entre trabalhar por dinheiro e fazer o dinheiro trabalhar para você com lições práticas de educação financeira.",
      estimatedTime: "42 min",
      chapters: 9,
      pages: 220,
      publishYear: 1997,
      content: `Pai Rico, Pai Pobre - Robert Kiyosaki

      O Que os Ricos Ensinam a Seus Filhos Sobre Dinheiro

      Robert Kiyosaki teve dois pais: seu pai biológico (Pai Pobre) - PhD, educado, funcionário público. E o pai de seu melhor amigo (Pai Rico) - sem educação formal, empresário multimilionário.

      A diferença? Mentalidade.

      Pai Pobre dizia: "Não posso pagar isso."
      Pai Rico perguntava: "COMO posso pagar isso?"

      Uma fecha a mente. A outra força você a pensar.

      Lição 1: Os Ricos Não Trabalham Por Dinheiro

      Aos 9 anos, Robert e seu amigo Mike queriam ficar ricos. O Pai Rico concordou em ensiná-los, mas com uma condição: trabalhar de graça em sua loja.

      Após semanas sem pagamento, Robert ficou furioso. Pai Rico sorriu: "Você está sentindo o que a maioria sente - raiva e frustração. Mas em vez de confrontar o medo, eles acordam e vão trabalhar esperando que o dinheiro acalme o medo."

      A Armadilha do Rato (Rat Race):
      Ganhar → Gastar → Precisar de mais → Trabalhar mais → Repetir

      "A maioria das pessoas tem um preço. E têm um preço por causa das emoções chamadas medo e ganância."

      Medo: De não pagar as contas
      Ganância: De querer coisas melhores

      Solução: Use as emoções a seu favor, não deixe elas controlarem você.

      Lição 2: Alfabetização Financeira

      "Não é quanto dinheiro você ganha, mas quanto dinheiro você mantém."

      Regra #1 - Conheça a diferença entre ATIVO e PASSIVO:
      • ATIVO = Coloca dinheiro no seu bolso
      • PASSIVO = Tira dinheiro do seu bolso

      Simples assim! Mas 95% das pessoas não entendem isso.

      Exemplos CHOCANTES:
      • Sua casa? PASSIVO (sim, mesmo que valorize!)
      • Carro novo? PASSIVO
      • Ações que pagam dividendos? ATIVO
      • Imóvel alugado? ATIVO

      Fluxo de Caixa dos Pobres:
      Salário → Despesas → Zero

      Fluxo de Caixa da Classe Média:
      Salário → Passivos → Despesas maiores → Mais trabalho

      Fluxo de Caixa dos Ricos:
      Ativos → Renda → Mais ativos → Liberdade financeira

      Lição 3: Cuide dos Seus Negócios

      Ray Kroc (McDonald's) perguntou: "Em que negócio eu estou?"
      Resposta óbvia: "Hamburgers!"
      Ray: "Errado. Estou no negócio IMOBILIÁRIO."

      McDonald's possui as melhores esquinas do mundo!

      Seu verdadeiro negócio = Sua coluna de ATIVOS

      Tipos de ativos para focar:
      1. Negócios que não exigem sua presença
      2. Ações e títulos
      3. Imóveis que geram renda
      4. Royalties (música, livros, patentes)
      5. Qualquer coisa que valorize e tenha mercado

      "Os ricos compram ativos. Os pobres só têm despesas. A classe média compra passivos pensando que são ativos."

      Lição 4: A História dos Impostos

      Os ricos sabem jogar o jogo:

      Funcionário: Ganha → Paga imposto → Gasta
      Empresário: Ganha → Gasta → Paga imposto sobre o que sobra

      Corporações = Maior vantagem dos ricos

      O Poder do Q.I. Financeiro:
      1. Contabilidade (ler números)
      2. Investimento (fazer dinheiro gerar dinheiro)
      3. Mercados (oferta e demanda)
      4. Legislação (jogar dentro das regras)

      Lição 5: Os Ricos Inventam Dinheiro

      História real: Robert comprou uma casa por $20.000 em leilão. Vendeu por $60.000. Tempo investido: 5 horas. Ganho: $40.000.

      "A mente é o ativo mais poderoso que temos."

      Duas opções na vida:
      1. Jogar pelo seguro e nunca enriquecer
      2. Jogar inteligentemente e criar oportunidades

      Inteligência Financeira = Resolver problemas financeiros

      Problema: Não tenho dinheiro para investir
      Solução pobre: Desistir
      Solução rica: Como posso criar dinheiro para investir?

      Lição 6: Trabalhe Para Aprender, Não Por Dinheiro

      JOB = Just Over Broke (Apenas Acima da Falência)

      Habilidades essenciais que escolas não ensinam:
      • Vendas e marketing
      • Comunicação
      • Liderança
      • Gestão de pessoas
      • Gestão de sistemas
      • Gestão de fluxo de caixa

      "Especialistas ganham bem. Generalistas ficam ricos."

      Conselho controverso: Mude de emprego frequentemente para aprender habilidades diferentes. Cada emprego é uma universidade paga.

      Os 5 Maiores Obstáculos

      1. MEDO - Especialmente de perder dinheiro
      "Todos têm medo de perder. A diferença é como você lida com o medo."

      2. CINISMO - Dúvidas paralisantes
      "Os cínicos criticam. Os vencedores analisam."

      3. PREGUIÇA - Disfarçada de "estar ocupado"
      "Pessoas ocupadas são frequentemente as mais preguiçosas."

      4. MAUS HÁBITOS
      "Pague-se primeiro, sempre."

      5. ARROGÂNCIA
      "O que eu não sei me faz perder dinheiro."

      Como Começar

      1. Encontre uma razão maior que a realidade - O PORQUÊ
      2. Escolha diariamente - Cada gasto é uma escolha
      3. Escolha seus amigos cuidadosamente - Você é a média dos 5
      4. Domine uma fórmula e aprenda outra - Aprendizado contínuo
      5. Pague-se primeiro - Automatize
      6. Pague bem seus consultores - Bom conselho é barato
      7. Seja um "doador indiano" - Doe esperando retorno
      8. Use ativos para comprar luxos - Nunca o contrário
      9. Heróis inspiram - Quem você admira?
      10. Ensine e receberá - Quanto mais ensina, mais aprende

      A Verdade Final

      "Há um mundo de diferença entre ter dinheiro e ser rico. Ser rico é ter a liberdade de não se preocupar com dinheiro."

      O segredo não é trabalhar duro. É trabalhar inteligentemente. Faça o dinheiro trabalhar duro para você.`,
      questions: [
        {
          id: "q1",
          question: "Qual é a diferença fundamental entre um ativo e um passivo segundo o livro?",
          options: ["Ativo valoriza, passivo desvaloriza", "Ativo coloca dinheiro no bolso, passivo tira", "Ativo é investimento, passivo é dívida", "Ativo é imóvel, passivo é carro"],
          correct: 1
        },
        {
          id: "q2",
          question: "Por que Robert Kiyosaki diz que sua casa NÃO é um ativo?",
          options: ["Porque casas sempre desvalorizam", "Porque tira dinheiro do bolso com despesas", "Porque imóveis são maus investimentos", "Porque ele prefere alugar"],
          correct: 1
        },
        {
          id: "q3",
          question: "Qual é a principal lição sobre trabalhar por dinheiro?",
          options: ["Sempre peça aumento", "Trabalhe mais horas para ganhar mais", "Trabalhe para aprender, não por dinheiro", "Encontre o emprego com maior salário"],
          correct: 2
        }
      ]
    }
  };

  // Get the current book based on slug, with fallback to first book
  const currentBook = books[bookSlug] || books["o-poder-do-habito"];
  const totalQuizSteps = currentBook.questions.length + 2; // questions + rating + robot verification

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!showInstructions && currentQuizStep === 0 && !showValidation && !showReward) {
      interval = setInterval(() => {
        setReadingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showInstructions, currentQuizStep, showValidation, showReward]);

  // Controle do som ambiente
  useEffect(() => {
    if (ambientSoundEnabled) {
      startAmbientSound();
    } else {
      stopAmbientSound();
    }
    
    return () => {
      stopAmbientSound();
    };
  }, [ambientSoundEnabled]);

  // Lock body scroll when instructions modal is open
  useEffect(() => {
    if (showInstructions) {
      lockBodyScroll();
    }

    return () => {
      unlockBodyScroll();
    };
  }, [showInstructions]);

  // Lock body scroll when fraud warning modal is open
  useEffect(() => {
    if (showFraudWarning) {
      lockBodyScroll();
    }

    return () => {
      unlockBodyScroll();
    };
  }, [showFraudWarning]);

  // Lock body scroll when validation modal is open
  useEffect(() => {
    if (showValidation) {
      lockBodyScroll();
    }

    return () => {
      unlockBodyScroll();
    };
  }, [showValidation]);

  // Lock body scroll when reward modal is open
  useEffect(() => {
    if (showReward) {
      lockBodyScroll();
    }

    return () => {
      unlockBodyScroll();
    };
  }, [showReward]);

  // Lock body scroll when quiz modal is open
  useEffect(() => {
    if (currentQuizStep > 0 && currentQuizStep <= totalQuizSteps) {
      lockBodyScroll();
    }

    return () => {
      unlockBodyScroll();
    };
  }, [currentQuizStep, totalQuizSteps]);

  const toggleAmbientSound = () => {
    playSound('click');
    setAmbientSoundEnabled(!ambientSoundEnabled);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleConfirmActivity = () => {
    playSound('click');
    if (readingTime < 30) {
      setShowFraudWarning(true);
    } else {
      setCurrentQuizStep(1);
    }
  };

  const handleQuizNext = () => {
    playSound('click');
    if (currentQuizStep <= currentBook.questions.length) {
      const currentQuestion = currentBook.questions[currentQuizStep - 1];
      if (!answers[currentQuestion.id]) return;
    } else if (currentQuizStep === currentBook.questions.length + 1) {
      if (rating === 0 || !opinion) return;
    } else if (currentQuizStep === currentBook.questions.length + 2) {
      if (!isRobotVerified) return;
    }
    
    if (currentQuizStep < totalQuizSteps) {
      setCurrentQuizStep(currentQuizStep + 1);
    } else {
      handleQuizSubmit();
    }
  };

  const handleQuizBack = () => {
    playSound('click');
    if (currentQuizStep > 1) {
      setCurrentQuizStep(currentQuizStep - 1);
    }
  };

  const handleQuizSubmit = async () => {
    setCurrentQuizStep(0);
    setShowValidation(true);
    
    // Simulate validation steps - faster for better UX
    setTimeout(() => setValidationStep(1), 200);
    setTimeout(() => setValidationStep(2), 600);
    setTimeout(() => setValidationStep(3), 1000);
    setTimeout(() => setValidationStep(4), 1400);
    setTimeout(() => setValidationStep(5), 1800);
    setTimeout(() => setValidationStep(6), 2200);
    setTimeout(async () => {
      setShowValidation(false);
      setShowReward(true);
      playSound('reward');
      setAmbientSoundEnabled(false); // Para o som ambiente ao completar a leitura
      stopAmbientSound(); // Garante que o som pare
      
      // Save book completion
      try {
        if (isGuestUser) {
          // Guest user - save to localStorage
          const bookData = {
            bookSlug: bookSlug,
            title: currentBook.title,
            author: currentBook.author,
            reward: currentBook.reward,
            rating: rating,
            opinion: opinion,
            readingTime: readingTime,
            quizAnswers: answers,
            difficulty: currentBook.difficulty
          };
          
          const updatedGuestData = completeGuestBook(bookData);
          
          // Check if this was the guest's 5th book and redirect automatically
          if (updatedGuestData?.stats?.totalBooksRead >= 5) {
            // Wait a bit for the reward modal to show, then redirect
            setTimeout(() => {
              setLocation('/onboarding-complete');
            }, 3000);
          }
        } else {
          // Logged in user - save to server
          await apiClient.completeBook({
            bookSlug: bookSlug,
            title: currentBook.title,
            author: currentBook.author,
            reward: currentBook.reward,
            rating: rating,
            opinion: opinion,
            readingTime: readingTime,
            quizAnswers: answers,
            difficulty: currentBook.difficulty
          });
          
          // Reload data from database to ensure consistency
          // This will update local data with the latest from server
          await userDataManager.loadUserData();
          
          // Check if this was the user's 3rd book and redirect automatically
          const updatedUserData = userDataManager.getUserData();
          if (updatedUserData?.stats?.totalBooksRead === 3 && updatedUserData?.selectedPlan !== 'premium') {
            // Wait a bit for the reward modal to show, then redirect
            setTimeout(() => {
              setLocation('/onboarding-complete');
            }, 3000);
          }
        }
      } catch (error) {
        console.error("Failed to save book completion:", error);
      }
    }, 2500); // Reduced from 6000ms to 2500ms for faster balance update
  };

  const transactionId = `TRX${Date.now()}BR`;
  const currentDate = new Date().toLocaleDateString('pt-BR');
  const currentTime = new Date().toLocaleTimeString('pt-BR');
  
  const handlePlanUpgrade = async (plan: 'premium' | 'unlimited') => {
    try {
      // Here we would integrate with payment gateway
      // For now, just update the plan
      await apiClient.upgradePlan(plan === 'unlimited' ? 'premium' : 'premium');
      await userDataManager.loadUserData();
    } catch (error) {
      console.error('Error upgrading plan:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-green-50/10 to-white">
      {/* Elegant Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-green-100/50 px-5 py-4 flex items-center justify-between z-10">
        <button
          onClick={() => {
            playSound('click');
            stopAmbientSound(); // Para o som ao sair da página
            setLocation("/dashboard");
          }}
          className="p-2.5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl text-gray-600 hover:text-gray-900 hover:from-gray-100 hover:to-gray-200 transition-all"
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleAmbientSound}
            className={`p-2.5 rounded-xl transition-all ${
              ambientSoundEnabled 
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-600 hover:text-gray-900'
            }`}
            data-testid="button-toggle-sound"
          >
            {ambientSoundEnabled ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </button>
          
          <div className="px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl flex items-center gap-2">
            <Clock className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-gray-900">{formatTime(readingTime)}</span>
          </div>
        </div>
      </header>

      {/* Beautiful Book Header */}
      <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-white px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">{currentBook.title}</h1>
              <p className="text-xs text-gray-600 mb-2">{currentBook.author}</p>
              
              {currentBook.synopsis && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-3 leading-relaxed">
                  {currentBook.synopsis}
                </p>
              )}
              
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  {currentBook.category}
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  {currentBook.readingLevel}
                </span>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Recompensa</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                R$ {currentBook.reward}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Content Area */}
      <div className="max-w-4xl mx-auto px-6 py-8 pb-32">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-gray-700 text-base leading-7" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
            {currentBook.content.split('\n\n').map((paragraph: string, index: number) => (
              <p key={index} className="mb-4">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Button */}
      {currentQuizStep === 0 && !showValidation && !showReward && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent p-6 pb-8">
          <button
            onClick={handleConfirmActivity}
            className="w-full max-w-lg mx-auto flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-[0_4px_0_0_rgba(34,197,94,0.5)] hover:shadow-[0_2px_0_0_rgba(34,197,94,0.5)] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]"
            data-testid="button-confirm-activity"
          >
            <CheckCircle className="h-5 w-5" />
            Confirmar Leitura
          </button>
        </div>
      )}

      {/* Beautiful Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full blur-3xl opacity-50 -translate-y-32 translate-x-32"></div>
            
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <BookOpen className="h-10 w-10 text-white" />
              </div>
              
              <h2 className="text-2xl font-semibold text-gray-900 text-center mb-6">
                Instruções da Atividade
              </h2>
              
              <div className="space-y-4 mb-8">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center">
                    <span className="text-sm font-semibold text-green-700">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Tempo mínimo de leitura</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Leia com atenção por pelo menos <span className="font-semibold text-green-600">30 segundos</span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center">
                    <span className="text-sm font-semibold text-green-700">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Questionário interativo</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Responda perguntas sobre o conteúdo do livro
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center">
                    <span className="text-sm font-semibold text-green-700">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Avaliação e feedback</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Compartilhe sua opinião sobre a leitura
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl flex items-center justify-center">
                    <span className="text-sm font-semibold text-green-700">4</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Receba sua recompensa</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Ganhe <span className="font-semibold text-green-600">R$ {currentBook.reward},00</span> pela conclusão
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-6">
                <p className="text-xs text-center text-gray-700">
                  <Sparkles className="inline h-3 w-3 text-yellow-500 mr-1" />
                  Leia com atenção para responder corretamente o questionário
                </p>
              </div>

              <button
                onClick={() => {
                  playSound('click');
                  setShowInstructions(false);
                  setAmbientSoundEnabled(true); // Ativa som ambiente automaticamente ao começar a leitura
                }}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl"
                data-testid="button-start-reading"
              >
                Começar Leitura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Fraud Warning Modal */}
      {showFraudWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-orange-500 opacity-5"></div>
            
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse">
                <AlertTriangle className="h-10 w-10 text-white" />
              </div>

              <h2 className="text-2xl font-semibold text-gray-900 text-center mb-3">
                Tentativa de Fraude
              </h2>
              
              <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 mb-6 border border-red-100">
                <p className="text-sm text-gray-700 text-center mb-3">
                  <span className="font-semibold">Atenção!</span>
                </p>
                <p className="text-xs text-gray-600 text-center mb-3">
                  Nosso sistema detectou que você tentou concluir a leitura em menos de 30 segundos.
                </p>
                <div className="bg-white/80 rounded-lg p-3">
                  <p className="text-xs text-red-600 font-medium text-center">
                    Tempo mínimo: 30 segundos
                  </p>
                  <p className="text-xs text-gray-600 text-center mt-1">
                    Seu tempo: {formatTime(readingTime)}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-white font-medium mb-1">
                      Sistema Anti-Fraude Ativo
                    </p>
                    <p className="text-[11px] text-gray-300">
                      Tentativas repetidas de fraude resultarão em suspensão permanente da conta e perda de todos os valores acumulados.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  playSound('click');
                  setShowFraudWarning(false);
                }}
                className="w-full py-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white font-semibold rounded-2xl hover:from-gray-800 hover:to-gray-700 transition-all shadow-lg"
                data-testid="button-understand-fraud"
              >
                Entendi e Vou Ler com Atenção
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step-by-Step Quiz Modal */}
      {currentQuizStep > 0 && currentQuizStep <= totalQuizSteps && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Progress Bar */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-8 py-6 border-b border-green-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900">
                  {currentQuizStep <= currentBook.questions.length 
                    ? `Pergunta ${currentQuizStep} de ${currentBook.questions.length}`
                    : currentQuizStep === currentBook.questions.length + 1
                    ? "Avaliação do Livro"
                    : "Verificação de Segurança"}
                </h3>
                <span className="text-sm text-green-600 font-medium">
                  {Math.round((currentQuizStep / totalQuizSteps) * 100)}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${(currentQuizStep / totalQuizSteps) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="p-8 overflow-y-auto max-h-[60vh]">
              {/* Questions */}
              {currentQuizStep <= currentBook.questions.length && (
                <div>
                  <div className="mb-8">
                    <p className="text-lg font-medium text-gray-900 mb-6">
                      {currentBook.questions[currentQuizStep - 1].question}
                    </p>
                    <div className="space-y-3">
                      {currentBook.questions[currentQuizStep - 1].options.map((option: string, optIndex: number) => (
                        <label 
                          key={optIndex} 
                          className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            answers[currentBook.questions[currentQuizStep - 1].id] === optIndex.toString()
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={currentBook.questions[currentQuizStep - 1].id}
                            value={optIndex}
                            checked={answers[currentBook.questions[currentQuizStep - 1].id] === optIndex.toString()}
                            onChange={(e) => setAnswers({...answers, [currentBook.questions[currentQuizStep - 1].id]: e.target.value})}
                            className="w-5 h-5 text-green-600"
                          />
                          <span className="text-sm text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Rating Step */}
              {currentQuizStep === currentBook.questions.length + 1 && (
                <div>
                  <div className="text-center mb-8">
                    <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Como foi sua experiência?
                    </h3>
                    <p className="text-xs text-gray-600">
                      Avalie o livro e deixe sua opinião
                    </p>
                  </div>

                  <div className="mb-8">
                    <p className="text-sm font-medium text-gray-900 mb-4 text-center">
                      Que nota você daria para este livro?
                    </p>
                    <div className="flex justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => {
                            playSound('click');
                            setRating(star);
                          }}
                          className="p-2 hover:scale-110 transition-transform"
                          data-testid={`star-${star}`}
                        >
                          <Star
                            className={`h-10 w-10 ${
                              star <= rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block">
                      <span className="text-sm font-medium text-gray-900 mb-2 block">Compartilhe sua opinião:</span>
                      <textarea
                        value={opinion}
                        onChange={(e) => setOpinion(e.target.value)}
                        className="w-full p-4 border-2 border-gray-200 rounded-xl text-sm focus:border-green-500 focus:outline-none transition-colors"
                        rows={4}
                        placeholder="O que você achou do livro? Sua opinião é importante para nós..."
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Robot Verification Step */}
              {currentQuizStep === currentBook.questions.length + 2 && (
                <div>
                  <div className="text-center mb-8">
                    <div className="mx-auto mb-4">
                      <img 
                        src="/logo-beta-reader.png" 
                        alt="Beta Reader Brasil" 
                        className="h-20 w-auto mx-auto animate-pulse"
                      />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Verificação de Segurança
                    </h3>
                    <p className="text-xs text-gray-600">
                      Por favor, confirme que você não é um robô
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8">
                    <div className="bg-white rounded-xl p-6 shadow-sm">
                      <label className="flex items-center gap-4 cursor-pointer">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={isRobotVerified}
                            onChange={(e) => {
                              playSound('click');
                              setIsRobotVerified(e.target.checked);
                            }}
                            className="sr-only"
                          />
                          <div className={`w-8 h-8 rounded-lg border-2 transition-all ${
                            isRobotVerified 
                              ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-500' 
                              : 'bg-white border-gray-300'
                          }`}>
                            {isRobotVerified && (
                              <Check className="h-7 w-7 text-white p-1" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            Não sou um robô
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            Marque esta caixa para confirmar que você é humano
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-700 text-center">
                        <Shield className="inline h-3 w-3 mr-1" />
                        Esta verificação ajuda a manter nossa plataforma segura
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
              <div className="flex gap-3">
                {currentQuizStep > 1 && (
                  <button
                    onClick={handleQuizBack}
                    className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Voltar
                  </button>
                )}
                
                <button
                  onClick={handleQuizNext}
                  disabled={
                    (currentQuizStep <= currentBook.questions.length && !answers[currentBook.questions[currentQuizStep - 1]?.id]) ||
                    (currentQuizStep === currentBook.questions.length + 1 && (rating === 0 || !opinion)) ||
                    (currentQuizStep === currentBook.questions.length + 2 && !isRobotVerified)
                  }
                  className={`flex-1 py-3 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                    ((currentQuizStep <= currentBook.questions.length && answers[currentBook.questions[currentQuizStep - 1]?.id]) ||
                    (currentQuizStep === currentBook.questions.length + 1 && rating > 0 && opinion) ||
                    (currentQuizStep === currentBook.questions.length + 2 && isRobotVerified))
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  data-testid="button-quiz-next"
                >
                  {currentQuizStep === totalQuizSteps ? 'Concluir' : 'Próximo'}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {showValidation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full blur-3xl opacity-50 -translate-y-32 translate-x-32"></div>
            
            <div className="relative">
              <div className="flex justify-center mb-4">
                <img 
                  src="/logo-beta-reader.png" 
                  alt="Beta Reader" 
                  className="h-14 w-auto"
                />
              </div>

              <h2 className="text-xl font-semibold text-gray-900 text-center mb-3">
                Validando Atividade
              </h2>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Progresso</span>
                  <span className="text-xs font-semibold text-green-600">
                    {Math.round((validationStep / 6) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${(validationStep / 6) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {/* Step 1 */}
                <div className="flex items-center gap-3">
                  {validationStep >= 1 ? (
                    <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  ) : validationStep === 0 ? (
                    <div className="w-7 h-7 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
                  ) : (
                    <div className="w-7 h-7 bg-gray-200 rounded-full"></div>
                  )}
                  <span className={`text-xs ${validationStep >= 1 ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                    <Shield className="inline h-3 w-3 mr-1" />
                    Verificando autenticidade
                  </span>
                </div>

                {/* Step 2 */}
                <div className="flex items-center gap-3">
                  {validationStep >= 2 ? (
                    <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  ) : validationStep === 1 ? (
                    <div className="w-7 h-7 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
                  ) : (
                    <div className="w-7 h-7 bg-gray-200 rounded-full"></div>
                  )}
                  <span className={`text-xs ${validationStep >= 2 ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                    <Clock className="inline h-3 w-3 mr-1" />
                    Analisando tempo de leitura
                  </span>
                </div>

                {/* Step 3 */}
                <div className="flex items-center gap-3">
                  {validationStep >= 3 ? (
                    <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  ) : validationStep === 2 ? (
                    <div className="w-7 h-7 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
                  ) : (
                    <div className="w-7 h-7 bg-gray-200 rounded-full"></div>
                  )}
                  <span className={`text-xs ${validationStep >= 3 ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                    <CheckCircle className="inline h-3 w-3 mr-1" />
                    Conferindo respostas do quiz
                  </span>
                </div>

                {/* Step 4 */}
                <div className="flex items-center gap-3">
                  {validationStep >= 4 ? (
                    <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  ) : validationStep === 3 ? (
                    <div className="w-7 h-7 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
                  ) : (
                    <div className="w-7 h-7 bg-gray-200 rounded-full"></div>
                  )}
                  <span className={`text-xs ${validationStep >= 4 ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                    <Star className="inline h-3 w-3 mr-1" />
                    Processando avaliação
                  </span>
                </div>

                {/* Step 5 */}
                <div className="flex items-center gap-3">
                  {validationStep >= 5 ? (
                    <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  ) : validationStep === 4 ? (
                    <div className="w-7 h-7 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
                  ) : (
                    <div className="w-7 h-7 bg-gray-200 rounded-full"></div>
                  )}
                  <span className={`text-xs ${validationStep >= 5 ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                    <Award className="inline h-3 w-3 mr-1" />
                    Calculando recompensa
                  </span>
                </div>

                {/* Step 6 */}
                <div className="flex items-center gap-3">
                  {validationStep >= 6 ? (
                    <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  ) : validationStep === 5 ? (
                    <div className="w-7 h-7 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
                  ) : (
                    <div className="w-7 h-7 bg-gray-200 rounded-full"></div>
                  )}
                  <span className={`text-xs ${validationStep >= 6 ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                    <TrendingUp className="inline h-3 w-3 mr-1" />
                    Atualizando sua carteira
                  </span>
                </div>
              </div>

              <div className="mt-6 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                <div className="flex items-center justify-center gap-2">
                  <Shield className="h-3 w-3 text-green-600" />
                  <p className="text-xs text-green-700 font-medium">
                    Validação segura em andamento
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reward Modal (continuation of validation) */}
      {showReward && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          {/* Enhanced Confetti Animation */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-[60]">
            {[...Array(80)].map((_, i) => {
              const colors = [
                '#10b981', '#059669', '#fbbf24', '#f59e0b', 
                '#ef4444', '#dc2626', '#8b5cf6', '#7c3aed',
                '#3b82f6', '#2563eb', '#ec4899', '#db2777',
                '#14b8a6', '#06b6d4', '#facc15', '#fb923c'
              ];
              const shapes = ['square', 'circle', 'triangle'];
              const shape = shapes[Math.floor(Math.random() * shapes.length)];
              const color = colors[Math.floor(Math.random() * colors.length)];
              const size = Math.random() * 8 + 6; // 6px to 14px
              const delay = Math.random() * 2;
              const duration = Math.random() * 2 + 3; // 3s to 5s
              const startX = Math.random() * 100;
              
              return (
                <div
                  key={i}
                  className="animate-confetti"
                  style={{
                    left: `${startX}%`,
                    top: '-10px',
                    animationDelay: `${delay}s`,
                    animationDuration: `${duration}s`
                  }}
                >
                  {shape === 'circle' ? (
                    <div
                      className="confetti-particle"
                      style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        backgroundColor: color,
                        borderRadius: '50%',
                        transform: `rotate(${Math.random() * 360}deg)`,
                        boxShadow: `0 0 ${size/2}px ${color}40`
                      }}
                    />
                  ) : shape === 'triangle' ? (
                    <div
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: `${size/2}px solid transparent`,
                        borderRight: `${size/2}px solid transparent`,
                        borderBottom: `${size}px solid ${color}`,
                        transform: `rotate(${Math.random() * 360}deg)`,
                        filter: `drop-shadow(0 0 ${size/3}px ${color}40)`
                      }}
                    />
                  ) : (
                    <div
                      className="confetti-particle"
                      style={{
                        width: `${size}px`,
                        height: `${size * 1.5}px`,
                        backgroundColor: color,
                        borderRadius: '2px',
                        transform: `rotate(${Math.random() * 360}deg)`,
                        boxShadow: `0 0 ${size/2}px ${color}40`
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-3xl max-w-md w-full p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 opacity-5"></div>
            
            <div className="relative">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl p-2">
                <img 
                  src="/logo-beta-reader.png" 
                  alt="Beta Reader Brasil" 
                  className="w-full h-full object-contain"
                />
              </div>

              <h1 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Pagamento Recebido!
              </h1>
              
              <div className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent text-center mb-6">
                + R$ {currentBook.reward},00
              </div>
              
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-3 mb-6">
                <p className="text-xs text-center text-amber-700">
                  Valor adicionado ao seu saldo!
                </p>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-5 space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">ID Transação:</span>
                  <span className="font-mono text-xs text-gray-900 bg-white px-2 py-1 rounded">{transactionId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Data/Hora:</span>
                  <span className="text-xs text-gray-900">{currentDate} às {currentTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Pago por:</span>
                  <span className="text-xs font-semibold text-gray-900">Bank Beta INC</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Pago para:</span>
                  <span className="text-xs font-semibold text-gray-900">
                    {(() => {
                      const userData = userDataManager.getUserData();
                      if (userData?.fullName) {
                        const names = userData.fullName.split(' ');
                        return `${names[0]} ${names[names.length - 1]}`;
                      }
                      return 'Leitor Beta';
                    })()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Status:</span>
                  <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Concluído
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  playSound('click');
                  setLocation("/dashboard");
                }}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl"
                data-testid="button-back-dashboard"
              >
                Voltar ao Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Plan Upgrade Modal */}
      <PlanUpgradeModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        totalEarned={userTotalEarned}
        onUpgrade={handlePlanUpgrade}
      />
    </div>
  );
}