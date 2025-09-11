// Script para testar o sistema de estatísticas
import { db } from './server/db.js';
import { users, userStats, booksCompleted, transactions } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function testStats() {
  console.log('=== TESTE DE ESTATÍSTICAS ===\n');
  
  try {
    // 1. Listar todos os usuários
    console.log('1. Listando usuários:');
    const allUsers = await db.select().from(users);
    console.log(`   Encontrados ${allUsers.length} usuários`);
    
    if (allUsers.length === 0) {
      console.log('   Nenhum usuário encontrado. Faça login primeiro.');
      return;
    }
    
    // Para cada usuário, verificar as estatísticas
    for (const user of allUsers) {
      console.log(`\n2. Verificando usuário: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Balance: ${user.balance}`);
      console.log(`   Total Earnings: ${user.totalEarnings}`);
      
      // Buscar estatísticas
      const [stats] = await db.select().from(userStats).where(eq(userStats.userId, user.id));
      
      if (stats) {
        console.log(`\n3. Estatísticas encontradas:`);
        console.log(`   ID da stat: ${stats.id}`);
        console.log(`   Total Books Read: ${stats.totalBooksRead}`);
        console.log(`   Today Books Read: ${stats.todayBooksRead}`);
        console.log(`   Week Books Read: ${stats.weekBooksRead}`);
        console.log(`   Month Books Read: ${stats.monthBooksRead}`);
        console.log(`   Today Earnings: ${stats.todayEarnings}`);
        console.log(`   Week Earnings: ${stats.weekEarnings}`);
        console.log(`   Month Earnings: ${stats.monthEarnings}`);
        console.log(`   Average Rating: ${stats.averageRating}`);
        console.log(`   Streak: ${stats.streak}`);
        console.log(`   Last Read Date: ${stats.lastReadDate}`);
      } else {
        console.log(`\n3. PROBLEMA: Nenhuma estatística encontrada para o usuário!`);
        console.log(`   Isso pode explicar porque as stats ficam zeradas.`);
      }
      
      // Buscar livros completados
      const completedBooks = await db
        .select()
        .from(booksCompleted)
        .where(eq(booksCompleted.userId, user.id));
      
      console.log(`\n4. Livros completados: ${completedBooks.length}`);
      completedBooks.forEach((book, index) => {
        console.log(`   ${index + 1}. ${book.title} - R$${book.reward} - ${new Date(book.completedAt).toLocaleDateString('pt-BR')}`);
      });
      
      // Buscar transações
      const userTransactions = await db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, user.id));
      
      console.log(`\n5. Transações: ${userTransactions.length}`);
      userTransactions.slice(0, 5).forEach((t, index) => {
        console.log(`   ${index + 1}. ${t.type}: ${t.description} - R$${t.amount}`);
      });
    }
    
    console.log('\n=== FIM DO TESTE ===');
    
  } catch (error) {
    console.error('Erro durante o teste:', error);
  } finally {
    process.exit(0);
  }
}

// Executar o teste
testStats();