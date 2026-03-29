import React from 'react';
import { User, Trash2 } from 'lucide-react';

// Συνάρτηση που υπολογίζει την ηλικία
const calculateAge = (birthDate) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

const ChildList = ({ children = [], onDelete }) => {
  if (children.length === 0) return null;

  return (
    <div className="space-y-4">
      {children.map((child) => {
        const age = calculateAge(child.birthDate);
        return (
          <div key={child.id} className="flex items-center justify-between p-4 border rounded-lg bg-white group hover:border-indigo-300 transition-all">
            <div className="flex items-center">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center mr-4 ${child.gender === 'boy' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                <User className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">{child.name}</h3>
                <p className="text-xs text-muted-foreground">
                   {age} {age === 1 ? 'έτους' : 'ετών'} • {new Date(child.birthDate).toLocaleDateString('el-GR')}
                </p>
              </div>
            </div>
            <button onClick={() => onDelete(child.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ChildList;