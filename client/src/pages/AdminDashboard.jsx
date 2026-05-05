import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useAuth } from '../context/AuthContext';
import { Save, History, Plus, Trash2, Edit, X } from 'lucide-react';

const API_URL = `http://${window.location.hostname}:5000/api`;

const AdminDashboard = () => {
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState(null);
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [sections, setSections] = useState([]);
  const [editingSection, setEditingSection] = useState(null);
  const [history, setHistory] = useState([]);
  const [isAdding, setIsAdding] = useState(null); // 'unit', 'topic', 'section'
  const [newItem, setNewItem] = useState({ title: '', code: '', content: '', guide_type: 'learner' });
  const { user } = useAuth();

  const authHeaders = { 'x-user-role': user.role, 'x-user-id': user.id };

  useEffect(() => {
    axios.get(`${API_URL}/states`).then(res => setStates(res.data));
  }, []);

  const fetchUnits = (stateId) => {
    axios.get(`${API_URL}/units?state_id=${stateId}`).then(res => setUnits(res.data));
  };

  const fetchTopics = (unitId) => {
    axios.get(`${API_URL}/topics?unit_id=${unitId}`).then(res => setTopics(res.data));
  };

  const fetchSections = (topicId) => {
    axios.get(`${API_URL}/sections?topic_id=${topicId}`).then(res => setSections(res.data));
  };

  const handleSaveSection = async () => {
    try {
      await axios.put(`${API_URL}/sections/${editingSection.id}`, editingSection, { headers: authHeaders });
      alert('Section saved successfully');
      fetchSections(selectedTopic.id);
      setEditingSection(null);
    } catch (err) {
      alert('Error saving section');
    }
  };

  const handleCreate = async () => {
    try {
      if (isAdding === 'unit') {
        await axios.post(`${API_URL}/units`, { ...newItem, state_id: selectedState.id }, { headers: authHeaders });
        fetchUnits(selectedState.id);
      } else if (isAdding === 'topic') {
        await axios.post(`${API_URL}/topics`, { ...newItem, unit_id: selectedUnit.id }, { headers: authHeaders });
        fetchTopics(selectedUnit.id);
      } else if (isAdding === 'section') {
        await axios.post(`${API_URL}/sections`, { ...newItem, topic_id: selectedTopic.id }, { headers: authHeaders });
        fetchSections(selectedTopic.id);
      }
      setIsAdding(null);
      setNewItem({ title: '', code: '', content: '', guide_type: 'learner' });
    } catch (err) {
      alert('Error creating item');
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    try {
      await axios.delete(`${API_URL}/${type}s/${id}`, { headers: authHeaders });
      if (type === 'unit') { fetchUnits(selectedState.id); setSelectedUnit(null); }
      if (type === 'topic') { fetchTopics(selectedUnit.id); setSelectedTopic(null); }
      if (type === 'section') { fetchSections(selectedTopic.id); }
    } catch (err) {
      alert('Error deleting item');
    }
  };

  const viewHistory = async (sectionId) => {
    const res = await axios.get(`${API_URL}/sections/${sectionId}/history`, { headers: authHeaders });
    setHistory(res.data);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Content Management System</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Selection Panes */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm">
          <h3 className="font-bold mb-2 border-b pb-2">1. Select State</h3>
          {states.map(s => (
            <button
              key={s.id}
              onClick={() => { setSelectedState(s); fetchUnits(s.id); setSelectedUnit(null); setSelectedTopic(null); setSections([]); }}
              className={`w-full text-left p-2 rounded mb-1 ${selectedState?.id === s.id ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm">
          <h3 className="font-bold mb-2 border-b pb-2 flex justify-between items-center">
            2. Units {selectedState && <Plus size={16} className="cursor-pointer" onClick={() => setIsAdding('unit')}/>}
          </h3>
          {units.map(u => (
            <div key={u.id} className={`flex items-center justify-between p-2 rounded mb-1 ${selectedUnit?.id === u.id ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              <button className="flex-1 text-left" onClick={() => { setSelectedUnit(u); fetchTopics(u.id); setSelectedTopic(null); setSections([]); }}>
                {u.code}
              </button>
              <button onClick={() => handleDelete('unit', u.id)} className="text-red-400 p-1 hover:bg-red-50 rounded"><Trash2 size={12}/></button>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm">
          <h3 className="font-bold mb-2 border-b pb-2 flex justify-between items-center">
            3. Topics {selectedUnit && <Plus size={16} className="cursor-pointer" onClick={() => setIsAdding('topic')}/>}
          </h3>
          {topics.map(t => (
            <div key={t.id} className={`flex items-center justify-between p-2 rounded mb-1 ${selectedTopic?.id === t.id ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
              <button className="flex-1 text-left" onClick={() => { setSelectedTopic(t); fetchSections(t.id); }}>
                {t.title}
              </button>
              <button onClick={() => handleDelete('topic', t.id)} className="text-red-400 p-1 hover:bg-red-50 rounded"><Trash2 size={12}/></button>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm">
          <h3 className="font-bold mb-2 border-b pb-2 flex justify-between items-center">
            4. Sections {selectedTopic && <Plus size={16} className="cursor-pointer" onClick={() => setIsAdding('section')}/>}
          </h3>
          {sections.map(s => (
            <div key={s.id} className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded mb-1">
              <span className="text-sm truncate mr-2">{s.title} ({s.guide_type[0].toUpperCase()})</span>
              <div className="flex gap-1">
                <button onClick={() => setEditingSection(s)} className="p-1 text-blue-500"><Edit size={14}/></button>
                <button onClick={() => viewHistory(s.id)} className="p-1 text-gray-500"><History size={14}/></button>
                <button onClick={() => handleDelete('section', s.id)} className="text-red-400 p-1 hover:bg-red-50 rounded"><Trash2 size={12}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96">
            <h3 className="text-lg font-bold mb-4">Add New {isAdding}</h3>
            {isAdding === 'unit' && (
              <input type="text" placeholder="Unit Code" className="w-full p-2 border rounded mb-2 dark:bg-gray-700"
                value={newItem.code} onChange={e => setNewItem({...newItem, code: e.target.value})}/>
            )}
            <input type="text" placeholder="Title" className="w-full p-2 border rounded mb-2 dark:bg-gray-700"
              value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})}/>
            {isAdding === 'section' && (
              <select className="w-full p-2 border rounded mb-2 dark:bg-gray-700"
                value={newItem.guide_type} onChange={e => setNewItem({...newItem, guide_type: e.target.value})}>
                <option value="learner">Learner</option>
                <option value="assessor">Assessor</option>
              </select>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setIsAdding(null)} className="px-4 py-2 text-gray-500">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Section */}
      {editingSection && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-md border-t-4 border-blue-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Editing: {editingSection.title}</h3>
            <div className="flex gap-2">
              <button onClick={() => setEditingSection(null)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">Cancel</button>
              <button onClick={handleSaveSection} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                <Save size={18} /> Save Changes
              </button>
            </div>
          </div>
          <div className="h-64 mb-12">
             <ReactQuill theme="snow" className="h-full dark:text-white"
               value={editingSection.content} onChange={(val) => setEditingSection({...editingSection, content: val})} />
          </div>
        </div>
      )}

      {/* History Panel */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Version History</h3>
            <button onClick={() => setHistory([])} className="text-gray-500"><X size={20}/></button>
          </div>
          <div className="space-y-4">
            {history.map(h => (
              <div key={h.id} className="border-l-4 border-gray-300 pl-4 py-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Updated by: {h.username}</span>
                  <span>{new Date(h.created_at).toLocaleString()}</span>
                </div>
                <div className="mt-2 text-sm italic line-clamp-2 text-gray-400">
                  {h.old_content?.replace(/<[^>]*>/g, '').substring(0, 200)}...
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
