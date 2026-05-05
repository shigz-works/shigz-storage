import React from 'react';
import { useCart } from '../context/CartContext';
import { Trash2, GripVertical, FileText, Download, X } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { generatePDF } from '../utils/pdfGenerator';

const SortableItem = ({ item, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded mb-2 shadow-sm ${isDragging ? 'opacity-50' : ''}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab text-gray-400">
        <GripVertical size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500 truncate">{item.unitCode} - {item.stateName}</div>
        <div className="text-sm font-medium truncate">{item.title}</div>
      </div>
      <button onClick={() => onRemove(item.id)} className="text-gray-400 hover:text-red-500">
        <X size={18} />
      </button>
    </div>
  );
};

const SelectionCart = () => {
  const { cartItems, removeFromCart, reorderCart, clearCart } = useCart();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = cartItems.findIndex((i) => i.id === active.id);
      const newIndex = cartItems.findIndex((i) => i.id === over.id);
      reorderCart(arrayMove(cartItems, oldIndex, newIndex));
    }
  };

  const handleExport = async () => {
    if (cartItems.length === 0) return;
    await generatePDF(cartItems);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded shadow-md sticky top-24 max-h-[calc(100vh-120px)] flex flex-col">
      <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
        <h2 className="font-bold flex items-center gap-2">
          <FileText size={20} className="text-blue-500" />
          Selection Cart ({cartItems.length})
        </h2>
        {cartItems.length > 0 && (
          <button onClick={clearCart} className="text-xs text-red-500 hover:underline flex items-center gap-1">
            <Trash2 size={12} /> Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900/50">
        {cartItems.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <FileText size={48} className="mx-auto mb-4 opacity-20" />
            <p>Your cart is empty.</p>
            <p className="text-xs">Select sections from the content browser to start building your guide.</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={cartItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
              {cartItems.map((item) => (
                <SortableItem key={item.id} item={item} onRemove={removeFromCart} />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {cartItems.length > 0 && (
        <div className="p-4 border-t dark:border-gray-700">
          <button
            onClick={handleExport}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg"
          >
            <Download size={20} />
            Export to PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default SelectionCart;
