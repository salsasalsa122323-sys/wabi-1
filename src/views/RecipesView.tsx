import React, { useState } from 'react';
import {
  ChefHat,
  PlusCircle,
  Trash2,
  Edit2,
  DollarSign,
  TrendingUp,
  Layers,
  Sparkles,
  ChevronRight,
  Info,
  X,
  CheckCircle,
  Building2,
  Copy,
  ArrowRightLeft,
  AlertCircle,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { Recipe, RecipeIngredient } from '../types';
import { SmartItemSelector } from '../components/common/SmartItemSelector';
import { MenuSearchBox } from '../components/common/MenuSearchBox';
import { smartMatchMenuItem } from '../utils/searchMatcher';

export const RecipesView: React.FC = () => {
  const {
    recipes,
    items,
    branches,
    saveRecipe,
    deleteRecipe,
    duplicateRecipeToBranch,
    addNewBranch,
    createDefaultThreeBranches,
    copyCocoonSholaToSixKilo,
    populateCatalogWithZeroBalances,
  } = useApp();
  const { language, t, formatCurrency } = useLanguage();

  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    branches[0]?.id || ''
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Shola to 6 Kilo copy state
  const [sholaCopyModalOpen, setSholaCopyModalOpen] = useState(false);
  const [sholaCopyResult, setSholaCopyResult] = useState<{
    success: boolean;
    copiedCount: number;
    skippedCount: number;
    conflicts: string[];
    message: string;
  } | null>(null);

  // Recipe delete confirmation modal state
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);

  // If selected branch was deleted or not set, default to first branch
  const currentBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  // Form State
  const [nameAm, setNameAm] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [category, setCategory] = useState('stew');
  const [portionDescription, setPortionDescription] = useState('1 ፖርሽን');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [prepNotes, setPrepNotes] = useState('');

  // Clone Modal State
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [recipeToClone, setRecipeToClone] = useState<Recipe | null>(null);
  const [cloneTargetBranchId, setCloneTargetBranchId] = useState<string>('');
  const [cloneNewPrice, setCloneNewPrice] = useState<number | ''>('');

  // Filter recipes strictly for current branch
  const branchRecipes = recipes.filter((rec) => {
    // If recipe has branchId, match it; if legacy recipe had no branchId, show in first branch
    if (rec.branchId) {
      return rec.branchId === (currentBranch?.id || '');
    }
    return currentBranch && branches[0]?.id === currentBranch.id;
  });

  // Instant as-you-type fuzzy & smart search filter
  const filteredRecipes = branchRecipes.filter((rec) => {
    return smartMatchMenuItem(searchQuery, {
      nameAm: rec.nameAm,
      nameEn: rec.nameEn,
      category: rec.category,
      code: rec.portionDescription,
    });
  });

  const openNewRecipe = () => {
    setEditingRecipe(null);
    setNameAm('');
    setNameEn('');
    setCategory('stew');
    setPortionDescription('1 ፖርሽን');
    setSellingPrice('');
    setIngredients(
      items.length > 0 ? [{ itemId: items[0].id, quantity: 0.25 }] : []
    );
    setPrepNotes('');
    setIsEditorOpen(true);
  };

  const openEditRecipe = (rec: Recipe) => {
    setEditingRecipe(rec);
    setNameAm(rec.nameAm);
    setNameEn(rec.nameEn);
    setCategory(rec.category);
    setPortionDescription(rec.portionDescription);
    setSellingPrice(rec.sellingPrice);
    setIngredients([...rec.ingredients]);
    setPrepNotes(rec.preparationNotes || '');
    setIsEditorOpen(true);
  };

  const openCloneModal = (rec: Recipe) => {
    const otherBranches = branches.filter((b) => b.id !== (currentBranch?.id || ''));
    setRecipeToClone(rec);
    setCloneTargetBranchId(otherBranches[0]?.id || '');
    setCloneNewPrice(rec.sellingPrice);
    setCloneModalOpen(true);
  };

  const handleExecuteClone = () => {
    if (!recipeToClone || !cloneTargetBranchId) return;
    const price = typeof cloneNewPrice === 'number' ? cloneNewPrice : recipeToClone.sellingPrice;
    duplicateRecipeToBranch(recipeToClone.id, cloneTargetBranchId, price);
    setCloneModalOpen(false);
    setRecipeToClone(null);
  };

  const handleAddIngredientRow = () => {
    if (items.length === 0) return;
    setIngredients([
      ...ingredients,
      { itemId: items[0].id, quantity: 0.1 },
    ]);
  };

  const handleRemoveIngredientRow = (idx: number) => {
    setIngredients(ingredients.filter((_, i) => i !== idx));
  };

  const handleIngredientChange = (idx: number, field: 'itemId' | 'quantity', val: any) => {
    const updated = [...ingredients];
    updated[idx] = { ...updated[idx], [field]: val };
    setIngredients(updated);
  };

  // Calculate plate cost for recipe in editor
  const calculateFormPlateCost = () => {
    return ingredients.reduce((sum, ing) => {
      const it = items.find((i) => i.id === ing.itemId);
      const unitCost = it?.weightedAvgCost || it?.lastPurchasePrice || 0;
      return sum + ing.quantity * unitCost;
    }, 0);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAm.trim() || !currentBranch) return;

    const price = typeof sellingPrice === 'number' ? sellingPrice : 0;

    const recipeToSave: Recipe = {
      id: editingRecipe ? editingRecipe.id : `rec-${currentBranch.id}-${Date.now()}`,
      branchId: currentBranch.id,
      nameAm: nameAm.trim(),
      nameEn: nameEn.trim() || nameAm.trim(),
      category,
      portionDescription,
      sellingPrice: price,
      ingredients: ingredients.filter((ing) => ing.itemId && ing.quantity > 0),
      preparationNotes: prepNotes.trim(),
      isActive: true,
    };

    saveRecipe(recipeToSave);
    setIsEditorOpen(false);
  };

  // Find shared ingredients strictly within current branch's recipes
  const sharedIngredientsCount: Record<string, string[]> = {};
  branchRecipes.forEach((rec) => {
    rec.ingredients.forEach((ing) => {
      if (!sharedIngredientsCount[ing.itemId]) {
        sharedIngredientsCount[ing.itemId] = [];
      }
      sharedIngredientsCount[ing.itemId].push(language === 'am' ? rec.nameAm : rec.nameEn);
    });
  });

  if (branches.length === 0) {
    return (
      <div className="bg-slate-900/80 rounded-3xl border border-amber-500/30 p-12 text-center shadow-2xl space-y-5 backdrop-blur-md max-w-2xl mx-auto">
        <div className="p-4 rounded-2xl bg-amber-950/80 text-amber-400 inline-block border border-amber-400/30">
          <Building2 className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-black text-white">
          {language === 'am' ? 'የብራንች ሜኑ እና ሪሲፒ ለመመዝገብ መጀመሪያ ቅርንጫፍ ያስፈልጋል' : 'Register a Branch to manage recipes'}
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
          {language === 'am'
            ? 'እያንዳንዱ ቅርንጫፍ ራሱን የቻለ የተለየ ሜኑ፣ የመሸጫ ዋጋ እና የግብአት ሪሲፒ አለው።'
            : 'Each branch maintains its own isolated menu, custom selling prices, and ingredient proportion recipes.'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => createDefaultThreeBranches()}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/25 ring-1 ring-amber-300"
          >
            + {language === 'am' ? '3ቱን ቅርንጫፎች ባዶ አድርገህ ፍጠር (ቦሌ፣ ፒያሳ፣ ሲኤምሲ)' : 'Quick Create 3 Blank Branches'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Recipe Safety & Protection Guarantee Banner */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-950 p-3.5 rounded-2xl border border-emerald-500/40 shadow-lg flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-300">
                {language === 'am' ? '🛡️ የነባር ሪሲፒዎች እና ግብአቶች ደህንነት የተረጋገጠ ነው' : '🛡️ Existing Recipes & Ingredients Vault Protected'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                {language === 'am' ? 'ሳይነኩ እንዳሉ ናቸው' : 'Zero Tampering'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {language === 'am'
                ? 'ምንም ዓይነት ነባር የሜኑ ግብአት፣ ፖርሽን ወይም የንጥረ-ነገር መጠን አልተቀየረም አልተሰረዘም። ባክአፕ ተይዟል።'
                : 'All saved menu items, ingredients, units, and portion formulas remain 100% intact with automated safety backup.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Copy Cocoon Shola to 6 Kilo Quick Action Button */}
          <button
            onClick={() => {
              setSholaCopyResult(null);
              setSholaCopyModalOpen(true);
            }}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <Copy className="w-4 h-4 text-amber-400" />
            <span>{language === 'am' ? '📋 የሾላ ምግቦችን ወደ 6 ኪሎ ቅዳ' : '📋 Copy Shola to 6 Kilo'}</span>
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-black uppercase tracking-wider">
              {language === 'am' ? 'የቅርንጫፍ የተለየ ሜኑ' : 'Branch-Specific Menu'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5 mt-1">
            <ChefHat className="w-6 h-6 text-amber-400" />
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
              {t.recipes.title}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'am'
              ? 'እያንዳንዱ ብራንች የየራሱ የተለየ ሜኑ፣ የመሸጫ ዋጋ እና የግብአት ሪሲፒ አለው።'
              : 'Each branch manages its own independent menu offerings, pricing, and ingredient formulas.'}
          </p>
        </div>

        <button
          onClick={openNewRecipe}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition-all self-start sm:self-auto ring-1 ring-amber-300/60"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{language === 'am' ? `+ አዲስ ሪሲፒ ለ${currentBranch?.nameAm || 'ብራንች'}` : `+ Add Recipe for ${currentBranch?.nameEn || 'Branch'}`}</span>
        </button>
      </div>

      {/* Branch Selector Tabs (CRITICAL: Segregated per branch) */}
      <div className="bg-slate-900/90 p-2.5 rounded-2xl border border-amber-500/25 shadow-xl flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-xs font-bold text-amber-400 px-2 shrink-0 flex items-center gap-1.5">
          <Building2 className="w-4 h-4" />
          <span>{language === 'am' ? 'ቅርንጫፍ ይምረጡ:' : 'Select Branch:'}</span>
        </span>
        {branches.map((br) => {
          const isSelected = br.id === (currentBranch?.id || '');
          const count = recipes.filter((r) => r.branchId === br.id).length;
          return (
            <button
              key={br.id}
              onClick={() => setSelectedBranchId(br.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/30 font-black ring-1 ring-amber-300'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-amber-500/30'
              }`}
            >
              <span>{language === 'am' ? br.nameAm : br.nameEn}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${isSelected ? 'bg-slate-950 text-amber-300 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                {count} {language === 'am' ? 'ሪሲፒ' : 'recipes'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Branch Banner */}
      {currentBranch && (
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30 p-4 rounded-2xl border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white">
                  {language === 'am' ? currentBranch.nameAm : currentBranch.nameEn} — {language === 'am' ? 'የተለየ ሜኑ እና ሪሲፒ ማውጫ' : 'Menu & Recipe Catalog'}
                </h2>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                  {currentBranch.code}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {language === 'am'
                  ? `በዚህ ብራንች ${branchRecipes.length} ምግቦች ተመዝግበዋል። ሽያጭ ሲደረግ ወይም የስታፍ/ማኔጅመንት ምግብ ሲዘጋጅ ከዚህ ሪሲፒ ተሰልቶ ከቅርንጫፉ ስቶር ይቀነሳል።`
                  : `${branchRecipes.length} menu items active. Ingredient deductions strictly affect ${currentBranch.nameEn}'s local inventory.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openNewRecipe}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'am' ? '+ አዲስ ሜኑ መዝግብ' : '+ Add Menu Item'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Shared Ingredients Awareness within this Branch */}
      {branchRecipes.length > 0 && Object.keys(sharedIngredientsCount).length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900/80 to-slate-950 p-4 rounded-2xl border border-amber-500/30 text-xs space-y-2 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{language === 'am' ? `በ${currentBranch?.nameAm} የተጋሩ ጥሬ እቃዎች (Shared Common Ingredients):` : 'Shared Ingredients in this Branch:'}</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {Object.entries(sharedIngredientsCount)
              .filter(([_, list]) => list.length > 1)
              .map(([itemId, list]) => {
                const it = items.find((i) => i.id === itemId);
                if (!it) return null;
                return (
                  <span
                    key={itemId}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950 border border-amber-500/30 text-[11px] font-medium text-white shadow-sm"
                  >
                    <strong className="text-amber-300">
                      {language === 'am' ? it.nameAm : it.nameEn}:
                    </strong>
                    <span className="text-slate-400">{list.length} {language === 'am' ? 'ምግቦች ይጋሩታል' : 'dishes'}</span>
                  </span>
                );
              })}
          </div>
        </div>
      )}

      {/* Recipe Search & Filter Toolbar */}
      {branchRecipes.length > 0 && (
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-amber-500/20 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <span>🔍</span>
              <span>{language === 'am' ? 'ፈጣን የሜኑ ፍለጋ (Smart Menu Search):' : 'Smart Menu Search:'}</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {filteredRecipes.length} / {branchRecipes.length} {language === 'am' ? 'ምግቦች' : 'items'}
            </span>
          </div>

          <MenuSearchBox
            query={searchQuery}
            onChange={setSearchQuery}
            placeholder={
              language === 'am'
                ? 'የምግብ ስም ወይም ምድብ ይተይቡ... (ለምሳሌ: burger, በርገር, ዶሮ, stew)'
                : 'Type menu item name or category... (e.g. burger, doro, salad, pasta)'
            }
            resultCount={filteredRecipes.length}
            totalCount={branchRecipes.length}
          />
        </div>
      )}

      {/* Recipe Cards Grid */}
      {branchRecipes.length === 0 ? (
        <div className="bg-slate-900/80 rounded-3xl border border-amber-500/30 p-12 text-center shadow-2xl space-y-4 backdrop-blur-md">
          <div className="p-4 rounded-2xl bg-amber-950/80 text-amber-400 inline-block border border-amber-400/30">
            <ChefHat className="w-10 h-10" />
          </div>
          <h2 className="text-lg font-bold text-white">
            {language === 'am' ? `በ${currentBranch?.nameAm} እስካሁን ምንም ሪሲፒ አልተመዘገበም` : `No recipes registered for ${currentBranch?.nameEn}`}
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {language === 'am'
              ? 'የዚህን ብራንች የተለየ የምግብ ሜኑ፣ የመሸጫ ዋጋ እና ግብአቶችን ያስገቡ።'
              : 'Add dishes and ingredient formulas unique to this branch.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={openNewRecipe}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20"
            >
              + {language === 'am' ? 'አዲስ ሜኑ/ሪሲፒ መዝግብ' : 'Add First Recipe'}
            </button>
          </div>
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="bg-slate-900/80 rounded-3xl border border-amber-500/20 p-10 text-center shadow-xl space-y-3">
          <div className="text-3xl">🔍</div>
          <h3 className="text-base font-bold text-white">
            {language === 'am' ? `"${searchQuery}" የሚል ምግብ አልተገኘም` : `No menu items matching "${searchQuery}"`}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {language === 'am'
              ? 'የተጻፈውን ፊደል ያስተካክሉ ወይም ፍለጋውን አጽድተው ሙሉውን ዝርዝር ይመልከቱ።'
              : 'Try checking your spelling or clear the search to view all branch recipes.'}
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            <span>{language === 'am' ? 'ፍለጋውን አጽዳ (Clear Search)' : 'Clear Search'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRecipes.map((rec) => {
            // Plate cost calculation based on current inventory WAC
            const plateCost = rec.ingredients.reduce((sum, ing) => {
              const it = items.find((i) => i.id === ing.itemId);
              const unitCost = it?.weightedAvgCost || it?.lastPurchasePrice || 0;
              return sum + ing.quantity * unitCost;
            }, 0);

            const grossMargin = rec.sellingPrice > 0 ? ((rec.sellingPrice - plateCost) / rec.sellingPrice) * 100 : 0;

            return (
              <div
                key={rec.id}
                className="bg-slate-900/80 rounded-3xl border border-amber-500/20 p-5 shadow-2xl hover:border-amber-400/60 transition-all flex flex-col justify-between space-y-4 backdrop-blur-md relative group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-white">
                          {language === 'am' ? rec.nameAm : rec.nameEn}
                        </h3>
                      </div>
                      <span className="text-xs text-slate-400">
                        {rec.portionDescription}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        title={language === 'am' ? 'ወደ ሌላ ብራንች ገልብጥ (Clone)' : 'Clone to other branch'}
                        onClick={() => openCloneModal(rec)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditRecipe(rec)}
                        className="p-1.5 text-slate-400 hover:text-amber-300 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setRecipeToDelete(rec)}
                        title={language === 'am' ? 'ይህን ሜኑ ሰርዝ (ከዚህ ብራንች ወይም ከሁሉም)' : 'Delete menu item'}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Financial Metrics */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-2xl border border-amber-500/20 shadow-inner">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        {language === 'am' ? 'የመሸጫ ዋጋ (ይህ ብራንች):' : 'Selling Price:'}
                      </span>
                      <span className="text-sm font-black text-amber-300">
                        {formatCurrency(rec.sellingPrice)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        {language === 'am' ? 'የግብአት ወጪ ዋጋ:' : 'Portion Cost:'}
                      </span>
                      <span className="text-sm font-black text-slate-200">
                        {formatCurrency(plateCost)}
                      </span>
                    </div>
                  </div>

                  {/* Margin Badge */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400 text-[11px]">
                      {language === 'am' ? 'የትርፍ ህዳግ:' : 'Gross Margin:'}
                    </span>
                    <span
                      className={`font-black text-xs px-2 py-0.5 rounded-full ${
                        grossMargin >= 60
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : grossMargin >= 40
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {grossMargin.toFixed(1)}%
                    </span>
                  </div>

                  {/* Ingredients List */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-amber-400" />
                      <span>{language === 'am' ? 'ለ 1 ፖርሽን የሚያስፈልጉ ግብአቶች:' : 'Ingredients per portion:'}</span>
                    </span>
                    <div className="space-y-1">
                      {rec.ingredients.map((ing, i) => {
                        const it = items.find((item) => item.id === ing.itemId);
                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-950/70 border border-slate-800/60"
                          >
                            <span className="text-slate-300 text-[11px]">
                              {it ? (language === 'am' ? it.nameAm : it.nameEn) : ing.itemId}
                            </span>
                            <span className="font-mono text-amber-300 text-[11px] font-bold">
                              {ing.quantity} {it?.unitAm || it?.unit || ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {rec.preparationNotes && (
                  <p className="text-[11px] text-slate-400 italic bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
                    "{rec.preparationNotes}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Clone Recipe to Another Branch Modal */}
      {cloneModalOpen && recipeToClone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full border border-amber-500/40 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-slate-950">
              <div className="flex items-center gap-2">
                <Copy className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  {language === 'am' ? 'ሪሲፒውን ወደ ሌላ ብራንች ገልብጥ' : 'Clone Recipe to Another Branch'}
                </h3>
              </div>
              <button
                onClick={() => setCloneModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 rounded-2xl bg-slate-950 border border-amber-500/20">
                <span className="text-[10px] text-slate-400 block font-medium">{language === 'am' ? 'የምንጭ ምግብ ስም:' : 'Source Dish:'}</span>
                <span className="font-black text-amber-300 text-sm">{recipeToClone.nameAm}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {language === 'am' ? 'የሚገለበጥበት ብራንች:' : 'Target Branch:'}
                </label>
                <select
                  value={cloneTargetBranchId}
                  onChange={(e) => setCloneTargetBranchId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                >
                  {branches
                    .filter((b) => b.id !== (currentBranch?.id || ''))
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {language === 'am' ? b.nameAm : b.nameEn} ({b.code})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {language === 'am' ? 'ለአዲሱ ብራንች የመሸጫ ዋጋ (ብር):' : 'Selling Price for Target Branch (ETB):'}
                </label>
                <input
                  type="number"
                  step="any"
                  value={cloneNewPrice}
                  onChange={(e) => setCloneNewPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                  placeholder="500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCloneModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleExecuteClone}
                  className="px-5 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20"
                >
                  {language === 'am' ? 'ገልብጥ እና ፍጠር' : 'Clone to Branch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Create/Edit Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full border border-amber-500/40 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-slate-950">
              <div className="flex items-center gap-2.5">
                <ChefHat className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editingRecipe
                      ? (language === 'am' ? 'ሪሲፒውን ያሻሽሉ' : 'Edit Recipe')
                      : (language === 'am' ? `አዲስ ሪሲፒ ለ${currentBranch?.nameAm || 'ብራንች'}` : `New Recipe for ${currentBranch?.nameEn || 'Branch'}`)}
                  </h3>
                  <span className="text-[10px] text-amber-400 font-medium">
                    {language === 'am' ? `ይህ ሪሲፒ ለ${currentBranch?.nameAm} ብቻ የሚሰራ ነው` : `Bound strictly to ${currentBranch?.nameEn}`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {language === 'am' ? 'የምግቡ ስም (አማርኛ)' : 'Dish Name (Amharic)'} <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ለምሳሌ፡ ልዩ የበሬ ጥብስ"
                    value={nameAm}
                    onChange={(e) => setNameAm(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-amber-500/30 rounded-xl text-xs text-white placeholder:text-slate-500 focus:bg-slate-900 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {language === 'am' ? 'የምግቡ ስም (እንግሊዝኛ)' : 'Dish Name (English)'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Special Beef Tibs"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-amber-500/30 rounded-xl text-xs text-white placeholder:text-slate-500 focus:bg-slate-900 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {language === 'am' ? 'የምግብ ምድብ' : 'Category'}
                  </label>
                  <input
                    type="text"
                    placeholder="ወጥ፣ ጥብስ፣ ቁርስ..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-amber-500/30 rounded-xl text-xs text-white placeholder:text-slate-500 focus:bg-slate-900 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {language === 'am' ? 'የፖርሽን መለኪያ' : 'Portion Unit'}
                  </label>
                  <input
                    type="text"
                    placeholder="1 ፕሌት / 1 ሰው"
                    value={portionDescription}
                    onChange={(e) => setPortionDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-amber-500/30 rounded-xl text-xs text-white placeholder:text-slate-500 focus:bg-slate-900 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {language === 'am' ? 'የመሸጫ ዋጋ (በብር)' : 'Selling Price (ETB)'} <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="550"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-amber-500/30 rounded-xl text-xs text-amber-300 placeholder:text-slate-500 focus:bg-slate-900 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Ingredients Builder */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span>{language === 'am' ? 'ግብአቶች (ለ 1 ፖርሽን የሚያስፈልጉ ጥሬ ዕቃዎች)' : 'Portion Ingredients'}</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddIngredientRow}
                    disabled={items.length === 0}
                    className="text-xs px-3 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 font-bold transition-all disabled:opacity-50"
                  >
                    + {language === 'am' ? 'ግብአት ጨምር' : 'Add Ingredient'}
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="p-4 bg-slate-950 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-400">
                    {language === 'am'
                      ? 'እባክዎ መጀመሪያ በ"ማዕከላዊ ስቶር" ወይም በዋናው ገጽ ላይ ጥሬ እቃዎችን (ስጋ፣ ሽንኩርት፣ በርበሬ...) ይመዝግቡ።'
                      : 'Please create items in Central Store first before adding ingredients.'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {ingredients.map((ing, idx) => {
                      const selectedItem = items.find((i) => i.id === ing.itemId);
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800"
                        >
                          <SmartItemSelector
                            items={items}
                            selectedItemId={ing.itemId}
                            onSelectItem={(id) => handleIngredientChange(idx, 'itemId', id)}
                            className="flex-1 min-w-[200px]"
                          />
                          <div className="flex items-center gap-1 w-32">
                            <input
                              type="number"
                              step="any"
                              min="0.001"
                              placeholder="0.25"
                              value={ing.quantity}
                              onChange={(e) =>
                                handleIngredientChange(
                                  idx,
                                  'quantity',
                                  e.target.value === '' ? 0 : parseFloat(e.target.value)
                                )
                              }
                              className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white text-right font-mono"
                            />
                            <span className="text-[11px] text-slate-400 font-bold shrink-0">
                              {selectedItem?.unitAm || ''}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredientRow(idx)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Form Plate Cost Summary */}
                <div className="p-3 bg-slate-950 rounded-2xl border border-amber-500/20 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">
                    {language === 'am' ? 'የ 1 ፕሌት አጠቃላይ የወጪ ዋጋ (በግምት):' : 'Calculated Plate Cost:'}
                  </span>
                  <span className="font-black text-amber-300 font-mono">
                    {formatCurrency(calculateFormPlateCost())}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {language === 'am' ? 'የአሰራር ማስታወሻ / መመሪያ (አማራጭ)' : 'Preparation Notes'}
                </label>
                <textarea
                  rows={2}
                  placeholder={language === 'am' ? 'የዝግጅት ቅደም ተከተል ወይም የቅመሞች መጠን ማስታወሻ...' : 'Cooking or prep notes...'}
                  value={prepNotes}
                  onChange={(e) => setPrepNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-amber-500/30 rounded-xl text-xs text-white placeholder:text-slate-500 focus:bg-slate-900 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/25 ring-1 ring-amber-300"
                >
                  {editingRecipe ? (language === 'am' ? 'አሻሽል' : 'Update') : (language === 'am' ? 'መዝግብ' : 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Copy Cocoon Shola to Cocoon 6 Kilo Modal */}
      {sholaCopyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full border border-amber-500/40 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-slate-950">
              <div className="flex items-center gap-2">
                <Copy className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm text-white">
                  {language === 'am'
                    ? 'የኮኮን ሾላ ሜኑን ወደ ኮኮን 6 ኪሎ መገልበጫ'
                    : 'Copy Cocoon Shola Menus to Cocoon 6 Kilo'}
                </h3>
              </div>
              <button
                onClick={() => setSholaCopyModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {!sholaCopyResult ? (
                <>
                  <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>{language === 'am' ? 'የዳታ ጥበቃ እና የስራ ደንብ ማረጋገጫ:' : 'Safety & Operational Rules:'}</span>
                    </div>
                    <ul className="space-y-1.5 text-slate-300 list-disc list-inside text-[11px] leading-relaxed">
                      <li>
                        <strong>{language === 'am' ? 'የሾላ ሜኑ ሳይነካ እንዳለ ይቆያል:' : 'Shola remains untouched:'}</strong>{' '}
                        {language === 'am'
                          ? 'የኮኮን ሾላ ምግቦች፣ ዋጋዎችና ግብአቶች 100% ሳይቀየሩ ይቆያሉ።'
                          : 'Cocoon Shola dishes, prices, and recipes are preserved 100% without modification.'}
                      </li>
                      <li>
                        <strong>{language === 'am' ? 'ተደጋጋሚ ስሞች ይዘለላሉ:' : 'Duplicate prevention:'}</strong>{' '}
                        {language === 'am'
                          ? 'በኮኮን 6 ኪሎ ቀድሞ የተመዘገበ ምግብ ካለ እንዳይደጋገም በራስ-ሰር ያልፈዋል፤ የ 6 ኪሎ ነባር ምግቦች አይሰረዙም።'
                          : 'Existing dishes in Cocoon 6 Kilo are strictly protected and duplicates skipped.'}
                      </li>
                      <li>
                        <strong>{language === 'am' ? 'ነፃና የተለዩ ቅጂዎች (Independent):' : 'Independent copies:'}</strong>{' '}
                        {language === 'am'
                          ? 'የተገለበጡት ምግቦች በ 6 ኪሎ ራሳቸውን የቻሉ ይሆናሉ፤ አንዱ ጋር የሚደረግ ለውጥ ሌላውን አይነካም።'
                          : 'Cloned recipes get brand-new IDs for 6 Kilo; subsequent edits never affect Shola.'}
                      </li>
                      <li>
                        <strong>{language === 'am' ? 'አውቶማቲክ ባክአፕ:' : 'Automatic safety backup:'}</strong>{' '}
                        {language === 'am'
                          ? 'ከመገልበጡ በፊት አጠቃላይ የሪሲፒ ዳታቤዝ ባክአፕ ይያዛል።'
                          : 'A dedicated safety snapshot is created in localStorage before execution.'}
                      </li>
                    </ul>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSholaCopyModalOpen(false)}
                      className="px-4 py-2 text-slate-400 hover:text-white"
                    >
                      {language === 'am' ? 'ተው' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const res = copyCocoonSholaToSixKilo();
                        setSholaCopyResult(res);
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 ring-1 ring-amber-300"
                    >
                      {language === 'am' ? 'አዎ፣ ወደ 6 ኪሎ ገልብጥ (Copy Now)' : 'Confirm & Copy to 6 Kilo'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4 text-center py-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-xl font-black">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-white">
                      {language === 'am' ? 'ማባዛት በተሳካ ሁኔታ ተጠናቋል!' : 'Copy Operation Completed!'}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {sholaCopyResult.message}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-left">
                    <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        {language === 'am' ? 'የተገለበጡ አዳዲስ' : 'Copied New'}
                      </span>
                      <span className="text-lg font-black text-emerald-400 font-mono">
                        {sholaCopyResult.copiedCount}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">
                        {language === 'am' ? 'የተዘለሉ ተደጋጋሚ' : 'Skipped Duplicates'}
                      </span>
                      <span className="text-lg font-black text-amber-400 font-mono">
                        {sholaCopyResult.skippedCount}
                      </span>
                    </div>
                  </div>

                  {sholaCopyResult.conflicts.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-left max-h-32 overflow-y-auto space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold block">
                        {language === 'am' ? 'የተዘለሉ ነባር ምግቦች:' : 'Skipped existing dishes:'}
                      </span>
                      {sholaCopyResult.conflicts.map((c, i) => (
                        <p key={i} className="text-[10px] text-slate-300 font-mono">
                          • {c}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        setSholaCopyModalOpen(false);
                        const sixKilo = branches.find(
                          (b) => b.nameAm.includes('6 ኪሎ') || b.nameEn.toLowerCase().includes('6 kilo') || b.id.includes('6kilo') || b.id.includes('kokonut')
                        );
                        if (sixKilo) setSelectedBranchId(sixKilo.id);
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 font-black rounded-xl text-xs shadow-md"
                    >
                      {language === 'am' ? 'የ 6 ኪሎ ሜኑን አሁን ተመልከት' : 'Switch to 6 Kilo Menu'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recipe Delete Confirmation Modal (This Branch vs All Branches) */}
      {recipeToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <Trash2 className="w-6 h-6" />
              <h3 className="font-bold text-white text-base">
                {language === 'am' ? 'ሜኑ የመሰረዝ ማረጋገጫ' : 'Delete Menu Dish'}
              </h3>
            </div>

            <p className="text-xs text-slate-300">
              {language === 'am'
                ? `"${recipeToDelete.nameAm || recipeToDelete.nameEn}" የሚለውን ምግብ ሜኑ እንዴት መሰረዝ ይፈልጋሉ?`
                : `How would you like to delete "${recipeToDelete.nameEn || recipeToDelete.nameAm}"?`}
            </p>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  deleteRecipe(recipeToDelete.id, 'allBranches');
                  setRecipeToDelete(null);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {language === 'am'
                    ? '⚠️ ከሁሉም ብራንቾች ሰርዝ (Delete Across ALL Branches)'
                    : 'Delete Across ALL Branches'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  deleteRecipe(recipeToDelete.id, 'thisBranch');
                  setRecipeToDelete(null);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
              >
                <span>
                  {language === 'am'
                    ? 'ከዚህ ብራንች ብቻ ሰርዝ (This Branch Only)'
                    : 'Delete From This Branch Only'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRecipeToDelete(null)}
                className="w-full py-2 rounded-xl text-slate-400 hover:text-white text-xs transition"
              >
                {language === 'am' ? 'ይቅር / ተመለስ' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
