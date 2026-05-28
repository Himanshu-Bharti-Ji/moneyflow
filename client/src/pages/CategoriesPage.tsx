import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCategories } from '../features/categories/useCategories';
import Modal from '../components/ui/Modal';
import { useConfirm } from '../components/ui/ConfirmProvider';
import { toast } from '../components/ui/Toast';
import Icon from '../components/ui/Icon';
import type { Category } from '../types';

/* ── Constants ── */
const COLORS = [
  '#10b981','#ef4444','#3b82f6','#f59e0b',
  '#8b5cf6','#ec4899','#f97316','#06b6d4',
  '#84cc16','#6366f1','#14b8a6','#f43f5e',
];

const ICONS = [
  '🍽️','🛒','🏠','⚡','🚗','🛍️','🎬','✈️','💊','📚',
  '📱','🎁','📦','💼','💻','🏢','🏦','↩️','🎀','📈',
  '🎓','🏋️','🍺','☕','🐾','🎮','🎵','💈','🧾','🏥',
];

const formSchema = z.object({
  name:  z.string().min(1, 'Name is required').max(100),
  type:  z.enum(['income', 'expense']),
  color: z.string(),
  icon:  z.string(),
});
type FormData = z.infer<typeof formSchema>;

/* ── Page ── */
export default function CategoriesPage() {
  const { expense, income, loading, error, create, update, remove } = useCategories();

  const confirm = useConfirm();
  const [tab,        setTab]        = useState<'expense' | 'income'>('expense');
  const [showCreate, setShowCreate] = useState(false);
  const [editCat,    setEditCat]    = useState<Category | null>(null);
  const [formDirty,  setFormDirty]  = useState(false);

  const beforeClose = async () => {
    if (!formDirty) return true;
    return confirm({
      title: 'Discard changes?',
      message: 'You have unsaved category changes.',
      confirmLabel: 'Discard',
      cancelLabel: 'Keep editing',
    });
  };

  const handleCreate = async (data: FormData) => {
    try {
      await create(data);
      setShowCreate(false);
      toast('Category created');
    } catch (e: any) {
      toast(e.response?.data?.error ?? 'Failed to create', 'error');
    }
  };

  const handleUpdate = async (data: FormData) => {
    if (!editCat) return;
    try {
      await update(editCat._id, { name: data.name, color: data.color, icon: data.icon });
      setEditCat(null);
      toast('Category updated');
    } catch (e: any) {
      toast(e.response?.data?.error ?? 'Failed to update', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title:        'Delete Category',
      message:      `Delete "${name}"?`,
      detail:       'Default categories cannot be deleted. This action cannot be undone.',
      confirmLabel: 'Delete',
      danger:       true,
    });
    if (!ok) return;
    try {
      await remove(id);
      toast('Category deleted');
    } catch (e: any) {
      toast(e.response?.data?.error ?? 'Cannot delete this category', 'error');
    }
  };

  const displayed = tab === 'expense' ? expense : income;

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Categories</h1>
          <p className="text-sm text-slate-500 mt-0.5">Organise your transactions</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary gap-1.5 flex-shrink-0">
          <Icon name="plus" size={16} /> Add
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-slate-100 rounded-2xl p-1">
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${
              tab === t
                ? t === 'expense'
                  ? 'bg-white text-red-500 shadow-sm'
                  : 'bg-white text-brand shadow-sm'
                : 'text-slate-400'
            }`}
          >
            {t === 'expense' ? '💸 Expense' : '💰 Income'}
          </button>
        ))}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-20 bg-slate-100" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && <div className="card text-center py-8 text-red-500 text-sm">{error}</div>}

      {/* Empty */}
      {!loading && !error && displayed.length === 0 && (
        <div className="card text-center py-12 space-y-3">
          <p className="text-4xl">{tab === 'expense' ? '💸' : '💰'}</p>
          <p className="font-semibold text-slate-700">No {tab} categories</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto">
            Add Category
          </button>
        </div>
      )}

      {/* Category grid */}
      {!loading && displayed.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {displayed.map((cat) => (
            <CategoryCard
              key={cat._id}
              category={cat}
              onEdit={() => setEditCat(cat)}
              onDelete={() => handleDelete(cat._id, cat.name)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setFormDirty(false); }} title="Add Category"
        onBeforeClose={beforeClose}>
        <CategoryForm
          defaultType={tab}
          onSubmit={handleCreate}
          onCancel={() => { setShowCreate(false); setFormDirty(false); }}
          onDirtyChange={setFormDirty}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editCat} onClose={() => { setEditCat(null); setFormDirty(false); }} title="Edit Category"
        onBeforeClose={beforeClose}>
        {editCat && (
          <CategoryForm
            category={editCat}
            defaultType={editCat.type}
            onSubmit={handleUpdate}
            onCancel={() => { setEditCat(null); setFormDirty(false); }}
            onDirtyChange={setFormDirty}
          />
        )}
      </Modal>

    </div>
  );
}

/* ── Category Card ── */
function CategoryCard({
  category, onEdit, onDelete,
}: { category: Category; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="card p-0 overflow-hidden">
      {/* Top coloured band */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: category.color }}
      />
      <div className="p-3">
        {/* Icon + actions row */}
        <div className="flex items-start justify-between mb-2">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
            style={{ backgroundColor: category.color + '18' }}
          >
            {category.icon}
          </div>
          {!category.isDefault && (
            <div className="flex gap-0.5">
              <button
                onClick={onEdit}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-brand transition-colors"
              >
                <Icon name="edit" size={13} />
              </button>
              <button
                onClick={onDelete}
                className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
              >
                <Icon name="trash" size={13} />
              </button>
            </div>
          )}
          {category.isDefault && (
            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
              default
            </span>
          )}
        </div>
        {/* Name */}
        <p className="text-sm font-semibold text-slate-700 leading-tight line-clamp-2">
          {category.name}
        </p>
      </div>
    </div>
  );
}

/* ── Category Form ── */
function CategoryForm({
  category,
  defaultType,
  onSubmit,
  onCancel,
  onDirtyChange,
}: {
  category?: Category;
  defaultType: 'income' | 'expense';
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting, isDirty } } =
    useForm<FormData>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        name:  category?.name  ?? '',
        type:  category?.type  ?? defaultType,
        color: category?.color ?? '#10b981',
        icon:  category?.icon  ?? '📦',
      },
    });

  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  const selectedColor = watch('color');
  const selectedIcon  = watch('icon');
  const selectedType  = watch('type');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Type toggle — only when creating */}
      {!category && (
        <div className="flex bg-slate-100 rounded-2xl p-1">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setValue('type', t)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${
                selectedType === t ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'
              }`}
            >
              {t === 'expense' ? '💸 Expense' : '💰 Income'}
            </button>
          ))}
        </div>
      )}

      {/* Name */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Name</label>
        <input {...register('name')} className="input" placeholder="e.g. Petrol" autoFocus />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
      </div>

      {/* Icon picker */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Icon</label>
        <div className="grid grid-cols-10 gap-1.5 max-h-28 overflow-y-auto p-1">
          {ICONS.map((ic) => (
            <button
              key={ic}
              type="button"
              onClick={() => setValue('icon', ic)}
              className={`w-8 h-8 rounded-xl text-lg flex items-center justify-center transition-all ${
                selectedIcon === ic
                  ? 'ring-2 scale-110'
                  : 'hover:bg-slate-100'
              }`}
              style={selectedIcon === ic ? { ringColor: selectedColor, backgroundColor: selectedColor + '20' } : {}}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setValue('color', c)}
              className="w-8 h-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: c }}
            >
              {selectedColor === c && <Icon name="check" size={14} className="text-white" />}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-3">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
          style={{ backgroundColor: selectedColor + '20' }}
        >
          {selectedIcon}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">{watch('name') || 'Category Name'}</p>
          <p className="text-xs text-slate-400 capitalize">{selectedType}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
          {isSubmitting
            ? <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving…
              </span>
            : category ? 'Save Changes' : 'Create'}
        </button>
      </div>
    </form>
  );
}
