
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Toaster, toast } from 'react-hot-toast';
import { Goal } from './types';
import GoalCard from './components/GoalCard';
import { generateGoalSuggestions } from './services/geminiService';
import Modal from './components/Modal';
import ThemeToggle from './components/ThemeToggle';

const App: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && localStorage.theme) {
      return localStorage.theme;
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleAddGoal = () => {
    if (newGoalTitle.trim() !== '') {
      const newGoal: Goal = {
        id: uuidv4(),
        title: newGoalTitle,
        krs: [],
      };
      setGoals([...goals, newGoal]);
      setNewGoalTitle('');
      setIsGoalModalOpen(false);
      toast.success('Goal created successfully!');
    }
  };
  
  const handleUpdateGoal = (updatedGoal: Goal) => {
    setGoals(goals.map(g => g.id === updatedGoal.id ? updatedGoal : g));
  };

  const handleDeleteGoal = (goalId: string) => {
     setGoals(goals.filter(g => g.id !== goalId));
     toast.success('Goal deleted.');
  };

  const handleGenerateGoal = async () => {
    if (newGoalTitle.trim() === '') return;
    setIsAiLoading(true);
    try {
        const suggestion = await generateGoalSuggestions(newGoalTitle);
        if(suggestion?.title) {
            setNewGoalTitle(suggestion.title);
            toast.success('AI refined your goal!');
        } else {
           toast.error('AI could not refine the goal.');
        }
    } catch (error) {
        console.error("AI suggestion failed:", error);
        toast.error('AI suggestion failed. Please try again.');
    } finally {
        setIsAiLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-800 dark:text-slate-200 font-sans">
      <Toaster position="top-center" reverseOrder={false} />
      <div className="mx-auto p-4 md:p-8 max-w-7xl">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
            Goally
          </h1>
          <div className="flex items-center space-x-4">
              <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
              <button
              onClick={() => setIsGoalModalOpen(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-colors duration-300"
            >
              + New Goal
            </button>
          </div>
        </header>

        <main>
          {goals.length > 0 ? (
            <div className="grid grid-cols-1 gap-8">
              {goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onUpdate={handleUpdateGoal} onDelete={handleDeleteGoal}/>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-md">
              <h2 className="text-2xl font-semibold mb-4 text-slate-700 dark:text-slate-300">No Goals Yet!</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6">It looks like you haven't set any goals. Let's create one!</p>
              <button
                onClick={() => setIsGoalModalOpen(true)}
                className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75 transition-transform transform hover:scale-105"
              >
                Create Your First Goal
              </button>
            </div>
          )}
        </main>
      </div>
      <Modal isOpen={isGoalModalOpen} onClose={() => setIsGoalModalOpen(false)} title="Create a New Goal">
        <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Describe your goal. You can be brief and let AI help you refine it.</p>
            <input
                type="text"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                placeholder="e.g., 'Improve my web development skills'"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
             <div className="flex justify-end space-x-3">
                 <button onClick={handleGenerateGoal} disabled={isAiLoading || !newGoalTitle} className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed transition-colors">
                    {isAiLoading ? (
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm9 1a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V3zM5 12a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zm9 1a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2z" clipRule="evenodd" /></svg>
                    )}
                    {isAiLoading ? 'Generating...' : 'Refine with AI'}
                </button>
                <button onClick={handleAddGoal} disabled={!newGoalTitle} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed transition-colors">
                    Create Goal
                </button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default App;