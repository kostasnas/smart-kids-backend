import React, { useState } from 'react';

const AddChildForm = ({ onAdd }) => {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('boy');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !birthDate) return;
    
    onAdd({
      id: Date.now(),
      name,
      birthDate, // Αποθηκεύουμε την ημερομηνία
      gender
    });

    setName('');
    setBirthDate('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 border rounded-xl bg-white shadow-sm space-y-4 border-indigo-100">
      <h3 className="text-lg font-bold text-slate-800">Προσθήκη Νέου Παιδιού</h3>
      
      <div>
        <label className="block text-sm font-medium mb-1 text-slate-600">Όνομα</label>
        <input 
          type="text" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" 
          placeholder="π.χ. Νίκος"
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1 text-slate-600">Ημ. Γέννησης</label>
          <input 
            type="date" 
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" 
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1 text-slate-600">Φύλο</label>
          <select 
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="boy">Αγόρι</option>
            <option value="girl">Κορίτσι</option>
          </select>
        </div>
      </div>

      <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition-colors font-semibold">
        Προσθήκη στη Λίστα
      </button>
    </form>
  );
};

export default AddChildForm;