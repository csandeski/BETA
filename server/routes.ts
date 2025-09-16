import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertBookSchema, 
  insertBookCompletedSchema,
  insertTransactionSchema,
  insertUserUtmTrackingSchema,
  insertReadingProgressSchema
} from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Extend Express Request type to include session
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    isAdmin?: boolean;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'beta-reader-brasil-secret-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Permitir cookies em HTTP (desenvolvimento)
      httpOnly: true,
      sameSite: 'lax', // Importante para CSRF protection
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
  }));
  
  // Middleware to check if user exists - now uses session
  const requireUser = async (req: Request, res: Response, next: any) => {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ message: "User ID required" });
    }
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    (req as any).user = user;
    next();
  };

  // Auth status endpoint
  app.get('/api/auth/status', (req: Request, res: Response) => {
    res.json({ 
      isLoggedIn: !!req.session.userId,
      userId: req.session.userId || null 
    });
  });
  
  // Logout endpoint
  app.post('/api/logout', (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ message: 'Logged out successfully' });
    });
  });
  
  // User routes
  app.post('/api/users/register', async (req: Request, res: Response) => {
    try {
      const { password, ...userData } = req.body;
      
      // Validate password
      if (!password || password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Parse user data with hashed password
      const data = insertUserSchema.parse({
        ...userData,
        password: hashedPassword
      });
      
      // Check if user with email already exists
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }
      
      const user = await storage.createUser(data);
      
      // Set session userId
      req.session.userId = user.id;
      
      // Don't send password back to client
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to register user" });
    }
  });

  app.get('/api/users/me', requireUser, async (req: Request, res: Response) => {
    res.json((req as any).user);
  });

  app.patch('/api/users/me', requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const updated = await storage.updateUser(userId, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update user" });
    }
  });

  app.post('/api/users/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Set session userId
      req.session.userId = user.id;
      
      // Don't send password back to client
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Login failed" });
    }
  });

  // UTM tracking routes
  app.post('/api/utm/track', async (req: Request, res: Response) => {
    try {
      const { userId, ...utmData } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }
      
      const data = insertUserUtmTrackingSchema.parse({
        userId,
        utmSource: utmData.utm_source,
        utmMedium: utmData.utm_medium,
        utmCampaign: utmData.utm_campaign,
        utmTerm: utmData.utm_term,
        utmContent: utmData.utm_content,
        fbclid: utmData.fbclid,
        referrer: utmData.referrer,
        landingPage: utmData.landingPage,
        userAgent: utmData.userAgent,
      });
      
      const tracking = await storage.saveUserUtmData(userId, data);
      res.json(tracking);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to save UTM data" });
    }
  });

  app.post('/api/utm/conversion', requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { plan } = req.body;
      
      if (!plan) {
        return res.status(400).json({ message: "Plan required" });
      }
      
      await storage.updateUtmConversion(userId, plan);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to track conversion" });
    }
  });

  app.get('/api/utm/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const tracking = await storage.getUserUtmData(userId);
      res.json(tracking || {});
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get UTM data" });
    }
  });

  // Reading progress routes
  app.post('/api/progress/save', requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { bookSlug, bookId, progress, timeSpent } = req.body;
      
      const data = insertReadingProgressSchema.parse({
        userId,
        bookId: bookId || '',
        bookSlug,
        progress: progress || 0,
        timeSpent: timeSpent || 0,
      });
      
      const savedProgress = await storage.saveReadingProgress(data);
      res.json(savedProgress);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to save progress" });
    }
  });

  app.get('/api/progress/:bookSlug', requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { bookSlug } = req.params;
      const progress = await storage.getReadingProgress(userId, bookSlug);
      res.json(progress || { progress: 0, timeSpent: 0 });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get progress" });
    }
  });

  app.patch('/api/progress/update', requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { bookSlug, progress, timeSpent } = req.body;
      
      await storage.updateReadingProgress(userId, bookSlug, progress, timeSpent);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update progress" });
    }
  });

  // Stats routes
  app.get('/api/users/stats', requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const stats = await storage.getUserStats(userId);
      if (!stats) {
        // Create default stats if not exists
        const newStats = await storage.createOrUpdateUserStats(userId, {});
        return res.json(newStats);
      }
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get stats" });
    }
  });

  // Books routes
  app.get('/api/books', async (req: Request, res: Response) => {
    try {
      const books = await storage.getAllBooks();
      res.json(books);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get books" });
    }
  });

  // Book feed routes - MUST be before :slug route to avoid conflicts
  app.get('/api/books/feed', requireUser, async (req: Request, res: Response) => {
    try {
      // First seed books if needed (on first call)
      await storage.seedBooksIfNeeded();
      
      const userId = (req as any).user.id;
      const books = await storage.getUserBookFeed(userId);
      res.json(books);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get book feed" });
    }
  });
  
  app.post('/api/books/refresh', requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const result = await storage.refreshUserBookFeed(userId);
      
      if (!result.canRefresh) {
        return res.status(429).json({ 
          message: "Por favor aguarde alguns segundos antes de atualizar novamente",
          books: result.books,
          canRefresh: false 
        });
      }
      
      res.json({ 
        books: result.books, 
        canRefresh: true,
        message: "Livros atualizados com sucesso!" 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to refresh book feed" });
    }
  });

  // Book by slug route - MUST be after specific routes like /feed
  app.get('/api/books/:slug', async (req: Request, res: Response) => {
    try {
      const book = await storage.getBookBySlug(req.params.slug);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      res.json(book);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get book" });
    }
  });

  app.post('/api/books', async (req: Request, res: Response) => {
    try {
      const data = insertBookSchema.parse(req.body);
      const book = await storage.createBook(data);
      res.json(book);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to create book" });
    }
  });

  // Book completion routes
  app.get('/api/users/books/completed', requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const completedBooks = await storage.getUserCompletedBooks(userId);
      res.json(completedBooks);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get completed books" });
    }
  });

  app.get('/api/users/books/completed/:slug', requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const isCompleted = await storage.isBookCompleted(userId, req.params.slug);
      res.json({ completed: isCompleted });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to check book status" });
    }
  });

  app.post('/api/books/complete', requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      
      // Validate reading time (minimum 30 seconds)
      if (req.body.readingTime < 30) {
        return res.status(400).json({ message: "Invalid reading time" });
      }
      
      // Get book to verify it exists
      const book = await storage.getBookBySlug(req.body.bookSlug);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      
      // Check if already completed
      const alreadyCompleted = await storage.isBookCompleted(userId, req.body.bookSlug);
      if (alreadyCompleted) {
        return res.status(400).json({ message: "Book already completed" });
      }
      
      const completionData = {
        userId,
        bookId: book.id,
        bookSlug: req.body.bookSlug,
        title: req.body.title || book.title,
        author: req.body.author || book.author,
        reward: req.body.reward || book.reward,
        rating: req.body.rating,
        opinion: req.body.opinion,
        readingTime: req.body.readingTime,
        quizAnswers: req.body.quizAnswers || {},
      };
      
      const completion = await storage.completeBook(completionData);
      
      // Get updated user data to return
      const updatedUser = await storage.getUser(userId);
      const updatedStats = await storage.getUserStats(userId);
      
      res.json({ 
        completion, 
        user: updatedUser,
        stats: updatedStats
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to complete book" });
    }
  });

  // Transaction routes
  app.get('/api/users/transactions', requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const transactions = await storage.getUserTransactions(userId);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get transactions" });
    }
  });

  app.post('/api/users/withdraw', requireUser, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { amount } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }
      
      if (Number(user.balance) < amount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }
      
      if (!user.canWithdraw) {
        return res.status(400).json({ message: "Cannot withdraw yet. Read at least 3 books." });
      }
      
      // Update balance
      await storage.updateUserBalance(user.id, amount, 'subtract');
      
      // Create withdrawal transaction
      const transaction = await storage.createTransaction({
        userId: user.id,
        type: 'withdrawal',
        description: `Saque de R$ ${amount.toFixed(2)}`,
        amount: amount.toString(),
        balanceBefore: user.balance,
        balanceAfter: (Number(user.balance) - amount).toString(),
      });
      
      // Get updated user
      const updatedUser = await storage.getUser(user.id);
      
      res.json({ transaction, user: updatedUser });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to withdraw" });
    }
  });

  // Helper function to generate random valid CPF
  function generateRandomCPF(): string {
    // Generate 9 random digits
    const digits = [];
    for (let i = 0; i < 9; i++) {
      digits.push(Math.floor(Math.random() * 10));
    }
    
    // Calculate first verifier digit
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += digits[i] * (10 - i);
    }
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    digits.push(digit1);
    
    // Calculate second verifier digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += digits[i] * (11 - i);
    }
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    digits.push(digit2);
    
    // Format CPF with dots and dash
    const cpfString = digits.join('');
    return `${cpfString.substr(0, 3)}.${cpfString.substr(3, 3)}.${cpfString.substr(6, 3)}-${cpfString.substr(9, 2)}`;
  }
  
  // Helper function to validate CPF
  function validateCPF(cpf: string): boolean {
    // Remove non-numeric characters
    const cleanCPF = cpf.replace(/\D/g, '');
    
    // Check length
    if (cleanCPF.length !== 11) return false;
    
    // Check if all digits are the same
    if (/^(\d)\1+$/.test(cleanCPF)) return false;
    
    // Validate check digits
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF[i]) * (10 - i);
    }
    let checkDigit = 11 - (sum % 11);
    if (checkDigit > 9) checkDigit = 0;
    if (parseInt(cleanCPF[9]) !== checkDigit) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF[i]) * (11 - i);
    }
    checkDigit = 11 - (sum % 11);
    if (checkDigit > 9) checkDigit = 0;
    if (parseInt(cleanCPF[10]) !== checkDigit) return false;
    
    return true;
  }

  // Function to generate PIX EMV code (for testing)
  function generatePixEMV(amount: number, merchantName: string, merchantCity: string, txId: string): string {
    // PIX payload format version
    const payloadFormatIndicator = '000201';
    
    // Merchant account information (test key)
    const pixKey = '123e4567-e89b-12d3-a456-426614174000'; // Test UUID key
    const merchantAccountInfo = `0014BR.GOV.BCB.PIX0136${pixKey}`;
    const merchantAccountInfoFull = `26${merchantAccountInfo.length.toString().padStart(2, '0')}${merchantAccountInfo}`;
    
    // Merchant category code
    const merchantCategoryCode = '52040000';
    
    // Transaction currency (986 = BRL)
    const transactionCurrency = '5303986';
    
    // Transaction amount
    const transactionAmount = `54${amount.toFixed(2).length.toString().padStart(2, '0')}${amount.toFixed(2)}`;
    
    // Country code
    const countryCode = '5802BR';
    
    // Merchant name
    const merchantNameClean = merchantName.substring(0, 25);
    const merchantNameFull = `59${merchantNameClean.length.toString().padStart(2, '0')}${merchantNameClean}`;
    
    // Merchant city
    const merchantCityClean = merchantCity.substring(0, 15);
    const merchantCityFull = `60${merchantCityClean.length.toString().padStart(2, '0')}${merchantCityClean}`;
    
    // Additional data field template
    const txIdClean = txId.substring(0, 25);
    const additionalData = `05${txIdClean.length.toString().padStart(2, '0')}${txIdClean}`;
    const additionalDataFull = `62${additionalData.length.toString().padStart(2, '0')}${additionalData}`;
    
    // Build payload without CRC
    const payloadWithoutCrc = `${payloadFormatIndicator}${merchantAccountInfoFull}${merchantCategoryCode}${transactionCurrency}${transactionAmount}${countryCode}${merchantNameFull}${merchantCityFull}${additionalDataFull}6304`;
    
    // Calculate CRC16-CCITT
    function crc16(str: string): string {
      let crc = 0xFFFF;
      const polynomial = 0x1021;
      
      for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        
        for (let j = 0; j < 8; j++) {
          if ((crc & 0x8000) !== 0) {
            crc = (crc << 1) ^ polynomial;
          } else {
            crc = crc << 1;
          }
        }
      }
      
      return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    }
    
    const crcValue = crc16(payloadWithoutCrc);
    
    // Final PIX code
    return `${payloadWithoutCrc}${crcValue}`;
  }

  // Payment/PIX routes
  app.post('/api/payment/generate-pix', async (req: Request, res: Response) => {
    try {
      const { plan } = req.body;
      let { fullName, email, cpf } = req.body;
      
      // Extract UTM parameters from request
      const { 
        utm_source, 
        utm_medium, 
        utm_campaign, 
        utm_term, 
        utm_content, 
        fbclid, 
        referrer, 
        landingPage 
      } = req.body;
      
      const user = (req as any).user;
      
      // Log received data for debugging
      console.log('Received payment request:', {
        plan,
        fullName,
        email,
        cpf,
        hasUser: !!user,
        utmParams: {
          utm_source,
          utm_medium,
          utm_campaign,
          utm_term,
          utm_content,
          fbclid,
          referrer,
          landingPage
        }
      });
      
      // Use user's name if available, otherwise use provided name or default
      if (user && user.name) {
        fullName = user.name;
      } else if (!fullName) {
        fullName = "Cliente Beta Reader";
      }
      
      // Generate random data if not provided
      if (!email) {
        // Generate random email
        const randomId = Math.random().toString(36).substring(2, 11);
        email = `user${randomId}@betareader.com.br`;
      }
      
      if (!cpf) {
        // Use fixed CPF as requested
        cpf = '09092192651'; // 090.921.926-51 without formatting
      }
      
      // Validate required fields
      if (!plan) {
        return res.status(400).json({ message: "Plan selection required" });
      }
      
      // Validate CPF if provided
      if (cpf && !validateCPF(cpf)) {
        return res.status(400).json({ message: "CPF inválido. Por favor, verifique e tente novamente." });
      }
      
      // Fixed price for premium plan (in cents for LiraPay)
      const planPrice = 2990; // R$ 29,90 in cents
      const planTitle = 'Beta Reader Premium';
      
      // Generate unique reference
      const userId = user?.id || `GUEST-${Date.now()}`;
      const reference = `PLAN-${userId}-${Date.now()}`;
      
      // Check if LiraPay API key is configured
      const apiKey = process.env.LIRAPAY_API_KEY;
      
      let pixCode: string;
      let orderId: string = reference;
      
      // Use LiraPay API to generate real PIX
      if (apiKey) {
        try {
          // Prepare request body for LiraPay API according to documentation
          const liraPayRequest: any = {
            external_id: reference,
            total_amount: planPrice / 100, // Convert from cents to reais
            payment_method: "PIX",
            webhook_url: `https://${req.get('host')}/api/webhook/payment-status`,
            items: [
              {
                id: "premium-plan",
                title: planTitle,
                description: "Plano Premium Beta Reader Brasil",
                price: planPrice / 100,
                quantity: 1,
                is_physical: false
              }
            ],
            ip: req.ip || '0.0.0.0',
            customer: {
              name: fullName,
              email: email,
              phone: "11" + Math.random().toString().slice(2, 11), // Generate random phone number
              document_type: "CPF",
              document: cpf.replace(/\D/g, '')
            }
          };
          
          // Add UTM parameters to metadata or custom fields if they exist
          const metadata: any = {};
          if (utm_source) metadata.utm_source = utm_source;
          if (utm_medium) metadata.utm_medium = utm_medium;
          if (utm_campaign) metadata.utm_campaign = utm_campaign;
          if (utm_term) metadata.utm_term = utm_term;
          if (utm_content) metadata.utm_content = utm_content;
          if (fbclid) metadata.fbclid = fbclid;
          if (referrer) metadata.referrer = referrer;
          if (landingPage) metadata.landingPage = landingPage;
          
          // Add metadata to request if any UTM params exist
          if (Object.keys(metadata).length > 0) {
            liraPayRequest.metadata = metadata;
          }
          
          console.log('Calling LiraPay API at https://api.lirapaybr.com/v1/transactions');
          console.log('Request body:', {
            ...liraPayRequest,
            customer: { ...liraPayRequest.customer, document: '***' },
            metadata: liraPayRequest.metadata // Show UTM params being sent
          });
          
          const liraPayResponse = await fetch('https://api.lirapaybr.com/v1/transactions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-secret': apiKey // Use api-secret header as per documentation
            },
            body: JSON.stringify(liraPayRequest)
          });
          
          const responseData = await liraPayResponse.json();
          console.log('LiraPay Response:', responseData);
          
          if (liraPayResponse.ok && !responseData.hasError) {
            orderId = responseData.id;
            pixCode = responseData.pix?.payload || '';
            console.log('PIX generated successfully:', { orderId, pixCodeLength: pixCode.length });
          } else {
            console.error('LiraPay API error:', responseData);
            throw new Error(responseData.message || 'LiraPay API error');
          }
        } catch (error: any) {
          console.error('LiraPay API error:', error.message || error);
          throw new Error(`Erro ao gerar PIX: ${error.message || 'Falha na comunicação com LiraPay'}`);
        }
      } else {
        throw new Error('API da LiraPay não configurada. Por favor, configure LIRAPAY_API_KEY.');
      }
      
      // Generate QR Code URL from PIX payload
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}`;
      
      // Return PIX data to frontend
      res.json({
        success: true,
        paymentId: orderId,
        pixCode: pixCode,
        qrCodeUrl: qrCodeUrl,
        reference: reference,
        amount: planPrice / 100,
        plan: plan
      });
      
    } catch (error: any) {
      console.error('Generate PIX error:', error);
      res.status(500).json({ 
        message: error.message || "Failed to generate PIX payment" 
      });
    }
  });

  // Payment status check endpoint
  app.get('/api/payment/check-status', async (req: Request, res: Response) => {
    try {
      const { paymentId } = req.query;
      
      if (!paymentId || typeof paymentId !== 'string') {
        return res.status(400).json({ message: "Payment ID required" });
      }
      
      // Get LiraPay API key from environment
      const apiKey = process.env.LIRAPAY_API_KEY;
      if (!apiKey) {
        console.error('LIRAPAY_API_KEY not configured');
        return res.status(500).json({ message: "Payment service not configured" });
      }
      
      console.log('Checking payment status for payment:', paymentId);
      
      // Call LiraPay API to check transaction status
      const liraPayResponse = await fetch(`https://api.lirapaybr.com/v1/transactions/${paymentId}`, {
        method: 'GET',
        headers: {
          'api-secret': apiKey
        }
      });
      
      const responseData = await liraPayResponse.json();
      
      if (!liraPayResponse.ok) {
        console.error('LiraPay status check error:', {
          status: liraPayResponse.status,
          statusText: liraPayResponse.statusText,
          data: responseData
        });
        
        // If order not found, return pending status to continue polling
        if (liraPayResponse.status === 404) {
          return res.json({
            status: 'pending',
            message: 'Order not found, may still be processing'
          });
        }
        
        return res.status(500).json({ 
          message: "Error checking payment status" 
        });
      }
      
      console.log('LiraPay status check response:', {
        id: responseData.id,
        status: responseData.status,
        external_id: responseData.external_id
      });
      
      // Map LiraPay status to frontend expected status
      let mappedStatus = 'pending';
      if (responseData.status === 'AUTHORIZED') {
        mappedStatus = 'paid';
        
        // Parse external_id to get user ID and upgrade plan
        // Format: PLAN-{userId}-{timestamp}
        if (responseData.external_id) {
          const parts = responseData.external_id.split('-');
          if (parts.length >= 2) {
            const userId = parts[1];
            
            // Check if we need to upgrade the user's plan
            const user = await storage.getUser(userId);
            if (user && user.plan === 'free') {
              // Fixed price for premium plan
              const plan = 'premium';
              const actualPlan = 'premium';
              
              await storage.updateUser(userId, { 
                plan: actualPlan,
                selectedPlan: plan
              });
              
              console.log(`User ${userId} upgraded to ${plan} plan via status check`);
            }
          }
        }
      } else if (responseData.status === 'FAILED' || responseData.status === 'CHARGEBACK' || responseData.status === 'IN_DISPUTE') {
        mappedStatus = 'failed';
      }
      
      // Return status to frontend
      res.json({
        status: mappedStatus,
        paymentId: responseData.id,
        externalId: responseData.external_id
      });
      
    } catch (error: any) {
      console.error('Payment status check error:', error);
      res.status(500).json({ 
        message: error.message || "Failed to check payment status" 
      });
    }
  });

  // Plan management
  app.post('/api/users/upgrade-plan', requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { plan } = req.body;
      
      // Support for unlimited plan (stored as premium with additional flag)
      const validPlans = ['free', 'premium', 'unlimited'];
      if (!validPlans.includes(plan)) {
        return res.status(400).json({ message: "Invalid plan" });
      }
      
      // Store unlimited as premium with higher limits
      const actualPlan = plan === 'unlimited' ? 'premium' : plan;
      
      const updated = await storage.updateUser(userId, { 
        plan: actualPlan,
        // Store unlimited flag in metadata (could be added to user table later)
        selectedPlan: plan === 'unlimited' ? 'unlimited' : actualPlan
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update plan" });
    }
  });

  // Webhook endpoint for LiraPay payment status
  app.post('/api/webhook/payment-status', async (req: Request, res: Response) => {
    try {
      const { id, external_id, status, total_amount, payment_method } = req.body;
      
      console.log('LiraPay webhook received:', { id, external_id, status, total_amount });
      
      // Parse external_id to get user ID
      // Format: PLAN-{userId}-{timestamp}
      if (external_id && external_id.startsWith('PLAN-')) {
        const parts = external_id.split('-');
        if (parts.length >= 2) {
          const userId = parts[1];
          
          if (status === 'AUTHORIZED') {
            // Payment successful - upgrade user plan
            const user = await storage.getUser(userId);
            if (user) {
              // Fixed premium plan
              await storage.updateUser(userId, { 
                plan: 'premium',
                selectedPlan: 'premium'
              });
              
              console.log(`User ${userId} upgraded to premium plan via webhook`);
            }
          }
        }
      }
      
      // Always return 200 to acknowledge receipt
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook processing error:', error);
      // Still return 200 to prevent retries
      res.status(200).json({ received: true, error: error.message });
    }
  });

  // Goal management
  app.patch('/api/users/monthly-goal', requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { monthlyGoal } = req.body;
      
      if (!monthlyGoal || monthlyGoal <= 0) {
        return res.status(400).json({ message: "Invalid goal amount" });
      }
      
      const updated = await storage.updateUser(userId, { 
        monthlyGoal: monthlyGoal.toString() 
      });
      
      // Update stats progress
      const stats = await storage.getUserStats(userId);
      if (stats) {
        const progress = (Number(stats.monthEarnings) / monthlyGoal) * 100;
        await storage.createOrUpdateUserStats(userId, {
          monthlyProgress: Math.min(100, progress).toString()
        });
      }
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update goal" });
    }
  });

  // Data sync routes for persistence
  app.get('/api/users/:userId/data', async (req: Request, res: Response) => {
    try {
      // Allow 'current' to use session userId
      const userId = req.params.userId === 'current' 
        ? req.session.userId 
        : req.params.userId;
        
      console.log('[GET /api/users/data] Fetching data for userId:', userId);
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log('[GET /api/users/data] User found:', user.email, 'Balance:', user.balance);
      
      // Stats are already calculated when books are completed
      // No need to recalculate on every read
      
      // Get all user related data
      let stats = await storage.getUserStats(userId);
      console.log('[GET /api/users/data] Stats retrieved:', stats ? 'Found' : 'Not found');
      
      // If stats don't exist, create them by recalculating from existing data
      if (!stats) {
        console.log('[GET /api/users/data] Stats missing for user:', userId);
        console.log('[GET /api/users/data] Recalculating stats from existing data...');
        stats = await storage.recalculateUserStats(userId);
        console.log('[GET /api/users/data] Stats recalculated and created successfully');
      }
      
      if (stats) {
        console.log('[GET /api/users/data] Stats details:', {
          totalBooksRead: stats.totalBooksRead,
          todayBooksRead: stats.todayBooksRead,
          todayEarnings: stats.todayEarnings,
          weekEarnings: stats.weekEarnings,
          monthEarnings: stats.monthEarnings
        });
      }
      const booksCompleted = await storage.getUserCompletedBooks(userId);
      
      // Check if stats are outdated
      if (stats && booksCompleted.length > 0 && stats.totalBooksRead !== booksCompleted.length) {
        console.log('[GET /api/users/data] Stats outdated - Books completed:', booksCompleted.length, 'Stats totalBooksRead:', stats.totalBooksRead);
        console.log('[GET /api/users/data] Recalculating stats...');
        stats = await storage.recalculateUserStats(userId);
        console.log('[GET /api/users/data] Stats updated successfully');
      }
      
      const transactions = await storage.getUserTransactions(userId);
      
      // Calculate last 7 days data for chart
      const lastSevenDaysData = [];
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const today = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const dayIndex = date.getDay();
        const dateStr = date.toISOString().split('T')[0];
        
        // Calculate earnings for this day
        const dayEarnings = booksCompleted
          .filter(book => {
            const bookDate = new Date(book.completedAt).toISOString().split('T')[0];
            return bookDate === dateStr;
          })
          .reduce((sum, book) => sum + Number(book.reward), 0);
        
        lastSevenDaysData.push({
          dia: days[dayIndex],
          valor: dayEarnings
        });
      }
      
      // Format the response to match frontend UserData structure
      console.log('[GET /api/users/data] Books completed count:', booksCompleted.length);
      console.log('[GET /api/users/data] Transactions count:', transactions.length);
      
      const userData = {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || '',
        registeredAt: user.createdAt,
        balance: Number(user.balance),
        totalEarnings: Number(user.totalEarnings),
        monthlyGoal: Number(user.monthlyGoal),
        plan: user.plan || 'free',
        selectedPlan: user.selectedPlan || user.plan || 'free',
        canWithdraw: user.canWithdraw,
        createdAt: user.createdAt,
        booksCompleted: booksCompleted.map(book => ({
          id: book.id,
          bookSlug: book.bookSlug,
          title: book.title,
          reward: Number(book.reward),
          completedAt: book.completedAt,
          rating: book.rating
        })),
        completedBooks: booksCompleted.map(book => book.bookSlug),
        transactions: transactions.map(t => ({
          type: t.type,
          description: t.description,
          amount: Number(t.amount),
          date: t.createdAt
        })),
        dailyBooksRead: stats?.todayBooksRead || 0,
        lastReadDate: stats?.lastReadDate || new Date().toISOString(),
        stats: stats ? {
          totalEarnings: Number(user.totalEarnings || 0),
          todayEarnings: Number(stats.todayEarnings || 0),
          weekEarnings: Number(stats.weekEarnings || 0),
          monthEarnings: Number(stats.monthEarnings || 0),
          totalBooksRead: stats.totalBooksRead || 0,
          todayBooksRead: stats.todayBooksRead || 0,
          weekBooksRead: stats.weekBooksRead || 0,
          averageRating: Number(stats.averageRating || 0),
          lastSevenDays: lastSevenDaysData,
          weeklyGoal: 500,
          weeklyProgress: Math.min(100, (Number(stats.weekEarnings || 0) / 500) * 100),
          monthlyGoal: Number(user.monthlyGoal),
          monthlyProgress: Math.min(100, (Number(stats.monthEarnings || 0) / Number(user.monthlyGoal)) * 100),
          streak: stats.streak || 0,
          totalActivities: booksCompleted.length,
          easyBooksCount: stats.easyBooksCount || 0,
          mediumBooksCount: stats.mediumBooksCount || 0,
          hardBooksCount: stats.hardBooksCount || 0
        } : null
      };
      
      console.log('[GET /api/users/data] Returning userData with stats:', userData.stats ? 'Present' : 'Null');
      res.json(userData);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get user data" });
    }
  });

  app.put('/api/users/:userId/data', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const userData = req.body;
      
      // Filter out undefined values and convert to proper types
      const updateData: any = {};
      if (userData.balance !== undefined) updateData.balance = userData.balance.toString();
      if (userData.totalEarnings !== undefined) updateData.totalEarnings = userData.totalEarnings.toString();
      if (userData.monthlyGoal !== undefined) updateData.monthlyGoal = userData.monthlyGoal.toString();
      if (userData.plan !== undefined) updateData.plan = userData.plan;
      if (userData.selectedPlan !== undefined) updateData.selectedPlan = userData.selectedPlan;
      if (userData.canWithdraw !== undefined) updateData.canWithdraw = userData.canWithdraw;
      
      // Only update if we have data
      if (Object.keys(updateData).length > 0) {
        await storage.updateUser(userId, updateData);
      }
      
      // Update stats if provided
      if (userData.stats) {
        const statsData: any = {};
        if (userData.stats.totalEarnings !== undefined) statsData.totalEarnings = userData.stats.totalEarnings.toString();
        if (userData.stats.todayEarnings !== undefined) statsData.todayEarnings = userData.stats.todayEarnings.toString();
        if (userData.stats.weekEarnings !== undefined) statsData.weekEarnings = userData.stats.weekEarnings.toString();
        if (userData.stats.monthEarnings !== undefined) statsData.monthEarnings = userData.stats.monthEarnings.toString();
        if (userData.stats.totalBooksRead !== undefined) statsData.totalBooksRead = userData.stats.totalBooksRead;
        if (userData.stats.todayBooksRead !== undefined) statsData.todayBooksRead = userData.stats.todayBooksRead;
        if (userData.stats.averageRating !== undefined) statsData.averageRating = userData.stats.averageRating.toString();
        if (userData.stats.weeklyProgress !== undefined) statsData.weeklyProgress = userData.stats.weeklyProgress.toString();
        if (userData.stats.monthlyProgress !== undefined) statsData.monthlyProgress = userData.stats.monthlyProgress.toString();
        if (userData.stats.streak !== undefined) statsData.streak = userData.stats.streak;
        if (userData.stats.easyBooksCount !== undefined) statsData.easyBooksCount = userData.stats.easyBooksCount;
        if (userData.stats.mediumBooksCount !== undefined) statsData.mediumBooksCount = userData.stats.mediumBooksCount;
        if (userData.stats.hardBooksCount !== undefined) statsData.hardBooksCount = userData.stats.hardBooksCount;
        if (userData.lastReadDate !== undefined) {
          // Convert lastReadDate to proper Date object
          statsData.lastReadDate = new Date(userData.lastReadDate);
        }
        
        if (Object.keys(statsData).length > 0) {
          await storage.createOrUpdateUserStats(userId, statsData);
        }
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating user data:', error);
      res.status(500).json({ message: error.message || "Failed to update user data" });
    }
  });

  // Removed duplicate endpoint - using /api/books/complete instead

  // Friendship routes
  app.post('/api/friendships/send-request', requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { friendEmail } = req.body;
      
      if (!friendEmail) {
        return res.status(400).json({ message: "Email do amigo é obrigatório" });
      }
      
      // Find friend by email
      const friend = await storage.getUserByEmail(friendEmail);
      if (!friend) {
        return res.status(404).json({ message: "Usuário não encontrado com este email" });
      }
      
      if (friend.id === userId) {
        return res.status(400).json({ message: "Você não pode adicionar a si mesmo como amigo" });
      }
      
      // Check if friendship already exists
      const existingFriendship = await storage.getFriendship(userId, friend.id);
      if (existingFriendship) {
        if (existingFriendship.status === 'accepted') {
          return res.status(400).json({ message: "Vocês já são amigos" });
        }
        if (existingFriendship.status === 'pending') {
          return res.status(400).json({ message: "Solicitação de amizade já enviada" });
        }
      }
      
      // Create friendship request
      await storage.createFriendshipRequest(userId, friend.id);
      
      // Update online status
      await storage.updateOnlineStatus(userId, true);
      
      res.json({ 
        success: true, 
        message: "Solicitação de amizade enviada com sucesso" 
      });
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      res.status(500).json({ message: error.message || "Failed to send friend request" });
    }
  });

  app.get('/api/friendships/pending', requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const pendingRequests = await storage.getPendingFriendRequests(userId);
      res.json(pendingRequests);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get pending requests" });
    }
  });

  app.get('/api/friendships/friends', requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const friends = await storage.getUserFriends(userId);
      res.json(friends);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get friends" });
    }
  });

  app.post('/api/friendships/accept', requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { friendshipId } = req.body;
      
      if (!friendshipId) {
        return res.status(400).json({ message: "ID da solicitação é obrigatório" });
      }
      
      await storage.acceptFriendRequest(friendshipId, userId);
      res.json({ success: true, message: "Solicitação aceita com sucesso" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to accept request" });
    }
  });

  app.post('/api/friendships/reject', requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { friendshipId } = req.body;
      
      if (!friendshipId) {
        return res.status(400).json({ message: "ID da solicitação é obrigatório" });
      }
      
      await storage.rejectFriendRequest(friendshipId, userId);
      res.json({ success: true, message: "Solicitação rejeitada" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to reject request" });
    }
  });

  app.delete('/api/friendships/:friendId', requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { friendId } = req.params;
      
      await storage.removeFriend(userId, friendId);
      res.json({ success: true, message: "Amigo removido com sucesso" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to remove friend" });
    }
  });

  app.post('/api/users/online-status', requireUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { isOnline } = req.body;
      
      await storage.updateOnlineStatus(userId, isOnline);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update online status" });
    }
  });
  
  // Admin routes
  // Admin auth status
  app.get('/api/admin/auth/status', (req: Request, res: Response) => {
    res.json({ 
      isAuthenticated: !!req.session.isAdmin 
    });
  });
  
  // Admin logout
  app.post('/api/admin/logout', (req: Request, res: Response) => {
    req.session.isAdmin = undefined;
    res.json({ message: 'Logged out successfully' });
  });
  
  app.post('/api/admin/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (username === 'admin' && password === '080881') {
        req.session.isAdmin = true;
        res.json({ success: true, message: 'Login successful' });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to login" });
    }
  });
  
  app.get('/api/admin/users', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader !== 'Bearer admin-token') {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const users = await storage.getAllUsersWithStats();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get users" });
    }
  });
  
  
  const httpServer = createServer(app);

  return httpServer;
}