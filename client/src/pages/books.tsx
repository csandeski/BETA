import { useState, useEffect } from "react";
import { BookOpen, Star, Clock, ChevronRight, TrendingUp, Filter, Search } from "lucide-react";
import { useLocation } from "wouter";
import { useSound } from "@/hooks/useSound";
import MobileNav from "@/components/MobileNav";
import { CompleteBooksModal } from "@/components/CompleteBooksModal";
import { userDataManager, type UserData } from "@/utils/userDataManager";
import { useToast } from "@/hooks/use-toast";

export default function Books() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [showCompleteBooksModal, setShowCompleteBooksModal] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const { playSound } = useSound();
  const { toast } = useToast();
  
  // Load user data
  useEffect(() => {
    const loadData = async () => {
      await userDataManager.loadUserData();
      const data = userDataManager.getUserData();
      setUserData(data);
    };
    loadData();
  }, []);

  const categories = [
    { id: "all", name: "Todos", count: 32 },
    { id: "romance", name: "Romance", count: 8 },
    { id: "suspense", name: "Suspense", count: 12 },
    { id: "aventura", name: "Aventura", count: 7 },
    { id: "drama", name: "Drama", count: 5 }
  ];

  const allBooks = [
    {
      id: 1,
      title: "O Segredo do Vale",
      author: "Maria Clara Silva",
      category: "suspense",
      pages: 45,
      readTime: "25 min",
      rating: 4.8,
      reward: "12,50",
      difficulty: "Fácil",
      isNew: true,
      readers: 1234,
      synopsis: "Uma história envolvente sobre mistérios antigos",
      color: "from-purple-500 to-indigo-500"
    },
    {
      id: 2,
      title: "Amor em Paris",
      author: "João Pedro Santos",
      category: "romance",
      pages: 38,
      readTime: "20 min",
      rating: 4.5,
      reward: "10,00",
      difficulty: "Fácil",
      isNew: false,
      readers: 2341,
      synopsis: "Romance nas ruas iluminadas de Paris",
      color: "from-pink-500 to-rose-500"
    },
    {
      id: 3,
      title: "A Jornada Perdida",
      author: "Carlos Mendes",
      category: "aventura",
      pages: 62,
      readTime: "35 min",
      rating: 4.9,
      reward: "18,00",
      difficulty: "Médio",
      isNew: true,
      readers: 876,
      synopsis: "Uma aventura épica por terras desconhecidas",
      color: "from-green-500 to-emerald-500"
    },
    {
      id: 4,
      title: "Reflexões da Alma",
      author: "Ana Beatriz Costa",
      category: "drama",
      pages: 55,
      readTime: "30 min",
      rating: 4.6,
      reward: "15,00",
      difficulty: "Médio",
      isNew: false,
      readers: 1567,
      synopsis: "Drama psicológico profundo e emocionante",
      color: "from-amber-500 to-orange-500"
    },
    {
      id: 5,
      title: "Código Secreto",
      author: "Roberto Lima",
      category: "suspense",
      pages: 78,
      readTime: "45 min",
      rating: 4.7,
      reward: "22,00",
      difficulty: "Difícil",
      isNew: true,
      readers: 432,
      synopsis: "Thriller tecnológico cheio de reviravoltas",
      color: "from-red-500 to-pink-500"
    },
    {
      id: 6,
      title: "O Último Verão",
      author: "Lucia Ferreira",
      category: "romance",
      pages: 42,
      readTime: "22 min",
      rating: 4.4,
      reward: "11,00",
      difficulty: "Fácil",
      isNew: false,
      readers: 3210,
      synopsis: "Romance de verão inesquecível",
      color: "from-blue-500 to-cyan-500"
    },
    {
      id: 7,
      title: "Mistério no Castelo",
      author: "Pedro Augusto",
      category: "suspense",
      pages: 68,
      readTime: "40 min",
      rating: 4.8,
      reward: "20,00",
      difficulty: "Difícil",
      isNew: false,
      readers: 654,
      synopsis: "Mistério gótico em castelo medieval",
      color: "from-purple-500 to-pink-500"
    },
    {
      id: 8,
      title: "Sob as Estrelas",
      author: "Marina Santos",
      category: "drama",
      pages: 48,
      readTime: "28 min",
      rating: 4.5,
      reward: "13,50",
      difficulty: "Médio",
      isNew: true,
      readers: 987,
      synopsis: "Drama familiar tocante e inspirador",
      color: "from-indigo-500 to-blue-500"
    }
  ];

  const filteredBooks = allBooks.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          book.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || book.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === "all" || book.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const handleStartReading = (bookId: number) => {
    playSound('click');
    
    // Check if user has free plan and reached daily limit (3 books)
    if (userData?.selectedPlan === 'free' || !userData?.selectedPlan) {
      const todayBooks = userData?.stats?.todayBooksRead || 0;
      
      if (todayBooks >= 3) {
        // Check if user has read 3 books total before showing upgrade modal
        const totalBooksRead = userData?.stats?.totalBooksRead || 0;
        if (totalBooksRead >= 3) {
          // Modal removed
        } else {
          setShowCompleteBooksModal(true);
        }
        return;
      }
    }
    
    setLocation(`/book/${bookId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/30 via-white to-emerald-50/30 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-green-100 sticky top-0 z-10">
        <div className="px-5 py-4">
          <h1 className="text-lg font-semibold text-gray-900">Biblioteca</h1>
          <p className="text-xs text-gray-600 mt-1">
            {filteredBooks.length} livros disponíveis para leitura
          </p>
        </div>

        {/* Search Bar */}
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título ou autor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="px-5 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                playSound('click');
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-150'
              }`}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>

        {/* Difficulty Filter */}
        <div className="px-5 pb-3 flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <div className="flex gap-2">
            {["all", "Fácil", "Médio", "Difícil"].map(diff => (
              <button
                key={diff}
                onClick={() => {
                  setSelectedDifficulty(diff);
                  playSound('click');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedDifficulty === diff
                    ? 'bg-green-200 text-green-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-150'
                }`}
              >
                {diff === "all" ? "Todos" : diff}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Books Grid */}
      <div className="px-5 py-6">
        {filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum livro encontrado</p>
            <p className="text-sm text-gray-400 mt-1">Tente ajustar os filtros</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredBooks.map(book => (
              <div
                key={book.id}
                className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => handleStartReading(book.id)}
                data-testid={`card-book-${book.id}`}
              >
                <div className="flex gap-4">
                  {/* Book Cover */}
                  <div className={`flex-shrink-0 w-20 h-28 bg-gradient-to-br ${book.color} rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow`}>
                    <BookOpen className="h-8 w-8 text-white" strokeWidth={1.5} />
                  </div>

                  {/* Book Info */}
                  <div className="flex-1 min-w-0">
                    {/* Title and New Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">
                          {book.title}
                        </h3>
                        <p className="text-xs text-gray-600 mt-0.5">{book.author}</p>
                      </div>
                      {book.isNew && (
                        <span className="px-2 py-1 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-semibold rounded-lg">
                          NOVO
                        </span>
                      )}
                    </div>

                    {/* Synopsis */}
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                      {book.synopsis}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-emerald-500" />
                        <span className="text-xs text-gray-700">{book.readTime}</span>
                      </div>
                      <span className="text-xs text-gray-700">{book.pages} pág</span>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                        <span className="text-xs text-gray-700">{book.rating}</span>
                      </div>
                      <span className={`ml-auto px-2 py-1 text-xs font-medium rounded-lg ${
                        book.difficulty === 'Fácil' ? 'bg-green-200 text-green-800' :
                        book.difficulty === 'Médio' ? 'bg-amber-200 text-amber-800' :
                        'bg-red-200 text-red-800'
                      }`}>
                        {book.difficulty}
                      </span>
                    </div>

                    {/* Reward and Readers */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <div>
                        <p className="text-base font-bold text-gray-900">
                          R$ {book.reward}
                        </p>
                        <p className="text-xs text-gray-600">{book.readers.toLocaleString()} leitores</p>
                      </div>
                      <button className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-semibold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-md hover:shadow-lg flex items-center gap-1">
                        Ler agora
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reading Tip */}
      <div className="mx-5 p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl border border-green-300">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-xl">
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-700 font-semibold uppercase">Dica de leitura</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Livros marcados como "Fácil" oferecem ganhos rápidos!
            </p>
          </div>
        </div>
      </div>

      <MobileNav />
      
      
      <CompleteBooksModal
        isOpen={showCompleteBooksModal}
        onClose={() => setShowCompleteBooksModal(false)}
        booksRead={userData?.stats?.totalBooksRead || 0}
      />
    </div>
  );
}