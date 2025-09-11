// Script para testar o fluxo completo de persistência de dados
import { storage } from './storage';
import bcrypt from 'bcryptjs';

async function testFullFlow() {
  console.log('=== TESTE DO FLUXO COMPLETO ===\n');
  
  const testEmail = 'test_' + Date.now() + '@example.com';
  const testPassword = 'senha123';
  
  try {
    // 1. Criar um novo usuário
    console.log('1. CRIANDO NOVO USUÁRIO');
    console.log('   Email:', testEmail);
    
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    const newUser = await storage.createUser({
      email: testEmail,
      password: hashedPassword,
      fullName: 'Usuário Teste Flow',
      phone: '11999999999'
    });
    
    console.log('   Usuário criado com ID:', newUser.id);
    console.log('   Balance inicial:', newUser.balance);
    console.log('   Total Earnings inicial:', newUser.totalEarnings);
    
    // 2. Verificar se as estatísticas foram criadas
    console.log('\n2. VERIFICANDO ESTATÍSTICAS INICIAIS');
    let stats = await storage.getUserStats(newUser.id);
    
    if (stats) {
      console.log('   Estatísticas encontradas:');
      console.log('   - Total Books Read:', stats.totalBooksRead);
      console.log('   - Today Earnings:', stats.todayEarnings);
      console.log('   - Week Earnings:', stats.weekEarnings);
      console.log('   - Month Earnings:', stats.monthEarnings);
    } else {
      console.log('   ERRO: Estatísticas não foram criadas automaticamente!');
    }
    
    // 3. Simular conclusão de um livro
    console.log('\n3. COMPLETANDO UM LIVRO');
    const bookData = {
      userId: newUser.id,
      bookId: 'test-book-id',
      bookSlug: 'test-book-' + Date.now(),
      title: 'Livro de Teste',
      author: 'Autor Teste',
      reward: '45.00',
      rating: 5,
      opinion: 'Excelente livro!',
      readingTime: 480, // 8 minutos em segundos
      quizAnswers: JSON.stringify([{ q: 1, a: 'A' }])
    };
    
    console.log('   Completando livro:', bookData.title);
    console.log('   Recompensa:', bookData.reward);
    
    const completion = await storage.completeBook(bookData);
    console.log('   Livro completado com sucesso! ID:', completion.id);
    
    // 4. Verificar dados após completar o livro
    console.log('\n4. VERIFICANDO DADOS APÓS COMPLETAR O LIVRO');
    
    const updatedUser = await storage.getUser(newUser.id);
    console.log('   Balance após livro:', updatedUser?.balance);
    console.log('   Total Earnings após livro:', updatedUser?.totalEarnings);
    
    stats = await storage.getUserStats(newUser.id);
    if (stats) {
      console.log('   Estatísticas após livro:');
      console.log('   - Total Books Read:', stats.totalBooksRead);
      console.log('   - Today Books Read:', stats.todayBooksRead);
      console.log('   - Week Books Read:', stats.weekBooksRead);
      console.log('   - Month Books Read:', stats.monthBooksRead);
      console.log('   - Today Earnings:', stats.todayEarnings);
      console.log('   - Week Earnings:', stats.weekEarnings);
      console.log('   - Month Earnings:', stats.monthEarnings);
      console.log('   - Average Rating:', stats.averageRating);
      console.log('   - Last Read Date:', stats.lastReadDate);
    } else {
      console.log('   ERRO: Estatísticas não encontradas após completar livro!');
    }
    
    // 5. Simular "logout" e "login" (buscar dados novamente)
    console.log('\n5. SIMULANDO LOGOUT E LOGIN');
    console.log('   Simulando que o usuário saiu e voltou...');
    console.log('   Buscando dados novamente do banco...');
    
    const userAfterLogin = await storage.getUser(newUser.id);
    console.log('   Balance após "re-login":', userAfterLogin?.balance);
    console.log('   Total Earnings após "re-login":', userAfterLogin?.totalEarnings);
    
    const statsAfterLogin = await storage.getUserStats(newUser.id);
    if (statsAfterLogin) {
      console.log('   Estatísticas após "re-login":');
      console.log('   - Total Books Read:', statsAfterLogin.totalBooksRead);
      console.log('   - Today Books Read:', statsAfterLogin.todayBooksRead);
      console.log('   - Week Books Read:', statsAfterLogin.weekBooksRead);
      console.log('   - Month Books Read:', statsAfterLogin.monthBooksRead);
      console.log('   - Today Earnings:', statsAfterLogin.todayEarnings);
      console.log('   - Week Earnings:', statsAfterLogin.weekEarnings);
      console.log('   - Month Earnings:', statsAfterLogin.monthEarnings);
      console.log('   - Average Rating:', statsAfterLogin.averageRating);
      
      // Verificar se os dados persistiram
      if (statsAfterLogin.totalBooksRead === 1 && 
          Number(statsAfterLogin.todayEarnings) === 45 &&
          Number(statsAfterLogin.weekEarnings) === 45 &&
          Number(statsAfterLogin.monthEarnings) === 45) {
        console.log('\n✅ SUCESSO! Dados persistidos corretamente!');
      } else {
        console.log('\n❌ ERRO! Dados não persistiram corretamente!');
      }
    } else {
      console.log('   ❌ ERRO: Estatísticas não encontradas após "re-login"!');
    }
    
    // 6. Recalcular estatísticas para verificar
    console.log('\n6. RECALCULANDO ESTATÍSTICAS');
    const recalculatedStats = await storage.recalculateUserStats(newUser.id);
    console.log('   Estatísticas recalculadas:');
    console.log('   - Total Books Read:', recalculatedStats.totalBooksRead);
    console.log('   - Today Earnings:', recalculatedStats.todayEarnings);
    console.log('   - Week Earnings:', recalculatedStats.weekEarnings);
    console.log('   - Month Earnings:', recalculatedStats.monthEarnings);
    
    console.log('\n=== FIM DO TESTE ===');
    
  } catch (error) {
    console.error('Erro durante o teste:', error);
  } finally {
    process.exit(0);
  }
}

// Executar o teste
testFullFlow();