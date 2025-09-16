import { 
  users, 
  books, 
  booksCompleted, 
  transactions, 
  userStats,
  userUtmTracking,
  readingProgress,
  friendships,
  userOnlineStatus,
  type User, 
  type InsertUser, 
  type Book,
  type InsertBook,
  type BookCompleted,
  type InsertBookCompleted,
  type Transaction,
  type InsertTransaction,
  type UserStats,
  type InsertUserStats,
  type UserUtmTracking,
  type InsertUserUtmTracking,
  type ReadingProgress,
  type InsertReadingProgress,
  type Friendship,
  type InsertFriendship,
  type UserOnlineStatus,
  type InsertUserOnlineStatus,
} from "@shared/schema";
import { db as getDb } from "./db";
import { eq, and, desc, gte, sql, notInArray, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  
  // Books operations
  getAllBooks(): Promise<Book[]>;
  getBookBySlug(slug: string): Promise<Book | undefined>;
  createBook(book: InsertBook): Promise<Book>;
  seedBooksIfNeeded(): Promise<void>;
  getUserBookFeed(userId: string): Promise<Book[]>;
  refreshUserBookFeed(userId: string): Promise<{ books: Book[], canRefresh: boolean }>;
  
  // Book completion operations
  getUserCompletedBooks(userId: string): Promise<BookCompleted[]>;
  isBookCompleted(userId: string, bookSlug: string): Promise<boolean>;
  completeBook(data: InsertBookCompleted): Promise<BookCompleted>;
  completeBookFlow(userId: string, bookSlug: string, payload: any): Promise<{ success: boolean, reward?: string, balance?: string, message?: string }>;
  
  // Transaction operations
  getUserTransactions(userId: string): Promise<Transaction[]>;
  createTransaction(data: InsertTransaction): Promise<Transaction>;
  
  // Stats operations
  getUserStats(userId: string): Promise<UserStats | undefined>;
  createOrUpdateUserStats(userId: string, data: Partial<UserStats>): Promise<UserStats>;
  updateUserBalance(userId: string, amount: number, type: 'add' | 'subtract'): Promise<void>;
  
  // UTM tracking operations
  saveUserUtmData(userId: string, data: InsertUserUtmTracking): Promise<UserUtmTracking>;
  getUserUtmData(userId: string): Promise<UserUtmTracking | undefined>;
  updateUtmConversion(userId: string, plan: string): Promise<void>;
  
  // Reading progress operations
  saveReadingProgress(data: InsertReadingProgress): Promise<ReadingProgress>;
  getReadingProgress(userId: string, bookSlug: string): Promise<ReadingProgress | undefined>;
  updateReadingProgress(userId: string, bookSlug: string, progress: number, timeSpent: number): Promise<void>;
  
  // Friendship operations
  getFriendship(userId: string, friendId: string): Promise<Friendship | undefined>;
  createFriendshipRequest(userId: string, friendId: string): Promise<Friendship>;
  getPendingFriendRequests(userId: string): Promise<any[]>;
  getUserFriends(userId: string): Promise<any[]>;
  acceptFriendRequest(friendshipId: string, userId: string): Promise<void>;
  rejectFriendRequest(friendshipId: string, userId: string): Promise<void>;
  removeFriend(userId: string, friendId: string): Promise<void>;
  
  // Online status operations
  updateOnlineStatus(userId: string, isOnline: boolean): Promise<void>;
  
  // Upgrade status operations
  getUpgradeStatus(userId: string): Promise<{ mustUpgrade: boolean, hasSeenPricing: boolean, plan: string }>;
  setHasSeenPricing(userId: string): Promise<void>;
  confirmUpgrade(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private getDb() {
    return getDb();
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.getDb().select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.getDb().select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    console.log('[createUser] Creating new user:', insertUser.email);
    
    const [user] = await getDb()
      .insert(users)
      .values(insertUser)
      .returning();
    
    console.log('[createUser] User created with ID:', user.id);
    
    // Create initial stats for the user
    const initialStats = {
      userId: user.id,
      totalBooksRead: 0,
      todayBooksRead: 0,
      weekBooksRead: 0,
      monthBooksRead: 0,
      todayEarnings: '0',
      weekEarnings: '0',
      monthEarnings: '0',
      averageRating: '0',
      streak: 0,
      easyBooksCount: 0,
      mediumBooksCount: 0,
      hardBooksCount: 0,
      weeklyProgress: '0',
      monthlyProgress: '0'
    };
    
    console.log('[createUser] Creating initial stats:', initialStats);
    
    const [createdStats] = await this.getDb().insert(userStats).values(initialStats).returning();
    
    console.log('[createUser] Initial stats created:', createdStats);
    
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [updated] = await this.getDb()
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  // Books operations
  async getAllBooks(): Promise<Book[]> {
    return await this.getDb()
      .select()
      .from(books)
      .where(eq(books.isActive, true))
      .orderBy(books.createdAt);
  }

  async getBookBySlug(slug: string): Promise<Book | undefined> {
    const [book] = await this.getDb()
      .select()
      .from(books)
      .where(and(eq(books.slug, slug), eq(books.isActive, true)));
    return book;
  }

  async createBook(insertBook: InsertBook): Promise<Book> {
    const [book] = await this.getDb()
      .insert(books)
      .values(insertBook)
      .returning();
    return book;
  }
  
  // Seed initial books catalog if needed
  async seedBooksIfNeeded(): Promise<void> {
    // Check if books already exist
    const existingBooks = await this.getDb().select().from(books).limit(1);
    if (existingBooks.length > 0) {
      return; // Books already seeded
    }

    const booksToSeed: InsertBook[] = [
      {
        slug: "o-poder-do-habito",
        title: "O Poder do Hábito",
        author: "Charles Duhigg", 
        synopsis: "Descubra como os hábitos funcionam e aprenda técnicas práticas para transformar sua rotina e alcançar seus objetivos com mais facilidade.",
        content: "Este livro explora a ciência dos hábitos e como podemos transformá-los para melhorar nossas vidas. Charles Duhigg apresenta casos fascinantes de empresas e pessoas que mudaram drasticamente ao entender o poder dos hábitos...",
        category: "Desenvolvimento Pessoal",
        difficulty: "Médio",
        readingTime: 8,
        reward: "45",
        pages: 408,
        chapters: 12,
        questions: [],
        isActive: true,
      },
      {
        slug: "mindset",
        title: "Mindset",
        author: "Carol S. Dweck",
        synopsis: "Explore a diferença entre mentalidade fixa e de crescimento, e como isso impacta diretamente seu sucesso pessoal e profissional.",
        content: "Carol Dweck revoluciona nossa compreensão sobre desenvolvimento pessoal ao revelar como nossas crenças sobre nossas próprias habilidades exercem tremendo impacto em nosso sucesso...",
        category: "Psicologia",
        difficulty: "Fácil",
        readingTime: 5,
        reward: "38",
        pages: 312,
        chapters: 8,
        questions: [],
        isActive: true,
      },
      {
        slug: "como-fazer-amigos",
        title: "Como Fazer Amigos",
        author: "Dale Carnegie",
        synopsis: "Aprenda técnicas infalíveis para melhorar seus relacionamentos, influenciar pessoas positivamente e construir conexões duradouras.",
        content: "Dale Carnegie apresenta princípios atemporais para construir relacionamentos significativos e influenciar pessoas de forma ética e positiva...",
        category: "Relacionamentos",
        difficulty: "Fácil",
        readingTime: 6,
        reward: "42",
        pages: 256,
        chapters: 10,
        questions: [],
        isActive: true,
      },
      {
        slug: "atomic-habits",
        title: "Hábitos Atômicos",
        author: "James Clear",
        synopsis: "Aprenda como pequenas mudanças podem gerar resultados extraordinários e construa sistemas eficazes para alcançar seus objetivos.",
        content: "James Clear desvenda o processo de formação de hábitos e apresenta um sistema comprovado para criar bons hábitos e eliminar os ruins. Com exemplos práticos e estratégias baseadas em ciência...",
        category: "Produtividade",
        difficulty: "Fácil",
        readingTime: 6,
        reward: "40",
        pages: 320,
        chapters: 18,
        questions: [],
        isActive: true,
      },
      {
        slug: "o-homem-mais-rico-da-babilonia",
        title: "O Homem Mais Rico da Babilônia",
        author: "George S. Clason",
        synopsis: "Descubra os segredos milenares da prosperidade através de parábolas da antiga Babilônia sobre finanças e sucesso.",
        content: "George S. Clason usa parábolas ambientadas na antiga Babilônia para ensinar lições atemporais sobre dinheiro, investimentos e prosperidade financeira...",
        category: "Finanças",
        difficulty: "Fácil",
        readingTime: 4,
        reward: "35",
        pages: 160,
        chapters: 7,
        questions: [],
        isActive: true,
      },
      {
        slug: "pai-rico-pai-pobre",
        title: "Pai Rico, Pai Pobre",
        author: "Robert Kiyosaki",
        synopsis: "Aprenda a diferença entre trabalhar por dinheiro e fazer o dinheiro trabalhar para você através de educação financeira.",
        content: "Robert Kiyosaki compartilha as lições que aprendeu com seus dois 'pais' - seu pai biológico (pai pobre) e o pai de seu melhor amigo (pai rico) - sobre dinheiro e investimentos...",
        category: "Finanças",
        difficulty: "Médio",
        readingTime: 7,
        reward: "45",
        pages: 336,
        chapters: 9,
        questions: [],
        isActive: true,
      },
      {
        slug: "o-poder-do-agora",
        title: "O Poder do Agora",
        author: "Eckhart Tolle",
        synopsis: "Descubra como viver plenamente o presente e libertar-se da ansiedade do futuro e dos arrependimentos do passado.",
        content: "Eckhart Tolle apresenta um guia espiritual para transcender o ego e encontrar paz interior através da consciência do momento presente...",
        category: "Espiritualidade",
        difficulty: "Médio",
        readingTime: 5,
        reward: "38",
        pages: 236,
        chapters: 10,
        questions: [],
        isActive: true,
      },
      {
        slug: "os-7-habitos",
        title: "Os 7 Hábitos das Pessoas Altamente Eficazes",
        author: "Stephen R. Covey",
        synopsis: "Desenvolva os hábitos essenciais para o sucesso pessoal e profissional através de princípios universais de eficácia.",
        content: "Stephen Covey apresenta uma abordagem baseada em princípios para resolver problemas pessoais e profissionais, com insights profundos e conselhos práticos...",
        category: "Liderança",
        difficulty: "Médio",
        readingTime: 9,
        reward: "50",
        pages: 432,
        chapters: 7,
        questions: [],
        isActive: true,
      },
      {
        slug: "a-sutil-arte",
        title: "A Sutil Arte de Ligar o F*da-se",
        author: "Mark Manson",
        synopsis: "Uma abordagem contraintuitiva para viver bem: pare de tentar ser positivo o tempo todo e aceite suas limitações.",
        content: "Mark Manson oferece uma perspectiva refrescante sobre desenvolvimento pessoal, argumentando que devemos aceitar nossas limitações e focar no que realmente importa...",
        category: "Desenvolvimento Pessoal",
        difficulty: "Fácil",
        readingTime: 5,
        reward: "38",
        pages: 224,
        chapters: 9,
        questions: [],
        isActive: true,
      },
      {
        slug: "rapido-e-devagar",
        title: "Rápido e Devagar",
        author: "Daniel Kahneman",
        synopsis: "Entenda como sua mente toma decisões, os vieses cognitivos que afetam seu julgamento e como pensar de forma mais racional.",
        content: "Daniel Kahneman, ganhador do Nobel, nos leva em uma jornada pela mente humana e os dois sistemas que dirigem a forma como pensamos...",
        category: "Psicologia",
        difficulty: "Difícil",
        readingTime: 10,
        reward: "48",
        pages: 512,
        chapters: 15,
        questions: [],
        isActive: true,
      },
      {
        slug: "pai-rico-pai-pobre",
        title: "Pai Rico, Pai Pobre",
        author: "Robert Kiyosaki",
        synopsis: "Aprenda lições fundamentais sobre educação financeira, investimentos e como fazer o dinheiro trabalhar para você.",
        content: "Robert Kiyosaki conta a história de seus dois 'pais' - seu pai biológico e o pai de seu melhor amigo - e as formas diferentes como cada homem moldou seus pensamentos sobre dinheiro...",
        category: "Finanças",
        difficulty: "Médio",
        readingTime: 7,
        reward: "40",
        pages: 336,
        chapters: 9,
        questions: [],
        isActive: true,
      },
      {
        slug: "a-arte-da-guerra",
        title: "A Arte da Guerra",
        author: "Sun Tzu",
        synopsis: "Estratégias milenares de liderança e tática que podem ser aplicadas nos negócios e na vida pessoal.",
        content: "Um dos tratados militares mais antigos do mundo, A Arte da Guerra de Sun Tzu oferece sabedoria atemporal sobre estratégia, liderança e vitória...",
        category: "Estratégia",
        difficulty: "Fácil",
        readingTime: 5,
        reward: "35",
        pages: 160,
        chapters: 13,
        questions: [],
        isActive: true,
      },
      {
        slug: "o-monge-e-o-executivo",
        title: "O Monge e o Executivo",
        author: "James C. Hunter",
        synopsis: "Uma história sobre a essência da liderança servidora e como liderar servindo aos outros.",
        content: "John Daily tem problemas em casa e no trabalho. Para tentar resolver seus dilemas, ele participa de um retiro em um mosteiro...",
        category: "Liderança",
        difficulty: "Fácil",
        readingTime: 6,
        reward: "43",
        pages: 144,
        chapters: 7,
        questions: [],
        isActive: true,
      },
      {
        slug: "os-segredos-da-mente-milionaria",
        title: "Os Segredos da Mente Milionária",
        author: "T. Harv Eker",
        synopsis: "Descubra como sua programação mental determina seu sucesso financeiro e aprenda a reprogramar sua mente para a riqueza.",
        content: "T. Harv Eker explica como identificamos e revisamos nosso 'modelo de dinheiro', desafiando nossos pensamentos limitantes...",
        category: "Finanças",
        difficulty: "Médio",
        readingTime: 7,
        reward: "44",
        pages: 208,
        chapters: 17,
        questions: [],
        isActive: true,
      },
      {
        slug: "o-poder-do-agora",
        title: "O Poder do Agora",
        author: "Eckhart Tolle",
        synopsis: "Um guia espiritual que ensina a importância de viver o presente e se libertar dos pensamentos negativos.",
        content: "Eckhart Tolle nos mostra que para encontrar a verdadeira paz e realização, precisamos nos desapegar da nossa mente e viver plenamente o momento presente...",
        category: "Espiritualidade",
        difficulty: "Médio",
        readingTime: 8,
        reward: "46",
        pages: 236,
        chapters: 10,
        questions: [],
        isActive: true,
      },
      {
        slug: "habitos-atomicos",
        title: "Hábitos Atômicos",
        author: "James Clear",
        synopsis: "Um método fácil e comprovado de criar bons hábitos e se livrar dos maus através de pequenas mudanças diárias.",
        content: "James Clear apresenta um sistema prático para fazer pequenas mudanças que levam a resultados notáveis. Aprenda como pequenos hábitos podem ter um impacto transformador...",
        category: "Produtividade",
        difficulty: "Fácil",
        readingTime: 6,
        reward: "41",
        pages: 320,
        chapters: 20,
        questions: [],
        isActive: true,
      },
      {
        slug: "o-homem-mais-rico-da-babilonia",
        title: "O Homem Mais Rico da Babilônia",
        author: "George S. Clason",
        synopsis: "Lições financeiras atemporais através de parábolas da antiga Babilônia sobre como construir e manter riqueza.",
        content: "Através de histórias cativantes ambientadas na antiga Babilônia, George Clason transmite sabedoria financeira que permanece relevante até hoje...",
        category: "Finanças",
        difficulty: "Fácil",
        readingTime: 5,
        reward: "37",
        pages: 160,
        chapters: 8,
        questions: [],
        isActive: true,
      },
      {
        slug: "pense-e-enriqueca",
        title: "Pense e Enriqueça",
        author: "Napoleon Hill",
        synopsis: "Os 13 princípios do sucesso descobertos após 20 anos estudando os homens mais ricos do mundo.",
        content: "Napoleon Hill passou 20 anos estudando os homens mais bem-sucedidos de sua época e destilou sua sabedoria em 13 princípios que qualquer pessoa pode aplicar...",
        category: "Sucesso",
        difficulty: "Médio",
        readingTime: 9,
        reward: "47",
        pages: 388,
        chapters: 13,
        questions: [],
        isActive: true,
      }
    ];

    // Insert all books
    await this.getDb().insert(books).values(booksToSeed);
    console.log('[seedBooksIfNeeded] Seeded', booksToSeed.length, 'books');
  }
  
  // Get personalized book feed for user
  async getUserBookFeed(userId: string): Promise<Book[]> {
    // Get list of books user has already completed
    const completedBooks = await this.getUserCompletedBooks(userId);
    const completedSlugs = completedBooks.map(b => b.bookSlug);
    
    // Get all active books first
    const allActiveBooks = await this.getDb()
      .select()
      .from(books)
      .where(eq(books.isActive, true));
    
    let availableBooks = allActiveBooks;
    
    // Filter out completed books if any
    if (completedSlugs.length > 0) {
      const unreadBooks = allActiveBooks.filter(book => !completedSlugs.includes(book.slug));
      
      if (unreadBooks.length > 0) {
        // User has unread books available
        availableBooks = unreadBooks;
      } else {
        // User has read all books - allow re-reading by showing all books
        console.log(`[getUserBookFeed] User ${userId} has read all books. Allowing re-reading.`);
        availableBooks = allActiveBooks;
      }
    }
    
    // Shuffle for variety in each feed refresh
    const shuffled = [...availableBooks].sort(() => Math.random() - 0.5);
    
    // Return up to 3 books for the feed
    return shuffled.slice(0, 3);
  }
  
  // Refresh user's book feed with throttle
  async refreshUserBookFeed(userId: string): Promise<{ books: Book[], canRefresh: boolean }> {
    // Check last refresh time (stored in user metadata or session)
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Simple throttle: Check if less than 5 seconds since last update
    const lastRefresh = user.updatedAt;
    const now = new Date();
    const timeSinceLastRefresh = now.getTime() - lastRefresh.getTime();
    const canRefresh = timeSinceLastRefresh >= 5000; // 5 seconds
    
    if (!canRefresh) {
      // Return current feed without refreshing
      const books = await this.getUserBookFeed(userId);
      return { books, canRefresh: false };
    }
    
    // Update user's last refresh time
    await this.updateUser(userId, { updatedAt: now });
    
    // Get refreshed book feed
    const books = await this.getUserBookFeed(userId);
    return { books, canRefresh: true };
  }
  
  // Complete book flow with validation and rewards
  async completeBookFlow(userId: string, bookSlug: string, payload: any): Promise<{ success: boolean, reward?: string, balance?: string, message?: string }> {
    try {
      // Get book details
      const book = await this.getBookBySlug(bookSlug);
      if (!book) {
        return { success: false, message: "Livro não encontrado" };
      }
      
      // Check if already completed
      const isCompleted = await this.isBookCompleted(userId, bookSlug);
      if (isCompleted) {
        return { success: false, message: "Livro já foi concluído anteriormente" };
      }
      
      // Server-side reward computation (never trust client)
      const reward = book.reward;
      
      // Complete the book and update balance
      const completion = await this.completeBook({
        userId,
        bookSlug,
        bookId: book.id,
        title: book.title,
        author: book.author,
        reward,
        rating: payload.rating || 5,
        readingTime: payload.timeSpent || 300,
      });
      
      // Get updated user balance
      const user = await this.getUser(userId);
      
      return {
        success: true,
        reward,
        balance: user?.balance || "0",
        message: "Livro concluído com sucesso!"
      };
    } catch (error: any) {
      console.error('[completeBookFlow] Error:', error);
      return {
        success: false,
        message: error.message || "Erro ao completar o livro"
      };
    }
  }

  // Book completion operations
  async getUserCompletedBooks(userId: string): Promise<BookCompleted[]> {
    return await this.getDb()
      .select()
      .from(booksCompleted)
      .where(eq(booksCompleted.userId, userId))
      .orderBy(desc(booksCompleted.completedAt));
  }

  async isBookCompleted(userId: string, bookSlug: string): Promise<boolean> {
    const [result] = await this.getDb()
      .select()
      .from(booksCompleted)
      .where(
        and(
          eq(booksCompleted.userId, userId),
          eq(booksCompleted.bookSlug, bookSlug)
        )
      );
    return !!result;
  }

  async completeBook(data: InsertBookCompleted): Promise<BookCompleted> {
    // Start a transaction to ensure data consistency
    return await this.getDb().transaction(async (tx) => {
      // Check if book already completed
      const [existing] = await tx
        .select()
        .from(booksCompleted)
        .where(
          and(
            eq(booksCompleted.userId, data.userId),
            eq(booksCompleted.bookSlug, data.bookSlug)
          )
        );
      
      if (existing) {
        throw new Error("Book already completed");
      }

      // Insert book completion
      const [completion] = await tx
        .insert(booksCompleted)
        .values(data)
        .returning();

      // Get user's current balance
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, data.userId));

      const rewardAmount = Number(data.reward);
      const currentBalance = Number(user.balance);
      const newBalance = currentBalance + rewardAmount;

      // Update user balance and earnings
      await tx
        .update(users)
        .set({
          balance: newBalance.toString(),
          totalEarnings: (Number(user.totalEarnings) + rewardAmount).toString(),
          canWithdraw: newBalance >= 50, // Can withdraw after R$50
          updatedAt: new Date(),
        })
        .where(eq(users.id, data.userId));

      // Create transaction record
      await tx.insert(transactions).values({
        userId: data.userId,
        type: 'earning',
        description: `Leitura completa: ${data.title}`,
        amount: data.reward,
        balanceBefore: currentBalance.toString(),
        balanceAfter: newBalance.toString(),
        referenceId: completion.id,
      });

      // Update user stats
      await this.updateStatsAfterCompletion(tx, data.userId, rewardAmount);

      return completion;
    });
  }

  // Transaction operations
  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return await this.getDb()
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  async createTransaction(data: InsertTransaction): Promise<Transaction> {
    const [transaction] = await this.getDb()
      .insert(transactions)
      .values(data)
      .returning();
    return transaction;
  }

  // Stats operations
  async getUserStats(userId: string): Promise<UserStats | undefined> {
    console.log('[getUserStats] Fetching stats for userId:', userId);
    
    const [stats] = await this.getDb()
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId));
    
    console.log('[getUserStats] Stats found:', !!stats);
    if (stats) {
      console.log('[getUserStats] Stats data:', {
        id: stats.id,
        userId: stats.userId,
        totalBooksRead: stats.totalBooksRead,
        todayEarnings: stats.todayEarnings,
        weekEarnings: stats.weekEarnings,
        monthEarnings: stats.monthEarnings
      });
    }
    
    return stats;
  }
  
  // Recalculate all user statistics from scratch based on existing data
  async recalculateUserStats(userId: string): Promise<UserStats> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Count books for each period
    const [totalBooksResult] = await this.getDb()
      .select({ count: sql`count(*)` })
      .from(booksCompleted)
      .where(eq(booksCompleted.userId, userId));
      
    const [todayBooksResult] = await this.getDb()
      .select({ count: sql`count(*)` })
      .from(booksCompleted)
      .where(
        and(
          eq(booksCompleted.userId, userId),
          gte(booksCompleted.completedAt, todayStart)
        )
      );
      
    const [weekBooksResult] = await this.getDb()
      .select({ count: sql`count(*)` })
      .from(booksCompleted)
      .where(
        and(
          eq(booksCompleted.userId, userId),
          gte(booksCompleted.completedAt, weekStart)
        )
      );
      
    const [monthBooksResult] = await this.getDb()
      .select({ count: sql`count(*)` })
      .from(booksCompleted)
      .where(
        and(
          eq(booksCompleted.userId, userId),
          gte(booksCompleted.completedAt, monthStart)
        )
      );
      
    // Calculate earnings for each period
    const [todayEarningsResult] = await this.getDb()
      .select({ sum: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, 'earning'),
          gte(transactions.createdAt, todayStart)
        )
      );
      
    const [weekEarningsResult] = await this.getDb()
      .select({ sum: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, 'earning'),
          gte(transactions.createdAt, weekStart)
        )
      );
      
    const [monthEarningsResult] = await this.getDb()
      .select({ sum: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, 'earning'),
          gte(transactions.createdAt, monthStart)
        )
      );
      
    // Calculate average rating
    const [avgRatingResult] = await this.getDb()
      .select({ avg: sql<number>`COALESCE(AVG(rating), 0)` })
      .from(booksCompleted)
      .where(eq(booksCompleted.userId, userId));
      
    // Calculate difficulty counts
    const completedBooks = await this.getDb()
      .select()
      .from(booksCompleted)
      .where(eq(booksCompleted.userId, userId));
      
    // For now, set difficulty counts to 0 (will fix properly later)
    const easyCount = 0;
    const mediumCount = 0;
    const hardCount = 0;
    
    // Calculate streak - simplified version
    let streak = 0;
    if (completedBooks.length > 0) {
      // Just count consecutive days from today
      streak = 1; // Simple implementation for now
    }
    
    // Get user for monthly goal
    const [user] = await this.getDb()
      .select()
      .from(users)
      .where(eq(users.id, userId));
      
    const monthlyGoal = Number(user?.monthlyGoal || 500);
    const weeklyGoal = monthlyGoal / 4;
    
    // Create or update stats
    const statsData = {
      totalBooksRead: Number(totalBooksResult.count),
      todayBooksRead: Number(todayBooksResult.count),
      weekBooksRead: Number(weekBooksResult.count),
      monthBooksRead: Number(monthBooksResult.count),
      todayEarnings: todayEarningsResult.sum.toString(),
      weekEarnings: weekEarningsResult.sum.toString(),
      monthEarnings: monthEarningsResult.sum.toString(),
      averageRating: avgRatingResult.avg.toString(),
      easyBooksCount: easyCount,
      mediumBooksCount: mediumCount,
      hardBooksCount: hardCount,
      streak: streak,
      weeklyProgress: weeklyGoal > 0 ? ((Number(weekEarningsResult.sum) / weeklyGoal) * 100).toFixed(2) : "0",
      monthlyProgress: monthlyGoal > 0 ? ((Number(monthEarningsResult.sum) / monthlyGoal) * 100).toFixed(2) : "0",
      updatedAt: new Date(),
    };
    
    const [existing] = await this.getDb()
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId));
      
    if (existing) {
      const [updated] = await this.getDb()
        .update(userStats)
        .set(statsData)
        .where(eq(userStats.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await this.getDb()
        .insert(userStats)
        .values({ ...statsData, userId })
        .returning();
      return created;
    }
  }

  async createOrUpdateUserStats(userId: string, data: Partial<UserStats>): Promise<UserStats> {
    const [existing] = await this.getDb()
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId));

    if (existing) {
      const [updated] = await this.getDb()
        .update(userStats)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(userStats.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await this.getDb()
        .insert(userStats)
        .values({ ...data, userId })
        .returning();
      return created;
    }
  }

  async updateUserBalance(userId: string, amount: number, type: 'add' | 'subtract'): Promise<void> {
    const [user] = await this.getDb()
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) throw new Error("User not found");

    const currentBalance = Number(user.balance);
    const newBalance = type === 'add' ? currentBalance + amount : currentBalance - amount;
    
    if (newBalance < 0) throw new Error("Insufficient balance");

    await this.getDb()
      .update(users)
      .set({
        balance: newBalance.toString(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // UTM tracking operations
  async saveUserUtmData(userId: string, data: InsertUserUtmTracking): Promise<UserUtmTracking> {
    // Check if UTM data already exists for user
    const [existing] = await this.getDb()
      .select()
      .from(userUtmTracking)
      .where(eq(userUtmTracking.userId, userId));
    
    if (existing) {
      // Update only if new data has more complete UTM params
      if (data.utmSource || data.utmCampaign || data.fbclid) {
        const [updated] = await this.getDb()
          .update(userUtmTracking)
          .set({
            ...data,
            userId,
          })
          .where(eq(userUtmTracking.userId, userId))
          .returning();
        return updated;
      }
      return existing;
    }
    
    const [tracking] = await this.getDb()
      .insert(userUtmTracking)
      .values({
        ...data,
        userId,
      })
      .returning();
    return tracking;
  }

  async getUserUtmData(userId: string): Promise<UserUtmTracking | undefined> {
    const [tracking] = await this.getDb()
      .select()
      .from(userUtmTracking)
      .where(eq(userUtmTracking.userId, userId));
    return tracking;
  }

  async updateUtmConversion(userId: string, plan: string): Promise<void> {
    await this.getDb()
      .update(userUtmTracking)
      .set({
        conversionDate: new Date(),
        conversionPlan: plan,
      })
      .where(eq(userUtmTracking.userId, userId));
  }

  // Reading progress operations
  async saveReadingProgress(data: InsertReadingProgress): Promise<ReadingProgress> {
    // Check if progress already exists
    const [existing] = await this.getDb()
      .select()
      .from(readingProgress)
      .where(
        and(
          eq(readingProgress.userId, data.userId),
          eq(readingProgress.bookSlug, data.bookSlug)
        )
      );
    
    if (existing) {
      const [updated] = await this.getDb()
        .update(readingProgress)
        .set({
          ...data,
          lastReadAt: new Date(),
        })
        .where(eq(readingProgress.id, existing.id))
        .returning();
      return updated;
    }
    
    const [progress] = await this.getDb()
      .insert(readingProgress)
      .values(data)
      .returning();
    return progress;
  }

  async getReadingProgress(userId: string, bookSlug: string): Promise<ReadingProgress | undefined> {
    const [progress] = await this.getDb()
      .select()
      .from(readingProgress)
      .where(
        and(
          eq(readingProgress.userId, userId),
          eq(readingProgress.bookSlug, bookSlug)
        )
      );
    return progress;
  }

  async updateReadingProgress(userId: string, bookSlug: string, progress: number, timeSpent: number): Promise<void> {
    const [existing] = await this.getDb()
      .select()
      .from(readingProgress)
      .where(
        and(
          eq(readingProgress.userId, userId),
          eq(readingProgress.bookSlug, bookSlug)
        )
      );
    
    if (existing) {
      await this.getDb()
        .update(readingProgress)
        .set({
          progress,
          timeSpent: existing.timeSpent + timeSpent,
          lastReadAt: new Date(),
          isCompleted: progress >= 100,
        })
        .where(eq(readingProgress.id, existing.id));
    } else {
      await this.getDb()
        .insert(readingProgress)
        .values({
          userId,
          bookSlug,
          bookId: '', // Will need to look up book ID
          progress,
          timeSpent,
          isCompleted: progress >= 100,
        });
    }
  }

  // Helper method to update stats after book completion
  private async updateStatsAfterCompletion(tx: any, userId: string, rewardAmount: number) {
    console.log('[updateStatsAfterCompletion] Starting stats update for user:', userId, 'with reward:', rewardAmount);
    
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);

    // Get current stats
    const [stats] = await tx
      .select()
      .from(userStats)
      .where(eq(userStats.userId, userId));

    console.log('[updateStatsAfterCompletion] Current stats found:', !!stats, stats ? 'Stats ID: ' + stats.id : 'No stats');

    if (!stats) {
      console.log('[updateStatsAfterCompletion] Creating new stats for user:', userId);
      // Create new stats if doesn't exist
      const newStats = {
        userId,
        totalBooksRead: 1,
        todayBooksRead: 1,
        weekBooksRead: 1,
        monthBooksRead: 1,
        todayEarnings: rewardAmount.toString(),
        weekEarnings: rewardAmount.toString(),
        monthEarnings: rewardAmount.toString(),
        averageRating: '0',
        streak: 1,
        lastReadDate: new Date(), // Use new Date() instead of now
        easyBooksCount: 0,
        mediumBooksCount: 0,
        hardBooksCount: 0,
        weeklyProgress: '0',
        monthlyProgress: '0'
      };
      
      console.log('[updateStatsAfterCompletion] Inserting new stats:', newStats);
      
      const [insertedStats] = await tx.insert(userStats).values(newStats).returning();
      console.log('[updateStatsAfterCompletion] Stats inserted successfully:', insertedStats);
    } else {
      // Calculate books read today, this week, this month
      const todayBooks = await tx
        .select({ count: sql`count(*)` })
        .from(booksCompleted)
        .where(
          and(
            eq(booksCompleted.userId, userId),
            gte(booksCompleted.completedAt, todayStart)
          )
        );

      const weekBooks = await tx
        .select({ count: sql`count(*)` })
        .from(booksCompleted)
        .where(
          and(
            eq(booksCompleted.userId, userId),
            gte(booksCompleted.completedAt, weekStart)
          )
        );

      const monthBooks = await tx
        .select({ count: sql`count(*)` })
        .from(booksCompleted)
        .where(
          and(
            eq(booksCompleted.userId, userId),
            gte(booksCompleted.completedAt, monthStart)
          )
        );

      // Calculate earnings for periods
      const todayEarnings = await tx
        .select({ sum: sql`COALESCE(SUM(amount), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, 'earning'),
            gte(transactions.createdAt, todayStart)
          )
        );

      const weekEarnings = await tx
        .select({ sum: sql`COALESCE(SUM(amount), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, 'earning'),
            gte(transactions.createdAt, weekStart)
          )
        );

      const monthEarnings = await tx
        .select({ sum: sql`COALESCE(SUM(amount), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, 'earning'),
            gte(transactions.createdAt, monthStart)
          )
        );

      // Calculate average rating
      const avgRating = await tx
        .select({ avg: sql`COALESCE(AVG(rating), 0)` })
        .from(booksCompleted)
        .where(eq(booksCompleted.userId, userId));

      // Update stats
      const updatedData = {
        totalBooksRead: Number(stats.totalBooksRead) + 1,
        todayBooksRead: Number(todayBooks[0].count),
        weekBooksRead: Number(weekBooks[0].count),
        monthBooksRead: Number(monthBooks[0].count),
        todayEarnings: todayEarnings[0].sum.toString(),
        weekEarnings: weekEarnings[0].sum.toString(),
        monthEarnings: monthEarnings[0].sum.toString(),
        averageRating: avgRating[0].avg.toString(),
        lastReadDate: new Date(), // Use new Date() instead of now
        updatedAt: new Date(),
      };
      
      console.log('[updateStatsAfterCompletion] Updating existing stats with:', updatedData);
      
      const [updatedStats] = await tx
        .update(userStats)
        .set(updatedData)
        .where(eq(userStats.userId, userId))
        .returning();
        
      console.log('[updateStatsAfterCompletion] Stats updated successfully:', updatedStats);
    }
  }
  
  
  async getAllUsersWithStats(): Promise<any[]> {
    const usersData = await this.getDb()
      .select({
        user: users,
        stats: userStats,
      })
      .from(users)
      .leftJoin(userStats, eq(users.id, userStats.userId));
      
    return usersData;
  }

  // Friendship operations
  async getFriendship(userId: string, friendId: string): Promise<Friendship | undefined> {
    const [friendship] = await this.getDb()
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.userId, userId),
          eq(friendships.friendId, friendId)
        )
      );
    
    if (friendship) return friendship;
    
    // Check reverse direction
    const [reverseFriendship] = await this.getDb()
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.userId, friendId),
          eq(friendships.friendId, userId)
        )
      );
    
    return reverseFriendship;
  }

  async createFriendshipRequest(userId: string, friendId: string): Promise<Friendship> {
    const [friendship] = await this.getDb()
      .insert(friendships)
      .values({
        userId,
        friendId,
        status: 'pending',
        requestedBy: userId,
      })
      .returning();
    
    // Also create the reverse relationship for easier queries
    await this.getDb()
      .insert(friendships)
      .values({
        userId: friendId,
        friendId: userId,
        status: 'pending',
        requestedBy: userId,
      })
      .onConflictDoNothing();
    
    return friendship;
  }

  async getPendingFriendRequests(userId: string): Promise<any[]> {
    const requests = await this.getDb()
      .select({
        friendship: friendships,
        requester: users,
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.requestedBy, users.id))
      .where(
        and(
          eq(friendships.friendId, userId),
          eq(friendships.status, 'pending'),
          sql`${friendships.requestedBy} != ${userId}`
        )
      );
    
    return requests;
  }

  async getUserFriends(userId: string): Promise<any[]> {
    const friends = await this.getDb()
      .select({
        friendship: friendships,
        friend: users,
        onlineStatus: userOnlineStatus,
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.friendId, users.id))
      .leftJoin(userOnlineStatus, eq(users.id, userOnlineStatus.userId))
      .where(
        and(
          eq(friendships.userId, userId),
          eq(friendships.status, 'accepted')
        )
      );
    
    return friends;
  }

  async acceptFriendRequest(friendshipId: string, userId: string): Promise<void> {
    // Update both directions to accepted
    await this.getDb()
      .update(friendships)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
      })
      .where(eq(friendships.id, friendshipId));
    
    // Get the friendship to update the reverse
    const [friendship] = await this.getDb()
      .select()
      .from(friendships)
      .where(eq(friendships.id, friendshipId));
    
    if (friendship) {
      // Update reverse friendship
      await this.getDb()
        .update(friendships)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
        })
        .where(
          and(
            eq(friendships.userId, friendship.friendId),
            eq(friendships.friendId, friendship.userId)
          )
        );
    }
  }

  async rejectFriendRequest(friendshipId: string, userId: string): Promise<void> {
    // Delete both directions
    const [friendship] = await this.getDb()
      .select()
      .from(friendships)
      .where(eq(friendships.id, friendshipId));
    
    if (friendship) {
      await this.getDb()
        .delete(friendships)
        .where(eq(friendships.id, friendshipId));
      
      // Delete reverse
      await this.getDb()
        .delete(friendships)
        .where(
          and(
            eq(friendships.userId, friendship.friendId),
            eq(friendships.friendId, friendship.userId)
          )
        );
    }
  }

  async removeFriend(userId: string, friendId: string): Promise<void> {
    // Delete both directions
    await getDb()
      .delete(friendships)
      .where(
        and(
          eq(friendships.userId, userId),
          eq(friendships.friendId, friendId)
        )
      );
    
    await getDb()
      .delete(friendships)
      .where(
        and(
          eq(friendships.userId, friendId),
          eq(friendships.friendId, userId)
        )
      );
  }

  // Online status operations
  async updateOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await getDb()
      .insert(userOnlineStatus)
      .values({
        userId,
        isOnline,
        lastSeen: new Date(),
      })
      .onConflictDoUpdate({
        target: userOnlineStatus.userId,
        set: {
          isOnline,
          lastSeen: new Date(),
        },
      });
  }
  
  // Upgrade status operations
  async getUpgradeStatus(userId: string): Promise<{ mustUpgrade: boolean, hasSeenPricing: boolean, plan: string }> {
    const user = await this.getUser(userId);
    if (!user) {
      return { mustUpgrade: false, hasSeenPricing: false, plan: 'free' };
    }
    return {
      mustUpgrade: user.mustUpgrade || false,
      hasSeenPricing: user.hasSeenPricing || false,
      plan: user.plan || 'free'
    };
  }
  
  async setHasSeenPricing(userId: string): Promise<void> {
    await this.getDb()
      .update(users)
      .set({ hasSeenPricing: true, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
  
  async confirmUpgrade(userId: string): Promise<void> {
    await this.getDb()
      .update(users)
      .set({ 
        plan: 'premium',
        mustUpgrade: false,
        hasSeenPricing: false,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();