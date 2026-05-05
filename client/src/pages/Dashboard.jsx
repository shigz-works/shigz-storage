import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { Search, ChevronRight, ChevronDown, CheckSquare, Square, FileText } from 'lucide-react';
import SelectionCart from '../components/SelectionCart';

const API_URL = `http://${window.location.hostname}:5000/api`;

const Dashboard = () => {
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState(null);
  const [units, setUnits] = useState([]);
  const [topics, setTopics] = useState([]);
  const [sections, setSections] = useState({});
  const [expandedTopics, setExpandedTopics] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [guideType, setGuideType] = useState('learner');
  const { cartItems, addToCart, removeFromCart } = useCart();

  useEffect(() => {
    axios.get(`${API_URL}/states`).then(res => {
      setStates(res.data);
      if (res.data.length > 0) setSelectedState(res.data[0]);
    });
  }, []);

  useEffect(() => {
    if (selectedState && !searchQuery) {
      axios.get(`${API_URL}/units?state_id=${selectedState.id}`).then(res => setUnits(res.data));
    }
  }, [selectedState, searchQuery]);

  useEffect(() => {
    if (units.length > 0 && !searchQuery) {
      // Fetch all topics for all units in current state
      const unitIds = units.map(u => u.id);
      Promise.all(unitIds.map(id => axios.get(`${API_URL}/topics?unit_id=${id}`)))
        .then(results => {
          setTopics(results.flatMap(r => r.data));
        });
    }
  }, [units, searchQuery]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        axios.get(`${API_URL}/sections?q=${searchQuery}&guide_type=${guideType}`)
          .then(res => setSearchResults(res.data));
      } else {
        setSearchResults(null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, guideType]);

  const toggleTopic = async (topicId) => {
    if (expandedTopics.includes(topicId)) {
      setExpandedTopics(expandedTopics.filter(id => id !== topicId));
    } else {
      const res = await axios.get(`${API_URL}/sections?topic_id=${topicId}&guide_type=${guideType}`);
      setSections(prev => ({ ...prev, [topicId]: res.data }));
      setExpandedTopics([...expandedTopics, topicId]);
    }
  };

  const isInCart = (sectionId) => cartItems.some(item => item.id === sectionId);

  const handleToggleSection = (section) => {
    if (isInCart(section.id)) {
      removeFromCart(section.id);
    } else {
      addToCart({
        ...section,
        stateName: selectedState?.name || 'Search Result',
        unitCode: section.unit_code || units.find(u => u.id === (topics.find(t => t.id === section.topic_id)?.unit_id))?.code || 'N/A'
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Filters & Search */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-sm flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search units, topics or keywords..."
              className="w-full pl-10 pr-4 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            value={selectedState?.id || ''}
            onChange={(e) => setSelectedState(states.find(s => s.id === parseInt(e.target.value)))}
          >
            {states.map(s => <option key={s.id} value={s.id}>{s.code}</option>)}
          </select>
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded">
            <button onClick={() => setGuideType('learner')} className={`px-4 py-1 rounded text-sm ${guideType === 'learner' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}>Learner</button>
            <button onClick={() => setGuideType('assessor')} className={`px-4 py-1 rounded text-sm ${guideType === 'assessor' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}>Assessor</button>
          </div>
        </div>

        {/* Content Browser or Search Results */}
        <div className="space-y-4">
          {searchQuery ? (
            <div className="bg-white dark:bg-gray-800 rounded shadow-sm p-4">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Search size={18} /> Search Results for "{searchQuery}"
              </h3>
              {searchResults?.length === 0 ? (
                <p className="text-gray-500">No results found.</p>
              ) : (
                <div className="space-y-2">
                  {searchResults?.map(section => (
                    <div key={section.id} className="flex items-center justify-between p-3 rounded border dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleToggleSection(section)}>
                          {isInCart(section.id) ? <CheckSquare className="text-blue-500" size={20} /> : <Square className="text-gray-400" size={20} />}
                        </button>
                        <div>
                          <div className="text-sm font-medium">{section.title}</div>
                          <div className="text-xs text-gray-500">{section.unit_code} &bull; {section.topic_title}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            units.map(unit => (
              <div key={unit.id} className="bg-white dark:bg-gray-800 rounded shadow-sm overflow-hidden border-l-4 border-blue-500">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50">
                  <span className="text-xs font-bold text-blue-600 uppercase">{unit.code}</span>
                  <h3 className="font-bold text-lg">{unit.title}</h3>
                </div>
                <div className="p-2">
                  {topics.filter(t => t.unit_id === unit.id).map(topic => (
                    <div key={topic.id} className="border-b last:border-0 dark:border-gray-700">
                      <button onClick={() => toggleTopic(topic.id)} className="w-full text-left p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        {expandedTopics.includes(topic.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        <span className="font-medium">{topic.title}</span>
                      </button>
                      {expandedTopics.includes(topic.id) && (
                        <div className="pl-10 pr-4 pb-4 space-y-2">
                          {sections[topic.id]?.map(section => (
                            <div key={section.id} className="flex items-center justify-between p-2 rounded border dark:border-gray-700">
                              <div className="flex items-center gap-3">
                                <button onClick={() => handleToggleSection(section)}>
                                  {isInCart(section.id) ? <CheckSquare className="text-blue-500" size={20} /> : <Square className="text-gray-400" size={20} />}
                                </button>
                                <span className="text-sm">{section.title}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="lg:col-span-1"><SelectionCart /></div>
    </div>
  );
};

export default Dashboard;
